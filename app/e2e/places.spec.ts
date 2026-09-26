// Measured proofs for the places page, against the built site behind the
// Worker (playwright.config.ts) and the committed sweep. Screenshots and
// the Letter PDF land in design/audit/app/, named like the audit's
// journalist-* set so the two can be read side by side. Every measurement
// is printed; a failed check fails the test at its end, after the rest
// have been taken (support.ts `check`).
//
// Dark mode is the OS's (prefers-color-scheme), the path a reader's browser
// takes; the PDF is printed from it, because that is the path a reporter's
// "Save as PDF" takes, and a raster print check cannot see it (review B1).
import { CHILDCARE_MAX_AGE, CLIFF_MIN, keepRateWords, LIHEAP_VINTAGE, STATE_NAMES, type LiheapCoverage, type StateMetrics, type SummaryJson } from "@hotgap/core";
import { test, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv } from "./parseCsv.mjs";
import { formsDrawn, greyRowTransitions, pageContent, pageHeight, pdfObjects, pdfPages, reachable, resource, textInks } from "./pdf.mjs";
import { AUDIT_DIR as OUT, check, consoleErrors, contrast, rgb, OPEN_ALL } from "./support.js";

const ROOT = resolve(import.meta.dirname, "../..");
const summary = JSON.parse(readFileSync(resolve(ROOT, "core/data/summary.json"), "utf8")) as SummaryJson;
/** The program names as the English catalog has them (`shared.program`, app/README.md § Languages) — read from the file, the way the page reads it, not through lib/names.ts, which loads its catalog through Vite. */
const EN = JSON.parse(readFileSync(resolve(ROOT, "app/src/i18n/en.json"), "utf8")) as { shared: { program: Record<string, string> } };
const programName = (id: string): string => EN.shared.program[id];
const coverage = summary.coverage!;
const STATES = Object.keys(summary.states).sort();
/* The one child-care age rule (N8), the cliff floor, the LIHEAP vintages (#23) and the program names (M3) are core's and
   the lib table's, imported rather than typed here, so this proof and the page cannot disagree about them silently; the
   step between points is measured off a committed state file. */
