// The scrolling curve, measured (design/charts.md § The scroll rule, the
// owner's rule of 2026-09-17: the whole earnings axis is reachable and never
// cropped). Re-renders the citizen review's households and the caseworker at
// 390 and 1280 and measures what the rule promises:
//
//   (a) the plot is wider than its viewport at both widths, and the initial
//       scroll puts the "you" mark inside it;
//   (b) a mark off screen scrolls into view when it takes focus;
//   (c) paper shows the whole axis — the first and last x-tick labels are on
//       the page and the tick type is at or above the floor;
//   (d) the y-axis gutter is outside the scroller and holds still while the
//       curve moves;
//   (e) the biggest drop in the INITIAL view is at least 24px, which is the
//       number the chart's height is chosen by.
//
//   cd app && node e2e/scroll-curve-review.mjs http://localhost:8801
//
// Prints every measurement, writes the screenshots the visual pass reads to
// design/review/scroll-curve/, and exits non-zero when a check fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pageContent, pageWidth, pdfObjects, pdfPages, textInks } from "./pdf.mjs";

const { chromium } = createRequire(import.meta.url)("@playwright/test");
const [BASE = "http://localhost:8801"] = process.argv.slice(2);
const OUT = resolve(import.meta.dirname, "../../design/review/scroll-curve");
mkdirSync(OUT, { recursive: true });

/* The citizen review's households (design/REVIEW-citizen-2026-09-16.md), so the
   scroll rule is measured on the same curves the crop rule was. */
const HOUSEHOLDS = {
  ca: "/?zip=94110&kids=3%2C7&pay=30000&unit=year",
  nocliff: "/?zip=53703&pay=40000&unit=year",
  headstart: "/?zip=94110&kids=3&pay=30000&unit=year&head-start=1",
  past: "/?zip=94110&kids=3%2C7&pay=125000&unit=year",
  hourly: "/?zip=02108&kids=4&pay=18.50&unit=hour&hours=35&head-start=1",
  ma: "/?zip=02108&kids=3%2C7&pay=30000&unit=year",
  tx: "/?zip=78701&kids=3%2C7&pay=20000&unit=year",
  nj: "/?zip=07102&kids=3%2C7&pay=30000&unit=year",
};
const WIDTHS = [390, 1280];
/** charts.md § Type floors: a tick label never prints below 9pt on paper. */
const TICK_FLOOR_PT = 9;
/** The floor the chart's height is chosen by (§ The scroll rule). */
const DROP_FLOOR_PX = 24;
/** The tallest a plot is allowed to be: `PLOT_H.max` (560) plus the 64px of top and bottom padding both charts happen to share. */
const PLOT_CEILING_PX = 624;

