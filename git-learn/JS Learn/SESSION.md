# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

**Nothing.** Working tree clean as of 2026-08-18.

**Phase 1.5's pattern for Track A/B — A3 and A4 are done.** Six lessons:
`a3/0001` `buildUrl`, `a3/0003` `retryPlan`, `a3/0004` `applyPage`,
`a4/0001` `decideStartup`, `a4/0002` `screensFor`, `a4/0003` `planFor`.
Verified 27 → 33. A3 and A4 are now fully verified except `a3/0002`, which is
TypeScript and cannot be.

**Reframing a lesson around its function keeps finding contradictions between
lessons** — three so far, all where one page states a rule and a neighbour's
code breaks it:

- `a3/0002` throws `ApiError(429, retryable: true)`; `a3/0003`'s retry helper
  tested `status < 500` and so **never retried a rate limit**, the one response
  that says come back and when.
- `a4/0001`'s splash screen sent a **network error to Login**, destroying a
  valid session over a tunnel — while `a4/0003` says in prose not to.
- `a4/0002`'s own quiz warns against leaving Login in the stack; nothing tested
  it until `screensFor`.

Next: `a5` (5 lessons) is the largest remaining logic-rich module.

The answer-position work is **finished**: `render-as-authored` is **0**, so
every question in the course now shuffles its options. Three defects surfaced
*because* of that work, all bigger than the work itself:

- **A mis-keyed question.** `a3/0002` q10 asked which base URL is correct, its
  explanation said the no-trailing-slash one, and `correct` pointed at the
  trailing-slash one. Swept all 2,575 for "Option X is correct" disagreeing with
  the key: exactly one. Fixed.
- **17 inverted `which-breaks` questions**, each showing "Which of these will
  fail?" while rewarding the option that works. Fixed, and the check that should
  have caught them is fixed too.
- **An all-of-the-above answer that was safe only by accident** (`01/0006` q27).

## Next action

**Ask the student where they actually are.** Last stated position: *partway
through Module 01*, somewhere in `0006`–`0012`, given by them on 2026-08-17.
Never infer this from the files — that inference is what produced the "Modules 1
and 2 complete" claim that mispitched the course for months.

Everything ahead of them is now retrofitted and verified, so the honest answer
is usually that the course does not need more written material. What remains, in
the order it becomes due:

| Work | Gate |
|---|---|
| **Nothing queued for Module 02** — the cleanup is done, see below | — |
| **Phase 3** — the ten C-modules | just-in-time; the student is nowhere near |
| **Phase 4** — the operating track | after launch |
| The three orphan tables | blocked behind the B2 rewrite, itself behind C5/E2EE — now in `scripts/known-issues.json`, so the audit is green and they are still listed |

Nothing else is queued. M1 and M2 are both done, and the `0013` rename landed
2026-08-18.

### The framing cleanup, and what the word-grep could not see

This file asserted **"Module 02 carries zero WhatsApp-clone framing"** after the
Phase 1.5 retrofit. Measured on 2026-08-18 it was false, and the cleanup that
followed found the claim was not merely cosmetic — **the framing was load-bearing
and several lessons were broken by it**:

- `0009` sample rows 1–2 were tokens, rows 3–4 were still `Family Group` and
  `Work Team` with `name`/`preview`. The renderer reads `item.name[0]`, so the
  two *token* rows threw `TypeError`.
- `0014` had the same split list, plus one line still carrying shell-mangle
  damage (`timy!'`) from a previous bulk edit.
- `0013`'s detail screen rendered `isGroup`, a variable it never destructured —
  `ReferenceError` in the capstone.
- `0007`'s eighth fixture was the only non-token in the list, so that row
  rendered blank.
- `0002` defined `handleChatPress` while the call site said `handleTokenPress`.
- `0009` showed a badge reading **"Group"** whenever a token was *paused*, and a
  header reading **"online"** — presence, in a product built so nobody learns who
  the holder is.

