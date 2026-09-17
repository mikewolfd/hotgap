# The languages migration, measured (2026-09-17)

What was measured when the site went from four English copy modules to a
catalog per locale, and Spanish shipped with it (`app/README.md` § Languages).
Renders here are `app/e2e/i18n-review.mjs`; the gate is `app/e2e/i18n.spec.ts`.

## The English did not move

`app/e2e/text-dump.mjs` dumps every page's visible text and every `aria-label`,
`title`, `alt` and `placeholder` at 1280 in `en`. Main (5290de0) was built and
served beside the branch, and the two dumps diffed:

    node app/e2e/text-dump.mjs /tmp/before http://localhost:8801
    node app/e2e/text-dump.mjs /tmp/after  http://localhost:8800
    diff -r /tmp/before /tmp/after

Three differences on the three pages, all named:

| Page | Difference | Why |
| --- | --- | --- |
| all three | `+ Español` | The language switch, which step 4 added. |
| all three | `+ aria-label: Language` | That switch's own label. |
| places | the cite's own URL | `localhost:8801` against `localhost:8800`: the two servers, not the copy. |

Every other rendered string is byte-identical.

## What a page downloads

Gzip, every `.js` and `.css` a page requests, measured against main built and
served from the same machine.

| Page | main | branch, `en` | branch, `es-US` |
| --- | --- | --- | --- |
| citizen | 52.6 kB | 79.5 kB (+51%) | 102.5 kB (+95%) |
| caseworker | 63.2 kB | 84.2 kB (+33%) | 107.2 kB (+70%) |
| places | 37.4 kB | 63.9 kB (+71%) | 86.9 kB (+132%) |

**The pages got heavier, not lighter, and the reason is the file layout, not
the library.** `intl-messageformat` is 9.6 kB gzip of it. The rest is that one
file per locale means every page loads all 1,076 messages: the citizen page now
ships the caseworker's 369 and the journalist's 207, where before each page's
bundle carried only its own surface's copy module. Spanish then pays twice,
because the overlay loads English underneath the translation so a message a
translation lacks still renders — a Spanish reader downloads two whole
catalogs, ~19 kB and ~21 kB gzip.

Two ways out, neither taken here, because the one-file-per-locale layout is the
decided rule and this was not the commit to change it:

1. **Split the catalog by surface** (`i18n/en/citizen.json`, `…/shared.json`),
   so a page loads its own namespace and `shared` and nothing else. Worth about
   20 kB gzip a page — most of the regression.
2. **Skip the English base for a complete translation.** `es-US.json` has a
   message for every English key (`copy.test.ts` asserts it), so the overlay
   loads ~19 kB it never reads. A `complete` flag in the file's `_` record would
   drop it, at the cost of a new failure mode — a file that lies renders
   nothing — which the gate would catch.

## The Spanish render

40 renders and 16 crops here: the three pages and the editor's chips row, in
both languages, at 390 and 1280, in the light and dark schemes, and as Letter
PDFs. Measured on every one: no horizontal scroll, and no label that has lost
its words.

- Spanish uses the same number of lines as English almost everywhere — the
  chips 2 lines of 23, the table's column heads 3 of 22, the ranked strip
  identical. Where it differs it grows downward, never sideways.
- **Fixed here:** the places table's flag and its figure column heads were
  `nowrap`, and from 62rem the table's scroller is open, so they had nowhere to
  go: es-US pushed the document 38px past 1280 and the pseudo-locale 296px.
  They wrap from 62rem now — the fix print already needed for the same reason.
- The caseworker's four readout figures drop to their own row at 1280 in
  Spanish rather than crowding the verdict. Graceful, and it costs about 80px
  of height.
- On paper both languages put the places figure whole on page 1. A Letter PDF
  taken at the window's width rather than the paper's does not — that was a bug
  in the review script, not in the page, and its comment now says so.

## What is still English on a Spanish page, on purpose

The language switch (a language names itself, and it is the way back); a state
program's name from the coverage block ("Colorado premium assistance",
"ConnectorCare"), because a name is the office's (`inventory.md` M3); a
citation's hostname; the CSV's column headers and the URL's parameter names,
both machine contracts. The gate asserts each of these stays.

The one a casual reader may still read as a gap is the state program's name
sitting inside an otherwise Spanish corrections block. It is correct, and it is
the thing to explain rather than to translate.

## Before a native speaker reads it

`design/README.md` § Languages lists the six things to look at first, in order.
The register is the risk, not the vocabulary: `es-US.json` is `usted`
throughout (31 uses, no `tú`), and whether it *stays* the register of a
government notice — rather than drifting into either a brochure or a manual —
is what no test here can measure.
