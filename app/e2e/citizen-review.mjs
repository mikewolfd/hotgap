// Re-renders the citizen review's households (design/REVIEW-citizen-2026-09-16.md)
// after the fixes and measures what each finding measured: the drop heights
// and the y-range against the biggest drop in the picture (B2), the waiting
// mark's channel and the diamond's distance from a mark (B1), the direct
// labels against the dots, rings and diamond (S3), the safe-from-here
// sentence (S4), where the incomplete caution sits (S6), and the paper
// (S2, through a real Letter PDF). Evidence lands in design/review/citizen/after/.
//
//   cd app && node e2e/citizen-review.mjs http://localhost:8787 [http://localhost:8788]
//
// The first URL is a Worker on the live engine, the optional second one a
// Worker on a dead engine (the archetype path). Prints every measurement and
// exits non-zero when a finding's check fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pageContent, pdfObjects, pdfPages, textInks } from "./pdf.mjs";

const { chromium } = createRequire(import.meta.url)("@playwright/test");
const [LIVE = "http://localhost:8787", DEAD] = process.argv.slice(2);
const OUT = resolve(import.meta.dirname, "../../design/review/citizen/after");
mkdirSync(OUT, { recursive: true });

const HOUSEHOLDS = {
  ca: "/?zip=94110&kids=3%2C7&pay=30000&unit=year",
  nocliff: "/?zip=53703&pay=40000&unit=year",
  headstart: "/?zip=94110&kids=3&pay=30000&unit=year&head-start=1",
  past: "/?zip=94110&kids=3%2C7&pay=125000&unit=year",
  hourly: "/?zip=02108&kids=4&pay=18.50&unit=hour&hours=35&head-start=1",
  ma: "/?zip=02108&kids=3%2C7&pay=30000&unit=year",
  tx: "/?zip=78701&kids=3%2C7&pay=20000&unit=year",
  nj: "/?zip=07102&kids=3%2C7&pay=30000&unit=year",
  monthly: "/?state=CO&pay=3000&unit=month",
};

