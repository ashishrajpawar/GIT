# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress — Unit 16: Phase 1.5, the Module 02 retrofit

Started 2026-08-17 at the student's explicit direction. **Noted for the record
that this is ahead of them** — they are partway through Module 01, so Module 02
is 7+ lessons away, and the just-in-time rule exists because batching ahead is
what produced 95 unverified lessons. They were told and said proceed; that is
their call to make.

Shape per `TOKEN-TRACK.md` § "1.5 in detail":

- Both jobs in one pass per lesson — practice pattern **and** the
  WhatsApp→Token reframe. Separately makes the diff unreviewable.
- One or two lessons per commit. Never all 14.
- Exercises put their logic in a **plain function the component calls**, and the
  self-check tests that function. `verify-lesson.mjs` cannot run React Native.
- `0001`, `0003`, `0004`, `0011` are render-or-build-pipeline lessons and take
  `--unverifiable` with a reason.

Order: `0002` first, not `0001` — `0001` is the Expo/EAS build pipeline and has
the least runnable logic in the module, so it is the worst place to establish
the pattern.

| Lesson | Status |
|---|---|
| `0002-core-components` | done — `toRowModel`, 4 playgrounds, 7 wrong-cases |
| `0003-styling-and-flexbox` | done — `layoutRow`, 3 playgrounds, 6 wrong-cases |
| `0004-textinput-and-keyboard` | done — `normaliseCode`, 3 playgrounds, 7 wrong-cases |
| `0005`–`0014` | not started |

### `0004` forced the token-fixture opt-out that M2 left open

`0004` teaches the redemption code field, so its subject **is** invalid codes:
`KART-4KN9-RTLM`, `-RT20`, `-RT2O`, `-RT2I`, `-RT21`, `-RTL0`, each present to
be rejected. That is six audit warnings for six correct fixtures, and six
deliberate warnings are how a list stops being read — the exact failure this
session spent three units undoing.

So the marker exists now: a file containing **`audit-allow-token-fixtures`**
is skipped by the example-code check. Same bargain as the existing
`audit-allow-alphabet`, taken for the same reason. **Deliberately narrow:** the
*alphabet* check is an error rather than a warning and still applies to opted-out
files — proved by corrupting `0004`'s alphabet literal and watching it error,
then restoring. A wrong example code is one bad code; a wrong alphabet is an
unlimited supply, and that one is never opt-outable.

Use it only where invalidity is the lesson. Two files have it: this one, and
nothing else yet.

**The "render-only, take `--unverifiable`" prediction was wrong for `0003`.**
It was on that list because flexbox is layout and layout needs a device. But
the *arithmetic* is the logic, and `layoutRow(total, children)` is as testable
as anything in Module 01. Check each remaining lesson for the same thing before
reaching for `--unverifiable`: `0001` (a build pipeline) is the only one that
looks genuinely untestable now.

### `0002` — what the pattern looks like in React Native

The reframe found a better example than the one it replaced. A chat app puts a
face on every row; **Token cannot, and the absence is the product.** The holder
of `KART-4KN9-RT2M` is whoever redeemed it — no name, no number, no face — so
the row shows what the *token* is for. `Image` became a category icon rather
than an avatar, and the lesson says why.

The exercise is `toRowModel(token, now)`, a plain function returning
`{ label, code, lastUsed, badge }`. This is the settled 1.5 approach working as
intended: no JSX, no React Native, fully executable here, and the split is
honest rather than contrived — deciding *what* to show genuinely is not the
same job as describing *how* it looks.

**The lesson now turns on one character.** `{token.unread && …}` is correct on
every row that has unread messages and renders a bare `0` on the rows that do
not, which React Native throws on: *"Text strings must be rendered within a
&lt;Text&gt; component"*. It is the state least likely to be in anyone's test
data, because you were testing badges. So `badge` must be **null**, never `0`
and never `false`, and one self-check tests exactly that. Two of the seven
wrong-cases are the two ways of getting it wrong.

**Caught myself introducing an invalid token code** — `AUTO-9KM3-BF6P`, with an
excluded `O`, written an hour after finishing M2. The audit caught it
immediately. CLAUDE.md's warning to run the alphabet check "including on codes
you write yourself" is not theoretical.

Also worth knowing for the next twelve: `--wrong` mistakes take **`impl`**, not
`code`. Getting it wrong yields seven identical `ReferenceError`s that look like
a verifier bug and are not.

