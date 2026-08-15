# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress — PHASE 1

Phase 0 is done (see `HANDOFF.md` for the 10 steps and their commits).
Phase 1 is COURSE-REVIEW.md §6 item 1.1: retrofit practice into `01/0005`–`01/0012`,
one or two lessons at a time, never batched ahead.

| Lesson | Status |
|---|---|
| `01/0005-loops` | done — `f9230c5` |
| `01/0006-scope-and-closures` | done — `be65077` (+ `scripts/verify-lesson.mjs`) |
| **`01/0007-dom-and-browser-apis`** | **in progress — blocked on tooling, see below** |
| `01/0008-events` | not started (same tooling blocker) |
| `01/0009`–`01/0012` | not started |

### Unit 1 — `assets/dom-sandbox.js` — DONE

`0007` teaches the DOM and had no playgrounds or exercise. It could not get the
standard practice pattern until two things were fixed, both decided 2026-08-15:

1. **Safety.** `playground.js` runs student code through `new Function` in the
   page's own scope, so `document` was the *real lesson page* and
   `localStorage` the *real* one — where `progress.js` keeps completed lessons.
   `document.body.innerHTML = ""` deleted the lesson being read;
   `localStorage.clear()` erased the student's progress. Beginners type both on
   purpose while experimenting.
2. **Verifiability.** `verify-lesson.mjs` runs under Node with no DOM, so it
   *skipped* every `predict-output` containing `document` and DOM playgrounds
   failed open. CLAUDE.md requires verifying by running, so DOM lessons were
   unverifiable in principle, not just in practice.

Shipped:

- `assets/dom-sandbox.js` — in-memory `document`, `window`, `localStorage`.
  Selectors, content, classList/style, create/append/remove, bubbling events.
  Limits are listed at the top of the file; read them before leaning on one.
- `playground.js` — `createPlayground(id, code, { dom: true, html })`, fresh
  sandbox per Run, DOM preview pane above the console output.
- `quiz.js` — optional `html` on `predict-output`, so a DOM question shows the
  page it is asking about.
- `verify-lesson.mjs` — loads the same sandbox, so DOM questions and
  playgrounds are executed instead of skipped.
- `scripts/test-dom-sandbox.mjs` (55 assertions) and
  `scripts/test-playground-dom.mjs` (11) — both green.

## Next action

**Unit 2: retrofit `01/0007-dom-and-browser-apis`.** The practice pattern
(playground per concept, one deliberately broken, one `createSolution()`
exercise with a behaviour-testing self-check, spaced review) — every playground
in it must pass `{ dom: true }`.

Two things to fix while in there, both noted during the sandbox work:

- The lesson is written around a **WhatsApp clone** — "your WhatsApp clone",
  Priya's chat, message bubbles. CLAUDE.md requires Token framing
  (`tokenCode`, `issuedTo`, `revokedAt`). This is a rewrite of the examples,
  not a find-and-replace.
- It teaches `localStorage` in 18 places with no mention that a token is
  capability material. Worth one honest callout.

Then `01/0008-events`, which the sandbox's event support already covers.

## Blocked on

Nothing.

## Notes for the next session

- The audit found a **fourth** orphan table beyond the manual review:
  `calls`, queried by `b7/0002` and `b7/0003`, created nowhere. Together with
  `participants` and `deletion_queue` these are schema gaps to close when B2 is
  rewritten for E2EE — not quick fixes.
- Student progress (which lessons Ashish has actually studied) is **never**
  inferred from files. It comes from him or from `progress.js` localStorage.