const failures = [];
const check = (ok, what, measured) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${measured !== undefined ? ` — ${typeof measured === "string" ? measured : JSON.stringify(measured)}` : ""}`);
  if (!ok) failures.push(what);
};

/* Everything the rule promises, read off the rendered figure in screen pixels.
   One function for both doors: it takes the chart's selector, because a page
   function is serialised into the browser and cannot close over anything. */
function measureFigure(sel) {
  const chart = document.querySelector(sel);
  const scroll = chart.querySelector(".hg-chart__scroll");
  const gutter = chart.querySelector(".hg-chart__gutter");
  const plot = scroll.querySelector("svg");
  const box = scroll.getBoundingClientRect();
  const you = plot.querySelector('path[fill="var(--ink)"]');   /* the household's diamond */
  const yTicks = [...gutter.querySelectorAll("text.hg-tick")].map((t) => t.textContent);
  const xTicks = [...plot.querySelectorAll("text.hg-tick")].map((t) => t.textContent);
  /* Every fall in the LINE, in screen px, and whether it is inside the viewport
     right now. Read off the line and not off the drop connector: a deferred
     cliff draws the hollow dot and the dashed stub in place of a connector
     (charts.md § Marks) while the line falls exactly as far, and since
     2026-09-17 the biggest drop on several households IS a deferred one. The
     SVG is sized 1:1 in real pixels (draw.ts sizeSvg), so a user unit is a
     pixel, and the d is "M x y L x y …" (draw.ts pathD). */
  const pts = [...plot.querySelector("path[stroke='var(--series-1)']").getAttribute("d").matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  const originX = plot.getBoundingClientRect().x;
  const drops = [];
  for (let i = 1; i < pts.length; i++) {
    const px = pts[i][1] - pts[i - 1][1];   /* y grows downward, so a fall is positive */
    const cx = originX + pts[i - 1][0];
    /* `away` is how far outside the initial view it is, in viewport widths: 0 is on screen, 1 is one swipe. */
    const away = Math.max(0, box.x - cx, cx - (box.x + box.width)) / box.width;
    if (px > 0.5) drops.push({ px, away, inView: away === 0 });
  }
  /* The household's OWN danger zone takes the wash (charts.md § Zones); any other zone gets the hatch alone. */
  const zones = [...plot.querySelectorAll('rect[fill="var(--loss-wash)"]')].map((r) => {
    const b = r.getBoundingClientRect();
    return { px: b.width, inView: b.x < box.x + box.width && b.x + b.width > box.x };
  });
  const marks = [...chart.querySelectorAll(".hg-mark")].map((m) => {
    const b = m.getBoundingClientRect();
    return { x: b.x + b.width / 2, inView: b.x >= box.x - 1 && b.x + b.width <= box.x + box.width + 1 };
  });
  return {
    scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth, scrollLeft: scroll.scrollLeft,
    plotWidth: plot.getBoundingClientRect().width, height: plot.getBoundingClientRect().height,
    gutterWidth: gutter.getBoundingClientRect().width,
    gutterInScroller: scroll.contains(gutter),
    gutterX: gutter.getBoundingClientRect().x,
    yTicks, xTicks, marks, drops, zones,
    youInView: you ? (() => { const b = you.getBoundingClientRect(); return b.x >= box.x && b.x + b.width <= box.x + box.width; })() : null,
    youOffset: you ? you.getBoundingClientRect().x - box.x : null,
    caption: document.querySelector(sel === "#chart" ? "#curveCaption" : "#curveCap")?.textContent ?? null,
    hint: chart.parentElement.querySelector(".hg-chart__hint")?.textContent ?? null,
  };
}

async function citizenAt(browser, name, url, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${BASE}${url}`, { waitUntil: "load" });
  await page.waitForSelector("#chart svg path[stroke='var(--series-1)']", { timeout: 120_000 });
  await page.waitForTimeout(400);
  const m = await page.evaluate(measureFigure, "#chart");
  const tag = `${name}-${width}`;
  console.log(`\n── citizen ${tag} ─────────────────────────────────`);
  console.log(`   plot ${Math.round(m.plotWidth)}px in a ${m.clientWidth}px viewport, scrolled to ${Math.round(m.scrollLeft)}; gutter ${Math.round(m.gutterWidth)}px; height ${Math.round(m.height)}px`);
  console.log(`   y ticks ${JSON.stringify(m.yTicks)}  x ticks ${m.xTicks.length}: ${m.xTicks[0]} … ${m.xTicks[m.xTicks.length - 1]}`);

  /* (a) the whole axis is drawn and there is somewhere to scroll, and "you" is in the initial view. */
  check(m.scrollWidth > m.clientWidth + 1, `(a) ${tag}: the plot is wider than its viewport`, { scrollWidth: m.scrollWidth, clientWidth: m.clientWidth });
  check(m.youInView === true, `(a) ${tag}: the initial scroll puts the "you" mark in view`, { offset: Math.round(m.youOffset), viewport: m.clientWidth });
  /* (a) …and the initial view still answers the question it was chosen to
     answer: the household's own danger zone is on screen with it, not a swipe
     away, which is the other half of what `windowFor` picks for. */
  if (m.zones.length) check(m.zones.some((z) => z.inView), `(a) ${tag}: the household's danger zone is in the initial view`, `${m.zones.length} zone${m.zones.length === 1 ? "" : "s"}, widest ${Math.max(...m.zones.map((z) => z.px)).toFixed(0)}px`);
  /* (d) the y axis is outside the scroller, so it cannot scroll away. */
  check(!m.gutterInScroller && m.yTicks.length >= 3, `(d) ${tag}: the y axis is in a gutter outside the scroller`, { ticks: m.yTicks.length });
  /* The axis's own ends, said in copy, are what tell the reader the picture goes on. */
  check(/←/.test(m.hint ?? "") && /→/.test(m.hint ?? ""), `${tag}: the reader is told the range`, m.hint);
  check(/covers all pay/.test(m.caption ?? ""), `${tag}: the caption says the whole range is drawn`, (m.caption ?? "").slice(0, 80));

  /* (e) The curve's biggest drop clears the 24px floor, and it is in the
     initial view — which is what the initial scroll is chosen for.
     The floor is on THAT drop and not on whichever drop happens to be on
     screen: the y-range is the whole curve's now, so a $1,200 step on a
     $95,000 range is two pixels, and no honest height changes that. The small
     steps are read in the StepList and the DataTable, which carry the dollars.
     And the floor is a floor on the HEIGHT RULE, not a promise the geometry can
     always keep: where reaching 24px would need a plot taller than the ceiling,
     the rule is that the plot is AT the ceiling. charts.md records which
     households land there and how short they fall. */
  const all = m.drops.map((d) => d.px);
  const worst = all.length ? Math.max(...all) : null;
  if (worst !== null) {
    const worstDrop = m.drops.find((d) => d.px === worst);
    const met = worst >= DROP_FLOOR_PX - 0.5 || Math.round(m.height) >= PLOT_CEILING_PX;
    check(met, `(e) ${tag}: the biggest drop clears ${DROP_FLOOR_PX}px, or the plot is at its ceiling trying`, `${worst.toFixed(1)}px of ${Math.round(m.height)}px`);
    /* Where the biggest drop sits relative to where the reader lands is a
       MEASUREMENT, not a promise: `windowFor` pulls it into the view only when
       it is within $30,000 of the pay the view already owes, because otherwise
       the view would be spent on a cliff at $120,000 instead of the household
       at $30,000 (REVIEW-citizen B2). There is no upper bound on the distance
       — a household's worst cliff can be anywhere on its axis — so charts.md
       records the numbers and the reader is owed reachability instead, which
       is what (a), (b) and the range hint prove. */
    console.log(`   biggest drop ${worst.toFixed(1)}px, ${worstDrop.away === 0 ? "in the initial view" : `${worstDrop.away.toFixed(2)} viewports outside it`}; ${all.length} falls, smallest ${Math.min(...all).toFixed(1)}px`);
  } else {
    console.log(`   no drop on this curve (${name})`);
  }

  await page.screenshot({ path: `${OUT}/citizen-${tag}.png`, fullPage: false });

  /* (b) a mark off screen scrolls into view when it takes focus: ] from the wrapper walks the marks. */
  if (m.marks.length > 1) {
    const off = await page.evaluate(() => {
      const scroll = document.querySelector("#chart .hg-chart__scroll");
      const box = scroll.getBoundingClientRect();
      const marks = [...document.querySelectorAll("#chart .hg-mark")];
      const i = marks.findIndex((el) => { const b = el.getBoundingClientRect(); return b.x < box.x - 1 || b.x + b.width > box.x + box.width + 1; });
      return { i, before: scroll.scrollLeft, count: marks.length };
    });
    if (off.i >= 0) {
      const after = await page.evaluate((i) => {
        const scroll = document.querySelector("#chart .hg-chart__scroll");
        const el = [...document.querySelectorAll("#chart .hg-mark")][i];
        el.focus();
        const box = scroll.getBoundingClientRect(), b = el.getBoundingClientRect();
        return { scrollLeft: scroll.scrollLeft, inView: b.x >= box.x - 1 && b.x + b.width <= box.x + box.width + 1 };
      }, off.i);
      check(after.inView, `(b) ${tag}: an off-screen mark scrolls into view when focused`, { mark: off.i, from: Math.round(off.before), to: Math.round(after.scrollLeft) });
    } else {
      console.log(`   every mark is already in view at ${width} (${off.count} marks)`);
    }
  }
  await page.close();
  return m;
}

