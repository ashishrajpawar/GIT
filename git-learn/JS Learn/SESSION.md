# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

> **Trimmed 2026-08-28.** *In progress* and *Next action* had grown to 4,080
> lines of session log between them, which is how *Blocked on* spent three days
> describing `c5/0004` as undesigned after `c5/0004` had shipped. The narrative
> moved to `docs/archive/session-log-2026-08-17-to-25.md`; nothing was
> discarded. **Keep this file short. If it needs a scroll bar to answer "what is
> next", it has stopped working.**

---

## In progress

> **Do not ask the student where they are in the course.** Asked 2026-08-23
> and declined: *"dont ask as it wont affect your work or plan."* That closes
> it the way the lookahead question was closed. **`CLAUDE.md`'s other rule
> still stands and is now the whole rule: never *infer* progress from the
> files either.** Make no claims about it at all — not in prose, not in a
> commit message, not as a reason for prioritising anything.

**W1 — C7, Observability.** Started 2026-08-29 straight after C3.
`0001-the-log-line-you-can-publish.html` and
`0002-errors-and-what-they-carry.html` are written, verified and have their
`--wrong` cases; README, index row and search entries are in. **`0003`–`0004`
remain**: metrics, and alerting with runbooks. Each lands as its own green
commit.

**Why C7 and not C4 or C6**, with the cost, because no recommendation was on
record: three of `CLAUDE.md`'s hardest-won logging rules — never log a code,
log the id, allow-list rather than delete — have no module that owns them, and
the same defect has been swept out of the course twice. C7 gives them a home.
Watching TURN bandwidth from the first deploy is a standing instruction in
*Blocked on* with nothing that teaches it, and C2/0004's "a build you cannot map
to a commit is a crash you cannot fix" needs an error tracker to be true.
**The cost:** C6 says on its own row that scale must not be deferred, and this
defers it. The counter-argument is that you cannot tune what you cannot see, so
C7 before C6 is an ordering rather than a refusal.

C2 and C3 both landed complete earlier the same day.

### State as of 2026-08-29

**Counts live in `PROGRESS.md` and are not restated here** — same rule as
`CLAUDE.md`. Run `node scripts/audit.mjs` first; it regenerates that file. What
this section records is only what a script cannot compute:

- **Audit green, seven suites pass.** No errors.
- **Every lesson executes something.** No `unverifiable` entries and none
  absent from the log — the flag that covered 17 lessons on 2026-08-23 covers
  none.
- **`known-issues.json` is empty.** Nothing gated, deferred or carried.
- **Every module that exists is complete**, including the two written this week.
- **Every self-check in the course now has `--wrong` cases.** W2 closed
  2026-08-28. Nothing is left in the maintenance tail.
- **26 lessons had a widget that never rendered**, fixed 2026-08-28 — including
  all 16 F1 lessons, whose `createExplain` prompt is the module's only
  assessment. `scripts/check-load-order.mjs` now errors in the audit. The
  lesson template puts the asset scripts in `<head>`; see `CLAUDE.md`.

### What landed 2026-08-26 → 28

| | |
|---|---|
| **F1 — the founder track** | 16 lessons, the non-technical half of shipping Token. No quizzes by instruction; a `createExplain` prompt is mandatory instead and the audit errors without one |
| **18 decisions settled** | Put to the student in four batches. Each lives in the lesson that owns it, with its rejected alternative and reversal condition. Register in the F1 README |
| **ADR-0009 → 0015** | Seven of those were *product* facts whose argument existed only in course HTML. Now in `token/docs/adr/` |
| **`token/docs/launch/`** | Four drafts for the items that start other people's clocks: DLT registration, the tester pack, the RoPA skeleton, the counsel brief |
| **C0 — Architecture & System Design** | 2 lessons, verified. **Phase 3 has started**, and stops here — one module at a time |

> ### ⚠ The Token repo has no git remote
>
> `GIT/token/` is a separate repository and **nothing in it has ever been
> pushed anywhere.** The ADRs, `ARCHITECTURE.md`, the launch documents and the
> Module 01 capstone exist on this machine only. That is fine as a decision and
> dangerous as a surprise — it is the one place in this project where a disk
> failure is unrecoverable.

