# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

**Nothing.** Working tree clean. **ADR-0008 is accepted and the A7 pass it
unblocked is done** — four commits, 2026-08-20, audit green, five suites pass.

**The student delegated the decision** ("u decide"). ADR-0008 records that
explicitly, because it is the one architecture decision here that is not
theirs and the cost lands on a bill they pay. It also now carries a *What would
change our mind* section, so reversing it is an argument against stated
criteria rather than a fresh fight. **If the student disagrees, overturn the
ADR — the lessons now follow it and should not be edited first.**

What landed:

| Unit | Repo | Result |
|---|---|---|
| Accept ADR-0008; retire "offered" from `ARCHITECTURE.md`, ADR-0003, ADR-0004 | token | `248af2c` |
| `a7/0001` — the two copyable snippets had no `iceTransportPolicy` | course | `2f081f8` |
| `a7/0005` — rewritten off the toggle premise, + M3 | course | `57e81de`, now **verified** |
| `a7/README.html` — "giving users control" | course | in `57e81de` |

**A7 was worse than the missing line predicted.** `a7/0005` was not omitting the
policy — it was a complete worked implementation of the design ADR-0008
rejects: an `AsyncStorage` toggle, `iceTransportPolicy: relayOnly ? 'relay' :
'all'`, **defaulting to off**, and an exercise telling the student to build it.
Its guidance read *"Tokens for known contacts (friends, family) — relay OFF is
fine. They already know where you live"*, and **a quiz question keyed that same
reasoning as correct**, calling it "Token's philosophy of user-controlled
privacy rules".

