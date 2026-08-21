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

### Watch out when editing this file from a shell

Backticks in a `python -c` string get evaluated by bash *before* Python sees
them. Rewriting §8 that way spliced ~2KB of `git help` output into the document.
Write the replacement text to a file with an editor tool, then splice it with a
script that reads that file — never inline prose containing backticks into a
shell argument.