**The word-grep was the weakest instrument in the box.** Searching `chat` and
`avatar` never found the largest signal: WhatsApp's whole palette — `#075E54`,
`#25D366`, `#128C7E`, `#DCF8C6`, `#ECE5DD` — was the app chrome in 13 of 15
files, 95 occurrences. When looking for framing, **grep the colours too.**

No palette had to be invented: `0003` §10 already defines `TokenColors` and says
"keep these handy — you'll use them throughout the course". It had been written
and never applied, so the reference and the examples on the same page disagreed.
The mapping is 1:1 — ink/accent/accentSoft/threadBg.

**Four deliberate contrasts are kept and must stay** — `0002:400-401`,
`0003:370`, `0013:76`, `0014:33`. Each says some version of *"a chat app shows a
face here; Token cannot, because there is no one to picture."* They are the
sharpest statements of the product in the module, and a bulk replace eats them
first. That is the reason this was done file by file, with the editor, and
**never through a shell** — the same rule that broke four quiz strings in `0011`.

## Blocked on

Nothing.

---

## Phase status

Per-item status only. The plan itself is in `TOKEN-TRACK.md`; the counts are in
`PROGRESS.md`; why any of it went the way it did is in `HANDOFF.md`.

| Phase | Status |
|---|---|
| 0 — repair the map | done |
| 1 — unblock where the student is | **done**, all five items |
| 2 — deepen the spine | done (16 of 16 deepenable; 4 deliberately skipped as rewrites) |
| 3 — the ten C-modules | not started, deliberately |
| 4 — the operating track | not started, deliberately |
| M1 — verify what was never executed | done |
| M2 — the invalid example codes | done |

### Phase 1 items

| # | Work | Status |
|---|---|---|
| 1.1 | Retrofit `01/0005`–`01/0012` | done |
| 1.2 | Module 01 capstone | done — Token repo `221e6b0` |
| 1.3 | One "explain it in your own words" prompt per lesson | done, Modules 01 and 02 |
| 1.4 | Spaced review from the previous two lessons | done — built into each retrofit |
| 1.5 | The same retrofit for Module 02 | **done** — all 14, 2026-08-17 |

### Phase 1.5 — the exercise in each Module 02 lesson

Every one is a plain function the component calls, so `verify-lesson.mjs` can
run it. Each has a `--wrong` case file beside it in `scripts/cases/`.

| Lesson | Exercise |
|---|---|
| `0001` Expo & EAS | `resolveProfile` — `eas.json` `extends` chains, cycles, unknown names |
| `0002` core components | `toRowModel` — the badge that must be `null`, never `0` |
| `0003` styling & flexbox | `layoutRow` — flex is a share of the leftover, divided by the sum |
| `0004` textinput & keyboard | `normaliseCode` — the 31-character alphabet, not `[A-Z0-9]` |
| `0005` useState | `applyTokenAction` — revoked is permanent; identity on a no-op |
| `0006` useEffect | `subscribeToToken` — the cleanup a subscribe hands back |
| `0007` FlatList | `mergePage` — overlapping pages, duplicate keys |
| `0008` navigation | `applyNavAction` — navigate vs push vs replace |
| `0009` passing data | `toRouteParams` — build by naming, never spread-and-delete |
| `0010` forms | `validateRegistration` — never transform a password, only measure it |
| `0011` images | `prepareAttachment` — EXIF carries GPS |
| `0012` loading states | `viewState` — four checks, and the order is the whole answer |
| `0013` token list screen | `orderTokens` — `sort()` reorders React state in place |
| `0014` message thread | `buildThreadItems` — calendar days are not durations |

---

## Notes for the next session

Durable gotchas only. Anything narrative is in `HANDOFF.md`.

### Writing a lesson

- **`--wrong` mistakes take `impl`, not `code`.** Getting it wrong yields a row
  of identical `ReferenceError`s that look like a verifier bug and are not.
- **Choose fixture values that differ from what a wrong answer produces.** Five
  self-checks in Phase 1.5 passed a wrong answer by coincidence — three children
  all 100dp wide, a screen at stack index 0, a label unchanged by trimming, a
  password long enough to survive it. Every one was caught by a wrong-case, never
  by the self-check passing.