type Points = { earnings: number }[];
const ohPoints = (JSON.parse(readFileSync(resolve(ROOT, "core/data/states/OH.json"), "utf8")) as { archetypes: Record<string, { points: Points }> }).archetypes["single-2"].points;
const STEP = ohPoints[1].earnings - ohPoints[0].earnings;
const money = (n: number) => "$" + n.toLocaleString("en-US");
/* A calendar day as the page prints it: the same day in every zone (a naive Date parse would print the day before, west of Greenwich). */
const dayWords = (isoDay: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${isoDay}T00:00:00Z`));
/* The page prints the run date in the reader's own zone (rerun S2): every
   page below is opened in this one, and the expected date is formatted
   with it; the UTC date is computed only to show the check has teeth. */
/**
 * CIE L\* of a grey — the axis the eye reads darkness on, and the one the
 * greyscale check states its floor in. Contrast ratios cannot stand in for
 * it: a diverging ramp whose two ends are 12.81:1 and 12.85:1 on the same
 * ground passes every contrast floor the page has and still draws the best
 * state in the country and the worst as one tone (review B1).
 */
const greyL = (luma: number): number => {
  const c = luma / 255, lin = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 116 * (lin > 216 / 24389 ? Math.cbrt(lin) : ((24389 / 27) * lin + 16) / 116) - 16;
};

const TZ = "America/New_York";
const dateIn = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(new Date(iso));
const dateWords = (iso: string) => dateIn(iso, TZ);
const near = (a: number, b: number, tol = 1.5) => Math.abs(a - b) <= tol;
const metrics = (st: string, archId: string): StateMetrics => summary.states[st][archId];
const liheapOf = (st: string): LiheapCoverage => coverage[st].liheap!;

/* The table's column order: state; the keep rate, to the line and to 220%; the two levels; the road's count, biggest loss,
   its step and its deepest fall; the whole axis's biggest loss and its step, the width, the leap and the safe exit; the
   two counts; Figures. */
/* The table's columns by index (the state is 0). Related figures share a cell
   since 2026-09-26 (render.ts STACKED): the keep rate carries its two boundary
   readings under it, the two money-kept levels are one pair, the three counts
   one cell, and each worst step rides under its loss. */
const COL = { keepRate: 1, netAtRoad: 2, counts: 3, roadWorst: 4, deepestFall: 5, biggestLoss: 6, dangerWidth: 7, leap: 8, safeExit: 9, figures: 10 };

function expectIncompleteFor(st: string, archId: string): boolean {
  const a = summary.archetypes.find((x) => x.id === archId)!;
  const pays = a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || a.id.includes("dual")) && !a.id.endsWith("-nosub");
  return (coverage[st]?.unmodeled ?? []).some((u) => u.program !== "LIHEAP" && (!/child.?care/i.test(u.program) || pays));
}

test.use({ timezoneId: TZ });

for (const [width, height] of [[390, 844], [1280, 900]] as const) {
  test(`${width}px: the map, the ranking, the table, the state block, the CSV and the paper, measured`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height });
    const errors = consoleErrors(page);
    await page.goto("/places.html", { waitUntil: "networkidle" });
    await page.waitForSelector(".tile");
    console.log(`\n== ${width}px ==`);
    const dc = STATES.includes("DC");

    check(errors.length === 0, "no console errors on load", errors);
    const scroll = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(scroll[0] <= scroll[1], "no horizontal scroll", { scrollWidth: scroll[0], innerWidth: scroll[1] });
    /* The layout of the picture (design critique 2026-09-24): the two controls
       sit between the sentence they change and the tiles, in one row from
       40rem; the whole country is on the screen with no swipe, at 390 too;
       and at 1280 the readout stands beside the map rather than under it. */
    const layout = await page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      const grid = document.querySelector("#grid")!;
      return { answer: r("#answer").bottom, controls: [r(".controls").top, r(".controls").bottom], map: r("#grid"), arch: r("#arch").top, metric: r("#metric").top,
        fits: grid.scrollWidth <= grid.clientWidth + 1, tile: r(".tile").width, readout: r("#readout") };
    });
    check(layout.controls[0] >= layout.answer && layout.controls[1] <= layout.map.top && (width < 640 || layout.arch === layout.metric),
      `Household and Measure sit between the answer sentence and the tiles${width >= 640 ? ", in one row" : ""}`, layout);
    check(layout.fits && layout.map.right <= width && layout.tile >= 24, `the whole map fits the screen with no swipe (${layout.tile.toFixed(1)}px tiles)`, { fits: layout.fits, right: layout.map.right, tile: layout.tile });
    if (width >= 1024) check(layout.readout.left >= layout.map.right && layout.readout.top < layout.map.bottom, "at 1280 the readout stands beside the map", { map: layout.map, readout: layout.readout });
    const status = await page.$eval("#status", (el) => (el as HTMLElement).hidden !== false);
    check(status, "the load status line is hidden once the sweep is in");

    /* Every disclosure open from here on, as the checks below expect. */
    await page.evaluate(OPEN_ALL);
    await page.waitForTimeout(250);

    /* AnswerSentence (#1): the national reading of the default measure, as the
       figure's own <figcaption>, with the count underlined in the ink of the
       tiles it counts. Every figure is read from the committed run. */
    const badKeep = STATES.filter((st) => (metrics(st, "single-2").keepRate ?? 0) < 0).length;
    /* …and the same count for the family that pays for care with no subsidy, the twin the file carries (R2). */
    const badNoSub = STATES.filter((st) => (metrics(st, "single-2-nosub").keepRate ?? 0) < 0).length;
    const answer = await page.evaluate(() => ({
      text: [...document.querySelector("#answer")!.childNodes].filter((n) => (n as Element).id !== "answerHolds").map((n) => n.textContent).join("").replace(/\s+/g, " ").trim(),
      holds: document.querySelector("#answerHolds")?.textContent ?? null,
      tag: document.querySelector("#answer")!.tagName, first: document.querySelector("figure")!.firstElementChild!.id,
      keyed: [...document.querySelectorAll("#answer .hg-amt")].map((el) => [el.textContent!, el.className]),
    }));
    check(answer.tag === "FIGCAPTION" && answer.first === "answer",
      "the answer sentence is the figure's own caption and its first child, so nothing stands between the masthead and the picture", answer);
    check(answer.text === `In ${badKeep} of the ${STATES.length - (dc ? 1 : 0)} states${dc ? " and the District of Columbia" : ""}, a single parent of two children who gets the child-care subsidy climbs from the poverty line to twice it and ends up poorer than they started; paying for care with no subsidy, ${badNoSub === 0 ? "in none" : `in ${badNoSub}`}.`,
      `the answer names the subsidy its count depends on and shows the pair — ${badKeep} states with it, ${badNoSub} paying for care without it — from the file, with the denominator named once and in full (R2, M1, M2)`, answer.text);
    check(answer.keyed.length === 1 && answer.keyed[0][0] === String(badKeep) && /hg-amt--cliff/.test(answer.keyed[0][1]),
      "the one figure the sentence underlines is the count, in the ink of the tiles it counts", answer.keyed);
    check(answer.holds === "Every state's rules applied to the same family: renting at the county's typical rent, paying center-based care for both children, and getting the child-care subsidy, SNAP, TANF, Medicaid, and WIC.",
      "under the sentence, the family it is true of: its rent, its care and the programs it is counted as getting", answer.holds);

    /* The disclosure names in the contract's order — one inside the figure, then on the page every
       state's curve (open: it is a picture, design critique 2026-09-25) and the three reference panels. */
    const panels = await page.evaluate(() => [...document.querySelectorAll("details.hg-disclosure")].filter((d) => !(d as HTMLElement).hidden).map((d) => ({
      id: d.id, open: (d as HTMLDetailsElement).open, inFigure: d.closest("figure") !== null,
      name: d.querySelector("summary")!.textContent!.trim(),
    })));
    check(panels.map((p) => `${p.inFigure ? "figure" : "page"}:${p.name}`).join("|")
      === "figure:How to read this map|page:Every state’s curve|page:Every state, every measure|page:How these numbers were made|page:Where these numbers come from",
      "the figure's disclosure and the page's four carry the contract's names, in its order, with nothing selected", panels);

    /* Everything below is read with the page opened up, so a check can reach
       the ranked strip and the table without asking whether they are folded —
       which is also where a layout that only fits while folded would show, so
       the sideways check is taken again with everything out. */
    await page.evaluate(OPEN_ALL);
    await page.waitForTimeout(250);
    const openScroll = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(openScroll[0] <= openScroll[1], "no horizontal scroll with every disclosure open", { scrollWidth: openScroll[0], innerWidth: openScroll[1] });
    /* The counted sentence is written whole from the data (S6) and keeps its
       code; since the picture-first pass it opens "How to read this map",
       where a reader who wants to know how far the run reaches looks. */
    const lede = await page.$eval("#figScope", (el) => el.textContent!.replace(/\s+/g, " ").trim());
    check((dc ? /^[A-Z][a-z-]+ states and the District of Columbia, / : /^[A-Z][a-z-]+ states, /).test(lede) && /household shapes, one earnings scale — from \$0 past 400% of the poverty line for that household\./.test(lede),
      "the counted sentence is written whole from the data (S6), says what the one axis is (N12), and counts the states as a reader does (rerun N11)", lede.slice(0, 90));
    /* What the measure IS is the measure's own describe, said per view rather
       than in a standfirst that could only ever name one of the nine. */
    const measureLine0 = await page.$eval("#figMeasure", (el) => el.textContent!);
    check(measureLine0 === "The map shades Cents kept of each extra dollar: Of each extra dollar earned from the poverty line ($27,000) to just past twice it ($55,000) — higher in Alaska and Hawaii — the cents this household keeps once taxes and lost benefits are counted. Below zero it ends up poorer than it started.",
      "the disclosure says what the map shades, in the measure's one name, and what the measure means, from its own words", measureLine0);
    /* "How to read this map" is written for a reader (M7): a cliff, a danger
       zone, the road, the keep rate and the shading, defined in that order, in
       120 words or fewer; the engine's notes are the method's now. */
    const howTo = await page.evaluate(() => ({
      read: document.querySelector("#howToRead")!.textContent!.replace(/\s+/g, " ").trim(),
      panel: document.querySelector("#howTo")!.textContent!,
      notesInMethod: ["#binsLine", "#hatchCaution", "#pastAxisNote", "#glossary"].every((sel) => document.querySelector(sel)!.closest("#methodPanel") !== null),
    }));
    const termsAt = ["cliff", "danger zone", "The road", "The keep rate", "The shading"].map((term) => howTo.read.indexOf(term));
    check(termsAt.every((i, k) => i >= 0 && (k === 0 || i > termsAt[k - 1])) && howTo.read.split(" ").length <= 120
      && howTo.read.includes("pay where the family has less than it had at a lower pay") && howTo.read.includes("($27,000 to $55,000 for this family)")
      && !/coverage record|must not be charted|equal-width/.test(howTo.panel) && howTo.notesInMethod,
      "How to read this map defines cliff, danger zone, the road, the keep rate and the shading, in that order and in 120 words or fewer, and the engine's notes sit in the method (M7)", { words: howTo.read.split(" ").length, read: howTo.read.slice(0, 120) });
    /* The glossary sentence (S3) from core's floor, PolicyEngine introduced on
       first use (S6), and Plan 9's one sentence of why a cliff's size alone is
       not the story. */
    const glossary = await page.$eval("#glossary", (el) => el.textContent!.replace(/\s+/g, " ").trim());
    check(glossary.startsWith(`A cliff is a $1,000 raise that cuts net income by ${money(CLIFF_MIN)} or more; a danger zone is a stretch of pay where net income stays below an earlier peak`) && /PolicyEngine, an open-source tax-and-benefit calculator/.test(glossary)
      && /A cliff matters in proportion to how many families stand near it: the largest cliff in a state is usually one few families reach, and the one that hurts is the modest one at the income most families have\./.test(glossary),
      "the glossary defines cliff and danger zone from core's floor (S3), introduces PolicyEngine (S6) and says why a cliff's size alone is not the story (Plan 9)", glossary.slice(0, 80));
    /* Two groups, two questions (Plan 9): the road out of poverty leads,
       because that is where the families this tool is for actually are. */
    const groups = await page.$$eval("#metric optgroup", (els) => els.map((g) => [(g as HTMLOptGroupElement).label, [...g.children].map((o) => (o as HTMLOptionElement).value)] as [string, string[]]));
    check(groups.length === 2 && groups[0][0] === "From the poverty line to twice it" && groups[0][1].join() === "keepRate,roadWorst,deepestFall,netAtRoadLo,netAtRoadHi"
      && groups[1][0] === "At any pay" && groups[1][1].join() === "biggestLoss,dangerWidth,leap,safeExit",
      "the measure menu is two groups: the road's five measures (the keep rate, its biggest loss and its deepest fall, then the two money-kept levels), then the four whole-axis ones — the three counts are table columns now (Plan 9, R3, R5, R6)", groups);
    const bare = await page.evaluate(() => [(document.querySelector("#metric") as HTMLSelectElement).value, new URL(location.href).searchParams.get("measure")]);
    check(bare[0] === "keepRate" && bare[1] === null, "a bare URL opens on the keep rate, without having to say so", bare);
    const options = await page.$$eval("#metric option", (els) => els.map((el) => el.textContent!));
    /* Short enough to show whole in a closed select at 390 (design critique
       2026-09-24: "Keep rate — of each extra dollar earned from poverty to
       twice poverty, the…"); the definitions are the measures' own `describe`,
       in "How to read this map" and above the table. */
    const defOf = (key: string) => page.$eval(`#def-col${key[0].toUpperCase()}${key.slice(1)}`, (el) => el.textContent!);
    check(options.length === 9 && options.every((o) => !/\b(it|that stretch|of those|collapses?)\b/i.test(o) && o.length <= 40)
      && /worst danger zone/.test(await defOf("leap")) && /no danger zone remains/.test(await defOf("safeExit")),
      "every measure option stands on its own and is short (S2), and its definition is the measure's own describe", options);
    /* A CLOSED select shows the option without its <optgroup> label, so a
       measure that has a near-twin in the other group must name its own window
       in the option itself — a cold reader filed two of them as the same
       measure (2026-09-18, B2 and B3). The pair is pinned as a pair, because
       the defect is the two reading alike, not either option alone. */
    const twins: [number, number][] = [[1, 5]]; // the road's biggest loss ↔ the biggest loss at any pay
    check(twins.every(([road, axis]) => /on the road/.test(options[road]) && /any pay/.test(options[axis])),
      "each measure with a twin in the other group names its own window in the option a closed select shows (B2, B3)",
      twins.map(([road, axis]) => [options[road], options[axis]]));
    /* dangerWidth is every zone's width added together (measured: in 49 of 50 states it exceeds the leap, the widest
       zone's width), and inside a zone most raises GAIN money (R9): its one name says what the zone is. */
    const widthTotal = STATES.filter((st) => metrics(st, "single-2").cliffCount > 0 && metrics(st, "single-2").dangerWidth > metrics(st, "single-2").leap).length;
    check(widthTotal > 0 && options[6] === "Pay spent below an earlier peak" && /added together/.test(await defOf("dangerWidth")), "the danger-width option says what the stretch is — pay below an earlier peak — and its definition that it is a total (R9)", { option: options[6], statesWhereTotalExceedsLeap: widthTotal });
    /* The household line says the tenure every household shares (rerun N10). */
    check(/, renting in the state's most populous county\./.test(lede), "the map's household line says the household rents in the most populous county (rerun N10)", lede.slice(-90));
    /* The two controls are independent, said once where the order control is (rerun N3). */
    check((await page.$eval("#sortHint", (el) => el.textContent)) === "Orders this table only; the map and the ranking follow the Measure above.", "the order control says it orders the table only (rerun N3)");
    /* One sentence per figure, where the headers are, and each header points at the lines of every figure in its column (rerun S3). */
    /* A header names SEVERAL definitions — its own; on a cell that stacks
       figures, each stacked figure's; and on the three columns carrying a
       point on the axis, what position is (Plan 9) — so the lookup splits the
       attribute rather than reading it as one id. */
    const defs = await page.evaluate(() => ({
      terms: [...document.querySelectorAll("#defs dt")].map((el) => el.textContent!),
      ids: [...document.querySelectorAll("#defs dd")].map((el) => el.id),
      heads: [...document.querySelectorAll("thead th")].slice(1).map((th) => {
        const ids = (th.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
        return [th.textContent!, ids.map((id) => document.getElementById(id)?.textContent ?? null), ids,
          ids.map((id) => document.getElementById(id)?.previousElementSibling?.textContent ?? null)] as [string, (string | null)[], string[], (string | null)[]];
      }),
    }));
    const headText = defs.heads.map(([t]) => t).join("|");
    const pointedAt = [...new Set(defs.heads.flatMap(([, , ids]) => ids).filter((id) => id !== "def-position"))];
    /* ONE NAME PER MEASURE (R9, M6): a measure's column is headed with the same
       words as its menu option — or, where two levels share the money-kept
       pair, each one's definition, which its header points at, is headed with
       them. */
    check(defs.terms.length === 20 && defs.heads.every(([, d]) => d.length > 0 && d.every((x) => x))
      && headText === "Cents kept of each extra dollar|Kept, line → twice|Cliffs|Biggest one-raise loss on the road|Deepest fall on the road|Biggest one-raise loss (any pay)|Pay spent below an earlier peak|Raise needed to get clear|Pay past which no earlier peak is higher|Figures"
      && options.every((o) => defs.heads.some(([t, , , terms]) => t === o || terms.includes(o)))
      && pointedAt.join() === defs.ids.filter((id) => !/^def-(position|pastAxis|lowerBound)$/.test(id)).join()
      && /poorer than it started/.test(defs.heads[0][1][0]!) && /\(\$27,000\)/.test(defs.heads[0][1][0]!) && /exactly twice the poverty line/.test(defs.heads[0][1][1]!)
      && /220% of the poverty line \(\$59,000 here\)/.test(defs.heads[0][1][2]!)
      && /at the poverty line \(\$27,000\): after taxes, premiums and the child care the family pays itself/.test(defs.heads[1][1][0]!) && /at twice the poverty line \(\$55,000\):/.test(defs.heads[1][1][1]!)
      && defs.heads[2][1].length === 3 && defs.heads[2][1].every((d) => /not ranked\.$/.test(d!)) && /between the poverty line and twice it/.test(defs.heads[2][1][0]!) && /anywhere on the curve/.test(defs.heads[2][1][1]!) && /^Of the cliffs counted/.test(defs.heads[2][1][2]!)
      && /road's largest single loss lands/.test(defs.heads[3][1][1]!) && /largest one-step loss lands/.test(defs.heads[5][1][1]!)
      && /added together/.test(defs.heads[6][1][0]!) && /worst danger zone/.test(defs.heads[7][1][0]!) && /no danger zone remains/.test(defs.heads[8][1][0]!) && /floors/.test(defs.heads[9][1][0]!),
      "twenty definitions sit above the table in the order the table shows their figures; every header points at the line of every figure in its column, every measure is named in its header or in a line its header points at, and the counts say why they are not ranked (rerun S3, R9, M6)", defs.heads.map(([t, d]) => `${t}: ${d.map((x) => x!.slice(0, 24)).join(" | ")}`));
    /* The three columns whose figure is a point on the axis point at one shared
       definition of what position is — and what it is not (Plan 9). */
    const positionDefs = await page.evaluate(() => ["colRoadWorst", "colBiggestLoss", "colSafeExit"].map((id) => (document.getElementById(id)!.getAttribute("aria-describedby") ?? "").split(/\s+/)));
    const positionDef = await page.$eval("#def-position", (el) => el.textContent!);
    check(positionDefs.map((ids) => ids.join()).join("|") === "def-colRoadWorst,def-colRoadWorstAt,def-position|def-colBiggestLoss,def-colBiggestLossAt,def-position|def-colSafeExit,def-position"
      && /never one family's chance of getting there/.test(positionDef) && /cross-sectional/i.test(positionDef),
      "the three columns carrying a point on the earnings axis each name their own definitions (the loss, then its step) and then what position is and is not (Plan 9)", { positionDefs, positionDef: positionDef.slice(0, 90) });
    if (width === 390) {
      const gutter = await page.$eval("h1", (el) => el.getBoundingClientRect().left);
      check(gutter >= 16, "the phone masthead keeps the page's 16px side gutter (N5)", gutter);
      /* The map gives the gutter back: twelve tiles want every pixel of a phone. */
      const bleed = await page.$eval("#grid", (el) => el.getBoundingClientRect());
      check(bleed.left <= 0.5 && bleed.right >= 389.5, "the map bleeds to both edges of the phone", { left: bleed.left, right: bleed.right });
    }

    /* All four tile states have a visible key, whether or not this view has one
       of each: three of them used to be described to screen readers only
       (places keep-rate read, S9). Each is drawn with the tile's own class. */
    const fullKey = await page.$$eval("#keyFull li", (els) => els.map((el) => [el.querySelector("i")!.className, el.textContent!.trim()] as [string, string]));
    check(fullKey.length === 4 && /hg-swatch--none/.test(fullKey[1][0]) && /hg-swatch--past/.test(fullKey[2][0]) && /hg-hatch-incomplete/.test(fullKey[3][0])
      && /no cliff/.test(fullKey[1][1]) && /(past the axis|runs off this state's axis)/.test(fullKey[2][1]) && /incomplete/.test(fullKey[3][1]),
      "every tile state has a key entry drawn with the tile's own class, present on this map or not (S9)", fullKey);
    /* Nothing that warns hides: the one caution that is true of the map on the
       screen comes out of the disclosure, in one line. On the keep rate no
       state is hatched or bounded on this run, so it says nothing — and the
       path is proved on a measure that does bound states. */
    const cautionNow = await page.evaluate(() => ({ hidden: (document.querySelector("#mapCaution") as HTMLElement).hidden !== false, text: document.querySelector("#mapCaution")!.textContent }));
    check(cautionNow.hidden, "with no hatched or bounded state on the map, the caution line says nothing", cautionNow);

    /* Tiles: one per state in the file, the incomplete ones hatched — measured
       by the painted mask on the stripes' pseudo-element, not by the class. */
    const tiles = await page.$$eval(".tile", (els) => els.map((el) => ({
      st: (el as HTMLElement).dataset.st!, tag: el.tagName, kind: el.className, mask: getComputedStyle(el, "::after").maskImage,
      w: el.getBoundingClientRect().width, label: el.getAttribute("aria-label"), current: el.getAttribute("aria-current"),
    })));
    check(tiles.length === STATES.length && tiles.map((t) => t.st).sort().join() === STATES.join(), `every state has a tile (${tiles.length})`);
    check(tiles.every((t) => t.tag === "BUTTON" && t.label), "every tile is a button with an accessible name", tiles[0].label);
    /* The group has a name of its own, from the measure — not the figcaption's,
       which a screen reader has just heard on entering the figure. */
    const groupName = await page.evaluate(() => ({
      label: document.querySelector("#grid")!.getAttribute("aria-label"),
      by: document.querySelector("#grid")!.getAttribute("aria-labelledby"),
      describedBy: document.querySelector("#grid")!.getAttribute("aria-describedby"),
    }));
    check(groupName.label === "Cents kept of each extra dollar, state by state" && groupName.by === null && groupName.describedBy === "figDesc",
      "the tile group is named for the measure it shows and described by how its squares work", groupName);
    check(tiles.every((t) => t.current === null), "with nothing selected, no tile is aria-current (a tab stop is not a selection)");
    const shownArch = await page.$eval("#arch", (el) => (el as HTMLSelectElement).value);
    const expectIncomplete = STATES.filter((st) => expectIncompleteFor(st, shownArch));
    const hatched = tiles.filter((t) => t.mask.includes("data:image/svg+xml")).map((t) => t.st).sort();
    check(hatched.join() === expectIncomplete.join(), "the incomplete states, and only they, carry the SVG hatch mask", { hatched, expectIncomplete });
    console.log(`     tile width ${tiles[0].w.toFixed(1)}px`);

    /* B6: a leap the axis bounds says its floor ON THE TILE, as the ranked row
       and the table already did — the map was the one place on the page that
       hid a figure the rest of it was willing to print. B8: a child-care price
       that is not the state's own county's travels with the tile, in the same
       words the table's Figures cell uses, because the map is where a reader
       meets the state and New Mexico sets the top of the scale. */
    await page.selectOption("#metric", "leap");
    const bounded = STATES.filter((st) => metrics(st, "single-2").leapIsLowerBound);
    const leapTitles = await page.evaluate((sts) => Object.fromEntries((sts as string[]).map((st) => [st, document.querySelector(`.tile[data-st="${st}"]`)!.getAttribute("title")!])), bounded);
    check(bounded.length > 0 && bounded.every((st) => leapTitles[st] === `${STATE_NAMES[st]}: at least ${money(metrics(st, "single-2").leap)} — the exact size runs past the axis`),
      `on the leap the ${bounded.length} bounded tiles say their floor, the figure the strip and the table print (B6)`, leapTitles);
    await page.selectOption("#metric", "keepRate");
    const substituted = STATES.filter((st) => !coverage[st].vintages.childcare.preschool.startsWith("county"));
    const careTitles = await page.evaluate((sts) => Object.fromEntries((sts as string[]).map((st) => [st, document.querySelector(`.tile[data-st="${st}"]`)!.getAttribute("title")!])), [...substituted, "OH"]);
    check(substituted.length > 0 && substituted.every((st) => / — child-care price: /.test(careTitles[st])) && !/child-care price/.test(careTitles.OH),
      `the ${substituted.length} states priced from a median, not their own county, say so on the tile; Ohio, priced from its own county, does not (B8)`, careTitles);

    /* Contrast, as the audit measured it, from the resolved colours. */
    const measureContrast = async (mode: string) => {
      const c = await page.evaluate(() => {
        const cs = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
        /* The legend draws its hatch swatch only while some state is
           incomplete — none is, since NJ and WA became complete on 2026-09-16
           — so measure the stylesheet's treatment on a probe carrying the
           same classes, removed once read. The contrast is the CSS's, not
           the data's. */
        let swatch = document.querySelector(".hg-swatch--incomplete");
        const probe = !swatch;
        if (!swatch) { swatch = document.createElement("span"); swatch.className = "hg-swatch hg-swatch--incomplete hg-hatch-incomplete"; document.querySelector(".picture")!.append(swatch); }
        /* The picture has no ground of its own any more — it IS the page — so
           the ground every mark is measured against is the page's. */
        const fig = cs(document.body).backgroundColor;
        const ramp = [...document.querySelectorAll(".scale .sw")].map((el) => cs(el).backgroundColor);
        const shaded = [...document.querySelectorAll(".tile")].filter((el) => !/hg-tile--/.test(el.className)).map((el) => [cs(el).backgroundColor, cs(el).color]);
        const byBin = ramp.map((bg) => shaded.find(([b]) => b === bg));
        const none = document.querySelector(".hg-tile--none");
        const out = { fig, stripe: cs(swatch, "::after").backgroundColor, ground: cs(swatch).backgroundColor, ramp, byBin,
          noneEdge: none && cs(none).outlineColor };
        if (probe) swatch.remove();
        return out;
      });
      const out = {
        hatchStripeOnGround: contrast(rgb(c.stripe), rgb(c.ground)),
        /* The scale's two ENDS against the figure's ground. On a diverging
           scale those are the deepest step of each ramp, so this measures both
           arms at once; on a sequential one it is the same step twice at the
           dark end and the light end. The floor that matters is the step
           NEAREST the ground, which is the one against zero on a diverging
           scale and the lightest bin on a sequential one — so every swatch is
           measured and the minimum is checked. */
        rampOnFigure: c.ramp.map((bg) => contrast(rgb(bg), rgb(c.fig))),
        labelOnBins: c.byBin.map((t) => (t ? contrast(rgb(t[0]), rgb(t[1])) : null)),
        noCliffEdge: c.noneEdge ? contrast(rgb(c.noneEdge), rgb(c.fig)) : null,
      };
      const two = (n: number | null) => (n === null ? null : n.toFixed(2));
      check(out.hatchStripeOnGround >= 4.5, `${mode}: hatch stripe against its ground ≥ 4.5:1`, two(out.hatchStripeOnGround));
      check(out.rampOnFigure.every((r) => r >= 2), `${mode}: every bin on the scale against the figure ground ≥ 2:1`, out.rampOnFigure.map(two));
      check(out.labelOnBins.every((r) => r === null || r >= 4.5), `${mode}: tile label on every shaded bin present ≥ 4.5:1`, out.labelOnBins.map(two));
      check(out.noCliffEdge === null || out.noCliffEdge >= 3, `${mode}: the no-cliff tile's edge ≥ 3:1 on the map ground (N10)`, two(out.noCliffEdge));
      return out;
    };
    await measureContrast("light");

    /**
     * THE GREYSCALE CHECK (review B1). The defect that sent this palette back
     * was invisible to every measurement the page had: the two arms each ran
     * pale-at-the-hinge to deep-at-its-own-end, so the best state and the
     * worst both landed at L* ~19.7 and a newspaper printing the map in grey,
     * a photocopy or a monochrome screen drew a meaningless picture — while
     * every contrast floor above passed, because both ends were 12.8:1 on the
     * same ground. Sign was carried by hue alone and depth said the opposite
     * of the truth.
     *
     * So the check is the conversion itself, not an assertion about colours:
     * screenshot the tiles, hand the PNG back to the browser's own decoder,
     * convert the RASTER with Rec. 601 luma — what a print driver, a
     * photocopier and an e-ink screen do — and read the tones off it. Nothing
     * here re-derives what the page computed, and it sees a filter, an
     * overlay or an opacity that a computed-style reading would not.
     *
     * Two things are checked, because the end-to-end gap alone would not have
     * caught the interior: the ends stand GREY_FLOOR apart, and the greyscale
     * never inverts the ranking — for every pair of shaded states, the one
     * that keeps more is the lighter tone in light mode and the darker one in
     * dark, where severity is distance from the ground.
     */
    const GREY_FLOOR = 25;
    /**
     * One pass of the greyscale read: the tones of every tile that is
     * WHOLLY inside this screenshot, by the mode of its patch. Lifted out of
     * `measureGrey` on 2026-09-19 so the phone's swiping map can be read in
     * two passes, one at each end of its scroller.
     */
    const sample = (png: string, sts: string[]) => page.evaluate(async ({ png, sts }) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
        const cv = new OffscreenCanvas(bmp.width, bmp.height), ctx = cv.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
        const { data, width } = img;
        const grid = document.querySelector("#grid")!.getBoundingClientRect();
        const px = bmp.width / grid.width;   // device pixels per CSS pixel
        const out: Record<string, number> = {};
        for (const st of sts) {
          const el = document.querySelector(`.tile[data-st="${st}"]`);
          if (!el) continue;
          const b = el.getBoundingClientRect();
          /* Only a tile wholly inside the scroller's box is in this bitmap. */
          if (b.left < grid.left - 0.5 || b.right > grid.right + 0.5) continue;
          const x0 = Math.round((b.left - grid.left) * px), y0 = Math.round((b.top - grid.top) * px);
          const w = Math.round(b.width * px), h = Math.round(b.height * px);
          const inset = (n: number) => Math.max(1, Math.round(n * 0.22));
          const counts = new Map<number, number>();
          for (let y = y0 + inset(h); y < y0 + h - inset(h); y++)
            for (let x = x0 + inset(w); x < x0 + w - inset(w); x++) {
              const i = (y * width + x) * 4;
              const luma = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
              counts.set(luma, (counts.get(luma) ?? 0) + 1);
            }
          /* The MODE of the patch, not its mean: the postal code's glyphs and
             the selected tile's inset ring are inside it too, and a mean would
             stir them into the fill. */
          out[st] = [...counts].reduce((a, c) => (c[1] > a[1] ? c : a))[0];
        }
        /* And the picture itself, converted the same way, so the finding can
           be looked at and not only read off a list of numbers. */
        for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        ctx.putImageData(img, 0, 0);
        const blob = await cv.convertToBlob({ type: "image/png" });
        const url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
        return { tones: out, grey: url.split(",")[1] };
    }, { png, sts });

    const measureGrey = async (mode: string, archId: string) => {
      const shaded = STATES.filter((st) => !expectIncompleteFor(st, archId) && typeof metrics(st, archId).keepRate === "number");
      /* TWO PASSES SINCE 2026-09-19, because the map swipes on a phone
         (charts.md § A tile is a 44px control). An element screenshot captures
         a scroller's BOX, not its content, and a tile past the right edge was
         being sampled off the end of the bitmap — which read as DC being 73 L*
         lighter than Connecticut and as an inverted ramp, at 390 only. The
         tones are read at each end of the scroller and each tile is taken from
         the pass that holds it whole; `sample` below skips the rest. */
      const stops = await page.locator("#grid").evaluate((el) => (el.scrollWidth > el.clientWidth + 1 ? [0, el.scrollWidth - el.clientWidth] : [0]));
      const tones: Record<string, number> = {};
      let grey = "";
      for (const pos of stops) {
        await page.locator("#grid").evaluate((el, p) => { el.scrollLeft = p; }, pos);
        const shot = (await page.locator("#grid").screenshot()).toString("base64");
        const pass = await sample(shot, shaded.filter((st) => !(st in tones)));
        Object.assign(tones, pass.tones);
        grey ||= pass.grey;
      }
      await page.locator("#grid").evaluate((el) => { el.scrollLeft = 0; });
      check(shaded.every((st) => st in tones), `${mode}: every shaded tile was sampled from a pass that holds it whole`,
        `${Object.keys(tones).length} of ${shaded.length}`);
      writeFileSync(`${OUT}/journalist-${width}-${mode}-map-grey.png`, Buffer.from(grey, "base64"));

      const rate = (st: string) => metrics(st, archId).keepRate!;
      const worst = shaded.reduce((a, st) => (rate(st) < rate(a) ? st : a));
      const best = shaded.reduce((a, st) => (rate(st) > rate(a) ? st : a));
      const L = (st: string) => greyL(tones[st]);
      const ends = Math.abs(L(best) - L(worst));
      check(ends >= GREY_FLOOR, `${mode}: in greyscale the best state and the worst stand ${GREY_FLOOR} L* apart (B1)`,
        { worst: `${worst} ${L(worst).toFixed(1)}`, best: `${best} ${L(best).toFixed(1)}`, apart: ends.toFixed(1) });
      /* Light: keeping more is lighter. Dark: severity is distance from the
         ground, so keeping more is darker — the loss ramp's own reversal. */
      const dir = mode === "dark" ? -1 : 1;
      let worstPair: [string, string, number] | null = null;
      for (const a of shaded) for (const b of shaded) {
        if (rate(a) >= rate(b)) continue;
        const slip = dir * (L(a) - L(b));                    // ≤ 0 when the order holds
        if (slip > 0 && (!worstPair || slip > worstPair[2])) worstPair = [a, b, slip];
      }
      check(worstPair === null, `${mode}: greyscale never inverts the ranking — a state that keeps more is never drawn as the worse tone`,
        worstPair ? { [`${worstPair[0]} keeps less than ${worstPair[1]}`]: `${L(worstPair[0]).toFixed(1)} vs ${L(worstPair[1]).toFixed(1)} L*`, by: worstPair[2].toFixed(1) } : "no inversion in any of the " + shaded.length + " states");
      const steps = [...new Set(shaded.slice().sort((a, b) => rate(a) - rate(b)).map((st) => L(st).toFixed(1)))];
      console.log(`     ${mode} greyscale rungs, worst state first: ${steps.join(" → ")} L*`);
      return { ends, steps };
    };
    await measureGrey("light", "single-2");

    /* THE DIVERGING MAP (Plan 9). The page opens on it, so this is measured
       before anything changes the view. Every expected value is read from the
       committed run through core's own `keepRateWords`, so the page and the
       proof cannot round or word a rate two ways.

       What has to hold: zero is a printed bound with a ramp change across it;
       every state that loses is drawn on the plum loss ramp and every state
       that keeps on the keep ramp; the two ends of the scale say in words
       which way is which; and the strip's bars hang off one hinge, left for a
       state that loses and right for one that keeps. */
    const rate = (st: string) => metrics(st, "single-2").keepRate!;
    const say = (st: string) => keepRateWords(rate(st));
    const shortOf = (st: string) => `${say(st).sign} ${say(st).cents}¢`;
    const phraseOf = (st: string) => `${say(st).sign} ${say(st).cents}¢ of each extra dollar on average`;
    const ramps = await page.evaluate(() => {
      /* The two ramps as the stylesheet resolves them in this theme, read off
         a probe rather than from a token's declared text, which is a
         light-dark() pair and not a colour. */
      const probe = document.createElement("span");
      document.body.append(probe);
      const read = (hue: string, steps: number) => Array.from({ length: steps }, (_, i) => { probe.style.background = `var(--${hue}-${i + 1})`; return getComputedStyle(probe).backgroundColor; });
      /* Six plum steps, five keep: on a diverging scale the two arms share one
         lightness axis of six rungs, and only the losing arm reaches the
         deepest (charts.md § the diverging ramp). */
      const out = { loss: read("loss", 6), keep: read("keep", 5) };
      probe.remove();
      return out;
    });
    const mapNow = await page.evaluate(() => ({
      labels: [...document.querySelectorAll("#scaleLabels span")].map((el) => el.textContent!),
      swatches: [...document.querySelectorAll(".scale .sw")].map((el) => getComputedStyle(el).backgroundColor),
      legend: [...document.querySelectorAll("#legend li")].map((el) => el.textContent!),
      legendSwatches: [...document.querySelectorAll("#legend li .hg-swatch")].map((el) => el.className),
      tiles: Object.fromEntries([...document.querySelectorAll(".tile")].map((el) => [(el as HTMLElement).dataset.st!, { bg: getComputedStyle(el).backgroundColor, label: el.getAttribute("aria-label")! }])),
      bins: document.querySelector("#binsLine")!.textContent!.match(/Bins: [^.]*\./)![0],
    }));
    const armOf = (st: string) => (ramps.loss.includes(mapNow.tiles[st].bg) ? "loss" : ramps.keep.includes(mapNow.tiles[st].bg) ? "keep" : "neither");
    const losing = STATES.filter((st) => rate(st) < 0 && !expectIncompleteFor(st, "single-2"));
    const keeping = STATES.filter((st) => rate(st) >= 0 && !expectIncompleteFor(st, "single-2"));
    check(losing.length > 0 && keeping.length > 0 && losing.every((st) => armOf(st) === "loss") && keeping.every((st) => armOf(st) === "keep"),
      `every state that loses is on the plum arm (${losing.length}) and every state that keeps on the keep arm (${keeping.length}) — the hue is the sign`,
      { losing: losing.slice(0, 4).map((st) => [st, armOf(st)]), keeping: keeping.slice(0, 3).map((st) => [st, armOf(st)]) });
    check(mapNow.labels.includes("0¢") && mapNow.labels.length === mapNow.swatches.length + 1,
      "zero is a printed bound of the scale, with one more bound than there are swatches", mapNow.labels);
    /* The bound that reads 0¢ is exactly where the ramp changes. */
    const zeroAt = mapNow.labels.indexOf("0¢");
    const armsOnScale = mapNow.swatches.map((bg) => (ramps.loss.includes(bg) ? "loss" : "keep"));
    check(armsOnScale.slice(0, zeroAt).every((a) => a === "loss") && armsOnScale.slice(zeroAt).every((a) => a === "keep"),
      "the scale is plum up to the 0¢ bound and the keep ramp after it", { labels: mapNow.labels, arms: armsOnScale });
    const lowState = STATES.reduce((a, st) => (rate(st) < rate(a) ? st : a));
    const highState = STATES.reduce((a, st) => (rate(st) > rate(a) ? st : a));
    /* ONE LEGEND (design critique 2026-09-24): the scale's printed bounds say
       which way is which ("−105¢" … "+30¢"), so the strip's list no longer
       repeats the ramp's two ends as swatches; it keeps only the tile states
       that are not on the ramp. */
    check(rate(lowState) < 0 && rate(highState) > 0 && /^−\d+¢$/.test(mapNow.labels[0]) && /^\+\d+¢$/.test(mapNow.labels[mapNow.labels.length - 1])
      && mapNow.legendSwatches.every((c) => /hg-swatch--(none|past|incomplete)/.test(c)),
      "the scale's printed bounds are its two ends, and the legend list repeats no ramp swatch — only the tile states off the ramp", { labels: mapNow.labels, legend: mapNow.legend });
    /* A tile's name OPENS with its state and its rate, in core's own phrasing.
       New Mexico's then carries the child-care footing (B8), which is why this
       is a prefix and not an equality: the footing is part of the name on the
       three states it applies to, and absent on the other forty-eight. */
    check(mapNow.tiles.MO.label === `${STATE_NAMES.MO}: ${phraseOf("MO")}` && mapNow.tiles.NM.label.startsWith(`${STATE_NAMES.NM}: ${phraseOf("NM")}`),
      "a tile's name is its state and its rate, said the way core says it", [mapNow.tiles.MO.label, mapNow.tiles.NM.label]);
    /* The legend is titled with the measure's one name, and says in plain words which way is worse, beside the
       step widths — and, once, that the two sides step differently (R9, M16, R13). */
    const legendWords = await page.evaluate(() => ({ title: document.querySelector("#legendTitle")!.textContent, cue: document.querySelector("#scaleCue")!.textContent, steps: [...document.querySelectorAll("#scaleSteps span")].map((el) => el.textContent) }));
    check(legendWords.title === "Cents kept of each extra dollar" && legendWords.cue === "darker = loses more, lighter = keeps more · the two sides step at different widths"
      && legendWords.steps.length === 2 && legendWords.steps.every((t) => /^steps of \d+¢$/.test(t ?? "")),
      "the legend carries the measure's name, each arm's step width, and a plain cue beside them (R9, M16, R13)", legendWords);
    /* Each arm is cut over its own reach, so the two step widths differ and the
       caption prints both — a reader must not take a step on one arm for a
       step on the other. */
    check(/^Bins: \w+ steps of \d+¢ below zero and \w+ of \d+¢ above it, from −\d+¢ to \+\d+¢ over the \d+ states with a comparable figure\.$/.test(mapNow.bins)
      && mapNow.swatches.length === 6,
      "the caption gives each arm's own count and step and the two ends, signed, over six swatches", mapNow.bins);
    /* The six classes are split in proportion to how far each arm reaches, so
       the arm with more ground to cover gets more of the scale (the cold
       read's S6): Ohio at −42¢ and Nevada at −67¢ must not share a class. */
    const classOf = (st: string) => mapNow.tiles[st].bg;
    check(armsOnScale.filter((a) => a === "loss").length === 4 && armsOnScale.filter((a) => a === "keep").length === 2
      && classOf("OH") !== classOf("NV") && classOf("GA") !== classOf("NE"),
      "the longer arm takes more of the scale: four plum classes to two keep ones, and two states 25¢ apart are not one colour",
      { OH: classOf("OH"), NV: classOf("NV"), arms: armsOnScale });
    /* The strip: bars from one hinge, left for a state that loses. */
    const strip0 = await page.evaluate(() => {
      const rank = document.querySelector("#rank") as HTMLElement;
      const zero = rank.style.getPropertyValue("--zero");
      const row = (st: string) => {
        const btn = document.querySelector(`#rank .hg-row-btn[data-st="${st}"]`)!;
        const track = btn.querySelector(".track")!.getBoundingClientRect(), bar = btn.querySelector(".bar")!.getBoundingClientRect();
        const hinge = track.left + (parseFloat(zero) / 100) * track.width;
        return { value: btn.querySelector(".v")!.firstChild!.textContent!.trim(), toLine: btn.querySelector(".v .at")?.textContent ?? null, left: bar.left - hinge, right: bar.right - hinge, dot: btn.querySelector(".dot") !== null };
      };
      return { zero, diverging: rank.classList.contains("diverging"), hinge: getComputedStyle(document.querySelector("#rank .track")!, "::after").content, MO: row("MO"), NM: row("NM"), WI: row("WI") };
    });
    check(strip0.diverging && strip0.hinge !== "none" && !strip0.MO.dot && strip0.MO.right <= 0.5 && strip0.WI.right <= 0.5 && strip0.NM.left >= -0.5,
      "the strip's bars hang off one hinge: a losing state's runs left of zero, a keeping state's right, and no row carries the sequential dot", strip0);
    check(strip0.MO.value === shortOf("MO") && strip0.NM.value === shortOf("NM") && strip0.WI.value === shortOf("WI"),
      "each ranked row's value is its own rate, in core's words", { MO: strip0.MO.value, NM: strip0.NM.value, WI: strip0.WI.value });
    const toLineOf = (st: string) => {
      const w = keepRateWords(metrics(st, "single-2").keepRateToLine!), v = keepRateWords(metrics(st, "single-2").keepRateWide!);
      return `to the line: ${w.sign} ${w.cents}¢ · to 220%: ${v.sign} ${v.cents}¢`;
    };
    check(strip0.WI.toLine === toLineOf("WI") && strip0.MO.toLine === toLineOf("MO"),
      "each ranked row carries, lighter, the same rate measured to exactly twice poverty and on to 220% of it (R3)", { WI: strip0.WI.toLine, MO: strip0.MO.toLine });
    /* Rank 1 is the LOWEST rate: the worst state here is the most regressive
       one. The order is on the figure the page PRINTS — whole cents — so two
       states a reader sees as equal sit together in postal order, and the rank
       they share is the same rank (the cold read's B2). */
    const centsOf = (st: string) => Math.round(metrics(st, "single-2").keepRate! * 100);
    const keepRows = await page.$$eval("#rank .hg-row-btn", (els) => els.map((el) => [(el as HTMLElement).dataset.st!, el.querySelector(".n")!.textContent!, el.querySelector(".v")!.firstChild!.textContent!.trim()] as [string, string, string]));
    const keepOrder = keepRows.map(([st]) => st);
    const keepable = STATES.filter((st) => !expectIncompleteFor(st, "single-2"));
    const expectKeepOrder = keepable.slice().sort((a, b) => centsOf(a) - centsOf(b) || a.localeCompare(b));
    check(keepOrder.join() === expectKeepOrder.join() && keepOrder[keepOrder.length - 1] === "NM",
      `the keep rate ranks the most regressive state first (${expectKeepOrder[0]}) and the least last (NM), on the cents it prints`, keepOrder.slice(0, 5));
    /* Competition ranking at the printed precision: every state sharing a
       printed rate shares one rank, and the next distinct rate skips to the
       rank after them. Ohio and North Carolina both print "loses 42¢". */
    const rankByCents = new Map<number, string>();
    for (const [st, n] of keepRows) { const c = centsOf(st); if (rankByCents.has(c)) continue; rankByCents.set(c, n); }
    const sharedRanks = keepRows.every(([st, n]) => n === rankByCents.get(centsOf(st)));
    const skips = [...rankByCents].every(([c, n]) => Number(n.replace(".", "")) === 1 + keepable.filter((st) => centsOf(st) < c).length);
    const tiedPairs = [...new Set(keepable.map(centsOf))].filter((c) => keepable.filter((st) => centsOf(st) === c).length > 1);
    check(sharedRanks && skips && tiedPairs.length > 0,
      `every state printing the same rate shares one rank, and the next rate skips past them (${tiedPairs.length} rates are shared here)`,
      { OH: keepRows.find(([st]) => st === "OH"), NC: keepRows.find(([st]) => st === "NC") });
    /* Nothing is lifted out on this measure: a state with no cliff still has a rate. */
    const keepGroups = await page.evaluate(() => ({ none: (document.querySelector("#noneGroup") as HTMLElement).hidden, lower: (document.querySelector("#lowerGroup") as HTMLElement).hidden, ranked: document.querySelectorAll("#rank li").length }));
    check(keepGroups.none && keepGroups.lower && keepGroups.ranked === STATES.length - STATES.filter((st) => expectIncompleteFor(st, "single-2")).length,
      "on the keep rate no state is lifted out for having no cliff: every comparable state is ranked, New Mexico included", keepGroups);

    /* Line length in Archivo (N6): under 80 characters on the prose that ran long. */
    const cpl = await page.$$eval("#figScope, #methodPanel li, #figSrc", (els) => els.map((el) => {
      const lines = Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      return [el.className || el.id, Math.round(el.textContent!.trim().length / lines)] as [string, number];
    }));
    check(cpl.every(([, n]) => n < 80), "prose runs under 80 characters a line", Object.fromEntries(cpl));

    /* Filters, sort and the open state live in the URL; a reload restores them. */
    await page.selectOption("#arch", "married-dual-2");
    await page.selectOption("#metric", "safeExit");
    await page.selectOption("#sort", "safeExit");
    /* The tile's place in the viewport before the click is the measure of "no jump" (rerun S1): scrollY alone would
       read Playwright's own scroll-into-view and the browser's scroll anchoring as the page's doing. */
    const tileBefore = await page.$eval('.tile[data-st="TX"]', (el) => { el.scrollIntoView({ block: "center" }); return el.getBoundingClientRect().top; });
    await page.click('.tile[data-st="TX"]');
    const url = new URL(page.url());
    check(url.search === "?household=married-dual-2&measure=safeExit&sort=safeExit&state=TX", "the URL carries household, measure, sort and state", url.search);
    /* The tile click has a visible answer beside the map (S1) and moves nothing (rerun S1): the tile stays where it was, focus stays on it, the block's heading still updates. */
    const afterTile = await page.evaluate(() => ({
      top: document.querySelector('.tile[data-st="TX"]')!.getBoundingClientRect().top, focused: (document.activeElement as HTMLElement | null)?.dataset?.st,
      readout: document.querySelector("#readout")!.textContent!, title: document.querySelector("#stateTitle")!.textContent!,
      current: (document.querySelector('#tbody .hg-row-btn[aria-current="true"]') as HTMLElement | null)?.dataset.st,
      /* The state's own block is the NEXT thing inside the figure, under the
         readout that names it — not a block a screen away with a link to it
         (rerun S1). What used to be a jump is now a scroll of nothing. */
      panelHidden: (document.querySelector("#statePanel") as HTMLElement).hidden,
      panelInFigure: document.querySelector("#statePanel")!.closest("figure") !== null,
      panelAfterReadout: document.querySelector("#readout")!.compareDocumentPosition(document.querySelector("#statePanel")!) & Node.DOCUMENT_POSITION_FOLLOWING,
      corrHeading: document.querySelector("#corrTitle")!.textContent!,
    }));
    check(near(afterTile.top, tileBefore, 0.5) && afterTile.focused === "TX" && afterTile.readout.startsWith("Texas — ") && afterTile.title === "Where Texas's numbers come from" && afterTile.current === "TX",
      "a tile click fills the readout and names the state's own block, keeps focus on the tile and does not move the page (rerun S1)", { ...afterTile, tileBefore });
    check(!afterTile.panelHidden && afterTile.panelInFigure && afterTile.panelAfterReadout > 0 && /^Corrections applied in Texas/.test(afterTile.corrHeading),
      "the selected state's provenance is a disclosure inside the figure, directly under its readout, and appears only once a state is chosen (rerun S1)", afterTile);
    await page.goto(page.url(), { waitUntil: "networkidle" });
    await page.waitForSelector(".tile");
    await page.evaluate(OPEN_ALL);
    const restored = await page.evaluate(() => ({
      arch: (document.querySelector("#arch") as HTMLSelectElement).value, metric: (document.querySelector("#metric") as HTMLSelectElement).value, sort: (document.querySelector("#sort") as HTMLSelectElement).value,
      tile: (document.querySelector('.tile[aria-current="true"]') as HTMLElement | null)?.dataset.st,
      rank: (document.querySelector('#rankList [aria-current="true"]') as HTMLElement | null)?.dataset.st,
      row: (document.querySelector('.hg-row-btn[aria-current="true"]') as HTMLElement | null)?.dataset.st,
      title: document.querySelector("#corrTitle")!.textContent!,
      firstRow: (document.querySelector("#tbody .hg-row-btn") as HTMLElement).dataset.st,
      corrections: document.querySelectorAll("#corrections li").length,
      unmod: [...document.querySelectorAll("#unmod li .hg-rows__at")].map((el) => el.textContent!),
      notes: [...document.querySelectorAll("#corrections .hg-cite")].map((el) => el.textContent!),
    }));
    check(restored.arch === "married-dual-2" && restored.metric === "safeExit" && restored.sort === "safeExit", "reloading the URL restores the three filters", restored);
    check(restored.tile === "TX" && restored.rank === "TX" && restored.row === "TX", "reloading the URL restores the open state on the map, in the ranking and in the table");
    check(/^Corrections applied in Texas \(\d+\)$/.test(restored.title) && restored.corrections === 3, "Texas's coverage block: three corrections applied", restored.title);
    const txAll = coverage.TX.unmodeled.filter((u) => u.scope === "all").map((u) => u.program);
    const txOwn = coverage.TX.unmodeled.filter((u) => u.scope !== "all").map((u) => u.program);
    const excludes = await page.$$eval("#excludes li", (els) => els.map((el) => el.textContent!));
    // Since Plan 7 LIHEAP is a boundary, not a gap, so no state shares a gap on this sweep; the rule still holds for any that returns.
    const sharedOnce = txAll.every((p) => !restored.unmod.includes(p) && excludes.some((t) => t.startsWith(`${p}, in every state:`)));
    const noSharedListed = txAll.length > 0 || !excludes.some((t) => /, in every state:/.test(t));
    check(sharedOnce && noSharedListed && txOwn.every((p) => restored.unmod.includes(p)),
      "a gap every state shares is listed once under the method, never under a state; a state's own gaps stay in its block (S8)", { txAll, txOwn, unmod: restored.unmod, excludes });
    check(restored.notes.every((n) => /^[A-Z]/.test(n) && !/WORKAROUND|\.ts\b/.test(n) && /#\d{4}/.test(n)), "every correction note is a sentence with its issue number and no code pointer (S9)", restored.notes[0]);
    const dual = (st: string) => metrics(st, "married-dual-2");
    const comparable = STATES.filter((st) => dual(st).cliffCount > 0 && !expectIncompleteFor(st, "married-dual-2"));
    const lowerBound = comparable.filter((st) => dual(st).safeExit === null || dual(st).leapIsLowerBound);
    const expectedFirst = lowerBound.length ? lowerBound[0] : comparable.filter((st) => dual(st).safeExit !== null).sort((a, b) => dual(b).safeExit! - dual(a).safeExit!)[0];
    const tableOrder = await page.$$eval("#tbody tr:not(.group) .hg-row-btn", (els) => els.map((el) => (el as HTMLElement).dataset.st!));
    const groupRows = await page.$$eval("#tbody tr.group th", (els) => els.map((el) => el.textContent!));
    check(restored.firstRow === expectedFirst && tableOrder.slice(0, lowerBound.length).sort().join() === lowerBound.sort().join() && groupRows[0] === `Ranks 1–${lowerBound.length} shared — past the top of the axis; no safe exit found on the scale (${lowerBound.length})`,
      "sorted by safe exit, the lower-bound rows lead the table under a heading that says they share ranks 1–n, before the largest comparable exit (B1)", { firstRow: restored.firstRow, expectedFirst, lowerBound, groupRows });
    /* The child-care subsidy's footing is stated in every block, from the coverage record (B2). */
    const subsidyLine = (st: string) => `Child-care subsidy: ${coverage[st].corrections.childcareSubsidy.source === "added by HotGap" ? `added by HotGap for ${STATE_NAMES[st]}` : `inside PolicyEngine's net income for ${STATE_NAMES[st]}`}.`;
    const txSub = await page.$eval("#stateSub", (el) => el.textContent!);
    check(txSub.endsWith(subsidyLine("TX")), "Texas's block states the child-care subsidy's footing from corrections.childcareSubsidy (B2)", txSub);

    /* Selection and focus are two marks (S4): the selected tile's ring is
       inside in its label ink; a focused, unselected tile has the outline only. */
    await page.focus('.tile[data-st="NY"]');
    const marks = await page.evaluate(() => {
      const cs = (st: string) => getComputedStyle(document.querySelector(`.tile[data-st="${st}"]`)!);
      return { selShadow: cs("TX").boxShadow, selOutline: cs("TX").outlineStyle, focusShadow: cs("NY").boxShadow, focusOutline: cs("NY").outlineStyle };
    });
    check(/inset/.test(marks.selShadow) && marks.selOutline === "none" && marks.focusShadow === "none" && marks.focusOutline === "solid", "the selected tile has an inset ring and no outline; the focused tile an outline and no ring", marks);

    /* Keyboard: the map is one tab stop; arrows move by geography; Enter selects. */
    await page.focus('.tile[data-st="TX"]');
    await page.keyboard.press("ArrowUp");
    const afterUp = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.st);
    await page.keyboard.press("Enter");
    const selectedByKey = await page.evaluate(() => [(document.querySelector('.tile[aria-current="true"]') as HTMLElement).dataset.st, new URL(location.href).searchParams.get("state")]);
    check(afterUp === "OK" && selectedByKey[0] === "OK" && selectedByKey[1] === "OK", "ArrowUp from Texas focuses Oklahoma; Enter opens it and the URL follows", { afterUp, selectedByKey });
    const tabStops = await page.$$eval("#grid [tabindex='0'], #rankList [tabindex='0'], #tbody [tabindex='0']", (els) => els.length);
    check(tabStops === 3, "one tab stop in the map, one in the ranking and one in the table", tabStops);

    /* The ranked list is a control (S2): 44px rows on a phone, and a row's
       selection mark is the sunk ground with an ink bar (S3). */
    const rankRow = await page.$eval('#rankList .hg-row-btn[tabindex="0"]', (el) => ({ tag: el.tagName, h: el.getBoundingClientRect().height, st: (el as HTMLElement).dataset.st }));
    check(rankRow.tag === "BUTTON" && (width >= 992 ? rankRow.h >= 24 : rankRow.h >= 44), `a rank row is a button ${width >= 992 ? "at the list's density" : "of at least 44px"}`, rankRow);
    await page.focus('#rankList .hg-row-btn[tabindex="0"]');
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const rankSel = await page.evaluate(() => {
      const b = document.activeElement as HTMLElement, cs = getComputedStyle(b);
      return { st: b.dataset.st, tile: (document.querySelector('.tile[aria-current="true"]') as HTMLElement).dataset.st, shadow: cs.boxShadow, bg: cs.backgroundColor, ink: cs.color };
    });
    check(rankSel.st === rankSel.tile && /3px 0px 0px 0px inset/.test(rankSel.shadow), "ArrowDown then Enter in the ranking selects that row's state; the row carries the 3px ink bar", { st: rankSel.st, shadow: rankSel.shadow });
    console.log(`     selected row: ink bar ${contrast(rgb(rankSel.ink), rgb(rankSel.bg)).toFixed(2)}:1 on its ground`);

    /* Selecting from the table answers in the readout and moves nothing (rerun S1): focus stays on the row. */
    await page.focus('#tbody .hg-row-btn[tabindex="0"]');
    await page.keyboard.press("ArrowDown");
    const beforeEnter = await page.evaluate(() => document.activeElement!.getBoundingClientRect().top);
    await page.keyboard.press("Enter");
    const rowSel = await page.evaluate(() => {
      const row = document.querySelector('#tbody .hg-row-btn[aria-current="true"]') as HTMLElement;
      return { top: row.getBoundingClientRect().top, focused: document.activeElement === row, row: row.dataset.st!, tile: (document.querySelector('.tile[aria-current="true"]') as HTMLElement).dataset.st,
        rowTab: row.tabIndex, bar: getComputedStyle(row.closest("tr")!.firstElementChild!).boxShadow, readout: document.querySelector("#readout")!.textContent!.slice(0, 30) };
    });
    /* 1.5px, not 0.5, since 2026-09-19. What holds the row still through a
       selection that adds seven hundred pixels above it is the browser's
       scroll anchoring, and its residue is sub-pixel, not zero: measured at
       0.17px on a first selection and 0.75px here once the map's "Swipe for
       more" line had added 28px to the figure. The rule this asserts is that
       the page does not JUMP, and a fifth of a device pixel is not a jump —
       0.5px was measuring the instrument's own floor. */
    check(rowSel.row === rowSel.tile && rowSel.focused && near(rowSel.top, beforeEnter, 1.5) && rowSel.rowTab === 0 && /3px 0px 0px 0px inset/.test(rowSel.bar) && rowSel.readout.startsWith(STATE_NAMES[rowSel.row]),
      "ArrowDown then Enter in the table selects on the map and fills the readout; the row stays where it was and keeps focus, its tab stop and its ink bar (rerun S1)", { ...rowSel, beforeEnter });

    /* The readout and the block's first line carry the figure with its step, its programs and its county (B3, B4), every value the file's. */
    await page.selectOption("#arch", "single-2");
    await page.selectOption("#metric", "biggestLoss");
    await page.click('#rankList .hg-row-btn[data-st="OH"]');
    const oh = metrics("OH", "single-2"), ohCov = coverage.OH;
    const programsOfStep = (ids: string[]) => `${ids.map(programName).join(" and ")} ${ids.length === 1 ? "ends" : "end"}`;
    /* THE ROAD LEADS (Plan 9), whatever measure is selected: what the household
       keeps of each extra dollar from the poverty line to twice it, where that
       road collapses, and how many families like it are below the collapse.
       Every figure is read from the committed run; the cents and the sign word
       are core's `keepRateWords`, the same function the page renders through.

       The FRAME around the rate is the page's since the picture-first pass —
       core's sentence puts the household and the climb inside it, and the
       answer sentence two inches above has just said both. The rate itself is
       still core's phrase, so the map, the citizen answer and the caseworker
       sheet cannot word or round it three ways. */
    /* Since the blind reviews (2026-09-26): the rate said again in dollars —
       "a raise of $28,000 leaves the family $29,362 poorer" (M17) — what
       "money kept" counts, with the child-care help inside it (M3), and the
       road's biggest loss in the measure's own words, never "collapses". */
    const roadLead = (st: string) => {
      const m = metrics(st, "single-2");
      const diff = m.netAtRoadHi! - m.netAtRoadLo!;
      const change = diff < 0 ? `${money(-diff)} poorer` : diff === 0 ? "no better off" : `${money(diff)} better off`;
      const counted = "Money kept is after taxes, premiums and the child care the family pays itself" + (m.childcareAtRoadLo ? `; ${money(m.childcareAtRoadLo)} of it at the poverty line is child-care help paid to the provider.` : ".");
      const first = `${STATE_NAMES[st]} — ${phraseOf(st)} from the poverty line to twice it: a raise of ${money(m.roadHi! - m.roadLo!)} leaves the family ${change}, from ${money(m.netAtRoadLo!)} to ${money(m.netAtRoadHi!)}. ${counted}`;
      if (!m.roadWorst) return m.cliffCount === 0 ? first : `${first} No ${money(STEP)} raise between ${money(m.roadLo!)} and ${money(m.roadHi!)} cuts net income by ${money(CLIFF_MIN)} or more.`;
      const ids = m.roadWorst.programs;
      const where = ids.length === 0 ? `The biggest loss on the road is at ${money(m.roadWorst.at)}: ${money(m.roadWorst.drop)} in one step; no single program explains it.`
        : `The biggest loss on the road is at ${money(m.roadWorst.at)}: ${money(m.roadWorst.drop)} in one step, when ${programsOfStep(ids)}.`;
      return `${first} ${where}`;
    };
    const ohText = await page.evaluate(() => ({
      readout: document.querySelector("#readout")!.textContent!.replace(/\s+/g, " ").trim(),
      lines: (document.querySelector("#readout") as HTMLElement).innerText.split("\n").map((l) => l.trim()),
      block: document.querySelector("#statePanel")!.textContent!.replace(/\s+/g, " ").trim(),
      sub: document.querySelector("#stateSub")!.textContent!, src: document.querySelector("#stateSrc")!.textContent!,
      bold: [...document.querySelectorAll("#readout b")].map((b) => b.textContent!),
      unmod: [...document.querySelectorAll("#unmod li .hg-rows__at")].map((el) => el.textContent!),
    }));
    /* Ohio's road collapse IS its tallest wall, so the last line says so once
       rather than printing the same figure twice. */
    const ohSame = oh.roadWorst!.at === oh.biggestLossAt && oh.roadWorst!.drop === oh.biggestLoss;
    check(ohText.lines[0].startsWith(roadLead("OH")) && ohSame && ohText.lines[1] === "That is also the biggest one-raise loss at any pay." && !/collapse/.test(ohText.readout),
      "Ohio's readout leads with the road — the rate in cents and in dollars, what money kept counts, its biggest loss, who is below it — and does not print its one cliff twice (Plan 9, M3, M17)", ohText.lines);
    /* The block under the readout says where the numbers came from and nothing
       else: it used to repeat the readout's sentences verbatim, which is what
       the cold read met twice on the way down the page. */
    check(!ohText.block.includes(roadLead("OH")) && ohText.block.startsWith("Where Ohio's numbers come from"),
      "the state's block no longer repeats the readout above it; it is named for what is inside it", ohText.block.slice(0, 90));
    check(ohText.bold.join("|") === `Ohio|${phraseOf("OH")}|${money(Math.abs(oh.netAtRoadHi! - oh.netAtRoadLo!))}|${money(oh.netAtRoadLo!)}|${money(oh.netAtRoadHi!)}|${money(oh.roadWorst!.at)}|${money(oh.roadWorst!.drop)}`,
      "the readout marks the state, its rate, what the raise costs, the level at both ends of the road and the road's two figures, as the CurveReadout marks its figure", ohText.bold);
    /* POSITION: the share of families like this earning less than the figure
       just named, from the reach ladder, said as a sentence of its own. */
    /* The state is the line's own subject, named at its head, so the position
       sentence no longer says it a second time. */
    /* Ohio's largest cliff just past the road ($378 at $57,000) is smaller than the road's own, so nothing follows the position. */
    const ohPos = ohText.lines[0].match(/(\d+) in 100 families like this earn less than that\.$/);
    check(ohPos !== null && Number(ohPos[1]) > 0 && Number(ohPos[1]) < 100 && !/like this in Ohio/.test(ohText.lines[0]),
      "the road line ends with how many families like this earn less than the collapse, the state named once", ohText.lines[0].slice(-60));
    /* The step's earnings ride beside the loss in the ranked row and in the
       table (rerun S5), now with the position beside them (Plan 9). */
    await page.selectOption("#metric", "biggestLoss");
    const ohRank = await page.$eval('#rank .hg-row-btn[data-st="OH"]', (el) => ({ at: el.querySelector(".at")?.textContent, label: el.getAttribute("aria-label"), n: el.querySelector(".n")!.textContent }));
    const ohRow = await page.$eval('#tbody .hg-row-btn[data-st="OH"]', (el) => [...el.closest("tr")!.children].map((td) => (td as HTMLElement).innerText.trim().replace(/\u00a0/g, " ").replace(/\s*\n\s*/g, " · ")));
    const ohShare = `${Math.round(oh.biggestLossPosition!)} in 100`;
    check(ohRank.at === `at ${money(oh.biggestLossAt!)} · ${ohShare} earn less` && ohRank.label === `${ohRank.n} Ohio: ${money(oh.biggestLoss)}, at ${money(oh.biggestLossAt!)} · ${ohShare} earn less`
      && ohRow[COL.biggestLoss] === `${money(oh.biggestLoss)} · Worst step: ${money(oh.biggestLossAt!)} → ${money(oh.biggestLossAt! + STEP)} · ${ohShare}`,
      "Ohio's ranked row, and under the loss in its table cell the worst step, named for a screen reader, say where the step begins and how many families earn less, both from the file (rerun S5, Plan 9)", { rank: ohRank, cell: ohRow[COL.biggestLoss], expect: ohShare });
    /* The whole-axis worst is the LAST line now, labelled for what it is, with
       its own position; the selected measure's sentence sits between (Plan 9). */
    const axisWorst = (st: string) => {
      const m = metrics(st, "single-2");
      return `Biggest one-raise loss at any pay: ${money(m.biggestLoss)} at ${money(m.biggestLossAt!)} → ${money(m.biggestLossAt! + STEP)}, when ${programsOfStep(m.biggestLossPrograms)}. ${Math.round(m.biggestLossPosition!)} in 100 families like this earn less than that.`;
    };
    const leads: Record<string, string | null> = {
      dangerWidth: oh.safeExit === null ? null : `Ohio — ${money(oh.dangerWidth)} of pay spent below an earlier peak.`,
      leap: oh.leapIsLowerBound ? null : `Ohio — a raise of ${money(oh.leap)} clears the worst danger zone.`,
      safeExit: oh.safeExit === null ? null : `Ohio — above ${money(oh.safeExit)}, no earlier peak is higher.`,
      deepestFall: oh.deepestFall! > 0 ? `Ohio — at its lowest on the road, the family has ${money(oh.deepestFall!)} less than it had at the poverty line.` : "Ohio — the family never has less than it had at the poverty line, anywhere on the road.",
      netAtRoadLo: `Ohio — ${money(oh.netAtRoadLo!)} kept a year with pay at the poverty line.`,
    };
    const readoutFor = async (key: string) => { await page.selectOption("#metric", key); return page.evaluate(() => document.querySelector<HTMLElement>("#readout")!.innerText.split("\n").map((l) => l.trim())); };
    for (const [key, lead] of Object.entries(leads)) {
      const lines = await readoutFor(key);
      const last = "That is also the biggest one-raise loss at any pay.";
      check(lead !== null && lines[0].startsWith(roadLead("OH")) && lines[1] === lead && lines[2] === last,
        `under ${key} Ohio's readout leads with the road, then that measure's sentence, then the whole axis last (Plan 9)`, { lines, lead });
    }
    /* Where the road's collapse is NOT the tallest wall, the last line prints
       the whole-axis figure with its own position: Maryland's $33,587 at
       $97,000, which four families in five are above — the plan's own case. */
    await page.selectOption("#metric", "keepRate");
    await page.click('.tile[data-st="MD"]');
    const mdLines = await page.evaluate(() => (document.querySelector("#readout") as HTMLElement).innerText.split("\n").map((l) => l.trim()));
    const md0 = metrics("MD", "single-2");
    check(md0.roadWorst!.drop !== md0.biggestLoss && mdLines[0].startsWith(roadLead("MD")) && mdLines[1] === axisWorst("MD"),
      "Maryland's readout: a road that collapses on $913 of school meals, and the $33,587 headline last, with the share of families below each", mdLines);
    /* R3 (c): Minnesota's road keeps 9¢, and its $27,483 child-care exit is the step out of $56,000 — one step past
       the road's top. The readout says so, because the keep rate cannot. */
    await page.click('.tile[data-st="MN"]');
    const mnLine = await page.evaluate(() => (document.querySelector("#readout") as HTMLElement).innerText.split("\n")[0].trim());
    const mn = metrics("MN", "single-2");
    check(mn.pastRoadWorst !== null && mn.pastRoadWorst!.drop > mn.roadWorst!.drop && mnLine.endsWith(`And a larger drop sits just past the road, at ${money(mn.pastRoadWorst!.at)}: ${money(mn.pastRoadWorst!.drop)} in one step.`),
      "Minnesota's readout says a larger drop sits just past the road's top, where the keep rate cannot see it (R3)", mnLine.slice(-120));
    /* A figure the axis bounds says past what, in dollars from the file: Nebraska's safe exit and Maryland's leap (rerun B2, N9). */
    const ne = metrics("NE", "single-2"), md = metrics("MD", "single-2");
    /* The measure's own sentence is the SECOND line now; the road is the first. */
    const measureLine = async () => page.evaluate(() => (document.querySelector("#readout") as HTMLElement).innerText.split("\n")[1].trim());
    await page.selectOption("#metric", "safeExit");
    await page.click('.tile[data-st="NE"]');
    const neLine = await measureLine();
    check(ne.safeExit === null && neLine === `Nebraska — no such pay on the scale: the last stretch below an earlier peak had not closed by ${money(ne.axisTop)}, the top of the axis.`, "Nebraska under safe exit: no such pay found, said with the axis top in dollars (rerun B2)", neLine);
    await page.selectOption("#metric", "leap");
    await page.click('.tile[data-st="MD"]');
    const mdLine = await measureLine();
    check(md.leapIsLowerBound && mdLine === `Maryland — a raise of at least ${money(md.leap)} to clear the worst danger zone, which runs past ${money(md.axisTop)}, the top of the axis.`, "Maryland under the leap: at least the floor, past the axis top in dollars (rerun B2)", mdLine);
    /* A no-cliff state says what the model found instead, up to the axis it was swept to (rerun S6): the floor from core, the step from the file, never a guessed cause. */
    const nm = metrics("NM", "single-2");
    await page.click('.tile[data-st="NM"]');
    const nmLines = await page.evaluate(() => (document.querySelector("#readout") as HTMLElement).innerText.split("\n").map((l) => l.trim()));
    /* The readout's last line links to the household tool for this state and
       this household's shape, in core's flag names (design critique
       2026-09-24: link to the next step in context); the lines above it are
       the findings. */
    const tryIt = await page.$eval("#readout a.tryIt", (a) => ({ text: a.textContent, href: a.getAttribute("href") }));
    check(nmLines.pop() === "Try this family in the household tool" && tryIt.href === "/?state=NM&kids=3%2C7&rent=1464&childcare=1350&childcare-subsidy=1",
      "the readout ends with a link that opens the household tool on the swept family: New Mexico, a single parent of two (3 and 7), its rent, its care bill and the subsidy", tryIt);
    /* New Mexico is the page's most quotable claim — the one state with no
       cliff anywhere — and one of two whose child-care price is a national
       median standing in for a county the source database lacks. Child care
       ends the worst step on the road in most states, so the substitution
       travels with the claim rather than sitting in the smallest text on the
       page (the cold read's B3). */
    const nmCare = "There is no county child-care price for New Mexico in the source database, so a national median price stands in — and child care is what ends at most of these cliffs.";
    check(nm.cliffCount === 0 && coverage.NM.vintages.childcare.preschool.startsWith("nationalMedian")
      && nmLines[nmLines.length - 1] === `New Mexico — no cliff found: no ${money(STEP)} step of earnings on this household's curve cut net income by ${money(CLIFF_MIN)} or more, up to ${money(nm.axisTop)}. ${nmCare}`,
      "New Mexico's readout gives the data's reason for no cliff (rerun S6) and says its child-care price is not a county one (Plan 9 cold read B3)", nmLines);
    /* A state priced from its own county says nothing of the kind. */
    await page.click('.tile[data-st="OH"]');
    const ohCareLine = await page.evaluate(() => (document.querySelector("#readout") as HTMLElement).innerText);
    check(coverage.OH.vintages.childcare.preschool.startsWith("county") && !/child-care price/.test(ohCareLine),
      "Ohio, priced from Franklin County's own study, carries no such caveat", coverage.OH.vintages.childcare.preschool);
    /* The county is provenance and is named in the state's own source line,
       one press below the readout, so the readout no longer says it too. */
    check(!/Renter,/.test(ohCareLine) && (await page.$eval("#stateSrc", (el) => el.textContent!)).includes(coverage.OH.vintages.county.name!),
      "the county left the readout for the state's source line, where the rest of the provenance is", ohCareLine.slice(-70));
    /* With no cliff anywhere, the road line does not also claim the smaller
       thing — the last line already says the stronger one. */
    check(nmLines.length === 2 && nmLines[0] === roadLead("NM") && !/raise between/.test(nmLines[0]) && nm.keepRate! > 0,
      "New Mexico's road line says what it keeps and stops there, because the line below says no cliff was found anywhere", nmLines[0]);
    /* The axis in dollars in the method, per household, with the states whose guidelines lengthen it (rerun N9). */
    const tops = new Map<number, string[]>(); for (const st of STATES) { const t = metrics(st, "single-2").axisTop; tops.set(t, [...(tops.get(t) ?? []), st]); }
    const [common] = [...tops].sort((a, b) => b[1].length - a[1].length)[0];
    const exceptions = STATES.filter((st) => metrics(st, "single-2").axisTop !== common).map((st) => `${money(metrics(st, "single-2").axisTop)} in ${STATE_NAMES[st]}`);
    /* "that wall sits above the median family's earnings in 39 states of 50"
       was TYPED into copy, and it is a fact about one household in eleven: the
       same count is 3 for a two-earner couple with two children (2026-09-18,
       N4). Counted per household now, off the positions the table prints. */
    const placed = STATES.filter((st) => metrics(st, "single-2").biggestLossPosition !== null);
    const aboveMedian = placed.filter((st) => (metrics(st, "single-2").biggestLossPosition as number) > 50);
    const groupsLine = await page.$eval("#groupsLine", (el) => el.textContent!);
    check(groupsLine.includes(`that wall sits above the median family's earnings in ${aboveMedian.length} states of ${placed.length}`),
      `how far up the curve the tallest wall stands is counted for the household on the screen (${aboveMedian.length} of ${placed.length}), never typed (N4)`, groupsLine.slice(-90));
    const axisLine = await page.$eval("#axisLine", (el) => el.textContent);
    check(axisLine === `For 1 adult, 2 children (3 and 7) the axis runs from $0 to ${money(common)}${exceptions.length ? ` (${exceptions.join(", ")})` : ""}; a figure that runs past the axis runs past that.`, "the method names the household's axis top in dollars, and the exceptions (rerun N9)", axisLine);
    /* Texas's three corrections each carry a chip, the coverage-gap one the CSV's own word (rerun N7). */
    await page.click('.tile[data-st="TX"]');
    const txChips = await page.$$eval("#corrections li", (lis) => lis.map((li) => [li.querySelector(".hg-rows__at")!.textContent, li.querySelector(".hg-tag")?.textContent ?? null]));
    check(txChips.length === 3 && txChips.every(([, chip]) => chip) && txChips.some(([, chip]) => chip === "applied"), "every Texas correction carries a chip, the coverage-gap premium's reading applied (rerun N7)", txChips);

    /* EligibilityBoundary (#23) in the state block: one row in the ledger's
       shape whose three facts equal the coverage block's fields, at the row's
       own size, with the publishers as its cite and the day read in the
       reader's zone; the footing chip beside the name. Michigan reads as
       counted, Hawaii's null share as not published, Missouri's flat schedule
       as flat; and nothing about it is a measure anywhere. */
    const boundaryOf = async (st: string) => {
      await page.click(`.tile[data-st="${st}"]`);
      return page.evaluate(() => {
        const list = document.querySelector("#liheap") as HTMLElement, li = list.querySelector("li")!;
        return {
          hidden: list.hidden, footing: list.dataset.footing, rows: list.querySelectorAll("li").length, rule: getComputedStyle(list).borderTopWidth,
          after: list.compareDocumentPosition(document.querySelector("#stateSrc")!) & Node.DOCUMENT_POSITION_FOLLOWING,
          name: li.querySelector(".hg-rows__at")!.firstChild!.textContent!.trim(), chip: li.querySelector(".hg-rows__at .hg-tag")?.textContent ?? null,
          facts: li.querySelectorAll(".hg-cite")[0].textContent!, cite: li.querySelectorAll(".hg-cite")[1].textContent!, links: [...li.querySelectorAll("a")].map((a) => a.href),
          factsSize: parseFloat(getComputedStyle(li.querySelectorAll(".hg-cite")[0]).fontSize), noteSize: parseFloat(getComputedStyle(document.querySelector("#corrections .hg-cite, #unmod .hg-cite, #other .hg-cite") ?? li.querySelectorAll(".hg-cite")[0]).fontSize),
        };
      });
    };
    const tenths = (share: number) => { const n = Math.round(share * 10); return n <= 0 ? "Fewer than 1 in 10" : n >= 10 ? "Almost all" : `About ${n} in 10`; };
    const servedLine = (b: LiheapCoverage) => (b.servedShare === null ? `The share of income-eligible households served is not published for ${LIHEAP_VINTAGE.served}.` : `${tenths(b.servedShare)} income-eligible households were served in ${LIHEAP_VINTAGE.served} (${Math.round(b.servedShare * 100)}%).`);
    const worthLine = (b: LiheapCoverage) => `Worth ${b.topBand!.min === b.topBand!.max ? money(b.topBand!.min) : `${money(b.topBand!.min)} to ${money(b.topBand!.max)}`} a winter if received${b.shape === "taper" ? "; the amount tapers toward the limit." : b.shape === "notch" ? ", flat to the limit." : ", at that top income band."}`;
    const factsOf = (b: LiheapCoverage) => `Stops at ${b.limitKind}, the heating limit for ${LIHEAP_VINTAGE.limits}. ${worthLine(b)} ${servedLine(b)}`;
    const host = (u: string) => new URL(u).hostname;
    const txB = liheapOf("TX"), txN = coverage.TX.corrections.liheap!;
    const txBoundary = await boundaryOf("TX");
    check(!txBoundary.hidden && txBoundary.rows === 1 && txBoundary.after > 0 && txBoundary.rule === "2px" && txBoundary.name === "Energy assistance (LIHEAP)" && txBoundary.chip === "not counted" && txBoundary.footing === "boundary" && txN.source === "boundary"
      && txB.topBand!.min === txB.topBand!.max && txB.servedShare! < 0.05 && txBoundary.facts === factsOf(txB)
      && txBoundary.cite === `Limit and amount: ${host(txB.sources.limits)}. Households served: ${host(txB.sources.served!)}. Read ${dayWords(txB.readOn)}.` && txBoundary.links.join() === [txB.sources.limits, txB.sources.served].join()
      && txBoundary.factsSize === txBoundary.noteSize,
      "Texas's block: one row whose three facts equal coverage.TX.liheap in the cite register the corrections use (liheap review S1), the publishers linked on its second line with the day read in the reader's zone, the chip saying not counted, set off by the strong rule before the source line (#23)", txBoundary);
    const miB = liheapOf("MI"), miN = coverage.MI.corrections.liheap!;
    const miBoundary = await boundaryOf("MI");
    check(miN.source === "in net income" && miB.upstream?.counted === "state credit" && miBoundary.chip === "in net income" && miBoundary.footing === "in net income"
      && miB.shape === "taper" && miBoundary.facts === `${factsOf(miB)} Paid as the ${miN.program}, which is counted in every figure for ${STATE_NAMES.MI}.` && /Home Heating Credit/.test(miBoundary.facts),
      "Michigan reads as counted: the chip says in net income, the row names the Home Heating Credit as counted in every figure, and the taper's worth says it tapers (#23)", { chip: miBoundary.chip, facts: miBoundary.facts });
    const hiB = liheapOf("HI");
    const hiBoundary = await boundaryOf("HI");
    check(hiB.servedShare === null && hiB.sources.served === null && hiBoundary.facts === factsOf(hiB) && hiBoundary.facts.endsWith(`served is not published for ${LIHEAP_VINTAGE.served}.`) && !/\d+%\)\.$/.test(hiBoundary.facts)
      && hiBoundary.links.length === 1 && hiBoundary.chip === "not counted",
      "Hawaii's null served share prints as not published — no percentage, no served link — and the row still says not counted (#23)", { facts: hiBoundary.facts, links: hiBoundary.links });
    const moB = liheapOf("MO");
    const moBoundary = await boundaryOf("MO");
    check(moB.shape === "notch" && moBoundary.facts.includes(`Worth ${money(moB.topBand!.min)} to ${money(moB.topBand!.max)} a winter if received, flat to the limit.`) && moBoundary.facts === factsOf(moB),
      "Missouri's flat schedule reads as flat to the limit, its range the block's (#23)", moBoundary.facts);
    /* A boundary, not a measure: nothing about it in the ranked strip, the map, its legend or scale, the tiles, the table's columns or any control. */
    const noMeasure = await page.evaluate(() => ({
      rank: document.querySelector("#rankList")!.textContent!, figure: document.querySelector("#legend")!.textContent! + document.querySelector("#scaleLabels")!.textContent! + document.querySelector("#figSrc")!.textContent! + document.querySelector("#binsLine")!.textContent! + document.querySelector("#figScope")!.textContent!,
      controls: [...document.querySelectorAll("#sort option, #metric option, #arch option")].map((o) => o.textContent).join("|"),
      table: [...document.querySelectorAll("thead th")].map((th) => th.textContent).join("|") + document.querySelector("#defs")!.textContent!,
      tiles: [...document.querySelectorAll(".tile")].map((t) => t.getAttribute("aria-label")).join("|"),
    }));
    check(Object.values(noMeasure).every((t) => !/liheap|energy|heating/i.test(t)), "nothing about LIHEAP in the ranked strip, the map, its legend, the tiles, the table's columns or any sort or measure control (#23: a boundary is not a measure)");
    /* The method says it once for the page, from every block: the served range with its two states, and the states where the money is counted. */
    const shares = STATES.filter((st) => liheapOf(st).servedShare !== null).sort((a, b) => liheapOf(a).servedShare! - liheapOf(b).servedShare!);
    const lo = shares[0], hi = shares[shares.length - 1];
    const countedStates = STATES.filter((st) => coverage[st].corrections.liheap!.source === "in net income");
    const liheapMethod = (await page.$$eval("#excludes li", (els) => els.map((el) => el.textContent!))).find((t) => t.startsWith("Energy assistance (LIHEAP)"));
    check(liheapMethod !== undefined && liheapMethod.includes(`the states served between ${Math.round(liheapOf(lo).servedShare! * 100)}% (${STATE_NAMES[lo]}) and ${Math.round(liheapOf(hi).servedShare! * 100)}% (${STATE_NAMES[hi]})`)
      && (countedStates.length === 0 ? !/except in/.test(liheapMethod) : liheapMethod.includes(`except in ${countedStates.map((st) => STATE_NAMES[st]).join(" and ")}, where it is paid as the ${coverage[countedStates[0]].corrections.liheap!.program} and counted`)),
      "the method names LIHEAP once for the page with the served range and its two states from every block, and the states where it is counted (#23)", liheapMethod?.slice(0, 160));
    await page.click('.tile[data-st="TX"]');
    await page.selectOption("#metric", "biggestLoss");
    await page.click('#rankList .hg-row-btn[data-st="OH"]');
    check(ohText.sub.endsWith(subsidyLine("OH")) && /the fixes other states need were not needed here/.test(ohText.sub), "Ohio's (0) block says the fixes were not needed and states the subsidy's footing (B2)", ohText.sub);
    /* REACH RETURNS (Plan 9): position is load-bearing now, so the state's
       source line names the survey behind it again, from its own block. */
    const reachVintages = ohCov.vintages.reach!.vintages.map((v) => v.replace(/^(\d{4})-(\d)yr$/, "ACS $1 $2-year PUMS").replace(/^(\d{4})-(\d{4})-(\d)yr$/, "ACS $1–$2 $3-year PUMS"));
    check(ohText.src.includes(`County: ${ohCov.vintages.county.name} (the state's most populous; ${ohCov.vintages.county.vintage}).`)
      && ohText.src.endsWith(`Families earning less: ${reachVintages.join(" and ")}, grown to ${summary.year} dollars.`),
      "the state's source line names the county (B4) and the survey behind its positions (Plan 9)", ohText.src.slice(-120));
    check(!ohText.unmod.includes("LIHEAP") && (await page.$eval("#unmodTitle", (el) => (el as HTMLElement).hidden)) === (ohText.unmod.length === 0), "Ohio's block lists no universal gap under the state (S8)", ohText.unmod);
    check(await page.$eval("#readout", (el) => el.closest(".picture") !== null && (el.parentElement!.classList.contains("aside") ? el.parentElement! : el).previousElementSibling!.classList.contains("mapCaution") && getComputedStyle(el).minHeight !== "0px"),
      "the readout is the figure's own .hg-readout, under the map and its legend");
    /* The suggested citation, from the run's facts and the page's own address (N13). */
    const cite = await page.$eval("#cite", (el) => el.textContent!);
    /* The page's own address: behind the Worker that is /places (the assets router drops .html), under Vite it was /places.html. */
    const self = new URL(page.url());
    check(cite.startsWith("Cite as: HotGap, What a raise costs, state by state, ") && cite.includes(`${summary.year} rules on PolicyEngine (policyengine-us ${summary.model!.version})`) && cite.includes(`run of ${dateWords(summary.generated)}`) && cite.includes(`${self.origin}${self.pathname}?household=single-2&measure=biggestLoss&sort=safeExit&state=OH`),
      "the Cite line carries the year, the model, the run date and this view's own URL (N13)", cite);
    /* The run date is the reader's own (rerun S2): the page, opened in New York, prints the instant's New York date everywhere it prints one; the UTC date, where it differs, appears nowhere. */
    const utcDate = dateIn(summary.generated, "UTC"), localDate = dateWords(summary.generated);
    const dated = await page.evaluate(() => ["#figSrc", "#stateSrc", "#methodSrc", "#tabCap", "#cite"].map((id) => document.querySelector(id)!.textContent!));
    check(dated.every((t) => t.includes(localDate)) && (utcDate === localDate || dated.every((t) => !t.includes(utcDate))),
      `every run date on the page is the reader's-zone date of ${summary.generated}${utcDate === localDate ? " (the same day in UTC on this run)" : `, not the UTC date ${utcDate}`} (rerun S2)`, { localDate, utcDate, tz: TZ });
    /* The page's own words carry no developer vocabulary (N7): core's notes and the machine columns are the exceptions and are excluded here. */
    const ownText = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      for (const el of clone.querySelectorAll(".hg-cite, #csvColumns, option")) el.remove();
      return clone.textContent!;
    });
    check(!/\bsweep\b|\bendpoint\b|policyengine-us #|PR #|nj_property_tax_relief|PolicyEngine variable/i.test(ownText), "no sweep, endpoint, issue number or variable name in the page's own words (N7)");
    /* NO TEMPLATE SLOT REACHES THE PAGE. `t()` throws on an unfilled argument,
       which is the guard — but a message rendered as a bare string bypasses it,
       and one did: the method's definition of the road printed "at {year}
       rules" between the two dollar figures a reporter would quote, and a cold
       reader found it (2026-09-18, S2). This check does not care how a string
       reached the page, only that no `{slot}` survived the trip. */
    const slots = await page.evaluate(() => {
      const out: string[] = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const m = n.textContent?.match(/\{[a-zA-Z][a-zA-Z0-9]*\}/g);
        if (m) out.push(`${m.join(" ")} in "${n.textContent!.trim().slice(0, 70)}"`);
      }
      return out;
    });
    check(slots.length === 0, "no message reached the page with a {slot} left unfilled", slots);
    const variableTitle = await page.evaluate(() => { (document.querySelector('.tile[data-st="NJ"]') as HTMLElement).click(); return [...document.querySelectorAll("#other .hg-cite")].map((el) => (el as HTMLElement).title); });
    check(variableTitle.length === coverage.NJ.otherBenefits.length && variableTitle.every((t, i) => t === `PolicyEngine variable: ${coverage.NJ.otherBenefits[i].variable}`), "the other-benefit variable lives in the cite's title, not in the prose (N7)", variableTitle);
    check((await page.$eval("#tableNote", (el) => el.textContent!)).includes("the arrow keys move between states and Enter selects"), "the keyboard note says Enter selects (N10)");
    /* THE METHOD AND THE MEASURE AGREE ABOUT WHAT DEFERRED COUNTS. core's
       `deferred` are the SAME Cliff objects as `analysis.cliffs`
       (evaluate.ts), so a deferred cliff is INSIDE cliffCount — deferral is a
       label, not an exclusion (owner, 2026-09-17). The measure's definition
       said so; the method still said they were "lifted out of every other
       figure here", and a cold reader who believed the method would have
       written that Ohio has eleven cliffs rather than ten (2026-09-18, B5). */
    const deferredItem = (await page.$$eval("#methodList li", (els) => els.map((el) => el.textContent!))).find((t) => /deferred to a future renewal/.test(t));
    check(deferredItem !== undefined && /counted in every figure here like any other cliff/.test(deferredItem) && !/lifted out/.test(deferredItem)
      && /of the cliffs counted/i.test(await page.$eval("#def-colDeferredCliffCount", (el) => el.textContent!)),
      "the method says a deferred cliff is counted like any other and named again in its own column, which is what the measure's own definition says and what core does (B5)",
      deferredItem?.slice(0, 130));

    /* Nebraska's case (S9): an exact leap beside an unknown safe exit, and the past-the-axis cell points at the box that explains it. */
    const single = (st: string) => metrics(st, "single-2");
    const split = STATES.filter((st) => single(st).cliffCount > 0 && single(st).safeExit === null && !single(st).leapIsLowerBound && !expectIncompleteFor(st, "single-2"));
    const splitCells = await page.evaluate(([sts, c]) => (sts as string[]).map((st) => {
      const tr = document.querySelector(`#tbody .hg-row-btn[data-st="${st}"]`)!.closest("tr")!;
      const cols = c as Record<string, number>;
      return { st, leap: tr.children[cols.leap].textContent!.trim(), exit: (tr.children[cols.safeExit] as HTMLElement).innerText.trim().split("\n")[0].trim(), describedBy: tr.children[cols.safeExit].querySelector("[aria-describedby]")?.getAttribute("aria-describedby") };
    }), [split, COL] as const);
    const note = await page.$eval("#pastAxisNote", (el) => el.textContent!);
    check(split.length > 0 && splitCells.every((c) => c.leap === money(single(c.st).leap) && c.exit === `beyond ${money(single(c.st).axisTop)}` && c.describedBy === "pastAxisNote") && /last danger zone/.test(note) && /only when the worst zone/.test(note),
      "a state whose last zone runs off the axis prints an exact leap and a safe exit that points at the box saying why (S9)", { split, splitCells, note: note.slice(0, 120) });
    await page.selectOption("#arch", "married-dual-2");
    await page.selectOption("#metric", "safeExit");
    await page.selectOption("#sort", "safeExit");

    /* The deferred count is a label, not a harm scale (R6): it left the menu and stays a column, whose definition
       names the three mechanisms (S4). A level is money the family has, so its map is on the keep ramp (R14). */
    const dualComparable = STATES.filter((st) => dual(st).cliffCount > 0 && !expectIncompleteFor(st, "married-dual-2"));
    check(/Head Start.*Medicaid or CHIP.*Transitional Medical Assistance/.test(await page.$eval("#def-colDeferredCliffCount", (el) => el.textContent!)),
      "the deferred column's definition names the three mechanisms (S4)");
    await page.selectOption("#metric", "netAtRoadLo");
    const levelScale = await page.evaluate(() => {
      const probe = document.createElement("span"); document.body.append(probe);
      const keep = Array.from({ length: 5 }, (_, i) => { probe.style.background = `var(--keep-${i + 1})`; return getComputedStyle(probe).backgroundColor; });
      probe.remove();
      return { keep, swatches: [...document.querySelectorAll(".scale .sw")].map((el) => getComputedStyle(el).backgroundColor), cue: document.querySelector("#scaleCue")!.textContent };
    });
    check(levelScale.swatches.join() === levelScale.keep.join() && levelScale.cue === "darker = keeps more",
      "a level's scale is the keep ramp, lightest to darkest as the family keeps more, and says so at the scale (R14)", levelScale);
    await page.selectOption("#metric", "safeExit");

    /* CSV: the rendered table's rows, in order, with provenance equal to the file's. */
    await page.selectOption("#sort", "state");
    /* The first line of each cell is its figure; a second line, where there is
       one, is the position under it (Plan 9) or the Figures cell's footing. */
    const rendered = await page.$$eval("#tbody tr:not(.group)", (trs) => trs.map((tr) => [...tr.children].map((td) => (td as HTMLElement).innerText.replace(/\u00a0/g, " ").trim().split("\n").map((l) => l.trim()))));
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#csvBtn")]);
    const csv = readFileSync((await download.path())!, "utf8").replace(/^﻿/, "");
    const rows = parseCsv(csv);
    const head = rows[0], body = rows.slice(1);
    const col = (n: string) => head.indexOf(n);
    const num = (s: string) => (s === "none" || /^beyond /.test(s) ? "" : s.replace(/\s*\(floor\)$/, "").replace(/[^\d]/g, ""));
    /* A position in a cell is "N in 100"; in the file it is a number to one
       decimal. They agree when the cell is the file's figure, rounded. */
    const shareOf = (cell: string[] | undefined) => (cell?.find((l) => / in 100$/.test(l)) ?? "").replace(/ in 100$/, "");
    /* The cell rounds the full-precision share; the file keeps one decimal of
       it. Rounding the file's figure a second time is not the same operation
       (7.45 rounds to 7 in the cell and to 7.5, then 8, from the file), so they
       agree when they are within half a point — which is what "the same number,
       shown to two precisions" means. */
    const agrees = (cell: string[] | undefined, csvValue: string) =>
      (csvValue === "" ? shareOf(cell) === "" : shareOf(cell) !== "" && Math.abs(Number(csvValue) - Number(shareOf(cell))) <= 0.5 + 1e-9);
    let same = body.length === rendered.length;
    for (let i = 0; same && i < body.length; i++) {
      const r = rendered[i], c = body[i];
      /* A stacked cell (render.ts STACKED): its figures by line, or by the words that name them. */
      const cents = (v: string) => (v === "" ? "none" : `${Number(v) < 0 ? "loses" : "keeps"} ${Math.abs(Number(v))}¢`);
      const count = (word: string) => r[COL.counts][0].match(new RegExp(`(\\d+)(?: \\(floor\\))? ${word}`))?.[1] ?? "";
      const [lo, hi] = r[COL.netAtRoad][0].split(" → ");
      const step = (line: string | undefined, name: string, at: string) => (at === "" ? line === undefined || / in 100$/.test(line) : line!.startsWith(`${name}: ${money(Number(at))} → `));
      same = c[col("state")] === r[0][0].replace(/floor$/, "").trim() && num(r[COL.biggestLoss][0]) === c[col("biggest_one_step_loss")] && num(r[COL.dangerWidth][0]) === c[col("danger_zone_width")]
        && step(r[COL.biggestLoss][1], "Worst step", c[col("biggest_loss_at")])
        && num(r[COL.leap][0]) === c[col("leap")] && num(r[COL.safeExit][0]) === c[col("safe_exit")] && count("anywhere") === c[col("cliff_count")] && count("later") === c[col("deferred_cliff_count")]
        && r[COL.figures][0].startsWith(c[col("figures")]) && (c[col("childcare_subsidy_footing")] === "added by HotGap") === r[COL.figures].join(" ").includes("child-care subsidy added by HotGap")
        /* The Figures cell also carries the child-care PRICE's footing where it is not the state's own county's (cold read B3). */
        && r[COL.figures].join(" ").includes("child-care price:") === !c[col("childcare_price_vintage")].startsWith("county")
        /* The road's figures and the three positions round-trip too: the keep rate with its two readings under it, the counts, the money-kept pair, named. */
        && (c[col("keep_rate_cents")] === "" ? r[COL.keepRate][0] === "road runs off the axis" : r[COL.keepRate][0] === cents(c[col("keep_rate_cents")]))
        && r[COL.keepRate][1] === `to the line: ${cents(c[col("keep_rate_to_line_cents")])}` && r[COL.keepRate][2] === `to 220%: ${cents(c[col("keep_rate_wide_cents")])}`
        && (c[col("keep_rate_cents")] === "" ? !/on the road/.test(r[COL.counts][0]) : count("on the road") === c[col("road_cliff_count")])
        && num(r[COL.roadWorst][0]) === c[col("road_worst_drop")]
        && lo.startsWith("Money kept at the poverty line: ") && hi.startsWith("Money kept at twice poverty: ")
        && num(lo) === c[col("net_at_road_lo")] && num(hi) === c[col("net_at_road_hi")]
        && num(r[COL.deepestFall][0]) === c[col("deepest_fall")]
        && step(r[COL.roadWorst][1], "Road's worst step", c[col("road_worst_at")])
        && agrees(r[COL.roadWorst], c[col("road_worst_position")]) && agrees(r[COL.biggestLoss], c[col("biggest_loss_position")]) && agrees(r[COL.safeExit], c[col("safe_exit_position")]);
      if (!same) console.log("     mismatch at row", i, r, c);
    }
    check(same, `the CSV's ${body.length} rows equal the rendered table's ${rendered.length} rows, cell for cell, the road's columns and the three positions included`, download.suggestedFilename());
    /* The road's columns and the positions are APPENDED: not one index of the
       header a reporter's script already holds has moved (Plan 9). */
    check(head.slice(0, 32).join() === "state,state_name,archetype_id,archetype,biggest_one_step_loss,biggest_loss_at,biggest_loss_programs,danger_zone_width,leap,safe_exit,cliff_count,deferred_cliff_count,leap_is_lower_bound,no_cliff_found,comparable,figures,unmodeled_programs,corrections_applied,childcare_subsidy_footing,liheap_limit,liheap_served_share,county_name,county_fips,rent_vintage,county_vintage,childcare_price_vintage,policy_year,sweep_generated,model_label,model_endpoint,model_version,source"
      && head.slice(32).join() === "keep_rate_cents,road_lo,road_hi,road_cliff_count,road_worst_drop,road_worst_at,road_worst_programs,road_worst_position,biggest_loss_position,safe_exit_position,families_below_road_top,keep_rate_to_line_cents,net_at_road_lo,net_at_road_hi,keep_rate_wide_cents,road_wide_hi,deepest_fall",
      "the CSV's seventeen new columns are appended, every column that existed before Plan 9 still at its own index", head.length);
    const roadCols = body.every((c) => {
      const m = dual(c[col("state")]);
      return c[col("keep_rate_cents")] === (m.keepRate === null ? "" : String(Math.round(m.keepRate * 100)))
        && c[col("road_lo")] === String(m.roadLo ?? "") && c[col("road_hi")] === String(m.roadHi ?? "")
        && c[col("road_cliff_count")] === String(m.roadCliffCount)
        && c[col("road_worst_drop")] === (m.roadWorst ? String(m.roadWorst.drop) : "")
        && c[col("road_worst_at")] === (m.roadWorst ? String(m.roadWorst.at) : "")
        && c[col("road_worst_programs")] === (m.roadWorst ? m.roadWorst.programs.map(programName).join("; ") : "")
        && c[col("biggest_loss_position")] === (m.biggestLossPosition === null ? "" : String(Math.round(m.biggestLossPosition * 10) / 10));
    });
    const anyPosition = body.filter((c) => c[col("families_below_road_top")] !== "");
    check(roadCols && anyPosition.length > 40 && anyPosition.every((c) => Number(c[col("families_below_road_top")]) > 0 && Number(c[col("families_below_road_top")]) <= 100),
      "every CSV row's road columns equal the file's, and its positions are inside 0–100 — empty, never 0, where the survey cannot support the cell", { withRoadTop: anyPosition.length, sample: anyPosition[0]?.[col("families_below_road_top")] });
    check(/^hotgap-2-adults-both-working-2-children-3-and-7-\d{4}-\d\d-\d\d\.csv$/.test(download.suggestedFilename()), "the CSV is named by the household as the reader knows it (N7)", download.suggestedFilename());
    /* ONE INSTANT, ONE DAY, THE READER'S. The filename took the UTC date and
       the page prints the reader's, so a run stamped 01:29 UTC handed a
       reporter a file dated the 17th under a line saying "run of Sep 16" —
       and a cold reader did not know which to put in a footnote (2026-09-18,
       N2). This is the same check the page's own dates get, applied to the
       one date a reader takes away with them. */
    const fileDay = download.suggestedFilename().match(/(\d{4}-\d\d-\d\d)\.csv$/)![1];
    check(dayWords(fileDay) === dateWords(summary.generated),
      "the CSV's filename carries the same calendar day the page prints, in the reader's zone (N2)",
      { fileDay, fileDayInWords: dayWords(fileDay), page: dateWords(summary.generated), utc: summary.generated });
    check(head.slice(0, 7).join() === "state,state_name,archetype_id,archetype,biggest_one_step_loss,biggest_loss_at,biggest_loss_programs" && (await page.$eval("#csvColumns", (el) => el.textContent!)).includes(head.join(", ")),
      "the CSV's header order is the one the sources panel's download line prints", head.length);
    const prov = body.every((c) => c[col("sweep_generated")] === summary.generated && c[col("model_endpoint")] === summary.model!.endpoint
      && c[col("model_version")] === summary.model!.version && c[col("policy_year")] === summary.year
      && c[col("childcare_price_vintage")] === coverage[c[col("state")]].vintages.childcare.preschool
      && c[col("county_name")] === (coverage[c[col("state")]].vintages.county.name ?? "")
      && c[col("county_fips")] === coverage[c[col("state")]].vintages.county.fips
      && c[col("model_label")] === `HotGap hosted engine, policyengine-us ${summary.model!.version}`
      && c[col("source")] === "HotGap/PolicyEngine"
      && c[col("rent_vintage")] === coverage[c[col("state")]].vintages.rent.vintage);
    check(prov && !head.includes("reach_vintages"), "every CSV row's provenance columns equal summary.json's generated, model, county and vintages; the model has a label; reach is gone (B4, N8, N9)");
    const dcRow = body.find((c) => c[col("state")] === "DC");
    check(dcRow !== undefined && dcRow.length === head.length && dcRow[col("state_name")] === STATE_NAMES.DC && dcRow[col("source")] === "HotGap/PolicyEngine", "the DC row reads whole through an independent RFC 4180 parser, its source the one constant (N8)", { name: dcRow?.[col("state_name")], source: dcRow?.[col("source")] });
    const stepCols = body.every((c) => { const m = dual(c[col("state")]); return c[col("biggest_loss_at")] === (m.cliffCount === 0 ? "" : String(m.biggestLossAt)) && c[col("biggest_loss_programs")] === m.biggestLossPrograms.map(programName).join("; "); });
    check(stepCols, "every CSV row carries the worst step's earnings and programs from the file (B3)");
    /* The child-care subsidy's footing on every row and in the Figures cell where HotGap added it (rerun S4): Ohio and Texas read on their footing without a click. */
    const footing = (st: string) => (coverage[st].corrections.childcareSubsidy.source === "added by HotGap" ? "added by HotGap" : "in PolicyEngine's net income");
    const footingCol = body.every((c) => c[col("childcare_subsidy_footing")] === footing(c[col("state")]));
    const figuresCells = await page.evaluate(() => Object.fromEntries(["OH", "TX"].map((st) => [st, document.querySelector(`#tbody .hg-row-btn[data-st="${st}"]`)!.closest("tr")!.lastElementChild!.textContent!])));
    check(footingCol && head.includes("childcare_subsidy_footing") && footing("OH") !== footing("TX")
      && (figuresCells.TX.endsWith("child-care subsidy added by HotGap")) === (footing("TX") === "added by HotGap") && (figuresCells.OH.endsWith("child-care subsidy added by HotGap")) === (footing("OH") === "added by HotGap"),
      "every CSV row carries childcare_subsidy_footing from the coverage record, and the Figures cell says so where HotGap added it (rerun S4)", { OH: [footing("OH"), figuresCells.OH], TX: [footing("TX"), figuresCells.TX] });
    /* The boundary's CSV pair (#23): Ohio's two cells equal its block on the page and in the file; Hawaii's share is empty, never a number; every row is its block's. */
    const ohCsv = body.find((c) => c[col("state")] === "OH")!, hiCsv = body.find((c) => c[col("state")] === "HI")!;
    const ohBoundary = await boundaryOf("OH");
    const liheapCols = body.every((c) => c[col("liheap_limit")] === liheapOf(c[col("state")]).limitKind && c[col("liheap_served_share")] === String(liheapOf(c[col("state")]).servedShare ?? ""));
    check(liheapCols && ohCsv[col("liheap_limit")] === liheapOf("OH").limitKind && Number(ohCsv[col("liheap_served_share")]) === liheapOf("OH").servedShare
      && ohBoundary.facts.startsWith(`Stops at ${ohCsv[col("liheap_limit")]}, `) && ohBoundary.facts.endsWith(` (${Math.round(Number(ohCsv[col("liheap_served_share")]) * 100)}%).`)
      && hiCsv[col("liheap_served_share")] === "" && head.indexOf("liheap_limit") === head.indexOf("childcare_subsidy_footing") + 1,
      "the CSV's liheap_limit and liheap_served_share equal Ohio's block on the page and in the file, sit with the footing columns, and Hawaii's share is empty (#23)", { OH: [ohCsv[col("liheap_limit")], ohCsv[col("liheap_served_share")]], HI: hiCsv[col("liheap_served_share")], facts: ohBoundary.facts });

    /* The incomplete rows carry their caveat in their own cells (S5), one bar means selection (S7), and the flag is on screen at any width (S10). */
    const incompleteRows = STATES.filter((st) => expectIncompleteFor(st, "married-dual-2"));
    const cells = await page.evaluate((sts) => sts.map((st) => {
      const tr = document.querySelector(`#tbody .hg-row-btn[data-st="${st}"]`)!.closest("tr")!;
      const scroller = document.querySelector("#scroller")!;
      const mark = tr.querySelector(".flag-mark");
      return { st, cells: [...tr.children].slice(1).map((td) => (td as HTMLElement).innerText.trim().split("\n")[0].trim()), bar: getComputedStyle(tr.firstElementChild!).boxShadow,
        selected: tr.querySelector("[aria-current='true']") !== null, ink: getComputedStyle(document.body).color,
        mark: mark && { text: mark.textContent, visible: getComputedStyle(mark).display !== "none", right: mark.getBoundingClientRect().right, edge: scroller.getBoundingClientRect().right, scrollLeft: scroller.scrollLeft } };
    }), incompleteRows);
    const programsOf = (st: string) => coverage[st].unmodeled.filter((u) => u.scope !== "all").map((u) => u.program).join(" and ");
    /* `cells` drops the state cell, so its indices are one less than COL's,
       and reads each cell's first line: the dollar figures that carry a floor
       are the road's drop, its deepest fall and the four whole-axis ones; the
       keep rate carries one too, and the two steps under their losses print
       an earnings figure, which a floor does not qualify. */
    const floored = [COL.roadWorst, COL.deepestFall, COL.biggestLoss, COL.dangerWidth, COL.leap, COL.safeExit].map((i) => i - 1);
    /* The counts share a cell, and each carries its own floor: "4 (floor) on the road · 8 (floor) anywhere · 1 (floor) later". */
    check(cells.every((c) => floored.every((i) => c.cells[i] === "none" || /\(floor\)$/.test(c.cells[i]) || /^beyond /.test(c.cells[i]))
      && c.cells[COL.counts - 1].split(" · ").every((p) => /^\d+ \(floor\) /.test(p)) && c.cells[COL.figures - 1].startsWith(`floor: ${programsOf(c.st)} not modelled`)),
      "an incomplete row's cells carry the floor caveat and the Figures cell names the program (S5)", cells.map((c) => c.cells[COL.figures - 1]));
    /* A left bar is a positive inset x-offset (the sticky column's right-edge rule is a negative one); the only one allowed is the selection's, in ink, on the selected row. */
    const leftBar = (shadow: string) => shadow.split("),").map((part) => part.match(/^\s*(rgba?\([^)]*\)) (-?\d+)px -?\d+px -?\d+px -?\d+px inset/)).filter((m): m is RegExpMatchArray => !!m && Number(m[2]) > 0).map((m) => m[1]);
    check(cells.every((c) => leftBar(c.bar).every((colour) => c.selected && colour === c.ink)), "an incomplete row carries no grey left bar; the only left bar is the selected row's, in ink (S7)", cells.map((c) => [c.st, c.selected, c.bar]));
    /* The edge fade is measured since 2026-09-24 (lib/scroll.ts): at the scroller's left edge only the END
       has more, so only that side carries the attribute tokens.css draws the shadow from. And "swipe" is a
       touch word: a fine pointer is told to scroll. */
    const scrollerState = await page.$eval("#scroller", (el) => ({ over: el.scrollWidth > el.clientWidth, more: (el as HTMLElement).dataset.more ?? null, start: el.hasAttribute("data-overflow-start"), end: el.hasAttribute("data-overflow-end"), overflow: getComputedStyle(el).overflowX }));
    const moreWords = (await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)) ? "Scroll for more →" : "Swipe for more →";
    if (width === 390) {
      check(cells.every((c) => c.mark && c.mark.visible && c.mark.text === "floor" && c.mark.scrollLeft === 0 && c.mark.right <= c.mark.edge), "at 390 the incomplete rows' amber mark sits in the state cell, on screen without a swipe (S10)", cells.map((c) => c.mark));
      check(scrollerState.over && scrollerState.end && !scrollerState.start && scrollerState.more === moreWords, "at 390 the table overflows its scroller, the system's edge fade is drawn on the side with more and the page's words for the gesture are set (S10)", scrollerState);
      const hint = await page.$eval("#scroller", (el) => { const cs = getComputedStyle(el, "::before"); return { content: cs.content, before: getComputedStyle(el, "::after").content, top: el.getBoundingClientRect().top, table: el.querySelector("table")!.getBoundingClientRect().top }; });
      check(hint.content === `"${moreWords}"` && hint.before === "none" && hint.table > hint.top, "at 390 the swipe words are drawn at the top of the scroller, above the table, not after fifty rows (rerun N6)", hint);
      const stickyState = await page.$eval("#tbody th", (el) => ({ position: getComputedStyle(el).position, left: getComputedStyle(el).left }));
      check(stickyState.position === "sticky" && stickyState.left === "0px", "at 390 the state column is sticky (S10)", stickyState);
    } else {
      check(!scrollerState.over && scrollerState.more === null && !scrollerState.start && !scrollerState.end && scrollerState.overflow === "visible", "at 1280 the table fits: no swipe words and no edge fade (S10; TASKS 2026-09-24)", scrollerState);
    }
    /* "Ranked" was the whole label, and a cold reader could not tell whether
       rank 1 was the best state or the worst (places keep-rate read, S4). */
    await page.selectOption("#metric", "keepRate");
    const rankHeadings = await page.evaluate(() => document.querySelector("#rankTitle")!.textContent!);
    await page.selectOption("#metric", "biggestLoss");
    const rankHeading2 = await page.evaluate(() => document.querySelector("#rankTitle")!.textContent!);
    check(rankHeadings === "Ranked: Cents kept of each extra dollar, worst first" && rankHeading2 === "Ranked: Biggest one-raise loss (any pay), largest first",
      "the ranked strip says which measure it ranks and which way, in the order control's own words (S4)", [rankHeadings, rankHeading2]);
    await page.selectOption("#metric", "safeExit");

    /* The order control names every measure (N2) and the strip counts its rows (N3). */
    const sortOptions = await page.$$eval("#sort option", (els) => els.map((el) => [(el as HTMLOptionElement).value, el.textContent!]));
    await page.selectOption("#sort", "dangerWidth");
    const byWidth = await page.$$eval("#tbody tr:not(.group) .hg-row-btn", (els) => els.map((el) => (el as HTMLElement).dataset.st!));
    const rankedByWidth = byWidth.filter((st) => dualComparable.includes(st));
    const nonIncreasing = rankedByWidth.every((st, i) => i === 0 || dual(rankedByWidth[i - 1]).dangerWidth >= dual(st).dangerWidth);
    const sortGroups = await page.$$eval("#sort optgroup", (els) => els.map((g) => (g as HTMLOptGroupElement).label));
    check(sortOptions.length === 10 && sortOptions[0][0] === "state" && sortOptions[7][1] === "Pay spent below an earlier peak, largest first"
      && sortOptions[4][1] === "Money kept at the poverty line, smallest first"
      && sortOptions[1][1] === "Cents kept of each extra dollar, worst first" && sortGroups.join("|") === "From the poverty line to twice it|At any pay"
      && nonIncreasing && rankedByWidth.length === dualComparable.length && (await page.$eval("#tabCap", (el) => el.textContent!)).includes("by pay spent below an earlier peak, largest first"),
      "the table order control offers every menu measure in the menu's two groups, in each one's own name, and sorts the table by it without changing the map (N2, Plan 9, R9)", { options: sortOptions.map(([v]) => v), first: byWidth.slice(0, 3) });
    await page.selectOption("#sort", "state");
    await page.selectOption("#metric", "biggestLoss");
    const ranked = dualComparable.filter((st) => dual(st).biggestLoss > 0).sort((a, b) => dual(b).biggestLoss - dual(a).biggestLoss);
    const ordinals = await page.$$eval("#rank .hg-row-btn", (els) => els.map((el) => [el.querySelector(".n")!.textContent!, (el as HTMLElement).dataset.st!]));
    /* Competition ranking: a state's rank is one more than the number of states with a larger value, so ties share a rank. */
    const rankOf = (st: string) => `${1 + ranked.filter((o) => dual(o).biggestLoss > dual(st).biggestLoss).length}.`;
    check(ordinals.length === ranked.length && ordinals.every(([n, st], i) => n === rankOf(st) && dual(st).biggestLoss === dual(ranked[i]).biggestLoss), "the ranked strip prints each state's rank, ties sharing one (N3)", ordinals.slice(28, 31));
    /* The leap's lower-bound rows lead the strip under their heading (B1). */
    await page.selectOption("#metric", "leap");
    const leapLower = dualComparable.filter((st) => dual(st).leapIsLowerBound);
    const strip = await page.evaluate(() => ({
      lower: [...document.querySelectorAll("#rankLower .hg-row-btn")].map((el) => [(el as HTMLElement).dataset.st!, el.querySelector(".v")!.textContent!]),
      title: document.querySelector("#lowerTitle")!.textContent, hidden: (document.querySelector("#lowerGroup") as HTMLElement).hidden,
      before: document.querySelector("#lowerGroup")!.compareDocumentPosition(document.querySelector("#rank")!) & Node.DOCUMENT_POSITION_FOLLOWING,
      first: (document.querySelector("#rank .hg-row-btn") as HTMLElement | null)?.dataset.st,
    }));
    check(strip.lower.map(([st]) => st).sort().join() === leapLower.sort().join() && strip.lower.every(([st, v]) => v === `≥ ${money(dual(st).leap)}`) && strip.title === `Ranks 1–${leapLower.length} shared — at least this much; the exact size runs past the axis (${leapLower.length})` && !strip.hidden && strip.before > 0,
      "for the leap, the lower-bound states lead the strip under their own heading with a ≥ figure, before the largest exact leap (B1)", strip);
    /* The past-the-axis mark is a dashed square, the tile's own, not a dashed circle (rerun N2). */
    const pastMark = await page.$eval("#rankLower .past", (el) => ({ radius: getComputedStyle(el).borderRadius, outline: getComputedStyle(el).outlineStyle }));
    check(pastMark.radius === "0px" && pastMark.outline === "dashed", "the past-the-axis mark in the strip is a dashed square (rerun N2)", pastMark);
    await page.selectOption("#metric", "safeExit");
    /* The reviewer's case (rerun B1): 1 adult, 3 children on the leap — the lower-bound group shares ranks 1–n, its largest floor first, the largest measured leap takes rank n+1, and the note names both. */
    const rankCase = async (archId: string, key: "leap" | "safeExit") => {
      await page.selectOption("#arch", archId);
      await page.selectOption("#metric", key);
      const m = (st: string) => metrics(st, archId);
      const comp = STATES.filter((st) => m(st).cliffCount > 0 && !expectIncompleteFor(st, archId));
      const lower = comp.filter((st) => (key === "leap" ? m(st).leapIsLowerBound : m(st).safeExit === null || m(st).leapIsLowerBound));
      const measured = comp.filter((st) => !lower.includes(st)).sort((a, b) => m(b)[key]! - m(a)[key]!);
      const got = await page.evaluate(() => ({
        lower: [...document.querySelectorAll("#rankLower .hg-row-btn")].map((el) => [(el as HTMLElement).dataset.st!, el.querySelector(".n")!.textContent!, el.querySelector(".v")!.textContent!]),
        first: (() => { const el = document.querySelector("#rank .hg-row-btn") as HTMLElement; return [el.dataset.st!, el.querySelector(".n")!.textContent!, el.querySelector(".v")!.textContent!]; })(),
        title: document.querySelector("#lowerTitle")!.textContent!, note: document.querySelector("#lowerNote")!.textContent!,
      }));
      return { m, lower, measured, got };
    };
    const c3 = await rankCase("single-3", "leap");
    const topFloor = c3.lower.slice().sort((a, b) => c3.m(b).leap - c3.m(a).leap)[0];
    check(c3.lower.length > 1 && c3.got.lower[0][0] === topFloor && c3.got.lower.every(([, n]) => n === `1–${c3.lower.length}`) && c3.got.first[0] === c3.measured[0] && c3.got.first[1] === `${c3.lower.length + 1}.`
      && c3.got.title.startsWith(`Ranks 1–${c3.lower.length} shared`)
      && c3.got.note.includes(`The largest measured leap is ${STATE_NAMES[c3.measured[0]]}'s ${money(c3.m(c3.measured[0]).leap)}; ${STATE_NAMES[topFloor]}'s is ${c3.m(topFloor).leap >= c3.m(c3.measured[0]).leap ? "at least as large" : `at least ${money(c3.m(topFloor).leap)} and may be larger`}.`),
      `1 adult, 3 children on the leap: the ${c3.lower.length} lower-bound states share ranks 1–${c3.lower.length}, ${topFloor}'s floor first, ${c3.measured[0]} takes rank ${c3.lower.length + 1}, and the note says which is at least as large (rerun B1)`,
      { first: c3.got.lower[0], next: c3.got.first, note: c3.got.note });
    const c2 = await rankCase("single-2", "safeExit");
    check(c2.lower.length > 0 && c2.got.lower.every(([, n]) => n === (c2.lower.length === 1 ? "1." : `1–${c2.lower.length}`)) && c2.got.lower.every(([st, , v]) => v === `beyond ${money(c2.m(st).axisTop)}`)
      && c2.got.first[0] === c2.measured[0] && c2.got.first[1] === `${c2.lower.length + 1}.` && c2.got.note.includes(`The highest measured safe exit is ${STATE_NAMES[c2.measured[0]]}'s ${money(c2.m(c2.measured[0]).safeExit!)}.`),
      `1 adult, 2 children on safe exit: the ${c2.lower.length} past-the-axis states share ranks 1–${c2.lower.length} and ${c2.measured[0]} takes rank ${c2.lower.length + 1}, the note naming it as the highest measured (rerun B1)`,
      { lower: c2.got.lower, next: c2.got.first, note: c2.got.note });
    await page.selectOption("#arch", "married-dual-2");
    await page.selectOption("#metric", "safeExit");

    /* Screenshots beside the audit's, at the audit's views. The first screen
       is what a reader meets, so it is taken shut. */
    await page.goto("/places.html", { waitUntil: "networkidle" });
    await page.waitForSelector(".tile");
    await page.screenshot({ path: `${OUT}/journalist-${width}-light-screen1.png` });
    await page.screenshot({ path: `${OUT}/journalist-${width}-light.png`, fullPage: true });
    await page.$eval(".picture", (el) => el.scrollIntoView());
    await page.locator(".picture").screenshot({ path: `${OUT}/journalist-${width}-light-map${width === 390 ? "-legend" : ""}.png` });
    await page.click(`.tile[data-st="${width === 390 ? "CO" : "TX"}"]`);
    await page.evaluate(OPEN_ALL);
    await page.locator("#statePanel").screenshot({ path: `${OUT}/journalist-${width}-light-${width === 390 ? "CO" : "TX"}.png` });
    await page.emulateMedia({ colorScheme: "dark" });
    await measureContrast("dark");
    await measureGrey("dark", "single-2");
    await page.screenshot({ path: `${OUT}/journalist-${width}-dark.png`, fullPage: true });
    await page.locator(".picture").screenshot({ path: `${OUT}/journalist-${width}-dark-map${width === 390 ? "-legend" : ""}.png` });
    if (width === 1280) {
      /* The table's header stays in view while its rows scroll by (S8). */
      await page.evaluate(OPEN_ALL);
      await page.waitForTimeout(200);
      await page.$eval("#tbody tr:nth-child(30)", (el) => el.scrollIntoView({ block: "center" }));
      const sticky = await page.$eval(".hg-table thead th", (el) => ({ position: getComputedStyle(el).position, top: el.getBoundingClientRect().top }));
      check(sticky.position === "sticky" && near(sticky.top, 0), "at 1280 the table header is stuck to the top of the viewport with row 30 in view", sticky);

      await page.emulateMedia({ colorScheme: "light" });
      await page.selectOption("#arch", "single-0");
      await page.selectOption("#metric", "safeExit");
      await page.locator(".picture").screenshot({ path: `${OUT}/journalist-1280-light-childless-safe-exit.png` });
      /* A measure that DOES bound states brings the caution out of the
         disclosure, in one line, because it is then true of the map on the
         screen (§ The page is its picture: nothing that warns hides). */
      await page.selectOption("#arch", "single-2");
      const bounded = STATES.filter((st) => metrics(st, "single-2").cliffCount > 0 && metrics(st, "single-2").safeExit === null && !expectIncompleteFor(st, "single-2"));
      const cautionThen = await page.evaluate(() => ({ hidden: (document.querySelector("#mapCaution") as HTMLElement).hidden !== false, text: document.querySelector("#mapCaution")!.textContent!.trim() }));
      check(bounded.length > 0 && !cautionThen.hidden && cautionThen.text === `Past the axis is not a number. ${bounded.length} states' figures run off the top of the earnings scale, so they are bounds and must not be charted as values.`,
        `on safe exit the ${bounded.length} bounded states bring the caution out of the disclosure, in one line`, cautionThen);
      await page.emulateMedia({ colorScheme: "dark", media: "print" });
      await page.screenshot({ path: `${OUT}/journalist-1280-print-from-dark.png`, fullPage: true });
      await page.emulateMedia({ media: null });
      await checkPdf(page);
    }
    check(errors.length === 0, "no console errors after the whole run", errors);
  });
}

