// The phone proof (design/REVIEW-touch-2026-09-19.md): every figure swipes,
// every target is 44×44, and the scrub, the taps and the inputs behave under
// a finger. Measured, never asserted from the stylesheet — a rule in
// tokens.css is not a hit area, and `touch-action` is the intersection of a
// whole ancestor chain, so the only honest reading is what the browser does
// with a synthesized touch.
//
// Three measurements, three tools, on purpose:
//   • Hit area — `document.elementFromPoint` outward from each target's visual
//     centre, binary-searched in four directions. It sees an enlarged hit area
//     (a `::before`, a transparent SVG child) that `getBoundingClientRect`
//     cannot, and it sees a NEIGHBOUR stealing the tap, which a rect cannot
//     either. A rule that says 44px and a neighbour that eats 20 of them read
//     the same from CSS and differently from here.
//   • Swipe — CDP `Input.synthesizeScrollGesture` with
//     `gestureSourceType: "touch"`, which goes through Chromium's real gesture
//     recognizer and therefore honours `touch-action`. `dispatchTouchEvent`
//     would not scroll at all, so it cannot prove a scroller scrolls.
//   • Scrub — CDP `Input.dispatchTouchEvent`, which delivers the pointer
//     events a scrub listens to. The two tools disagree by design: the first
//     asks "does the browser pan?", the second "does the page hear the
//     finger?", and a figure must answer yes to exactly one per gesture.
//
// TWO CONTROLS, because a gesture that moves nothing looks exactly like a
// figure that refuses to move (§ Measure first, REVIEW-touch):
//   • the same swipe over plain prose, which must scroll the page — if it
//     does not, the TOOL is broken and no finding from it is real;
//   • the same distance as a `gestureSourceType: "mouse"` wheel, which must
//     move the scroller — if the wheel moves it and the finger does not, the
//     scroller is fine and `touch-action` is the fault.
// CDP's sign convention is the trap those controls caught: a POSITIVE
// yDistance scrolls the page UP, so `yDistance: 200` at the top of a document
// is a no-op that reads as "the page will not scroll".
//
// WebKit: `webkit.launch()` against the cached Playwright at
// ~/.npm/_npx/86170c4cd1c5da32 fails — `webkit-2272` is not downloaded and
// this pass does not install browsers. So both phones run under Chromium
// mobile emulation (`isMobile`, `hasTouch`, the device's own viewport and
// pixel ratio); the iPhone 14 entry keeps its 390×664 viewport and 3× ratio,
// which is what a layout and a hit area are measured against. What is NOT
// covered is WebKit's own gesture engine, so `overscroll-behavior-x` and
// `-webkit-overflow-scrolling` are proved as computed values, not as
// behaviour. Named here so the gap is a known gap and not a silent one.
import { devices, expect, test, type CDPSession, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { check, consoleErrors, outDir } from "./support.js";

/* Chromium mobile emulation at each phone's real size: the device descriptor
   WITHOUT its `defaultBrowserType`, which would send the iPhone entry to a
   WebKit that is not installed. `browserName` itself cannot be set here —
   Playwright refuses it inside a describe — so the config's chromium stands
   and what is emulated is the viewport, the ratio, the UA, touch and mobile. */
const phone = (name: "Pixel 7" | "iPhone 14") => {
  const { defaultBrowserType: _drop, ...d } = devices[name];
  return d;
};
const PHONES = ["Pixel 7", "iPhone 14"] as const;

const OUT = outDir("design/review/touch");

/** The three surfaces and a representative household on each. */
const PAGES = {
  citizen: "/?zip=94110&kids=3%2C7&pay=30000&unit=year",
  caseworker: "/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1",
  places: "/places.html",
} as const;
type Surface = keyof typeof PAGES;

/** WCAG 2.5.5 Target Size (Enhanced). */
const MIN = 44;
/**
 * The probe's own resolution, in CSS px: the 0.05 its search stops at, the
 * device-pixel snapping of `elementFromPoint` (0.4px a side at 2.6–3× ), and
 * the half pixel `getBoundingClientRect` loses to rounding. Anything inside
 * this is the instrument, not the page — and anything outside it is the page.
 */
const TOL = 1.5;

/* ── The measurement ──────────────────────────────────────────────────── */

export interface Hit {
  /** A selector a person can paste into the console. */
  sel: string;
  /** The accessible-ish name, for reading the table. */
  name: string;
  /** The element's own box. */
  box: [w: number, h: number];
  /** What the four probes measured: the tap-receiving box around the centre. */
  hit: [w: number, h: number];
  /** The centre in DOCUMENT space, taken before any probe scrolled anything — the one frame every box shares. */
  doc: [x: number, y: number];
  /** The indices of every target that encloses this one, so a parent's box is never read as a collision with its own child. */
  within: number[];
  ok: boolean;
  /** Set when a criterion's own exception applies; the target is listed, not failed. */
  why?: string;
}

/**
 * Every tappable thing on the page, with the box that actually receives the
 * tap.
 *
 * Two passes, and the order matters. Pass A reads every position with nothing
 * scrolled, because the overlap test below needs all the boxes in ONE frame;
 * pass B scrolls each target to the middle and probes it, which moves both
 * the page and any horizontal scroller a target sits in. Measuring positions
 * during pass B was the first version's defect: every element was probed at
 * the centre of the viewport, so every element "overlapped" every other one,
 * and the proof reported 22 collisions on a page that had none.
 *
 * O(N) hit tests: N targets × 4 directions × ~6 probe steps, all in the page.
 */
export const MEASURE_HITS = ([minSize, tol]: [number, number]): Hit[] => {
  /* `[tabindex="-1"]` is deliberately NOT here. A heading or a figcaption with
     tabindex -1 is a place for focus to LAND after a skip link, not a thing a
     thumb aims at, and counting them made the caseworker report two section
     headings as 19px targets. The one tabindex -1 that IS a target, `.hg-mark`,
     is a real <button> and arrives through `button`. */
  const SEL = "button, a[href], summary, select, input, [role=button], [tabindex='0'], .tile";
  const MAX = 34; /* probe no further than 34px: 68px of measured box is past any floor we set */

  const path = (el: Element): string => {
    const bits: string[] = [];
    for (let n: Element | null = el; n && n !== document.body && bits.length < 4; n = n.parentElement) {
      const id = n.id ? `#${n.id}` : "";
      const cls = [...n.classList].slice(0, 2).map((c) => `.${c}`).join("");
      bits.unshift(n.tagName.toLowerCase() + id + cls);
      if (id) break;
    }
    return bits.join(" > ");
  };
  const name = (el: Element): string =>
    (el.getAttribute("aria-label") ?? (el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 44);

  const targets = [...document.querySelectorAll<HTMLElement>(SEL)].filter((el) => {
    if (el.hasAttribute("disabled") || el.closest("[hidden]") || el.closest("dialog:not([open])")) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.pointerEvents === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  /* Pass A: positions, one frame, nothing scrolled. */
  const frame = targets.map((el, i) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      el, box: [Math.round(r.width), Math.round(r.height)] as [number, number],
      /* Unrounded: half a pixel lost on the centre is a whole pixel lost off
         the measured width, and a true 44px box then reads 43. */
      doc: [r.left + scrollX + r.width / 2, r.top + scrollY + r.height / 2] as [number, number],
      within: targets.reduce<number[]>((acc, o, j) => (j !== i && o.contains(el) ? [...acc, j] : acc), []),
      /* The two exceptions the criterion itself grants. A link inside a
         sentence is sized by the line-height of the text around it (WCAG
         2.5.5 "Inline"); a skip link parked off-canvas has no target until it
         takes focus, and then it is the only thing on screen. */
      why: r.left + scrollX < -500 ? "off-canvas until focused"
        : el.tagName === "A" && s.display === "inline" ? "inline in prose (2.5.5 Inline)"
          : undefined,
    };
  });

  /* Pass B: what receives the tap. */
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const hits: Hit[] = [];
  for (const f of frame) {
    const base: Hit = { sel: path(f.el), name: name(f.el), box: f.box, hit: [0, 0], doc: [round1(f.doc[0]), round1(f.doc[1])], within: f.within, ok: true, why: f.why };
    if (f.why === "off-canvas until focused") { hits.push(base); continue; }
    f.el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" as ScrollBehavior });
    const r = f.el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const lands = (x: number, y: number): boolean => {
      if (x < 1 || y < 1 || x > innerWidth - 2 || y > innerHeight - 2) return false;
      const t = document.elementFromPoint(x, y);
      return !!t && (t === f.el || f.el.contains(t));
    };
    /* Largest d the target still receives, per direction. Monotone for a
       rectangular hit area, which every target here is. */
    const reach = (dx: number, dy: number): number => {
      if (!lands(cx + dx, cy + dy)) return 0;
      let lo = 1, hi = MAX;
      /* To a twentieth of a pixel. At half a pixel a side, a true 44px box
         measured 43 and the proof reported a finding that was its own
         resolution — the instrument, not the page. */
      while (hi - lo > 0.05) { const mid = (lo + hi) / 2; if (lands(cx + dx * mid, cy + dy * mid)) lo = mid; else hi = mid; }
      return lo;
    };
    if (!lands(cx, cy)) {
      /* The centre itself is covered — another element takes this tap. */
      hits.push({ ...base, hit: [0, 0], ok: !!f.why });
      continue;
    }
    const w = reach(-1, 0) + reach(1, 0), h = reach(0, -1) + reach(0, 1);
    /* TWO INSTRUMENTS, each used for what it measures exactly. The probe is
       exact about WHO WINS A TAP and loses up to half a pixel a side to
       device-pixel snapping; `getBoundingClientRect` is exact about the box
       and blind to whatever is painted over it. At this phone's 2.625 device
       pixels to the CSS pixel that is up to ~0.4px a side, plus the 0.05 the
       search stops at and the half pixel `box` loses to rounding: 1.5px all
       told, so a 44.0px map tile probes 43.0 and is not a finding. A target
       therefore passes when the probe ALONE clears the floor (an enlarged hit
       area), or when its own box clears it AND the probe agrees the box is
       not being covered. Anything actually covered — the caseworker's
       $51,000 mark at 0×0, a 44px box measuring 24 — still fails, because
       then the two instruments disagree by far more than the tolerance. */
    const own = f.box, uncovered = w >= own[0] - tol && h >= own[1] - tol;
    const ok = (w >= minSize - 0.2 && h >= minSize - 0.2) || (own[0] >= minSize && own[1] >= minSize && uncovered);
    hits.push({ ...base, hit: [round1(w), round1(h)], ok: !!f.why || ok });
  }
  return hits;
};

/**
 * Hit areas that overlap. The 44px floor is only honest if the enlargement
 * did not take the neighbour's pixels: two 24px visuals four pixels apart
 * cannot BOTH own 44px of the line they sit on.
 *
 * Re-derived by geometry from pass A's positions, because the probe cannot
 * see this at all — `elementFromPoint` returns ONE element, so an overlap
 * reads to it as a short reach on the loser and a full reach on the winner.
 * A probe that reported no overlap would only be agreeing with itself.
 */
export function overlaps(hits: Hit[]): { a: string; b: string; by: [number, number] }[] {
  const found: { a: string; b: string; by: [number, number] }[] = [];
  const boxes = hits
    .map((x, i) => ({ x: x.doc[0] - x.hit[0] / 2, y: x.doc[1] - x.hit[1] / 2, w: x.hit[0], h: x.hit[1], hit: x, i }))
    .filter((b) => b.w > 0 && !b.hit.why);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      /* A chart wrapper holds its own marks and a table cell holds its row
         button: nesting is not a collision — the inner one is on top and gets
         the tap, which is what both of them intend. Only SIBLINGS compete. */
      if (a.hit.within.includes(b.i) || b.hit.within.includes(a.i)) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) found.push({ a: `${a.hit.sel} "${a.hit.name}"`, b: `${b.hit.sel} "${b.hit.name}"`, by: [Math.round(ox), Math.round(oy)] });
    }
  }
  return found;
}

