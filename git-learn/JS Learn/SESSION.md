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
| `01/0007-dom-and-browser-apis` | done — `6a2221f` (sandbox) + `8700f19` (retrofit) |
| `01/0008-events` | done — `e13a323` (sandbox) + `5d941f0` (retrofit) |
| `01/0009-promises-and-async-await` | done — `caafcf6` (tooling) + retrofit |
| `01/0010-arrays-and-objects` | done — `c16b9be` |
| `01/0011-modern-javascript-es6` | done |
| **`01/0012-error-handling`** | **next — last of Module 01 and of Phase 1** |

### Unit 6 — `01/0011-modern-javascript-es6`

Checked the overlap before writing, as planned, and it is worse than expected.
Measured across module 01:

| 0011 section | Already taught in | Verdict |
|---|---|---|
| §1 `let`/`const` | 0002, 0006 | redundant |
| §2 arrow functions | 0003 — 17 mentions, 41 `=>` | redundant |
| §3 destructuring | **0010** §3 | redundant |
| §4 spread | **0010** §5 — 19 mentions + the exercise | redundant |
| §5 template literals | 0002 — 8 mentions | partial |
| §6 `?.` / `??` | **nowhere in the course** | new |
| §7 modules | **nowhere in the course** | new |

Roughly 60% of the lesson re-teaches material the student has already met, two
lessons of which I wrote in this session. **Restructured rather than rewritten
as-is**: one short consolidation section that names the syntax he is already
using, then the lesson's weight on `?.`, `??` and modules.

`?.` and `??` earn the space — they are the direct answer to the
returns-null/undefined traps built up in 0007 (`querySelector`), 0009 (a
rejected promise) and 0010 (`find`). The broken-on-purpose playground is
`||` vs `??` on a rule of `maxUses: 0`, which silently becomes 5 — a
capability system quietly granting uses that were never authorised.

**Modules deliberately have no playground.** `import` resolves real files and a
playground runs one snippet with no file system or bundler, so it cannot work.
The lesson says that outright rather than faking it with objects, which would
teach the wrong mental model.

#### Tooling fix found by writing it

Two playgrounds shipped with over-escaped backticks (`\\\`` where `\``
was meant), so the code string contained `\`` outside a string and did not
parse. **`verify-lesson.mjs` reported both as `ok`** — it treats any throw as
"deliberate breakage is expected", and a `SyntaxError` was indistinguishable
from a lesson's intentional `TypeError`.

Section 2 now fails on `SyntaxError` specifically, with a message saying
deliberate breakage must throw at run time rather than fail to compile. Proved
both directions on a fixture: malformed code fails, a deliberate `TypeError`
with zero output still passes. An earlier version also failed any playground
that threw with no output — that would have wrongly flagged `0007`'s
`pg-null-crash`, which legitimately crashes on its first statement.

### Unit 5 — `01/0010-arrays-and-objects` — DONE

Checked first, as planned. **No premise-in-comment defects** — the pattern that
broke 0007 and 0008 is absent here — and it is plain synchronous JavaScript, so
no tooling work was needed. Shipped:

- 6 playgrounds. `pg-reference-trap` is the broken-on-purpose one and it is the
  best fit yet for that slot: assigning an object to a second variable is not a
  copy, so the "copy" writes straight through to the original. Nothing throws;
  the data is just wrong. `pg-shallow` then does the harder half — spread
  protects the top level and silently shares everything nested.
- Exercise: `revokeToken(tokens, code)`, 11 checks. This is CLAUDE.md's state
  rule written out by hand. Every one of the 8 mistakes produces a **correct
  result array** — the bug only shows in what happened to the original, which
  is why the self-check snapshots it with `JSON.stringify` before calling.
  One check is subtler: unchanged tokens must be the *same objects*, since
  rebuilding them all is correct data that defeats React's identity check.
- Removed **4 Firebase mentions** (out of scope) and reframed from the
  WhatsApp clone (23 "Priya", 13 "Ashish") to the token list.
- Fixed 2 invalid token codes that were in the lesson (`BANK-4FJ1`,
  `SHOP-9KL3` — the `1` and `L` are excluded, and both were 8-char rather than
  the 12-char format). Also caught 2 I introduced myself as "not found"
  fixtures (`NOPE-0000-0000`) — a negative fixture still teaches a shape, so
  they are now valid codes that simply are not in the list.

### Unit 4a — async tooling — DONE

The caution left here was right, and the problem was worse than "may verify as
empty". Proved with a throwaway async fixture before touching the lesson:

- `verify-lesson.mjs` ran everything **synchronously**, so no promise callback
  ever executed. Playgrounds printed their sync lines and reported **`ok`** —
  silently passing with the async output missing. Correct `predict-output`
  answers were reported as *wrong*: `"1\n2\n3"` verified as `"1\n2"`.
- `runLikePlayground` is now `async` and yields past the microtask queue with
  `setImmediate` — once after the synchronous pass, and again after every
  timer callback. That reproduces real event-loop ordering, which the
  `sync → micro → timer` question depends on. All four call sites await it.
