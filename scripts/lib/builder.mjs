// What every core/data builder shares: its command line, where it writes,
// the "stamp only what changed" write, and the two ways bytes come in — a
// download to disk and `unzip -p` streamed out of an archive.
import { createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** `--key=value` arguments as an object; a bare `--flag` is `undefined`. */
export const parseArgs = () => Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));

/** `--out=path` against the working directory, else the builder's default under core/data. */
export const outputPath = (argv, defaultUrl) => (argv.out ? new URL(argv.out, `file://${process.cwd()}/`) : defaultUrl);

/**
 * Writes `{ [stampKey]: stamp, ...body }`, keeping the existing stamp when the
 * body has not changed — summary.json's convention: the stamp is the run that
 * last CHANGED the numbers, so an unchanged rebuild is not a diff. Returns the
 * body that was there before.
 */
export function writeStamped(outPath, stampKey, stamp, body, indent) {
  const { [stampKey]: priorStamp, ...priorBody } = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
  const unchanged = priorStamp !== undefined && JSON.stringify(priorBody) === JSON.stringify(body);
  writeFileSync(outPath, JSON.stringify({ [stampKey]: unchanged ? priorStamp : stamp, ...body }, null, indent));
  return priorBody;
}

/** Streams `url` into `dest`; throws on a non-2xx. Returns the response for its status. */
export async function fetchToFile(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return res;
}

/** One entry of a zip as a stream: `stdout` to read, `closed` to await once drained. */
export function unzipEntry(zipPath, entry) {
  const child = spawn("unzip", ["-p", zipPath, entry], { stdio: ["ignore", "pipe", "inherit"] });
  const closed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`unzip -p ${entry} exited ${code}`))));
  });
  return { stdout: child.stdout, closed };
}