> ### The course is published, and one page is outside the tooling
>
> The repo is public and served by GitHub Pages from `main`. **Pushing
> publishes; there is no staging step.**
>
> The landing page is `git-learn/index.html`, **one directory above this folder
> and outside everything that checks the course.** On 2026-08-27 its hero still
> read *"9 Modules"* against 26 module folders — a literal sitting between two
> stats computed live from the GitHub API. It is now computed too. **When a
> decision changes what the course *is*, check that page by hand.** Nothing
> else will.

---

## Next action

> ### → The queue is `TOKEN-TRACK.md` § *The queue*
>
> 47 launch units and 3 writing units, ordered by what unblocks what.

**Launch side — start `L1` and `L7`.** They head the two chains that decide the
launch date and neither is code:

```
L1 DLT ──▶ OTP works ──▶ L44 closed test ──▶ 14 continuous days ──▶ L46 production
L7 RoPA ─┬▶ privacy policy   ├▶ L12 Play Data Safety   ├▶ L13 Apple labels
         └▶ L10 retention ──▶ L16 deletion ──▶ the web deletion page Play requires
```

Drafts for four of Wave 0 are written and waiting in `token/docs/launch/` —
fill the angle brackets and send. The folder README has the send order.

**Writing side — `W1` continues, one module at a time.** C0, C1, C2 and C3
have landed; **five remain**: C4, C6, C7, C8, C9. Written just-in-time, never
batched. `W2` is closed and there is no maintenance tail left to slot between
units.

**C3 was taken on a dependency**, recorded so it can be argued with: `L23` and
`L26` are the UGC evidence both stores audit, `L23` is still blocked below, and
C3 is where the engineering argument behind it now lives — `0003` builds
ADR-0011's interim suspension as a function with no way to express an
account-wide scope. **The cost paid** was deferring C6 (scale) and C7
(observability), both of which attach to work that is closer to hand.

**No recommendation for the next one.** C4 follows A6 in the plan, C6 is meant
to run alongside the B-track rather than after it, and C7 extends B9 — three
different anchors, and which one is nearest depends on where the build is
rather than on anything in these files.

---

## Blocked on

**Three things, and only three. Everything else can start today.**

| What | On whom | What it unblocks |
|---|---|---|
| **L23** — what a block attaches to, for a holder with no account | the technical founder | L26, the UGC evidence pack, and therefore **both store submissions** |
| **L45** — replacement vs supplement, and which segment leads | the closed test (L44) | store copy stops being provisional. `F1/0007` has the signals table and the day-14 question |
| **The Hindi question** inside L8 | counsel | whether English-only at launch stands. Ask it in the same brief as the privacy policy |

None of the three blocks anything in Wave 0, which is where the work starts.

*(ADR-0008 was the last architectural blocker, settled 2026-08-20. Its residue:
relay egress is a certainty rather than a risk — ~2,400 hours of relayed video
per TB against ~38,000 for voice. **Monitor TURN bandwidth from the first
deploy**, so the trend is visible before an invoice is. `F1/0009` carries the
same arithmetic as a founder-facing budget line.)*

---

## Phase status

Per-item status only. The plan is in `TOKEN-TRACK.md`; the counts are in
`PROGRESS.md`; why any of it went the way it did is in `HANDOFF.md`.

### Course writing

| Phase | Status |
|---|---|
| 0 — repair the map | done |
| 1 — unblock where the student is | **done**, all five items |
| 1.5 — the practice pattern in Module 02 | **done** — all 14, 2026-08-17 |
| 2 — deepen the spine | done (16 of 16 deepenable; 4 skipped as rewrites) |
| **3 — the C-modules** | **C0 written 2026-08-27, C1 2026-08-28, C2 and C3 2026-08-29** (2, 5, 4 and 3 lessons, all verified). C5 already existed; **five remain** — C4, C6, C7, C8, C9. Queue item **W1** |
| 4 — the operating track | not started, deliberately. Queue item **W3** |
| M1 — verify what was never executed | done |
| M2 — the invalid example codes | done |
| M3 — the plain function in Track A/B lessons | **closed 2026-08-25.** No lesson carries a whole-lesson `unverifiable` flag. The reflex to call a lesson unrunnable was wrong 22 times out of 22 |
| Maintenance tail | **closed 2026-08-28.** The queue said seven lessons; the real number was **five** — `a11/0002` and `a8/0002` had cases already and the note was never trimmed. Every self-check in the course now has wrong-cases, and the fifth one found a real hole: `01/0004` passed a `checkAccess` with the use-limit ahead of the pause |
| **F1 — the founder track** | **written 2026-08-26**, 16 lessons. 18 decisions settled 2026-08-27; three left open with gates |

