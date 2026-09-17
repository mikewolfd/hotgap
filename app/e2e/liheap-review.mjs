// Renders and measures the EligibilityBoundary (design/inventory.md #23) on
// all three surfaces for the visual review (design/REVIEW-liheap-2026-09-17.md):
// the citizen tick, key entry and paragraph; the caseworker ledger row; the
// journalist row and CSV pair — at 390 and 1280, light and dark, on paper,
// with the toggle off and on, for a state with bands (TX), a flat top band
// (MO), a taper that is counted (MI), a null served share (HI), and a
// household whose range never crosses the limit (a spouse earning past it).
// Evidence lands in design/review/liheap/ (or the directory given), and the
// review's findings are checked here so the after-render is a proof.
//
//   cd app && node e2e/liheap-review.mjs http://localhost:8798 [outDir]
//
// The URL is a Worker on the live engine (wrangler dev on 8798 with the rate
// limiter off). Prints every measurement and exits non-zero when a check fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pageContent, pdfObjects, pdfPages, textInks } from "./pdf.mjs";

const { chromium } = createRequire(import.meta.url)("@playwright/test");
const [BASE = "http://localhost:8798", OUT_ARG] = process.argv.slice(2);
const OUT = resolve(import.meta.dirname, OUT_ARG ?? "../../design/review/liheap");
mkdirSync(OUT, { recursive: true });

/* The households the brief names; the same flags drive the citizen and caseworker pages. */
const HOUSEHOLDS = {
  tx: "?state=TX&kids=3%2C7&pay=30000&unit=year&rent=1200",
  txOn: "?state=TX&kids=3%2C7&pay=30000&unit=year&rent=1200&energy-assistance=1",
  mo: "?state=MO&kids=3%2C7&pay=30000&unit=year&rent=1000",
  mi: "?state=MI&kids=3%2C7&pay=20000&unit=year&rent=1000",
  miOn: "?state=MI&kids=3%2C7&pay=20000&unit=year&rent=1000&energy-assistance=1",
  hi: "?state=HI&kids=3%2C7&pay=30000&unit=year&rent=1800",
  /* A spouse earning past the household limit: the earner's own limit is below $0, so there is no marker at all. */
  none: "?state=TX&kids=3%2C7&pay=30000&unit=year&rent=1200&married=1&spouse-earnings=60000",
};
const STATES = ["TX", "MO", "MI", "HI"];