/**
 * The one exception this system claims for itself, checked rather than
 * asserted: a cliff mark narrower than 44px is allowed ONLY when it is as wide
 * as the room between it and its nearest neighbour.
 *
 * A cliff's x is the pay it happens at, so two cliffs $3,000 apart cannot be
 * moved apart to make room without the picture telling a lie — WCAG 2.5.5's
 * "Essential" exception, and the reason `markWidths` gives a crowded mark the
 * gap instead of 44px. What the exception must not become is a blanket: a mark
 * that is short for any OTHER reason — a stacking context, a stray width, a
 * layer that shifted — is still a finding, so the room is re-derived here from
 * the marks' own positions and compared with what was measured.
 */
export function excuseCrowdedMarks(hits: Hit[], minSize: number, tol: number): void {
  const marks = hits.filter((h) => h.sel.endsWith("button.hg-mark")).sort((a, b) => a.doc[0] - b.doc[0]);
  for (const [i, m] of marks.entries()) {
    if (m.ok) continue;
    const room = Math.min(i > 0 ? m.doc[0] - marks[i - 1].doc[0] : Infinity, i < marks.length - 1 ? marks[i + 1].doc[0] - m.doc[0] : Infinity);
    /* Two conditions, separately: the mark's BOX is all the room there is
       (nothing was left on the table), and the PROBE agrees the box is the
       mark's own (nothing was taken off it). A mark short for any other
       reason fails one of them. */
    const takesTheRoom = room < minSize && Math.abs(m.box[0] - room) <= tol;
    if (takesTheRoom && m.hit[0] >= m.box[0] - tol && m.hit[1] >= minSize - 0.2) {
      m.ok = true;
      m.why = `${Math.round(room)}px is the whole room between two cliffs (2.5.5 Essential)`;
    }
  }
}

