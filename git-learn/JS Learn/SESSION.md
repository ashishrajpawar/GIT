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
| `01/0007-dom-and-browser-apis` | done — sandbox + retrofit, see below |
| **`01/0008-events`** | **next** — sandbox already covers bubbling events |
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

### Unit 2 — retrofit `01/0007-dom-and-browser-apis` — DONE

Practice pattern plus the full Token reframe. Verified by running:

```bash
node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0007-dom-and-browser-apis.html \
     --wrong scripts/cases/0007-dom-and-browser-apis.mjs
```

- 8 playgrounds, all `{ dom: true }` against a shared `PRACTICE_PAGE`.
  `pg-null-crash` is the broken-on-purpose one: a mistyped selector, so the
  student meets `Cannot set properties of null` deliberately rather than by
  accident at 11pm.
- `pg-content` is the one that earns the sandbox — the same hostile string
  through `textContent` and `innerHTML` side by side, with the preview showing
  `&lt;b&gt;` next to a real `<b>` element.
- Exercise: `renderTokenList(tokens)`, 8 behaviour checks. 4 alternative
  correct styles pass; 6 mistakes each trip only the checks they genuinely
  break (the first pass had the no-clear mistake also failing the escaping
  check, which would have told a student their escaping was broken when it
  was not — fixed by scoping the checks).
- Reframed from the WhatsApp clone to Token throughout: the redemption page
  at `tokn.app/t/CODE`, issuing and revoking, `issuedTo` as untrusted input.
  The mini-project is now a token manager that generates codes from the real
  31-character alphabet.
- **Added the missing `localStorage` section.** The quiz had 6 questions on
  it; the prose never taught it. With a callout on why a token code is
  capability material and does not belong in `localStorage`.
- Three quiz questions that described their starting page in a code comment
  now use the real `html` field, so they are executed rather than skipped.

## Next action

**Unit 3: retrofit `01/0008-events`.** The sandbox already does
`addEventListener`, bubbling, `currentTarget` vs `target`,
`stopPropagation`, `preventDefault`, `click()` and `event.key`, so no tooling
work should be needed first. Confirm that before writing.

## Blocked on

Nothing.

## Notes for the next session

- **Timers are not sandboxed.** `setInterval` and `setTimeout` in a playground
  reach the real ones, so a student's `setInterval` keeps running after the
  Run finishes. It has not bitten anything yet — quiz Q19 in 0007 verifies
  correctly because Node has these globals — but 0008 (events) and 0009
  (promises) are where timer code arrives in bulk. Decide there whether to
  shim them; do not do it speculatively.
- The `dom-sandbox` selector engine deliberately has no `>`, `+`, `~` or
  pseudo-classes. If a lesson needs one, add it to the sandbox *and* to
  `scripts/test-dom-sandbox.mjs` in the same commit.
- The audit found a **fourth** orphan table beyond the manual review:
  `calls`, queried by `b7/0002` and `b7/0003`, created nowhere. Together with
  `participants` and `deletion_queue` these are schema gaps to close when B2 is
  rewritten for E2EE — not quick fixes.
- Student progress (which lessons Ashish has actually studied) is **never**
  inferred from files. It comes from him or from `progress.js` localStorage.
