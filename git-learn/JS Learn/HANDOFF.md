# HANDOFF — JS Learn / Token Course

**The narrative record: why decisions were made, what failed, and what was
learned session by session.** Everything else has a different home —

| You want | Read |
|---|---|
| What the project is, architecture, conventions, product rules | `CLAUDE.md` |
| Counts, coverage, verification state | `PROGRESS.md` (generated — run `node scripts/audit.mjs`) |
| What is in flight, what is next | `SESSION.md` |
| The lesson sequence and the phase plan | `TOKEN-TRACK.md` |
| A product decision and its rejected alternatives | `token/docs/adr/` |

**Nothing here restates a number a script can compute.** Sections doing exactly
that were removed on 2026-08-16 — they had drifted, which is the whole reason
the rule exists.

> **"Complete" in any older entry means _written_, never _studied_.**
>
> Student progress is the one fact no script can compute. It comes from the
> student or from `progress.js` localStorage — **never** inferred from the
> files. Inferring it produced the "Modules 1 and 2 complete" claim that
> mispitched every session for months.

> **Sessions before 2026-08-16 are in `docs/archive/handoff-2026-08-14-to-15.md`.**
> They cover the original audit, the quiz-key repairs, the seven pivot
> decisions and the start of Phase 0. Split out to keep this file readable;
> nothing was discarded.
>
> **`SESSION.md`'s accumulated log is in
> `docs/archive/session-log-2026-08-17-to-25.md`**, split out 2026-08-28. It is
> the per-lesson defect narrative from the M3 and B-track work — what each
> lesson shipped that was wrong and how it was found. Kept for the method,
> which generalises; the instances are all closed.

---

### Session of 2026-08-16 — the Module 01 capstone, and the repo's first code

Phase 1.2. The Token repo had been scaffolded on 2026-08-15 and contained
nothing but READMEs and ADRs; it now contains a program.

**`token/practice/01-token-issuer/`** — `issuer.mjs`, `demo.mjs`, `test.mjs`,
`README.md`. Generate, store, apply rules, revoke, in memory, no dependencies.
`node test.mjs` runs 36 deterministic checks. `.mjs` throughout so `import`
works with no `package.json`, which keeps the whole configuration of the
project at zero.

**`modules/01-javascript-fundamentals/0013-capstone-token-issuer.html`** —
three staged exercises rather than one. A single hundred-line exercise on
lesson 13 is where a beginner stops; `generateCode`, then the store, then the
rules, each with its own self-check, is where they finish.

#### Why the generator uses a CSPRNG

The easy version of this lesson uses `Math.random()` and leaves the real thing
to Track B. That would have been wrong in a way the course could not undo:
codes already issued under a biased or predictable generator cannot be fixed
retroactively. So the capstone teaches `crypto.getRandomValues` with rejection
sampling, and spends a section deriving 256 / 31 = 8 remainder 8 rather than
asserting it.

The proof is in `test.mjs`, and it is exact rather than statistical: feed the
generator the bytes 0–255 in order and count the letters. Correct code uses
every letter equally often. Deleting the `if (byte >= 248) continue;` line
makes the counts run 375 to 422 — the 12.5%, measured. Detecting the same
thing against real randomness would have needed tens of thousands of samples
and still been flaky.

That test only exists because **`generateCode` takes its byte source as an
argument**, and the same move is made again with `now` on every issuer method.
Both are stated in the lesson as the reason the tests can be exact, not as a
style preference.

#### The two mistakes it is built around

Both produce output that looks correct, which is the whole argument for the
`--wrong` cases:

- **Modulo bias.** Every code looks perfect. Eight of the thirty-one
  characters are 12.5% more likely than the rest, permanently.
- **Chatty denial messages.** Every rule enforced correctly, and the page is
  friendlier to use. It is also a code-guessing oracle — different wording per
  reason hands out one bit per guess, which is exactly what a search needs.

22 mistakes and 11 alternative correct styles are checked, each mistake
against the specific check it should trip.

#### Tooling

- **Staged exercises.** `verify-lesson.mjs` paired every `createSolution` with
  the one playground `pg-exercise`, so a multi-exercise page was unverifiable.
  `exercise-<stage>` now looks for `pg-exercise-<stage>` and falls back to the
  old name; `--wrong` files may export `stages`. Every earlier lesson
  re-verified unchanged.
- **The demo-stripping filter was matching indented lines.** `const issuer =
  createIssuer(gen)` inside a solution's function body would have been deleted
  before the self-check ran, and the student blamed for the failure. Anchored
  to column 0.
- **`Verified` in the audit had read 0 since the column existed** — nothing
  ever wrote `scripts/verification-log.json`. It is now written by a passing
  verifier run and cleared by a failing one, and all 13 Module 01 lessons were
  re-run to fill it. A number nobody maintains is worse than no number.

#### New gotcha

A backtick inside a `createSolution` **exercise** or **solution** string ends
the template literal and kills the entire `<script>` block. Hints are ordinary
quoted strings and are safe. This is the `</script>` trap's sibling and it is
now in CLAUDE.md beside it.

### Session of 2026-08-16 — Firebase out of Module 02, and Phase 0.4 finally done

Prompted by building a phase table and checking each item against the files
instead of the record. **Phase 0 was recorded as complete; item 0.4 was not
done.** `a7/0004-incoming-calls` still imported `@react-native-firebase/
messaging`. That is the same failure mode as "Modules 1 and 2 complete" — a
claim nobody re-checked — and it is the argument for the audit and the
verification log both being generated rather than asserted.

#### 0.4 — and the distinction that caused it

Replaced with `expo-notifications` + `expo-task-manager`, and a callout added
that states the thing the course had never said plainly:

> **FCM is the transport. Firebase is the platform.**

Only Apple and Google can wake a backgrounded app, so FCM/APNs is the one
third party Token accepts — but `expo-notifications` already speaks to both.
Pulling in the `@react-native-firebase` native SDK to receive a push buys
nothing and costs a native dependency, a `google-services.json` in the repo,
and an analytics client nobody asked for. The server sends a data-only
high-priority message; Google routes bytes and learns a device got something,
never who is calling whom.

#### Module 02 — 15 files, ~81 mentions, now zero

Not one job but four: prose data-source references, forward references to
**Module 03 (superseded)**, real Firebase code, and quiz questions naming it.

The one that needed thought was `0006-useeffect`, whose cleanup section taught
`firebase.firestore()…onSnapshot()` — the exact pattern Token replaces. It now
teaches a WebSocket subscription and makes the general rule explicit: *a
subscribe call returns the function that undoes it*, which is why one cleanup
pattern covers timers, event listeners and sockets alike.

`README.html` pointed "next" at `03-firebase-backend`, walking the student
straight into the superseded module. It now points at X1, which is what the
revised sequence in `TOKEN-TRACK.md` actually says comes next.

**Negative references were kept deliberately.** `a6`, `b5`, `b6` and the new
`a7/0004` callout all name Firebase to say what Token does not use and why —
`b6/0001` has a quiz question whose whole point is that answer. Those are the
constraint being taught. A future grep-and-replace should leave them alone.

Proof nothing broke: per-lesson question counts are unchanged (25 each, 30 in
`0002`), so no `<script>` block was damaged, and the audit reports the same 3
pre-existing schema errors and 52 warnings as before — no new link errors,
which is what confirms the new nav target resolves.

#### And then Module 03 was deleted

Raised as a separate decision; the student took it the same day. `modules/
03-firebase-backend/` is gone — 5 lessons and a README, 3,071 lines: project
setup, authentication, two Firestore lessons and Storage.

The reasoning on both sides, since deletions are the one thing that cannot be
re-derived from the files afterwards: it was the only written material on
auth, real-time sync and file upload, and Track B has not reached any of the
three. Against that, every line of it teaches a stack that is out of scope —
so the material would have to be rewritten rather than adapted, and leaving it
in place meant a student who wandered in would be studying the wrong product.
Git keeps it either way.

Order of operations mattered: the two inbound links from
`modules/04-whatsapp-features/` were turned into disabled spans **before**
`git rm`, so the deletion added **no new audit warnings** — still 52, with the
same 3 pre-existing schema errors. Legacy lessons 45 → 40; track lessons
unchanged at 96, because 03 was never counted as track. Nothing else referenced
it: not `index.html`, not `search-index.json`.

Recover with `git show fbf79c0~1:"git-learn/JS Learn/modules/03-firebase-backend/README.html"`
or check the whole tree out of that commit.

### Session of 2026-08-16 — Phase 1.3, and a test suite that hid its own failure

One "explain it in your own words" prompt in each of Module 01's 13 lessons,
between the exercise and the quiz. New component `assets/explain.js`, backed by
`scripts/test-explain.mjs`.

#### The one design decision

The item as written in the work plan is "add a one-sentence prompt". A
prompt in a callout is free to build and free to ignore, so this one **saves
the answer** and restores it on the next visit.

That is not a flourish. Every other component in this course tests
recognition — a quiz offers four options, a self-check runs code the student
already wrote. Writing the idea out in a sentence is the only thing here that
tests production, the sentence you cannot finish is what names the section to
re-read, and the saved text is the only record anywhere of what was understood
rather than clicked.

Storage deliberately copies `progress.js`: one key holding one object, keyed by
lesson file *and* container, so the same id in two lessons cannot collide and a
future "you have written 7 of 13" needs no migration.

#### The test suite hid its own worst failure

Standard practice here is to prove a new suite has teeth by breaking the thing
it guards. Breaking `keyFor` did make it fail — but an assertion read `.text`
off an entry that was now `undefined`, so the run **crashed at test 11** and
every test after it, including the cross-lesson separation check, never
reported. The check protecting the worst failure mode was the one silenced by
the failure.

Lookups now go through `entryOf`/`textOf` helpers returning `null`. Re-proved
after the fix: dropping the lesson from the key fails 6 checks cleanly, and
removing the `trim()` fails 3.

This is the same defect CLAUDE.md already names for lesson self-checks — "a
mistake that trips *every* check means the self-check has poor diagnostics" —
appearing in a test suite instead. Worth remembering that the rule applies to
the tooling, not just the lessons.

#### Prompts

They ask **why**, not **what**, and each names the specific thing its lesson
exists for: `maxUses: 0` truthiness in `0004`, `textContent` versus
`innerHTML` in `0007`, where 248 comes from in the capstone. A prompt that
could be answered from the lesson title is decoration.

Inserted by a script written to a file rather than piped through a shell — the
prompts carry apostrophes and inline `<code>`, which is precisely what gets
mangled otherwise. It refuses to run twice, and aborts rather than guessing if
a lesson does not have exactly one quiz heading and one `progress.js` tag.

All 13 lessons re-verified afterwards; the audit is unchanged.

**Module 02 was left out on purpose.** Its prompts belong with the 1.5
retrofit, written against the lesson as it will be rather than the pre-pivot
version — otherwise they get written twice.

### Session of 2026-08-16 — Phase 2 opens, and the server was using the wrong alphabet

Phase 2 is "deepen the ~20 spine lessons". The assessment that precedes it
found something worth more than the deepening.

#### The defect

`b7/0001` — the lesson that builds the server-side code generator — taught:

```
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
```

The comment is false. The literal contains **L** and is 32 characters. The same
literal was in `a2/0001` and `b3/0001`. Module 01, `a5/0001` and `a5/0002` all
use the canonical 31 — so **the server generated codes the client rejects**.

This is the `MERC-8GH2-LP4X` failure one level up. That was one bad example
code; this was a bad *generator*, producing an unlimited supply of them.

The arithmetic was wrong with it: the lesson claimed 32<sup>12</sup> ≈ 1.1
trillion. 32<sup>12</sup> is 1.15 × 10<sup>18</sup>; 1.1 trillion is
32<sup>8</sup>. The correct figure for the real alphabet is 31<sup>12</sup> =
787,662,783,788,549,761. Four quiz keys were derived from the wrong number.

**The audit now checks alphabets, not just codes**, as an error, with an
`audit-allow-alphabet` opt-out for deliberate counter-examples. The check that
existed could only catch a wrong code — which is why this survived: no example
code in the lesson was wrong, because the lesson never printed one.

#### Why 32 was tempting

Worth recording, because it is now the "what was rejected" paragraph in the
lesson rather than a silent bug: 256 divides evenly by 32, so `byte % 32` needs
no rejection sampling at all. The only way to get to 32 characters is to put an
ambiguous one back. Four lines of rejection loop against a permanent human-error
cost is not a close call — but it explains how someone got there.

#### What was deepened

`b7/0001`, 709 → 2,190 words. The three sections are load-bearing, and the
sharpest is in **When this breaks**: the lesson's own body used

```
await pool.query('SELECT * FROM tokens WHERE code = $1 FOR UPDATE', [code]);
```

A row lock lives as long as its transaction. `pool.query` runs one statement in
an implicit transaction that commits immediately, so the lock is released before
the next line reads `max_uses` — and the next query comes from a different
pooled connection anyway. The lesson shipped that while its own exercise
solution did `connect()` / `BEGIN` / `COMMIT` correctly. Both are now in the
lesson, one as the trap and one as the model.

The other correction of substance: `createUniqueCode()` does SELECT-then-INSERT,
which is a TOCTOU race. The guarantee is the `UNIQUE` index; the correct shape
is insert-and-catch `23505`, which is also one round trip instead of two.

#### The open decision, put to the student and taken — ADR-0007

Whether `tokens.code` should hold the code at all. Raised as a fork rather than
decided in a lesson edit; the student chose **hash for lookup + encrypted copy
for display**.

`tokens` now stores `code_hash` (SHA-256 of the normalised code plus a
server-side pepper, indexed) and `code_enc` (AES-256-GCM). The bare code exists
only in memory on its way to the creation response, and in the reveal endpoint's
output.

Deliberately **not** bcrypt or argon2 — they salt randomly, which makes finding
a row by its code impossible without scanning the table. The pepper does the
salt's job, and slow hashing buys nothing against a code drawn from
31<sup>12</sup>.

**Hash-only lost on product grounds, not security ones.** It is the simpler and
slightly stronger option, and it makes re-showing a code or its QR impossible
forever — a limitation the user never asked for. It stays correct for anything
nobody needs to see twice; refresh tokens should use it.

The lesson's code was rewritten to match rather than left describing one design
and demonstrating another. That is the specific drift this project keeps
finding, so it was not left for later.

**The cost is operational and it is in the ADR:** the pepper and key are
critical state. Lose them and every token in the system is dead. They belong in
the disaster-recovery plan, backed up somewhere the database backups are not.
Rotating the pepper rewrites every row — possible only because C keeps the
plaintext recoverable; under hash-only it could not be done at all.

**Follow-on, recorded so it is not forgotten:** B2 must be written against these
columns (it is already scheduled for rewrite), `b7/0002` and `b7/0003` look
tokens up by code and need `code_hash`, and B9 must carry the two secrets as
required environment variables.

#### Tooling: `--unverifiable "<reason>"`

Track B solutions need Postgres. The verifier could previously only fail or lie.
It now takes a mandatory reason, records `status: "unverifiable"` in the log,
and still runs everything else — parse, playgrounds, executable predict-output.
The audit prints `n/a` rather than counting the lesson verified.

#### Scope note for whoever continues

Four of the twenty must **not** be deepened yet: `b2/0001`, `b2/0003`,
`b5/0001`, `b5/0002` are marked REWRITE in the revised sequence (E2EE for B2,
multi-node Redis for B5), and C5 has not been written. Deepening them is work
that gets thrown away. Fifteen of the remaining sixteen are still to do;
`SESSION.md` carries the suggested order, thinnest and most load-bearing first.

### Session of 2026-08-16 — Phase 2 finished: 16 spine lessons

The opening entry above covers `b7/0001` and the alphabet. This covers the
other fifteen and, more usefully, what they had in common.

#### The finding that matters more than any individual fix

**Almost every serious defect lived in the seam between two lessons, not
inside one.** Each lesson was internally consistent and looked correct in
isolation. The bugs were disagreements:

| Lesson A said | Lesson B said | Consequence |
|---|---|---|
| `b7/0001` generated from a 32-char alphabet with `L` | `a5/0001` validated against the canonical 31 | Server issued codes the client rejects |
| `b3/0003` routed `/tokens/:id` | `a3/0002` built `/tokens/${code}` | Codes back into access logs |
| `b4/0002` rotated refresh tokens | `a3/0002` refreshed once per 401 | Six concurrent 401s logged the user out |
| `b7/0002` reads `rule.start_time` | `a5/0004` writes `rule.start` | Time windows silently do nothing |
| `b7/0001`, `b7/0002` use `revoked_at` | `b7/0003` used a `status` enum | Two models of the same state |
| `b4/0002`, `a4/0002` say access token in memory | `a10/0001` stored it in SecureStore | An extra copy to steal |
| `a5/0001` called modulo bias "acceptable" | capstone and `b7/0001` reject it | A lesson arguing against the fix |

None of these is findable by reading one file carefully. They surfaced because
the lessons were deepened **in dependency order**, so each one was read with
the previous one's decisions still in mind. That is the method worth keeping,
not the individual corrections.

#### Recurring defect families

- **Node-local state that ADR-0003 forbids** — `b7/0003`'s socket registry and
  `b6/0001`'s call registry were both process-local `Map`s. Both report success
  while doing nothing when the other party is on a different replica: revoke
  answers 200 and the conversation stays live; a call never rings. Works
  perfectly on one box, fails silently on two.
- **Authorisation checked once, at the door** — redemption checks token state;
  the message path (`b7/0002`) and the call path (`b6/0001`) did not. Revoking
  a token stopped new redemptions and nothing else. Generalised into the
  lessons as: *every path that lets a holder reach the user is an
  authorisation point.*
- **Count-then-act races** — `max_uses` in `b7/0001`, contact limits in
  `b7/0002`, failed logins in `b4/0003`. Same shape three times, and `b7/0002`
  carried the comment "correctness matters more than speed here" directly above
  the racy version.
- **Enumeration oracles** — `b3/0003` returned 403 for another user's token,
  `b4/0003` said "account locked" and leaked existence by response timing.
- **`maxUses: 0`** appeared in four lessons. 0 is a token nobody can use;
  `null` is unlimited.
- **Premise-in-comment quiz questions** — about a dozen, all invisible until
  the verifier ran over a Track B lesson for the first time.

#### The ADR-0007 thread

The one decision taken during this phase, and it propagated further than
expected. Token codes are stored as `code_hash` (lookup) and `code_enc`
(display), never in the clear. Everything downstream followed:

`b7/0001` lookups and the reveal endpoint → `b3/0003` taking codes out of URLs
so the proxy log does not undo it → `a3/0002` building those URLs → `b9/0002`
the two secrets as required env vars, validated at startup, and a backup story
where the dump and the keys must be recoverable together and stored apart →
`b10/0001` the culmination: after all that, one `logger.info({ body: req.body })`
puts the code in a plain-text file. **The body became the sensitive part
precisely because we moved the code there.**

#### Tooling

`--unverifiable "<reason>"` was added in the first unit and used by all
sixteen: Track B solutions need Postgres, so the verifier previously could only
fail forever or lie. Everything else still runs — and did catch real breakage
twice, including two escaping failures I introduced with scripted edits.

Two `predict-output` questions asserted browser console formatting
(`[false, true, true]`, `Set(0) {}`) that the verifier disagrees with. Rewritten
to print unambiguous values rather than papered over — how a host renders a
`Set` is trivia about the host.

#### Deliberately not done

- **`b2/0001`, `b2/0003`, `b5/0001`, `b5/0002`** — marked REWRITE in the
  revised sequence. Deepening work scheduled for deletion is work thrown away.
- **Three contradictions recorded for the B2 rewrite** rather than invented
  here: the `calls`, `participants` and `deletion_queue` orphan tables; whether
  a holder is a row in `users` (`b6/0001` assumes yes, `b7/0001` says never);
  and `access_rules` rows versus `tokens.rules` JSONB (`a5/0004` versus
  `b7/0002`). Guessing at any of them would give B2 something wrong to be
  consistent with.
- **Row-level security.** Every ownership check in the course is
  `WHERE user_id = $2` — a habit, not a mechanism. One query written without it
  is a silent access-control bug. Named in `b10/0001`; the fix belongs to B2.

#### Where this leaves the course

`PROGRESS.md` has the numbers. Phase 1 has one item left (1.5, Module 02's
retrofit, deliberately just-in-time), Phase 2 is done, and Phase 3 is the ten
new modules — also just-in-time. The student is on lesson 5 or 6 of Module 01,
so nothing above is anywhere near them yet; it is groundwork that stops being
cheap to lay once lessons are being studied.

### Session of 2026-08-17 — the checks that reported finished work, and Module 02

One theme runs through everything below, and it is worth stating before the
detail: **a check that reports work already done stops being read, and then it
stops catching anything.** Four separate instances of that turned up in one
session, each hiding real defects behind noise it had generated itself.

#### Three quiz questions nobody could answer

`renderFillBlank` gives one text box and grades by exact string compare, so a
multi-blank question only works when the same word fills every blank. The audit
warned on blank *count* alone: 24 warnings, 21 of them perfectly correct.

87% noise is why nobody had read the list, and three genuinely unanswerable
questions had been sitting behind it — `a3/0003` wanted `AbortController` then
`abort`, `a5/0003` wanted `id` then `toString`, and `b4/0001` was keyed
`"max(128"`, a splice no student could ever type. Same family as the
`which-breaks` inversion: the renderer says one thing, the key rewards another.

The count carried no signal, so it is gone. Three exact checks replaced it —
unbalanced answer, blanks separated only by punctuation, mixed
property/non-property positions. **The first version of that check made the
same mistake as the lesson it was checking**: `_{2,}` matched the leading
underscores of `__dirname` and `__DEV__`, which is precisely the `___dirname`
mangle it was written to find.

#### M1 — the verifier was blaming correct lessons

Running `verify-lesson.mjs` over the whole track for the first time produced 35
quiz-key failures. **Five were the tool's fault, not the lessons'**, which
matters more than the thirty that were real:

- Several lessons key multi-line output as `"A, D, C, B"` — correct, and how a
  student types it. The normaliser collapsed whitespace but not commas.
- `b3/0001` q5 asks about `process.nextTick` versus promises versus
  `setImmediate`. The sandbox drains a microtask queue and a timer queue and has
  no notion of Node's phases, so it reported `3,4,2,1` where real Node gives
  `4,3,…`. **The lesson was right.**
- `a6/0003` q6 is a debounce. `setTimeout` was shimmed onto a drainable queue
  and **`clearTimeout` was not**, so student code reached Node's real one
  holding an id this queue invented and nothing was ever cancelled. The browser
  has real timers and debounces correctly — the verifier and the browser
  disagreeing about a correct lesson is the exact failure this tooling exists to
  prevent.

The other thirty were premise-in-comment questions: code written as a comment
block, so nothing printed, with prose keys like *"Opens in browser (old cached
AASA doesn't include /invite/*)"* that no one could type. 29 became
multiple-choice; one was made executable instead, which is the better fix
whenever the code genuinely runs.

**A metric nearly started lying during this unit.** Recording Module 02 as
"verified" would have counted seven lessons with no playground, no solution and
no executable question identically to `01/0013` and its 29 self-checks — they
passed every section by having nothing in them. There is now a separate
`nothing-to-verify` status. The tool that exists to stop overstatement had come
within one commit of introducing one.

#### M2 — and the audit warning about its own output

Of 24 flagged example codes, 2 were not codes (lesson ranges like `0001-0004`),
4 were deliberate or historical, and 18 were genuinely accidental. Replacements
keep each label's meaning rather than mangling a character: `SHOP`→`KART`
(Flipkart is already the `issuedTo` there), `UTIL`→`CGAS` (the label is
literally "City Gas").

**The plan's rule 3 was wrong and is withdrawn.** It said an 8-character code is
always an accident that should become 12. It is not — 84 standalone `MERC-8GH2`
across 26 files, plus a dozen other 8-character codes with valid alphabets. That
is an established shorthand, not a slip. Alphabet fixed, shape left alone.

Then two more instances of the session's theme. The check scanned `PROGRESS.md`
— **its own generated output** — which prints every offending code inside its
warnings, so a code fixed everywhere a student could see it stayed reported
forever. And it warned about `SESSION.md`, flagging `WAVE-1MN4` purely because
the entry recording its removal named it. **Writing an honest session note made
the audit noisier**, which is precisely backwards. Log and plan files are no
longer scanned; `CLAUDE.md` still is, deliberately, because it carries the
canonical example a lesson copies.

With the noise gone, two remaining warnings became readable, and one was the tip
of something wider: `quiz.js` shuffles options, so **"Both A and B" is broken
wherever it sits**. The old check only warned when such an option was not last,
so six of the seven in the course passed silently while being exactly as broken
as the flagged one.