/* ── The gestures ─────────────────────────────────────────────────────── */

/**
 * A real touch pan, through Chromium's gesture recognizer: it honours
 * `touch-action`. CDP's distances are the CONTENT's, not the finger's —
 * positive scrolls up and left — so `up`/`left` here are what the scroll
 * position does, and the callers read in that direction.
 */
async function swipe(cdp: CDPSession, x: number, y: number, dx: number, dy: number): Promise<void> {
  await cdp.send("Input.synthesizeScrollGesture", {
    x: Math.round(x), y: Math.round(y), xDistance: dx, yDistance: dy,
    gestureSourceType: "touch", speed: 800, preventFling: true,
  });
}

/** The same gesture from a wheel: the control that says whether a scroller CAN scroll at all. */
async function wheel(cdp: CDPSession, x: number, y: number, dx: number, dy: number): Promise<void> {
  await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(x), y: Math.round(y), xDistance: dx, yDistance: dy, gestureSourceType: "mouse", speed: 800 });
}

/** A finger dragged across the page: the pointer events a scrub listens to. */
async function drag(cdp: CDPSession, from: [number, number], to: [number, number], steps = 12): Promise<void> {
  const pt = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), radiusX: 12, radiusY: 12, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(from[0], from[1]) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: pt(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps),
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** Land on a surface and wait for the thing the phone is about to touch. */
async function land(page: Page, surface: Surface): Promise<void> {
  await page.goto(PAGES[surface], { waitUntil: surface === "places" ? "networkidle" : "load" });
  if (surface === "places") await page.locator(".tile").first().waitFor();
  else await page.locator(".hg-chart svg path").first().waitFor();
  await page.waitForTimeout(400);
}