- Unhandled rejections are captured and recorded rather than killing the
  process. A lesson demonstrating a rejected promise without `.catch()` would
  otherwise have taken the whole verifier down.

The browser had the mirror-image bug. `settle()` rendered once at ~30ms, so
`await wait(300)` printed nothing on screen while the verifier — which drains
its whole timer queue — saw it. **The verifier and the browser disagreeing
about a lesson is the exact failure mode this tooling exists to prevent.**
`playground.js` now re-renders across the same 2s budget the loop guard uses,
cancelling pending renders on Run and Reset so a late render cannot repaint
stale logs.

`scripts/test-playground-dom.mjs` 11 → 15 assertions. The new async ones run on
**real timers**, because draining a fake queue instantly would fire every
scheduled render before the async output existed and the test would pass
against the old code. Confirmed it has teeth by reverting the schedule to
`[0, 30]` and watching it fail.

### Unit 3a — sandbox gaps 0008 needed — DONE (`e13a323`)

Checked against the lesson before writing, as planned. `dataset` (the
delegation section identifies rows with it), arbitrary event properties
(`shiftKey`), and form submit. `form.submit()` deliberately throws rather than
aliasing `requestSubmit()` — in a browser it skips the submit event entirely,
and pretending otherwise would teach the opposite of the truth. `focus`/`blur`
now dispatch and correctly do not bubble. Sandbox suite 55 → 72 assertions.

### Unit 3b — retrofit `01/0008-events` — DONE

- 6 playgrounds. `pg-listener-trap` is the broken-on-purpose one and it is the
  best of the set: `addEventListener("click", handleSend())` prints its
  message *before* the click and then does nothing forever, so the student
  sees why the bug is convincing rather than just being warned about it.
- Exercise: `setupTokenActions(listEl, onRevoke)` — delegation, 9 checks.
  4 alternative styles pass, 6 mistakes each trip the right check. The two
  that matter both look correct against the rows already on the page:
  looping over the buttons (only the late row exposes it) and `matches`
  instead of `closest` (only a click on the inner label exposes it).
- Reframed from the WhatsApp clone to Token: revoking from the token list,
  the redemption page composer as the mini-project.
- **All 5 `predict-output` questions were unrunnable.** Each described the
  user action in a trailing comment (`// User clicks the button once`), so
  the code did nothing — and referenced an element that did not exist, so it
  threw and the verifier skipped it. They now carry `html` and perform the
  action, and are executed.

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

### Unit 4b — retrofit `01/0009` — DONE

- 8 playgrounds. `pg-await-trap` is the broken-on-purpose one: a missing
  `await`, so `token.code` is `undefined` and nothing throws anywhere.
  `pg-parallel` prints the sequential and parallel runs side by side, showing
  both that the two requests overlap and that `Promise.all` returns results in
  argument order rather than completion order.
- Exercise: `loadTokenScreen(code, api)` — `Promise.all` plus `try`/`catch`,
  9 checks. The mistake the exercise exists for is **sequential awaits**: it
  returns the correct answer and never throws, it is just twice as slow.
  Nothing but the start/finish ordering check can see it, so the fake api
  records `start:`/`end:` events and the check requires both to have started
  before either finished — deterministic, and it works identically under the
  verifier's fake timers and the browser's real ones.
- **The 6 existing `predict-output` questions were all correct** and had simply
  never been runnable. With the async tooling fixed they verify as written —
  the opposite of 0007 and 0008, where the questions themselves were broken.
- Removed the one **Firebase** mention (out of scope per CLAUDE.md) and the
  placeholder code `TOKEN-ABC`, which contained an excluded `O` and was not in
  the 12-character format.

## Next action

**Unit 7: retrofit `01/0012-error-handling`.** This closes Module 01 and
Phase 1 item 1.1.

Check the overlap first, as with 0011 — `try`/`catch` is already taught in
0009 §5 (with `await`), and 0011 covers `?.`/`??` as the way to avoid a whole
class of error. What is likely left and genuinely uncovered: `throw`, custom
error types, `finally`, error boundaries as a concept, and validation errors
versus network errors. Confirm before writing.

Two things to check before writing, both of which have now bitten more than
once:

- **Premise-in-comment questions** (`// Given: <div>…`, `// User clicks`).
  Found in 0007 (3) and 0008 (all 5); absent in 0009 and 0010. Cheap to grep:
  `grep -c "// Given\|// User \|// Assume"`.
- **Token codes with excluded characters.** Found in 0009 (`TOKEN-ABC`) and
  0010 (`BANK-4FJ1`, `SHOP-9KL3`). Worth running the alphabet check over any
  lesson before and after editing it — including on codes you write yourself.

Note that 0011 covers ES6 syntax, so it overlaps 0010 (spread, destructuring)
and 0009 (arrow functions, promises). Check what is genuinely left to teach
before writing a lesson that repeats two others.

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
