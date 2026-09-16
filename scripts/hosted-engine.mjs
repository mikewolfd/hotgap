// The hosted engine on a DigitalOcean droplet, up or down.
//
// A droplet bills while it exists (powered off still bills), and nothing
// depends on this one staying up — the weekly sweep and CI start their own
// engine on the GitHub runner, and the CLI falls back to the public API — so
// `down` destroys it when idle and `up` recreates it when wanted. Everything
// on the box comes from cloud-init below: Docker, the engine image from the
// `hotgap` registry (pulled with read-only credentials minted for the
// purpose), Caddy for HTTPS on a free <ip>.sslip.io hostname, and Watchtower
// to pull each new `latest` that .github/workflows/engine-image.yml pushes.
// Sizing: s-4vcpu-8gb ($48/month); one worker peaks near 4.5 GB on an
// override state and a 4 GB box died on the first one (engine/README.md).
//
// Usage: node scripts/hosted-engine.mjs up | down | status
// Reads DIGITAL_OCEAN_TOKEN and HOTGAP_PE_TOKEN from .env and writes
// HOTGAP_PE_URL back to it — the hostname follows the droplet's IP.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ENV_PATH = new URL("../.env", import.meta.url);
const API = "https://api.digitalocean.com/v2";
const TAG = "hotgap-engine";
const REGION = "nyc3";
const SIZE = "s-4vcpu-8gb";
const IMAGE = "ubuntu-24-04-x64";
const WORKERS = "2";