That is a **product** error wearing WebRTC clothes. Token's value is with
entities that do *not* know the user (`CLAUDE.md` § "Where the product is worth
most"). The exception was being taught as the rule.

`a7/0001` was the ordinary half and the now-familiar shape: four quiz questions
taught relay-only correctly while both snippets the student actually copies were
bare `new RTCPeerConnection({ iceServers })`. It also had **no prose section on
the topic at all** — the policy existed only in answer text.

Next: **A6 (chat/realtime)**, then the scattered singles (A11, B2, B3, B5, B7,
B10). Also still open: the two follow-ups below, both security-shaped and both
cross-module.

**`a8/0003` had the worst defect found so far and it was not the function.**
The browser `RTCPeerConnection` had no `iceTransportPolicy: 'relay'`, TURN was
commented out, and the playground taught "best path chosen: host (LAN)". ICE
candidates *are* IP addresses, so a direct path hands the holder the issuer's
home IP — on the page a stranger opens after scanning a QR code. **Check
`a7-voice-video` for the same omission**; it is the mobile half of the same
decision and was written by the same pass.

### Follow-up this raised, NOT yet done

**The code-in-the-URL-path defect is course-wide, not just `a8/0002`.** ADR-0007
says codes never go in a URL path; `b10/0001` and `01/0012` get it right with
`POST /api/redeem` and a body. These do not:

| Lesson | Form |
|---|---|
| `b3/0002` | `/api/tokens/:code` for GET, PATCH, DELETE — and in ~6 quiz questions |
| `a9/0002` | `GET /api/tokens/${code}/redeem` |
| `a2/0002` | `PATCH /tokens/:code` |
| `a3/0002` | `DELETE /tokens/:code` in a quiz explanation |

`a8/0002` is now internally consistent and correct; the rest is a separate pass,
and it is bigger than it looks because the path form is baked into quiz keys and
explanations. **CLAUDE.md also says owner endpoints take `:id`**, so `/tokens/:code`
is wrong there for a second reason.

Smaller, also not done: the holder JWT carries `tokenCode`. The holder already
knows the code, so it leaks nothing to them — but JWTs land in logs routinely,
and ADR-0007 says the code is never logged. Worth a decision, not urgent.

**Found in `0004`, not fixed, deliberately: expiry is modelled twice.** There is
an `ExpiryPayload` rule carrying `expires_at`, and `0003` reads a
`tokens.expires_at` column. Both cannot be the source of truth. Written up in
`0004`'s "When this breaks" and left for the **B2 rewrite**, which the adjacent
storage-model note is already waiting on. Until then `0003`'s column wins.

## Next action

**Continue M3 with the A8 cluster** (redemption web, ×4) — the next group of
four, and the largest remaining. One commit per lesson, so an abrupt stop loses
at most one.

| Work | Gate |
|---|---|
| **M3** — extract the plain function from the remaining ~14 logic-rich lessons | none; A5 done, A8 ×4 is the next cluster |
| A TypeScript-aware runner, so `a2/*` and `a3/0002` can be verified | needs a decision first — see *Open questions* |
| **Phase 3** — the ten C-modules | just-in-time; the student is nowhere near |
| **Phase 4** — the operating track | after launch |
| The three orphan tables | behind the B2 rewrite, itself behind C5/E2EE. Parked in `scripts/known-issues.json` |
| The one remaining warning — a dead `privacy-policy.html` link in legacy `07` | legacy module, outside the token track |

**Do not ask the student where they are in Module 01.** They asked on
2026-08-18 not to be asked again. Do not infer it from the files either — that
inference is what produced the "Modules 1 and 2 complete" claim that mispitched
the course for months. Pitch to the profile in `CLAUDE.md` and let them steer.

### Open questions for the student

1. **How far ahead of yourself should this build?** M3 is real work that keeps
   finding real defects, but every lesson it touches is modules ahead of Module
   01. Raised twice; the answer both times was to continue.
2. **Is a TypeScript-aware runner worth building?** Four lessons can never be
   verified without one. It is the only category that a rewrite cannot fix.

## Blocked on

**Nothing.** ADR-0008 was the only blocker and it is resolved (accepted
2026-08-20, delegated by the student — see *In progress*).

One thing to raise with the student rather than act on: **relay egress is now a
certainty, not a risk.** ADR-0003 expressed the single-box ceiling in
connections and memory; relayed video adds an egress ceiling that will probably
arrive first — roughly 2,400 hours of relayed video per TB against ~38,000 for
voice. Nothing to do yet, but TURN bandwidth should be monitored from the first
deploy so the trend is visible before an invoice is. The response, if it bites,
is named in ADR-0008: narrow relay-only to `web/` redemption calls, **not**
weaken it everywhere.

---

## Phase status

Per-item status only. The plan itself is in `TOKEN-TRACK.md`; the counts are in
`PROGRESS.md`; why any of it went the way it did is in `HANDOFF.md`.

| Phase | Status |
|---|---|
| 0 — repair the map | done |
| 1 — unblock where the student is | **done**, all five items |
| 1.5 — the practice pattern in Module 02 | **done** — all 14, 2026-08-17 |
| 2 — deepen the spine | done (16 of 16 deepenable; 4 deliberately skipped as rewrites) |
| 3 — the ten C-modules | not started, deliberately |
| 4 — the operating track | not started, deliberately |
| M1 — verify what was never executed | done |
| M2 — the invalid example codes | done |
| **M3 — the plain function in Track A/B lessons** | **started 2026-08-18** — A3, A4, A5, A8 complete, A7 partly (`0005`); ~9 left |

### M3 — where it has reached

The pattern: find the pure function the lesson is really about, excuse the
un-runnable exercise with a **per-exercise** `unverifiable` reason, add a
`createSolution` + self-check, write the `--wrong` cases, verify.

| Lesson | Function | The thing it pins down |
|---|---|---|
| `a3/0001` | `buildUrl` | one slash; `0`/`false` kept, `null` dropped; encoding |
| `a3/0003` | `retryPlan` | a 429 **is** retryable; honour `Retry-After`, including `0` |
| `a3/0004` | `applyPage` | stale → same object; refresh replaces; dedupe inside *and* against |
| `a4/0001` | `decideStartup` | only 401/403 ends a session |
| `a4/0002` | `screensFor` | a forbidden screen does not exist, it is not covered |
| `a4/0003` | `planFor` | the `isRetry` guard; a 403 is not refreshable |
| `a5/0001` | `codeFromBytes` | 248 is *inside* the fold, 247 is not; short block → `null` |
| `a5/0002` | `extractTokenCode` | anchors; `https` only; normalise *then* validate |
| `a5/0003` | `displayStatus` | stored ≠ displayed; `max_uses: 0` ≠ unlimited; paused last |
| `a5/0004` | `isWithinWindow` | the overnight wrap; the morning belongs to *yesterday* |
| `a5/0005` | `shareAdvice` | unknown target ⇒ warn; safe actions ignore `target` |
| `a8/0002` | `redeemState` | the server's vocabulary is not the UI's; unknown reason ⇒ error |
| `a8/0001` | `checkWebEnv` | the `VITE_` **prefix** is the test, not the name |
| `a8/0003` | `reconnectPlan` | backoff spaces one client, only jitter spaces the herd |
| `a8/0004` | `headersFor` | route matching that neither publishes codes nor hides `/terms` |
| `a7/0005` | `relayAudit` | only the *succeeded* pair counts; only *our* side is ours to judge; no evidence ≠ safe |

**A5 note:** not one of the five had a `createExplain` prompt or loaded
`explain.js`. All five now do. A5 predates the practice pattern being made
universal, so **check the other pre-pattern modules for the same gap** — A6–A11
and B5–B10 are the likely ones. **Confirmed in A7:** `0005` had neither, which
makes this a reliable prediction rather than a guess. Assume the gap is present
in every pre-pattern module until checked.

**A7 note — check the lesson's *premise*, not only its snippets.** Every earlier
M3 pass looked for wrong code inside a lesson whose framing was sound. `a7/0005`
was the opposite: the code correctly implemented a design that was itself
rejected, so nothing in the file looked wrong on its own terms. A quiz question
even keyed the rejected reasoning as *correct*. **A lesson can be internally
consistent and still teach the wrong thing** — the check that catches it is
reading the lesson against the ADRs, not against itself.

**A7's other three lessons are clean and do not need re-checking.** `0002`,
`0003` and `0004` never construct an `RTCPeerConnection` — they use the wrapper
from `0001`, whose single construction site is now correct. `0002`'s one
`RTCPeerConnection` hit is the word inside a cleanup description. They remain
`unverifiable` (device + TURN) and are M3 candidates only if a plain function
turns up in them; nobody has looked yet.

**Every A5 lesson contained a defect in its own prose or snippets, not just a
missing exercise.** Read what a lesson already ships before writing the
exercise around it — **five times out of five**, the shipped snippet was the
thing that was wrong:

- `0001` argued at length for rejection sampling and never made the student
  write it.
- `0002` printed a table saying HTTPS is required, then validated with `https?`
  three sections later, and its `extractTokenCode` had no `^`/`$`.
- `0003` was the worst: `GET /tokens` returned `code` in every row against
  ADR-0007, its `Token` interface typed `max_uses` as non-nullable so
  "unlimited" was inexpressible, and its sample row had `max_uses: 0` on an
  *active* token with three uses — which contradicts `01/0011`, where the
  student actually is.
- `0004` is the sharpest: its playground wrote `payload.start`, `max_per_day`
  and `allowed`, which are **precisely** the field names its own "When this
  breaks" section says arrive at the server as `undefined`. A lesson can
  document a bug in prose and demonstrate it in code on the same page.
- `0005` called the clipboard "a neutral medium" while `0001` spends a section
  explaining it is a shared surface every app can read and both platforms sync
  across devices. Both were half-right — neutral about its *destination*, not
  about its *exposure* — and the fix was to say which.

**Two lessons can each be right and still contradict.** Three of the five A5
defects were cross-lesson (`0003` vs ADR-0007 and `01/0011`, `0004` vs `0003`,
`0005` vs `0001`), and none is visible from inside the lesson that carries it.
The audit cannot see these either. Grepping the neighbour for the same noun —
`code`, `max_uses`, `expires_at`, `clipboard` — is what found all three.

**When a lesson's data shape changes, grep the JSX in the same commit.** Fixing
`0003`'s sample response left `{item.code}` rendering a field that no longer
existed, plus `status={item.status}` (the exact bug the new section describes)
and `max_uses > 0` (which hides a zero limit). One prose fix, three live
defects downstream — the Phase 1.5 lesson, again.

Remaining, roughly: **~10 have an extractable function** (A6,
A11, B2, B3, B5, B7, B10 …), **~40 are genuinely infra** (a device, a VPS, two
phones, a live TURN server), and **4 are TypeScript**, which the runner cannot
execute at all.

---

## Notes for the next session

Durable gotchas only. Anything narrative is in `HANDOFF.md`.

### Writing a lesson

- **`--wrong` mistakes take `impl`, not `code`.** Getting it wrong yields a row
  of identical `ReferenceError`s that look like a verifier bug and are not.
- **Choose fixture values that differ from what a wrong answer produces.** Five
  self-checks in Phase 1.5 passed a wrong answer by coincidence. Every one was
  caught by a wrong-case, never by the self-check passing. In M3 this means
  things like a 12-second `Retry-After` (unlike any backoff value) and a
  3-held/2-incoming page that overlaps by one *and* repeats one of its own.
- **Where a mistake can throw rather than return, wrap that check on its own.**
  An uncaught throw aborts every check below it and hides what it never reached.
- **Look for the plain function before reaching for `--unverifiable`.** Wrong
  four times out of four in Phase 1.5, and wrong six times out of six in M3.
- **Never bulk-edit lesson content through a shell**, not only when writing it.
  A blanket replacement injected real newlines into four quiz strings in `0011`.
- **Never write an option that refers to the other options** — not "All of the
  above" (the audit errors) and not "All three" (the audit cannot see it).
  Restructure so each option stands alone.
- **Never write an explanation that names an option by letter or place.**
  `render-as-authored` is 0; if it rises, one has crept back in.

### Verifying a lesson

- **`--unverifiable` is a property of the lesson, not of the run**, and
  `verification-log.json` is the only place it is recorded. Running
  `verify-lesson` without it fails on the missing self-check, and **a failing
  run deletes the entry**, so the lesson silently drops to `unverified`. Check
  the log before re-verifying a lesson you did not write.
- **Prefer the per-exercise opt-out** — `createSolution(id, { unverifiable: … })`
  — to the whole-lesson flag. The whole-lesson flag skips *every* solution.
- **At least one exercise must actually execute** or the status stays
  `unverifiable`. That guard is what stops the opt-out becoming a way to mark
  work done by declaring it undoable.
- **Commit before running an injection test.** `git checkout --` reverts
  uncommitted work along with the injected damage; this cost the same edit twice.

### Tooling limits worth knowing

- `verify-lesson.mjs` shims `setTimeout`/`clearTimeout` onto a drainable queue
  but **does not model Node's phase ordering** — `process.nextTick` and
  `setImmediate` questions are skipped, because the sandbox gets them wrong.
- `setInterval` is still not shimmed. It has not bitten anything yet.
- **The runner executes JavaScript.** A TypeScript solution cannot be verified
  at all, however it is rewritten. That is the whole `a2/*` + `a3/0002` category.
- The `dom-sandbox` selector engine has no `>`, `+`, `~` or pseudo-classes. If a
  lesson needs one, add it to the sandbox *and* to `scripts/test-dom-sandbox.mjs`
  in the same commit.
- **`verify-lesson.mjs` has no opinion about display `<pre>` blocks.**
  `check-pre-blocks.mjs` covers that gap and runs inside the audit as an error.
  Its scope is one defect — an unterminated `'`/`"` in a JS block. It is **not**
  a syntax check, deliberately: the blocks are JSX, fragments, SQL and shell.
- **When a check is tuned to silence false positives, write the suite that
  proves it still fires.** `check-pre-blocks` went 71 → 0 across three
  suppressions; `test-check-pre-blocks.mjs` is the only thing distinguishing a
  clean course from a dead check.
- **Do not assume a stem covers its inflections.** `\bcorrect\b` does not match
  "correctly", and that one word boundary hid 17 inverted questions from a check
  written to find exactly them.

### Audit conventions

- **The audit exits OK as of 2026-08-18** — the first time in the project's
  history. Treat any red audit as real from here on; that is the point of having
  made it green.
- **Warnings are down to 1**, a genuine dead link in legacy `07`. Both former
  token warnings were correct content. Treat a warning as real now.
- `scripts/known-issues.json` parks real-but-gated errors with a **why** and a
  **gate**. **Acknowledged is not fixed.** An entry matching no error fails as
  stale — when B2 lands, that failure is the signal to delete the entry, not
  re-word it.
- **`audit-allow-token-fixtures`** (file-level) exempts a lesson whose subject
  *is* invalid codes — `02/0004` and `01/0012`. **`audit-allow-token-here`**
  (line-level) is for a file that must keep being scanned but names a bad code
  once; `CLAUDE.md` is its only user. The alphabet check is an error and still
  applies to opted-out files.

### Standing facts

- **Student progress is never inferred from the files**, and as of 2026-08-18
  the student has asked not to be asked either.
- **When the student reaches `01/0013`** they need Node 19+ (`node -v`) —
  `crypto.getRandomValues` as a global is Module 01's only environment
  requirement.
- **Module 02's framing cleanup is done.** Four `avatar`/`chat` hits remain **on
  purpose** — the "a chat app shows a face here, Token cannot" contrasts at
  `0002:400-401`, `0003:370`, `0013:76`, `0014:33`. Do not "finish the job".
- **When checking for framing, grep the colours too.** The word-grep missed 95
  WhatsApp-palette hexes across 13 files — the biggest signal in the module.
- **A reframe that stops at the prose leaves crashes behind.** Five Module 02
  lessons had a live `TypeError`, `ReferenceError` or blank row where the
  reframed narrative met un-reframed fixtures. Check *every* row of a sample
  list; the defect was always in the entries nobody re-read.
- **A rename is never just the file.** `02/0013` reached into
  `search-index.json`, the module README, the nav in two lessons, the wrong-case
  file's name *and* its header comment, and `verification-log.json` — which is
  generated, so prune the stale key with a script and let a real run write the
  new one.
- **Reframing a lesson around its function keeps finding contradictions between
  lessons.** Three so far, each a page stating a rule that a neighbour's code
  breaks. When you write the function, check the neighbours.