/** Every disclosure open: a target inside a closed panel is a target a thumb meets one press later. */
const openAll = async (page: Page): Promise<void> => {
  await page.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = true; });
  await page.waitForTimeout(250);
};

/* ── The proofs ───────────────────────────────────────────────────────── */

for (const device of PHONES) {
  test.describe(device, () => {
    test.use(phone(device));

    for (const surface of Object.keys(PAGES) as Surface[]) {
      test(`${surface}: every target is ${MIN}×${MIN} and no two hit areas overlap`, async ({ page }) => {
        const errors = consoleErrors(page);
        await land(page, surface);
        await openAll(page);

        const hits = await page.evaluate(MEASURE_HITS, [MIN, TOL] as [number, number]);
        excuseCrowdedMarks(hits, MIN, TOL);
        const small = hits.filter((x) => !x.ok);
        const excused = hits.filter((x) => x.why);
        console.log(`${device} ${surface}: ${hits.length} targets, ${small.length} under ${MIN}px, ${excused.length} under the criterion's own exceptions`);
        for (const s of small) console.log(`  FAIL ${s.hit[0]}×${s.hit[1]} (box ${s.box[0]}×${s.box[1]})  ${s.sel}  "${s.name}"`);
        for (const s of excused) console.log(`  note ${s.hit[0]}×${s.hit[1]} — ${s.why}  ${s.sel}  "${s.name}"`);
        const over = overlaps(hits);
        for (const o of over) console.log(`  OVERLAP ${o.by[0]}×${o.by[1]}px  ${o.a}  ×  ${o.b}`);
        writeFileSync(`${OUT}/${device.replace(/\s+/g, "-")}-${surface}.json`, JSON.stringify({ hits, overlaps: over }, null, 1));

        check(small.length === 0, `${surface}: every target ≥ ${MIN}×${MIN}`, small.map((s) => `${s.sel} "${s.name}" ${s.hit[0]}×${s.hit[1]}`));
        check(over.length === 0, `${surface}: no two hit areas overlap`, over.length);
        expect(errors).toEqual([]);
      });

      test(`${surface}: every wide figure swipes sideways and never steals the page's vertical scroll`, async ({ page }) => {
        const errors = consoleErrors(page);
        await land(page, surface);
        await openAll(page);
        const cdp = await page.context().newCDPSession(page);

        /* CONTROL, before anything is measured: the same gesture over prose
           must scroll the page. A tool that moves nothing proves nothing. */
        await page.evaluate(() => scrollTo(0, 0));
        await swipe(cdp, 20, 300, 0, -200);
        await page.waitForTimeout(300);
        const control = await page.evaluate(() => scrollY);
        check(control > 20, `${surface}: CONTROL — a vertical touch swipe scrolls the page`, control);
        await page.evaluate(() => scrollTo(0, 0));

        const scrollers = await page.locator(".hg-scroll-x").all();
        check(scrollers.length > 0, `${surface}: has a horizontal scroller`, scrollers.length);

        for (const [i, s] of scrollers.entries()) {
          const id = await s.evaluate((el) => `${el.className}${el.querySelector("table") ? " (table)" : el.querySelector("svg") ? " (plot)" : el.querySelector(".map") ? " (map)" : ""}`);
          await s.scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);
          const style = await s.evaluate((el) => {
            const c = getComputedStyle(el);
            return { touchAction: c.touchAction, overscrollX: c.overscrollBehaviorX,
              scrollable: el.scrollWidth > el.clientWidth + 1, w: el.clientWidth, sw: el.scrollWidth };
          });
          if (!style.scrollable) { console.log(`${device} ${surface} scroller ${i} ${id}: fits (${style.sw}≤${style.w}), nothing to swipe`); continue; }

          /* WHERE THE FINGER GOES DOWN, asked of the page rather than worked
             out from a rectangle. A box that is on screen is not the same as a
             box that is reachable: this caseworker table's own box starts 7px
             from the top of an iPhone 14 and the sticky scenario bar covers
             the first 56 of it, so "the middle of the box, clamped to the
             screen" put the gesture on the wordmark — and the proof then
             reported that the table would not swipe, on the smaller phone
             only, with the wheel control agreeing because it was aimed at the
             same wrong pixel. The point is hit-tested down the scroller until
             one lands ON it. */
          const at = await s.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const x = Math.min(Math.max(r.left + r.width / 2, 8), innerWidth - 8);
            for (let y = Math.max(r.top + 8, 8); y < Math.min(r.bottom - 8, innerHeight - 8); y += 12) {
              const t = document.elementFromPoint(x, y);
              if (t && el.contains(t)) return [x, y] as [number, number];
            }
            return null;
          });
          if (!at) { check(false, `${surface} [${i}] ${id}: has a pixel a finger can reach`, "every point in it is covered or off screen"); continue; }
          const [cx, cy] = at;

          /* (1) a horizontal swipe moves the scroller and not the page */
          const before = await page.evaluate(() => scrollY);
          const l0 = await s.evaluate((el) => el.scrollLeft);
          await swipe(cdp, cx, cy, -180, 0);
          await page.waitForTimeout(300);
          const l1 = await s.evaluate((el) => el.scrollLeft);
          const after = await page.evaluate(() => scrollY);
          const swiped = Math.abs(l1 - l0) > 20;
          check(swiped, `${surface} [${i}] ${id}: a horizontal swipe scrolls it`, `scrollLeft ${l0}→${l1}, touch-action ${style.touchAction}`);
          check(Math.abs(after - before) <= 2, `${surface} [${i}] ${id}: …and does not scroll the page`, `scrollY ${before}→${after}`);
          if (!swiped) {
            /* CONTROL: a wheel over the same pixel. If the wheel moves it, the
               scroller is fine and the finger was refused by `touch-action`. */
            await wheel(cdp, cx, cy, -180, 0);
            await page.waitForTimeout(300);
            const l1b = await s.evaluate((el) => el.scrollLeft);
            console.log(`  CONTROL wheel at the same pixel: scrollLeft ${l1}→${l1b} — ${Math.abs(l1b - l1) > 20 ? "the scroller scrolls; touch-action refused the finger" : "the scroller itself will not scroll"}`);
            await s.evaluate((el, v) => { el.scrollLeft = v; }, l0);
          }

          /* (2) a vertical swipe over it scrolls the page and not the scroller */
          const l2 = await s.evaluate((el) => el.scrollLeft);
          const y0 = await page.evaluate(() => scrollY);
          await swipe(cdp, cx, cy, 0, -200);
          await page.waitForTimeout(300);
          const l3 = await s.evaluate((el) => el.scrollLeft);
          const y1 = await page.evaluate(() => scrollY);
          check(Math.abs(y1 - y0) > 20, `${surface} [${i}] ${id}: a vertical swipe over it scrolls the page`, `scrollY ${y0}→${y1}`);
          check(Math.abs(l3 - l2) <= 2, `${surface} [${i}] ${id}: …and does not move the figure`, `scrollLeft ${l2}→${l3}`);

          /* (3) the end of the swipe is not a back-navigation on iOS */
          check(style.overscrollX === "contain" || style.overscrollX === "none",
            `${surface} [${i}] ${id}: overscroll-behavior-x contains the swipe`, style.overscrollX);
          await page.evaluate(() => scrollTo(0, 0));
        }
        expect(errors).toEqual([]);
      });
    }

    test("citizen: a finger on the line reads the pay under it, and a swipe on the line moves the curve", async ({ page }) => {
      const errors = consoleErrors(page);
      await land(page, "citizen");
      const cdp = await page.context().newCDPSession(page);
      const plot = page.locator("#chart .hg-chart__scroll");
      const readout = page.locator(".hg-readout").first();
      const b = (await plot.boundingBox())!;
      const y = b.y + b.height / 2;

      /* A finger set down on the plot and moved along it reports the pay under it. */
      const said = await readout.textContent();
      await drag(cdp, [b.x + b.width * 0.25, y], [b.x + b.width * 0.7, y]);
      await page.waitForTimeout(250);
      const now = await readout.textContent();
      check(now !== said && /\$/.test(now ?? ""), "citizen: a touch on the line reads the pay under it", now?.slice(0, 60));

      /* …and the page did not scroll out from under the finger while it did. */
      const moved = await page.evaluate(() => scrollY);
      check(moved <= 2, "citizen: the page holds still while the finger is on the line", moved);

      /* A swipe that STARTS on the plot is a swipe: the curve moves, and the
         readout keeps reading — the pay under a still thumb changes because
         the curve travelled (charts.md § A finger on the curve). */
      const l0 = await plot.evaluate((el) => el.scrollLeft);
      const before = await readout.textContent();
      await swipe(cdp, b.x + b.width / 2, y, -200, 0);
      await page.waitForTimeout(300);
      const l1 = await plot.evaluate((el) => el.scrollLeft);
      check(Math.abs(l1 - l0) > 20, "citizen: a swipe that starts on the line scrolls the curve", `scrollLeft ${l0}→${l1}`);
      check(before !== null, "citizen: the readout is a line of the figure", (before ?? "").slice(0, 40));
      expect(errors).toEqual([]);
    });

    test("taps: a curve mark opens its row, a map tile fills the readout, a summary opens, a chip opens its dialog", async ({ page }) => {
      const errors = consoleErrors(page);
      await land(page, "citizen");

      /* A mark (M6): its row opens and the readout says what ends there. */
      const mark = page.locator(".hg-mark").first();
      await mark.scrollIntoViewIfNeeded();
      const mb = (await mark.boundingBox())!;
      await page.touchscreen.tap(mb.x + mb.width / 2, mb.y + mb.height / 2);
      await page.waitForTimeout(250);
      check(await mark.evaluate((el) => el.getAttribute("aria-expanded") === "true"), "citizen: a tap on a mark opens its row", await mark.getAttribute("aria-expanded"));
      const line = (await page.locator(".hg-readout").first().textContent()) ?? "";
      check(/\$/.test(line), "citizen: …and the readout says the money", line.slice(0, 48));

      /* A disclosure summary. */
      const sum = page.locator("details.hg-disclosure > summary").first();
      await sum.scrollIntoViewIfNeeded();
      const sb = (await sum.boundingBox())!;
      await page.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await page.waitForTimeout(200);
      check(await sum.evaluate((el) => (el.parentElement as HTMLDetailsElement).open), "citizen: a tap on a summary opens it");

      /* The summary line's Edit, then a chip and its dialog, and focus back on close. */
      const edit = page.locator(".hg-scenario__summary button").first();
      await edit.scrollIntoViewIfNeeded();
      const eb = (await edit.boundingBox())!;
      await page.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2);
      await page.waitForTimeout(250);
      const chip = page.locator("button.hg-chip[aria-haspopup='dialog']").first();
      await chip.scrollIntoViewIfNeeded();
      const cb = (await chip.boundingBox())!;
      await page.touchscreen.tap(cb.x + cb.width / 2, cb.y + cb.height / 2);
      await page.waitForTimeout(250);
      const dialog = page.locator("dialog.editor__dialog");
      check(await dialog.evaluate((el) => (el as HTMLDialogElement).open), "citizen: a tap on a chip opens its dialog");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      check(await chip.evaluate((el) => document.activeElement === el), "citizen: …and focus comes back to the chip on close");

      /* The map: a tile fills the readout inside the figure. */
      await land(page, "places");
      const tile = page.locator(".tile").first();
      await tile.scrollIntoViewIfNeeded();
      const tb = (await tile.boundingBox())!;
      await page.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height / 2);
      await page.waitForTimeout(400);
      check(await tile.evaluate((el) => el.getAttribute("aria-current") === "true"), "places: a tap on a tile selects it", await tile.getAttribute("aria-current"));
      const readout = ((await page.locator("#readout").textContent()) ?? "").trim();
      check(readout.length > 10, "places: …and the readout inside the figure fills", readout.slice(0, 56));
      expect(errors).toEqual([]);
    });

    test("inputs and figures: 16px type, no double-tap delay, no selection under a swipe", async ({ page }) => {
      for (const surface of Object.keys(PAGES) as Surface[]) {
        await land(page, surface);
        await openAll(page);
        /* The editor's chips live behind the summary line on a phone. */
        const edit = page.locator(".hg-scenario__summary button").first();
        if (await edit.count()) { await edit.click().catch(() => {}); await page.waitForTimeout(200); }

        const zoomers = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("input, select, textarea")]
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => ({ sel: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}`, px: parseFloat(getComputedStyle(el).fontSize) }))
            .filter((x) => x.px < 16));
        check(zoomers.length === 0, `${surface}: no input under 16px (iOS would zoom the page)`, zoomers);

        const slow = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("button, a[href], summary, select, input, [role=button], .tile, .hg-mark")]
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => ({ sel: `${el.tagName.toLowerCase()}.${[...el.classList][0] ?? ""}`, ta: getComputedStyle(el).touchAction }))
            .filter((x) => x.ta === "auto")
            .filter((v, i, a) => a.findIndex((o) => o.sel === v.sel) === i));
        check(slow.length === 0, `${surface}: every control sets touch-action (no double-tap delay)`, slow);

        const selectable = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".hg-picture, figure .hg-chart, figure .map")]
            .map((el) => ({ sel: el.className, us: getComputedStyle(el).userSelect }))
            .filter((x) => x.us !== "none"));
        check(selectable.length === 0, `${surface}: a swipe over the picture never highlights its labels`, selectable);
      }
    });

    test("the hit areas, outlined, at this phone's size", async ({ page }) => {
      for (const surface of Object.keys(PAGES) as Surface[]) {
        await land(page, surface);
        /* A debug outline the spec adds and nothing ships: every target's
           measured hit box, drawn where the probe found it. */
        const hits = await page.evaluate(MEASURE_HITS, [MIN, TOL] as [number, number]);
        excuseCrowdedMarks(hits, MIN, TOL);
        /* Land again before drawing. Probing scrolls every scroller it walks,
           and the boxes were recorded in the frame the page OPENS in — drawn
           over a plot the probe had pushed $60,000 along its axis, the marks
           came out beside the wrong dots. */
        await land(page, surface);
        await page.evaluate((all: Hit[]) => {
          scrollTo(0, 0);
          const layer = document.createElement("div");
          layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9999";
          for (const x of all) {
            if (!x.hit[0]) continue;
            const d = document.createElement("div");
            d.style.cssText = `position:absolute;left:${x.doc[0] - x.hit[0] / 2}px;top:${x.doc[1] - x.hit[1] / 2}px;`
              + `width:${x.hit[0]}px;height:${x.hit[1]}px;outline:1px solid ${x.ok ? "rgba(0,120,255,.85)" : "rgba(220,0,0,.95)"};`
              + `background:${x.ok ? "rgba(0,120,255,.07)" : "rgba(220,0,0,.14)"}`;
            layer.append(d);
          }
          document.body.append(layer);
        }, hits);
        await page.screenshot({ path: `${OUT}/${device.replace(/\s+/g, "-")}-${surface}-hits.png` });
      }
    });
  });
}
