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

**Nothing in flight.** 2026-08-30 was a launch-and-product day, not a writing
one. **Twelve open decisions were put to the student and settled**, and the work
that followed from them landed: `L7`, `L10`, `L12`, `L13`, `L18`, send-prep for
`L1`/`L4`/`L8`, and — the big one — **`token/api/migrations/` exists and has
been run against Postgres 16.**

### The schema has been executed for the first time

Fifteen tables, twelve migration files, three retention functions, and
`test/schema-test.sql` with eight assertion groups, all green. Run it with
`sh api/migrations/test/run.sh` (needs Docker).

**This closed RoPA F0 and proved F1 and F4 were real.** `erase_account()` is
tested against a *maximal* account — every table populated, including the call
and the revocation nobody had in their test data, which is exactly why they were
missed. The suite also asserts **the naive erasure order still fails**, so the
bug cannot come back silently.

### The twelve decisions, settled 2026-08-30

| Decision | Outcome |
|---|---|
| `token/` backup | **Private GitHub repo** — *still to be created; no `gh` CLI on this machine, see Blocked* |
| Erasure vs audit trail | Delete `redemption_events` with the token; anonymise at 90 days is a **separate clock** |
| Consent evidence | **Survives 3 years** in `consent_archive`, disclosed |
| Holder identity | **Per conversation, random, ≥32 chars** (ADR-0019) |
| Holder IP retention | **90 days** |
| Rules history | **Claim withdrawn**, constraint kept |
| Analytics on store forms | **Declare on both** |
| Backup floor | **`minVerified: 3`** |
| CERT-In logs | **Separate store, own clock** |
| Migrations | **Now** — done |
| `revocation_events.metadata` | **Replaced** by `actor` + `reason`, `CHECK`-constrained |
| Send prep | `L1`, `L4`, `L8` — done |

> **One correction I made mid-task and flagged:** I had recommended anonymising
> `redemption_events` as the fix for F1. It does not unblock erasure — the rows
> still reference `tokens` under `RESTRICT`. The right shape is two clocks, and
> ADR-0021 records the rejected version so nobody re-proposes it.

### `L7` — the RoPA — found all of it

The RoPA (`token/docs/launch/ropa.md`, v0.2) was cross-checked against the
schema rather than from memory. Fifteen live tables; v0.1 accounted for nine.
**Seven findings, all now settled — the table is in §7 of that file**, and the
findings are kept in full beside the answers, because a decision without the
problem it solved is what the next person undoes.

The two that were defects: **F1**, the erasure right was blocked by four
`RESTRICT` foreign keys whose composite effect nobody had written down; **F4**,
`consent_records` had a `UUID` foreign key against a `SERIAL` primary key and
could never have been created — in the compliance lesson, in a
`username`/`password` flow, in a product that has neither.

C8 landed complete 2026-08-29; C2, C3, C7 and C6 the same day.

**The next unit is `W1` again: pick one C-module, write it, stop.** Two remain
— **C4** (Data, Media & Offline, 4 lessons, follows A6) and **C9** (Launch,
Support & Operations, 5 lessons). The launch queue is the other open front and
none of it is code; see *Next action*.

**Neither of the two has a strong claim, and the reason is the same for both:
they are the ones whose place in the sequence actually matters.** C4 follows
A6, which is not written. C9 builds the mechanisms F1 states the obligations
for, so writing it ahead of the launch work means cross-linking to documents
that will have moved. **`W1` may genuinely be finished for now** — Phase 3 said
just-in-time, and just-in-time has caught up with where the rest of the project
is.

**The ADR debt from this week's modules is cleared.** Three product decisions
were settled in C6 and C8 and existed only in course HTML — the condition that
produced ADR-0009 → 0015, caught earlier this time. Written 2026-08-29 as
`ADR-0016` (daily actives over a rotating salt, and no retention), `ADR-0017`
(the authorisation path is never cached) and `ADR-0018` (rate limiting fails
closed), plus a pointer from `ARCHITECTURE.md`'s revocation section to 0017,
since *"not when a cache expires"* was an intention there and is now enforced.

> **`GIT/token/` still has no remote.** **21 ADRs**, `ARCHITECTURE.md`, nine
> launch documents and now `api/migrations/` exist on one machine. A private
> repo was chosen on 2026-08-30 but **has not been created** — there is no `gh`
> CLI here. See *Blocked on*. Do not report anything in that repo as pushed.