### Launch execution — the F1 queue

**Not started.** Forty-seven units, ordered in `TOKEN-TRACK.md` § *The queue*.
Four Wave 0 documents are drafted and unsent.

| Wave | What it is | Note |
|---|---|---|
| 0 — L1–L9 | Registrations, accounts, the RoPA, the counsel brief | **Every one is gated on somebody else's calendar.** Start today |
| 1 — L10–L18 | What the RoPA unblocks: retention, both store forms, consent, rights, deletion page, vendors | Gated on L7 |
| 2 — L19–L26 | Trust & safety, which *is* the UGC evidence both stores audit | L26 is the pack itself |
| 3 — L27–L32 | Comprehension, positioning, the listings, support, analytics | L27 → L29 → L30 |
| 4 — L33–L43 | Age, dark patterns, holder notice, opsec, CERT-In, incident runbook, QA, calendar, transparency | Mostly parallel |
| 5 — L44–L47 | The closed test, the two decisions it settles, both submissions | L44 is 14 calendar days that cannot be compressed |

---

## Notes for the next session

Durable working notes. Anything that was true only of a finished unit of work
is in `docs/archive/session-log-2026-08-17-to-25.md`.

### The traps that have caught more than one lesson

- **A throwing wrong answer aborts the whole self-check**, so it trips nothing
  and reads as a broken verifier. Any check whose natural wrong answer can
  throw — or loop — needs its own `try/catch`. **Hit three times now**, most
  recently in both C0 lessons.
- **`alternatives` in a `--wrong` file is an object map**, name → source string.
  `mistakes` is a list of `{ expect, impl }`. An array of `{ label, impl }` for
  alternatives stringifies to `[object Object]` and every one fails with a
  SyntaxError that looks like a verifier bug.
- **Snapshot before first use** when checking that an input is not mutated.
  Taken after an earlier call, an in-place sort has already happened and
  sorting again changes nothing.
- **A lesson can argue for the right thing in prose and ship the wrong thing in
  the code block underneath**, and only the code block gets copied. Found five
  times out of five across A5.
- **Two lessons can each be right and contradict each other.** Invisible from
  inside either and invisible to the audit. Grep the neighbour for the same
  noun — `code`, `max_uses`, `expires_at`, `clipboard`.
- **Never build lesson content through a shell.** Escape-heavy strings get
  mangled. Walked into again on 2026-08-28 with a `node -e` one-liner; use a
  file in the scratchpad.
- **`check-pre-blocks` scans any `<pre>` block containing `let`, `const`,
  `return`…** as JavaScript. A prose block with a quotation wrapped across a
  line after a colon trips it. **Reword the prose; do not weaken the check** —
  it is narrow on purpose and has been earned.

### Where a decision goes

Settled 2026-08-27, after seven of them were found living only in course HTML:

| Kind of decision | Home |
|---|---|
| A **product** fact — what the system does and what it costs | an ADR in `token/docs/adr/` |
| A **course** rule — conventions, invariants, how lessons are written | `CLAUDE.md` |
| A **founder** decision — compliance, stores, positioning, vendors | the F1 lesson that owns it, plus the register in the F1 README |
| Anything countable | nowhere by hand. `PROGRESS.md`, generated |

A conclusion without its argument does not survive the session. **The cost of
the rejected option is the part that lets it be overturned later** — without it
the only way to challenge a decision is to have the whole argument again.

### Two things worth an answer eventually

1. **Should `token/` have a remote?** It has never been pushed. Everything in
   it exists on one machine.
2. **`render-as-authored` has read 0 since the detector was widened** on
   2026-08-23, so this time the zero means it. Watch it after any batch of new
   quiz questions — an explanation naming an option by position pins that
   question against shuffling, and C0 introduced one before it was caught.