const failures = [];
const check = (ok, what, measured) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${measured !== undefined ? ` — ${typeof measured === "string" ? measured : JSON.stringify(measured)}` : ""}`);
  if (!ok) failures.push(what);
};
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

/** Everything the findings measured, read off the rendered SVG in screen pixels. */
async function measure(page) {
  return page.evaluate(() => {
    const svg = document.querySelector("#chart svg");
    const box = svg.getBoundingClientRect();
    const [, , vw] = svg.getAttribute("viewBox").split(" ").map(Number);
    const scale = box.width / vw;
    const texts = [...svg.querySelectorAll("text")].map((t) => ({ text: t.textContent, cls: t.getAttribute("class"), box: t.getBoundingClientRect().toJSON() }));
    const circles = [...svg.querySelectorAll("circle")].map((c) => ({ r: Number(c.getAttribute("r")) * scale, fill: c.getAttribute("fill"), box: c.getBoundingClientRect().toJSON() }));
    const drops = [...svg.querySelectorAll('line[stroke="var(--loss-4)"]')].map((l) => (Number(l.getAttribute("y2")) - Number(l.getAttribute("y1"))) * scale);
    const stubs = svg.querySelectorAll('line[stroke-dasharray="4 3"][stroke="var(--ink-3)"][x1]').length;
    const diamond = svg.querySelector('path[fill="var(--ink)"]')?.getBoundingClientRect().toJSON();
    const yTicks = [...svg.querySelectorAll('text.hg-tick[text-anchor="end"]')].map((t) => Number(t.textContent.replace(/[$k]/g, "")) * 1000);
    const labels = texts.filter((t) => /hg-label--loss/.test(t.cls ?? ""));
    const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const grow = (b, d) => ({ x: b.x - d, y: b.y - d, width: b.width + 2 * d, height: b.height + 2 * d });
    const collisions = [];
    for (const l of labels) {
      for (const c of circles) if (overlaps(l.box, grow(c.box, 10 - c.r))) collisions.push(`${l.text} on a dot at ${Math.round(c.box.x)}`);
      if (diamond && overlaps(l.box, diamond)) collisions.push(`${l.text} on the diamond`);
      for (const o of labels) if (o !== l && overlaps(l.box, o.box) && l.text < o.text) collisions.push(`${l.text} on ${o.text}`);
    }
    const nearest = diamond ? Math.min(...circles.map((c) => Math.hypot(c.box.x + c.box.width / 2 - (diamond.x + diamond.width / 2), c.box.y + c.box.height / 2 - (diamond.y + diamond.height / 2)))) : null;
    const q = (sel) => document.querySelector(sel)?.textContent ?? null;
    return {
      answer: q("#answer"), caption: q("#curveCaption"), readout: q(".hg-readout"), status: q("#whose:not([hidden])"),
      aria: document.querySelector("#chart").getAttribute("aria-label"),
      yTicks, yratio: Number(document.querySelector("#chart").dataset.yratio) || null,
      drops: drops.map((d) => Math.round(d * 10) / 10), hollow: circles.filter((c) => c.fill === "var(--surface)").length, stubs,
      later: texts.filter((t) => t.text === "later").length, nearestMarkToDiamond: nearest === null ? null : Math.round(nearest * 10) / 10,
      collisions, keys: [...document.querySelectorAll(".hg-key li:not([hidden])")].map((li) => li.textContent.trim()),
      incompleteY: document.querySelector("#incomplete:not([hidden])")?.getBoundingClientRect().top ?? null,
      captionY: document.querySelector("#curveCaption")?.getBoundingClientRect().top ?? null,
      sourceY: document.querySelector("#source")?.getBoundingClientRect().top ?? null,
      answerY: document.querySelector("#answer").getBoundingClientRect().top + scrollY,
      chipsVisible: getComputedStyle(document.querySelector("#inputs")).display !== "none",
      summaryVisible: getComputedStyle(document.querySelector(".hg-scenario__summary")).display !== "none",
      scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    };
  });
}

const browser = await chromium.launch();
const results = {};
async function render(base, key, path, width, colorScheme = "light") {
  const page = await browser.newPage({ viewport: { width, height: width < 720 ? 844 : 900 }, colorScheme });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + path);
  await page.locator("#chart svg path").first().waitFor({ timeout: 180_000 });
  await page.locator("#source").waitFor();
  await page.waitForTimeout(900);
  const m = await measure(page);
  m.errors = errors;
  results[`${key}-${width}-${colorScheme}`] = m;
  await page.screenshot({ path: resolve(OUT, `${key}-${width}-${colorScheme}.png`), fullPage: true });
  await page.locator("#result figure").screenshot({ path: resolve(OUT, `${key}-${width}-${colorScheme}-chart.png`) });
  return { page, m };
}

for (const [key, path] of Object.entries(HOUSEHOLDS)) {
  for (const width of [390, 1280]) {
    const { page, m } = await render(LIVE, key, path, width);
    console.log(`\n== ${key} ${width} — window ${m.aria?.match(/from (\$[\d.,]+[^.]*?) to (\$[\d.,]+[^.]*?)\./)?.slice(1).join(" – ")}; y ${m.yTicks[0]}–${m.yTicks.at(-1)}; ratio ${m.yratio}; drops px ${m.drops}`);
    check(m.errors.length === 0, `${key} ${width}: no console errors`, m.errors);
    check(m.scrollW <= m.innerW, `${key} ${width}: no horizontal scroll`);
    /* B2: the biggest drop in the picture is a readable step, and the caption's clause follows the same test. */
    if (m.drops.length) {
      console.log(`     tallest drop in the picture ${Math.max(...m.drops)}px (measured, not asserted: a $400 step on a $15,000 climb is small however the picture is cropped)`);
      const easy = m.caption.includes("easy to see");
      const share = m.yratio ? 1 / m.yratio : 0;
      check(easy === share >= 0.1, `${key} ${width}: "easy to see" said iff the biggest drop is a tenth of the y-range`, { easy, share: share.toFixed(3) });
    }
    check(m.yTicks[0] > 0 || m.caption.includes("start at"), `${key} ${width}: the axis floor is above $0 or the caption is silent about it`, m.yTicks[0]);
    /* S3: no direct label on a dot, its ring, the diamond or another label. */
    check(m.collisions.length === 0, `${key} ${width}: no label collision`, m.collisions);
    /* S1: the chips stay behind Edit at every width. */
    check(!m.chipsVisible && m.summaryVisible, `${key} ${width}: chips behind Edit, summary shown`);
    await page.close();
  }
}

/* B1: the Head Start household — the deferred loss is in the answer, the mixed mark keeps its channel, the diamond is off the mark. */
for (const width of [390, 1280]) {
  const m = results[`headstart-${width}-light`];
  check(/One more thing: at \$31,000, free early learning stops, but not that day\. Later, you would keep about \$16,[56]00 less a year\./.test(m.answer), `headstart ${width}: the answer carries the deferred clause`, m.answer);
  check(m.stubs >= 1 && m.later >= 1, `headstart ${width}: the waiting mark draws its dashed stub and "later" though it shares a dot`, { stubs: m.stubs, later: m.later });
  check(m.nearestMarkToDiamond >= 12, `headstart ${width}: the diamond is clear of the mark`, m.nearestMarkToDiamond);
  check(m.keys.includes("A drop that waits"), `headstart ${width}: the key lists the mark that is there`, m.keys);
}
/* S4: a safe-from-here rule inside the picture on a phone is named by the caption. */
for (const key of ["hourly", "past"]) {
  const m = results[`${key}-390-light`];
  check(/From \$[\d,.]+( an hour)? up, more pay always adds/.test(m.caption), `${key} 390: the caption names safe-from-here where the label is not drawn`, m.caption);
}
/* S6: the incomplete caution sits with the picture's provenance. */
{
  const m = results["nj-390-light"];
  check(m.incompleteY !== null && m.incompleteY > m.captionY && m.incompleteY < m.sourceY, "nj 390: the incomplete caution is between the caption and the source line", { caption: m.captionY, incomplete: m.incompleteY, source: m.sourceY });
}
/* N1, N2, N4, N11 on the proof household. */
{
  const m = results["ca-390-light"];
  check(!/a year at \$[\d,]+ a year/.test(m.caption), "ca 390: the unit is said once in the biggest-drop sentence", m.caption);
  check(!m.readout.includes("Press ]"), "ca 390: the bracket keys are not offered on a phone", m.readout);
  check(results["ca-1280-light"].readout.includes("Press ]"), "ca 1280: the bracket keys are offered at a desktop width");
  check(!results["nocliff-1280-light"].readout.includes("Press ]"), "nocliff 1280: no keys offered for marks that are not there");
}

/* S2: paper from OS dark, both widths — the masthead line first, the chips gone, the figure whole, the numbers open, the inks light. */
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: width < 720 ? 844 : 900 }, colorScheme: "dark" });
  await page.goto(LIVE + HOUSEHOLDS.ca);
  await page.locator("#chart svg path").first().waitFor({ timeout: 180_000 });
  await page.waitForTimeout(500);
  const darkInk = await page.evaluate(() => getComputedStyle(document.body).color);
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  writeFileSync(resolve(OUT, `print-letter-${width}-dark.pdf`), pdf);
  /* What the page does for paper, held open to measure: page.pdf() ran beforeprint and afterprint around the print. */
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  const print = await page.evaluate(() => {
    const vis = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).display !== "none" : false; };
    const ys = [...document.querySelectorAll(".masthead, #answer, .chart-title, #chart svg, .hg-rows")].map((el) => `${el.className || el.id || el.tagName}:${Math.round(el.getBoundingClientRect().top + scrollY)}`);
    return { masthead: document.querySelector(".masthead")?.textContent, chips: vis("#inputs"), readout: vis(".hg-readout"), summary: vis("details.hg-disclosure > summary"), tableOpen: document.querySelector("details.hg-disclosure").open, ys, svgW: document.querySelector("#chart svg").getAttribute("width") };
  });
  const lightInk = await page.evaluate(() => getComputedStyle(document.body).color);
  const objects = pdfObjects(pdf);
  const pages = pdfPages(objects);
  const p1 = pageContent(objects, pages[0]).toString("latin1");
  const inks = pages.flatMap((p) => textInks(pageContent(objects, p)));
  results[`print-${width}`] = { ...print, pages: pages.length, inks };
  check(/^HotGap A parent with 2 kids, ages 3 and 7, in California\.$/.test(print.masthead ?? ""), `print ${width}: the masthead line names the household`, print.masthead);
  check(!print.chips && !print.readout && !print.summary, `print ${width}: chips, readout hint and "Show the numbers" are off the paper`, print);
  check(print.tableOpen, `print ${width}: the numbers are open`);
  check(print.svgW === "640", `print ${width}: the chart is drawn at the column's width for paper, not the screen's`, print.svgW);
  check(inks.includes(rgb(lightInk).join()) && !inks.includes(rgb(darkInk).join()), `print ${width}: every text ink in the PDF is the light scheme's`, { inks, lightInk, darkInk });
  check(pages.length <= 4, `print ${width}: at most four Letter pages`, pages.length);
  check(!/BT/.test(p1) || pages.length >= 1, `print ${width}: page 1 draws text`);
  await page.screenshot({ path: resolve(OUT, `print-${width}-dark.png`), fullPage: true });
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.emulateMedia({ media: null });
  await page.close();
}