> **The C6-versus-C8 sequencing argument, the C7 dependency cost, and the
> 2026-08-29 push are closed history and moved to `HANDOFF.md`.** All three
> modules landed; the reasoning survives where narrative lives, and repeating it
> here is how this file reached 4,486 lines last time.

### State as of 2026-08-30

**Counts live in `PROGRESS.md` and are not restated here** — same rule as
`CLAUDE.md`. Run `node scripts/audit.mjs` first; it regenerates that file. What
this section records is only what a script cannot compute:

- **Audit green, nine suites pass (250 assertions), and there are no warnings
  either.** The two standing ones were cleared 2026-08-29 and they
  were different problems wearing the same jacket: `a9/0002` needed the
  documented file-level fixture opt-out for eight deliberate malformed codes,
  and **`DENY-LIST` was never a code at all.** The scanner matched four
  letters, a hyphen and four letters, which is also `READ-ONLY`, `LEFT-JOIN`
  and `SELF-HOST` — a recurring false positive, not a one-off to reword. A
  two-group match now needs a digit; the three-group token shape is unchanged.
- **`scripts/token-scan.mjs` is new**, extracted out of `audit.mjs` so the
  narrowing could be tested, with `test-token-scan.mjs` asserting both
  directions. Proven live as well as in unit tests: a probe file carrying a bad
  code took the audit to one warning and removing it took it back to zero.
- **The alphabet check moved there too**, for a stronger version of the same
  reason: four suppression clauses, nothing testing any of them, and it is an
  **error** rather than a warning. It gained a third verdict — *the right
  characters in the wrong order*, which used to report "is 31 characters, not
  31". Also probed live end to end.
- **A page under `modules/` matching neither `README.html` nor `0NNN-*.html` is
  now an error.** Every lesson-level check reads one filename pattern, so a page
  outside it is invisible to all of them at once while still being served —
  the `git-learn/index.html` hazard one directory in. Zero such pages today; the
  guard is for the next one. **Found by accident**, which is the part worth
  keeping: a probe named `_probe.html` produced no finding and the same content
  named `0099-probe.html` did.
- **`git-learn/index.html` checked by hand 2026-08-29** after C6 and C8 landed,
  per the standing rule. Clean: the module count comes live from the GitHub API,
  `learn-progress-fill` is a CSS rule with no hardcoded width anywhere, and
  there are no "Complete" badges. No change needed — recorded because nothing
  else will check it.
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
| **`token/docs/launch/`** | Started here with four drafts for the items that start other people's clocks. **Now nine documents — see `SEND-CHECKLIST.md`, which is the entry point** |
| **C0 — Architecture & System Design** | 2 lessons, verified. **Phase 3 has started**, and stops here — one module at a time |

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
>
> **Hand-checked 2026-08-30 and clean**: module count comes from the GitHub
> API, `learn-progress-fill` has no hardcoded width, no "Complete" badges, no
> WhatsApp copy. Recorded here because there is no other record — a check with
> no output is indistinguishable from a check nobody ran.

---

## Next action

> ### → The queue is `TOKEN-TRACK.md` § *The queue*
>
> 47 launch units and 3 writing units, ordered by what unblocks what.

### 1 · Create the `token/` remote — two commands, and it is the only unbacked-up thing here

There is no `gh` CLI on this machine, so this needs the student. Create a
**private** repo named `token` at github.com/new, with no README, then:

```bash
cd "C:/Users/aspawar/Desktop/Digital/Ashish/GIT/token"
git remote add origin https://github.com/ashishrajpawar/token.git
git push -u origin main
```

Checked safe to push on 2026-08-30: 39 tracked files, no secrets, `.gitignore`
covers `.env`, `*.pem`, `*.key` and the keystores.

### 2 · Send the three that start other people's clocks

**Everything writable is written. What remains is twelve facts only the student
has**, listed once in `token/docs/launch/SEND-CHECKLIST.md` along with a
covering note for each.

```
L1 DLT ────── 1–3 wks ──▶ OTP works ──▶ L44 closed test ──▶ 14 days ──▶ L46 production
L4 testers ── 3–5 wks ──▶ (parallel; asking can start today)
L8 counsel ── 2–4 wks ──▶ privacy policy ──▶ store submission
```