const env = Object.fromEntries(
  (existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "")
    .split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const need = (k) => env[k] || fail(`${k} is not set in .env`);
function fail(msg) { console.error(msg); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${need("DIGITAL_OCEAN_TOKEN")}`, "Content-Type": "application/json" } });
  if (res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) fail(`${init.method ?? "GET"} ${path}: ${res.status} ${body.message ?? JSON.stringify(body)}`);
  return body;
}

/** cloud-init for the box. `registryAuth` is the read-only docker config for the registry. */
function userData(registryAuth) {
  const compose = `services:
  engine:
    image: registry.digitalocean.com/hotgap/engine:latest
    restart: unless-stopped
    environment:
      PORT: "8080"
      WEB_CONCURRENCY: "${WORKERS}"
      GUNICORN_MAX_REQUESTS: "100"
      HOTGAP_ENGINE_TOKEN: "${need("HOTGAP_PE_TOKEN")}"
    labels: ["com.centurylinklabs.watchtower.enable=true"]
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes: ["/opt/hotgap/Caddyfile:/etc/caddy/Caddyfile:ro", "caddy_data:/data"]
  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    # Its bundled client negotiates API 1.25 by default, which the daemon in
    # Ubuntu 24.04's docker.io refuses (minimum 1.44); pin the version.
    environment:
      DOCKER_API_VERSION: "1.44"
    volumes: ["/var/run/docker.sock:/var/run/docker.sock", "/root/.docker/config.json:/config.json:ro"]
    command: --interval 300 --cleanup --label-enable
volumes:
  caddy_data: {}
`;
  const indent = (s) => s.split("\n").map((l) => (l ? `      ${l}` : l)).join("\n");
  return `#cloud-config
package_update: true
packages: [docker.io, docker-compose-v2]
write_files:
  - path: /opt/hotgap/docker-compose.yml
    content: |
${indent(compose)}
  - path: /root/.docker/config.json
    permissions: "0600"
    content: '${JSON.stringify(registryAuth)}'
runcmd:
  # The box's own public address, from the metadata service, names the site.
  - IP=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
  - printf '%s.sslip.io {\\n  reverse_proxy engine:8080\\n}\\n' "$IP" > /opt/hotgap/Caddyfile
  - systemctl enable --now docker
  - cd /opt/hotgap && docker compose up -d
`;
}

async function droplets() {
  const { droplets: list } = await api(`/droplets?tag_name=${TAG}&per_page=50`);
  return list ?? [];
}
const ipOf = (d) => d.networks?.v4?.find((n) => n.type === "public")?.ip_address ?? null;
const urlOf = (d) => { const ip = ipOf(d); return ip ? `https://${ip}.sslip.io` : null; };

function setEnvUrl(url) {
  const lines = (existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "").split("\n").filter((l) => !l.startsWith("HOTGAP_PE_URL=") && l !== "");
  if (url) lines.push(`HOTGAP_PE_URL=${url}/us/calculate`);
  writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}

async function ensureFirewall(dropletId) {
  const { firewalls } = await api("/firewalls?per_page=200");
  let fw = (firewalls ?? []).find((f) => f.name === TAG);
  if (!fw) {
    const all = [{ protocol: "tcp", ports: "1-65535", destinations: { addresses: ["0.0.0.0/0", "::/0"] } }, { protocol: "udp", ports: "1-65535", destinations: { addresses: ["0.0.0.0/0", "::/0"] } }];
    const inbound = ["22", "80", "443"].map((ports) => ({ protocol: "tcp", ports, sources: { addresses: ["0.0.0.0/0", "::/0"] } }));
    fw = (await api("/firewalls", { method: "POST", body: JSON.stringify({ name: TAG, inbound_rules: inbound, outbound_rules: all, tags: [TAG] }) })).firewall;
  }
  if (!fw.droplet_ids?.includes(dropletId)) await api(`/firewalls/${fw.id}/droplets`, { method: "POST", body: JSON.stringify({ droplet_ids: [dropletId] }) });
}

async function up() {
  let [d] = await droplets();
  if (d) {
    console.log(`already exists: ${urlOf(d) ?? d.status}`);
  } else {
    const registryAuth = await api("/registry/docker-credentials?read_write=false");
    const { ssh_keys } = await api("/account/keys?per_page=200");
    d = (await api("/droplets", { method: "POST", body: JSON.stringify({
      name: TAG, region: REGION, size: SIZE, image: IMAGE, tags: [TAG], monitoring: true,
      ssh_keys: (ssh_keys ?? []).map((k) => k.id), user_data: userData(registryAuth),
    }) })).droplet;
    console.log(`created droplet ${d.id} (${SIZE}, ${REGION}); booting…`);
  }
  while (d.status !== "active" || !ipOf(d)) { await sleep(10_000); d = (await api(`/droplets/${d.id}`)).droplet; }
  await ensureFirewall(d.id);
  const url = urlOf(d);
  console.log(`active at ${url}; waiting for cloud-init, the image pull and the certificate…`);
  const started = Date.now();
  for (;;) {
    const health = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(10_000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (health?.status === "ok") { setEnvUrl(url); console.log(`up: ${url} — ${health.model} ${health.version}, ${Math.round((Date.now() - started) / 1000)} s; HOTGAP_PE_URL written to .env`); return; }
    if (Date.now() - started > 15 * 60_000) fail(`no healthy answer from ${url} after 15 min — ssh root@${ipOf(d)} and read /var/log/cloud-init-output.log`);
    await sleep(15_000);
  }
}

async function down() {
  const list = await droplets();
  if (!list.length) { console.log("not running"); setEnvUrl(null); return; }
  for (const d of list) await api(`/droplets/${d.id}`, { method: "DELETE" });
  setEnvUrl(null);
  console.log(`destroyed ${list.map((d) => `${d.name} ${ipOf(d) ?? d.id}`).join(", ")}; HOTGAP_PE_URL removed from .env — the CLI falls back to the public API until \`up\`. The registry image ($5/month) stays so \`up\` is fast.`);
}

async function status() {
  const list = await droplets();
  if (!list.length) { console.log("down (no droplet)"); return; }
  for (const d of list) {
    const url = urlOf(d);
    const health = url ? await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(10_000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    console.log(`${d.status} ${url ?? ""} — ${d.size_slug}, since ${d.created_at}; engine ${health ? `${health.model} ${health.version}` : "not answering"}`);
  }
}

const cmd = process.argv[2];
if (cmd === "up") await up();
else if (cmd === "down") await down();
else if (cmd === "status") await status();
else fail("usage: node scripts/hosted-engine.mjs up | down | status");