/* The no-subsidy twin (R2, R16) and the links written before the counts left the menu (R5, R6). */
test("the Household menu offers the family with no child-care help beside its twin, and an old count link lands on the nearest measure", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors = consoleErrors(page);
  await page.goto("/places.html?household=single-2-nosub&measure=cliffCount&sort=roadCliffCount", { waitUntil: "networkidle" });
  await page.waitForSelector(".tile");
  const got = await page.evaluate(() => ({
    arch: [...document.querySelectorAll("#arch option")].map((o) => [(o as HTMLOptionElement).value, o.textContent!]),
    household: (document.querySelector("#arch") as HTMLSelectElement).value, metric: (document.querySelector("#metric") as HTMLSelectElement).value, sort: (document.querySelector("#sort") as HTMLSelectElement).value,
    url: location.search,
  }));
  const at = got.arch.findIndex(([v]) => v === "single-2");
  check(got.arch[at + 1]?.[0] === "single-2-nosub" && got.arch[at + 1]?.[1] === "1 adult, 2 children (3 and 7), no child-care help",
    "the Household menu lists the no-subsidy twin right after single-2, as the family with no child-care help (R16)", got.arch.slice(at, at + 2));
  check(got.household === "single-2-nosub" && got.metric === "biggestLoss" && got.sort === "roadWorst",
    "a link to a count that left the menu opens on the nearest measure it still has (R5, R6)", got);
  await page.selectOption("#metric", "keepRate");
  const answer = await page.evaluate(() => [...document.querySelector("#answer")!.childNodes].filter((n) => (n as Element).id !== "answerHolds").map((n) => n.textContent).join("").replace(/\s+/g, " ").trim());
  const bad = STATES.filter((st) => (metrics(st, "single-2-nosub").keepRate ?? 0) < 0).length;
  check(answer === `In ${bad} of the ${STATES.length - 1} states and the District of Columbia, a single parent of two children without child-care help climbs from the poverty line to twice it and ends up poorer than they started.`,
    "on the twin the headline says the family is without child-care help, counted from the file (R2)", answer);
  const method = await page.$$eval("#methodList li", (els) => els.map((el) => el.textContent!).find((t) => /derived from the same run/.test(t)));
  check(method !== undefined && /derived from the same run/.test(method) && /will be swept directly/.test(method),
    "the method says the twin is derived from the same run and will be swept directly (R2)", method?.slice(-200));
  check(errors.length === 0, "no console errors on the twin", errors);
});