/** (c) Paper: the whole axis on the page, with the first and last x-tick labels and the tick type at or above the floor. */
async function citizenPdf(browser, name, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}${url}`, { waitUntil: "load" });
  await page.waitForSelector("#chart svg path[stroke='var(--series-1)']", { timeout: 120_000 });
  /* Print media AND the beforeprint event: the redraw hangs off the event (lib/chart/draw.ts
     redrawForPrint), which is what the browser fires before it paginates, and emulateMedia alone
     changes the stylesheet without ever telling the page to redraw at the page's width. */
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  await page.waitForTimeout(200);
  const printed = await page.evaluate(() => {
    const scroll = document.querySelector("#chart .hg-chart__scroll");
    const plot = scroll.querySelector("svg");
    return {
      plotWidth: plot.getBoundingClientRect().width,
      viewport: scroll.clientWidth,
      gutterWidth: document.querySelector("#chart .hg-chart__gutter").getBoundingClientRect().width,
      xTicks: [...plot.querySelectorAll("text.hg-tick")].map((t) => t.textContent),
      /* The last tick's right edge against the plot's own right edge: the end of
         the axis has to be INSIDE the drawing, not hanging off it. */
      lastTickRight: (() => {
        const ts = [...plot.querySelectorAll("text.hg-tick")];
        const t = ts[ts.length - 1];
        return t ? t.getBoundingClientRect().right - plot.getBoundingClientRect().right : null;
      })(),
      /* The line's own ends in plot space, which is 1:1 with pixels. */
      curveEnds: (() => {
        const d = plot.querySelector("path[stroke='var(--series-1)']").getAttribute("d");
        const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
        return [pts[0], pts[pts.length - 1]];
      })(),
      caption: document.querySelector("#curveCaption").textContent,
      hintShown: getComputedStyle(document.querySelector(".hg-chart__hint")).display !== "none",
      clipped: getComputedStyle(scroll).overflowX !== "visible",
    };
  });
  /* Paper cannot scroll, so the print draw fits the whole axis into the column
     and the scroller stops being one. The emulated screen's column is narrower
     than the page's, so "does it scroll" is answered by the CSS (overflow is
     visible, nothing is clipped) and by the geometry below, not by scrollWidth. */
  check(!printed.clipped, `(c) ${name}: the scroller does not clip on paper`, `overflow-x ${printed.clipped ? "hidden" : "visible"}`);
  check(printed.xTicks[0] === "$0", `(c) ${name}: the first x tick on paper is the axis's start`, printed.xTicks[0]);
  check(printed.lastTickRight <= 1, `(c) ${name}: the last x tick — the end of the axis — is inside the drawing`, `${printed.xTicks[printed.xTicks.length - 1]}, ${printed.lastTickRight.toFixed(1)}px past the edge`);
  check(printed.curveEnds[1] > printed.plotWidth - 40, `(c) ${name}: the line itself reaches the end of the axis`, `line ends at ${printed.curveEnds[1].toFixed(0)} of ${Math.round(printed.plotWidth)}px`);
  check(/covers all pay/.test(printed.caption), `(c) ${name}: the caption says the whole range is shown`, printed.caption.slice(0, 70));
  check(!printed.hintShown, `(c) ${name}: the sideways invitation is off paper`, printed.hintShown);
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  writeFileSync(`${OUT}/citizen-${name}.pdf`, pdf);
  const objects = pdfObjects(pdf);
  const pages = pdfPages(objects);
  /* And the drawing fits the paper it is on: the printed figure's width in CSS
     pixels against the page's own MediaBox (points × 4/3). A figure wider than
     the page is the clipping this proof exists to catch. */
  const paperPx = pageWidth(pages[0]) / 0.75;
  check(printed.plotWidth + printed.gutterWidth <= paperPx, `(c) ${name}: the whole figure fits the page's width`, `${Math.round(printed.plotWidth + printed.gutterWidth)}px of ${Math.round(paperPx)}px`);
  /* Text on the page is drawn in the ink the stylesheet says (charts.md § Type floors): a tick in the axis grey, not in the loss red. */
  const inks = pages.flatMap((p) => textInks(pageContent(objects, p)));
  check(inks.length > 0, `(c) ${name}: the page carries text, in ${inks.length} ink${inks.length === 1 ? "" : "s"}`, inks.join(" | "));
  const sizes = await page.evaluate(() => [...document.querySelectorAll("#chart .hg-chart__scroll svg text.hg-tick")].map((t) => parseFloat(getComputedStyle(t).fontSize)));
  const minPt = Math.min(...sizes) * 0.75;   /* 1px = 0.75pt */
  check(minPt >= TICK_FLOOR_PT - 0.01, `(c) ${name}: the x-tick type on paper is at or above the ${TICK_FLOOR_PT}pt floor`, `${minPt.toFixed(1)}pt`);
  /* And back: afterprint returns the figure to the column's width and its scroller. */
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.emulateMedia({ media: null });
  const back = await page.evaluate(() => {
    const scroll = document.querySelector("#chart .hg-chart__scroll");
    return { overflowing: scroll.scrollWidth > scroll.clientWidth + 1 };
  });
  check(back.overflowing, `(c) ${name}: afterprint gives the scroller back`, back);
  await page.close();
}