- **Where a mistake can throw rather than return, wrap that check on its own.**
  An uncaught throw aborts every check below it and hides what it never reached.
- **Look for the plain function before reaching for `--unverifiable`.** The
  prediction that a lesson has no runnable logic was wrong four times out of four
  in Phase 1.5 — flexbox is arithmetic, the keyboard lesson is string
  normalisation, the image picker is a payload filter, and Expo setup is
  `eas.json` inheritance.
- **Never bulk-edit lesson content through a shell**, not only when writing it.
  A blanket replacement injected real newlines into four quiz strings in `0011`
  and broke the whole block.

### The two findings from the answer-position work

- **A check can be right about *what* and wrong about *how words end*.** The
  which-breaks inversion check has existed since August and missed 17 questions
  because `\bcorrect\b` does not match **"correctly"** — and the adverb is how
  people naturally word that question. Same family as the fill-blank check whose
  `_{2,}` matched `__dirname`. Do not assume a stem covers its inflections.
- **`--unverifiable` is a property of the lesson, not of the run**, and
  `verification-log.json` is the only place it is recorded. Running
  `verify-lesson` without it fails on the missing self-check, and **a failing run
  deletes the entry**, so the lesson silently drops to `unverified`. I did this
  to `a3/0002`. Check the log before re-verifying a lesson you did not write.

### Why 69 lessons sat at `unverifiable`

Every stated reason was **true** — an Express route really does need Postgres.
The problem was that `--unverifiable` is a property of the *lesson*, so one
un-runnable exercise made the whole page unrunnable and any pure function in it
went untested. `a3/0004` is the case in point: its exercise is a FlatList
screen, and its actual subject is what to do with a page of results when it
arrives, which is a plain function.

`createSolution` now takes its own `unverifiable: "<reason>"`. The screen is
excused, `applyPage` is executed, and the lesson is `verified`. **At least one
exercise must actually execute** or the status stays `unverifiable` — otherwise
the opt-out becomes a way to mark work done by declaring it undoable.

Rough shape of the remaining 68: **~24 have an extractable function** (validation,
routing, merging, retry rules, rate limiting), **~40 are genuinely infra** (a
device, a VPS, two phones), and **4 are TypeScript**, which the runner cannot
execute at all — that one needs a TS-aware runner, not a rewrite.

### Tooling limits worth knowing

- **Answer position is now fully handled.** 61.4% of keys sit at index 1 and the
  audit still prints it, but `quiz.js` shuffles options at render and — since
  2026-08-18 — **every** question shuffles, because the 48 whose explanations
  named a position have all been reworded. `render-as-authored: 0`. If that
  number ever rises, a new explanation has named an option by letter or place. `CLAUDE.md` claimed the ~64% scoring
  exploit was live long after the renderer had killed it — stale prose again,
  same shape as the playground loop-guard note. The stdout line now says
  "authored; shuffled at render".
- **The one real residual is 48 questions** whose *explanation names a position*
  ("Option A creates…"). `quiz.js` refuses to shuffle those, because shuffling
  would contradict the explanation, so they render as authored (1=52.1%). The
  fix is to stop writing explanations that name positions — then they shuffle
  like everything else. Deepening-pass work; the audit reports the subset.
- **`test-quiz-shuffle.mjs` guards the whole argument.** The defence against
  "pick the second option" is one function, and the docs now tell authors not to
  worry about it — so a silent regression there would be expensive. Verified by
  neutering the Fisher-Yates loop: the suite goes to 100% stay-put and fails.

- **`verify-lesson.mjs` has no opinion about display `<pre>` blocks** — it runs
  what a lesson executes, and a display block is executed by nobody. That gap is
  now covered by `check-pre-blocks.mjs`, which runs inside the audit as an
  error. Its scope is one defect: an unterminated `'`/`"` in a JS block. It is
  **not** a syntax check, and deliberately so — the blocks are JSX, fragments,
  SQL and shell, and a parser would reject nearly all of them.