## Unit 15 — M2, the example codes that cannot exist — DONE

Of the 24 codes the audit reported: **2 were not codes at all** (`0001-0004`,
`0005-0012` — lesson ranges), **4 were deliberate or historical**, and **18
were genuinely accidental in lessons**. All 18 are fixed across 15 files.

Replacements keep each label's meaning rather than mangling a character:
`SHOP`→`KART` (and `Flipkart` is already the issuedTo in those lessons),
`UTIL`→`CGAS` (the label is literally "City Gas"), `DELI`→`FARM`,
`FOOD`→`CHEF`, `BOLT`→`BEAM`, `DOCK`→`DECK`. Where only the suffix was bad,
only the suffix moved: `WAVE-1MN4`→`WAVE-7MN4`, `XPRT-4KL9`→`XPRT-4KN9`.

**The plan's rule 3 was wrong and is withdrawn** — see `TOKEN-TRACK.md`. It
said an 8-character code is always an accident and should become 12. It is not:
84 standalone `MERC-8GH2` across 26 files, plus a dozen other 8-character codes
with perfectly valid alphabets. It is an established shorthand. **Alphabet
fixed, shape left alone**; converting the shape is a separate unit with its own
argument, not a cleanup that rides along with this one.

### Two audit bugs found by doing the work

1. **The check scanned `PROGRESS.md` — its own generated output** — which
   prints every offending code inside its warnings. So a code fixed everywhere
   a student could see it stayed reported forever, and the list could never
   reach zero. Exactly how 24 blank-count warnings hid three broken questions
   in Unit 12: a list that cannot go down stops being read.
2. `[A-Z0-9]{4}-[A-Z0-9]{4}` matched **lesson ranges** like `0001-0004`. Every
   real example code carries a letter label in its first group, so all-digit
   first groups are now skipped.

Warnings 27 → 7; token warnings 24 → 4, and stable across consecutive runs
(which is the actual proof the loop is gone).

**The 4 remaining are all deliberate and should stay:** `MERC-8GH2-KP4O` is
`0012`'s negative fixture — its own self-check label reads *"a code using an
excluded letter is rejected too"*, so it documents itself; `MERC-8GH2-LP4X` is
the historical wrong canonical code that `CLAUDE.md` and `HANDOFF.md` narrate
as a cautionary tale; `BANK-4FJ1` and `SHOP-9KL3` are named in `SESSION.md` and
`TOKEN-TRACK.md` as codes already fixed. None is in teaching material.

**Not done, and deliberately left as a decision:** a per-file opt-out marker
for token codes, like the existing `audit-allow-alphabet`, would take those 4
to zero. It would also hide a genuinely accidental bad code in any file that
carried it, and that trade-off is worth stating rather than making quietly.

All 15 edited lessons re-verified — the replacements land inside quiz answers,
playgrounds and self-check expectations, so a half-applied rename would fail.

### Found while clearing the board: seven options that name other options

With the token noise gone, two "position-dependent option" warnings were
finally readable — and one was a false positive while the other was the visible
tip of a wider defect.

`quiz.js` shuffles options at render (`optionDisplayOrder`). **An option reading
"Both A and B" is therefore broken wherever it sits** — by the time a student
reads it, A and B are whichever options landed first. The old check warned only
when such an option was *not last*, so **six of the seven in the course passed
silently while being exactly as broken as the one that was flagged.** Same
family as the `which-breaks` inversion: the renderer does one thing and the
content assumes another.

All seven now name their content — "Both — the missing transition validation
and the missing ownership check" — which is also a better distractor, because it
cannot be picked by elimination. `a5/0004` q5 additionally moved to last, and
its key from index 2 to 3.

The check is now an **error**, fires regardless of position, and no longer
matches a bare "Neither": `02/0007` q0's "Neither — use a WebView with an HTML
table" references nothing and was a false positive. Proved by reintroducing
"Both A and B" into `x1/0003` and watching the audit error, then restoring.

**Audit state: 3 errors, 3 warnings.** The errors are the three pre-existing
orphan tables, which belong to the B2 rewrite. Warnings were 51 when this
session started.

## Unit 14 — M1 across the rest of the track — DONE

**Every track lesson now has a log entry — 96 of 96.** The split is in
`PROGRESS.md`; the point is that nothing is unmeasured any more. Before this
unit, most of the course had never been executed once.