/* The failed-fetch path: the masthead and one line, nothing of the page's skeleton (S6). */
test("on a failed fetch the page shows the masthead and one alert line, in the reader's words", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route("**/data/summary.json", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/places.html", { waitUntil: "networkidle" });
  const failed = await page.evaluate(() => ({
    alert: document.querySelector("#status[role=alert]")?.textContent, mainHidden: (document.querySelector("#main") as HTMLElement).hidden,
    wordmark: document.querySelector("#wordmark")!.textContent!, csv: document.querySelector("#csvBtn")!.textContent!,
    /* An alert never hides and never folds: it is above the picture, in the
       open (design/inventory.md § The page is its picture). */
    inDetails: document.querySelector("#status")!.closest("details") !== null,
  }));
  check(failed.mainHidden && !failed.inDetails && /^We could not load the weekly run: the data file answered HTTP 404\. Reload to try again\.$/.test(failed.alert ?? "")
    && failed.wordmark === "HotGap" && failed.csv === "Download the numbers (CSV)",
    "on a failed fetch the page shows the masthead and one alert line, in the open, in the reader's words", failed);
  await page.screenshot({ path: `${OUT}/journalist-1280-light-error.png`, fullPage: true });
});

/**
 * Print from OS dark to Letter and read the PDF's own drawing ops (B1): a
 * hatched tile must be drawn as a form whose stripes are an --ink-3 fill
 * through a striped soft mask, on the light sunk ground, and the NM
 * (no-cliff) tile must carry no such form. Positions come from the print
 * layout, so the check finds the tile, not a tile.
 *
 * The subject is the first state the data hatches for the archetype shown.
 * When the sweep hatches none — the case since 2026-09-16, when NJ and WA
 * became complete — the hatch classes are put on the WA tile for the print
 * alone, and every check says so: the print path is what B1 is about, and
 * a proof with no subject would otherwise pass by saying nothing.
 */
