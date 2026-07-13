# HotGap design system — how to build with it

HotGap is a plain-language civic tool that shows people benefits cliffs (how
earning more can leave a household with less). Design for a **5th-grade reading
level**, and **show-and-explain, never advise** — state facts and thresholds,
never tell the reader what they *should* do. Never frame benefits as a trap to
escape or nudge the reader toward earning off them — describe pay thresholds
neutrally. Banned framings: 'you should', 'watch out', 'clear the trap', 'get
off help', 'you'd need a raise'.

## Setup — no provider, just the stylesheet

Components need **no** theme provider, context, or wrapper. They render fixed
semantic class names; the one requirement is that **`styles.css` is loaded** — it
defines the `:root` design tokens, the component classes, and the dark-mode
re-derivations. **Dark mode is automatic** via `@media (prefers-color-scheme:
dark)` — do not add a theme toggle or override the tokens per component.

In **Claude Design**, use the components straight from the provided library —
compose them directly, no install step. The npm `import { … } from
"@hotgap/design-system"` form shown below is for building inside the source repo.

```jsx
import { VerdictHeadline, CurveChart, Callout } from "@hotgap/design-system";
// styles.css is loaded once for the whole surface (the design tool does this).

<div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
  <VerdictHeadline tone="danger">Near $14.50 an hour, more pay can mean less money.</VerdictHeadline>
  <CurveChart analysis={analysis} unit="hour" hoursPerWeek={40} />
  <Callout tone="info" title="Please know">
    <p>This is a guess based on public rules. Your caseworker decides your real benefits.</p>
  </Callout>
</div>
```

## Styling idiom — tokens + semantic classes, not utilities

There is **no utility-class framework** (no Tailwind) and **no style props**.
Two rules:

1. **Let components carry their own look.** They render classes like `.primary`,
   `.choice`, `.toggle`, `.callout`, `.door`, `.why-item`, `.curve-chart`,
   `.state-path`, `.escape-path` — all defined in `styles.css`. Don't restyle
   them; pick the variant prop (`variant`, `tone`, `on`, `selected`, …).
2. **Style your own layout glue with the tokens**, never hard-coded colors:

   | Token | Use |
   |---|---|
   | `--bg` / `--ink` / `--muted` | page background / body text / secondary text |
   | `--accent` / `--accent-ink` | the teal brand: CTAs, "good" states, links |
   | `--danger` / `--danger-soft` | clay-red: cliffs, warnings, the "bad" state |
   | `--card` / `--line` | surface fill / hairline borders |
   | `--radius` | corner radius (14px) |
   | `--danger-ramp-1` … `--danger-ramp-5` | the 5-step choropleth scale, light→dark |

   e.g. `style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}`.

Type is system-ui at an 18px root; keep tap targets ≥44px (the components
already do). Two brand hues only — teal for good/forward, clay-red for
loss/danger — never introduce a third accent color.

## Where the truth lives

- **`styles.css`** — the only stylesheet: every token and component class. Read
  it before styling anything custom.
- **`components/<Name>/<Name>.d.ts`** — the prop contract for each component.
- **`components/<Name>/<Name>.prompt.md`** — how to compose each one.

## The components

Primitives: **Button** (primary / ghost / choice), **Field**, **Stepper**,
**Toggle** (pill switch), **RadioGroup**, **CheckboxGroup**, **Callout** (info /
warn), **Door**, **Spinner**, **VerdictHeadline** (danger / good), **Legend**.
Frame: **Shell** (page column), **Progress** (step N of M), **Banner**
(full-width problem message). Rich: **WhyList**, **EscapePath**, **CurveChart**
(the money-vs-pay chart, with tap-a-drop), and **ChoroplethMap** (50 states + DC,
shaded on the clay ramp). Feed the chart a `CurveAnalysis` and the map a
`StateValues` (USPS → number); pair the map with `Legend` using the same
`var(--danger-ramp-*)` tokens.

### Choosing selection controls

- **Toggle** — one standalone yes/no (e.g. "A housing voucher").
- **RadioGroup** — pick exactly one from a short list. It has correct radio
  semantics ("1 of N" to a screen reader), so use it over bare choice Buttons for
  questions like "Just me / Me + a partner".
- **CheckboxGroup** — pick any number from a list (multi-select).

And for the frame: **Shell** wraps a whole screen; **Progress** shows step N of
M; **Banner** is a full-width problem message; **Callout** is an inline aside.