Surveyed every track lesson with no log entry (skipping logged ones — running
an `unverifiable` lesson without its reason **fails and deletes the record**).
53 lessons fail; almost all only on `no self-check found in pg-exercise`, which
is the un-retrofitted state, not a defect.

**35 quiz-key failures, and the first five were the verifier's fault, not the
lessons'.** This is worth stating plainly because the tool exists to be trusted:

- `b3/0001` q0, q21 and several elsewhere wrote multi-line output as a
  comma-separated list — `"A, D, C, B"` for four lines. Correct, and how a
  student would type it. The normaliser collapsed whitespace but not commas.
  Commas now separate exactly like newlines.
- `b3/0001` q5 asks about `process.nextTick` versus promises versus
  `setImmediate`. The sandbox drains a microtask queue and a timer queue and
  has no notion of Node's phases, so it reported `3,4,2,1` where real Node
  gives `4,3,…`. **The lesson was right.** Questions using `nextTick` or
  `setImmediate` are now skipped, like the existing server/React/SQL skips.
- `a6/0003` q6 is a debounce: three rapid calls, only the last should print.
  The verifier printed all three, because `setTimeout` was shimmed onto the
  drainable queue and **`clearTimeout` was not** — student code reached Node's
  real `clearTimeout` holding an id this queue invented, so nothing was ever
  cancelled. The browser has real timers and debounces correctly, so this was
  the verifier and the browser disagreeing about a correct lesson.

Only one of the five was a lesson defect: `b3/0001` q15, whose answer described
a process-level crash in prose no sandbox reproduces literally. It asks about
behaviour rather than stdout, so it is multiple-choice now.

**All 30 premise-in-comment questions are fixed.** Their code was a scenario
written in comments, so they printed nothing, and their keys were prose like
*"Opens in browser (old cached AASA doesn't include /invite/\*)"* — which no
student could ever type into the box. 29 became multiple-choice with distractors
written by hand; keys were placed off index 1 throughout, and the authored
skew moved 62.8% → 61.4% as a side effect.

One was made executable instead: `a6/0003` q16's `formatLastSeen` is real,
runnable code whose input was described in a trailing comment. It now builds
the timestamp — `new Date(Date.now() - 90 * 60000)` — and prints. Prefer this
whenever the code genuinely runs; a converted question tests recall, an
executed one tests prediction.

**Zero quiz-key defects remain anywhere in the track.**

The 53 lessons that still fail do so for exactly one reason each —
`no self-check found in pg-exercise`, one per lesson, no exceptions. That is
the un-retrofitted state, and it is 1.5 and Phase 3's job. They are recorded
`unverifiable` with a reason naming what each solution actually needs, one
reason per module: SQL needs Postgres, WebRTC needs two devices and a TURN
server, x1 is git and shell setup rather than runnable code. A vague reason
would be worse than none, because it is stored and read later.

Regression check after the verifier changes: all 13 Module 01 lessons
re-verified with their `--wrong` files, and the three widget suites pass
(72 / 15 / 18).

**What M1 leaves for later.** `unverifiable` is an honest record, not a
finished state. When 1.5 gives Module 02 self-checks against plain functions,
and Phase 3 does the same elsewhere, those entries should become real
`verified` ones. The count to watch is `verified`, not the number of entries.

## Unit 13 — M1 over Module 02 — DONE

M1 as specified in `TOKEN-TRACK.md` § Maintenance, starting with Module 02
because its result is a required input to 1.5.

**The expected failure never happened.** The plan assumed most lessons would
fail on `no self-check found in pg-exercise`. They do not: Module 02 has no
`createSolution` at all, so section 4 has nothing to check and passes silently.
That is the whole point of 1.5 and it is not this unit's job.

**Four real defects, all premise-in-comment** — the pattern CLAUDE.md names,
where the code is a description in comments so the question prints nothing:

| Lesson | Was keyed | Fix |
|---|---|---|
| `0003` q10 | `"300"` | multiple-choice — flexbox arithmetic has no runtime |
| `0003` q15 | `"100"` | multiple-choice |
| `0003` q21 | `"80"` | multiple-choice |
| `0008` q6 | `"MERC-8GH2 → Priya"` | made genuinely executable |