- **When a check is tuned to silence false positives, write the suite that
  proves it still fires.** `check-pre-blocks` went from 71 findings (all wrong)
  to 0 across three suppressions. Zero findings is either a clean course or a
  dead check and the two are indistinguishable from outside;
  `test-check-pre-blocks.mjs` is the only thing that tells them apart, and it
  asserts the original `0014` damage is still caught.

- `verify-lesson.mjs` shims `setTimeout` and `clearTimeout` onto a drainable
  queue but **does not model Node's phase ordering** — `process.nextTick` and
  `setImmediate` questions are skipped, because the sandbox gets them wrong.
- `setInterval` is still not shimmed. It has not bitten anything yet.
- The `dom-sandbox` selector engine has no `>`, `+`, `~` or pseudo-classes. If a
  lesson needs one, add it to the sandbox *and* to `scripts/test-dom-sandbox.mjs`
  in the same commit.
- A file containing **`audit-allow-token-fixtures`** is skipped by the
  example-code check. `02/0004` and `01/0012` have it, because their subject
  *is* invalid codes. The alphabet check is an error and still applies to
  opted-out files — verified by injection, not assumed.
- **`audit-allow-token-here`** is the line-level version, and `CLAUDE.md` is its
  only user: it names `MERC-8GH2-LP4X` while explaining why that code was wrong.
  A whole-file opt-out there would suppress the canonical-code protection that
  matters most. Verified that a bad code *elsewhere* in `CLAUDE.md` is still
  caught.
- **Warnings are down to 1** (a real broken link in legacy Module 07). Both
  token warnings were correct content — the list was mostly noise, which is the
  state that hid three unanswerable questions behind 24 blank-count warnings.
  Treat a warning as real now.

### Standing facts

- **Student progress is never inferred from the files.** It comes from the
  student or from `progress.js` localStorage.
- **When the student reaches `01/0013`** they need Node 19+ (`node -v`) —
  `crypto.getRandomValues` as a global is the only environment requirement in
  Module 01.
- The three orphan tables (`participants`, `deletion_queue`, `calls`) are schema
  gaps for the B2 rewrite, not quick fixes. B2 is itself waiting on C5 (E2EE).
  They are acknowledged in `scripts/known-issues.json` — **acknowledged is not
  fixed.** When B2 lands and the tables exist, the audit will fail with
  "no longer matches any error"; that failure is the signal to delete the
  entries, not to re-word them.
- **The audit exits OK as of 2026-08-18** — the first time in the project's
  history. Treat any red audit as real from here on; that is the whole point of
  having spent the effort to make it green.
- **Module 02's framing cleanup is done** (2026-08-18) — fixtures, identifiers
  and palette, all 14 lessons re-verified. Four `avatar`/`chat` hits remain **on
  purpose**: they are the "a chat app shows a face here, Token cannot" contrasts
  at `0002:400-401`, `0003:370`, `0013:76`, `0014:33`. Do not "finish the job"
  by removing them.
- **When checking for framing, grep the colours, not just the words.** The
  word-grep missed 95 WhatsApp-palette hexes across 13 files — the biggest
  signal in the module. Product framing hides in constants.
- **A reframe that stops at the prose leaves crashes behind.** Phase 1.5
  rewrote the narrative and left the fixtures; five lessons had a live
  `TypeError`, `ReferenceError` or blank row where the two halves met. If a
  rename touches a data shape, re-run the lesson, and check *every* row of a
  sample list — the defect was always in the entries nobody re-read.
- **The student has asked not to be asked where they are in Module 01.** Do not
  ask again, and do not infer it from the files either. Pitch to the profile in
  `CLAUDE.md` and let them steer.
- **A rename is never just the file.** `02/0013` reached into
  `search-index.json`, the module README, the nav in two neighbouring lessons,
  the wrong-case file's name *and* its header comment, and
  `verification-log.json`. The log is generated: prune the stale key with a
  script and let a real verifier run write the new one.