**All three can go out the same day.** None blocks another. Send `L1` to *two*
aggregators at once — L2's whole value is identical template wording, which is
only free before either has shaped it.

Nine documents now sit in `token/docs/launch/`. `L7`, `L10`, `L12`, `L13` and
`L18` are drafted and folded together; the RoPA's §7 findings are all settled.

### 3 · Then `L16` — the deletion endpoint and page

**This is the highest-value thing a technical session can do next**, because
both store forms already answer *"users can request deletion: yes"*.

`erase_account()` exists, is correct and is tested. **Nothing calls it.** The
endpoint and the web-accessible deletion page Play requires are both missing,
and Play tests that answer.

### Writing side — `W1` is still paused

C0, C1, C2, C3, C6, C7 and C8 have landed; **C4 and C9 remain**, both gated.
C4 follows A6. C9's gate softened on 2026-08-30 — it teaches *operating* the
thing, and the migrations plus the erasure and retention functions are now real
code to teach against — but it still wants the launch documents to have **come
back**, not merely to have been sent.

`W2` is closed and there is no maintenance tail left to slot between units.

> **The launch queue is the work.** `W1` resumes when A6 lands or the documents
> come back from the people they are waiting on.

---

## Blocked on

**Four things. Everything else can start today.**

| What | On whom | What it unblocks |
|---|---|---|
| **Create the private repo for `token/`** | the founder — **no `gh` CLI on this machine** | The only backup of 21 ADRs, `ARCHITECTURE.md`, nine launch docs and `api/migrations/`. Decided 2026-08-30; two commands, in the report |
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
| **3 — the C-modules** | **C0 written 2026-08-27, C1 2026-08-28, C2, C3, C7, C6 and C8 2026-08-29** (2, 5, 4, 3, 4, 5 and 2 lessons, all verified). C5 already existed; **two remain** — C4 and C9, both gated on work that has not happened rather than on hours. Queue item **W1** |
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
- **An assertion whose two sides cannot differ always passes.** The single
  most common fault in this project's own *checking*, hit five times across
  2026-08-29 alone: a fixture already sorted so an in-place sort was invisible;
  `available / 0` already `Infinity` so a guard changed nothing; a grace window
  that only matters at exactly one age; a trace already in `startedAt` order so
  a sort mutated nothing observable; a mistake asserted against a type rather
  than a value. **Before writing a wrong-case, say out loud what the two
  implementations print differently.** If the answer is "nothing on this
  fixture", change the fixture — and if no fixture can separate them, the case
  is not a case: drop it and write down why, so nobody adds it back and
  concludes the checker is broken.
- **A lesson can argue for the right thing in prose and ship the wrong thing in
  the code block underneath**, and only the code block gets copied. Found five
  times out of five across A5.
- **A schema is not source code that happens to be in SQL.** It is an
  instruction to another program, and every check in this project reads the
  page instead of running it — so `consent_records` carried a `UUID` foreign
  key against a `SERIAL` primary key for months, in the compliance lesson, in a
  table Postgres would have refused outright. **Nothing in the course tooling
  can find that class of error.** Found by compiling the RoPA, whose entire
  method is *list every field you store and go and look at it*.
  **`token/api/migrations/` now exists and is applied to a real Postgres before
  anything is committed** — `sh api/migrations/test/run.sh`. Keep it that way:
  the moment a table changes only on a page, this failure is available again.
- **The dangerous foreign key is the one with nothing written on it.** A
  missing `ON DELETE` clause defaults to `NO ACTION`, which blocks exactly like
  `RESTRICT` — and you can scan a whole schema for the word RESTRICT and never
  see it. `b10/0002`'s erasure transaction missed `revocation_events` this way
  and `calls` by thinking in nouns instead of foreign keys. **Generate the list
  from `information_schema.referential_constraints`; do not read it off the
  page.**
- **A check that can be wrong needs a suite before it needs another clause.**
  Three inline `audit.mjs` checks went blind this way — example codes, the
  alphabet, orphan tables — and the third was only found because the other two
  had just been fixed. The pull is always to add the suppression inline: one
  line, obviously correct, audit goes green immediately. **That is the move.**
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
