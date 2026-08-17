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

### Watch out when editing this file from a shell

Backticks in a `python -c` string get evaluated by bash *before* Python sees
them. Rewriting §8 that way spliced ~2KB of `git help` output into the document.
Write the replacement text to a file with an editor tool, then splice it with a
script that reads that file — never inline prose containing backticks into a
shell argument.