`0003`'s three are layout arithmetic. No sandbox can run them — `dom-sandbox`
has no layout by design — so they are multiple-choice, which is what they
always were underneath. `0008` q6 is different: it was real code with the call
described in a trailing comment, so it now performs the call and prints. Its
token code went from `MERC-8GH2` to the canonical `MERC-8GH2-KP4X` — the
alphabet was fine but 8 characters is not the format, and the string was being
rewritten anyway.

Question counts per lesson are unchanged (25 each), which is the cheap proof
no `<script>` was broken by an edit. All three new keys sit off index 1.

**Priya stays.** The WhatsApp-clone reframe is 1.5's other half and mixing it
in here makes the diff unreviewable — the same call Unit 9 made.

### The metric this unit nearly broke

Recording the 14 lessons as "verified" put `Verified` at 27/96 — and seven of
those had **no playground, no solution and no executable question**. They
passed every section by having nothing in them, and were about to be counted
identically to `01/0013`, which earns it with 13 playgrounds and 29
self-checks. That is exactly the overstatement this log exists to prevent, and
it would have been introduced by the tool that exists to prevent it.

`verify-lesson.mjs` now distinguishes them: `nothing-to-verify` when no
playground ran, no solution executed and no question was checked. The audit
prints `none` rather than `—` (never run) and carries a separate count. Real
figures are in `PROGRESS.md`; the split for Module 02 is 7 verified, 7 with
nothing to run.

Log entries also gained `executableQuestions`, so "verified" can be read
alongside how much was actually executed. Module 01's 13 were re-run with their
`--wrong` case files so the log is consistent and no `wrongCases` reference was
lost.

## Unit 12 — fill-blank questions that cannot be answered — DONE

Not a phase item. Found by reading the audit's 24 "N blanks but one answer"
warnings, which had gone unread because the check is mostly noise.

`renderFillBlank` gives **one** text box and grades by exact string compare
(whitespace/semicolons stripped). So a multi-blank question only works when
every blank takes the *same* word. 21 of the 24 do. Three do not, and a student
who understands the material is marked wrong on all three:

| Lesson | Code | Keyed answer | Second blank actually wants |
|---|---|---|---|
| `a3/0003` | `new ___()` … `controller.___()` | `AbortController` | `abort` |
| `a5/0003` | `item.___.___()` | `id.toString` | `id` then `toString` |
| `b4/0001` | `.___(___, 'Password too long')` | `max(128` | `max` then `128` |

Same family as the `which-breaks` inversion fixed on 2026-08-15 — the renderer
says one thing and the key rewards another.

Two content bugs found in the same sweep, fixed alongside:
`a5/0004`'s SQL reads `COALESCE(${1}, payload)` (template-literal artifact,
should be `$1`), and `a8/0001` renders as `___dirname` because the `__` of
`__dirname` is matched as a blank.

Each was re-keyed to a **single** blank on the part the question actually asks
about: `new ___()` with `controller.abort()` shown, `item.___` answered
`id.toString()`, `.max(___, …)` answered `128`. Re-keying rather than adding a
second input box, because one box is the component's contract and 21 questions
depend on it.

**The bare count warning is gone**, replaced by three checks that are exact
about the ways one answer provably cannot fill every blank:

1. the answer has unbalanced brackets — `max(128` is a splice, not something a
   student could ever type
2. two blanks separated only by punctuation — `item.___.___()`, `.___(___,`
3. some blanks are property positions (`.___`) and some are not — the answer
   would have to play two roles

Not caught, and no static check can: blanks far apart that simply want
different words. `new ___()` … `controller.___()` is that case, and only
reading it tells you. The comment above `validateBlanks` says so.

**The first version of the check reported a false positive, and it was the
same bug as the lesson it was checking.** The blank regex was `_{2,}`, so
`__dirname` and `__DEV__` counted as blanks — exactly the `___dirname` mangle
in `a8/0001`. It is `_{3,}` now. Proved on a throwaway fixture carrying all
three defect shapes plus two legitimate multi-blank questions: three errors,
no false positives, fixture deleted.

Warnings 51 → 27. Errors unchanged at the 3 pre-existing schema ones.

**One more defect found by re-verifying the files I had edited**, which is the
argument for re-verifying at all: `a8/0001` q23 was a `predict-output` whose
code was three comment lines, so it verified as printing `""` against a key of
`"dist"`. The premise-in-comment pattern CLAUDE.md names. It is recall, not
prediction, so it is now multiple-choice with the answer at index 2.

