# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

**Nothing.** Working tree clean. **56/96 verified**, audit green, five suites
pass. **B2 is complete** — three of three.

### b2/0003 — the runner, not the schema (2026-08-21)

Almost no drift from the two schema rewrites; its one `max_uses` reference was
already nullable. The defects were in the **migration runner**, and all three
are the same kind: **the four-line version works perfectly, and has nothing to
say when something has already gone wrong somewhere else.**

- **No checksum.** Edit a migration after it has run and the runner sees the
  filename in `schema_migrations` and skips it *forever*. This environment
  keeps the old shape, a fresh database gets the new one, and **nothing reports
  anything.** Now stored and compared, which turns silence into a loud failure
  and enforces the rule migration systems live by: an applied migration is
  immutable, fix forward.
- **No out-of-order check.** Two branches both add a migration; one merges
  first. A file numbered below the high-water mark is applied happily, and the
  schema ends up depending on **merge order** — the one thing migrations exist
  to prevent.
- **The migration and its bookkeeping were separate statements.** A crash in
  the gap leaves a migration that *ran* and is not *recorded*, so the next
  deploy runs it again and `CREATE TABLE` fails with the database
  half-migrated.

Also added `pg_advisory_lock`, so two servers in a rolling deploy do not both
read the same pending list.

**Stated rather than assumed:** DDL inside a transaction is a Postgres luxury.
MySQL commits implicitly on `CREATE TABLE`, and even in Postgres
`CREATE INDEX CONCURRENTLY` cannot be wrapped — which is why real tools have a
no-transaction flag.

M3: `planMigrations`, which the runner now calls. **Every wrong-case is a
runner that works and loses only a refusal**, which is exactly why the naive
version survives for months.

### b2/0002 — two hard constraints were simply absent (2026-08-21)