#### Phase 1.5 — Module 02, at the student's explicit direction

Started ahead of the student, who is partway through Module 01 and was told so
before agreeing. Thirteen lessons retrofitted plus `0001`; all 14 verified;
zero WhatsApp-clone framing left.

**`--unverifiable` was never needed once.** The plan predicted four
render-or-pipeline lessons would have no runnable logic, and all four
predictions were wrong. Flexbox is arithmetic (`layoutRow`); the keyboard lesson
is string normalisation (`normaliseCode`); the image picker is a payload filter
(`prepareAttachment`); even the Expo setup lesson has `eas.json` profile
inheritance in it (`resolveProfile`). On this evidence the reflex to reach for
`--unverifiable` is wrong more often than right — look for the plain function
first.

**Two product corrections came out of the reframe, not the practice pass.**
`0010` was built on an email/password registration form, which contradicts the
thing Token exists for — `b10/0002` already says collecting either violates data
minimisation. `0011` was a profile-avatar picker for a product that has no faces
in it; reframing it to a thread attachment surfaced a hazard the lesson never
mentioned, that EXIF carries GPS, so photographing your own gate for a courier
hands them your address through the app installed to prevent that. Both lessons
were internally consistent and taught the wrong product. Only a reframe finds
that class of error.

The exercises accumulated an argument nobody planned: `0005` establishes that
React watches object identity, `0007` reuses it with a visible cost, `0013`
shows `sort()` reordering state in place. Three lessons, one underlying truth,
arrived at independently because it kept being the real answer.

#### What the wrong-cases were actually for

**Five times this phase, a green self-check proved nothing.** `0003` used three
children that all came out 100dp wide; `0008` navigated to a screen at index 0,
where "pop back to it" and "clear the stack" agree; `0009` used a label
identical before and after trimming; `0010` used a password long enough to
survive it. `0013` had a real `NaN` bug in one of my own "correct" alternatives.

Every one was found by a wrong-case that should have failed and did not — never
by the self-check passing. **Choose fixture values that differ from what a wrong
answer would produce**, and write the wrong-cases, because they are the only
thing that tests the test.