The other four edited lessons still fail verification for one pre-existing
reason each — `no self-check found in pg-exercise`. That is the Phase 1.5 / 3
retrofit, not this unit. Blocks parse, playgrounds run, and every executable
`predict-output` passes in all of them. `a5/0004`'s `unverifiable` log entry
was re-run and survives; the log is still 29 entries and Verified is still
13/96.

## Phase 1

Phase 0 is done (see `HANDOFF.md` for the 10 steps and their commits).
Phase 1 item 1.1 (see `TOKEN-TRACK.md`'s work plan): retrofit practice into `01/0005`–`01/0012`,
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
| `01/0012-error-handling` | done — **Module 01 and Phase 1.1 complete** |

### Unit 11 — Phase 2: the ~20 spine lessons — DONE

**16 of 16 deepenable lessons carry Why this way / When this breaks / What
this costs you, and every one was re-verified.** `PROGRESS.md` has the counts;
`HANDOFF.md` has the narrative — what was found, why each decision went the
way it did, and the cross-cutting patterns. It is not repeated here.

| Lesson | Commit |
|---|---|
| `b7/0001` token generation & redemption | `ba7c06f`, `6cbbf9f` |
| `b3/0003` REST design | `7bb515d` |
| `b4/0003` rate limiting | `8100de7` |
| `a3/0002` API client | `f2756a0` |
| `b3/0004` validation | `3e496a2` |
| `a4/0002` auth context | `7fa401a` |
| `b4/0002` JWT rotation | `047f292` |
| `a10/0001` secure storage | `524b850` |
| `b7/0002` access rules engine | `1e8a2bc` |
| `b7/0003` revocation & pause | `0d1e6f4` |
| `b9/0002` Coolify | `f195c8f` |
| `b6/0001` signalling | `4f26ea7` |
| `b9/0001` Docker | `b823ef4` |
| `b10/0001` hardening | `d4a9346` |
| `a5/0001` token generation UI | `6acf1e3` |
| `a5/0004` access rules UI | (this unit) |

**Four spine lessons deliberately skipped:** `b2/0001`, `b2/0003`, `b5/0001`,
`b5/0002` are marked REWRITE in `TOKEN-TRACK.md`'s revised sequence — B2 for
ciphertext and partitioning, B5 for multi-node Redis — and C5 (E2EE, which
must precede B2) is not written. Deepening them is work that gets discarded.

**One decision was taken during the phase and it propagated:** ADR-0007, token
codes hashed for lookup and encrypted for display. Its follow-on work is
complete — `b7/0001`, `b3/0003`, `a3/0002`, `b9/0002` and `b10/0001` all
carry it.

**Three contradictions are recorded for the B2 rewrite** rather than guessed
at here: the `calls` / `participants` / `deletion_queue` orphan tables; whether
a holder is a row in `users` (`b6/0001` assumes yes, `b7/0001` says never); and
`access_rules` rows versus `tokens.rules` JSONB (`a5/0004` versus `b7/0002`).
Also open: row-level security, since every ownership check in the course is a
hand-written `WHERE user_id = $2`.

**Tooling added:** `verify-lesson.mjs --unverifiable "<reason>"`, used by all
sixteen — Track B solutions need Postgres, and the verifier could previously
only fail forever or lie. Everything else still runs, and caught real breakage
twice.

### Unit 10 — Phase 1.3, "explain it in your own words" — DONE

One prompt per lesson, all 13 of Module 01. New component
`assets/explain.js` + `scripts/test-explain.mjs` (18 assertions).

**It saves the answer rather than just asking.** A prompt in a box is easy to
skip; a box that still has last week's sentence in it is worth opening. It is
also the only record anywhere in this course of what the student *understood*,
as opposed to what they clicked — every other component tests recognition.

Storage matches `progress.js`: one key, `jslearn-explain`, holding
`{ "<lesson file>::<containerId>": { text, savedAt } }`. The lesson file is
part of the key, which is the bug worth guarding — the same container id in
two lessons must not show lesson 5's answer on lesson 6's page.

**The test suite crashed instead of failing, the first time it was proved.**
Breaking `keyFor` on purpose made an assertion read `.text` of `undefined`, so
the run died at test 11 and the *cross-lesson* check — the one protecting the
worst failure — never reported at all. Lookups now go through `entryOf` /
`textOf` helpers that return `null`. Re-proved after the fix: dropping the
lesson from the key fails 6 checks, removing the `trim()` fails 3, and both
report cleanly rather than exploding. That is the same "poor diagnostics"
problem CLAUDE.md names for self-checks, in the test suite itself.

Prompts ask **why**, not **what**, and name the specific thing each lesson
exists for — `maxUses: 0` truthiness in 0004, `textContent` vs `innerHTML` in
0007, where 248 comes from in the capstone. A prompt that could be answered
from the lesson title is decoration.

Inserted by a script written to a file, not piped through a shell — the
prompts carry apostrophes and inline `<code>`, which is exactly what CLAUDE.md
warns gets mangled. The script refuses to run twice and aborts rather than
guessing if a lesson does not have exactly one quiz heading and one
`progress.js` tag.

All 13 re-verified after the edit; audit unchanged (3 pre-existing schema
errors, 52 warnings).

**Module 02 deliberately not done.** Its prompts belong with the 1.5 retrofit,
written against the lesson as it will be, not the pre-pivot version.

### Unit 9 — Firebase removal: Phase 0.4 and Module 02 — DONE

Student asked for both after the phase table showed 0.4 was still open despite
being recorded as done.

**0.4 — `a7/0004-incoming-calls`.** Two lines: a `@react-native-firebase/
messaging` import and a library name in a playground. Replaced with
`expo-notifications` + `expo-task-manager`, plus a callout drawing the
distinction that caused the contradiction in the first place: **FCM is the
transport, Firebase is the platform.** Only Apple and Google can wake a
backgrounded app, so FCM/APNs is the one accepted third party — but
`expo-notifications` already speaks to both, so the native SDK buys nothing
and costs a Google config file in the repo. The remaining "Firebase" strings
in that file are deliberate negative references and should stay.

**Module 02 — 15 files, ~81 mentions.** Categories, because they are not all
the same job:

1. Prose data-source references ("from Firebase in Module 3") → the Token API
2. Forward references to **Module 03, which is SUPERSEDED** — doubly wrong,
   they point a student at a dead Firebase module
3. Real Firebase code — `0006-useeffect` has `firebase.firestore()...
   onSnapshot()` as its cleanup example, which is the pattern Token replaces
   with a WebSocket subscription
4. Quiz questions and options naming Firebase

Scope is Firebase only. The WhatsApp-clone framing (Priya, read ticks) is the
*other* half of 1.5 and is deliberately left alone here — mixing the two makes
the diff unreviewable.

Replacement vocabulary, so it stays consistent across 15 files:
`Firebase`/`Firestore` (data) → the Token API · `Firebase Auth` → the auth API
(B4/A4) · `onSnapshot` listener → WebSocket subscription (B5/A6) ·
`Firebase Storage` → object storage through the API (C4) · `Module 3` → the
module that actually does it.

**Result: Module 02 is at zero mentions**, and every quiz block still parses —
question counts per lesson are unchanged (25 each, 30 in `0002`), which is the
cheap proof that no `<script>` was broken by an edit.

Two judgement calls worth keeping:

- **`0006-useeffect` needed a real rewrite, not a find-and-replace.** Its
  cleanup section taught `firebase.firestore()…onSnapshot()`. It now teaches
  `socket.subscribe()` returning its own unsubscribe, with the general point
  made explicit — *a subscribe call returns the function that undoes it* —
  which is what makes one cleanup pattern cover timers, listeners and sockets.
  Its second quiz question was rewritten with it, and the correct answer moved
  off index 1 while I was there.
- **Negative references stay.** `a6`, `b5`, `b6` and now `a7/0004` all name
  Firebase deliberately, to say what Token does *not* use and why — `b6/0001`
  has a whole quiz question on it. Those are the constraint being taught, not
  a violation of it. Do not "clean" them.

The `a7/0004` fix also answers a question the course had never answered
outright: **FCM is the transport, Firebase is the platform.** Push is the one
third party Token accepts because only Apple and Google can wake a
backgrounded app — but `expo-notifications` already speaks FCM and APNs, so
the `@react-native-firebase` SDK adds a native dependency and a Google config
file in the repo for nothing.

**`modules/03-firebase-backend/` is deleted** — the student called it after
being shown the trade-off. 5 lessons and a README, 3,071 lines, in git history
at `fbf79c0~1` if any of it is ever wanted back.

Two inbound links from `modules/04-whatsapp-features/` were replaced with
disabled spans *before* the removal, so the deletion added no new audit
warnings. Legacy lessons 45 → 40; track lessons unchanged at 96, since 03 was
never counted as track.

Nothing else pointed at it — not `index.html`, not `search-index.json`. The
only surviving mentions are historical notes in `HANDOFF.md`, which are meant
to be historical.

### Unit 8 — Phase 1.2, the Module 01 capstone — DONE

Phase 1 item 1.2: a pure-JavaScript token issuer — generate,
store, apply rules, revoke — as the Token repo's **first real commit**.

Shape decided before writing:

- **Three staged exercises, not one.** A single 100-line exercise stalls a
  beginner on lesson 13. Stages are `generateCode()`, then
  `createIssuer(generateCode)` with `issue`/`list`, then `redeem`/`revoke`.
  Each gets its own `createSolution` and its own self-check playground.
- **The repo artefact is the deliverable**, not the page. `token/practice/
  01-token-issuer/` — `issuer.mjs`, `demo.mjs`, `test.mjs`, `README.md`.
  `.mjs` throughout so `import` works with no `package.json` and no npm
  install; 0011 taught modules and this is the first place they run for real.
- **Generation uses `crypto.getRandomValues` with rejection sampling**, not
  `Math.random`. CLAUDE.md already carries the arithmetic (256 / 31 = 8 r 8,
  so the first 8 characters are 12.5% more likely); teaching the biased
  version and leaving it to be rewritten later would be vibe coding.

Tooling this needs first: `verify-lesson.mjs` pairs every `createSolution`
with the single playground `pg-exercise`, so a page with three exercises
cannot be verified. Adding a pairing convention — `exercise-<name>` →
`pg-exercise-<name>`, falling back to `pg-exercise` — before writing the page.

**Shipped.** `modules/01-javascript-fundamentals/0013-capstone-token-issuer.html`
and `token/practice/01-token-issuer/` (Token repo commit `221e6b0`, its first
real code). Verified by running:

```bash
node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0013-capstone-token-issuer.html \
     --wrong scripts/cases/0013-capstone-token-issuer.mjs
cd ../../../token/practice/01-token-issuer && node test.mjs   # 36 pass
```

10 teaching playgrounds, 3 staged exercises (6 + 8 + 15 = 29 checks), 30
questions, 11 alternative styles passing and 22 mistakes each tripping the
check named for it.

**The two mistakes the capstone exists for both produce output that looks
right.** `gen`'s modulo bias makes perfect-looking codes in which eight
characters are 12.5% more likely, forever, and unfixable for codes already
issued. `rules`' chatty messages enforce every rule correctly and read
*better* — and turn the redemption page into a code-guessing oracle. Neither
is catchable by reading the output, which is the argument for the test file
existing at all.

Deliberate calls worth not re-litigating:

- **`crypto.getRandomValues` with rejection sampling, not `Math.random`.**
  Teaching the biased version and leaving it for Track B to fix would put a
  permanent flaw into codes already issued.
- **Randomness and time are both injected** — `generateCode(nextByte)` and
  `now` as a parameter on every issuer method. That is what makes the bias
  test exact rather than statistical, and it is stated in the lesson as the
  reason, not as a style preference.
- **Statuses are derived at read time.** A stored status needs a sweep to
  maintain it and is wrong until the sweep runs.

Two tooling problems found by writing it:

1. `verify-lesson.mjs`'s demo-stripping filter matched `const x = create…`
   after `trim()`, so an *indented* `const issuer = createIssuer(gen)` inside a
   solution's function body would have been deleted and the student blamed for
   the resulting failure. Now anchored to column 0.
2. A backtick inside a `createSolution` exercise string ends the template
   literal and kills the whole `<script>` block. Cost one debugging cycle;
   noted in CLAUDE.md next to the `</script>` trap.

Also fixed a standing lie in the audit: **`Verified` had read 0/95 since the
column existed**, because nothing ever wrote `scripts/verification-log.json`.
`verify-lesson.mjs` now writes it on a pass and deletes the entry on a fail,
and all 13 Module 01 lessons were re-run to populate it — 13/96.

### Unit 7 — `01/0012-error-handling`

Overlap checked first. Verdict: enough new material, unlike 0011.

- `try`/`catch` with `await` **is** already in 0009 §5, so that part is
  compressed and cross-referenced rather than re-taught.
- Genuinely new and uncovered: `throw`, `finally`, custom error classes,
  `instanceof`, and validating before you call.

**§5 is "Firebase-specific error handling" — 29 Firebase mentions in the
lesson.** Out of scope per CLAUDE.md, and it is a whole section rather than a
stray reference, so it is replaced rather than trimmed. The replacement is
errors crossing Token's own API boundary, which carries a genuinely
Token-specific security point: a redemption page that distinguishes "no such
token" from "this token is revoked" lets an attacker enumerate valid codes.
Both must produce the *same* message. One check in the exercise tests exactly
that, by comparing the two messages for equality.

Shipped: 7 playgrounds, an exercise with 10 checks, 4 alternative styles and
7 mistakes. The mistake the lesson exists for — **chatty messages** — handles
every error type correctly, returns the right shape, never throws, and is
*more helpful to read*. It fails exactly one check. Being helpful is the bug.

**One audit warning added on purpose (51 → 52).** `pg-validate` uses
`MERC-8GH2-KP4O` as a negative fixture: correct length, correct grouping, and
impossible, because `O` is not in the alphabet. The playground explains why
right underneath it. This is the deliberate-negative-fixture case
CLAUDE.md's alphabet note anticipates — **do not "fix" it**; removing it would
delete the only place in the course that teaches the alphabet constraint as a
validation rule rather than a piece of trivia.

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

**Phase 1.1 and 1.2 are both complete.** Module 01 is 12 lessons plus a
capstone, all carrying practice and all verified by execution — see
`PROGRESS.md` for the counts, which are now computed rather than asserted.

What remains in Phase 1 (`TOKEN-TRACK.md` § work plan):

| # | Work | Status |
|---|---|---|
| 1.1 | Retrofit `01/0005`–`01/0012` | **done** |
| 1.2 | Capstone at the end of Module 01 | **done** — Token repo `221e6b0` |
| 1.3 | One "explain it in your own words" prompt per lesson | **done** for Module 01; Module 02's come with 1.5 |
| 1.4 | Spaced review from the previous two lessons | **done** — built into each retrofit |
| 1.5 | Same retrofit for Module 02, just-in-time | not started |

**Phase 1 is done except 1.5, and Phase 2 is complete.**

### Agreed 2026-08-17: M1, then M2, then 1.5

The student is partway through Module 01 (their own answer — not inferred) and
asked for all three planned rather than pausing. The work is specified in
`TOKEN-TRACK.md` § Maintenance and § "1.5 in detail"; only the ordering and
its reasoning are here.

1. **M1 — verify what has never been executed.** First, because it is the only
   one that *finds* work rather than assuming it. Every time the verifier has
   been pointed somewhere new it has found real defects, most recently
   `a8/0001` q23 in `7c86660`. Start with Module 02, whose result is a required
   input to 1.5. **DONE — Units 13 and 14.** All 96 track lessons carry a log
   entry and no quiz-key defect remains.
2. **M2 — the invalid example codes.** Independent of both, and safe to slot in
   whenever. Per-code reading, never a bulk rewrite — some are deliberate
   negative fixtures. **DONE — Unit 15.**
3. **1.5 — the Module 02 retrofit.** Last, and still just-in-time: it is a big
   job and the student is 7+ lessons short of needing it. Planning it now is
   fine; writing 14 lessons they will not open for weeks is the batching mistake
   that produced 95 unverified lessons in the first place.

**The 1.5 blocker is now decided** and written into `TOKEN-TRACK.md`: exercises
put their logic in a plain function the component calls, and the self-check
tests that function. Four render-only lessons take `--unverifiable`. This
removes the "decide before writing any of it" gate that stood here.

**Phase 3** — the ten new modules (C0–C9) — is explicitly just-in-time and
stays unstarted. It is far further from the student than 1.5 is.

**When the student reaches the capstone**, they need Node 19+ on the machine
(`node -v`) — `crypto.getRandomValues` as a global is the only environment
requirement in the whole module. Worth checking before they get there rather
than at the exercise.

Two things to check before writing any further lesson, both of which have now
bitten more than once:

- **Premise-in-comment questions** (`// Given: <div>…`, `// User clicks`) —
  comment-only code with a prose answer, so the question prints nothing.
  `verify-lesson.mjs` now catches every one automatically, which is how about
  a dozen were found across Phase 2. No grep needed; just run the verifier.
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