The messages table stored `content TEXT NOT NULL` in the clear (against
ADR-0002) and had **no partitioning at all** (against ADR-0003's "partitioned
by time from the first migration"). It also had a plain `SERIAL PRIMARY KEY`,
which Postgres **rejects outright** on a partitioned table — so the schema
could not have been created as written once partitioning was added.

**The E2EE rewrite is shaped by one question asked of every column:** does the
server need this to do its job? Its job is to route, order and record delivery.
So `conversation_id`, `sender_type`, `created_at`, the receipt timestamps and
the crypto envelope stay outside; everything else moved inside the ciphertext.

That removed `content_type` and `metadata` as columns. Both describe the
content — *"an image, 1920×1080, 2.3 MB"* is not routing information, and a
server that can read it can tell a delivery company's message from a doctor's.

**The finding I did not expect: E2EE takes system messages away.** The lesson
had a trigger inserting "This token has been revoked" into `messages`. The
server has no key — it could not encrypt that row if it wanted to. So a system
message becomes an **event**: `conversations` gains `closed_reason`, and each
client renders its own sentence. Better anyway — translated, and it cannot
desynchronise from the state it describes, because it *is* the state.

**The general rule, which will come up again: under E2EE, anything the SERVER
wants to say must be said in structured state, never in prose.**

M3: `partitionsToCreate`. Chosen because a range-partitioned table has no
default partition, so **every mistake here is a time bomb rather than a bug** —
it works for months, then at midnight on the first of some month nobody can
send a message at all.

### The orphan-table gates, re-read (2026-08-21)

All three were parked behind "the B2 schema rewrite". Having done part of it:

- **`participants`** — still blocked. Its real gate is C5 (E2EE key
  distribution), which has not happened.
- **`calls`** — still blocked. Its real gate is B6 (signalling).
- **`deletion_queue`** — **gate narrowed, not lifted.** `b2/0002` settled the
  *bulk* half: messages are partitioned by month, so time-based retention is
  `DROP TABLE` on an old partition and needs no queue. What remains is
  **per-user erasure on request**, which partitioning cannot serve — you cannot
  drop a partition for one person. Its gate is now "a per-user erasure policy,
  informed by `b10/0002`" rather than the vaguer B2 one, and `known-issues.json`
  records the distinction so nobody re-derives it.

### Both schema decisions are settled (2026-08-20) and implemented

| Question | Answer |
|---|---|
| How is token state stored? | **Both** — `status` to read, `paused_at`/`revoked_at` to write, two `CHECK` biconditionals stopping them disagree |
| How is the use count known? | **Counted from `conversations`.** No `use_count` column |

**The duplication is made safe rather than tolerated.** The constraints are
biconditionals, so a `revoked_at` on an `'active'` row is refused just as
firmly as a `'revoked'` status with no timestamp:

```sql
CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
CHECK ((status = 'paused')  = (paused_at  IS NOT NULL))
```

Consequence worth knowing before you write an UPDATE: **revoke must also clear
`paused_at`**, or the second constraint rejects the row. That is the
constraint working — the state machine's exclusivity is now a database fact
rather than a convention.

**The cost of the second decision is real and is written into the lesson:**
the use limit can no longer be a `CHECK` constraint, because there is no column
to constrain. Enforcement lives in the redemption transaction — `FOR UPDATE`
on the token row, count, insert — which is why `b7/0001` writes that
transaction out in full. `idx_conversations_token_id` is **load-bearing, not an
optimisation**. The API may still *return* a computed count; `a5/0003`'s
`displayStatus` takes one.

Applied across `b2/0001`, `b7/0002`, `b7/0003` and `CLAUDE.md` — which had
recorded only half of it and still said `use_count`.

**Nothing about this is open any more.** Both were the last blocked items.

### b2/0001 — the schema lesson had no ADR-0007 in it

**Zero mentions of `code_hash` or `code_enc`.** It stored
`code TEXT NOT NULL UNIQUE` in the clear, while `b7/0001` already queries
`WHERE code_hash = $1`. The engine implemented a schema the schema lesson
never defined.

**Unambiguous, unlike the state-model question above** — ADR-0007 is explicit,
`CLAUDE.md` restates it at length, and the downstream code already complies.
Docs right, lesson drifted. Fixed.

The callout covers the genuinely counter-intuitive part: **why not bcrypt or
argon2.** They salt randomly per row, which is correct for passwords — you find
the user by email, then verify one hash. Here there is nothing to look up *by*;
the code is all the holder has, so a random salt would mean hashing the
candidate against every row. A pepper gives the same protection against rainbow
tables while keeping the hash deterministic, hence `UNIQUE` and O(1). bcrypt's
slowness is not missed because 31<sup>12</sup> is not brute-forceable at any
speed — **the threat is a database dump, not a weak secret.**

M3: `codeHashInput(raw)`. Eight lines, and **nearly impossible to change once
it has run in production** — every stored hash was computed by whatever it did
on the day it ran. Mistakes split into too-strict (a real code is rejected and
a live token stops working) and too-loose (two inputs reach one row).

### b7/0003 — the distinction the exercise exists for

**`unchanged` and `refused` are different answers.** Both leave the state
exactly as it was; one is a request already satisfied and the other can never
be satisfied, and they become a 204 and an error.

Collapsing them has a victim in either direction. Fold *unchanged* into
*refused* and a user hammering the revoke button on a bad connection is told
their revocation failed — so they try harder, or believe the token is still
live. Fold *refused* into *unchanged* and resuming a revoked token reports
success.

### b7/0002 and the max_uses root cause

`evaluateRuleSet` — the wrong-cases share a shape: the mistake is never a
wrong *answer*, it is a **missing refusal**. Every one falls through to
`allowed` on input it did not understand, and the worst reads as tolerance.

**Then the root cause.** `b2/0001` said *"max_uses = 0 means unlimited"* — the
inverse of `CLAUDE.md`. That defect had already been fixed **three times**
downstream (a5/0003 twice, and a wrong-case in `b7/0001` written the same
morning), each recorded as a local slip. The column was
`INTEGER NOT NULL DEFAULT 0`, making unlimited inexpressible and defaulting
every token to permitting nothing; the constraint had inverted with it.
Seventeen replacements across three lessons.

**The rule: when the same defect has been fixed three times, stop fixing it
and go find where it is defined.** The tell is a wrong-case that feels
familiar.

### The three open decisions are settled (2026-08-20)

The student was asked directly and answered. All three are now implemented and
committed; none is still waiting.

| Decision | Outcome |
|---|---|
| **Presence default** | **Deny-by-default confirmed.** The issuer's presence is not sent to holders. Rule stays `share_presence`, named for what it grants. Already in `b5/0003`; nothing further to do. |
| **Holder JWT** | **Swap `tokenCode` for the conversation id.** Done — and the server was already correct, see below. |
| **ADR-0008 relay** | **Keep all three scenarios on the record**, rather than one winner. Mode A in force, Mode B pre-approved with a written trigger, Mode C rejected. |

**ADR-0008 is now shaped around that answer, not just concluded.** The three
modes are named, costed in a table, and given switch conditions — because the
choice depends on a number nobody has yet (real relay egress). **Mode B needs
no new ADR**; moving to it means recording the date and the numbers. What the
rewrite does *not* do is reopen the default: everything where the issuer's
address is disclosed to a holder by default now sits under *Rejected outright*,
separately, so it cannot drift back in as "just another mode".

The measured figures the trigger depends on: **~29 MB per hour of voice against
~450 MB for 480p video** — so ~38,000 voice hours per TB against ~2,400. Voice
is effectively free; video is ~16× worse and is what will run out. A product
that turns out to be mostly voice can stay in Mode A indefinitely.

### The JWT decision found a worse thing next door

The server was **already right** — `b7/0001`'s `HolderPayload` is
`{ conversationId, tokenId, holderName }`, no code. The defect was that
`a8/0002` documented a payload the server never mints, in both its copyable
snippet and a quiz question. Another cross-lesson contradiction.

Then **`b8/0001` put the token code in a push notification**, twice: in
`data`, which travels through FCM/APNs and sits on Google's or Apple's servers
until the device collects it, and in the visible body text — *"Ravi is calling
via MERC-8GH2-KP4X"* — which renders on a locked screen and enters the OS
notification history. FCM/APNs is the one third party this architecture
accepts, and the bargain is that they route bytes. Now sends the **label** the
issuer chose. **A push payload is a log held by someone else.**

### b7/0001 — the bug was not the one I went looking for

`FOR UPDATE` turned out to be **handled**: flagged in a NOTE, explained under
"When this breaks", and the exercise solution already does
`pool.connect`/`BEGIN`/`COMMIT` correctly. Left alone.

The real defect sat on the screen *next to the keyspace analysis*. That section
computes ~25,000 years of guessing — then the endpoint answered four
distinguishable ways, and the **404-vs-403 split told a guesser whether a code
exists at all**. That converts "guess a code that works" into "guess a code
that exists", a far cheaper problem, and dead tokens get un-paused.

**The keyspace figure assumes each guess teaches the attacker nothing.** Two
sections of one page contradicting each other — the same shape as A6, A7 and
B5, and the fourth time this session.

### What B5 cost

The prediction from A6 was right and understated. **All three lessons
contradicted ADR-0003, and two said so in their own prose:**

- `0002` looked the recipient up in *this process's* `clients` Map and, finding
  nothing, gave up — commented *"If no sockets — user is offline"*. Meanwhile
  **one of its own quiz explanations** described that exact failure and named
  Redis pub/sub as the fix. The `a7/0005` shape again: the right answer present
  in one place, the wrong one taught everywhere else.
- `0003` said *"Redis pub/sub — optional for v1"* and *"For Token v1 on a single
  VPS, in-memory is correct."* ADR-0003 is **titled** "scale out ready, deploy on
  one box".
- `0001` was the mild one — no Redis mentioned at all, and no statement of what
  the local map is not.

**Also a cross-lesson contradiction with A6:** `b5/0002` acknowledged
`chat:sent` as `{ id, sentAt }` with **no `localId`**, while `a6/0002`'s client
matches the ack to its optimistic message *by* `localId`. The client could
never have found the bubble to update. Fixed in `b5/0002`.

**The rule B5 produced:** *when a lesson's own quiz contradicts its body,
believe the quiz.* Twice now the correct answer was sitting in an explanation
while the code taught the opposite — which means grepping a module's quiz for
the ADR keywords is a cheap way to find the body's defects.

### What A6 cost, and the rule it produced

Reading each lesson against the ADRs *before* writing the exercise was the
right call and found more than the exercises did. **Every one of the three
carried a live defect, and none was visible from inside the file:**

- `0001` reconnected the socket on foreground **without checking whether anyone
  was signed in**, while a different file disconnected on logout. Log out,
  switch apps, switch back, socket open again. Both handlers correct alone.
- `0002` appended incoming messages with no dedupe (REST history and the socket
  overlap constantly), could reorder a message when its ack landed, and let a
  late delivery receipt **un-read** a read message.
- `0003`'s presence never expired and never consulted our own socket, so **a
  disconnected client showed everyone as online indefinitely**.

**The rule: a "the state changed" handler needs to know when it last heard, not
only what it last heard.** All three lessons, and the typing-indicator timer
bug in `0003`, are the same mistake — state stored without a timestamp, then
trusted forever. Worth checking B5 (websocket server) for the server-side
twin.

**`a6/0001` contradicted `a8/0003` outright** on backoff, and `a6` comes first
in the sequence so it was teaching it wrong before the correction arrived. It
claimed backoff "spreads out reconnection attempts" — it does not; backoff
widens the gap between *one* client's attempts while leaving every client
dropped by the same restart in lockstep. It also taught ±25% jitter rather than
full jitter. `a6/0001`'s playground now demonstrates the difference with 500
clients and a histogram instead of asserting it.

**A6 mentioned encryption zero times** across `0002`, `0003` and the README
while sending `text` in the clear — against ADR-0002, which `CLAUDE.md` says
every lesson touching messages must respect. The crypto belongs to C5 and was
**not** written ahead of it; `0002` now states the constraint instead: what is
provisional, what survives encryption unchanged (all of the lesson's logic
works on the envelope), and which shortcuts are cheap now and impossible later.
**The other message-touching modules have not been checked for this.**

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

**`a8/0003` was where this thread started.** Its browser `RTCPeerConnection`
had no `iceTransportPolicy: 'relay'`, TURN was commented out, and the
playground taught "best path chosen: host (LAN)". ICE candidates *are* IP
addresses, so a direct path hands the holder the issuer's home IP — on the page
a stranger opens after scanning a QR code. That fix prompted ADR-0008, which
prompted the A7 check above. **Both are now closed.**

### Follow-ups still open

**The ADR-0007 thread is closed** as of 2026-08-20. Three passes: the
code-in-the-URL-path sweep (ten lessons), `code` in list responses and list
types (two more), and the denial-oracle shape (`b7/0001` and `a8/0002`).
Nothing known is outstanding.

Smaller, also not done: the holder JWT carries `tokenCode`. The holder already
knows the code, so it leaks nothing to them — but JWTs land in logs routinely,
and ADR-0007 says the code is never logged. Worth a decision, not urgent.

**Found in `0004`, not fixed, deliberately: expiry is modelled twice.** There is
an `ExpiryPayload` rule carrying `expires_at`, and `0003` reads a
`tokens.expires_at` column. Both cannot be the source of truth. Written up in
`0004`'s "When this breaks" and left for the **B2 rewrite**, which the adjacent
storage-model note is already waiting on. Until then `0003`'s column wins.

## Next action

**Continue M3 with the scattered singles.** One lesson at a time, one commit
each. **Nothing is blocked.**

**Done:** A3, A4, A5, A6, A8, B5, **all of B7**, **all of B2**, plus
`b3/0002`.
**Remaining:** A11, B10, `b3/0001`, `b3/0003`, `b3/0004`.

**Take the three `b3` lessons next and finish B3.** `b3/0002` is already done,
so the module is three lessons from complete, and they are adjacent to work
that is fresh: `b3/0003` (REST API design) was touched by the URL-path sweep
and is where the `GET /tokens` response shape lives, which `a5/0003` and
`b2/0001` both now constrain.

| Work | Gate |
|---|---|
| **M3** — extract the plain function from the remaining ~3 logic-rich lessons | none; A6, A7 and B5 done |
| **Check the message-touching modules against ADR-0002** — A6 mentioned E2EE zero times until 2026-08-20 | none; likely candidates are B5, B8 and the legacy `04` |
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

Both were raised on 2026-08-20 alongside the three that got settled, and
neither was answered. They are not blocking anything.

1. **How far ahead of yourself should this build?** M3 keeps finding real
   defects, but every lesson it touches is modules ahead of Module 01. Raised
   three times now; the answer each time has been to continue.
2. **Is a TypeScript-aware runner worth building?** Four lessons can never be
   verified without one — `a2/*` and `a3/0002`. It is the only category a
   rewrite cannot fix.

**How to ask, based on what worked.** The three decisions that got answered on
2026-08-20 were answered only after being restated in **money, minutes and
concrete failure**, with the options laid out and the cost of each spelled out.
The first framing named ADR numbers and `iceTransportPolicy` and got nothing
back. The second said "voice is effectively free, video costs about 450 MB an
hour, and if the relay server goes down nobody can call" — and got a decision,
plus a better answer than any option offered ("keep all 3"). **Do not ask an
architecture question in architecture vocabulary.**

## Blocked on

**Nothing.** ADR-0008 was the only blocker and it is settled — see *In
progress*.

**One thing to carry to deployment, not to act on now:** relay egress is a
certainty rather than a risk. ADR-0003 expressed the single-box ceiling in
connections and memory; relayed video adds an egress ceiling that will probably
arrive first — ~2,400 hours of relayed video per TB against ~38,000 for voice.
**Monitor TURN bandwidth from the first deploy**, so the trend is visible
before an invoice is. If it bites, ADR-0008's Mode B is pre-approved and needs
no new decision.

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
| **M3 — the plain function in Track A/B lessons** | **started 2026-08-18** — A3, A4, A5, A6, A8, B5 complete, A7 partly (`0005`), plus `b3/0002`, all of B7 and all of B2; ~3 left |

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
| `a6/0001` | `connectionIntent` | logout outranks app state; `connecting` ≠ `closed`; `inactive` ≠ gone |
| `a6/0002` | `applyMessage` | ack replaces *in place*; a known id merges, never appends; status only moves forward |
| `a6/0003` | `presenceFor` | `unknown` (our socket) outranks `offline` (their TTL); silence past the TTL *is* the signal |
| `b5/0001` | `sweepSockets` | the heartbeat is a *two-tick* protocol; `undefined` ≠ `false` |
| `b5/0002` | `deliveryPlan` | local miss ≠ offline; never republish a pub/sub message; ignore your own echo |
| `b5/0003` | `canSeePresence` | deny by default; status before role; a granting rule fails closed when absent |
| `b3/0002` | `matchRoute` | first match wins by *registration order*, never by specificity |
| `b7/0001` | `canRedeem` | `null` ≠ `0` for `max_uses`; null-check `expires_at` before parsing; every refusal looks identical from outside |
| `b7/0002` | `evaluateRuleSet` | an unknown rule type is *refused*, not ignored; `typeof [] === "object"`; ALL rules must pass |
| `b7/0003` | `planTransition` | `unchanged` ≠ `refused`; revoked is terminal; revoke is never refused |
| `b2/0001` | `codeHashInput` | normalisation is part of the *stored format*; do not "helpfully" map excluded letters |
| `b2/0002` | `partitionsToCreate` | no default partition means every bug is a time bomb; pad the month; December rolls the year |
| `b2/0003` | `planMigrations` | an applied migration is immutable; refuse rather than half-apply; history outranks the plan |

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