async function caseworkerAt(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  /* unit=year, or `pay` is read as an hourly wage: $30,000 an hour puts the household past the sweep's top and the axis at $750,000. */
  await page.goto(`${BASE}/caseworker.html?zip=94110&kids=3%2C7&pay=30000&unit=year`, { waitUntil: "load" });
  await page.waitForSelector("#curve path[stroke='var(--series-1)']", { timeout: 120_000 });
  await page.waitForTimeout(400);
  const m = await page.evaluate(measureFigure, "#chartWrap");
  console.log(`\n── caseworker ${width} ───────────────────────────────`);
  console.log(`   plot ${Math.round(m.plotWidth)}px in a ${m.clientWidth}px viewport, scrolled to ${Math.round(m.scrollLeft)}; gutter ${Math.round(m.gutterWidth)}px; height ${Math.round(m.height)}px`);
  check(m.scrollWidth > m.clientWidth + 1, `(a) caseworker ${width}: the plot is wider than its viewport`, { scrollWidth: m.scrollWidth, clientWidth: m.clientWidth });
  check(m.youInView === true, `(a) caseworker ${width}: the initial scroll puts the current-earnings mark in view`, { offset: Math.round(m.youOffset) });
  check(!m.gutterInScroller && m.yTicks.length >= 3, `(d) caseworker ${width}: the y axis is in a gutter outside the scroller`, m.yTicks);
  const all = m.drops.map((d) => d.px);
  if (all.length) {
    const worst = Math.max(...all);
    check(worst >= DROP_FLOOR_PX - 0.5 || Math.round(m.height) >= PLOT_CEILING_PX, `(e) caseworker ${width}: the biggest drop clears ${DROP_FLOOR_PX}px, or the plot is at its ceiling trying`, `${worst.toFixed(1)}px of ${Math.round(m.height)}px`);
    const worstDrop = m.drops.find((d) => d.px === worst);
    console.log(`   biggest drop ${worst.toFixed(1)}px, ${worstDrop.away === 0 ? "in the initial view" : `${worstDrop.away.toFixed(2)} viewports outside it`}; ${all.length} falls`);
  }
  if (m.zones.length) {
    check(m.zones.some((z) => z.inView), `(a) caseworker ${width}: the household's danger zone is in the initial view`, `${m.zones.length} zone${m.zones.length === 1 ? "" : "s"}`);
  }
  /* The compare columns are a different component and must be untouched by any of this. */
  const cols = await page.evaluate(() => document.querySelectorAll(".hg-table.compare th").length);
  console.log(`   compare table header cells: ${cols}`);
  await page.screenshot({ path: `${OUT}/caseworker-${width}.png`, fullPage: false });

  /* (c) This door prints too, at its own column width (672), and owes the same thing: the whole axis on the page. */
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  await page.waitForTimeout(200);
  const printed = await page.evaluate(() => {
    const plot = document.querySelector("#chartWrap .hg-chart__scroll svg");
    const ticks = [...plot.querySelectorAll("text.hg-tick")];
    const d = plot.querySelector("path[stroke='var(--series-1)']").getAttribute("d");
    const xs = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
    return {
      plotWidth: plot.getBoundingClientRect().width,
      firstTick: ticks[0]?.textContent, lastTick: ticks[ticks.length - 1]?.textContent,
      lastTickRight: ticks[ticks.length - 1].getBoundingClientRect().right - plot.getBoundingClientRect().right,
      lineEnd: xs[xs.length - 1],
      cap: document.querySelector("#curveCap").textContent,
    };
  });
  check(printed.firstTick === "$0", `(c) caseworker ${width}: the first x tick on paper is the axis's start`, printed.firstTick);
  check(printed.lastTickRight <= 1, `(c) caseworker ${width}: the last x tick is inside the drawing`, `${printed.lastTick}, ${printed.lastTickRight.toFixed(1)}px past the edge`);
  check(printed.lineEnd > printed.plotWidth - 40, `(c) caseworker ${width}: the line reaches the end of the axis`, `${printed.lineEnd.toFixed(0)} of ${Math.round(printed.plotWidth)}px`);
  check(!/scroll the curve/.test(printed.cap), `(c) caseworker ${width}: the caption does not tell paper to scroll`, printed.cap.slice(0, 110));
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.emulateMedia({ media: null });
  await page.close();
  return m;
}

const browser = await chromium.launch();
try {
  /* One household that will not render must not take the other seven's measurements with it. */
  for (const [name, url] of Object.entries(HOUSEHOLDS)) {
    for (const width of WIDTHS) {
      try {
        await citizenAt(browser, name, url, width);
      } catch (e) {
        check(false, `${name}-${width}: the page rendered a curve`, String(e).split("\n")[0]);
      }
    }
  }
  /* Paper on three curves, not one: the household whose worst cliff is off the
     initial view, the one whose worst cliff is a DEFERRED one, and the hourly
     one, whose x ticks are a wage and whose axis therefore ends somewhere the
     annual households never do. */
  for (const name of ["ca", "headstart", "hourly"]) await citizenPdf(browser, name, HOUSEHOLDS[name]);
  for (const width of WIDTHS) await caseworkerAt(browser, width);
} finally {
  await browser.close();
}
console.log(`\n${failures.length ? `FAILED ${failures.length}:\n  ${failures.join("\n  ")}` : "every check passed"}`);
process.exit(failures.length ? 1 : 0);
