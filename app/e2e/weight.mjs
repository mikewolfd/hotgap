// How heavy a page is to read. The measurement behind the picture-first pass
// (design/PICTURE-FIRST-2026-09-18.md): how many words a person meets before
// they have done anything, where the picture starts, and how much of the
// first screen the picture gets.
//
//     node e2e/weight.mjs [baseUrl] [path…]
//     node e2e/weight.mjs http://localhost:8806 "/?zip=94110&kids=3,7&pay=30000&unit=year"
//
// With no paths it measures the three surfaces on their default households,
// so a follow-on agent can run it before and after their own pass and print
// the same table. Every number is read off the rendered page — nothing here
// is asserted, and nothing is typed.
//
// **What it counts, and what it cannot see.** A word is a whitespace-run with
// at least one letter or digit in it, in a text node that is really on the
// screen: no ancestor `[hidden]`, no `display:none` / `visibility:hidden`, no
// visually-hidden clip, and a non-empty client rect. So a closed `<details>`
// contributes its summary and nothing else, which is the point — the honesty
// content still exists, and `--open` proves it by opening every disclosure on
// the page and counting again. Two numbers, not one: `html` is prose a person
// reads, `svg` is the words inside the picture (ticks, direct labels). The
// picture's words are counted, because a label is still reading; they are
// reported apart, because a word on a mark does a different job from a
// sentence in a paragraph.
//
// A screen is one viewport at scroll 0. "Figure top" is the first `<figure>`'s
// distance from the top of the document; "figure share" is how much of that
// first viewport the figure covers — not how tall the figure is, so a figure
// pushed below the fold scores 0 however big it is.
import { chromium } from "@playwright/test";

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];

/** The three surfaces, each on the household its own proofs use. */
const DEFAULT_PAGES = [
  { name: "citizen", path: "/?zip=94110&kids=3,7&pay=30000&unit=year" },
  { name: "caseworker", path: "/caseworker.html?zip=94110&kids=3,7&pay=30000&unit=year" },
  { name: "journalist", path: "/places.html" },
];

/** Count the words a person can actually see, and measure the first figure against the first screen. Exported so the proofs weigh a page with the same function the owner runs. */
export const MEASURE = () => {
  // Eyes, not the accessibility tree: an aria-hidden SVG is still a picture a
  // person reads words off, and a visually-hidden paragraph is not, however
  // loudly a screen reader says it.
  const hidden = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n.hasAttribute?.("hidden")) return true;
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return true;
      // The visually-hidden pattern: clipped to nothing but still spoken.
      if (cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)") return true;
      if (n.tagName === "DETAILS" && !n.open) {
        // Only the summary of a closed disclosure is on the screen.
        const s = n.querySelector(":scope > summary");
        if (!(s && (s === el || s.contains(el)))) return true;
      }
    }
    return false;
  };
  const words = (s) => (s.match(/\S+/g) ?? []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  // A word scrolled out of a scroller is like a word inside a closed
  // disclosure: it is in the DOM, it is reachable, and nobody is reading it.
  // The money curve is 1,889px of plot inside a 608px box, so counting its
  // whole axis would have said the picture carries three times the words it
  // shows — a number that flatters nothing and measures nothing.
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (!/auto|scroll|hidden|clip/.test(cs.overflowX + cs.overflowY)) continue;
      const b = n.getBoundingClientRect();
      if (r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom) return true;
    }
    return false;
  };
  let html = 0, svg = 0;
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const n = words(node.nodeValue ?? "");
    if (!n) continue;
    const el = node.parentElement;
    if (!el || hidden(el)) continue;
    if (!el.getClientRects().length || clipped(el)) continue;
    if (el.ownerSVGElement || el.tagName === "svg") svg += n;
    else html += n;
  }
  // A <select> shows one option. A closed select's options have no client
  // rect, so the walker never counted them — subtracting them took 204 words
  // off a total that never held them and printed −31 on the map page (the
  // places picture-first review). Add the shown option once; subtract nothing.
  for (const sel of document.querySelectorAll("select")) {
    if (hidden(sel)) continue;
    html += words(sel.selectedOptions[0]?.textContent ?? "");
  }
  const fig = document.querySelector("figure");
  const box = fig?.getBoundingClientRect();
  const vh = innerHeight;
  return {
    html, svg, total: html + svg,
    figureTop: box ? Math.round(box.top + scrollY) : null,
    figureShare: box ? +(Math.max(0, Math.min(box.bottom, vh) - Math.max(box.top, 0)) / vh).toFixed(2) : 0,
    figureHeight: box ? Math.round(box.height) : null,
  };
};

/** Every disclosure on the page open: the proof that what was folded away is still there. */
export const OPEN_ALL = () => {
  for (const d of document.querySelectorAll("details")) d.open = true;
};

async function measure(page, base, path, { open }) {
  await page.goto(base + path, { waitUntil: "load" });
  // The answer arrives from the Worker (seconds, on a cold household); the
  // line is drawn after it, and a page with no curve settles on its own.
  // Ready when the picture has drawn, or a table exists at all — a table
  // folded in a closed <details> is attached but not visible, and waiting for
  // it to be visible cost a one-page run twelve minutes.
  await page.locator("svg path").first().waitFor({ timeout: 90_000 }).catch(async () => {
    await page.locator("table").first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  });
  await page.waitForTimeout(1500);
  if (open) { await page.evaluate(OPEN_ALL); await page.waitForTimeout(250); }
  await page.evaluate(() => scrollTo(0, 0));
  return page.evaluate(MEASURE);
}

/* The rest is the command line. Imported (by e2e/citizen.spec.ts, which
   weighs the page with the same function), it does nothing. */
if (!process.argv[1]?.endsWith("weight.mjs")) { /* imported: no side effects */ } else await main();

async function main() {
const args = process.argv.slice(2);
const base = (args[0] ?? "http://localhost:8806").replace(/\/$/, "");
const paths = args.slice(1);
const pages = paths.length ? paths.map((p, i) => ({ name: `page ${i + 1}`, path: p })) : DEFAULT_PAGES;

const browser = await chromium.launch();
const rows = [];
for (const p of pages) {
  for (const size of WIDTHS) {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    const shut = await measure(page, base, p.path, { open: false });
    const opened = await measure(page, base, p.path, { open: true });
    rows.push({ page: p.name, width: size.width, shut, opened });
    await ctx.close();
  }
}
await browser.close();

const fmt = (m) => `${m.total} (${m.html} prose + ${m.svg} in the picture)`;
console.log(`\n${base}\n`);
console.log("| page | width | words, by default | words, disclosures open | figure top | figure share of screen 1 | figure height |");
console.log("|---|---:|---:|---:|---:|---:|---:|");
for (const r of rows) {
  console.log(`| ${r.page} | ${r.width} | ${fmt(r.shut)} | ${fmt(r.opened)} | ${r.shut.figureTop ?? "—"}px | ${r.shut.figureShare} | ${r.shut.figureHeight ?? "—"}px |`);
}
console.log("");
}