async function checkPdf(page: Page): Promise<void> {
  await page.goto("/places.html", { waitUntil: "networkidle" });
  await page.waitForSelector(".tile");
  const shownArch = await page.$eval("#arch", (el) => (el as HTMLSelectElement).value);
  const fromData = STATES.find((st) => expectIncompleteFor(st, shownArch));
  const subject = fromData ?? "WA";
  if (!fromData) await page.$eval(`.tile[data-st="${subject}"]`, (el) => el.classList.add("hg-tile--incomplete", "hg-hatch-incomplete"));
  const label = fromData ? `the ${subject} tile (hatched by the data)` : `the ${subject} tile (hatched for the print only: no state is incomplete on this sweep)`;
  /* OS dark with no data-theme attribute: the path the audit's B2 proof did
     not take (it printed through the theme button), and the one on which
     tokens.css's print rule lost to its own OS-dark rule until 30d7e99. */
  await page.emulateMedia({ colorScheme: "dark" });
  const hasTheme = await page.evaluate(() => document.documentElement.hasAttribute("data-theme"));
  const darkInk = await page.$eval("body", (el) => getComputedStyle(el).color);
  /* PAPER OPENS EVERYTHING. A closed <details> prints nothing and on paper
     there is nobody to press anything, so the printed page is the whole page
     in the screen's order. Proved on the handler itself rather than on the
     print that follows it, so a PDF that came out whole cannot be the result
     of something else keeping the disclosures open. */
  const beforePrint = await page.evaluate(() => {
    const all = () => [...document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")];
    const shut = all().filter((d) => !d.open).length;
    dispatchEvent(new Event("beforeprint"));
    const open = all().filter((d) => d.open).length;
    return { shut, open, total: all().length };
  });
  check(beforePrint.shut > 0 && beforePrint.open === beforePrint.total, "beforeprint opens every disclosure, so paper carries what the screen folded away", beforePrint);
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  writeFileSync(`${OUT}/journalist-letter-from-dark.pdf`, pdf);
  /* The print layout at Letter's width, which is where the PDF's positions
     come from — as long as nothing overflows it: Chromium shrinks the whole
     page to fit an overflowing table, and every position with it. */
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 816, height: 1056 });
  const want = await page.evaluate((subject) => {
    const at = (st: string) => { const r = document.querySelector(`.tile[data-st="${st}"]`)!.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; };
    const hatched = document.querySelector(`.tile[data-st="${subject}"].hg-hatch-incomplete`)!;
    return { WA: at(subject), NM: at("NM"), stripe: getComputedStyle(hatched, "::after").backgroundColor, ground: getComputedStyle(hatched).backgroundColor,
      scrollWidth: document.documentElement.scrollWidth };
  }, subject);
  check(want.scrollWidth <= 816, "the print layout fits Letter's width, so the PDF is not shrunk to fit", want.scrollWidth);
  /* The picture is the page on paper too: the sentence, all 51 tiles and the
     strip that reads them land on the first page at Letter (0.4in margins:
     about 980px of content). */
  const onPaper = await page.evaluate(() => {
    const box = (sel: string) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; };
    return { answer: box("#answer"), map: box("#grid"), legend: box(".legend"), controls: getComputedStyle(document.querySelector(".controls")!).display };
  });
  check(onPaper.answer.top < onPaper.map.top && onPaper.legend.bottom <= 980 && onPaper.controls === "none",
    "on paper the sentence, the whole map and its key are on page 1, and the two controls are gone as screen chrome", onPaper);
  const lightInk = await page.$eval("body", (el) => getComputedStyle(el).color);
  const objects = pdfObjects(pdf);
  const pages = pdfPages(objects);
  const p1 = pages[0];
  const inks = textInks(pageContent(objects, p1));
  check(!hasTheme && lightInk !== darkInk && inks.includes(rgb(lightInk).join()) && !inks.includes(rgb(darkInk).join()),
    "printed from OS dark with no data-theme, page 1's text is in the light-scheme ink and none is in the dark-scheme ink", { inks, lightInk, darkInk, hasTheme });
  const forms = formsDrawn(pageContent(objects, p1), pageHeight(p1));
  const atTile = (t: { x: number; y: number }) => forms.filter((f) => near(f.x, t.x) && near(f.y, t.y));
  const [wa] = atTile(want.WA);
  const inner = wa ? reachable(objects, resource(objects, p1.dict, wa.name)!.dict) : [];
  const fills = inner.filter((o) => o.stream).flatMap((o) => [...o.stream!.toString("latin1").matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map((m) => m.slice(1, 4).map((c) => Math.round(Number(c) * 255)).join()));
  const masks = inner.filter((o) => /\/Subtype \/Image/.test(o.dict) && /\/DeviceGray/.test(o.dict)).map(greyRowTransitions);
  const found = { pages: pages.length, formsOnPage1: forms.length, wa: wa && { x: wa.x.toFixed(1), y: wa.y.toFixed(1), ground: wa.ground?.fill?.join() }, fills: [...new Set(fills)], maskTransitions: masks, nm: atTile(want.NM).length };
  check(pages.length >= 2 && wa !== undefined, `the PDF's first page draws a form at ${label}'s print position`, found);
  check(!!wa?.ground && wa.ground.fill!.join() === rgb(want.ground).join() && near(wa.ground.w, want.WA.w) && near(wa.ground.h, want.WA.h), `${label}'s ground is the light sunk colour, at the tile's size (print from dark is light)`, { pdf: wa?.ground, want: [want.ground, want.WA.w] });
  check(fills.includes(rgb(want.stripe).join()), `${label}'s form fills in the light --ink-3 the stripes are drawn in`, { fills: found.fills, want: rgb(want.stripe).join() });
  check(masks.some((n) => n >= 4), `${label}'s soft mask alternates along its middle row: stripes, not a smear`, masks);
  check(atTile(want.NM).length === 0, "the NM (no-cliff) tile draws no such form", found.nm);
}