Two self-checks also crashed rather than failed (`0012`'s unguarded
`items.length`, `0001`'s unguarded recursion), aborting every check below them.
That is the `test-explain.mjs` defect from Unit 10 again: where a mistake can
throw rather than return, wrap that check on its own.

#### One process note

CLAUDE.md warns against building lesson content through a shell. That warning
applies to bulk *edits* too. A blanket `quality: 0.8,` replacement in `0011`
injected real newlines into four quiz code strings, breaking the whole block,
and successive fixes kept being mangled by escape handling until the bytes were
edited directly.

### Session of 2026-08-18 — the documents were right and the code was wrong

Sixteen commits, and one sentence covers nearly all of them: **every defect
found today was a claim that had been true when it was written.** Not sloppy
prose — accurate prose, describing code that later moved. Module 02's framing,
the answer-position exploit, the permanently-red audit, three retry rules, a
check that had been correct since August. The code drifted and nothing was
measuring the gap.

That is the same failure as "Modules 1 and 2 complete" and the playground
loop-guard paragraph this file already records. It is now clear it is not an
occasional lapse but *the* recurring defect of this project, and most of today's
tooling work was aimed at it specifically.

#### The rename that was not just a rename

`02/0013` still said `chat` in its filename while its title, `<h1>` and content
had said *Token List Screen* since the retrofit. `SESSION.md` said both `0013`
and `0014` needed renaming; `0014` already matched its own title, so only one
did. The rename reached `search-index.json`, the module README, the nav in two
neighbouring lessons, the wrong-case file's **name and its header comment**, and
`verification-log.json` — where a rename leaves an orphan key that the generator
never prunes.

`search-index.json` also had `0013` keyed `"Modal Alert dialog popup"` —
keywords belonging to some other lesson entirely, so search could not find the
capstone at all.

#### Module 02 — the framing was load-bearing

`SESSION.md` asserted "Module 02 carries zero WhatsApp-clone framing". Measured:
`chat` in 11 of 15 files, `avatar` in 11. Only `Priya` was genuinely gone, which
is probably why the claim felt true.

**And it was not cosmetic. Five lessons were broken by it:**

- `0009` sample rows 1–2 were tokens, rows 3–4 were still `Family Group` and
  `Work Team` with `name`/`preview`. The renderer reads `item.name[0]`, so the
  two *token* rows threw `TypeError`. The revealed solution crashed on its own
  data.
- `0014` had the same split list, plus a line still carrying shell-mangle damage
  (`timy!'`) from an earlier bulk edit.
- `0013`'s detail screen rendered `isGroup`, a variable it never destructured —
  `ReferenceError`, in the capstone.
- `0007`'s eighth fixture was the only non-token in the list, so that row
  rendered blank in the lesson about rendering lists.
- `0002` defined `handleChatPress` while the call site already said
  `handleTokenPress`.

Plus two that were wrong rather than broken: `0009` showed a badge reading
**"Group"** whenever a token was *paused*, and a header reading **"online"** —
presence, in a product built so that nobody learns who the holder is.

**The word-grep was the weakest instrument used all day.** Searching `chat` and
`avatar` never found the largest signal: WhatsApp's entire palette — `#075E54`,
`#25D366`, `#128C7E`, `#DCF8C6`, `#ECE5DD` — was the app chrome in 13 of 15
files, 95 occurrences. Product framing hides in constants. No palette had to be
invented: `0003` §10 already defined `TokenColors` and said "keep these handy —
you'll use them throughout the course", written and never applied, so the
reference and the examples disagreed *on the same page*.

Four `chat`/`avatar` mentions were kept deliberately and must stay — the "a chat
app puts a photo of a person on every row; Token cannot, and would not want to"
contrasts. They are the sharpest statements of the product in the module, and a
bulk replace eats them first. That is why this was done file by file.

#### Three checks, and what it costs to make one worth reading

**`check-pre-blocks.mjs`** closes a real gap: `verify-lesson.mjs` runs what a
lesson *executes*, and a display `<pre>` is executed by nobody — which is how
`0014` sat marked `verified` while carrying a block that does not parse.

Getting it quiet took three rounds, recorded in the file because each was a
chance to silence the signal instead of the noise: **71 findings** (all shell
`#` comments — "see what's changed"), then **42** (non-JS blocks: a status-code
table, a screen's UI copy), then **16** (JSX children spanning lines), then
**0** once the quote had to sit in a code position.

Zero findings is either a clean course or a dead check, and they look identical
from outside. `test-check-pre-blocks.mjs` is the only thing that tells them
apart — 14 assertions including the literal `0014` line, *and* the same damage
inside blocks that also contain `#` comments and JSX, the two suppressions most
likely to have swallowed it.

**`known-issues.json`** ends the permanently-red audit. It had exited FAIL on
the same three orphan tables every run, and a build that is always red is read
as often as a warning list that is mostly noise — after which a *new* error
lands in a build nobody looks at. Acknowledged errors print under "Known and
blocked" with a **why** and a **gate**, still fully visible, and stop holding
the build red.

The rule that keeps it honest is the second one: **an entry matching no error
also fails, as stale.** Without it the file becomes where errors go to be
forgotten. When B2 lands and `participants` exists, the audit will fail with
"no longer matches any error" — that is the signal to delete the entry.

**The warning list** went 3 → 1. Both token warnings were *correct content*:
`01/0012` feeds deliberately invalid codes to a validator, and `CLAUDE.md` names
`MERC-8GH2-LP4X` while explaining why it was wrong — the check was warning about
the paragraph documenting the bug the check exists to prevent. A whole-file
opt-out on `CLAUDE.md` would be dangerous, since that is the file carrying the
canonical code lessons copy, so a line-level `audit-allow-token-here` was added
instead. Then writing the paragraph that documents the new marker named both
codes on unmarked lines and put warnings straight back to 3 — the third instance
that day of a document being punished for describing a defect accurately.

#### The answer-position exploit that had already been fixed

`CLAUDE.md` told every author that "always picking the second option scores ~64%
course-wide". Untrue since `quiz.js` started shuffling options at render: the
fix landed in the renderer and the warning stayed in the prose.

Measured: 1,368 keyed questions, 61.4% authored at index 1, all shuffled — and
**48 that render as authored**, because `quiz.js` refuses to shuffle a question
whose explanation names an option by position. Those 48 were the only real
residual, and all of them have now been reworded, so `render-as-authored: 0` and
every question in the course shuffles.

Several were never about options at all. "The second one uses the old value"
meant the second *revocation*; "calls B and C await the same promise" meant the
other two *API calls*; "only the last one is valid" meant the most recently
issued *refresh token*. Those questions had been locked to authored order by a
turn of phrase.

**The work was instrumental rather than valuable in itself** — three defects
surfaced only because of it:

- **A mis-keyed question.** `a3/0002` q10 asked which base URL is correct, the
  explanation said the no-trailing-slash one, and `correct` pointed at the one
  *with* the slash. Swept all 2,575 for "Option X is correct" disagreeing with
  the key: exactly one.
- **17 inverted `which-breaks` questions**, showing "Which of these will fail?"
  while rewarding the option that works.
- **An all-of-the-above answer safe only by accident.** `01/0006` q27's "All
  three" is not recognised by `isPositionPinned`, so it was eligible to be
  shuffled into the middle where the correct answer reads as nonsense. It was
  protected purely by a *second* defect — its explanation naming a position —
  which this very task would have removed.

That last one is the warning for anyone continuing this work: unpinning a
question can expose something the pinning was accidentally hiding. Read the
options, not just the explanation.

#### `\bcorrect\b` does not match "correctly"

The sharpest finding of the day. The check for inverted `which-breaks` questions
**already existed**, and had since the ten conversions on 2026-08-15. It tested

    /\b(correct|right|best|proper)\b/i

and all seventeen survivors were worded with the **adverb** — "Which code
correctly prevents infinite retry loops?". `\b` needs a non-word character after
"correct", and "correctly" carries straight on into "ly", so none of them
matched. The check was right about what it wanted and wrong about how words end.

Same family as the fill-blank check whose `_{2,}` matched the leading
underscores of `__dirname`: a check making the exact mistake it was written to
catch. The lesson is narrower than "write better regexes" — **do not assume a
stem covers its inflections**, because the adverb is how people naturally word
that question.

An attempt to widen the *option*-naming check the same way was **backed out**:
"of these" / "of them" / "all three" gave two false positives out of three hits,
because "All three get equal space" is about flex children and "both of them" is
about two sessions. "of the above" is the only phrase that cannot mean something
else. The attempt is recorded in the code so nobody repeats it.

#### Why 69 lessons sat at `unverifiable` — and what actually unblocked them

Every stated reason was **true**. An Express route really does need Postgres.
The problem was granularity: `--unverifiable` is a property of the *lesson* and
skips every solution, so a page holding both a React Native screen **and** a
pure function had to declare the whole thing unrunnable, and whatever was
testable in it went untested.

`createSolution` now takes its own `unverifiable: "<reason>"`. That exercise is
skipped with the reason recorded; the others still run. The metric stays honest
by one rule, verified by injection: **at least one exercise must actually
execute**, or the status stays `unverifiable` however many playgrounds the page
has.

This supersedes M1's advice in `TOKEN-TRACK.md`, which said to record such
lessons as `unverifiable` and keep the other three sections. That was the best
available answer before the opt-out existed; it is now the second-best one.

Six lessons followed, and **reframing each around its function kept finding
contradictions between lessons** — every one a case of a page stating a rule
that a neighbour's code breaks:

- `a3/0002`'s client throws `ApiError(429, retryable: true)` with the reset
  time. `a3/0003`'s retry helper tested `status < 500`, so a rate limit — the
  one response that says *come back, and here is when* — was **never retried**,
  and the `retryable` flag the previous lesson computes was never read by the
  lesson that needed it.
- `a4/0001`'s splash screen sent a **network error to `Login`**, destroying a
  valid session over a tunnel. Its own comment said "could show offline screen
  or retry" and the code did the other thing — and `a4/0003`, two lessons later,
  states the rule correctly in prose.
- `a4/0002`'s own quiz warns against leaving `Login` in the navigator stack, and
  nothing tested it until `screensFor`.

Both bugs are now wrong-cases, so the lessons fail if anyone reintroduces them.

#### Process notes, all from mistakes made today

- **`git checkout --` during an injection test reverts uncommitted work.** Lost
  the same lesson edit twice that way. Commit before testing a check.
- **`--unverifiable` is a property of the lesson, not the run**, and the log is
  the only place it is recorded. Running `verify-lesson` without it fails on the
  missing self-check, and **a failing run deletes the entry** — so the lesson
  silently drops to `unverified`. Did this to `a3/0002` and committed before
  reading the output, which was the actual mistake.
- A straight `"` inside a double-quoted explanation string breaks the block. The
  audit's parse check caught it immediately, which is the system working.

### Session of 2026-08-19 — M3 through A5 and A8, and what extraction keeps finding

Nine lessons: all five of A5, all four of A8. The count is in `PROGRESS.md`.
What matters is what the work turned out to be.

#### The premise changed halfway through

M3 was framed as a *verification* exercise — find the testable function hiding
inside a lesson marked `unverifiable`, so the metric stops lying. That is still
what it does. But **every one of the nine lessons contained a real defect**, and
by A8 the extraction had become the cheapest defect-finding process this course
has. The verification is now the side effect.

The reason is mechanical rather than clever. Writing a self-check forces you to
state, in executable form, what the lesson claims. Most of these lessons had
never had their claims stated that precisely, and several of them turned out to
be arguing with themselves.

#### The three shapes, because they recur

**The lesson argues for something and never makes the student do it.**
`a5/0001` spends forty lines establishing that rejecting the biased byte range
is worth four lines of code, then never asks anyone to write the four lines.
`a8/0001` has a callout saying "never put secrets in `VITE_` vars" and enforces
it nowhere.

**The prose states a rule the code on the same page breaks.** `a5/0002` prints
a table saying HTTPS is required and validates with `https?` three sections
below it. `a5/0004` has a section titled "the client and the engine disagreed
about field names" — and a playground using `payload.start` and `max_per_day`,
which are precisely the wrong names that section is about. A lesson can
document a bug in prose and demonstrate it in code within one scroll.

**Two lessons each look right alone and contradict each other.** This is the
kind worth the most and the only kind that is invisible from inside the lesson
being edited. The audit cannot see them either. What found all of them was
grepping the neighbour for the same noun.

#### The four that were security, not tidiness

Ranked by what they would have cost:

1. **`a8/0003` had no `iceTransportPolicy: 'relay'`**, TURN commented out as
   optional, and a playground printing "Best path chosen: host (LAN)". ICE
   candidates are IP addresses. A direct path hands the holder the issuer's home
   IP on the page a stranger opens after scanning a parcel. `CLAUDE.md` already
   required relay-only; the lesson simply did not do it, and the playground was
   actively teaching the opposite. Nothing else in the course matters if this
   ships — the hashed codes and the E2EE are both undone by one `srflx`
   candidate.
2. **`a8/0002` put the token code in the URL path**, twice, against ADR-0007.
   `/api/tokens/:code/status` is the obvious REST shape, which is exactly the
   problem: it is what anyone writes without thinking, and a path lands in the
   access log, browser history, `Referer` and crash reports. Fixed to
   `POST /api/redeem` with the code in the body, matching what `b10/0001` and
   `01/0012` already did. **The defect is course-wide** — `b3/0002`, `a9/0002`,
   `a2/0002` and `a3/0002` still carry it, recorded in `SESSION.md` rather than
   half-fixed here, because the path form is baked into quiz keys.
3. **`a8/0004` framed link previews as a feature to optimise.** The mechanism
   nobody had written down: pasting the URL into WhatsApp makes *Meta's servers*
   fetch it, so the code is logged at a third party before the recipient taps
   anything, and the unfurler can burn a single-use token on the way. Generic
   `og:` tags do nothing because the leak is the request, not the response.
   Its `noindex` was also in the shared `index.html`, which would have hidden
   the marketing pages rather than the token pages.
4. **`a8/0002` returned `issuerId` to the holder's browser**, commented "not
   exposed to holder UI". It was in devtools regardless. The comment is the
   interesting part: it records someone thinking about exposure and reaching the
   wrong conclusion about where the boundary is.

#### The one that was a false claim rather than a missing check

`a8/0003`'s reconnect backoff carried a comment saying it "prevents hammering
the server when it's down". It does not, and this is worth stating carefully
because the code looks textbook. Exponential backoff spaces out **one client's**
attempts. Every client was dropped by the same restart, so they all wait the
same 1000ms and return in the same millisecond, then again at 2000, then 4000 —
in lockstep, indefinitely. Only jitter spreads the herd. On a deployment that is
explicitly one box (ADR-0003), that distinction is the difference between a
recoverable restart and a restart that cannot complete.

The playground now demonstrates it with 500 simulated clients instead of
asserting the opposite.

#### Data-model contradictions worth remembering

`a5/0003`'s sample response had `max_uses: 0` on an **active** token with three
uses — reading `0` as "unlimited", which contradicts `01/0011`, the lesson the
student is closest to. Null is unlimited; zero permits nothing. Only one is
falsy, which is the whole reason `if (token.max_uses)` keeps being written and
keeps being wrong. Its `Token` interface also typed `max_uses` as `number`, so
"unlimited" was not expressible at all.

The same lesson rendered `token.status` straight into the badge. The column has
three values but a token also dies when a clock ticks over, and nothing writes
to the row when that happens — so an expired token showed a green "active"
badge on the one screen whose entire job is saying what is currently live. Both
conventions are now in `CLAUDE.md`, because three separate lessons had them
wrong and they will be got wrong again.

#### Process notes

- **Fixing a lesson's data shape leaves defects in its JSX.** Removing `code`
  from `a5/0003`'s sample response left `{item.code}` rendering a field that no
  longer existed, plus `status={item.status}` and `max_uses > 0`. One prose fix,
  three live defects downstream. This is the Phase 1.5 lesson recurring: grep
  the render in the same commit.
- **Fixing prose without fixing the quiz produces a lesson that argues with
  itself.** `a8/0002` had the path form in six quiz questions. Updating four of
  them was most of that commit's risk, and skipping them would have left the
  quiz teaching what the new prose forbids.
- **Deliberately left alone:** a `React.memo` fill-blank in `a5/0003` passes
  `props.item.status` to a badge. Consistent with the old model, but the
  question is about memoisation and rewriting it would muddy a correct question
  to fix an incidental detail. Flagged rather than edited.
- **Recorded, not fixed:** expiry is modelled twice — an `ExpiryPayload` rule in
  `a5/0004` and the `tokens.expires_at` column `a5/0003` reads. Picking one
  belongs to the B2 rewrite that the adjacent storage-model note is already
  waiting on. Writing it down beat inventing a third answer.
- **The whole module was missing `createExplain`.** None of the nine lessons had
  a prompt or loaded `explain.js`. A5 and A8 predate the practice pattern being
  made universal, so the other pre-pattern modules almost certainly share it.

#### Two follow-ups that are bigger than one lesson

Both are in `SESSION.md` with detail. Both are security-shaped, which is why
they were not folded quietly into an unrelated commit:

1. ~~**`a7-voice-video` is the mobile half of the ICE decision** and was written
   by the same pass as `a8/0003`. If it is missing `iceTransportPolicy`, calls
   from the app leak the same addresses.~~ **Done 2026-08-20** — and the guess
   was half right in the worst way: `0001` was missing the line, while `0005`
   had built a toggle for turning it off. See the session below.
2. **The code-in-the-URL-path form survives in four other lessons.** Still open.

### Session of 2026-08-20 — ADR-0008 accepted, and a lesson that was consistently wrong

Asked where things stood and what to do next, the student answered **"u decide"**.
So the blocked decision was taken rather than parked again, and A7 — the work it
gated — was done in the same session. Four commits, audit green throughout.

**The decision, and why it was made this way.** ADR-0008 proposed
`iceTransportPolicy: 'relay'` as mandatory rather than offered. It sat at
*proposed* because the cost lands on a bandwidth bill the student pays. Accepted,
on the grounds that the rejection branch was worse in kind, not merely in degree:
rejecting meant reverting `a8/0003` to teach a redemption page that hands a
stranger the issuer's home IP, defeating the hashed codes and the E2EE in one
hop, for a person who has no settings screen to defend themselves with. The
bandwidth cost is visible and can be responded to; a disclosed address cannot be
withdrawn.

**What was done to keep that from being a quiet power grab.** The ADR records
that the student delegated it, names the reversal path, and says plainly that
if they disagree the thing to overturn is the ADR and not the lessons. A *What
would change our mind* section was added with criteria stated in advance —
relay egress becoming the binding ceiling points at narrowing relay-only to
`web/` redemption calls, which is the first thing to reconsider and is
explicitly **not** "make it a user setting". Reversal is now an argument
against written criteria rather than a fresh fight, which is the only version
of this that survives a future session.

`ARCHITECTURE.md`, ADR-0003 and ADR-0004 all said *offered*; that word is gone,
and ADR-0004's "STUN: Google's public servers" line is struck through as
superseded. Under a relay-only policy STUN's only output is the `srflx`
candidate being suppressed, so a configured STUN server is dead configuration
that reads like a fallback.

**Then A7 turned out to be a different kind of defect from anything M3 had hit.**
The prediction was a missing line. `a7/0001` was indeed that — four quiz
questions teaching relay-only correctly while both copyable snippets constructed
a bare `new RTCPeerConnection({ iceServers })`, and no prose section on the
subject at all. Familiar shape; the documents were right and the code was wrong,
for the third time in this project.

`a7/0005` was not that. It was a **complete, careful, internally consistent
implementation of the design ADR-0008 rejects** — an `AsyncStorage`-backed
"Hide IP Address" toggle defaulting to off, `iceTransportPolicy: relayOnly ?
'relay' : 'all'`, a Settings UI, and an exercise instructing the student to
build the whole thing. Its guidance said *"Tokens for known contacts (friends,
family) — relay OFF is fine. They already know where you live"*, and **a quiz
question keyed that reasoning as the correct answer**, describing it as "Token's
philosophy of user-controlled privacy rules".

That is the lesson worth carrying forward. **Nothing in the file was wrong on
its own terms.** The code matched the prose, the quiz matched the code, the
explanation was coherent. Every check this project has — the audit, the
verifier, the pre-block scanner, reading the lesson carefully — passes a
document that is wrong only in its premise. The thing that caught it was
reading the lesson *against the ADRs*, and the only reason anyone did that was
that ADR-0008 explicitly asked for A7 to be checked.

It is also a **product** error rather than a WebRTC one, which is why it went
unnoticed by people thinking about WebRTC. Token's value is with entities that
do not know the user; the lesson took the one case where the product matters
least and taught it as the general rule.

**M3 got its function anyway, and it is a good one.** `relayAudit(reports)` asks
whether the policy actually took effect on a live call — a leak that produces no
symptom, since the call connects and sounds fine. It pins down three things a
first attempt gets wrong: only the `succeeded` candidate pair counts (a *failed*
relay pair sitting beside a succeeded `host` pair is exactly what a real leak
looks like in the stats); only `localCandidateType` is ours to judge, because
the remote peer runs its own policy and "check both ends" reports a problem that
is not ours; and finding nothing must fail closed, because an audit that
reassures you when it learned nothing is worse than no audit.

Eight wrong-cases, and the thing that makes them a set rather than a list:
**every one fails in the safe-looking direction.** There is no mistake here that
over-reports a leak. That asymmetry was deliberate — a false "leaking" costs an
afternoon, a false "protected" is the guarantee silently not holding.

**One arithmetic correction worth naming**, because it had been sitting in the
cost section unchallenged: the lesson claimed ~2,200 hours of relayed *voice*
per TB. Voice is ~38,000 hours; it is **video** that is ~2,400. The 16× gap
between them is the entire point of the paragraph, and the wrong figure had
flattened it. The same section also reasoned that "only some users enable
relay" — which the toggle made true and ADR-0008 makes false. 100% of calls are
relayed now, so that is the real bill rather than a worst case.

Status: `a7/0005` moved `unverifiable` → `verified` (43/96). It also had no
`createExplain` prompt and did not load `explain.js` — the same gap found in all
five A5 lessons, which makes it a reliable prediction for the pre-pattern
modules rather than a coincidence.

### Session of 2026-08-20 (continued) — A6, and three lessons that each shipped a bug

Straight on from the A7 pass, same session. A6 is three lessons; all three were
`unverifiable`, none had a `createExplain` prompt, and **all three contained a
live defect** — which is now four modules in a row where the exercise was not
the most valuable thing the pass produced.

Deliberately, the ADRs were read *before* each exercise was designed rather than
after. That is the practice A7 argued for and it paid immediately.

**`0001` reconnected a signed-out user.** The AppState listener called
`connect()` on `'active'` without consulting the session; twenty lines further
down, in a different file, the AuthContext effect disconnected on logout. Log
out, switch apps, switch back, and the socket is open again. Each handler is
correct on its own, which is the whole difficulty — the bug lives in the space
between two files and belongs to neither.

`connectionIntent({ appState, hasSession, socketState })` is the fix and the
exercise: one rule, called by every handler, none of which decides anything
itself. Two handlers cannot contradict each other if neither holds a rule.

**A wrong-case earned its keep within a minute of being written.** The
signed-out-mid-handshake mistake passed every check, because the self-check only
tested `'open'` and `'closed'` on that branch and never `'connecting'`. That is
the fourth time in this project a wrong-case has found a gap in the very
self-check written alongside it, and it remains the only mechanism that does.

**`0001` also contradicted `a8/0003` outright**, and in the wrong direction:
`a6` comes *first* in the sequence, so the student meets the wrong version
before the correction. It said backoff "spreads out reconnection attempts". It
does not. Backoff widens the gap between *one* client's attempts while leaving
every client dropped by the same restart in perfect lockstep — same delays, same
starting instant, arriving in synchronised waves. Only jitter spreads a herd,
and the lesson taught the weaker ±25% wobble rather than full jitter. On attempt
5 that is 12–20s versus 0–16s, and the gap widens every attempt.

The playground now *demonstrates* it rather than asserting it: 500 clients,
three strategies, a histogram of which 2-second bucket they land in. Backoff
alone puts all 500 in one bucket, which is the entire argument in one line of
output.

**`0002` had three defects, one per handler**, and they turned out to be the
same defect three times. `chat:receive` appended with no dedupe — REST history
and the socket overlap constantly, and a reconnect replays. `chat:sent` could be
applied by removing and re-appending, moving the message to the end of the
thread, visible only when theirs arrived while yours was in flight. And
`chat:delivery-receipt` assigned status unconditionally, so a late delivery
receipt turned a read message back to delivered.

`applyMessage(list, incoming)` collects all three into ten testable lines. The
fixture is built so no wrong answer passes by luck — the optimistic message sits
at index 1 rather than last, so re-appending is visible, and the status test
starts from `'read'` with `'delivered'` arriving after, so an overwrite moves
backwards rather than sideways.

**`0003` showed everyone as online whenever the user was offline.**
`usePresence` only changed state when a `presence:update` arrived, so once the
client's own socket dropped, the last thing it heard stayed on screen
indefinitely. The green dot is at its most confident exactly when the app knows
least.

`presenceFor(state, now)` turns two booleans into three answers, and the third
is the point. `'offline'` is a claim about *them* — we are connected, we would
have heard, their TTL lapsed. `'unknown'` is a fact about *us*, and it has to
outrank everything, because every other branch reasons from information that
could not have reached us. Collapsing the two into "offline" is the tempting
safe default and is not safe: it asserts something about a person on no basis.

**The rule this module produced, worth carrying to B5:** *a handler that
responds to "the state changed" needs to know when it last heard, not only what
it last heard.* All three lessons are that mistake, and so is the fourth bug
found on the way — the typing indicator's safety timer depends on
`[isOtherTyping]`, which only re-runs on a *change*, so repeated
`typing:update{true}` events are `true → true`, the timer never resets, and the
indicator vanishes five seconds after they started typing and never returns.

**The finding that reaches beyond A6: the module mentioned encryption zero
times** across `0002`, `0003` and the README, while sending and storing `text`
in the clear. ADR-0002 makes E2EE a v1 commitment and `CLAUDE.md` says every
lesson touching messages must respect it. The crypto itself belongs to C5 and
was deliberately **not** written ahead of its module — doing key exchange and
backup badly is worse than doing them late. Instead `0002` now states the
constraint: what is provisional, what survives encryption unchanged (every piece
of logic in the lesson works on the envelope, not the contents), and which
shortcuts are cheap now and impossible later — server-side search, an
API-generated preview, a server-derived unread count.

**No other message-touching module has been checked for this**, and that is now
the standing item in `SESSION.md`. B5 and B8 are the likely ones.

Status: A6 three of three `unverifiable → verified`. Audit green, five suites
pass throughout.

### Session of 2026-08-20 (continued) — B5, where the lessons argued with the ADR in writing

Third module of the session. A6 had ended by naming B5 as the next target,
because it is the server-side twin of everything A6 fixed. That was right, and
the reason it was right turned out to be stronger than the reason given.

**B5 did not merely violate ADR-0003. Two of its three lessons stated the
violation in prose, in so many words.**

`0002` looked a recipient up in this process's `clients` Map and gave up on a
miss, commented *"If no sockets — user is offline"*. `0003` had a section
headed *"Redis pub/sub — scaling beyond one server (optional for v1)"* which
concluded *"For Token v1 on a single VPS, in-memory is correct."* ADR-0003 is
**titled** "scale out ready, deploy on one box" and exists precisely to reject
that reasoning.

What makes this worth writing down rather than just fixing: **the ordinary
engineering advice and the project's decision point in opposite directions,
and the lesson gave the ordinary advice.** "Don't add Redis until you need two
servers" is what most people would say and it is not wrong in general. It is
wrong here, for a reason ADR-0003 spells out — the costs are asymmetric.
Running Redis on one node costs a container. Retrofitting it later means
rewriting everything that reasoned from a local Map, which by then is the
routing, the presence, the typing indicators and the rate limiting. And the
failure it prevents is silent: add a replica to an in-memory design and
messages between users on different nodes are dropped with nothing logged.

**`0002` contained its own correction and nobody noticed.** One quiz
explanation described the cross-node failure exactly and named Redis pub/sub as
the fix, while the lesson body taught the broken version and the playground
printed "User 3 is OFFLINE" for a user who was merely elsewhere. That is the
`a7/0005` shape for the second time in one session.

**Which produced the rule now in `SESSION.md`: when a lesson's quiz contradicts
its body, believe the quiz.** Quiz explanations get written last, when the
author has thought hardest; the body gets written first and copied from habit.
Grepping a module's quiz for the ADR keywords is a cheap way to locate the
body's defects, and it has now worked twice.

**The functions.** `sweepSockets` for `0001` — the heartbeat is a two-tick
protocol, and a sweep that resets `isAlive` itself collapses it into one and
closes every healthy connection on the server every thirty seconds. Clients
reconnect, so it presents as a flaky network. `deliveryPlan` for `0002`,
separating "which sockets do I write to" (the local map, and nothing else)
from "is this user reachable" (a Redis presence key), plus the two rules that
only exist once pub/sub does: never republish what arrived on the channel, and
recognise your own echo or deliver everything twice. `canSeePresence` for
`0003`.

**A product decision was taken in `0003` and is flagged for the student.** The
lesson said *"By default, presence is shown. The issuer can add a rule to hide
it."* — the `a7/0005` shape a third time, a privacy default that leaks with an
opt-out the exposed party has to find.

This one was changed rather than flagged-and-left, on the grounds that it
**applies** an existing decision rather than making a new one: `CLAUDE.md`'s
governing rule is that nobody gets anything from the user that the user did not
issue them. A courier holding a delivery token was granted a way to ask about a
parcel. Presence sampled over a fortnight is a behavioural profile — when they
wake, when they commute, which evenings they are out, when they are away for a
week — and no one issued that.

The rule is renamed `share_presence`, **named for what it grants**, so that a
missing or unreadable rules row fails closed. That naming turned out to sharpen
an existing quiz question too: it had a missing `WHERE` clause, which under
`hide_presence` merely silenced everyone's presence, and under
`share_presence` discloses everyone's globally the moment any one user opts in.
The fail-open direction is a better argument for the naming than the prose was.

No ADR was written for it — it is one lesson, one exercise and one quiz
question, and cheap to reverse. But it is a **product** decision rather than a
technical one, and the last three of those went the wrong way for months before
anyone looked, so it is called out in `SESSION.md` under a heading the student
will not miss rather than buried here.

**One cross-lesson contradiction, found by the now-standard neighbour check.**
`b5/0002` acknowledged `chat:sent` as `{ id, sentAt }` with no `localId`, while
`a6/0002`'s client — fixed earlier the same session — matches that ack to its
optimistic message *by* `localId`. The client could never have found the bubble
to update. Both halves were written by different passes and each was
self-consistent.

Status: B5 three of three `unverifiable → verified`. 49/96.

### Session of 2026-08-20 (continued) — b3/0002, and closing the URL-path defect

`b3/0002` was taken next because it was both an M3 candidate and the worst
known offender in the code-in-the-URL-path list — and doing those separately
would have meant editing the same quiz keys twice.

**M3 gave it `matchRoute(routes, path)`**, a miniature of what Express does per
request. The rule worth a test is that **first match wins in registration
order**: Express does not prefer the more specific pattern, so registering
`/tokens/:id` before `/tokens/active` makes the literal route unreachable with
`id === 'active'`, and nothing warns you.

The sharpest wrong-case is the one that sorts candidates so literals beat
parameters. It produces the behaviour everyone assumes they already have, and
it is wrong *for this purpose* — a model that quietly fixes the bug cannot be
used to predict what a real route file will do. Worth remembering as a category:
**a teaching model must reproduce the defect, not improve on it.**

**Then the sweep, and the sweep is the story.**

The list in `SESSION.md` named four lessons. The real number was ten. Two of
the four suspects turned out to be correct as written — `a8/0002` names the bad
form in order to reject it, and `a9/0002`'s `/t/CODE` page URL is ADR-0007's
one documented exception.

**I under-counted twice, and both failures look like success.** The original
list had been assembled by reading rather than grepping. Then my own first grep
was piped to `head`, which silently hid two modules — including `b7/0001`.

That one matters. **`b7/0001` is the redemption endpoint**: `POST
/tokens/:code/redeem`, reading the code from `req.params` and then hashing it.
The lesson goes to real trouble to store only a hash for lookup and an
encrypted copy for display, and then hands the plaintext to the reverse proxy's
access log on the way in. Every protection downstream of that is worth nothing.
`a9/0002` was second worst — a **GET**, so every redemption wrote a live
capability to the log rather than merely risking it.

**The general lesson, which is not about URLs:** a truncated search and an
exhaustive one produce identical-looking output when the truncated one happens
to be short. `| head` on an audit grep is the same class of mistake as the
stale-prose failures this project keeps finding — a number nobody re-derived.
If a search is the evidence for "we fixed them all", it has to be run without a
limit and the count recorded.

**A second ADR-0007 defect surfaced sideways.** `a2/0002`'s `TokenListItem`
included `code`, against the rule that `GET /tokens` returns no `code` field at
all — serving one would mean AES-decrypting every row on every scroll, and
putting a pile of live capabilities in a response nobody needs them in. That is
the same defect `a5/0003` had, which makes it the second sighting and therefore
a pattern rather than a slip. Nobody has grepped for it course-wide; it is now
the standing item in `SESSION.md`.

**One small process trap, hit and recorded:** a mechanical `:code` → `:id`
rename across a quiz updates the `code:` field and leaves `answer:` and
`explanation:` stale, because they are separate fields in the same object.
`b3/0002` briefly had a question whose sample said `/api/tokens/42` and whose
key still said `MERC-8GH2 true doctor`.

Status: `b3/0002` `unverifiable → verified` (50/96). Nine further lessons
edited and all re-verified against their stored reasons and wrong-cases.

### Session of 2026-08-20 (continued) — the student answers, and b7/0001

The student asked to be given the open decisions with options, then asked for
the pros and cons in plain terms before answering. Worth recording as a
working note: **the questions were answered readily once the costs were stated
in money and minutes rather than in architecture.** The first framing named
ADR-0008 and `iceTransportPolicy`; the second said "voice is effectively free,
video costs about 450 MB an hour, and your relay server going down means no
calls at all". Only the second got an answer.

**Three decisions, all settled.**

*Presence stays deny-by-default.* Confirmed as it stood. Nothing to do.

*The holder JWT swaps `tokenCode` for the conversation id.* Straightforward,
and it turned up two things on the way. The server was **already correct** —
`b7/0001`'s `HolderPayload` never carried the code — so the defect was that
`a8/0002` documented a payload the server does not mint. And then `b8/0001`
turned out to put the code in a **push notification**, in the `data` payload
that FCM and APNs store until the device collects it, and in the visible body
text that renders on a locked screen. That is worse than the JWT case and was
on no list. A push payload is a log held by someone else.

*ADR-0008: keep all three scenarios.* The answer was not one of the three
options offered — it was "can u keep all 3". That is a better answer than any
of them, and it changed the shape of the ADR rather than its conclusion. The
three modes are now named, costed in a table, and given switch triggers, on the
grounds that the choice depends on a number nobody has yet. **Mode B is
pre-approved and needs no new ADR.**

The care taken there: keeping three modes on the record must not become a way
for the rejected default to creep back. So everything where the issuer's
address is disclosed to a holder by default — Mode C, per-token opt-outs,
automatic fallback when TURN is slow — sits under *Rejected outright*, in its
own section, explicitly not on the same line as A and B.

**Then b7/0001, where the bug was not the one advertised.**

`SESSION.md` had promised a `FOR UPDATE` concurrency bug sitting in the open.
It was not there: the lesson flags it in a NOTE, explains it under "When this
breaks", and the exercise solution already does
`pool.connect`/`BEGIN`/`COMMIT` correctly. A note written from a grep rather
than from reading the file.

The real defect was on the screen next to the keyspace analysis. That section
derives 31<sup>12</sup> ≈ 7.9 × 10<sup>17</sup> — about 25,000 years of
guessing — and then the endpoint replied four distinguishable ways: 404 "Token
not found" for a code that does not exist, and three different 403s for codes
that do.

**The 404-vs-403 split is the serious half**, and the framing worth keeping:
the keyspace figure is only true if each guess teaches the attacker nothing.
It converts "guess a code that works" into "guess a code that *exists*", which
is a much cheaper problem — and an inactive code is worth collecting, because
paused tokens get un-paused.

You cannot spend 25,000 years of keyspace on security and give some of it back
at the error handler, because the attacker chooses which measurement to use.

**Two sections of one page contradicting each other. That is the fourth time
this session** — after `a7/0005`, `b5/0002` and `b5/0003` — and the pattern is
now specific enough to hunt: *find the page's own security claim, then check
what the code on the same page actually does.*

The cost is stated plainly in the lesson rather than skipped: a holder whose
token genuinely expired sees "This link is not valid" and cannot tell why. That
is the right trade, because the issuer sees the true state on a screen that
required a login. **The person who cannot be told is the person who has not
proved they should know.**

`canRedeem(token, ctx)` carries it, along with the two null/zero rules that
CLAUDE.md keeps warning about. Eight wrong-cases; the two best refuse
*correctly* every time and leak anyway — `allow` and `reason` are right and
only the response gives it away — including the version with one message but
two status codes, which feels safe and is not. A ninth over-corrects by
collapsing the internal reason too, making the response safe and the logs
useless.

Status: `b7/0001` `unverifiable → verified`. 51/96.

### Session of 2026-08-20 (continued) — two greps, and a defect at two layers

Two cheap security passes, queued after `b7/0001`. Both found something, and
the second found the more interesting thing.

**`code` in list responses and list types.** Largely clean —`a5/0003` is
correct and its explanation is the best statement of the rule anywhere in the
course. But `a2/0002` carried `TokenListItem = Pick<Token, 'code' | …>` a
**second** time, in the `Pick<>` teaching section, and I had fixed the other
occurrence in that same file earlier the same day. Worth stating flatly: **a
file is not done because you edited it once.** The grep that found the first
occurrence would have found the second if I had read its whole output instead
of the line I was looking for.

Then `b10/0002`, the DPDP compliance lesson, which broke two ADRs in a single
`Promise.all`. It selected `code` — not a column, since ADR-0007 stores a hash
for lookup and an encrypted copy for display — and `content` from messages,
which is ciphertext the server holds no key for. The export therefore promised
a downloadable file containing every token code the user had ever issued, plus
message bodies the API cannot read.

That one deserved prose rather than a rename, because the tension is real:
**data portability genuinely pulls against end-to-end encryption.** The two
honest answers are to ship the ciphertext with instructions, or to build the
export on-device where the keys are. The dishonest one — a server-side decrypt
"just for exports" — means the server holds keys, and the entire guarantee is
gone, traded for convenience in a compliance feature. Also worth the sentence
it got: **a file of live capabilities is a worse artefact than the database it
came from.**

**The denial-oracle grep is the one with a lesson in it.** `b7/0003` and
`b4/0002` turned out fine — authenticated owner endpoints, where a 404 to
someone who does not own the token tells them nothing they could not already
infer.

`a8/0002` was not fine. It rendered **four distinct screens** — "Token Not
Found / This token code doesn't exist", against expired, revoked and maxed — on
the redemption page a stranger opens. That is the identical defect fixed in
`b7/0001`'s API an hour earlier, at the other end of the same request, written
by a different pass, each half internally consistent.

**So: fixing a defect in the API does not fix it in the UI.** Obvious once
said, and it was not said until both had been found. The shape worth naming is
*internal distinction, external uniformity* — keep the reason for your metrics,
drop the tell. `redeemState` was left completely untouched; only the rendering
changed, which also meant the M3 exercise and its wrong-cases survived intact.

**The fix then contradicted the lesson's own argument**, and the contradiction
is the best part. `a8/0002` had made a careful case that `paused` earns
different copy from the final states, because "try again later" is the one
message that is actually true. It is true, it is more helpful, and it is the
single most valuable sentence the page could hand a guesser: the code is real,
it is inactive now, and it will probably work later. Rewritten so that the
instinct is the teaching point rather than the advice.

Status: no lesson changed verification state. 51/96. The ADR-0007 thread is now
closed across three passes — URL paths, list responses, and denial messages.

### Session of 2026-08-20 (continued) — b7/0002, and finding a root cause three fixes late

`b7/0002` was chosen because it is the neighbour of a lesson just read closely.
It turned out to be the best-written lesson in the module already — it has a
"Why this way (and what was rejected)" section, five subsections under "When
this breaks", and a genuine deny-by-default argument. It simply had nothing
runnable in it.

`evaluateRuleSet(rules, action, ctx)` is the synchronous core, with the
database lifted out and the time-window answer passed in (`a5/0004`'s
`isWithinWindow` computes it). The wrong-cases share a shape worth naming:
**the mistake is never a wrong answer, it is a missing refusal.** Every one
falls through to `allowed` on input it did not understand — an unknown rule
type ignored rather than refused, an array slipping past a `typeof` test
because `typeof [] === "object"`, an undefined channel flag read as
permission. The unknown-rule case is the worst because it reads as
*tolerance*: an older server meets a rule a newer client wrote, shrugs, and
grants an action the owner had restricted, with every rule it does understand
passing so nothing looks wrong from inside.

**Then the part that matters more than the exercise.**

Reading `b7/0002`'s query led to `b2/0001`, the canonical schema lesson, which
said in a bullet: *"max_uses = 0 means unlimited. Otherwise it's a cap."*
`CLAUDE.md` says the exact opposite, and calls it one of "the two conventions
that keep being got backwards".

**This project had already fixed that defect three times** — `a5/0003`'s sample
row, `a5/0003`'s non-nullable `Token` interface, and a dedicated wrong-case in
`b7/0001`'s `canRedeem`. Each was recorded as a local slip in a lesson. None of
them went and looked at where `max_uses` is *defined*.

The definition was `INTEGER NOT NULL DEFAULT 0`, which breaks both ends of the
convention at once: `NOT NULL` makes "unlimited" impossible to express, and
`DEFAULT 0` makes every token created without an explicit limit permit nothing
— issued and instantly unusable. And the constraint had inverted with it:
`CHECK (max_uses = 0 OR use_count <= max_uses)` treats 0 as the exemption, so a
token capped at zero would have accepted uses forever.

Seventeen replacements across three lessons, plus callouts covering the SQL
trap (`= 0` where `IS NULL` was meant), the JavaScript trap
(`if (token.max_uses)`, where only one of the two values is falsy), and the
identical shape one column over in `expires_at`.

**The rule this produced, and it generalises past this project: when the same
defect has been fixed three times, stop fixing it and go find where it is
defined.** Three downstream repairs cost more than the one-line schema change
would have, and left the source intact to keep producing more. The tell is a
wrong-case that feels familiar — `b7/0001`'s `max_uses` mistake was written
that morning as though it were a fresh observation.

One thing deliberately left open: `b7/0002` reads a `uses` column, `b7/0001`
counts rows in `conversations`, and `b2/0001` has `use_count`. The column names
are settled by `CLAUDE.md`; **whether the count is stored or computed is a real
B2 decision** and was flagged rather than quietly picked. A counter is one read
and one more thing that can drift out of step; counting is always right and
costs a query.

Status: `b7/0002` `unverifiable → verified`. 52/96.

### Session of 2026-08-20 (continued) — b7/0003 completes B7, and a schema nobody chose

`b7/0003`'s endpoint code turned out to be the best in the module: transition
rules written as `WHERE` clauses so the database enforces them, idempotency
handled properly, and a 404 scoped by owner so "not yours" and "does not
exist" are one answer. It simply had nothing runnable in it.

`planTransition(token, action)` is the state machine on its own, and it was
built deliberately **storage-agnostic** — see below for why that mattered.

**The distinction it exists for is worth carrying past this lesson:**
`unchanged` and `refused` are different answers. Both leave the state exactly
as it was. One is a request that was already satisfied, the other one that can
never be satisfied, and over HTTP they are a 204 and an error.

Collapsing them has a victim in either direction, which is what makes it worth
a test rather than a comment. Fold *unchanged* into *refused* and a user
hammering the revoke button on a bad connection is told their revocation
failed — so they try again harder, or conclude the token is still live. Fold
*refused* into *unchanged* and resuming a revoked token reports success.

**Then the thing that stopped this being a normal M3 pass.**

The lesson claimed its timestamp-based state model "matched B7.1 and B7.2". It
does not. **Five places disagree about how token state is stored**, and the
disagreement is substantive rather than a typo: `b1/0001` and `b2/0001` have a
`status` enum *and* a `revoked_at`; `b7/0001` reads `status`; `b7/0002` reads
`revoked_at`/`paused_at`; and this lesson writes timestamps while arguing
against the enum in one section and declaring `TokenStatus` with a transitions
table in another. `CLAUDE.md` says `status`.

**Both designs have a real case**, and `b7/0003` makes the harder one well: a
timestamp answers *when*, which an audit needs, and transitions become `WHERE`
clauses the database enforces rather than checks two concurrent requests can
both pass. That is a better argument than "an enum is simpler", and it is not
one to overrule while tidying.

So this was **not** resolved. The temptation was strong — this session has
fixed a dozen contradictions by picking the side that agreed with the ADRs, and
`CLAUDE.md` does say `status`. But that rule was written without this argument
in front of it, and the difference between *the docs are right and the code
drifted* and *the code found something the docs did not consider* is the whole
distinction between a fix and an overrule. The first is what this session has
been doing. The second needs the student.

What was done instead: the false claim is corrected, the lesson now describes
the disagreement accurately, the likely synthesis is named (`status` to read,
timestamps to write, a `CHECK` keeping them in step — which `b2/0001` already
half-builds), and it is queued as a B2 decision in `SESSION.md` alongside the
related `use_count` question. `planTransition` sidesteps it entirely, which is
why the exercise is about outcomes rather than columns.

**The general form, and it is the counterweight to everything else this
session found:** a lesson disagreeing with the documents is usually the lesson
being wrong, and this session has proved that a dozen times. It is not
*always*. The check is whether the lesson is making an argument the documents
never answered — and if it is, the answer is a flag, not an edit.

Status: `b7/0003` `unverifiable → verified`. B7 complete, three of three.
53/96.

### Session of 2026-08-20 (continued) — b2/0001, and an escape trap worth writing down

B2 was taken as a decision pass. It turned into a straightforward repair,
because the biggest thing wrong with `b2/0001` was not either of the questions
queued against it.

**The canonical token schema lesson had no ADR-0007 in it at all** — zero
mentions of `code_hash` or `code_enc`, and a `code TEXT NOT NULL UNIQUE`
column. Meanwhile `b7/0001` has been querying `WHERE code_hash = $1` all
along. The engine implemented a schema the schema lesson never defined, and
nobody noticed because the two lessons are five modules apart.

This one was **not** flagged for the student, and the distinction from
`b7/0003`'s state-model question is the point: ADR-0007 is explicit,
`CLAUDE.md` restates it at length, and the downstream code already complies.
There is no argument here that the documents failed to consider. Docs right,
lesson drifted — fix it.

The callout spends its length on the part that is genuinely counter-intuitive,
because "why not bcrypt" is the first question anyone sensible asks. bcrypt and
argon2 salt randomly per row, which is right for passwords: you find the user
by email and then verify one hash. Here there is nothing to look up *by* — the
code is all the holder has — so a random salt would mean hashing the candidate
against every row in the table. A pepper buys the same defence against rainbow
tables while keeping the hash deterministic, so it can be a `UNIQUE` index and
an O(1) lookup. **bcrypt's slowness is not missed because the threat model is a
database dump, not a weak secret**, and 31<sup>12</sup> is not brute-forceable
at any speed.

`codeHashInput` is the M3 function and it has an unusual property worth naming:
it is eight lines with no interesting branches, and it is **nearly impossible
to change once it has run in production**, because every `code_hash` in the
table was computed by whatever it did on the day it ran. A "small improvement"
six months later silently orphans rows. That framing is what the explain prompt
asks about.

**Two quiz questions needed thought rather than a rename.** The privacy
spot-the-bug now has *two* defects instead of one — `holder_email` and a
plaintext `code` are the same mistake wearing different clothes, and saying so
is better teaching than tidying one away. And a which-breaks question listed
`code TEXT NOT NULL UNIQUE` as one of its *safe* variants; leaving it would
have given the question two correct answers.

**The escape trap, which cost a failing verify and is worth recording.** The
solution contained a regex, `/[\s-]/g`. That is correct in the file — but the
solution is embedded in the lesson inside a **template literal**, and `\s` is
not a recognised escape there, so it collapses to a bare `s`. The shipped regex
was `/[s-]/g`: it stripped the letter s and left spaces alone.

CLAUDE.md already warns that a backtick inside a `createSolution` string kills
the block. **This is the same family and it is quieter** — nothing fails to
parse, the code runs, and it simply does something else. The fix was to use a
character class with no backslash in it at all (`/[- ]/g`). General rule:
**inside generated lesson code, prefer a construct with no backslash to one
that needs escaping correctly through two layers.** The self-check caught it,
which is the argument for fixtures that differ from what a wrong answer
produces — a fixture of `"MERC-8GH2-KP4X"` alone would have passed.

One smaller thing: the new O-fixture tripped the example-code warning, and took
a line-level `audit-allow-token-here` — the second file ever to use it, after
`CLAUDE.md`. Being invalid is the entire point of that fixture, and the
whole-file opt-out would have been far too broad for a lesson that also carries
the canonical code.

Status: `b2/0001` `unverifiable → verified`. 54/96. Warnings back to 1.

### Session of 2026-08-20 (continued) — the schema decisions, taken and implemented

Both questions flagged from `b7/0003` were put to the student with the costs
spelled out, and both were answered the same way they were recommended. Worth
noting *why* the recommendations were what they were, because the reasoning is
the durable part.

**State: both, with the database enforcing the agreement.**

The instinct is that storing a fact twice is a smell, and normally it is. What
makes it acceptable here is that the duplication is **checkable**, and the
check is a biconditional rather than the one-way implication that was there
before:

```sql
CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
```

The old constraint was `(status != 'revoked') OR (revoked_at IS NOT NULL)`,
which catches a revoked status with no timestamp and happily accepts a
`revoked_at` on an active row. **A one-way constraint on a two-way invariant
is half a constraint**, and it is the half that fails in the direction nobody
tests.

The consequence that makes this more than bookkeeping: revoke must now also set
`paused_at = NULL`, because a revoked token is not a paused one and the second
biconditional would reject the row. So **the state machine's exclusivity — the
thing `planTransition` encodes in JavaScript — is now also a database fact.**
Two independent enforcements of one rule, which is the right number for an
authorisation-adjacent invariant.

**Use count: counted, not stored.**

The argument that decided it is that a counter is a second copy of a fact
whose *ways of drifting are all silent*: a transaction that fails after
incrementing, a manual fix, an ordinary bug. Every one ends with a token
permitting more or fewer uses than its owner set, and nothing in the database
notices.

What matters more than the decision is that **the cost was written into the
lesson rather than glossed**: the limit can no longer be a `CHECK` constraint,
because there is no column to constrain. Enforcement moves out of the database
and into the redemption transaction, which is a real responsibility handed to
application code — and it is precisely why `b7/0001` spells that transaction
out with `FOR UPDATE` instead of sketching it. `idx_conversations_token_id`
stops being an optimisation and becomes load-bearing.

A course that says "count it, it's cleaner" without saying "and here is the
constraint you just gave up" has taught half of it.

**The audit caught my own slip mid-pass**, which is worth recording because it
is the first time this session the audit found something before a suite did: an
`order-steps` question gained a fifth step while `correctOrder` still listed
four. That check exists because a question with a mismatched key is unanswerable
and looks fine in source. It went red, said exactly which question, and it took
a minute to fix.

Status: no verification state changed — this was a correctness pass across
`b2/0001`, `b7/0002`, `b7/0003` and `CLAUDE.md`. 54/96. **Nothing is blocked.**

### Session of 2026-08-21 — b2/0002, and what E2EE quietly takes away

Two hard constraints were absent from the messaging schema rather than merely
wrong in it: the body was `content TEXT NOT NULL` in the clear, and there was
no partitioning at all. Both are named in `CLAUDE.md` as things that cannot be
retrofitted.

A detail that makes the point sharper than the ADRs do: the table also had a
plain `SERIAL PRIMARY KEY`, and **Postgres rejects that outright on a
partitioned table** — the partition key must be part of every unique
constraint. So the two defects were not independent. The schema as written
could not have had partitioning added to it without also changing its primary
key, which is exactly the "retrofitting is a rewrite" claim, demonstrated
rather than asserted.

**The E2EE rewrite came out of one question**, asked of every column: does the
server need this to do its job? Its job is narrow — route, order, record
delivery. Everything that survived that test stayed outside the envelope, and
everything else went in.

`content_type` and `metadata` failed it, and they are the interesting pair.
Both look like structural metadata rather than content, which is why they were
columns in the first place. But "this message is an image, 1920×1080, 2.3 MB"
is a description of what somebody sent, and a server that can read it can tell
a delivery company's traffic from a doctor's. **The test is not "is this
content", it is "does the server need it".**

**The finding worth carrying: E2EE takes system messages away, and nothing in
the ADRs says so.** The lesson had a database trigger inserting "This token has
been revoked" into `messages`. Read against ADR-0002 that is impossible — the
server holds no key and could not encrypt the row. It had been sitting there
because a trigger writing a row looks like schema design, not like a policy
violation.

The replacement is better than the original, which is usually the sign the
constraint was doing real work: `conversations` gains a `closed_reason`, and
each client renders its own sentence from it. That version is translated,
because the client knows the user's language and the server does not; and it
cannot desynchronise from the truth, because a stored system message is a claim
about state that was true when written, while a rendered one reads the state
itself.

**General rule, now recorded: under end-to-end encryption, anything the
*server* wants to say has to be said in structured state rather than in prose.**
Every "just insert a system message" instinct needs converting into "record the
event, let the client write the sentence". That will come up again in B8
(push) and anywhere a notification has text in it.

**`partitionsToCreate` was chosen for the shape of its failure**, not its
difficulty. A range-partitioned table has no default partition unless you
declare one, so a row outside every range is refused — which means every
mistake in that function is a time bomb rather than a bug. It runs correctly
for months and then, at midnight on the first of some month, nobody can send a
message at all. The wrong-cases are all of that kind: an off-by-one runway,
skipping the current month, unpadded months (`messages_2026_9` is a different
string, so the job re-creates September nightly and fails), naive December
arithmetic, and a `to` bound on the last day of the month rather than the first
of the next — Postgres ranges are `[from, to)`, so that one loses one day in
thirty.

**The orphan-table gates were re-read rather than assumed**, since all three
were parked behind "the B2 schema rewrite" and part of that has now happened.
`participants` and `calls` are still genuinely blocked (C5 and B6). But
`deletion_queue`'s gate was too coarse: partitioning settles the **bulk**
half of retention, because dropping an old partition needs no queue at all.
What is still open is **per-user erasure**, which partitioning cannot serve —
you cannot drop a partition for one person. Its entry now says that, and its
gate names the real dependency.

That is the discipline `known-issues.json` exists for working as intended:
**a gate that is never re-read becomes a permanent excuse.** This one narrowed
without lifting, which is the honest outcome and the one that is easiest to
skip.

Status: `b2/0002` `unverifiable → verified`. 55/96.

### Session of 2026-08-21 — b2/0003 finishes B2, and a defect class worth naming

`b2/0003` was taken to finish B2 and on the expectation that it would be a
cleanup job — a migrations lesson has to absorb whatever the schema lessons
changed, and `b2/0001` and `b2/0002` had just changed a lot. It was not that
at all. The lesson had almost no drift: its single `max_uses` reference was
already nullable, and it names no columns.

The defects were in the **migration runner**, and they belong to a class this
session has met repeatedly without naming: **code that is correct about the
common case and silent about the rare one.**

The four-line runner — list files, skip applied, run the rest — is right every
single day. What it lacks is any refusal, and refusals only matter on the day
something has already gone wrong somewhere else: a file edited after it ran, a
branch merged in an order nobody chose, a migration deleted from the repo.

**The checksum omission is the worst and the quietest.** Edit a migration after
it has been applied, and the runner sees the filename in
`schema_migrations` and skips it forever. Staging keeps the old shape; a fresh
database gets the new one. Nothing errors, nothing logs, nothing is out of
place — the two schemas simply are not the same any more, and the divergence
grows quietly for as long as nobody creates a fresh database. Storing a hash
converts that into a loud failure on the very next deploy.

**The transaction gap is the one that bites during an incident.** The runner
ran the SQL and then inserted the tracking row as a separate statement. A crash
between them leaves a migration that *ran* and is not *recorded*, so the next
deploy runs it again — and `CREATE TABLE` the second time fails, stopping the
deploy with the database half-migrated. Both are now in one transaction.

That change earned a caveat rather than a flat rule, which is worth doing more
often: **DDL inside a transaction is a Postgres luxury.** MySQL commits
implicitly on `CREATE TABLE`, so the same pattern there really does leave you
half-applied. And even in Postgres, `CREATE INDEX CONCURRENTLY` and
`ALTER TYPE ... ADD VALUE` cannot run in a transaction block — which is why
every real migration tool has a no-transaction escape hatch. A course that
teaches the wrapper without the exceptions has taught something that breaks the
first time someone adds an index to a live table.

`planMigrations` is the M3 function and it lifts all three checks out of the
database. The wrong-cases share the defining property: **every one is a runner
that works.** Each loses exactly one refusal and is otherwise indistinguishable
from the correct version on any ordinary deploy. One fails in the opposite
direction — demanding consecutive numbering — because over-refusing is the
plausible over-correction once out-of-order has bitten someone, and a runner
that rejects legitimate migrations gets disabled, which is worse than the bug
it was added for.

Status: `b2/0003` `unverifiable → verified`. **B2 complete, three of three.**
56/96.

### Session of 2026-08-21 — seven quiz options the audit could never have found

Found while opening `b3/0003` to start its M3 pass, and worth its own entry
because of what it says about the checks rather than about the questions.

`CLAUDE.md` forbids an option that references the other options. The audit
**errors** on "All of the above" and **cannot see** "Both B and C" — and that
gap is deliberate: widening the check gave two false positives out of three
hits, so it was left narrow, and `test-quiz-shuffle.mjs` asserts the narrowness
stays visible rather than being quietly forgotten.

The gap had seven questions sitting in it. **Six were the keyed correct
answer.** Since `quiz.js` shuffles options at render, a student meets three
shuffled statements and a fourth reading "Both B and C are correct" — which
refers to nothing. Those questions have been unanswerable for as long as the
shuffle has existed.

**The useful conclusion is not "fix the audit".** The narrowness is the right
call and the false-positive experiment already proved it. What was missing is
that a known, permanent gap needs a *habit* attached to it, not just a note.
So `SESSION.md` now carries the grep, to be run after any batch of quiz edits.

Restructuring them meant writing real distractors rather than filler, and
several questions got better for it. `b3/0003`'s token-creation question now
names the rule it is actually about — a request body is a suggestion, not a
source of truth — and says explicitly that returning the code in a 201 is
**not** the bug, since ADR-0007 returns it exactly once and that is the once.
A distractor that plausibly contradicts a rule the student half-remembers is
worth more than one that is obviously silly.

**And a small demonstration of the checks working the other way:** one of my
replacement explanations said "the last option has it backwards". That is a
position reference in an explanation, which pins the question to authored
order — and `render-as-authored` went 0 → 1 on the very next audit run. Fixed
inside a minute, and back to 0.

### Session of 2026-08-21 — b3/0003, and a defect created by an edit somewhere else

`b3/0003`'s endpoint design was already correct — the URL-path sweep had been
through it and it is ADR-0007 clean. Its list query said
`SELECT * FROM tokens`, which was also correct until `b2/0001` added
`code_hash` and `code_enc` **earlier the same day**.

From that moment the list endpoint returned both to every client on every
page, and nothing anywhere would have failed. No test, no type error, no
log line. This is the clearest example the course has of a defect that was
not written by anyone: two correct edits, five modules apart, and the second
one silently changed what the first one meant.

**Which is the argument against `SELECT *` in a handler, stated properly:**
it is not laziness, it is a promise to return whatever a future migration
adds. The person adding the column is not looking at the handler, and the
person who wrote the handler is not there when they do. Naming the columns
converts a schema change from a silent event into a reviewable one.

The callout also declines the defence that reached for itself while writing
it — that `code_enc` is encrypted, so who cares. It is a ciphertext of a
live capability, sent repeatedly to a client with no use for it, and its
safety then rests entirely on a key that must hold for as long as any of
those responses might still exist in a log or a CDN cache. That is a much
longer commitment than it looks.

**`buildPage` was chosen because the lesson's implementation was already
right.** That is a different kind of M3 candidate from the usual one: there
was no bug to fix, so the exercise is about why each line is the way it is,
and the wrong-cases carry the whole teaching load. The two that matter are
`hasMore` computed after trimming (always false, so every list in the product
silently stops at one page and looks perfect until someone owns 21 of
something) and the cursor taken from `rows` rather than `items` (one
invisible row per page boundary, no error anywhere).

`slice(0, -1)` is in there deliberately as a near-miss: it is correct
whenever exactly one extra row came back, which is every time the query is
written properly. **A wrong-case that is right for the wrong reason is worth
including**, because the student who wrote it has not learned anything from
it passing.

**The sweep afterwards produced a distinction worth keeping.** ~20 more
`SELECT *` in B1, all fine — at a `psql` prompt, where you read the output
yourself, it is not the same act as in a handler. The rule is about
endpoints.

But B1 still teaches a plaintext `code` column that `b2/0001` removed, and
that is a defensible pedagogic choice with nothing saying so.
`WHERE code = 'MERC-8GH2-KP4X'` really is a better first query than
`WHERE code_hash = '9f2a...'`. B1 now says it is a simplification and names
the two habits that do not survive the move, so they are unlearned there
rather than in production.

**General form: a simplification is fine; an unlabelled one is a
contradiction.** Worth checking wherever an early module models something a
later one replaces — which in this course is most of Track B.

Status: `b3/0003` `unverifiable → verified`. 57/96.

### Session of 2026-08-21 — B3 completed, and a generator that could not work

`b3/0004` and `b3/0001` finish B3. Both had real defects and the one in
`0001` is the most serious single thing found in this whole pass.

**The generator emitted codes the product's own validator rejects.**
`randomBytes(9).toString('base64url').slice(0, 12).toUpperCase()` — a CSPRNG,
the right length, an explicit warning underneath it never to use
`Math.random()`. Everything about it signals care, and it cannot work.

base64url upper-cased is `A–Z 0–9 - _`. Token's alphabet is 31 characters
with `0 O 1 I L` excluded and no punctuation at all, so the output contains
characters `codeHashInput` refuses. `CLAUDE.md` already records this exact
class of failure happening once — the server emitting codes the client
rejects — and describes a wrong alphabet as *an unlimited supply of bad
codes*, which is why it is an audit **error** rather than a warning.

The audit could not catch this one, and the reason is worth writing down:
the alphabet check looks for a **string literal** of 20+ `A-Z0-9`
characters. This defect is a *method chain* — the alphabet is implied by
`base64url`, never written down. **A check that looks for a shape only finds
the shape**, and the same wrongness expressed differently walks past it.

The second half is subtler and I nearly missed it. `.toUpperCase()` collapses
64 symbols into 38, and *non-uniformly* — every letter now has two preimages
and every digit one, so letters arrive twice as often. That is the same
modulo-bias failure `01/0013` spends a section deriving, arrived at by a
different route. **You cannot fix biased output by generating more of it**,
and the fact that the input was a CSPRNG makes no difference at all.

Also replaced a bare `sha256(phone)` presented as privacy. A hash is one-way
only if the input is unguessable; an Indian mobile number is ten digits with
a known prefix, which is minutes of work. The line the lesson now carries:
**if a column makes you reach for a hash to feel comfortable, ask first
whether the column should exist.**

**`b3/0004` was the format oracle at a third layer.** The error handler
returned Zod's field details on every route including `/api/redeem`, so a
malformed code answered 400-with-details and a well-formed unknown one
answered 404. A script learns whether its code generator is correct without
ever obtaining a token — and length, alphabet and grouping fall out of a few
hundred requests.

Being helpful in an error is normally the mark of a good API, which is why
this layer is the hardest of the three to see. The rule that survives all
three: *you may explain yourself to someone who has proved who they are.*

**Wrong-cases found three holes in their own self-checks in this pass**, and
one of my own mistake implementations was itself wrong: I wrote a falsy-bug
impl to prove `'0'` is not rejected, and `"0"` is a **truthy** string, so it
never rejected anything. Replaced with a real mistake, and the `'0'` case
kept as a guard with a comment explaining that no mistake trips it — it is
there to stop a later `Number()` conversion.

That makes five occasions this session where a wrong-case caught a gap in the
self-check written alongside it. It is still the only mechanism that does,
and the argument for writing them has never been about the student.

Status: `b3/0001` and `b3/0004` `unverifiable → verified`. **B3 four of
four.** 59/96. Two M3 lessons remain: A11 and B10.

### Session of 2026-08-21 — b10/0001 and a11/0004, and a secret that could not be one

Two lessons, and both were the same shape: a page giving correct general
advice while missing the specific thing that matters here.

**`b10/0001` is the security hardening lesson and it never named this
product's security model.** Zero mentions of the pepper, of `code_hash`, or of
the denial oracle. Parameterised queries, CORS, headers, ownership checks —
all correct, all true of any API, and none of them the reason Token is safe.

A security lesson that teaches only the generic list is not wrong, it is
*incomplete in the way that matters*: a student who follows it exactly will
build a hardened API around a design they were never told about, and the
first change they make to that design will be the one that breaks it.

Setting the oracle out as a table across `b7/0001`, `a8/0002` and `b3/0004`
was worth more than restating it a fourth time. Each of those looked like a
different problem when it was found — an endpoint, a screen, an error handler
— and seeing them in one place is what makes it a rule rather than three
coincidences.

Its own access-control example had `SELECT *` followed by `res.json(row)`,
which since `b2/0001` ships `code_hash` and `code_enc`. **The lesson
demonstrating the safe pattern was demonstrating the leak** — the second time
today `SELECT *` has been a defect created by an edit five modules away.

The 404-not-403 in that same example was already right, and the note now says
why, which is the more useful half: the query is scoped by `user_id`, so the
handler **cannot** distinguish "not yours" from "does not exist". **The safe
answer falls out of the query shape rather than having to be remembered.**
That is the version to aim for everywhere — not a rule you apply, a structure
in which the rule cannot be broken.

**`a11/0004` put a TURN password in the app bundle**, and stated it as the
rule: *if it's a credential, it goes in EAS Secrets.*

What makes this one genuinely hard to see is that **EAS Secrets works**. The
value is encrypted at rest on Expo's servers, never enters git, and is
injected only during the build. Every one of those claims is true, and none
of them helps, because anything the running app reads was baked into the
bundle to get there. The artefact is an `.apk` on a stranger's phone.

The distinction the lesson now turns on: **the pipeline and the artefact are
different places.** A sourcemap upload token and a TURN password are both
credentials, and one belongs in EAS Secrets while the other cannot be in the
app at all. "Is it sensitive" cannot tell them apart. "Who needs it, and
when" can.

And `a7/0001` already said the right answer — short-lived TURN credentials
minted by the API — so this was a direct contradiction in which the a11 side
was the actual vulnerability. Under ADR-0008 every call is relayed, so that
password is the key to metered bandwidth billed to the user, extractable by
anyone who installs the app, revocable only by shipping a new build.

**A process trap worth recording, because it produced two bad edits.**

`git checkout --` on this repo restores CRLF. Every **multi-line** anchor in
an edit script then fails silently, while **single-line** ones keep matching.
The script cheerfully reports "applied 1 across 1/3" and leaves a
half-transformed file — and because the missed anchors were the important
ones, the file looked plausible.

Re-running it made things worse: several of these scripts replace an anchor
with text that *contains* that anchor, so they are not idempotent, and the
second run duplicated everything that had succeeded the first time. Caught by
grepping for duplicate ids rather than by any check.

Two habits from it. **Normalise to LF before editing a reverted file.** And
**after any re-run, grep for duplicated markers** — `id="…"`, script tags, a
heading — because a duplicated block parses fine and verifies fine.

Status: `b10/0001` and `a11/0004` `unverifiable → verified`. 61/96. Five M3
lessons remain: `b10/0002` and four in A11.

### Session of 2026-08-22 — b10/0002 finishes B10, and an endpoint that could not run

The last B10 lesson, and the worst column drift found so far. The DPDP lesson
teaches two endpoints — data export and account erasure — and **both named
columns that do not exist**. `users.username` (it is `display_name`),
`messages.sender_id` (it is `sender_type`; holders are not users),
`messages.content` (it is `ciphertext`), `redemption_events.redeemed_at` and
`.ip_address` (they are `created_at` and `holder_ip`), `tokens.code` (deleted
by ADR-0007), and a `participants` table that has never been created.

Seven names. Not one of them would be caught by anything: `verify-lesson.mjs`
runs JavaScript, and a `<pre>` block of confident SQL is read by no tool in
this repo. The lesson had sat at `unverifiable` since 2026-08-18 with a
plausible reason attached, and plausible is exactly what it looked like.

**The revealed solution was the worse half.** The body had been half-corrected
earlier in the session — someone changed `content` to `ciphertext` in the prose
snippet — and the `createSolution` block, which is the copy the student pastes,
still selected `code` and `content`. The lesson's own callout spends four
paragraphs explaining that a bulk export of token codes is *a worse artefact
than the database it came from*, and then the exercise solution built one.
`b10/0001` had the identical shape a day earlier: prose fixed, solution not.
**They are different strings, and only one of them gets re-read.**

**The erasure order had been wrong since B2 grew a table.** The transaction
deleted `tokens` while `conversations` and `redemption_events` still pointed at
it, both with `ON DELETE RESTRICT` — so account deletion would have thrown for
every user who had ever been messaged. `conversations` was not in the list at
all, because it did not exist when the list was written; `b2/0002` added it,
two modules away, and nobody was looking at a DELETE order in B10 that morning.
The `order-steps` quiz question keyed the broken order as correct.

That is the `SELECT *` defect class from `b3/0003` again: **a bug created by an
edit somewhere else, in a file the editor never opened.** So the exercise is
`planErasure`, which *reads* the foreign keys, rather than a list a person
maintains. Eleven wrong-cases; the headline one just returns the stores in the
order it was handed, which is what a person does.

**The thing the lesson gained, which is better than what it lost.** It claimed
*"Once done, the data is gone"* two inches below a retention table saying
backups are kept seven days. Both cannot be true, and the resolution is not to
delete harder — it is that every erasure has a **tail**, and naming it is the
compliant answer while denying it is the actual failure.

Then the part that only works here: under ADR-0002 those snapshots contain
message bodies the server never held a key for, so their survival discloses
nothing. **The tail applies only to what you chose to keep in the clear** —
display names, labels, timestamps, who talked to whom. Which makes data
minimisation the *mechanism* that makes erasure achievable rather than a box on
a checklist, and means the date you can honestly give a user was decided at
schema-design time, years before they asked. The limits are stated too, so it
does not become a general excuse: `code_enc` is encrypted with a key the API
holds and therefore counts as clear, and the holder's copy on their own device
is outside your reach entirely.

**And the export was disclosing a third party.** `redemption_events` holds the
redeemer's IP, name and browser. The issuer's download shipped all of it — one
Data Principal handed another's location, on request, through a compliance
feature. The general form is worth keeping: **"a row in my table" and "my
personal data" are different sets**, and an export written from the schema
rather than from that question ships the difference.

**`phone_hash`: asked the same day, and answered.** The lesson's compliance
table claimed *no phone number, no email, no real name*; `b2/0001` stores
`phone_hash` and a `NOT NULL display_name`. A hash of a ten-digit Indian mobile
is a lookup key, not an anonymisation — the argument `b3/0001` already makes
about a different column. This was the one place the product's central claim
and its schema disagreed, and it is a **compliance document** that would carry
whichever answer won, so it went to the student rather than being quietly
resolved either way.

The student chose **keep the column, fix the sentence**: the number is how you
recover your account, and passphrase-only sign-up means a lost passphrase is a
lost account. The claim is now *"we store a scrambled version of your phone
number, used only to sign you in"*, recorded in `CLAUDE.md`.

**What made the question answerable was separating two claims that had been one
line.** *What a token holder learns* is nothing — the product's real promise,
never in doubt. *What the company collects* is a hashed number and a display
name. Sweeping the course for "no phone number" found ~14 uses and **all but
`b10/0002`'s two meant the first**, so they were correct and left alone. Framing
it in those terms — "should we stop keeping it, or stop saying that?" — is what
made it a decision rather than an architecture argument, which is the same
lesson the ADR-0008 framing produced on 2026-08-20.

**Two process notes.**

Defining `deletion_queue` cleared the orphan error and the audit immediately
failed with *"no longer matches any error — delete the entry"*. That is the
stale-acknowledgement check doing precisely the job it was built for, on its
first real occasion. The entry was deleted, not re-worded.

And: **a wrong-case must differ from the right answer in exactly one way.** Six
of the eleven initially tripped two checks, because I had also left correct
cycle-detection out of them. Tightening that produced an immediate `FAIL` —
which turned out to be a missing `${PRELUDE}` in one case, not a hole in the
self-check. Both outcomes matter: until a case differs in one variable, a case
failing for the wrong reason and a case passing for the wrong reason look
identical. The tightening also drove a genuinely missing check — `untilDays: 0`
is a retention that expires today, and `if (r.untilDays)` rejects it. The
`max_uses: 0` mistake, in a new table.

Status: `b10/0002` `unverifiable → verified`. **62/96. B10 complete**, so B2,
B3, B7 and B10 are all done. Known-and-blocked down to two. Four M3 lessons
remain, all in A11.

### Session of 2026-08-22 (continued) — a11/0003, and a typo that issues an unlimited token

Predicted as "the most likely of A11's four to hold a real function". It held
one, and four live defects around it.

**The headline.** The lesson's number-field handler was

```js
const num = parseInt(text, 10);
onChange(isNaN(num) ? undefined : num);
```

which reads as careful defensive coding and hands out the most permissive value
the form can produce. `undefined` on an `.optional()` field is not "invalid" —
it is **absent**, and absent on `maxUses` means **unlimited**. Type `3`, fumble
a letter, and you have issued a token with no use limit. Nothing reports it:
the form is valid, the request is valid, the row is valid. The only trace is a
token that keeps working after the third use.

`parseInt` is the quieter half. It parses a *prefix*, so `parseInt('7x')` is
`7` and `parseInt('1e3')` is `1` — a user asking for a thousand uses gets one,
silently. `Number()` refuses the whole string, which is what you want from
something guarding a limit.

**The rule this makes explicit, now on its fourth lesson: when a value cannot
be understood, refuse it — do not substitute a default.** The default you reach
for is always the permissive one, because permissive is what "no opinion" looks
like. `b7/0002`'s unknown rule type falling through to `allowed` is the same
bug in the backend.

**The shared schema had the same habit three times over**, and this matters
more than a screen bug because `shared/src/schemas/token.ts` is imported by
`api/` — it is the API's definition of a valid token.
`.optional().or(z.literal(''))` made `''` a *valid* `expiresAt`, so the field a
user deliberately left blank passes validation, enters the request body, and
reaches a `TIMESTAMPTZ` column where `new Date('')` is `Invalid Date`. The same
transform on `issuedTo` stored `''` where the rest of the system expects null,
defeating every `??` fallback. And `maxUses: .min(1)` made `max_uses: 0`
unreachable, while `CLAUDE.md` and `CHECK (max_uses >= 0)` both say `null` is
unlimited and `0` permits no uses — so the column had a state nothing could
create and no form could edit back.

All three are one habit: **treating "the user did not fill this in" as a value
rather than as an absence.**

**And the mirror-image failure, which is the reason the exercise pins ordering
rather than just conversion.** `Number('')` is `0`, not `NaN`. So an
implementation that converts before checking for blank turns every untouched
max-uses field into a **zero-use** token. One line's ordering apart from the
headline bug, in the opposite direction, and equally silent.

**A cross-lesson contradiction in the existing exercise.** It refined
`timeStart < timeEnd`, which forbids `22:00–06:00` — the overnight window
`a5/0004` spends a whole lesson teaching `isWithinWindow` to evaluate, where
"the morning belongs to yesterday". The form could not create the rule the
evaluator exists for. It now refuses only `start === end`. Third time a
lesson's cross-field validation has been stricter than the system it feeds, and
the tell each time was a rule that sounded obviously right.

**Two process improvements worth keeping.**

The wrong-cases file composes each mistake from one correct implementation
split into named fragments, overriding exactly one. That makes them
single-variable **by construction** rather than by care — which is the fix for
what went wrong writing `b10/0002`'s cases the same day, and it made the file
shorter as well. Four of the eleven still trip more than one check, and all
four are inherent: one behavioural change with several consequences, which is
fine. The bad kind is an extra failure from something you forgot to include.

And: **the quiz had 25 questions and not one the verifier could run.** Every
one was about Zod or react-hook-form API surface. A lesson can reach `verified`
with an entirely unchecked quiz, which is worth remembering about the metric.
Three executable ones were added — `parseInt` over four real inputs,
`Number('')`, and the fact that `Invalid Date` compares false against
everything including itself, so *neither* branch of a two-way date comparison
catches it.

Status: `a11/0003` `unverifiable → verified`. **63/96.** Three M3 lessons left,
all in A11.

### Session of 2026-08-22 (continued) — a11/0002, and measuring a palette nobody had measured

The theming lesson. Its palette was chosen by eye, and the first thing I did
was run the contrast formula over it, which turned out to be the whole finding.

**In light mode: `warning` 2.19, `textMuted` 2.07, `success` 2.87, `accent`
3.15, `danger` 3.82 — every one under the 4.5 a body-text pair needs.** The
dark palette passed almost everything.

That is the reverse of the usual worry and it has a reason worth keeping:
**choosing a colour to sit on near-black is choosing for contrast whether you
mean to or not**, because that is the only way it will be visible at all.
Choosing one to sit next to white is a question about taste. The mode nobody
tests is the one people use in daylight.

**For Token specifically it was worse than a generic accessibility miss.**
`a5/0003` derives five display states and the badge renders them with
`success`, `warning` and `danger` — which were the three worst colours in the
palette. *"Is this token still live?"* is the single most important question
the app answers, and it was being answered at 2.19:1. The exercise then
instructed the student to build precisely that badge.

**Three things fell out of measuring rather than eyeballing:**

*A colour is not accessible; a pair is.* The old `textSecondary` was 4.69 on
`background` and 4.45 on `surface` — the same colour, passing and failing,
depending which card it landed in. The check anyone would think to run is the
one that passes.

*Amber cannot carry white text.* No shade of `warning` reaches 4.5 against
white while remaining amber. The fix is not a darker fill, it is dark ink on
it — which is why each semantic colour now ships with a paired `on*` key.
**When one colour cannot be fixed, fix the pair.**

*`textMuted` could not be saved at all.* Any grey light enough to read as
"muted" on white is below 4.5, and the first one that passes is already
`textSecondary`. So it is documented as disabled-and-decorative only, with the
rule that no information may live in it. A palette that cannot express a
distinction is better than one that expresses it illegibly.

**Contrast is not the colour-blindness fix, and it is worth being explicit
about that** because fixing the numbers feels like finishing the job. A 5.38
green and a 5.44 red are both perfectly legible and completely identical to
each other, and red-green is ~8% of men. Token's badge uses exactly that pair
for active-versus-revoked. WCAG 1.4.1 is separate, and here the fix costs
nothing because `displayStatus` already returns a word — render it. The test
needs no tooling: screenshot, greyscale, see if you can still tell.

**Two more defects in the exercise.** It told the student to show "the token
code (monospace)" on a list card, and `GET /tokens` returns no `code` field at
all (ADR-0007) — the revealed solution took `tokenCode: string` as a prop, so
every row would have rendered `undefined`. Same defect as `a5/0003`'s
`{item.code}`. And the badge used `statusColor + '20'`, a 12% tint, which makes
the ratio **unknowable** — it then depends on whatever is painted behind, which
is the same class as the `rgba()` value the new exercise refuses to score.

**The part I got wrong, and it was the trap I had written down that morning.**
Four of the eleven wrong-cases first reported `passed everything`. Three shared
one cause: my checks did `find(list, name).ratio`, and a mistake that puts an
entry in a different bucket makes `find` return `undefined`, so the check
**threw** — which aborts every check below it and surfaces as "could not run".
That reads as a broken verifier rather than as a caught mistake. It is exactly
the note already sitting in `SESSION.md` under *Verifying a lesson*, and I
still wrote it. Fixed with `ratioOf`/`bucketOf` helpers that return a sentinel
instead of dereferencing a miss.

The fourth was a wrong `expect`: I had assumed averaging the channels rather
than weighting them would break the body-text case, and it breaks the
large-text one. The real lesson was in the fixture, not the expectation —
**greys are the one input where weighted and unweighted luminance nearly
agree**, so a grey cannot test the weights. Pure blue on white is 8.59 weighted
and 2.74 unweighted, because blue carries only 7% of perceived brightness.

Which generalises usefully: **the anchors everyone knows are the ones that
discriminate least.** Black-on-white is exactly 21 and self-against-self is
exactly 1 *with or without* the sRGB gamma decode — the actual bug. It takes a
mid-grey (4.48 correct, 2.03 broken) to see it, and that is the one number
nobody has memorised.

Status: `a11/0002` `unverifiable → verified`. **64/96.** Two M3 lessons left,
both in A11.

### Session of 2026-08-22/23 — M3 finished, B4 rewritten, C5 begun, and eleven decisions

The longest session so far, and the one where the course stopped being repaired
and started being extended. Counts are in `PROGRESS.md`; what follows is why.

#### M3 finished — 37 lessons, and a prediction that was wrong every single time

`a11/0001` and `a11/0005` closed it. The headline for the whole exercise is a
number: **`--unverifiable` was reached for zero times across all of M3**, and
the prediction that a lesson "has nothing runnable in it" was wrong **15 times
out of 15**. That reflex has now been retired in `SESSION.md` rather than just
having its tally updated, because a heuristic that is never right is not a
heuristic.

**`a11/0001` — an animation is a claim.** The lesson said a token is *"revoked
immediately with a satisfying animation"*, and the code meant it: the card
animated to `-SCREEN_WIDTH` and called `onRevoke` from the completion callback.
Two defects. A gesture is not consent — `b2/0001` comments `revoked_at` as "set
once, never cleared" and `b7/0003` makes revoked terminal, so an accidental
swipe permanently destroys a capability with no undo for either party. And the
row was destroyed before the work succeeded: if the request fails, the card is
gone and the token is still live.

The generalisation is the useful part. **An exit animation is a claim that
something happened.** `exiting={FadeOut}` belongs to the list re-reading real
server state, never to the gesture ending. The test: *if the request fails, does
the screen still say it worked?*

**`a11/0005` — the store listing declared data Token has never had.** Four
places named an **email address**, including Google Data Safety and iOS App
Privacy, which are binding declarations. `b2/0001`'s `users` table is
`phone_hash`, `display_name`, `avatar_url`. Declaring data you do not collect is
embarrassing; failing to declare data you do collect is what removes an app.

It also never mentioned `runtimeVersion`, in the only lesson that ships updates
— so the gate deciding *who receives an update* was invisible. Bump `version`
for a JS-only OTA and it reaches **zero users** while the publish succeeds and
the dashboard goes green.

#### Eleven decisions, in four rounds

The student asked three separate times to be given every open decision with
options. That format worked far better than prose questions, and the pattern
from 2026-08-20 held: **concrete costs get answers, architecture vocabulary does
not.** The full list lives in `SESSION.md`; the ones that changed the product:

**Sign-in is the phone number, and there is no password anywhere.** This was the
load-bearing one. It made `b4-auth-server` the only module contradicting the
docs, and `b4/0001` did not get adjusted — **it lost its subject**. argon2 and
`password_hash` went entirely, because there is no user-chosen secret left to
hash.

**SMS OTP through an aggregator was accepted as a third party**, on the FCM/APNs
precedent. The distinction that keeps the rule coherent is recorded in
`CLAUDE.md`: the banned comms SDKs would carry the conversation, which is what
E2EE exists to protect, while an OTP carries six digits to a phone the user
already owns, once. Two consequences with lead times were written down rather
than discovered later — **DLT registration with TRAI is weeks of paperwork**,
and an OTP flow is a denial oracle by construction.

**Sessions never expire.** The refresh token *is* the device credential. A
re-login SMS costs money and proves nothing, since the attacker holding the
phone also receives the code.

**The 40 legacy pre-pivot lessons were deleted.** They had been carried as
"partially salvageable" since the pivot and nobody ever salvaged any of it. They
turned out to be entirely orphaned already — `index.html` linked to none of
them, `search-index.json` held zero entries. **Warnings went 1 → 0, the first
zero-warning audit in the project's history**, because the last one was a dead
link inside `07`.

#### B4 rewritten end to end, and a comment that was a lie

All three lessons, because all three were email-coupled — `0002` had 19
references and `0003` had 35, so fixing only the first would have left the
module contradicting itself.

**The find in `b4/0001` was a `// Constant-time response` comment over code that
was not.** The message really was identical on both paths; the *work* was not.
No account is one indexed `SELECT` at ~1 ms; an existing account is that plus an
argon2 verify at ~200 ms — visible by eye, on a first attempt, over ordinary
broadband. And a section titled *Timing attacks* sat three screens below,
explaining the concept in terms of string comparison, while the login leaked by
a margin four orders of magnitude larger.

**An early return is a disclosure.** Branches that must be indistinguishable
have to *do the same work*, not merely say the same words.

`b4/0002` turned out to be the opposite problem: a genuinely good lesson where
none of it executed, and one section that said *"nobody has a perfect answer…
decide it deliberately"* about the retry grace window — which is fine for prose
and wrong for a lesson to leave as prose. Implementing it produced the two
subtleties that are now the exercise: **a replay must return the existing
successor, not rotate again** (rotating forks the chain, so the *next* genuine
refresh is reported as theft — the failure surfaces one request after the bug),
and **the window is measured from `superseded_at`, not creation.**

It also split `revoked_at` from `superseded_at`. Both make a row unusable and
they mean opposite things: rotated-away is probably a retry, deliberately-killed
is not and must never revoke the family. **One name covering two events is a bug
waiting for the second event to happen.**

`b4/0003` had its threat model replaced rather than its examples. `request-code`
is the first endpoint in the course where **every unthrottled request costs
money**, and that is why one limiter is not enough: the per-number limits protect
your users and the per-IP limit protects your invoice.

**And account lockout was deleted rather than tuned.** The lesson had the
columns, the migration, and careful reasoning about threshold and duration — and
it already contained the damning sentence: *"anyone who knows your email can lock
you out of your own account, on demand, by failing to log in."* The password
decision removed that problem instead of mitigating it. **A control that needs
careful tuning to avoid becoming a weapon is often a sign that something upstream
is wrong.**

#### C5 created — three of five lessons

The module did not exist. `TOKEN-TRACK.md` says C5 **must precede B2**, and B2
was written first — but the dependency was met anyway, because `b2/0002` did the
E2EE schema rewrite up front. **The prerequisite was satisfied by anticipation
rather than by ordering**, which is worth recording so nobody "fixes" the plan by
concluding a rule was broken.

`0001` is about a key that will not load being **refused, never regenerated**.
The tempting version is three lines shorter, reads as robust, and silently
destroys every conversation the user has ever had. The specific line: `!stored`
is true for `''`, and `''` is what a locked Keychain returns — so the destructive
branch fires on the code path that runs most often, opening the app from a
notification. **Fifth appearance of the permissive-default rule**, after
`b7/0002`, `a5/0005`, `b3/0001` and `a11/0003`, and the lesson tabulates all
five because the tell is identical every time.

`0002` gives "warn on key change" an actual rule. Because the server assigns the
key version by incrementing, **a genuine rotation always arrives higher** — so a
different key at the same or a lower version has no honest explanation and can be
blocked outright. It matters because a replayed old key may have been retired
*because* it leaked.

`0003` is a one-line bug with a disproportionate failure mode: `hash(myKey +
theirKey)` gives each device a different answer, so **verification does not fail
as "unavailable", it fails as "you are being attacked"** — to every user, every
time, until support tells people to ignore the screen. A feature that cries wolf
gets worked around, and the workaround is the damage.

#### The backup decision, and one place I overstated the case

The student's first answer was *"log in with the same number and data is auto
restored"*, with no passphrase. That cannot be built without removing E2EE: for
data to return from a phone number alone the server must be able to release the
key, which means it can release it to itself.

It was put back once with the cost spelled out, and **the split came out of
checking rather than arguing.** The token list, labels, rules, redemption
history, conversation list and profile are all server-side and not encrypted to
a user key — so they restore from an OTP with nothing written down. Only message
*bodies* need the 12-word phrase. **That was not a compromise invented to end a
disagreement; it is what the schema already was, and nobody had looked.**

On key changes the student chose silent acceptance, having read the consequence,
and that stands. **I had called E2EE-plus-silent-acceptance "incoherent" and that
was wrong** — it is a real posture, and the correction is now in `CLAUDE.md`:

> Token is end-to-end encrypted **against a server that stores and does not
> attack.** It is not protected against one that actively substitutes a key.

iMessage was exactly this until Contact Key Verification in 2023, and the store
declaration stays true. What must not be written is *"nobody can intercept your
messages"*.

**The decision cost four lines.** `classifyPeerKey` did not change at all — it
still returns `warn`, because a key change *is* a key change. Only the caller's
policy moved, from throwing to pinning and logging. Both lessons re-verified
untouched, **including the assertion that the function never pins silently**,
because it still does not. That a reversal of a security feature's user-facing
behaviour was a four-line edit rather than a rewrite of a function and its eleven
wrong-cases is the whole argument for keeping classification and policy apart.

#### What the wrong-cases caught this session

Eleven separate holes in self-checks I had just written. Three recur often
enough to be worth naming:

- **A throw is not a failure, it is a stop.** A mistake that reaches
  `null.length` aborts every check below it and the runner scores it as *passed
  everything* — which reads as a broken verifier. The fix is a `got()` helper
  that catches and returns a sentinel so a throw becomes a **wrong answer**. This
  trap is written down under *Verifying a lesson* and it still caught me three
  times.
- **A fixture that varies something the bug does not depend on.** `b4/0003`'s
  `retryAfterMs` was only ever tested against a one-stamp window, where oldest
  and newest are the same number. `c5/0003` compared key pairs whose sorted-
  smaller keys differed, so an implementation hashing only one key passed.
- **A check that cannot fail is not a weak check, it is noise.** `c5/0003`
  asserted a function did not reorder the caller's array — but the function takes
  two strings. Unfalsifiable, reporting PASS forever, making the suite look more
  thorough than it was. **When you write an assertion, ask what input would make
  it fail.**

Also: `render-as-authored` went from 0 to 1 **twice in three days**, both times
while writing fresh quiz content quickly, and both times the audit caught it on
the next run. Once it was even a false trigger — the phrase was about requests,
not options — and it still mattered, because a flagged question renders
unshuffled. The habit that check guards against is evidently not automatic yet.

---

### Watch out when editing this file from a shell

Backticks in a `python -c` string get evaluated by bash *before* Python sees
them. Rewriting §8 that way spliced ~2KB of `git help` output into the document.
Write the replacement text to a file with an editor tool, then splice it with a
script that reads that file — never inline prose containing backticks into a
shell argument.

---

### Session of 2026-08-23 — C5 finished, the rules model settled, and every lesson executed

The longest session so far, and it divides into four bodies of work. The
through-line is that **almost every defect found was a contradiction between
two files that were each internally consistent** — which is the shape this
project keeps producing and the only reliable way to find it is to read one
file against another.

#### C5 finished, and `participants` resolved by deletion

`c5/0004` (backup) and `c5/0005` (single-device) close the module.

The best finding in `0004` cost nothing: read `b2/0002`'s columns and ask which
the server can read. Exactly one cannot — `messages.ciphertext`. So *"what
needs the recovery phrase"* was never a product trade-off to argue about; it
was settled the morning someone decided which columns stay outside the
ciphertext, and nobody had gone back and looked. **The general move is cheap
and worth repeating: list what is encrypted, and the backup requirement is
whatever is left.** Design the flow first and you protect a token list the
server hands over anyway.

`0005` was planned as multi-device and lost its subject when the student chose
one phone. **Costing the feature turned out to be worth more than building
it**, and the argument that decides it is one row of a table: sharing an
identity key across devices changes nothing downstream and means you cannot
untrust one device, because the key *is* the identity.

That lesson also closed the `participants` orphan — **by deletion**. The
decisive detail is not that Token lacks group chat: **the holder is not a
user.** `conversations` identifies them by `holder_session_id` with no
`user_id`, so a `(user_id, conversation_id)` junction had a column that could
never be filled in for half of every row. The three orphan tables ended three
different ways — one defined once a policy existed, one still waiting on an
unwritten module, one describing a product not being built. **Treating all
three as "write the missing table" would have produced one useful table, one
guess, and one that is always exactly two rows with an impossible column.**

#### The rules model — what looked like a preference was a live break

The question put to the student was "rows or a JSONB column?". The answer was
rows, and the reason it mattered was not the one in the question:
**`b7/0002` ran `SELECT rules FROM tokens` against a column `b2/0001` has never
created.** The vocabularies had drifted with it — the schema's `CHECK`
permitted `call_limit`, `category`, `cooldown` while the engine evaluated
`contact_limit`, `channel_restrict`. Three lessons, three vocabularies, only
`time_window` common to all three. **The database would have rejected every
rule the product creates.**

Rows won on a point worth keeping: not the join cost, which is trivial, but
that **`rule_type` becomes a constrained column, so a rule type nothing can
evaluate is refused at the `INSERT`** — and `b7/0002` had already shipped the
defect that prevents.

Moving to rows then introduced a failure the column could not have, and it is
worth more than the change that caused it. **An inner join returns zero rows
for a token with *no rules*, and zero rows is how the engine recognises "token
not found".** So the obvious join refuses every unrestricted token — most of
them — reporting not-found for a token that is right there. Putting `enabled`
in the `WHERE` instead of the `ON` does the same to a token whose only rule is
switched off. **Deny-by-default makes both silent and total.**

A fourth `access_rules` design turned up in `b1/0002` afterwards — columns
instead of rows, plus `0 = unlimited`. **The vocabulary sweep missed it because
it greps clean**: the file never says `call_limit`, because its design has no
`rule_type` at all. *A vocabulary sweep finds files using the wrong words, not
files using a wrong shape.*

#### The `variant` blind spot — a check reporting zero, and a broken course

The audit had said `render-as-authored: 0` since 2026-08-18, and everyone
including `CLAUDE.md` read that as clean. It was a blind spot.
`explanationNamesAPosition()` knew `option|answer|choice` and **not
`variant`** — and `which-breaks` calls its list `variants` and shuffles it, so
*"Variant B uses `>` instead of `>=`"* is the phrasing everyone writes. **69
explanations named a letter the student never saw.**

Fixed in two halves, and the order mattered: one word in two places *pinned*
all 69 so their explanations were true again within a single commit and the
count became visible; then the rewording brought it back to 0 honestly. The
test suite got cases in **both** directions — the phrasings it must catch and
the ordinary prose it must not — because a false positive silently pins a
question that should shuffle.

**Rewording by reading rather than by regex found three questions that were
actually broken**, including one that asked which technique "won't help" and
keyed the most helpful one, with an explanation that argued with itself. A
`sed` would have fixed 69 strings and left all three.

#### Every lesson has now been executed

Nine lessons had *no verification-log entry at all* — never attempted, not
excused. Closing that list required teaching the runner TypeScript, which was
done as a **fallback rather than a default**: anything that parses as
JavaScript is executed exactly as before, so the change cannot alter a passing
lesson. Proven rather than asserted, by re-running all 73 verified lessons
against a captured baseline — zero regressions, and coverage went *up* by
three.

That change broke exactly one thing, and it was **a guard that had never
existed**. `a4/0001` q0 is four comments and a TypeScript declaration, answered
with a sentence; it was skipped *by accident*, because being TypeScript it
failed to parse and the SyntaxError landed in the `if (threw)` skip. Teaching
the runner TypeScript removed the accident and exposed the gap. **The guard was
not missing, it was being impersonated.**

Seven of the nine lessons were hiding a real defect — a denial oracle in
`a9/0002`, the token code taught into the logs in `x2/0002`, a `LEFT JOIN`
commented "most recent" that returns all of them, a `NOT NULL` gloss
contradicting its own quiz. **Two were clean**, and that is worth recording as
honestly as the seven.

#### What the wrong-cases caught this time, including three that were not mistakes

The wrong-case mechanism found a gap in the self-check written beside it
**eight or nine separate times**, and it remains the only thing that does. But
the more interesting result is the other direction: **three wrong-cases turned
out not to be mistakes at all.**

- Mapping `O`→`0` and `I`/`L`→`1` in a token code is a **no-op**, because
  every character it maps *from* is excluded and every character it maps *to*
  is excluded too. That is not luck — **the excluded set is closed under
  confusion**, which is the property that makes it worth having.
- `doc[key] !== undefined` instead of `hasOwnProperty`: JSON has no
  `undefined`, so the two are equivalent for every input.
- A required cycle guard that was not a safety property — the depth limit
  already makes a cycle safe, and the case could only be made to fail by
  *also* removing the depth limit.

**A case that passes everything is either a hole in the self-check or a mistake
that is not one, and the only way to tell is to look.**

Three more were fixture problems rather than weak cases — a fixture that could
not *express* the rule being tested. No NOT NULL numeric column, so a falsy
check had nothing to reject. No nullable UNIQUE column, so "nulls never
collide" was unobservable. A two-element `dropped` list that *reverses into
sorted order*, so `.reverse()` passed where `.sort()` was required.

And one hid inside the thing it described: the mistake that sends `undefined`
in a PATCH body builds an object that **`JSON.stringify` serialises identically
to the correct one**, because stringify drops undefined values. The check had
to compare keys. That is precisely why sending `undefined` is dangerous rather
than harmless.

#### Two traps walked into, both already written down

- **A backtick inside a template literal.** Writing `` `code` `` as Markdown
  emphasis inside a `createSolution` string terminated it, and the parse error
  named an identifier three lines away. The rule is in `CLAUDE.md`; the file it
  is written in is where I broke it.
- **Running `verify-lesson.mjs` without `--unverifiable` deletes the log
  entry.** It happened to `b6/0001`, was written into `SESSION.md` the same
  morning, and then happened again to `b9/0003` hours later. **Writing it down
  did not stop it, because the reflex that causes it — verify after editing —
  is the correct reflex.** The warning now carries the check that actually
  prevents it: read the log first.

#### Process changes the student asked for

Approvals were removed in three steps across the session, ending with `Bash`
allowed wholesale (deny list intact, `sudo` added as a floor). Then: **stop
asking for decisions at all.** What replaces it is stricter — decide on the
evidence, write it where the decision lives, state the cost of the rejected
option, and flag it in the report. **An unflagged assumption is worse than a
question**, and stopping is no longer available.

`CLAUDE.md` also had a stale warning corrected: it claimed `b4-auth-server`
still taught email and argon2. B4 was rewritten on 2026-08-22; the argon2 that
greps there is **quoted history**, shown so its 200 ms timing gap can be
measured. The note was training the next session to delete the example that
teaches the denial oracle.

---

### Session of 2026-08-23 (continued) — a7/0001, and a quiz that was right twice

Picked up the recommended body of work in `SESSION.md` — the 17 lessons still
marked `unverifiable` — and started with the A7 cluster, because `CLAUDE.md`
carried a second open item against it: *check `a7-voice-video` still needs*
`iceTransportPolicy: 'relay'`.

**That item is closed and the answer was no.** `0001` constructs with the
literal and states the three costs, `0005` is an entire lesson on it, and
`0002`–`0004` never build an `RTCPeerConnection` of their own — they use the
wrapper — so there was no second place for the policy to go missing. Worth
recording that a flagged concern came back clean; the same check found two
*different* defects instead.

#### The finding: the lesson's quiz already knew both answers

`b1/0001` established the rule that when a lesson's quiz contradicts its body
you believe the quiz. This is the strongest case of it yet, because the quiz
was right **twice** and neither answer had been carried across into the code
sitting a few hundred lines above it.

- A quiz explanation read *"In Token's code, we buffer incoming ICE candidates
  if they arrive before the remote description is set."* The code did not
  buffer: `handleRemoteIce` called `addIceCandidate` unconditionally, which
  throws `InvalidStateError` when there is no remote description.
- An `order-steps` explanation read *"Token should show a 'Reconnecting...' UI
  during the disconnected state rather than immediately hanging up"*, the state
  table documented `disconnected → connected` as recovery, and the exercise
  said *"or 'disconnected' for too long"*. The code was
  `if (state === 'disconnected' || state === 'failed') onHangup()`.

**Three statements of the right answer surrounding one line of the wrong one.**
The general shape is the one this course keeps meeting from the other
direction — prose corrected, code beside it untouched — except here the prose
was never wrong to begin with. Nobody had read the two against each other.

#### Why a race is the defect that survives review

The remote peer starts gathering candidates at `setLocalDescription`, which
happens *before* it sends the offer, and both travel one WebSocket. The
`subscribe` switch calls `this.handleRemoteOffer(payload.sdp)` without
awaiting, so the next frame is dispatched while the offer is still three
`await`s from being applied.

Two phones on the same Wi-Fi win that race almost every time. Mobile data does
not. **So the office network — the best one anybody tests on — is precisely the
environment in which the bug is invisible**, and it reaches users as *"calls
sometimes don't connect"*. And because `handleRemoteIce` is `async` and called
without `await`, the throw became an unhandled rejection: nothing logged, no
boundary hit, the call simply connected on fewer candidates or none.

The new executable quiz question pins the interleaving rather than describing
it — `setRemoteDescription -> iceArrives -> remoteReady`.

#### The cap has a direction, and the obvious one is backwards

An unbounded queue lets a peer who never sends an offer decide how much memory
you use, so it needs a cap. But `slice(-MAX)` — keep the most recent — is what
everyone writes, and it means **anyone can flush the working relay candidates
out of the queue by sending 64 more**. Drop what is arriving; keep what is
held. Both versions are bounded, which is why *"is it bounded?"* is the wrong
question to stop at.

This also produced a self-check rule worth reusing: the cap assertion is
`=== 64`, not `<= 64`, because an implementation that buffers **nothing at all**
also has a bounded queue and must not pass. A lenient assertion on a safety
property will happily accept the absence of the feature.

#### The two wrong-cases that earned their place

Eleven were written. Nine confirm ordinary slips; two are the ones that would
actually ship:

- **Flushing the queue before the description** is not a partial fix, it is no
  fix — identical `InvalidStateError`. It is also exactly what you write if you
  think of a queue as a backlog to clear before handling the new arrival.
- **Flushing on `'offer'` only.** The callee receives an offer, so their side
  works perfectly; the caller only ever receives an *answer*, so every
  candidate they buffered is abandoned in silence. **Debug either device on its
  own and it looks correct** — the same read-both-sides-together move that
  found `a8/0004`'s unsent `localId`.

#### A count that turned out to be a signal

`createExplain` is present in 84 lessons and `verified` stood at 84. Those are
the same 84: **the 17 lessons without an explain prompt were exactly the 17
still marked `unverifiable`.** Both gaps have one cause — nobody had done a
pass over those lessons — so adding the prompt belongs inside each M3 pass
rather than in a separate sweep later.

Also fixed: the revealed solution was a comment block reading *"See the full
TokenPeerConnection class in the lesson code above"*, against lesson invariant
4, which requires a complete pasteable file. Replaced with the real file.

**Result: 85 verified, 16 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-23 (continued) — a7/0002, and a clock that only worked while you watched it

Second of the `unverifiable` cluster. M3: `callDisplay` — 16 self-checks, 10
wrong-cases, 3 new executable quiz questions.

#### The defect testing cannot find

The call duration was `setInterval(() => setDuration(d => d + 1), 1000)`. That
is not a measurement of time; it is a count of how many times a callback ran,
and the two agree exactly as long as nothing stops the ticks.

**iOS suspends JavaScript timers for a backgrounded app, and a voice call is
specifically the screen the user leaves** — phone to the ear with the proximity
sensor blanking it, a switch to Maps to read an address out, the screen locked
while the conversation continues. A fourteen-minute call comes back reading
four minutes. Nothing errors, the audio never stops, and the number is wrong by
exactly the span the user was not watching, which is the span they have no way
to check.

The fix is a subtraction: stamp `connectedAt` once, compute
`Math.floor((now - connectedAt) / 1000)`. The interval then has no arithmetic
to get wrong — its only job is to trigger a re-render, and a tick it misses
costs nothing because the next one recomputes from the clock.

**The general form is worth more than the fix:** an accumulator is only correct
if it observes every event, so it inherits every reason observation might stop.
A subtraction over two timestamps has nothing to miss.

#### Yesterday's fix made today's bug reachable

`0001` gave `disconnected` an 8-second grace period rather than hanging up on
it. That created a state this screen had never had to render, and the render
was a two-way ternary on `callState === 'connected'` — so a four-minute call
would display **"Connecting…"** and drop its timer for the duration of a blip.

Both halves fail in the same direction: the screen reports that nothing has
happened yet, on a call that is live and audible. A user who believes it hangs
up, ending a call that was about to recover on its own.

**A ternary has room for two answers and this screen has four** — never
connected, live, momentarily lost but still counting, and over. When the states
outnumber the branches, the extras do not vanish; they fall into whichever
branch is the fallback, and the fallback is the one nobody chose deliberately.
Same reasoning as `a5/0003`'s badge deriving five displayed states from three
stored ones.

Worth recording as a pattern in its own right: **fixing a state machine creates
render obligations elsewhere.** Nothing in `0001` touched this file, and
nothing in this file was wrong until `0001` was right.

#### The lesson contained both the right and the wrong formatter

The screen's `formatDuration` had no hours branch and computed minutes over the
whole total, so an hour-and-a-quarter call read `75:30`. The playground higher
up the same page already had the correct three-part version. That is the third
time in two lessons that one page has held both answers — after `0001`'s two
quiz explanations describing behaviour the code did not have.

#### Counting trips per mistake earned its keep twice

The routine of checking how many self-checks each wrong-case trips found two
problems that a green run hides:

- **A fixture-design coupling.** The falsy-`connectedAt` mistake was tripping
  six checks, because the format fixtures used `connectedAt: 0` for arithmetic
  convenience and so depended on the very behaviour a different case was
  testing. Moving them to `1000` dropped it to one. Nine of ten mistakes now
  trip exactly one check.
- **A check-ordering problem.** The unpadded-minutes mistake tripped the
  `59:59`/`1:00:00` boundary check first, because `1:00:00` also has
  single-digit minutes. The specific check now runs before the general one.

The tick-counter mistake legitimately trips twelve, and that is inherent — the
duration comes from the wrong source, so every duration assertion fails. One
behavioural change, twelve consequences. It is documented in the case file so a
later reader does not try to "fix" it.

#### A judgement call, flagged rather than buried

The quiz has several questions built on `setDuration(d => d + 1)` — the
functional updater, the stale closure, the missing `clearInterval`. **They are
not wrong**, so the believe-the-quiz rule does not apply; they teach genuine
hazards *of accumulating*, and rewriting three keyed questions is where keys
get broken.

They stay, and the lesson now names the consequence instead:
`setNow(Date.now())` has no previous state to capture, so the stale-closure bug
cannot be written at all, while `clearInterval` still matters because that one
is about unmounting rather than arithmetic. **The cost of leaving them is that
a reader could take the accumulator as endorsed**, and the callout is what
prevents it. Rewriting them stays available if that turns out not to be enough.

**Result: 86 verified, 15 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-23 (continued) — a7/0003, and the state that cannot be observed

Third of the `unverifiable` cluster. M3: `videoStage` — 15 self-checks, 10
wrong-cases, 3 new executable quiz questions.

#### The prediction was right in the wrong place, which is the useful part

`SESSION.md` predicted `0003` would carry its own copy of whatever `0002` got
wrong. It has no call clock at all, so it does not duplicate the timer — but it
does carry the *ternary*, `callState === 'connected' ? 'No video' :
'Connecting…'`, with the same `disconnected` blind spot on a different
variable.

Worth keeping as a heuristic: **a defect shape travels between sibling screens
even when the feature it attached to does not.** Looking for the same *bug*
would have missed it; looking for the same *shape* found it.

#### The finding: some state has no representation to inspect

The viewport was decided by whether a remote stream object exists. It always
exists once negotiation has happened — including when the other person presses
Video Off, because `enabled = false` disables a track rather than removing it.
So `RTCView` renders black and the user is looking at an unlabelled dark
rectangle indistinguishable from a dead connection, a permissions failure, or
a phone in a pocket.

**The lesson's quiz already said exactly this** — *"What does the remote peer
see when you call `videoTrack.enabled = false`?"* → *"A black/frozen frame."*
Third lesson in a row where the quiz holds the right answer and the code beside
it does not act on it. The pattern is consistent enough now to state as a
review move: **read a lesson's quiz against its code before reading either on
its own.**

The genuinely instructive part is *why* no amount of care in the receiving
client would fix it. Muting sends no message; it swaps the frames for empty
ones. At the media layer, black frames from a disabled camera and black frames
from a covered lens are the same bytes. **There is nothing to inspect, so the
information has to be sent** — `call:media` with `{ videoEnabled }`, over the
socket that already carried the offer. Neither `0002` nor `0003` sent one.

#### Three states again, for the fourth time in this course

Adding the message adds `peerVideoEnabled: true | false | null`, and
`if (!peerVideoEnabled)` collapses null into false. An older client that never
sends `call:media` would have good video replaced by "they turned their camera
off" for the entire call.

That is now four different places the same trap has appeared — `a2/0002`'s
`Partial<T>`, `c5/0004`'s gone-versus-not-fetched, `b1/0001`'s `NULL` versus
`''`, and here. **Not being told something is not the same as being told no**,
and the falsy test cannot express the difference.

#### Precedence is the exercise, and it is invisible until two things coincide

Six rules, and every wrong-case gets each individual rule right while producing
the wrong screen. A call that failed while the peer's camera was off makes two
notices simultaneously true, and only one is useful: a screen reporting the
camera never tells the user the call is over.

The order is **ended → connecting → reconnecting → camera-off → waiting →
live**, and two placements are load-bearing without looking it. `ended` must
sit above `connecting`, or a call that failed before ever connecting shows a
spinner for ever. `reconnecting` must sit above `camera-off`, because during a
blip we no longer know whether that camera state is current.

This is why the function is a sequence of early returns rather than conditions
combined at the end — and why one alternative implementation in the cases
expresses the same order as a table walked in sequence, to prove the ordering
is the logic rather than the syntax.

#### The mirror was set from the intention rather than the result

`handleCameraFlip` called `switchCamera()` and flipped `frontCamera`
regardless. Both the optional chain and the guard inside `switchCamera` can
decline to act, leaving the preview mirrored against a camera that never
moved — and inverted for every flip after that. `switchCamera` in `0001` now
returns a boolean. Same shape as `a11/0001`, where the row animated away before
the revoke request had succeeded: **UI state describing the world must be set
from the result, not the intention.**

`0001` was re-verified after that change. It was already `verified`, so nothing
was at risk from the log-deleting trap — but the log was checked first anyway,
which is now the habit.

#### The trip-count caught a fixture making two mistakes indistinguishable

The base fixture had `peerVideoEnabled: null`, which meant **the ordinary good
case was also the not-told case** — so the mistake that collapses null into
false tripped the good-case check rather than the one naming it. Moving the
base to `true` fixed it and made the null case a deliberate, isolated fixture.

The same pass found a **redundant wrong-case** that changed two things at once
and duplicated another. Replaced with the shape the lesson actually shipped: no
camera-off rule at all. Seven of ten mistakes now trip exactly one check, and
each of the three multi-trips is a single removed or moved rule.

**Result: 87 verified, 14 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 — a7/0004 finishes A7, and a bug that only exists between two files

Fourth and last of the A7 cluster. M3: `decideIncoming` — 21 self-checks, 10
wrong-cases, 3 new executable quiz questions. **A7 is complete: five of five
verified.**

#### The invariant is a resource balance, not a display rule

The previous three A7 lessons all turned out to be about deriving what to show.
This one is about a pairing: **a call reported to CallKit must be ended exactly
once.** Miss it and iOS keeps showing the system call screen for a call that is
over — not a notification you can swipe, sometimes surviving until the phone
restarts. Call it twice and `endCall` fires against a UUID CallKit has already
forgotten.

The lesson shipped `reportIncomingCall` and `endCallFromApp` with **nothing
pairing them up**, so declining in the app while CallKit was also ringing left
the phantom behind.

#### "Always end" and "never end" are each exactly half right

This is the part worth keeping. Declining **in the app** owes CallKit an
`endCall`, because nothing else will send one. Declining **on the native
screen** owes it nothing, because CallKit ended the call itself before it told
you. Two actions that are identical from the user's side, one line apart in the
code, with opposite correct answers.

Accepting is a third answer again — an in-app accept needs
`answerIncomingCall`, not `endCall` (which hangs up the call just taken) and
not silence (which leaves the system screen ringing over the top of it).

A ringing call has **six exits** and a seventh event that is not an exit: the
same call arriving twice, by VoIP push and again over the socket when the app
foregrounds. **Two endings arriving for one call is the normal case, not the
edge case** — the caller hanging up and the callee declining happen together
constantly. So the terminal guard sits before the switch rather than inside
each branch: six branches each remembering to check is six chances to forget,
and the one that forgets is whichever was added last.

#### The defect that exists only between two files

`handleReject` sent `call:reject`. `handleAccept` sent **nothing** — it
navigated. But `0002`'s caller side subscribes and waits for `call:accepted`
before it builds its peer connection.

**Nobody was sending the message the caller was waiting for.** The callee's
screen would open and sit at "Connecting…" while the caller had not started
negotiating at all. Each file is correct read on its own; the gap is only
visible reading them against each other — the same move that found
`a8/0004`'s unsent `localId` and `0003`'s missing `call:media`. That is now
three times in this module, and it is worth stating as a review habit rather
than a coincidence: **when two lessons implement two ends of one protocol,
read them together or the protocol is untested.**

#### What the trip-count found this time

Two defects in my own self-check, both of the kind a green run hides:

- **One check was doing two jobs.** *"Accepting in-app ANSWERS the native call,
  it does not end it"* covered two different mistakes — ending it, and doing
  nothing — with different consequences, and reported them identically. Split
  into two.
- **A sequence check tested nothing.** *"Decline in-app, then CallKit's own
  endCall"* passes even with the terminal guard removed, because the native
  branch contributes no `end-native` either way. Replaced with the reversed
  order, which is the one that bites in practice: CallKit ends the call from
  the lock screen, then the app mounts and a stray in-app decline follows.
  Both orders are checked now.

Also a generation artifact worth noting for anyone writing cases this way: an
empty fragment interpolated into an array literal left an **elision**, so a
"removed the action" mistake produced `["stop-ringtone", null, …]` rather than
a clean list. It tripped the right check for the wrong reason. Fragments now
carry their own trailing comma.

#### A7 in summary — four for four

Every lesson in the module hid a **precedence, three-state, or exactly-once**
problem, and in three of the four **the lesson's own quiz already stated the
right answer** while the code beside it did something else. The module went
from one verified lesson to five.

**Result: 88 verified, 13 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — a10/0001, and a check that could not see its own bug

First of the A10 pair. M3: `planChunks` — 14 self-checks, 7 wrong-cases, 3
correct alternatives.

#### A second pattern, alongside A7's

A7's four lessons all had the right answer sitting in their own quiz. This one
is the same failure with a different geometry: **the lesson body is sound
throughout — genuinely well argued, matching `CLAUDE.md` — and every single
defect is in the revealed solution.**

- `set(key, value)` took two parameters while `saveRefreshToken` called it with
  three, so `keychainAccessible` was silently dropped and every item got
  *default* accessibility. The body spends four paragraphs on why the identity
  key needs `WHEN_UNLOCKED_THIS_DEVICE_ONLY` or it syncs to iCloud Keychain and
  gives Apple a copy of the key ADR-0002 depends on. **The class the lesson told
  you to build could not pass the option at all.**
- `value.length <= MAX_ITEM_SIZE` measured UTF-16 code units against a byte
  limit — the exact mistake the wrapper a few hundred lines up warns about in a
  comment, using `नमस्ते` as the example.
- `isAvailable()` cached its result, commented *"it won't change during a
  session"*. It does: the Keychain is unavailable before the first unlock after
  a reboot.
- A `StoredCredentials { accessToken, refreshToken }` type against the body's
  *"the access token is not stored at all"*.

So the review move to add: **read the revealed solution against the prose.**
Both A7's and A10's failures are the same underlying thing — a lesson gets
corrected in one place and the code beside it does not — but they need
different reading passes to find.

#### The self-check that could not see the bug it was written for

This is the part worth keeping. Slicing a string by index can cut a surrogate
pair in half, and the obvious assertion is that the chunks rejoin to the
original. **That assertion passes on the broken implementation**, because in
pure JavaScript `s.slice(0,5) + s.slice(5)` reproduces `s` exactly — the two
lone surrogates recombine on concatenation.

The corruption happens at **encode** time. A lone surrogate has no UTF-8
representation, so `TextEncoder` emits **U+FFFD** and the write succeeds. The
value goes in, comes back, and is not the value.

My first version of the self-check made exactly that mistake, and only the
wrong-cases exposed it: the case built from the lesson's own shipped code
passed the round-trip check. The checks now model what the Keychain actually
does — encode going in, decode coming back. **A test of a storage layer has to
include the storage, or it is testing the wrong boundary.**

Worth noting why it survives real testing too: a refresh token is base64, so
every chunk boundary in it is safe. The bug needs a multi-byte character near a
boundary — which, for an app built for the Indian market, is a matter of when.

#### Three corruptions, and the check order is what separates them

Index-slicing corrupts emoji but not Devanagari, which is entirely BMP.
Byte-slicing corrupts both. Counting `.length` corrupts neither and merely
produces over-sized chunks. Running the checks as *Devanagari round-trip →
emoji round-trip → Devanagari byte limit* makes each of the three trip a
different check first; every other ordering collapses two of them onto the same
name. That took three attempts to get right and is commented in place so nobody
tidies it back.

Two of the seven cases trip eight checks each. That is deliberate: they are
whole-strategy substitutions rather than one-line slips, and case 0 is the
lesson's shipped implementation copied verbatim. Narrowing it for tidier output
would stop it being that. The four ASCII checks pass in both — which is the
argument the whole exercise is making.

#### The backtick trap, walked into while quoting it

`CLAUDE.md` documents that a backtick inside a `createSolution` solution string
terminates the template literal. My edits introduced three — a `` `false` `` in
a prose comment, an `` `options` ``, and a nested template literal inside a
thrown error. The whole script block stopped parsing and the error pointed at a
token forty lines away.

Second instance this week of the same meta-lesson, after the verification-log
deletion: **writing a trap down does not stop you walking into it**, because
the habit that causes it — marking up an identifier in a comment — is correct
everywhere else in the repo. The only thing that catches it is running the
verifier, which is why it is cheap to run often.

**Result: 89 verified, 12 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — a10/0002 finishes A10, and a lock nobody would notice was off

Second of the A10 pair. M3: `applyAppState` — 18 self-checks, 9 wrong-cases,
2 new executable quiz questions. **A10 is complete.**

First, the thing that was *not* wrong: `CLAUDE.md` records that the session
never expires and that the biometric app-lock is the control for a stolen
unlocked phone instead. A lesson tying the lock to a session timeout would
have contradicted a decision rather than a detail — it does not. This is a
lock timeout and nothing else.

#### `inactive` is not leaving

On iOS the sequence out of an app is `active → inactive → background`, and the
sequence back in is `background → inactive → active`. The handler stamped the
away time on both `background` and `inactive` — so **the `inactive` on the way
back overwrote the timestamp with *now*, one step before `active` read it.**
Elapsed came out at a few milliseconds no matter how long the phone had been
face-down on a table.

The detail that makes this worth writing down is *who it affects*. The default
timeout is `0`, and `elapsed >= 0` is true for any elapsed value at all, so the
lock works perfectly on a default install. It fails only for a user who opened
Settings and chose "after 1 minute". **The bug is invisible unless you change
the setting the lesson itself provides a picker for**, which is close to a
worst case: the users who cared enough to configure it are the only ones who
lose it.

`inactive` is not a departure in any sense — it fires for the app switcher, a
notification banner pulled down, a permission dialog, an arriving call. In
every one of those the phone is in the user's hand. Only `background` means
they left.

#### Two more, both failing open

- `parseInt` on a corrupted preference returns `NaN`, and **every comparison
  against `NaN` is false, including `>=`**. So a damaged setting does not
  throw, does not warn, and does not lock. The course's *refuse rather than
  substitute a default* rule applies, with an addition that matters here: on a
  security control the **fallback has to be the strict direction**. A lock that
  cannot read its own timeout should lock immediately. Failing open is the
  option that is never defensible and the one that arrives by accident.
- The in-call exemption was an early return that **discarded the away
  timestamp**. A call that ended while the app was backgrounded therefore left
  it unlocked however long it had been away — put the phone down mid-call, the
  call ends, someone picks it up. The fix is to make the exemption a field read
  at evaluation time rather than a branch taken at event time, so the clock
  survives the call.

#### A one-character difference that passed every check

`elapsed > timeout` instead of `>=` **passed the entire self-check.** The
timeout-0 fixture is 0.1 seconds away, and `0.1 > 0` is true, so nothing in the
file separated the two operators. The fix was a fixture that is away for
*exactly* the timeout — the only one that can, and the one "after 1 minute"
literally means.

That is the seventh time a wrong-case has exposed a gap in the self-check
written beside it, and it remains the only mechanism that does. A green
self-check still proves nothing about what it would catch.

One case here deliberately fails in the **safe** direction — ignoring `inCall`,
so the user gets locked out mid-call. Every other mistake in the file fails
open, and a set of cases that only pushes one way stops being a specification
and becomes a slogan.

**Result: 90 verified, 11 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — x1/0001, and a rule that is not a precedence rule

First of the X1 trio. M3: `isIgnored` — 24 self-checks, 10 wrong-cases, 3 new
executable quiz questions.

X1's three lessons were the oldest `unverifiable` entries in the log, all
excused with the same reason: *"the solution is git and shell setup rather
than runnable code"*. That reason was wrong. **`.gitignore` is not
configuration — it is a pattern language with a precedence order and a tree
walk**, and it behaves procedurally while reading declaratively, which is
precisely the combination that produces bugs nobody can explain.

#### The rule worth the whole lesson

```
node_modules/
!node_modules/patched/index.js     # does nothing at all
```

The explanation people reach for is that the first line beat the second on
precedence. It did not. **Git does not evaluate patterns against every file in
the repository** — it walks the tree, and when a *directory* is excluded it
never descends into it. The negation naming the file inside is therefore never
reached. It did not lose; it was never considered.

That distinction is load-bearing rather than pedantic, because it is what makes
`node_modules/*` behave differently from `node_modules/`: excluding the
contents leaves the directory itself includable, so git still looks inside and
the negation gets a turn.

The best wrong-case in the file is built on exactly that: an implementation
with **perfect precedence and no ancestor walk**. Getting the precedence rules
right does not produce this behaviour, which is the point.

#### Three more, each one character apart from its opposite

- A **bare name matches at any depth**. `.env` is not "the `.env` in the root";
  it matches `api/.env` as well.
- A **slash anywhere anchors to the root**. So adding one to be "more specific"
  silently converts the rule from *anywhere* to *exactly here* — the opposite
  of the previous rule, reached by typing one character.
- A **trailing slash is directories only**, and leaves a file of the same name
  tracked.

#### A real defect in the lesson's own .gitignore

It listed `.env` and `.env.local`: the two files that exist on the machine
today. `.env.production` matches neither, so it gets committed — silently,
because git only warns about files it is already tracking. Under ADR-0007 that
file holds `TOKEN_CODE_PEPPER` and `TOKEN_CODE_KEY`.

Replaced with `.env.*` plus `!.env.example`, and added the signing-key patterns
(`*.keystore`, `*.jks`, `*.p8`, `*.p12`, `*.mobileprovision`) — an Android
keystore is the one secret that cannot be rotated for an app that is already
published, so committing it is the mistake with no remedy at all.

The general form: **ignore the shape of the name, not the names you happen to
have.** A rule written from today's directory listing goes out of date without
saying so.

#### Why these are hard to find at all

The direction of failure decides it. A `.gitignore` bug that ignores **too
much** is loud — the file is missing from the repo and somebody notices within
the hour. A bug that ignores **too little** is silent, and the thing it commits
is the thing you were trying to keep out. Six of the ten wrong-cases fail that
way, and the two loud ones are the two that would be caught by ordinary use.

#### Two bugs that hide each other

An unescaped `.` in the compiled glob and a regex without `^`/`$` anchors are
independent mistakes, and **a fixture exercising one will pass an
implementation that has the other**: `^.env$` tested against `aenv.bak` comes
back false purely because of the anchors, so the unescaped dot goes unnoticed.

A wrong-case tripped the wrong check and exposed it. Each now has its own
fixture — `aenv` for the escaping, `latest.txt` against `test` for the
anchoring. Eighth time a wrong-case has found a gap in the self-check beside
it.

**Result: 91 verified, 10 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — x1/0002, and a detector's two ways of being useless

Second of the X1 trio. M3: `findConflicts` — 14 self-checks, 8 wrong-cases,
2 new executable quiz questions.

#### The defect

The conflict-resolution recipe ended `git add .` followed by a commit. **Git
will stage and commit a file that still contains `<<<<<<<` without a word** —
conflict markers stop being special to git the moment the merge is over; after
that they are just text somebody left in a file. The good outcome is a syntax
error in CI. The bad one is a marker inside a string, a Markdown file or a
config file, where nothing fails and the text is simply wrong in production.

The recipe now runs `git diff --check` — git's own answer, free — and adds
files by name, which forces "which files did I actually resolve?" to be a
question with an answer.

#### Both directions, for once

Almost every wrong-case written in this course so far fails in a single
direction. A detector has two, and this exercise is built on the tension:

- **Too eager.** The obvious implementation searches each line for
  `=======`. The new quiz question runs exactly that over eight lines of
  ordinary Markdown — a setext heading underline, an ASCII table border, a
  comment banner — and reports **three false positives and zero conflicts**.
  A check like that gets switched off within a week, and then the real
  conflict goes unread. This repository has the scar already:
  `check-pre-blocks.mjs` fired 71 times on its first run and every hit was
  wrong.
- **Too quiet.** Missing the diff3 `|||||||` base section (newer git defaults
  to `zdiff3`, which writes one), missing every marker behind a trailing
  `\r`, or dropping a conflict left open at the end of the file.

**The resolution is not a cleverer test for the divider.** It is that only
`<<<<<<<` opens a conflict — a divider or a closer with nothing open is
ordinary text. One rule, and every false positive above stops existing,
because a Markdown underline has no opener in front of it. *A conflict is a
sequence, not a symbol.*

#### Two fixtures that proved nothing until a wrong-case sharpened them

Both were found the same way — a mistake tripping a check other than the one
it was written for:

- **The CRLF fixture used labelled markers.** `<<<<<<< HEAD\r` still has a
  space at index 7, so it survives the stray carriage return *by luck*, and an
  implementation that never strips anything passed the test written to catch
  it. Only the bare form — where index 7 **is** the `\r` — separates them.
- **The embedded-marker fixture had no embedded opener.** It contained a
  `=======` and a `>>>>>>>` inside lines, and since neither of those can open
  a conflict, the `includes`-based mistake sailed through.

Both are the same underlying error on my part: writing a fixture that
*contains* the dangerous ingredient without putting it where it can do
anything.

#### The self-check caught one of my own "correct" alternatives

The reduce-based alternative **never reported a conflict left open at EOF**.
Reduce has no natural place for an after-the-loop step, so the first draft
simply omitted it, and the self-check failed it — correctly.

That is the mechanism running in the other direction and is worth recording as
such. The `alternatives` exist to prove the self-check accepts different
*styles* rather than one shape; this time the self-check proved that one of the
styles was not a correct implementation. Both roles are useful, and only
running them tells you which one you are getting.

**Result: 92 verified, 9 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — x1/0003 finishes X1, and two cases deleted on purpose

Last of the X1 trio. M3: `resolveAlias` — 15 self-checks, 8 wrong-cases, 2 new
executable quiz questions. **X1 is complete.**

All three X1 lessons carried the same excuse — *"the solution is git and shell
setup rather than runnable code"* — and all three turned out to contain an
algorithm with a **precedence order**. That is now nine lessons in a row where
the "not runnable" judgement was wrong, which is enough to stop treating it as
a judgement at all.

#### `paths` is a router, not a dictionary

An exact pattern beats every wildcard; among wildcards **the longest prefix
wins**; and the order the patterns are written in is irrelevant. It reads like
a lookup table and behaves like longest-prefix routing.

The reason it matters here rather than being trivia: **in a monorepo the wrong
answer is usually a file that exists.** Resolve `@token/shared/types` through
the broad pattern instead of the specific one and you do not get "cannot find
module" — you get a type error about a symbol you have never heard of, in a
file you did not mean to open.

#### The config defect

`api/tsconfig.json` had `"rootDir": "./src"` alongside `"outDir": "./dist"`,
which is the tidy, explicit-looking thing to write. It stops the build the
first time anything imports from `shared/`, with `TS6059`.

The point worth carrying: **the alias is not a trick that copies the file in.**
It resolves to a real path outside `api/`, so `shared/types.ts` becomes an
input to the api build — and `rootDir` is a promise that every input lives
under one directory. The two cannot both be true while `shared/` is consumed as
source. Removing `rootDir` is the fix; TypeScript infers the common ancestor,
the output nests one level deeper, and that is a Dockerfile path change.

#### Three mistakes passed everything, and the fixture was the cause

The first draft's two precedence fixtures used `"@token/*": ["./*"]` against
`"@token/shared/*": ["./shared/*"]`. Both resolve `@token/shared/types` to
**the same string**, so first-match, last-match and longest-prefix were
indistinguishable and three separate wrong-cases sailed through.

`CLAUDE.md` already states the rule that was broken — *choose fixture values
that differ from what a wrong answer would produce* — and this is a clean
instance of it: the fixture was realistic, readable, and proved nothing.

Two others failed for the same family of reason. The length-guard fixture
failed the `startsWith` test first, so the guard it existed to exercise was
never reached; and the longest-prefix-versus-longest-pattern case used two
patterns where both metrics agree.

#### Two wrong-cases written, then deleted, with the reasons kept

Both are limits on what the exercise can honestly test, and both are recorded
in the case file rather than quietly dropped:

- **`>=` instead of `>` on prefix length.** It differs from the correct answer
  *only* when two prefixes are the same length, and what TypeScript does on
  that tie is not something this lesson is confident enough to teach. **A
  wrong-case has to encode a rule you are sure of**, so it went rather than
  being guessed at.
- **The two-star guard.** With a prefix/suffix split, a key like `@token/*/*`
  leaves a literal `*` in the suffix, which no ordinary specifier can match —
  so the guard is unreachable. It stays in the solution as belt-and-braces,
  but the self-check cannot observe it. **A rule you cannot test is worth
  knowing you cannot test**, and writing that down is better than leaving a
  case that appears to cover it.

**Result: 93 verified, 8 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — b9/0001, and correcting myself an hour later

First of the B9 trio. M3: `planShutdown` — 15 self-checks, 7 wrong-cases. The
lesson already had a layer-caching playground and three executable questions,
so the M3 went where the real defect was.

#### A sequence with no total is not a plan

The graceful-shutdown handler was genuinely well argued — fail readiness
first, notify WebSocket clients with a 1012 close, drain, then close
dependencies in the order that cannot strand work. Read it as a stopwatch
rather than a list, though, and it has no budget. Docker sends `SIGKILL` ten
seconds after `SIGTERM`, and `SIGKILL` cannot be caught.

`server.close()` waits for every open connection, and **an idle keep-alive
socket counts as open** — a browser that made one request and is holding the
connection for its next keeps the server "busy" indefinitely. So the drain step
can wait for ever, `pool.end()` and `redis.quit()` are still queued behind it
when the ten seconds elapse, and **the handler written to prevent an ungraceful
exit produces exactly one** — with the added insult of taking the full ten
seconds first.

The symptom is a deploy that consistently takes a fraction over ten seconds.
Nobody reads a deploy timing as a bug report.

Fixed with `closeIdleConnections()` — hurry the idle ones along — plus a race
against a hard ceiling, and the ceiling comes from `planShutdown`.

#### Which phase may be cut is a design decision, not an average

The exercise is the allocation, and the interesting part is that the phases are
not equal:

- **Readiness is fully compressible.** It exists so the proxy takes you out of
  rotation before you start refusing things. Cut it and some in-flight requests
  fail — bad, not corrupting.
- **Closing the pool and Redis is not compressible.** That is the step that
  stops work being stranded, and it is the whole reason for a graceful shutdown
  in the first place, so it gets its budget first.
- **Leftover time belongs to the drain.** One wrong-case sends it to the
  readiness wait instead: the plan still fits, still exits cleanly, and spends
  six and a half seconds standing still while real requests get the minimum.

#### And a correction to x1/0003, written an hour earlier in this session

`x1/0003` told the reader to **remove** `rootDir` to fix `TS6059`. That works,
and it is the weaker of the two fixes. Deleting the option makes TypeScript
*infer* the root as the common ancestor of whatever files happen to be inputs —
which means:

- adding an import from `shared/` to a project that had none **moves every
  output file**, and
- the same calculation runs again inside Docker against a different layout, so
  **the same source produces a different output path depending on where it was
  built**.

`b9/0001`'s `CMD ["node", "dist/server.js"]` is the proof. In the repo the
inferred root is the repo root; in the container, where `api/` is copied to
`/app` and `shared/` beside it, the root is `/app`. Both lessons now use
`"rootDir": ".."` — explicit and deterministic — and the `CMD` reads
`dist/api/src/server.js`, with a callout on each side saying why.

**The rule: an inferred value feeding a hard-coded path is a coincidence
waiting to be noticed.**

Worth recording how it surfaced. Not by re-reading `x1/0003`, and not by any
check — by the next lesson's Dockerfile disagreeing with it. That is the
sibling-lesson pattern that found `a7/0003`'s ternary, except the sibling this
time was my own work from an hour before. **When a lesson changes a decision,
grep the modules downstream of it in the same session.**

**Result: 94 verified, 7 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-24 (continued) — b9/0002, and a readiness flag nobody read

Second of the B9 trio. M3: `checkEnv` — 17 self-checks, 8 wrong-cases.

#### The downstream-grep rule paid for itself immediately

Yesterday's `rootDir` correction ended with a new standing rule: when a lesson
changes a decision, grep the modules downstream of it in the same session.
Running it found three leftover `dist/server.js` references — two in `b9/0001`
itself, one in `b3/0001`'s package.json `start` script. `b3/0001` was
re-verified after the edit.

#### Present is not usable

The lesson states that a container booting with a bad secret *"turns a
configuration mistake into an incident"*, and then implements
`REQUIRED.filter((k) => !process.env[k])` — is it set?

That catches the variable you forgot and misses the one you got wrong, and
**the one you got wrong is the likelier mistake**, because you had to be
thinking about a variable to set it at all.

The specific path is worth writing down because it is so easy to walk. The
pepper is 64 hex characters and the key is base64. Both are "32 random bytes".
Both come from a one-line `crypto.randomBytes(32)` command, and the two
commands differ only in the encoding at the end. Paste the hex one into
`TOKEN_CODE_KEY` and you have **48 bytes of perfectly valid base64** — present,
non-empty, check passes, container starts, health check green, deploy declared
a success. Then `createCipheriv` throws on the first token anybody creates.

Which is exactly the incident the paragraph promised to prevent, reached
*through* the check.

#### ADR-0007's logging rule generalises to config diagnostics

The obvious helpful message is *"TOKEN_CODE_KEY must decode to 32 bytes, got 48
(aG0xN…)"*. That prints a production secret into a deploy log — read by more
people than the database is, kept longer than anybody intends, and shipped to
whatever collects build output.

**A diagnostic about a secret may name the variable and describe the fault, and
must never quote the value.** "expected 32 bytes, got 48" is entirely
sufficient to fix it. One wrong-case does nothing but add the value to the
message, and it is the one most likely to be written by somebody trying to be
helpful.

#### b9/0001's most careful step was a no-op

`b9/0001` opens its shutdown handler with *"fail readiness first, so the proxy
stops sending new requests BEFORE we start refusing them"*, calls
`setNotReady()`, and waits two seconds for the proxy to notice.

`b9/0002`'s `/health` endpoint never read that flag.

So the proxy noticed nothing, kept routing traffic for the whole two seconds,
and kept routing it while the database pool was closing. Neither file is wrong
read on its own — one sets a flag, the other answers a question, and they never
agreed that it was the same flag. **The most carefully reasoned step in the
sequence was a two-second pause that achieved nothing.**

That is the fourth defect this session that exists only *between* two lessons,
after `a8/0004`'s `localId`, `a7/0003`'s missing `call:media`, and `a7/0004`'s
unsent `call:accept`. The pattern is stable enough to state as a rule: **when
two lessons implement two halves of one mechanism, read them together or the
mechanism is untested.**

#### Two self-check holes, both unreachable code

- The **break-at-first-fault** mistake passed everything, because I put the
  break at the bottom of the loop and every branch `continue`s before reaching
  it. The mistake was real; the code expressing it was dead.
- My **"not a URL" fixture was a valid URL.** `new URL("pgbouncer:6432/token")`
  parses without complaint — `pgbouncer:` is a legal scheme — so the fixture
  written to exercise the throwing path never reached it.

Both are the same shape as the fixture problems in `x1/0003`: the test looked
right, ran green, and exercised nothing.

**Result: 95 verified, 6 `unverifiable`.** Audit green, six suites pass.

---

### Session of 2026-08-25 — the `unverifiable` cluster is closed, and so is `known-issues.json`

Six lessons: `b9/0003`, `b1/0003`, `a9/0001`, `b8/0001`, `b6/0001`, `b6/0002`.
Four modules finished — B9, B1, A9, B8 — and then B6, which was the last of it.

Two things ended today that had been open for weeks. **Every lesson in the
course now executes something and passes its own self-check**, so the
`unverifiable` flag covers nothing; and **`known-issues.json` holds no
entries**, so nothing is gated, deferred or carried. Run `node
scripts/audit.mjs` for the state — per the rule at the top of this file, the
numbers are not repeated here.

> **The previous entry broke that rule and it is worth naming.** It ended
> *"Result: 95 verified, 6 `unverifiable`."* That is exactly the kind of
> sentence this file removed sections for on 2026-08-16. It was true when
> written and false within a day. **Point at `PROGRESS.md`; do not quote it.**

#### What the pass actually settled

The cluster began on 2026-08-23 with 17 excused lessons and five more that had
never been executed at all. It ends with none, and the result worth carrying
forward is blunt: **the reflex to call a lesson unrunnable was wrong 22 times
out of 22.**

Every single one — an Express route, a React Native screen, a Dockerfile, a
`.gitignore`, a coturn config, a set of `CREATE INDEX` statements — turned out
to contain a plain function with a precedence order, a three-state problem, or
an exactly-once problem inside it. Not one lesson resisted. The flag is still
there and the next lesson written may earn one honestly; what was unreliable
was the *reflex*, not the mechanism.

#### The finding that repeated in five of six lessons

The exercise was always predictable from the topic. **The defect never was —
it lived between two lessons, not inside one.**

- `b9/0003`: the backup retention was enforced in one directory. `rclone copy`
  and `rsync -az` never delete at the destination, so every dump the nightly
  prune destroyed was still off-site, permanently — against a sentence
  `b10/0002` publishes to users.
- `b1/0003`: the redemption transaction counted *after* it inserted, so a token
  with `max_uses = 0` got exactly one use and then marked itself exhausted.
  `b7/0001` gets the order right; the two were never read together.
- `a9/0001`: `a9/0002`'s exercise text has said for months that *"the lesson
  above got this wrong"* — and the lesson above still had the bug. **A sibling
  can be right about a defect nobody fixed, and the confident past tense is
  what stops anyone checking.**
- `b8/0001`: `notifyNewMessage` took a `preview` the server cannot produce,
  because `b2/0002` stores ciphertext and holds no key. The callout directly
  beneath it warns against putting a token *code* in a payload.
- `b6/0001`: the `calls` table had been an audit orphan for weeks, which reads
  as *somebody forgot the migration*. It was the reverse — **the readers
  existed and the writer never did**, so `contact_limit`'s call cap counted an
  empty table and permitted unlimited calls.

The habit that found all five is the same one: **predict the exercise from the
topic, then find the defect by reading the siblings.** It is now the standing
instruction in `SESSION.md`'s *Next action*.

#### The decision that cost the most to get wrong

`b6/0002` offered relay-only ICE as *"a user-configurable option. Default to
normal ICE (best quality), let privacy-conscious users enable relay-only
mode."* `CLAUDE.md` says the opposite, in bold, and has for months.

What settles it is not a preference about privacy. **It is that the person who
bears the cost is not the person who chooses.** A token holder is a delivery
company or a shop; if either side gathers a host or `srflx` candidate, the
exchange hands the *issuer's* home IP to *them* — and the issuer is the person
who went to the trouble of not giving out their phone number. It is also not a
choice anyone can evaluate: "better call quality" is legible, "the courier
learns roughly where you live" is not, and it is invisible when it happens.

**Then it propagated.** The same wrong default produced *"only ~15% of calls
use TURN"* in the bandwidth section, sized a 1TB VPS against that, and missed
the second multiplier as well — relayed traffic crosses the server twice, in
from one peer and out to the other. The corrected figure is roughly 2,200
hours of 480p video on 1TB, and under 750 at 720p.

**A default nobody notices does not stay a default. It reaches the capacity
plan, and that is where it finally surfaces, as a bill.**

Three lines above it, the lesson listed *"no third-party dependency"* as the
first reason to self-host TURN — and the `iceServers` array contained Google's
public STUN server, commented *"free STUN fallback"*. It was free of money, and
what it spent was the thing the product sells. Under relay-only it also does
nothing at all, since STUN exists to produce the very candidate being
discarded: pure disclosure, zero function.

#### The self-checks failed in one way, over and over

Nine fixtures across the six lessons could not express the rule they were
written for, and every one was caught the same way — by a wrong-case tripping a
different check than it named. Two are worth stating as rules:

- **A mutation check needs input that is visibly out of order.** `b9/0003` and
  `b6/0001` both used an already-sorted list, so an implementation that sorts
  the caller's array in place changed nothing and passed. Twice in one session,
  hours apart.
- **A check must assert what it is about, and nothing else.** `b6/0001`'s
  "first ending wins" also asserted the exact reason string, so two mistakes
  about *naming* the reason tripped it before reaching their own checks. The
  a7/0004 lesson — one check doing two jobs reports the wrong one — recurred.

And for the third time, **a wrong-case turned out not to be a mistake at all.**
`list.find(...) || {}` is harmless once the guards exist: an empty object has
no `initiatedBy` and is refused a line later. It passed everything by being
correct, exactly as `b1/0004`'s `hasOwnProperty` and `a9/0002`'s `O`→`0` did.
**A case that passes everything is either a hole in the self-check or not a
mistake, and the only way to tell is to look.**

`b8/0001` produced the sharpest version of the same lesson in the other
direction: the allow-list check was asserting the *absence* of `code`, which a
spread-with-one-delete passes while shipping every other field. **Asserting the
absence of one dangerous thing is deny-list thinking inside the check written
to prevent it.** It now asserts the exact key set.

#### Two things I got wrong

**The audit caught me committing the defect I had just fixed.** An hour after
correcting `getUnreadCount` for reading a column `b2/0002` does not create, my
own receipt reconciler queried a `push_receipts` table nothing created. It
failed the build as an ERROR, not a warning, which is the entire argument for
keeping the audit green rather than living with known noise: a red exit code
that means something turned a latent defect into a two-minute fix.

**I walked into the backtick trap twice**, both times writing `` `code` `` as
markup inside a comment in a template literal, which terminates the string and
reports an error ninety lines away. `CLAUDE.md` documents it; I have quoted the
documentation in two previous sessions. The habit that causes it — marking up
an identifier in prose — is the correct habit everywhere else, which is why
writing it down does not stop it.

#### Decisions recorded with their costs

Three, all now in `CLAUDE.md` where they can be overturned on evidence:

- **A floor under backup retention that knowingly keeps personal data past a
  published promise**, and reports it as a breach rather than hiding it.
  Rejected: silently deleting your last good backup to stay compliant is a
  data-loss incident chosen on purpose. `minVerified: 0` reverses it.
- **`token_id` denormalised onto `calls`, made safe by a composite foreign
  key** so the copies cannot disagree. Cost: a unique index on `conversations`
  that is redundant for lookups and exists only as a foreign-key target.
  Rejected: storing `conversation_id` alone and joining, which is simpler and
  puts a join on an authorisation path.
- **TURN credentials at a one-hour TTL rather than twenty-four**, matched to
  `b6/0001`'s Redis call TTL so there is one number to reason about.

#### What is left

`SESSION.md`'s *Next action* now has one real item on it: **the C-modules —
C0–C4 and C6–C9, roughly 34 lessons, none written.** C0 is architecture and was
planned to come before B1, so it is already out of sequence. That is a writing
job, not a retrofit, and it is the first time in months that the next thing to
do is *new material* rather than repair.

---

### Session of 2026-08-25 (continued) — the course went public, and the page nobody checked was the one asserting progress

Two things happened after the docs pass: the repo was pushed, and the page it
publishes turned out to be wrong in the one way this project has repeatedly
promised itself it would not be.

#### The push

214 commits, sitting unpushed. The repo is public and served by GitHub Pages
from `main`, so pushing *is* publishing — there is no staging step between the
two. Pre-flight checks before a push that size: remote correct, `token/` not
tracked by the outer repo (it is genuinely a separate repo, as `CLAUDE.md`
says), no `.env`/`.pem`/`.key`/keystore files tracked, and no real credential
patterns in any tracked content. All clean. Pages rebuilt and the new content
is live; all five links on the landing page return 200.

#### What was actually wrong with the landing page

The reported symptom was *"this page doesn't point to the index html in JS
Learn"*. That turned out to be false — the link existed and worked, verified by
fetching both the landing page and the course home. **The real problem was
three layers deeper and the report was pointing at the right page for the wrong
reason.**

`git-learn/index.html` still described the pre-pivot project: *"9 modules ·
Build a WhatsApp Clone from scratch"*. Seven of its nine module cards linked to
modules deleted on 2026-08-16 and 2026-08-22, so they 404'd on the live site —
only 01 and 02 resolved. The working "Open Full Course" link was a small grey
text link in the corner, easy to miss among nine large broken cards.

And every one of those nine cards hardcoded **a 100%-width progress bar and the
word "Complete"** — including on the seven modules that no longer exist.

> **That is the failure this whole project is organised against, in the only
> public copy.** `CLAUDE.md` opens with it: never infer student progress from
> the files, written is not studied, that inference is what let "Modules 1 and
> 2 complete" survive for months against a student on lesson 2. The prose rule
> was written, the `teach` skill's notes had the claim removed from them, and
> the *published web page* kept asserting it the entire time.

#### Why it survived, which is the transferable part

**`git-learn/index.html` is one directory above the course, and nothing checks
it.** `audit.mjs` walks `modules/`; `verify-lesson.mjs` takes a lesson path.
Neither has any reach into the parent folder. So the page could contradict the
course indefinitely without a single check going red — and it did, for over two
months, through a pivot that deleted forty lessons.

Every green audit in that period was honest about what it measured and silent
about what it did not. **A check's blind spot is not visible from inside the
check**, and the blind spot here was one `../` away.

Recorded in `CLAUDE.md` under *Running / viewing lessons*, because the fix is
not more tooling — it is knowing that the file exists and is uncovered.

#### The fix

Replaced the nine per-module cards with five that do not rot: course home,
Track A, Track B, cross-cutting, cheatsheet. **Deliberately no module list and
no lesson counts** — the course index is the maintained map, and duplicating it
on the landing page is exactly what let this drift unnoticed. Same one-fact-one-home
rule the rest of the project runs on. All nine progress claims removed rather
than corrected: a static page cannot know, so it should say nothing.

#### A smaller thing worth knowing: JSON has no comments

The push was blocked by `Bash(git push *)` in the `deny` list of
`.claude/settings.local.json`. It had already been commented out — with `//`,
which is not valid JSON. The file therefore failed to parse and the last good
version, deny rule intact, stayed in force. **A malformed config does not
announce itself; it silently keeps the previous answer.** Removing the line
properly fixed it.

Also spotted and left alone, because it is a deliberate-looking choice that is
not mine to change: the `PermissionRequest` hook ends in `exit 1`, and a
non-zero exit there denies the request. If the intent was only to play a
notification sound, that hook is silently refusing prompts rather than showing
them.

---

### Session of 2026-08-26 — the founder track, and a module that opts out of the invariants

The student handed over `token-nontech-taskboard.md` — sixteen numbered sections
of everything required to publish and operate Token that is not engineering —
and asked for it turned into lessons under Phase 7, with examples, **without
quizzes**, in one pass, without stopping to ask.

`modules/f1-founder-track/`: a README and sixteen lessons, one per section of
the board. DPDP and the RoPA · intermediary law · IP and brand · Google Play ·
Apple · trust & safety · positioning and GTM · support · vendors and DPAs ·
release and QA · the compliance calendar · SMS DLT and CERT-In · age, consumers
and dark patterns · the holder-side notice · opsec and brand defence · payments
and tax (parked).

#### Why "no quiz" is right here, and why it still needed a check

Every other module in this course teaches something a computer can check: does
this code run, does this key match, does this self-check pass. **Nothing in F1
is like that.** The deliverable of each lesson is a document, a decision or a
registration, and there is no multiple-choice question that can tell you whether
a Record of Processing Activities matches the real schema.

So the quiz was the wrong instrument, not a corner being cut. But dropping it
removes *every* automatic check the rest of the course has, and "this module is
exempt" is one short step from "this module is not checked at all" — which is
the same shape as the `unverifiable` cluster, and the same shape as
`git-learn/index.html` sitting outside the tooling for two months.

**So one thing was made compulsory instead: the `createExplain` prompt, enforced
by the audit as an error.** It is the assessment. The deliverable is a document
and that box is where it gets written, so a page carrying the exemption and no
prompt is prose nobody is asked to act on.

#### The audit change, and the two options rejected

`isFounder`, sitting beside `isLegacy`. F1 is **counted separately** rather than
folded in or excluded, and both alternatives were tried:

- **Folding it into `track`** printed `Verified 101/117` and `Deepened 16/117`.
  Sixteen quiz-less lessons had just manufactured a regression that did not
  happen, in `PROGRESS.md` — the one file whose entire purpose is to be measured
  rather than asserted. *That* is the failure this project keeps having: a true
  number in a misleading denominator.
- **Excluding it the way legacy is excluded** would have put sixteen published
  pages outside every check. The precedent against it was written last session:
  the landing page one directory up spent two months describing a deleted course
  because nothing walked that far.

What F1 keeps: link checking, inline-script parsing, the `<pre>` block scan, the
token-code and alphabet scans, and a mandatory `search-index.json` entry. What
it does not join: prose averages, playground and exercise counts, deepening, and
the Verified fraction. All sixteen are `nothing-to-verify` in the log, which is
the honest reading — `verify-lesson.mjs` ran over each and found nothing to run.

#### The contradiction that was flagged rather than resolved

The task board's vendor list names **LiveKit** and **AWS Mumbai**. `CLAUDE.md`
specifies self-hosted coturn on a Coolify VPS, and puts third-party
communications SDKs explicitly out of scope. Those cannot both be true, and the
difference is not cosmetic: a managed call service is a processor with media
passing through it, which changes the DPA list, the residency answers, the store
declarations and the cost model.

It is an architecture decision and it is not mine. So `0009` is written against
**roles** — "whoever relays your calls" — rather than brand names, so it stays
correct either way, and both it and the README say plainly that the technical
founder must settle it before a single DPA is signed.

Two related things were kept honest while writing it. If the relay stays
self-hosted it is **not a vendor**, but it is a large line item, because every
call is relayed and each crosses the server twice — the arithmetic corrected in
`b6/0002` last session, now carried into the founder-facing budget. And the
holder-side lesson states that **no network address from a call may be stored**,
because relay-only exists so neither party learns the other's, and persisting
one defeats the policy from the far side in a table nobody thinks of as
sensitive.

#### What the material surfaced about the product

Writing the compliance side out end to end put a few things in sharper relief
than the technical lessons do:

- **The critical path of the entire launch is non-technical.** SMS DLT
  registration gates OTP login, which gates the closed test, which gates twelve
  testers for fourteen continuous days, which gates Play production access. Not
  one link in that chain is code.
- **The RoPA is upstream of four deliverables** — privacy policy, Play Data
  Safety, Apple labels, retention policy — and the retention policy is upstream
  of the web deletion page Play requires. One table, five documents.
- **"Token does not collect your phone number" is false and is in a compliance
  document.** `CLAUDE.md` already had this; F1/0001 makes it the first callout,
  because a founder writing marketing copy is exactly who is about to say it.
- **The holder is a Data Principal with no account**, which the whole of `0014`
  exists for: their own privacy notice, their own contact path, their own rights,
  and a support process built for someone you cannot look up.
- **The 24-hour report SLA is a staffing promise a two-person company cannot
  keep by intention.** `0005` and `0006` land on the same answer — an automatic
  interim suspension on the most serious report categories — and state its cost
  plainly, that a malicious reporter can silence someone for a few hours. That
  is smaller than a serious report sitting unread overnight, and it is a real
  harm chosen on purpose rather than an oversight.

#### Wiring

`index.html` Phase 7 gains an F1 row and a callout saying the placement is
misleading — six of its items are waiting on other people and start on day one.
`a11/0005`'s nav now continues into F1 instead of dead-ending at Course Home.
Sixteen `search-index.json` entries. `TOKEN-TRACK.md` gains an F1 row, an F1
section with the two critical-path chains drawn out, and a note on where F1 and
the unwritten C9 touch — F1 states the obligation, C9 builds the mechanism.

Audit green, 2 warnings (both pre-existing and both known), six suites pass.

---

### Session of 2026-08-27 — sixteen decisions, and the two that were right to defer

The student asked to be asked. Every open decision in the founder track was put
to them with options and costs, in four batches, and all sixteen came back.

The register is in the F1 README as **pointers only** — each decision lives in
the lesson that owns it, with the rejected alternative and what would reverse
it. Four are product rules that constrain other lessons and those are repeated
in `CLAUDE.md` and nowhere else.

#### The contradiction closed the way it should have

**Self-hosted coturn on a Coolify VPS. No media vendor.** The task board's
LiveKit/AWS line was the stale document, not `CLAUDE.md`. Writing `0009` against
roles rather than brand names turned out to be the right call for a reason
beyond hedging: when the answer came back, the lesson needed a decision box and
two cost paragraphs, not a rewrite.

The two costs are now stated where a founder will meet them: relay bandwidth
sized on **100% of calls, doubled** — the `b6/0002` arithmetic, carried into a
budget conversation — and a coturn outage being a *total* call outage rather
than a degraded one. That second one produced a distinction worth keeping: the
SMS aggregator gets a **redundancy** answer, because a competing supplier exists
and registering one takes weeks you will not have in an outage; the relay gets a
**recovery** answer only, because you run it and there is nobody to fail over
to.

#### Keeping the name moved work, it did not remove it

**The name stays "Token."** That is the decision with the longest tail in this
set, and the tail is not the trademark.

Of the three independent causes of the queue-management misreading — the name,
the first screen, the absent premise — one has now been taken off the table. So
`0007`'s first screen has to beat an *actively misleading* word rather than an
absent one, which is a harder job than the lesson was originally written for. It
now says so, in a callout at the top of §1.

And `0015`'s brand defence changes character. Defensive domains, certificate
transparency monitoring and teaching users the exact genuine URL were prudent;
without a registration behind them they are **what you have instead of one**. A
cloned redemption page is the predictable attack on this design and the only
thing a holder can check is the address bar.

`0003` records three reversal conditions rather than treating the decision as
final: a conflicting registered mark surfacing, a clone you cannot get taken
down, or testers still being unable to say what the app is after two weeks. The
third is the one the closed test can actually produce.

#### The two deferrals were right, and a deferral without a gate is just drift

**Replacement versus supplement** went to the closed test, and **all four
use-case segments** were kept in scope. Both are defensible — twelve people
using the product beat an argument — and both had the same problem: the store
listing copy has to be written *before* the test finishes, and five screenshots
cannot lead with four segments.

So `0007` now carries what the deferral needs to survive contact:

- **What to write in the meantime** — the copy that is true under either answer,
  which is the problem statement. And what must *not* be written: anything
  implying frequency or habit, because that is the replacement answer smuggled
  in as a phrase and it will be quoted back.
- **A signals table** for the fourteen days — tokens issued per tester, what
  they issued them *for*, whether they carried on giving out their number in
  parallel, which screen they returned to, and the unprompted language in their
  feedback. Plus the direct day-14 question: *how many times did you give
  someone your actual phone number?*
- **A deadline**: decided before applying for production access. And the tiebreak
  — if fourteen days do not separate the two, that *is* the supplement answer,
  because a replacement would have been obvious.

Same treatment for the segments: a table of what leading with each one buys and
costs, and the observation that the twelve testers can pick frame 1 for free.

#### One question I could not answer and did not pretend to

**What a block attaches to** for a holder with no account went back to the
technical founder. `0006` states the behaviour and the six-step test script —
including the different-browser step that finds the shallow implementation — and
explicitly not the mechanism, with the two candidate shapes and their costs.
**Both stores audit the behaviour; neither audits the mechanism.** That is the
sentence that makes the split legitimate rather than evasive.

#### A coupling nobody asked about, found by writing the boxes

**The child-tracking prohibition is satisfied by the analytics decision.** DPDP
bans behavioural tracking of children outright; the minimum age is 18 but you
cannot verify it and must not profile users to guess. Self-hosted event counts
with no per-user timelines have nothing behavioural in them, so `0013`'s hardest
technical requirement is met by a decision taken in `0007` for an entirely
different reason.

The consequence is the useful part and it is now written in both lessons: **a
future growth experiment that adds behavioural analytics reopens the age
decision, not just the analytics one.** That is exactly the kind of link that is
invisible from inside either lesson — the same class as the cross-lesson
contradictions M3 kept finding.

#### And one that made the denial oracle stronger by accident

Account deletion tells the holder nothing — the page dies with the same message
a revoked, expired, exhausted or never-existed code produces. The reason given
for the choice was disclosure: telling a holder "the account was closed" leaks a
fact about someone who has just exercised an erasure right.

But the *stronger* reason turned up while writing it down. One response for
every dead code is what stops the page telling an enumerator which codes are
real. A deleted account producing a **different** message would have punched a
hole in that defence, in the branch least likely to ever be tested. Both lessons
now say so.

`0008` and `0010` were updated to match the revoke and deletion decisions — the
help article now states what revoke does *not* do, the holder-facing article
explains why it cannot tell them which case they are in, and the QA checklist
gained three checks: that revoke keeps history *and* kills the holder's page,
that post-deletion the message is identical, and that the terms line above the
Connect button has not drifted below it or gone grey in a redesign. That last
one is a silent downgrade to browsewrap and nothing else would catch it.

Audit green, 2 pre-existing warnings, six suites pass.

---

### Session of 2026-08-27/28 — Phase 3 starts, and the decisions get their arguments back

The student asked whether to start Phase 3. The useful part of answering was
noticing that **the premise was wrong**: Phase 3 and the launch queue do not
compete. Wave 0 is almost entirely *their* work — registering with DLT,
creating store accounts, briefing counsel, asking sixteen people to test — a
day or two of their time and then weeks of other people's calendars. Phase 3 is
my hours and blocks nothing external. The two run in parallel, by different
people, so the only real question was what I did first.

#### The launch documents came first, because they are the only work that starts someone else's clock

`token/docs/launch/` — four drafts, reordered ahead of everything else on the
grounds that the ADRs cannot be sent to anybody and these can.

`counsel-brief.md` puts the seven questions in priority order, and the Hindi one
is first because it is the one most likely to change the launch plan. It also
asks counsel to review the *"we cannot produce message contents"* one-pager
**before** it is needed, rather than improvising it in front of an officer.

`ropa.md` is pre-filled from the schema as this course documents it, with every
row marked `CONFIRM` against the real migration files, and it carries the
backup-location checklist — because the seven-day promise is a claim about every
copy, and the commands that make off-site copies never delete at the far end.

`tester-pack.md` includes the two-party trick, which is the part that would
otherwise sink the closed test: a tester alone has nobody to redeem their token,
so twelve people conclude the app does nothing. Its debrief questions include
the two that settle replacement-versus-supplement, since collecting them costs
nothing extra.

`dlt-registration.md` recommends `TOKNAP` as the sender header so the OTP and
the redemption domain carry the same string — a free reinforcement of the
"verify the link by its domain" advice in F1/0015 — and specifies **identical
template wording** for the standby provider so failover needs no fresh approval.

#### ADR-0009 to 0015 — seven conclusions that had lost their arguments

Writing the founder track produced eighteen decisions, and seven of them were
*product* facts rather than course facts. Their reasoning existed only inside
lesson HTML, which is a conclusion sitting somewhere the product does not read.

Two are worth restating because the recorded reason is not the obvious one.

**ADR-0009, revocation keeps the user's history.** The deciding argument is not
about retention, it is about *when revocation happens*. The most common reason
to revoke in anger is harassment — and that is the worst possible moment to
destroy the user's own record on their behalf, irreversibly. Delete-on-revoke
performs a privacy gesture by shredding the evidence of the thing the user is
upset about. It also foreclosed the third option; B leaves a separate "delete
conversation" verb available, purely additive.

**ADR-0010, one response for every dead code.** The disclosure argument — that
telling a holder "the account was closed" leaks a fact about someone exercising
an erasure right — is true and is the weaker one. The stronger argument only
appeared while writing it down: **a deleted account returning a different
message would have holed the enumeration defence in the branch least likely ever
to be tested.** Nobody writes a test that deletes an account and then checks the
wording a stranger sees on an unrelated page. The four ordinary cases would have
stayed uniform for years while the fifth quietly leaked.

ADR-0012 pairs the 18+ minimum with event-only analytics in one record, because
each holds the other up: the ban on tracking children is discharged not by
knowing who they are — we must not profile to guess — but by there being nothing
behavioural in the system at all. **A future growth experiment adding per-user
timelines reopens the age decision, not just the analytics one.** That sentence
is the reason the two share a file.

#### C0 — the first new course material since the pivot

Two lessons, and the choice of C0 needed no guess about where the student is:
it is first in the Phase 3 sequence, and it is the only one of the nine with a
repo to be written *against* — eight ADRs, `ARCHITECTURE.md`, and the Module 01
capstone. That is what "just-in-time, never batched" is supposed to mean.

`0001` is trust boundaries, and the idea that earns its place is drawing **the
log as a zone of its own.** Nobody designs a log; it accumulates, gets shipped
to an error tracker that attaches request bodies by default, and is grepped on
laptops long after the row it describes was deleted. Three lessons in this
course once taught writing a token code into a log line, each in a lesson about
something else.

The exercise, `crossBoundary(field, destination)`, is worth executing rather
than reading for three reasons: the answer is not a boolean (a message body may
reach the server, *sealed* — flattening that discards the only part the caller
needed); the same field has opposite answers by destination (a holder IP reaches
the server and is refused in the issuer's export, because "a row in my table"
and "my personal data" are different sets); and the two refusals must stay
distinguishable, because *unclassified* is a gap in the policy and
*not_permitted* is the policy working.

`0002` opens on a real failure from this project: a rule agreed in a chat
message, a lesson five months later that reasonably contradicted it, and a
capacity plan built on the contradiction. **The June author did nothing wrong.**
Given the argument, nobody writes that lesson; given the conclusion alone,
writing it is the sensible thing to do. That gap is what an ADR fills, and it is
a better motivation than any amount of process advocacy.

#### Four defects the wrong-cases caught, one of them conceptual and mine

- **I inverted the direction of supersession.** An alternative derived "in
  force" from the set of `supersededBy` *values* — but those are the records
  that **replaced** something, not the ones replaced, so it returned the oldest
  record in the chain. The same inversion had already reached a quiz question
  and a which-breaks variant. All three corrected, and the inversion is recorded
  in the cases file because it is easy to make.
- **A self-check that passed a mutating answer.** The "input is not mutated"
  check snapshotted the array *after* an earlier call had already sorted it in
  place, so sorting again changed nothing.
- **`alternatives` must be an object map**, name → source. An array of
  `{ label, impl }` stringifies to `[object Object]` and every alternative fails
  with a SyntaxError that reads as a broken verifier.
- **A throwing mistake tripped nothing**, because it aborted the whole
  self-check — the third time this project has hit that trap, and `CLAUDE.md`
  already warned about it. Both C0 lessons now wrap the vulnerable check alone.

Also: `check-pre-blocks` flagged a *narrative* block of mine, because it
contains the word `let` and therefore scans as JavaScript, and a quotation
wrapped across a line after a colon is exactly the damage signature. **The
prose was reworded rather than the check weakened.** And one explanation said
"the second one", which pins a question against shuffling; `render-as-authored`
is back to 0.

#### The landing page had the same bug again, one size smaller

Checked by hand before pushing, per the standing rule. The hero read **"9
Modules"** against 26 module folders — a literal sitting between two stats that
are computed live from the GitHub API, in the one file no check reaches.

Not corrected to 26. **Made computed**, so it cannot drift again: it counts
directories through the same API the other sections use, runs independently so a
rate limit on one section does not blank the other, and leaves an em dash on
failure. An em dash is honest; a stale number is not.

#### And `SESSION.md` was 4,486 lines

Its *In progress* and *Next action* sections held 4,080 lines of session log
between them. The cost was not untidiness — its *Blocked on* section spent three
days describing `c5/0004` as undesigned after `c5/0004` had shipped, because
nobody scrolled far enough to notice.

The narrative moved to `docs/archive/session-log-2026-08-17-to-25.md`, all 213
sections of it, and `SESSION.md` is now 208 lines answering the three questions
it exists for. `CLAUDE.md` gained the rule: **if it cannot answer "what is next"
on one screen, trim it.**

Audit green and six suites pass; the counts are in `PROGRESS.md`, which this
file does not restate. Course repo pushed; **the token repo has no remote and
never has**, which is now stated in `CLAUDE.md` and `SESSION.md` rather than
being a surprise.

---

### Session of 2026-08-28 — the maintenance tail, and the check that could not see the second half of its own rule

**W2 is closed.** Every self-check in the course now has `--wrong` cases:
`01/0001`–`0005` were written today, and the tail is empty.

#### The list was wrong, and the way it was wrong is the point

The queue said seven lessons. The real number was **five**. `a11/0002` and
`a8/0002` had had cases for days; nobody trimmed the note, so the backlog
described work that was finished — the same failure mode as *"Modules 1 and 2
complete"*, one size smaller, in the file that says what to do next.

It took one script to find out: walk `modules/` for a page containing
`Self-check`, look for `scripts/cases/<lesson>.mjs`, print the difference. That
is thirty seconds against a note that had been wrong for days, and it is the
general lesson this project keeps relearning — **a hand-maintained list of what
is left is a claim, and a claim is checkable.**

#### `01/0004` was passing a wrong answer, and had been since it was written

`checkAccess` has four rules in a fixed order. The self-check tested the
precedence pair *revoked beats paused* and stopped there — so this
implementation passed all six checks:

```js
if (token.revokedAt !== null)            return "revoked";
else if (token.timesUsed >= token.maxUses) return "limit reached";
else if (token.isPaused === true)          return "paused";
else                                       return "allowed";
```

Every single-state token comes out right. Only a token that is **paused *and*
at its limit** is wrong, and it reports "limit reached" — a state the user
cannot clear — hiding the Resume button that would actually fix it. That is the
`a5/0003` badge-precedence bug, met for the first time in lesson four of the
course, and the exercise's own text says *"the order matters"* while checking
one third of the order.

A seventh check was added: **paused BEATS the limit when both are true.** The
wrong-case then trips it, as it should.

Five self-checks in Phase 1.5 passed a wrong answer by coincidence and this is
another, so the pattern holds exactly: **the check tests the case its author was
thinking about, and the case they were not thinking about is the bug.** A
precedence rule with four positions has three adjacent pairs, and testing one of
them is not testing precedence.

#### What the new cases deliberately do not do

Two blind spots are documented in the case files rather than closed:

- `01/0001` cannot see `const timesUsed = 3` written directly — the exercise
  asks for a variable that *starts* at 0 and *changes*, which is a history, and
  only the end state reaches the check.
- `01/0002` cannot see `tags: ["delivery", "orders", "urgent"]` written in one
  go instead of pushed, or `summary` built with `+` instead of a template
  literal.

Both could be "fixed" by scanning the student's source for the characters
`let`, `.push(` or a backtick. That is testing resemblance, which is the thing
these files exist to prevent, and it would fail a student whose code is right.
**Left uncovered on purpose, and written down so the next person does not
mistake the gap for an oversight.** The `const`/`let` check in `0001` is the
counter-example worth keeping in view: it earns its place precisely because it
tests behaviour — it attempts the reassignment and sees whether the language
refuses.

Thirty-five mistakes and twenty alternatives across the five lessons. Audit
green, six suites pass, all 103 lessons still verified.