const failures = [];
const check = (ok, what, measured) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${measured !== undefined ? ` — ${typeof measured === "string" ? measured : JSON.stringify(measured)}` : ""}`);
  if (!ok) failures.push(what);
};
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Number(((x + 0.05) / (y + 0.05)).toFixed(2)); };
const measurements = {};

/** Everything the review reads off the citizen page. */
async function measureCitizen(page) {
  return page.evaluate(() => {
    const svg = document.querySelector("#chart svg");
    const box = svg.getBoundingClientRect();
    const [, , vw] = svg.getAttribute("viewBox").split(" ").map(Number);
    const scale = box.width / vw;
    const cs = (el) => getComputedStyle(el);
    const tick = svg.querySelector("line[data-boundary]");
    const tickBox = tick?.getBoundingClientRect();
    const circles = [...svg.querySelectorAll("circle")].map((c) => c.getBoundingClientRect());
    const nearTick = tick ? circles.filter((c) => Math.abs(c.x + c.width / 2 - (tickBox.x + tickBox.width / 2)) < 12).length : null;
    const key = [...document.querySelectorAll(".hg-key li")].map((li) => ({ text: li.textContent.trim(), hidden: li.hidden, strokes: [...li.querySelectorAll("[stroke]")].map((e) => e.getAttribute("stroke")), fills: [...li.querySelectorAll("[fill]")].map((e) => e.getAttribute("fill")) }));
    const boundary = document.querySelector("#boundary");
    const steps = [...document.querySelectorAll("#steps li")].map((li) => ({ at: li.querySelector(".hg-rows__at").textContent, text: li.querySelector("p").textContent, loss: li.querySelector(".hg-rows__loss")?.textContent ?? null, lossInk: li.querySelector(".hg-rows__loss") ? getComputedStyle(li.querySelector(".hg-rows__loss")).color : null }));
    const marks = [...document.querySelectorAll(".hg-marks .hg-mark")].map((b) => b.getAttribute("aria-label"));
    const assumed = [...document.querySelectorAll(".assumed li")].map((li) => li.textContent);
    const chartBg = cs(document.querySelector("#chart")).backgroundColor, figureBg = cs(document.querySelector(".result") ?? document.body).backgroundColor;
    return {
      tick: tick && { x: tickBox.x, height: tickBox.height, width: Number(tick.getAttribute("stroke-width")), stroke: tick.getAttribute("stroke"), ink: cs(tick).stroke, y2: Number(tick.getAttribute("y2")), y1: Number(tick.getAttribute("y1")), inPicture: tickBox.x >= box.x && tickBox.x <= box.x + box.width, circlesWithin12px: nearTick, scale },
      chartBg, figureBg, bodyBg: cs(document.body).backgroundColor,
      key, keyBoundary: key.find((k) => /heating/.test(k.text)) ?? null,
      boundary: boundary && { text: boundary.textContent, counted: boundary.dataset.counted, color: cs(boundary).color, size: parseFloat(cs(boundary).fontSize), width: boundary.getBoundingClientRect().width, top: boundary.getBoundingClientRect().top + scrollY, lines: Math.round(boundary.getBoundingClientRect().height / parseFloat(cs(boundary).lineHeight)) },
      keyTop: document.querySelector(".hg-key").getBoundingClientRect().top + scrollY, captionTop: document.querySelector("#curveCaption").getBoundingClientRect().top + scrollY,
      steps, liheapSteps: steps.filter((s) => /heating/.test(s.text)), marks, marksAboutHeating: marks.filter((m) => /heating/i.test(m ?? "")),
      aria: document.querySelector("#chart").getAttribute("aria-label"), answer: document.querySelector("#answer").textContent, assumedLiheap: assumed.filter((t) => /heating|LIHEAP/.test(t)),
      xTicks: [...svg.querySelectorAll("text.hg-tick")].filter((t) => t.getAttribute("text-anchor") === "middle").map((t) => t.textContent),
      lossLines: svg.querySelectorAll('line[stroke="var(--loss-4)"]').length, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
      lossInkOnBoundary: boundary ? /loss/.test(cs(boundary).color) : null,
    };
  });
}

/** Everything the review reads off the caseworker page. */
async function measureCaseworker(page) {
  return page.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const rows = [...document.querySelectorAll("#ledgerRows tr")].map((tr) => ({
      boundary: tr.dataset.boundary === "true", at: tr.children[0].textContent, program: tr.children[1].firstChild.textContent.trim(), tag: tr.querySelector(".hg-tag")?.textContent ?? null, badge: tr.querySelector(".hg-badge")?.textContent ?? null,
      cite: tr.querySelector(".hg-cite")?.textContent ?? null, who: tr.children[2].textContent, atColor: cs(tr.children[0]).color, bg: cs(tr).backgroundColor, tagColor: tr.querySelector(".hg-tag") ? cs(tr.querySelector(".hg-tag")).color : null, tagBorder: tr.querySelector(".hg-tag") ? cs(tr.querySelector(".hg-tag")).borderColor : null,
      height: tr.getBoundingClientRect().height, citeWidth: tr.querySelector(".hg-cite")?.getBoundingClientRect().width ?? null,
    }));
    const drops = [...document.querySelectorAll("#dropRows tr")].map((tr) => tr.textContent.replace(/\s+/g, " ").trim());
    const tiles = [...document.querySelectorAll("#tiles > *")].map((t) => t.textContent.replace(/\s+/g, " ").trim());
    const marks = [...document.querySelectorAll("#marks .hg-mark")].map((b) => b.getAttribute("aria-label"));
    const liheapRow = rows.find((r) => /LIHEAP/.test(r.program)) ?? null;
    return {
      rows, liheapRow, boundaryRows: rows.filter((r) => r.boundary).length, drops, dropsAboutLiheap: drops.filter((d) => /LIHEAP|energy/i.test(d)), tiles, marks, marksAboutLiheap: marks.filter((m) => /LIHEAP|energy/i.test(m ?? "")),
      assumed: [...document.querySelectorAll("#assumed li")].map((li) => li.textContent).filter((t) => /LIHEAP|energy/i.test(t)),
      correctionsRest: document.querySelector("#correctionsRest")?.textContent ?? "", coverage: document.querySelector("#coverage")?.textContent ?? "",
      chartAria: document.querySelector("#chartWrap").getAttribute("aria-label"), ledgerNote: document.querySelector("#ledgerNote").textContent,
      curveTicks: [...document.querySelectorAll("#curve text")].map((t) => t.textContent), bodyBg: cs(document.body).backgroundColor, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
      handout: document.querySelector("#handout")?.textContent ?? "",
    };
  });
}

/** The journalist row for a state. */
async function measureJournalist(page, st) {
  await page.click(`.tile[data-st="${st}"]`);
  return page.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const list = document.querySelector("#liheap"), li = list.querySelector("li");
    const at = li.querySelector(".hg-rows__at"), chip = at.querySelector(".hg-tag"), p = li.querySelector("p"), cite = li.querySelector(".hg-cite");
    return {
      hidden: list.hidden, footing: list.dataset.footing, name: at.firstChild.textContent.trim(), chip: chip?.textContent ?? null, facts: p.textContent, cite: cite.textContent, links: [...cite.querySelectorAll("a")].map((a) => a.href),
      rule: cs(list).borderTopWidth + " " + cs(list).borderTopColor, factsSize: parseFloat(cs(p).fontSize), factsColor: cs(p).color, citeSize: parseFloat(cs(cite).fontSize), citeColor: cs(cite).color, chipColor: chip ? cs(chip).color : null, chipBorder: chip ? cs(chip).borderColor : null,
      bg: cs(document.body).backgroundColor, height: list.getBoundingClientRect().height, lossInk: /loss/.test(p.className + at.className), atWidth: at.getBoundingClientRect().width, pWidth: p.getBoundingClientRect().width,
      stateSub: document.querySelector("#stateSub").textContent, rankText: document.querySelector("#rankList").textContent, legend: document.querySelector("#legend").textContent,
    };
  });
}

const browser = await chromium.launch();
try {
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    for (const scheme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, timezoneId: "America/New_York" });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      console.log(`\n== citizen ${width} ${scheme} ==`);
      for (const [key, q] of Object.entries(HOUSEHOLDS)) {
        const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"), { timeout: 240_000 });
        await page.goto(`${BASE}/${q}`);
        const ev = await (await evaluated).json();
        await page.locator("#chart svg path").first().waitFor({ timeout: 60_000 });
        const m = await measureCitizen(page);
        m.evaluation = { liheap: ev.liheap, cliffsAtLimit: ev.liheap ? ev.analysis.cliffs.filter((c) => c.endEarnings >= ev.liheap.earningsLimit && c.startEarnings < ev.liheap.earningsLimit).map((c) => ({ start: c.startEarnings, end: c.endEarnings, drop: c.drop, lost: c.programsLost })) : null };
        measurements[`citizen-${width}-${scheme}-${key}`] = m;
        console.log(`  ${key}: tick ${m.tick ? `x=${Math.round(m.tick.x)} h=${m.tick.height.toFixed(1)}px w=${m.tick.width} ${m.tick.stroke} circles≤12px=${m.tick.circlesWithin12px}` : "none"}; key=${m.keyBoundary ? (m.keyBoundary.hidden ? "hidden" : "shown") : "absent"}; p=${m.boundary ? `${m.boundary.lines} lines, ${m.boundary.size}px, counted=${m.boundary.counted}` : "none"}; liheap steps=${m.liheapSteps.length}; marks about heating=${m.marksAboutHeating.length}`);
        if (m.boundary) console.log(`    "${m.boundary.text}"`);
        for (const s of m.liheapSteps) console.log(`    step ${s.at}: ${s.text}${s.loss ? ` [${s.loss}]` : ""}`);
        const figure = await page.$("figure");
        await figure.screenshot({ path: `${OUT}/citizen-${width}-${scheme}-${key}.png` });
        if (m.liheapSteps.length) { await page.$eval("#steps", (el) => el.scrollIntoView()); await (await page.$("#steps")).screenshot({ path: `${OUT}/citizen-${width}-${scheme}-${key}-steps.png` }); }
        if (width === 1280 && scheme === "light" && key === "tx") await page.screenshot({ path: `${OUT}/citizen-1280-light-tx-full.png`, fullPage: true });
        /* The findings' checks, on every household. */
        const b = ev.liheap;
        if (key === "none") {
          check(b === null && m.tick === null && m.boundary === null && (m.keyBoundary === null || m.keyBoundary.hidden) && m.liheapSteps.length === 0 && !/heating/.test(m.aria),
            `${width} ${scheme} ${key}: with a spouse earning past the limit there is no boundary, no tick, no key entry, no paragraph and no step (#23)`, { liheap: b, tick: m.tick, keyHidden: m.keyBoundary?.hidden });
          continue;
        }
        check(b !== null, `${width} ${scheme} ${key}: the evaluation carries the boundary`, b && { limit: b.earningsLimit, counted: b.counted, served: b.servedShare });
        if (!b) continue;
        if (!b.counted) {
          /* A line you never crossed: the tick is ink-3, 8px, no dot within 12px, no loss ink anywhere on the boundary; not a cliff. */
          const inWindow = m.tick !== null;
          check(!inWindow || (m.tick.stroke === "var(--ink-3)" && m.tick.width === 2 && Math.abs(m.tick.height - 8 * m.tick.scale) < 1.5 && m.tick.circlesWithin12px === 0),
            `${width} ${scheme} ${key}: the tick is --ink-3, 2px wide, 8px tall, with no dot within 12px${inWindow ? "" : " (the limit is outside the window; the tick is not drawn)"}`, m.tick);
          check(m.keyBoundary !== null && m.keyBoundary.hidden === !inWindow && !m.keyBoundary.strokes.some((s) => /loss/.test(s)) && !m.keyBoundary.fills.some((s) => /loss/.test(s)),
            `${width} ${scheme} ${key}: the key entry is shown exactly when the tick is, and draws no loss ink`, m.keyBoundary);
          check(m.boundary !== null && m.boundary.counted === "false" && !m.lossInkOnBoundary && m.boundary.top > m.keyTop && m.boundary.top < m.captionTop,
            `${width} ${scheme} ${key}: the paragraph sits between the key and the caption, in no loss ink, and says it is a boundary`, m.boundary && { top: m.boundary.top, keyTop: m.keyTop, captionTop: m.captionTop });
          check(m.liheapSteps.length === 0 && m.marksAboutHeating.length === 0 && m.evaluation.cliffsAtLimit.every((c) => !c.lost.includes("liheap")),
            `${width} ${scheme} ${key}: no StepList row, no mark and no cliff names heating help with the toggle off (never a cliff)`, { steps: m.liheapSteps.length, marks: m.marksAboutHeating.length, cliffsAtLimit: m.evaluation.cliffsAtLimit });
          /* Register: second person, the served share as odds a person understands, the invitation to the toggle — except where the money is already in the line (Michigan). */
          const p = m.boundary?.text ?? "";
          const credit = b.upstream?.counted === "state credit";
          if (credit) {
            check(!/turn it on/.test(p) && !/can no longer apply/.test(p) && /already/.test(p),
              `${width} ${scheme} ${key}: Michigan's paragraph says the money is already counted and does not invite a toggle that adds nothing (B1)`, p);
          } else {
            check(/^Above \$[\d,]+ a year, you can no longer apply for help with heating bills in [A-Z][a-z]+\. It is called LIHEAP\./.test(p) && /turn it on to see it in your line\.$/.test(p),
              `${width} ${scheme} ${key}: the paragraph is second person and invites the toggle`, p);
          }
          const odds = b.servedShare === null ? /We do not know how many families who could get it here do\./ : Math.round(b.servedShare * 10) <= 0 ? /Fewer than 1 in 10 families who could get it here do\./ : Math.round(b.servedShare * 10) >= 10 ? /Almost all families/ : new RegExp(`About ${Math.round(b.servedShare * 10)} in 10 families who could get it here do\\.`);
          check(odds.test(p), `${width} ${scheme} ${key}: the served share reads as families in ten (${b.servedShare})`, p.match(odds)?.[0] ?? p);
          check(m.assumedLiheap.length === 0 || m.assumedLiheap.every((t) => !/count each as if you get it/.test(t)), `${width} ${scheme} ${key}: the assumed list does not say heating help is counted`, m.assumedLiheap);
        } else {
          /* The toggle on: a real end — no tick, no boundary key entry, the paragraph says it was counted, a StepList row with the loss ink, a mark, the cliff names it. */
          const at = m.liheapSteps[0];
          check(m.tick === null && (m.keyBoundary === null || m.keyBoundary.hidden) && m.boundary?.counted === "true" && /We put it in your line/.test(m.boundary?.text ?? ""),
            `${width} ${scheme} ${key}: with the toggle on the tick and its key entry are gone and the paragraph says the money was counted`, m.boundary?.text);
          check(at !== undefined && /Help with heating bills (ends|would end)\. It is called LIHEAP\./.test(at.text) && at.loss !== null && at.lossInk !== null,
            `${width} ${scheme} ${key}: the StepList row names the end and carries the loss line in the loss ink`, at);
          check(m.evaluation.cliffsAtLimit.some((c) => c.lost.includes("liheap")) && m.marksAboutHeating.length + m.marks.length > 0,
            `${width} ${scheme} ${key}: the loss is a cliff at the limit's step and the chart carries a mark for it`, { cliffsAtLimit: m.evaluation.cliffsAtLimit, marks: m.marks.length });
          check(m.assumedLiheap.some((t) => /count each as if you get it/.test(t)), `${width} ${scheme} ${key}: the assumed list says it is counted at the household's say-so`, m.assumedLiheap);
        }
      }
      /* Contrast of the tick, measured on the chart's own ground. */
      const tx = measurements[`citizen-${width}-${scheme}-tx`];
      if (tx.tick) {
        const c = contrast(rgb(tx.tick.ink), rgb(tx.chartBg === "rgba(0, 0, 0, 0)" ? tx.bodyBg : tx.chartBg));
        check(c >= 3, `${width} ${scheme}: the tick's ink on the chart ground ≥ 3:1 (a graphical object)`, { contrast: c, ink: tx.tick.ink, ground: tx.chartBg === "rgba(0, 0, 0, 0)" ? tx.bodyBg : tx.chartBg });
      }
      check(errors.length === 0, `${width} ${scheme}: no console errors on the citizen page`, errors);

      console.log(`\n== caseworker ${width} ${scheme} ==`);
      for (const [key, q] of Object.entries(HOUSEHOLDS)) {
        const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"), { timeout: 240_000 });
        await page.goto(`${BASE}/caseworker.html${q}`);
        const ev = await (await evaluated).json();
        await page.locator("#content:not([hidden]) #ledgerRows tr").first().waitFor({ timeout: 60_000 });
        const m = await measureCaseworker(page);
        measurements[`caseworker-${width}-${scheme}-${key}`] = m;
        const r = m.liheapRow;
        console.log(`  ${key}: ${r ? `${r.at} ${r.program} [${r.tag ?? "-"}] who=${r.who} boundary=${r.boundary}` : "no LIHEAP row"}; drops about LIHEAP=${m.dropsAboutLiheap.length}; marks=${m.marksAboutLiheap.length}; tiles=${JSON.stringify(m.tiles)}`);
        if (r) console.log(`    "${r.cite}"`);
        await page.$eval("#ledger", (el) => el.scrollIntoView());
        await page.locator("table:has(#ledgerRows)").screenshot({ path: `${OUT}/caseworker-${width}-${scheme}-${key}-ledger.png` });
        if (key === "tx" || key === "txOn" || key === "mi") await page.locator("figure.curve").screenshot({ path: `${OUT}/caseworker-${width}-${scheme}-${key}-chart.png` });
        if (key === "txOn" || key === "tx") await page.locator("table:has(#dropRows)").screenshot({ path: `${OUT}/caseworker-${width}-${scheme}-${key}-drops.png` });
        const b = ev.liheap;
        if (key === "none") {
          check(b === null && r === null && m.dropsAboutLiheap.length === 0, `${width} ${scheme} ${key}: no ledger row, no drop row when the range never crosses the limit`, { liheap: b, row: r });
          continue;
        }
        if (!b) { check(false, `${width} ${scheme} ${key}: the evaluation carries the boundary`); continue; }
        if (!b.counted) {
          check(r !== null && r.boundary && r.tag === "if you apply" && r.badge === null && r.who === "Household" && r.at === `$${b.earningsLimit.toLocaleString("en-US")}`,
            `${width} ${scheme} ${key}: the ledger row sits at the earner's own limit, tagged if you apply, no badge, who Household`, r && { at: r.at, tag: r.tag, who: r.who });
          check(r !== null && !/loss/.test(r.atColor) && r.atColor === m.rows.find((x) => !x.boundary)?.atColor && m.boundaryRows === 1,
            `${width} ${scheme} ${key}: the row carries no loss ink and is the ledger's one boundary row`, r && { atColor: r.atColor });
          check(m.dropsAboutLiheap.length === 0 && m.marksAboutLiheap.length === 0 && !m.tiles.some((t) => /LIHEAP|energy/i.test(t)) && ev.analysis.cliffs.every((c) => !c.programsLost.includes("liheap")),
            `${width} ${scheme} ${key}: not in the DropLedger, not a mark, not in a tile, not in a cliff (never a cliff count)`, { drops: m.dropsAboutLiheap, marks: m.marksAboutLiheap });
          const credit = b.upstream?.counted === "state credit";
          if (credit) {
            check(r !== null && !/Not in net income/.test(r.cite) && /Home Heating Credit/.test(r.cite) && !/can no longer apply/.test(r.cite),
              `${width} ${scheme} ${key}: Michigan's cite says the credit is counted, not "not in net income" (B1)`, r?.cite);
          } else {
            check(r !== null && /^Above this the household can no longer apply: the state's limit is /.test(r.cite) && /FY2024/.test(r.cite) && /Read 2026-\d\d-\d\d\.$/.test(r.cite) && (b.servedShare === null ? /was not read/.test(r.cite) : new RegExp(`${Math.round(b.servedShare * 100)}% of income-eligible households were served`).test(r.cite)),
              `${width} ${scheme} ${key}: the cite carries the limit's basis, the served share with its vintage and the date read`, r?.cite);
          }
          check(m.assumed.some((t) => /^Energy assistance \(LIHEAP\) in /.test(t)) && /LIHEAP/.test(m.correctionsRest), `${width} ${scheme} ${key}: the not-included list carries core's note verbatim and CorrectionsApplied's checked line names it`, { assumed: m.assumed.map((t) => t.slice(0, 60)), rest: m.correctionsRest.slice(0, 80) });
        } else {
          check(r !== null && !r.boundary && r.tag === null && /^Counted at the household's say-so/.test(r.cite) && ev.analysis.cliffs.some((c) => c.programsLost.includes("liheap")) && m.dropsAboutLiheap.length > 0,
            `${width} ${scheme} ${key}: with the toggle on the row is the cliff's own, untagged, its cite says counted at the household's say-so, and the DropLedger names it`, r && { at: r.at, tag: r.tag, cite: r.cite.slice(0, 60), drops: m.dropsAboutLiheap });
        }
        check(!/heating/.test(m.chartAria) || b.counted, `${width} ${scheme} ${key}: the chart's spoken label does not name the boundary`);
      }
      check(errors.length === 0, `${width} ${scheme}: no console errors on the caseworker page`, errors);

      console.log(`\n== journalist ${width} ${scheme} ==`);
      await page.goto(`${BASE}/places.html`, { waitUntil: "networkidle" });
      await page.waitForSelector(".tile");
      for (const st of STATES) {
        const m = await measureJournalist(page, st);
        measurements[`journalist-${width}-${scheme}-${st}`] = m;
        console.log(`  ${st}: [${m.chip}] ${m.facts}`);
        await page.$eval("#stateDetail", (el) => el.scrollIntoView());
        await (await page.$("#stateDetail")).screenshot({ path: `${OUT}/journalist-${width}-${scheme}-${st}.png` });
        check(!m.hidden && m.name === "Energy assistance (LIHEAP)" && !m.lossInk && m.factsSize > m.citeSize && m.links.length >= 1 && m.rule.startsWith("2px"),
          `${width} ${scheme} ${st}: one row named for the program, facts at the row's size, publishers linked, no loss ink, set off by the strong rule`, { chip: m.chip, factsSize: m.factsSize, citeSize: m.citeSize, links: m.links.length, rule: m.rule });
        check(!/liheap|energy|heating/i.test(m.rankText + m.legend), `${width} ${scheme} ${st}: nothing about it in the ranked strip or the legend`);
        const chipC = m.chip ? contrast(rgb(m.chipColor), rgb(m.bg)) : null;
        check(chipC === null || chipC >= 4.5, `${width} ${scheme} ${st}: the chip's ink on the page ground ≥ 4.5:1`, chipC);
      }
      check(errors.length === 0, `${width} ${scheme}: no console errors on the journalist page`, errors);
      await ctx.close();
    }
  }

  /* Paper, from OS dark at 1280: the three surfaces to Letter, inks light; and the print layout's boundary elements measured. */
  console.log("\n== paper (from OS dark) ==");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark", timezoneId: "America/New_York" });
  const page = await ctx.newPage();
  const darkInk = async () => page.$eval("body", (el) => getComputedStyle(el).color);
  const paper = async (name, url, ready, measure) => {
    const evaluated = /caseworker|^\/\?/.test(url) ? page.waitForResponse((r) => r.url().endsWith("/api/evaluate"), { timeout: 240_000 }) : null;
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    if (evaluated) await evaluated;
    await ready();
    const dark = await darkInk();
    const pdf = await page.pdf({ format: "Letter", printBackground: true });
    writeFileSync(`${OUT}/${name}-letter-from-dark.pdf`, pdf);
    await page.emulateMedia({ media: "print" });
    const light = await darkInk();
    const m = await measure();
    await page.screenshot({ path: `${OUT}/${name}-1280-print-from-dark.png`, fullPage: true });
    await page.emulateMedia({ media: null });
    const objects = pdfObjects(pdf), pages = pdfPages(objects);
    const inks = pages.flatMap((p) => textInks(pageContent(objects, p)));
    check(light !== dark && inks.includes(rgb(light).join()) && !inks.includes(rgb(dark).join()), `${name}: printed from OS dark, every page's text is in the light ink and none in the dark ink (${pages.length} pages)`, { light, dark, inks: [...new Set(inks)].slice(0, 6) });
    return m;
  };
  const cp = await paper("citizen-tx", `/${HOUSEHOLDS.tx}`, () => page.locator("#chart svg path").first().waitFor(), () => page.evaluate(() => {
    const tick = document.querySelector("#chart svg line[data-boundary]"), b = document.querySelector("#boundary"), key = [...document.querySelectorAll(".hg-key li")].find((li) => /heating/.test(li.textContent));
    const cs = (el) => getComputedStyle(el);
    return { tick: tick && { stroke: cs(tick).stroke, display: cs(tick).display }, boundary: b && { color: cs(b).color, display: cs(b).display, text: b.textContent.slice(0, 60) }, key: key && { hidden: key.hidden, display: cs(key).display } };
  }));
  check(cp.tick && cp.tick.display !== "none" && cp.boundary && cp.boundary.display !== "none" && cp.key && !cp.key.hidden, "citizen paper: the tick, its key entry and the paragraph are on the page in print media", cp);
  const wp = await paper("caseworker-tx", `/caseworker.html${HOUSEHOLDS.tx}`, () => page.locator("#content:not([hidden]) #ledgerRows tr").first().waitFor(), () => page.evaluate(() => {
    const tr = document.querySelector("#ledgerRows tr[data-boundary]"), cs = (el) => getComputedStyle(el);
    return tr && { display: cs(tr).display, tag: tr.querySelector(".hg-tag") && { display: cs(tr.querySelector(".hg-tag")).display, border: cs(tr.querySelector(".hg-tag")).borderColor, color: cs(tr.querySelector(".hg-tag")).color }, cite: cs(tr.querySelector(".hg-cite")).color, handout: document.querySelector("#handout").textContent.replace(/\s+/g, " ").slice(0, 400) };
  }));
  check(wp && wp.display !== "none" && wp.tag && wp.tag.display !== "none", "caseworker paper: the ledger row with its tag is on the page in print media", wp && { display: wp.display, tag: wp.tag });
  const jp = await paper("journalist-tx", "/places.html?state=TX", () => page.waitForSelector("#liheap li"), () => page.evaluate(() => {
    const li = document.querySelector("#liheap li"), cs = (el) => getComputedStyle(el);
    return { display: cs(li).display, chip: cs(li.querySelector(".hg-tag")).display, links: [...li.querySelectorAll(".hg-cite a")].map((a) => [a.textContent, cs(a).color]) };
  }));
  check(jp.display !== "none" && jp.chip !== "none", "journalist paper: the row and its chip are on the page in print media", jp);
  await ctx.close();
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/measurements.json`, JSON.stringify(measurements, null, 1));
console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