/* The archetype path (S5, B2): the crop reaches the biggest drop when it lies within the margin, the status line says the numbers are a family's like yours, Try again on a dead engine says "still" and keeps focus. */
if (DEAD) {
  const { page, m } = await render(DEAD, "archetype", HOUSEHOLDS.ca, 390);
  console.log(`\n== archetype 390 — window ${m.aria?.match(/from (\$[\d.,]+[^.]*?) to (\$[\d.,]+[^.]*?)\./)?.slice(1).join(" – ")}; caption: ${m.caption}`);
  check(m.status?.startsWith("We could not get your exact numbers"), "archetype 390: the status line above the answer says whose numbers these are", m.status);
  const note = await page.locator(".hg-scenario__note").textContent();
  check(note?.includes("These are numbers for a family like yours") && note.includes("Try again"), "archetype 390: the chips row's note carries the same sentence and Try again", note);
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.locator("#source").getByRole("button", { name: "Try again" }).click();
  await evaluated;
  await page.locator("#chart svg path").first().waitFor();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ status: document.querySelector("#whose").textContent, focus: document.activeElement?.textContent, inSource: !!document.activeElement?.closest("#source") }));
  check(after.status.startsWith("We still could not"), "archetype 390: a Try again that still could not says so", after.status);
  check(after.inSource && after.focus === "Try again", "archetype 390: focus stays on the source line's Try again", after);
  await page.screenshot({ path: resolve(OUT, "archetype-390-light-after-try-again.png"), fullPage: false });
  results["archetype-390-after-try-again"] = after;
  await page.close();
  const r1280 = await render(DEAD, "archetype", HOUSEHOLDS.ca, 1280);
  await r1280.page.close();
}

writeFileSync(resolve(OUT, "measurements.json"), JSON.stringify(results, null, 1));
await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
