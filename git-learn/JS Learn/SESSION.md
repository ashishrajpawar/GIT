# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

**Nothing in flight.** Working tree clean, everything committed.

**State as of 2026-08-23** — run `node scripts/audit.mjs` before trusting any
of it:

- **99 track lessons, 72 verified.** Audit **green**, **0 warnings**, five
  suites pass.
- **Known-and-blocked is 2** — `participants` (gated on C5) and `calls` (gated
  on B6). Both still legitimately gated.
- **M3 is finished**, all 37 lessons. `--unverifiable` was used zero times.
- **Complete:** B2, B3, B4, B7, B10, A11. **C5 is 3 of 5.**
- The 40 legacy pre-pivot lessons (modules `04`–`09`) were **deleted** on
  2026-08-22. In git history if ever wanted.

**The next unit is `c5/0004`** — see *Next action*. It is unblocked and the
design is decided; nothing is waiting on the student except one small call
about `c5/0005`.

> **Eleven decisions were taken across 2026-08-22/23**, several of which
> reversed things the course had been teaching for months — phone sign-in with
> no password, sessions that never expire, silent key-change acceptance, and
> the backup split. **They are recorded in `CLAUDE.md`, not just here.** If a
> lesson seems to contradict one, `CLAUDE.md` wins and the lesson is the bug.
> `HANDOFF.md` has the reasoning behind each.

### a11/0005 — the store declaration named data Token has never had (2026-08-22)

The last M3 lesson, and the prediction that it was checklist-shaped and
`--unverifiable` was wrong, making it **15 out of 15**.

**The headline is compliance and it is not subtle: the declarations named data
Token does not collect, and omitted the data it does.** Four places said
**email** — the privacy-policy bullet, Google **Data Safety**, iOS **App
Privacy**, and a spot-the-bug question whose distractor treated collecting it
as fine. `b2/0001`'s `users` table is `phone_hash`, `display_name`,
`avatar_url`, and `CLAUDE.md` lists email under **out of scope** entirely.

**Both halves are wrong and the second is the serious one.** Declaring data you
do not collect is embarrassing. *Failing* to declare data you do collect is
what gets an app removed — Data Safety and App Privacy are binding statements
that both stores re-check against the binary. And the omitted field is
`phone_hash`, settled **the same day** in `b10/0002`.

### `b4/0001` is why it read plausibly, and that is now an open question

That whole module registers and logs in by `email`:
`ALTER TABLE users ADD COLUMN email TEXT NOT NULL UNIQUE`, `/register` and
`/login` both keyed on it. So this is **not a slip in `0005`** — it is a
cross-module contradiction about **how a user signs in**, and it needs the
student. Raised as *Open question 0*. `0005` follows `CLAUDE.md`, which is the
documented rule when a lesson and the docs disagree.

**This is the A5 lesson again in a new place: two lessons can each be
internally consistent and still contradict.** Neither `b4/0001` nor `a11/0005`
looks wrong from inside itself. What found it was reading the store declaration
against the migration — the same move that found `b10/0002`'s seven
non-existent columns.

### The description was making the collapsed claim in front of a reviewer

*"No phone number shared, ever"*, in a listing that sits beside an App Privacy
form declaring a collected phone number. A reviewer holding both reads a
contradiction, and **a listing that contradicts its own privacy declaration is
a rejection with no obvious fix**.

Replaced with *"Nobody you give a token to ever sees your number"* plus an
explicit closing paragraph about sign-in. **The replacement is stronger, not
weaker** — a precise checkable promise about the thing the user actually fears,
which survives contact with the form. Vague claims are not safer than specific
ones, only harder to defend.

Also added the honest Data Safety detail: **tick end-to-end encryption, and
tick it accurately.** Google distinguishes it from "encrypted in transit", they
are very different claims, and ADR-0002 earns Token the stronger one. Claiming
it while holding a key ends an app; claiming only the weaker one throws away
the product's distinguishing feature.

### `runtimeVersion` was never mentioned, in the only lesson that ships updates

The config solution already set `runtimeVersion: { policy: 'appVersion' }` and
**the body never explained it** — so the gate deciding *who receives an update*
was invisible. It produces two rules pointing opposite ways:

| Shipping | `version` | Because |
|---|---|---|
| A native change | **must** change | else a later OTA lands on binaries without the native code |
| A JS-only fix, OTA | **must not** change | else the update targets a binary nobody has installed |

**"Let's call it 1.1.0" is therefore a decision about who gets the fix.** Bump
the version for a JS-only release and the OTA has `runtimeVersion: '1.1.0'`
against an installed base of `1.0.0`. It reaches **nobody**, the publish
succeeds, and the dashboard is green. So: *asking for a new version number is
asking for a new build.*

### The two counters, and only one of them resets

`versionCode` must exceed every value ever uploaded, **for the app's
lifetime** — no reset, no reuse, not even from a release you deleted.
`buildNumber` resets to 1 on a version change. **The mistake is applying the
iOS rule to Android**, and there is no undo: you cannot reclaim the range,
roll it back, or ask support. Same family as `revoked_at` in `0001`.

### And an OTA channel can silently replace the encryption code

ADR-0002's guarantee lives in client JavaScript, and `eas update` replaces
client JavaScript with no review, no store record and no prompt. Not a reason
to avoid OTA — a reason to say what it is. **The threat model of an E2EE app
must include whoever can push code to it.** Two rules adopted: key handling
ships as a store build, never an OTA; and the Expo account is a production
credential in the `TOKEN_CODE_PEPPER` tier, not the sourcemap-token tier —
`0004`'s *who needs it and when*, applied to a service instead of a secret.

### Twelve wrong-cases, and this time the multi-trips were verified individually

Six of twelve trip more than one check. **Every one was run against the
self-check on its own to confirm the extra failures are inherent** — the
channel is decided first, so a mistake that gets it wrong makes everything
downstream of "this is a build" wrong too. That is one behavioural change with
several consequences, which is fine; what is not fine is `b10/0002`'s case,
which also failed for an unrelated reason.

**The mutation case cascades and must not be "fixed".** Assigning to
`current.version` corrupts `version === current.version` — the exact comparison
rule 5 depends on — so mutating the input breaks the caller *and* silently
breaks the function's own arithmetic. That cascade is the lesson, and there is
now a comment saying so.

### The quiz had three executable questions where it had none

Same gap as `a11/0003`: 25 questions, all store-console trivia. Added the
`runtimeVersion` match, the `'1.0.9'` patch bump (`parts[2] + 1` is `"1.0.91"`,
which is invisible for the first nine patches of any minor version), and the
two counters after a version bump.

### a11/0001 — the animation was a claim the app could not keep (2026-08-22)

M3: **`swipeOutcome`**. "Looks thin" was wrong for the 14th time out of 14.

The lesson said the token is *"revoked immediately with a satisfying
animation"*, and the code meant it: the card animated to `-SCREEN_WIDTH` and
called `onRevoke` **from the completion callback**. Two defects, and the second
is the one worth carrying.

- **A gesture is not consent.** `b2/0001` comments `revoked_at` as *"set once,
  never cleared"* and `b7/0003` makes revoked terminal — there is no un-revoke,
  by design. So an accidental swipe permanently destroys a capability, and the
  delivery driver on the other end loses the channel with no recovery for
  either party. **An irreversible action reached by a gesture needs a
  confirmation step, and the reason is not timidity — it is that there is no
  undo to fall back on.** The long-press-to-archive in the same lesson
  correctly does *not* ask, which is the contrast that makes the rule legible.
- **The row was destroyed before the work succeeded.** If the request then
  fails — offline, 500, expired session — the card is gone and **the token is
  still live**. Optimistic UI is fine when being wrong is cheap; here the two
  directions are not symmetric. Showing "revoking…" on a success costs a
  moment; showing "revoked" on a failure costs the user the one thing a
  security feature must never fake.

**The general form: an exit animation is a claim.** `exiting={FadeOut}` fires
when the item leaves the array, so it belongs to the list re-reading real
server state — never to the gesture ending. The app should not be able to say
something happened before it is true.

### Four more, each already forbidden somewhere else

- **`tokenCode` as a prop on a list card, and in the callback** — third lesson
  running. `GET /tokens` returns no `code` field, so the card rendered
  `undefined`; the callback now carries `tokenId`, which is also what the owner
  endpoint takes (ADR-0007: never in a URL). The detail sheet keeps the code
  but now *fetches* it on an explicit "Show code" press, which is the one
  disclosure the ADR allows and logs.
- **`key={token.code}` on the animated list** — the same missing field, with a
  second-order consequence: every row keyed `undefined` makes React fall back
  to the array index, rows get reused across positions, and **removing the
  first item animates the wrong card out.** A data-shape bug surfacing as an
  animation bug.
- **A descending `interpolate` input range.** `[0, SWIPE_THRESHOLD]` with a
  negative threshold. Reanimated requires non-decreasing input and does **not**
  reverse it for you — the result is undefined. Put the smaller number first
  and flip the *output*.
- **Hardcoded `#e74c3c` / `#f39c12` / `#27ae60` / `#666`**, one lesson before
  `0002` says nothing visual may be hardcoded — and `0002` had just *measured*
  three of them as failing (2.19, 2.87, 3.82). Replaced with the corrected
  values and a comment saying they are literals only so the file reads alone.

### The threshold was a pixel count

`SWIPE_THRESHOLD = -SCREEN_WIDTH * 0.35` was computed once at module load.
137px is 35% of a phone and **17% of a tablet**, so the control means different
things on different devices and the difference only shows up on hardware nobody
tested. `swipeOutcome` takes `thresholdFraction` and recomputes every call —
and one wrong-case is *the identical gesture on an 800-wide tablet*.

**Velocity was ignored entirely**, which is the defect a user would actually
notice: a fast flick that never travels far is how people really use a swipe
control, and a distance-only rule feels broken to anyone with a quick thumb.
The rule everyone leaves out is the third one — **a flick in the opposite
direction vetoes a committed distance.** The position is the past; the release
velocity is what they meant last. Dragged past the threshold, flicked back,
released: the position says commit and the person says no, and the person is
right.

**The function deliberately does not decide whether "commit" means do-it or
ask-first.** That is a property of the action, not of the gesture — which is
why the same function serves both the revoke card and the dismissable banner.

If this stops mid-edit: previous good state is `50f3b7b`.

### a11/0002 — the light palette was the broken one (2026-08-22)

M3: **`auditContrast`**. Measured the shipped palette before writing anything,
which is the whole finding. On `#FFFFFF`:

| | ratio | needs |
|---|---|---|
| `warning` | 2.19 | 4.5 |
| `textMuted` | 2.07 | 4.5 |
| `success` | 2.87 | 4.5 |
| `accent` | 3.15 | 4.5 |
| `danger` | 3.82 | 4.5 |

**The dark palette passed almost everything.** That is the reverse of the usual
worry and it has a reason: choosing a colour to sit on near-black *is* choosing
for contrast whether you mean to or not, while choosing one to sit next to
white is a question about taste. **The mode nobody tests is the one people use
in daylight.**

**Where it lands for Token:** `a5/0003` derives five states and the badge
renders them with `success`/`warning`/`danger` — the three worst colours in the
palette. *"Is this token still live?"* was being answered at **2.19:1**. The
exercise then instructed the student to build exactly that badge.

### Three things that only fell out of measuring

- **A colour is not accessible; a pair is.** The old `textSecondary` was 4.69
  on `background` and **4.45 on `surface`** — same colour, passing and failing,
  depending on which card it landed in. The check anyone would have run is the
  one that passes.
- **Amber cannot carry white text.** No shade of `warning` reaches 4.5 against
  white while still being amber. The fix is not a darker fill, it is dark ink
  on it — hence the `on*` keys. **When one colour cannot be fixed, fix the
  pair.**
- **`textMuted` could not be saved.** Any grey light enough to read as "muted"
  on white is under 4.5, and the first one that passes *is* `textSecondary`. So
  it is now documented as disabled-and-decorative only (WCAG exempts disabled
  controls) with the rule that **no information may live in it**. A palette
  that cannot express a distinction beats one that expresses it illegibly.

Also two things fixed and one stated: `border` is 1.19/1.55 and is now
explicitly dividers-only, with `inputBorder` added at 3.75/4.12 for anything
whose boundary locates a control (WCAG 1.4.11).

### Contrast is not the colour-blindness fix

A 5.38 green and a 5.44 red are both legible and **identical to each other**.
Red-green affects ~8% of men, and Token's badge uses exactly that pair for
active-vs-revoked. WCAG 1.4.1 is a separate rule and the fix is free here:
`displayStatus` already returns a word, so render it. The test needs no tooling
— **screenshot it, convert to greyscale, see if you can still tell.**

### The exercise also violated ADR-0007

It told the student to show "the token code (monospace)" on a list card.
`GET /tokens` returns **no `code` field at all**. Same defect as `a5/0003`'s
`{item.code}`. The revealed solution took `tokenCode: string` as a prop and
rendered it, so the card would have shown `undefined` on every row.

Its badge also used `statusColor + '20'`, a 12% tint — which makes the ratio
**unknowable**, because it then depends on whatever is painted behind. That is
the same class as the `rgba()` case the exercise refuses to score.

### My own self-check had the throw bug it warns about

Four wrong-cases initially reported `passed everything`. Three were one cause:
my checks did `find(list, name).ratio`, and a mistake that puts a pair in a
different bucket makes `find` return `undefined`, so the check **threw** —
aborting every check below it and reporting as "could not run", which reads as
a broken verifier rather than a caught mistake. Exactly the trap already
written down under *Verifying a lesson*, in the file I wrote the same day.
Fixed with `ratioOf`/`bucketOf` helpers that never dereference a miss.

The fourth was a wrong `expect`: I assumed averaging the channels instead of
weighting them would break the body-text case, and it breaks the *large-text*
one. **Added a check that isolates the weights properly** — pure blue on white
is 8.59 weighted and 2.74 unweighted, because blue carries only 7% of perceived
brightness. Grey anchors cannot see that; a saturated colour can.

**And the anchors everyone writes are the two that cannot catch the real bug.**
Black-on-white is exactly 21 and self-vs-self is exactly 1 *with or without*
the sRGB gamma decode. It takes a mid-grey (4.48 correct, 2.03 without) to see
it.

### a11/0003 — a typo that issues an unlimited token (2026-08-22)

M3: **`toCreateTokenPayload`**. The lesson's number handler was:

```js
const num = parseInt(text, 10);
onChange(isNaN(num) ? undefined : num);
```

It reads as careful defensive coding and hands out the most permissive value
the form can produce. **`undefined` on an `.optional()` field is not "invalid",
it is absent — and absent on `maxUses` means unlimited.** Type `3`, fumble a
letter, and you issue a token with no use limit. The form is valid, the request
is valid, the row is valid; **the only trace is a token that still works after
the third use.**

`parseInt` is the quieter half: it reads a *prefix*. `parseInt('7x')` is `7`
and `parseInt('1e3')` is `1`, so a user asking for a thousand uses silently
gets one.

**The rule, now on its fourth lesson: when a value cannot be understood,
refuse it — do not substitute a default.** The substituted default is always
the permissive one, because permissive is what "no opinion" looks like. Same
shape as `b7/0002`'s unknown rule type falling through to `allowed`.

### The shared schema had the same habit three times

`shared/src/schemas/token.ts` is imported by `api/` as well, so these are the
API's definition of a valid token, not a screen's:

- **`.optional().or(z.literal(''))` on `expiresAt`** made `''` a *valid* value.
  It passes validation, enters the request body, and reaches a `TIMESTAMPTZ`.
  `new Date('')` is `Invalid Date`. The field the user deliberately left blank
  is the one that breaks the insert.
- **Same on `issuedTo`**, storing `''` where the system expects null — so
  `issuedTo ?? 'Unnamed'` renders nothing, because `??` only catches
  `null`/`undefined`.
- **`maxUses: .min(1)` made `max_uses: 0` unreachable.** `CLAUDE.md` and
  `CHECK (max_uses >= 0)` both say `null` is unlimited and `0` permits no uses
  — opposite meanings. A shared schema rejecting `0` leaves the column with a
  state nothing can create and no form can edit back.

**All three are one habit: treating "the user did not fill this in" as a value
rather than as an absence.**

### And a contradiction with a5/0004 in the exercise

The existing exercise refined `timeStart < timeEnd`. That **forbids
`22:00–06:00`** — the overnight window `a5/0004` spends a whole lesson teaching
`isWithinWindow` to evaluate, where "the morning belongs to yesterday". The
form could not create the rule the evaluator was built for. Now refuses only
`start === end`, which is the genuinely empty window.

**Third time a lesson's cross-field validation has been stricter than the
system it feeds.** The tell is a rule that sounds obviously right.

### `Number('')` is 0, and that is the opposite failure

Worth keeping because it is the mirror image of the headline bug: an
implementation that converts *before* checking for blank turns every untouched
max-uses field into a **zero-use token**. One line's ordering apart, and both
directions are silent. The self-check pins both.

### Wrong-cases: eleven, and this time built from named seams

`scripts/cases/0003-forms-validation.mjs` composes each mistake from one
correct implementation with overridable fragments, so a case differs from the
right answer in exactly one place **by construction** rather than by care. That
is the fix for what went wrong writing `b10/0002`'s cases yesterday, and it
made the file shorter as well as more honest.

Four mistakes trip more than one check, and all four are *inherent* — one
behavioural change with several visible consequences (`parseInt` breaks both
the typo case and `1e3`). That is different from a case failing for an
unrelated reason, which is what had to be fixed in `b10/0002`.

### The quiz had no executable questions at all

25 questions, **zero** that `verify-lesson.mjs` could run — every one was about
Zod or react-hook-form. Added three that are pure JavaScript and now execute:
`parseInt` on four real inputs, `Number('')`, and the fact that **`Invalid
Date` compares false against everything, including itself** — so neither
branch of a two-way date comparison catches it.

### b10/0002 — the compliance lesson could not have run (2026-08-22)

M3: **`planErasure`**. The defects were not nuance — the two endpoints this
lesson exists to teach both reference columns that do not exist:

| Written | Actually in the schema |
|---|---|
| `users.username` | `display_name` (plus `phone_hash`, `avatar_url`) |
| `messages.sender_id` | `sender_type` — holders are not users |
| `messages.content` | `ciphertext` + `nonce` + `key_version` |
| `redemption_events.redeemed_at` / `.ip_address` | `created_at` / `holder_ip` |
| `tokens.code` | does not exist and never will (ADR-0007) |
| `participants` | never created — a known orphan |

The **revealed solution** still selected `code` and `content` — the exact two
things the lesson's own callout spends four paragraphs forbidding, and the
copy the student pastes. The body had been half-fixed earlier in the session
and the `createSolution` block was never touched. **`b10/0001` was the same
shape a day earlier.** When a lesson's prose gets corrected, grep its solution
block in the same commit; they are not the same text and only one of them is
read carefully.

### The erasure order was wrong from the moment B2 grew a table

```sql
DELETE FROM tokens WHERE user_id = $1;   -- with conversations still pointing at it
```

`conversations.token_id` and `redemption_events.token_id` are both
`ON DELETE RESTRICT`, and `tokens.user_id` is too. The shipped order never
mentioned `conversations` at all, so **account deletion would have thrown for
every user who had ever been messaged** — which is every real user. The
`order-steps` quiz question keyed that same broken order as correct.

Nothing could have caught this. `b2/0002` added `conversations` in a different
module; the person adding a table is not looking at a DELETE list two modules
away. **The same defect shape as `SELECT *` in `b3/0003`: an edit somewhere
else creates the bug.** That is why the exercise is a function that *reads* the
foreign keys rather than a list someone maintains.

### What the lesson now says, and why it is stronger than what it said

It claimed *"Once done, the data is gone"* while its own retention table said
**backups: 7 days**. Both cannot be true. The fix is not more deleting:

- Every erasure has a **tail** — a window where you have told the user
  "deleted" and could still restore them. Naming it is the compliant answer;
  denying it is the actual failure.
- **Under ADR-0002 the tail applies only to what the server kept in the
  clear.** Message bodies in those snapshots are ciphertext the server never
  held a key for, so their survival discloses nothing. The tail is on
  `display_name`, labels, timestamps, who-talked-to-whom.
- Therefore **data minimisation is the mechanism that makes erasure
  achievable**, not a box to tick. How long you must wait was decided at
  schema-design time, years before anyone asked.
- Stated limits, so this does not become a general excuse: `code_enc` is
  encrypted *with a key the API holds*, so it counts as clear; and the
  holder's copy on their device is outside your reach entirely.

**`deletion_queue` now exists**, defined here because this lesson is where the
policy got decided. Deliberately a tombstone: `erased_user_id` is a plain
integer with **no foreign key**, because the row it would reference is the one
just deleted.

### The export was handing one person another person's data

`redemption_events` holds `holder_ip`, `holder_name`, `user_agent` — the
**redeemer's** data. The issuer's export shipped all of it. A different Data
Principal, who never signed up, disclosed on request through a compliance
feature. **"A row in my table" and "my personal data" are different sets**, and
an export written from the schema rather than from that question ships the
difference.

### `phone_hash` — asked, answered, applied (2026-08-22)

The lesson's compliance table claimed *"no phone number, no email, no real
name"*. `b2/0001` stores `phone_hash` and a `NOT NULL display_name`. A hash of
a ten-digit Indian mobile is a lookup key, not an anonymisation — the argument
`b3/0001` already makes about a different column.

**The student chose: keep the column, fix the sentence.** The number is doing
real work (account recovery), and passphrase-only sign-up means a lost
passphrase is an unrecoverable account. The claim is now *"we store a scrambled
version of your phone number, used only to sign you in"*. Recorded in
`CLAUDE.md` under **What the server knows about the user**, so it is not
re-litigated.

**The thing worth carrying: two different claims had been collapsed into one
line.** *What a token holder learns* is nothing — that is the product's promise
and was never in doubt. *What the company collects* is a hashed number and a
display name. A sweep found ~14 "no phone number" phrasings across the course
and **all but `b10/0002`'s two were about the first**, so they are correct and
were left alone. **When you meet the phrase, check which claim it is making**
before either trusting it or rewriting it.

### The wrong-cases caught a self-check hole again, and then a self-inflicted one

Eleven mistakes, two alternatives. Two things worth keeping:

- **`untilDays: 0` had no check.** A retention expiring today is a retention;
  `if (r.untilDays)` rejects it. Same shape as `max_uses: 0`, in a new table.
  The check was added *because* the case was written.
- **Six mistakes initially tripped two checks**, because I had left correct
  cycle-detection out of them as well. A case that fails two checks does not
  say which distinction it tests. Tightening them to single-variable changes
  immediately produced a real `FAIL` — and that one turned out to be a missing
  `${PRELUDE}`, not a hole. **Both outcomes are the point: a case that fails
  for the wrong reason is indistinguishable from a case that passes for the
  wrong reason until you make it differ in exactly one way.**

**That is six times a wrong-case has caught a gap in the self-check written
beside it.** Still the only mechanism that does.

### The known-issues file worked from both ends

Defining `deletion_queue` cleared the orphan error, and the audit immediately
failed with *"no longer matches any error — delete the entry"*. That stale
check is doing exactly the job it was written for; the entry is gone.

Also: my own fixture `DPBI-2026-114` tripped the token-alphabet warning
(`0` and `1` are excluded). Warnings are at 1 again — a real dead link in
legacy `07`. **Treat a warning as real**, including your own.

### b10/0001 — the security lesson did not name its own security model

Zero mentions of the pepper, `code_hash`, or the denial oracle. Everything in
it was correct and **general** — parameterised queries, CORS, headers,
ownership checks — and none of the decisions that make *this* product's
security specific was on the list.

Both are now stated, the oracle as a table across the three layers it has had
to be applied at (`b7/0001`, `a8/0002`, `b3/0004`), because each looked like a
different problem at the time and they are one rule.

Its own access-control example had `SELECT *` then `res.json(row)` — so since
`b2/0001` it shipped `code_hash` and `code_enc`. **The lesson demonstrating
the fix was demonstrating the bug.**

Its 404-not-403 was already right, and the note now says *why*: the query is
scoped by `user_id`, so the handler **cannot** tell "not yours" from "does
not exist". **The safe answer falls out of the query shape rather than having
to be remembered** — that is the version to aim for.

### a11/0004 — a TURN password in the app bundle

The lesson said *"if it's a credential, it goes in EAS Secrets"* and
demonstrated it with `eas secret:create --name TURN_PASSWORD`.

**EAS Secrets genuinely works** — encrypted at rest, never in git, injected
only at build time. None of it helps. Anything the running app reads was
baked into the bundle to get there, and the bundle is an `.apk` on a
stranger's phone. **If the app can read it, so can whoever holds the app.**

TURN is the relay *every* call goes through under ADR-0008, so that password
is metered bandwidth billed to the user, with no revocation short of shipping
a new build. And `a7/0001` already said the right answer — short-lived
credentials from the API — so this was a **direct contradiction where the a11
side was the vulnerability**.

The corrected rule replaces *"is it sensitive"* with **"who needs it, and
when"**. A sourcemap upload token and a TURN password are both credentials
and belong in completely different places.

### ⚠ A process trap that cost two bad edits

**`git checkout --` on this repo restores CRLF.** Every multi-line anchor in
an edit script then fails silently while single-line ones keep matching — so
a script reports "applied 1 of 3" and leaves a half-edited file. Re-running
it duplicated the parts that *had* applied.

**Normalise to LF before editing a file you have just reverted:**

```bash
node -e "const f='path';require('fs').writeFileSync(f,require('fs').readFileSync(f,'utf8').replace(/\r\n/g,'\n'))"
```

And check for duplicates after any re-run — an edit script whose replacement
*contains* its own anchor is not idempotent.

### B3 finished — and the worst find of the module was in `0001` (2026-08-21)

**`b3/0001` taught a token generator that emits codes its own validator
rejects.**

```js
randomBytes(9).toString('base64url').slice(0, 12).toUpperCase()
```

It looks careful — a CSPRNG, the right length, no `Math.random()` anywhere —
and it is broken twice.

- **Wrong alphabet.** base64url upper-cased is `A–Z 0–9 - _`. Token's is 31
  characters with `0 O 1 I L` excluded and no punctuation. So it emits `0`,
  `1`, `-` and `_`, all of which `codeHashInput` refuses. `CLAUDE.md` records
  this exact failure happening once before, and calls a wrong alphabet **an
  unlimited supply of bad codes**.
- **`.toUpperCase()` destroys half the entropy.** 9 bytes is 72 bits;
  case-folding collapses 64 symbols to 38 *non-uniformly*, so letters arrive
  twice as often as digits. **You cannot fix biased output by generating more
  of it.**

The audit's alphabet check could not see this — it looks for a 20+ character
`A-Z0-9` string literal, and this is a *method chain*. Worth knowing the check
has that shape.

Also replaced a bare `sha256(phone)`. A hash is one-way only if the input is
unguessable, and an Indian mobile is ten digits with a known prefix. **Token's
answer to a phone number is not to hash it, it is not to have it.**

### `b3/0004` — the format oracle, third layer

The error handler returned Zod's field details on every route including
`/api/redeem`, so a malformed code answered 400-with-details and a well-formed
unknown one answered 404. **A script learns whether its generator produces
well-formed codes without ever holding one.**

Third layer the same rule has needed applying at, after `b7/0001`'s endpoint
and `a8/0002`'s page: *you may explain yourself to someone who has proved who
they are.*

Its redeem schema also demanded the **dashed** form, which the product's own
QR does not produce — `tokn.app/t/MERC8GH2KP4X` is undashed. The validator
rejected the exact input the QR generates.

### Wrong-cases found three holes in their own self-checks this pass

`b3/0004` had no assertion that a *public* unknown error is still a 500 — so
an implementation checking auth first returned the 404 denial for a crash,
hiding an outage inside ordinary 404 traffic on the redemption endpoint.

`b3/0001` had two, **and one of my own mistake implementations was wrong**:
`"0"` is a *truthy* string, so the falsy bug I wrote never rejected it. The
`'0'` case stays as a guard rather than a trap, with a note saying so, because
the thing it now protects against is someone "fixing" it with `Number()`.

**That is five times this session a wrong-case has caught a gap in the
self-check written beside it.** It remains the only mechanism that does.

### b3/0003 — and the drift `SELECT *` guarantees (2026-08-21)

The list query said `SELECT * FROM tokens`. That was correct until
`b2/0001` added `code_hash` and `code_enc` **the same morning** — from that
moment the list endpoint returned both to the client, in every page, and
nothing would have failed.

**That is what makes `SELECT *` different from ordinary laziness: it is a
promise to return whatever a future migration adds.** The person adding the
column is not looking at the handler, and the person who wrote the handler is
not there when they do. This is the cleanest example the course has of a
defect created by an edit somewhere else.

The callout also refuses the obvious defence — `code_enc` being encrypted is
not much comfort when it is a ciphertext of a live capability, sent to a
client that never needs it, repeatedly, its safety resting on a key that has
to hold for as long as any of those responses survive in a log or a cache.

M3: `buildPage(rows, limit)`. The lesson's implementation was **already
correct**, which made it a good candidate — the exercise is about *why* each
line is that way, and the wrong-cases are the ways it usually is not.

### The `SELECT *` sweep, and a distinction worth keeping

~20 more, **all in B1, and all fine.** `SELECT *` at a `psql` prompt, where
you read the output yourself, is not the same act as `SELECT *` in a handler.
The rule is about endpoints, not about learning SQL.

What the sweep did surface: **B1 still teaches a plaintext `code` column**,
which `b2/0001` removed. That is a defensible pedagogic choice —
`WHERE code = 'MERC-8GH2-KP4X'` is a far better first query than
`WHERE code_hash = '9f2a...'` — but nothing said so, leaving two lessons
flatly contradicting each other. B1 now says it is a simplification and names
the two habits that do not survive the move.

**The general form: a simplification is fine; an unlabelled one is a
contradiction.** Worth checking wherever an early module models something a
later one replaces.

### Seven broken quiz options, found by reading rather than by the audit

`CLAUDE.md` says an option must never reference the others. The audit **errors**
on "All of the above" and **cannot see** "Both B and C" — and `quiz.js` shuffles
options at render, so an option naming letters is meaningless by the time a
student reads it.

**Six were the keyed CORRECT answer**, which makes them worse than distractors:
`a3/0001`, `a8/0003`, `b5/0002`, `b3/0003`, and two in `x1/0003`. Every one is
unanswerable as rendered. `a11/0003` was the weaker version — an option
restating the two before it rather than naming them.

**The lesson: this is the 01/0006 q27 defect, six more times, and the audit was
never going to find it.** The check is deliberately narrow (widening it gave
two false positives out of three hits) and `test-quiz-shuffle.mjs` asserts that
narrowness stays visible. So the gap is known and permanent — **it closes by
someone grepping for it**, which is now worth doing after any batch of quiz
edits:

```bash
grep -rnE '"(Both|All) [A-D] (and|,)' modules/ --include=*.html
```

**I introduced a `render-as-authored` while fixing them** — one new explanation
said "the last option has it backwards". The audit caught it on the next run
and it is back to 0. That check earns its place.

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
- **`deletion_queue`** — **closed 2026-08-22.** The gate was "a per-user
  erasure policy, informed by `b10/0002`", and `b10/0002` now decides it: live
  rows go inside one transaction in foreign-key order, and the queue tracks the
  only part that cannot be immediate — the backup tail. The table is defined in
  that lesson because that is where the policy was settled. The
  `known-issues.json` entry is deleted, not re-worded; the audit's stale check
  is what said so.

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

### → Start here: `c5/0004`, backup &amp; recovery

**Unblocked, designed, nothing waiting on the student.** Write it to the split
decided 2026-08-23 (below, and in `CLAUDE.md`):

- Signing in with the phone number restores the **token list, labels, rules,
  expiry, max uses, redemption history, conversation list, timestamps, display
  name and avatar** — all server-side, none encrypted to a user key. Nothing to
  write down.
- **A 12-word recovery phrase, offered at sign-up and skippable**, unlocks
  message **bodies** only. Skip it and you lose old message text on a new
  device, and nothing else.
- The phrase must **never** be recoverable by SMS, or a SIM-swap takes the
  history with the account.

**M3 candidate worth considering:** the restore-planning function — given what
came back from the server and whether a phrase was supplied, decide what is
recoverable and what is permanently gone. The interesting edges are that a
missing phrase is *not* an error (most users will skip), and that "gone" and
"not yet fetched" must never be collapsed.

**Then one small call from the student:** `c5/0005` was multi-device, and they
chose **one device for v1**, so it has no product to describe. Either rewrite it
as *"why Token is single-device, and what it would cost to change"* — genuinely
useful, since that answer shapes the whole key model — or **drop it and make C5
four lessons.** Do not write it as planned.

**After C5:** `a3/0002`'s M3 extraction, `a2`'s runtime type guards, and the
small `a8/0004` fix (`tokenCode` sent over the WebSocket on every chat message,
twice — the holder knows the code so nothing leaks to *them*, but it lands in
server logs and Redis pub/sub against ADR-0007, and the holder JWT already
carries `conversationId`). None of these is blocked.

---

### Settled 2026-08-23 — key backup, multi-device, and the key-change UX

Three put with options; the first two answers came back as free text and one
of them conflicted with a constraint recorded the day before, so it was put
back with the cost spelled out.

| Question | Answer |
|---|---|
| **Key backup** | **Split** — everything but message bodies auto-restores from the phone number |
| **Multi-device** | **One device for v1** |
| **Key-change UX** | **Show nothing at all** — silent accept |

### The one that had to go back to the student

The first answer was *"once logged in with the same number, data is auto
restored"* — no passphrase. **That cannot be built without removing E2EE**, and
the reason is short enough to state exactly: for data to return from a phone
number alone, the server must be able to release the key, which means it can
release it to itself. Not weakened encryption — its absence. And `b10/0002`
and `a11/0005` now declare end-to-end encryption to both stores.

**Put back with the split as the recommendation, and the student took it.**
What made that work was checking what is *actually* encrypted:

| Auto-restores from an OTP alone | Needs the recovery phrase |
|---|---|
| Token list, labels, rules, expiry, max uses | Message **bodies** only |
| Redemption history, conversation list, timestamps | |
| Display name, avatar | |

**The user gets their whole working state back with nothing to write down.**
Only the words inside messages need the phrase. That was not a compromise
invented to end an argument — it is what the schema already was, and nobody
had looked.

### The key-change answer stands, and the guarantee is now stated narrowly

*"As long as the token is approved, changing key is more technical, user should
not be notified."* Put back once with the consequence; the student chose
**Show nothing at all** having read it. That is their decision and it is
recorded as one.

**I also overstated the case and corrected it.** I had called E2EE-plus-silent-
key-acceptance "incoherent". It is not — it is a real and common posture:

> Token is end-to-end encrypted **against a server that stores and does not
> attack.** The server holds ciphertext and no key. It is not protected against
> a server that actively substitutes a key, because nothing surfaces that.

iMessage was exactly this until Contact Key Verification in 2023, and the store
declaration stays true — Google's Data Safety form asks whether data is
end-to-end encrypted, and it is. **What must not be written is "nobody can
intercept your messages."** What can be written is "we store only ciphertext
and hold no key."

### The decision cost four lines, and that is the argument for the split

`classifyPeerKey` **did not change at all.** It still returns `warn` for a
rotation, because a key change *is* a key change — that is a classification,
and it is still true. What changed is the policy the caller applies: the send
path now pins and logs instead of throwing.

Both lessons re-verified untouched, self-checks and wrong-cases passing,
**including the assertion that the function never pins silently** — because it
still does not. The pinning moved to the caller, where policy belongs.

**Keep this separation.** It is the reason a product decision that reverses the
user-facing behaviour of a security feature was a four-line edit rather than a
rewrite of a function and its eleven wrong-cases.

Two things deliberately survive, and removing them would turn the trade into a
hole: **the rollback block stays** (a refusal, not a notification — the user
sees a failed send, never a crypto dialog), and **`c5/0003` stays reachable
from settings**, never prompted.

### c5/0003 — verification, and the one line that makes it impossible (2026-08-22)

M3: **`safetyNumber`**. 18 self-checks, 11 wrong-cases. **99 track lessons,
72 verified.** C5 is 3 of 5.

**The subject is a one-line bug with a disproportionate failure mode.** Both
devices must compute the identical number, and the obvious implementation —
`hash(myKey + theirKey)` — does not: each side puts *its own* key first, so
each hashes a different string.

**What makes it worse than an ordinary broken feature is how it fails.** Not
"verification unavailable" but **"verification says you are being attacked"**,
to every user, every time. The natural response is support telling people to
ignore that screen — and then nobody checks the one thing that would catch a
real interception. **A feature that cries wolf gets worked around, and the
workaround is the damage.**

Fix is `[myKey, theirKey].sort()`. **General form: any value two parties must
agree on cannot depend on which of them is computing it.** The test is one
line — `f(a, b) === f(b, a)` — and it is the first check in the self-check.

### Two things the lesson argues rather than asserts

- **The number must bind *both* keys.** A fingerprint of the peer's key alone
  verifies one direction only, and is identical for every conversation that
  person has — a statement about a *person* rather than about *this channel*.
- **A short safety number is worse than none.** Eight digits is ~10⁸ — an
  attacker grinds keypairs until one matches. The result is not an absent
  protection but a **green tick on a compromised channel**, and a user with no
  verification screen stays cautious while a user with a tick does not. So
  `safetyNumber` **refuses** below 32 digits rather than returning a short one.
  Same rule as the plaintext downgrade in `0002` and the regeneration in
  `0001`: when you cannot do the secure thing, stop.

### The fixture that could not see the bug it was aimed at

*"A different pair gives a different number"* used `(A,B)` vs `(A,C)` — whose
sorted-smaller keys **differ**, so an implementation hashing only the smaller
key passed. Changed to `(B,A)` vs `(B,C)`, which **share** the smaller key, and
the case now trips.

**This is the discriminating-fixture rule again** (`a11/0002`'s grey anchors,
`b4/0003`'s one-stamp window), and the tell is the same: the fixture varied
something the bug does not depend on.

### And a test of mine that could not have failed

The mutation check asserted `safetyNumber` "does not reorder the caller's
data" — but the function **takes two strings**. There is no caller-owned
structure to reorder and strings are immutable, so the check was unfalsifiable
and its wrong-case passed everything. Both deleted; the point survives as a
note in the exercise, since `[a, b].sort()` being safe *because the array is
fresh* is still worth saying.

**Worth generalising: a check that cannot fail is not a weak check, it is
noise** — it costs a line, reports PASS forever, and makes the suite look more
thorough than it is. The wrong-case is what exposed it, which is the eleventh
time.

### c5/0002 — the key directory, and the two things a rotation cannot look like (2026-08-22)

M3: **`classifyPeerKey`**. 22 self-checks, 11 wrong-cases, **all passing on
the first run** — the first lesson this session where the wrong-cases found no
hole in the self-check. **98 track lessons, 71 verified.**

Defines `device_keys`, **append-only**: `retired_at` rather than `DELETE`, and
`UNIQUE (user_id, key_version)`. Third table in the course to record a state
change rather than express it by absence, after `revoked_at` in `b2/0001` and
`superseded_at` in `b4/0002`. Here it also keeps `messages.key_version`
resolvable — that column has looked like over-engineering since `b2/0002` and
this is what it was for.

### The finding that gives the lesson its rule

*"Warn when the key changes"* is the standard advice and it is not a rule —
it cannot distinguish a new phone from a server substituting a key. The
version makes it one:

| Fetched | Means | Client |
|---|---|---|
| Same bytes | nothing changed | **proceed** — versions are metadata, the bytes are the identity |
| Different key, **higher** version | a real rotation | **warn** — legitimate and indistinguishable from an attack, so the human decides |
| Different key, **same or lower** | not a rotation | **block** — no honest path produces it |

**Because the server assigns the version by incrementing, a genuine rotation
always arrives with a higher number.** So the third row can be refused
outright rather than warned about — and it matters, because **a replayed old
key may have been retired precisely because it leaked.** A rollback steers you
onto the one key most likely to be in someone else's hands.

**Consequence recorded in the lesson: the client must not send
`keyVersion`.** Every defence here rests on the number being monotonic, and a
client-supplied version is a client-supplied claim. *When a check depends on a
value's ordering, that value cannot come from the party being checked.*

### The downgrade, which is the cheapest attack in the system

`GET /keys/:userId` can legitimately return `publicKey: null`. The tempting
handler sends the message unencrypted and marks it in the UI — which converts
a server that cannot read your messages into one that reads whatever it likes,
**by answering null**. All the cryptography sits behind an `if` whose input
the attacker controls.

Same rule `0001` reached from the other side: **when the secure path is
unavailable, stop — do not fall back to the insecure one.** A feature that
degrades gracefully under attack is a feature that can be attacked into
degrading.

### Two things stated rather than glossed

- **Trust on first use is genuinely weak**, and the lesson says so: an
  attacker is best off intercepting before two people have ever talked. What
  TOFU buys is that the attack must be *early and sustained* — a server that
  turns malicious later has to push a key change, which is the event the
  client watches for.
- **Verification does not survive a key change.** A fingerprint checked in a
  cafe last year says nothing about a key that appeared this morning, so
  `verificationLost` is reported separately — and deliberately **false** on a
  blocked rollback, because nothing was accepted and the old pin still stands.
  Telling users to re-verify a key that never changed is the false alarm that
  teaches them to ignore real ones.

**The structural check worth reusing: exactly one branch may pin.** The
self-check asserts it directly over seven inputs rather than only testing
cases — the same shape as `0001`'s *exactly one input may generate*. Counting
the branches that can grant trust is a cheap read on whether a design is
sound.

### C5 started — `0001` written, four to go (2026-08-22)

**The module now exists**: `modules/c5-end-to-end-encryption/`, wired into
`index.html`, `search-index.json` and the module table. **97 track lessons,
70 verified.**

M3: **`planKeyInit`**. 18 self-checks, 11 wrong-cases, verified on first
write — the first lesson in the course written with an exercise from the
start rather than retrofitted.

**Most of C5's architecture was already decided**, which is why `0001` needed
no new decisions: ADR-0002 fixes X25519, on-device generation, publishing
public keys through the API, `expo-secure-store` over `AsyncStorage`,
fingerprint verification, and no ratchet in v1. The lesson implements that;
it does not relitigate it.

### The subject: a key that will not load must be refused, never regenerated

The tempting version is three lines shorter and reads as robust —
`if (!isValid(stored)) return generateAndStore()`. It recovers from a corrupt
key without troubling the user and **silently destroys every conversation
they have ever had.** A new identity key cannot decrypt anything sealed to
the old one; the messages are still in the SQLite cache and permanently
unreadable, and the app looks fine because a fresh key works perfectly for
messages not yet sent.

**And it is unrecoverable in a way the corrupt key was not.** A key that
fails to parse might be a truncated read, a Keychain error, a migration bug,
or a device locked at the moment of the call — all fixable while the bytes
exist. Overwriting removes the option.

**`!stored` is true for `''`, and `''` is what a locked Keychain returns.**
So the destructive branch fires on the code path that runs most often: opening
the app from a notification. Frequent, silent and irreversible together is
what makes it the worst line in the function.

**Fifth appearance of the permissive-default rule** (`b7/0002`, `a5/0005`,
`b3/0001`, `a11/0003`, now this), and the lesson tabulates all five. The tell
is identical every time: the fallback is whatever "no opinion" produces, and
no-opinion is always the permissive option.

### Two more self-check holes, both found by the wrong-cases

- **A throw aborted everything.** The mistake that drops the base64 check
  reaches `null.length`, throws, and the whole block reports *"could not
  run"* — which the runner scored as **passed everything**. This is the trap
  written down under *Verifying a lesson* and it has now caught me a third
  time. Fixed by making the `got()` helper catch and return
  `action: "threw"`, so a throw is a **wrong answer** rather than a stop.
- **Coercing a non-string still refused**, so checking `action` alone could
  not see it. `String(12345)` decodes fine and is the wrong size, so it
  reports `wrong_size` — blaming the key for a **storage-layer** fault, which
  sends whoever debugs it hunting corruption instead of the bug that produced
  a number. Now checks the reason too.

**Ninth and tenth times a wrong-case has caught a gap in the self-check
written beside it.**

### And I introduced a second `render-as-authored` in three days

An explanation said *"the first option is impossible by design"*. Caught on
the next audit run, reworded, back to 0. **That is twice now** — both while
writing fresh quiz content at speed. The check is doing exactly the job it
was added for, and the habit it guards against is clearly not automatic yet:
describe what an option *says*, never where it sits.

### What `0002`–`0005` still need

`0002` (publish/fetch) and `0003` (verification) are determined by ADR-0002
and can be written directly. **`0004` (backup) and `0005` (multi-device)
cannot** — they need decisions the ADR deliberately leaves open, and `0004`'s
first question is already fixed by this session's auth work: **the key backup
must not be recoverable by SMS alone**, or a SIM-swap takes the message
history along with the account. Ask before writing those two.

### b4/0003 — rate limiting became a bill, and lockout was deleted rather than tuned (2026-08-22)

M3: **`checkLimits`**. 18 self-checks, 11 wrong-cases. **B4 is complete** —
69/96 verified.

**The lesson's whole threat model changed.** Four of the six things it now
lists as prevented are specific to this system, and three of them would not
exist under a password. `/auth/request-code` is **the first endpoint in the
course where every unthrottled request costs money** — ₹0.12–₹0.25 an SMS.
A wasted query is free; a wasted SMS is not.

That is why one limiter is not enough, and the table makes the split explicit:
**the per-number limits protect your users and the per-IP limit protects your
invoice.** Neither substitutes for the other, which is the *"one composite key
defends nothing"* argument arrived at from cost rather than security.

### Account lockout is gone, and the lesson already contained the reason

It had `failed_login_attempts`, `locked_until`, a migration, and careful
reasoning about how to make a dangerous mechanism less dangerous — threshold
10 not 3, duration 30 minutes not indefinite. It also already said the
damning thing: ***"anyone who knows your email can lock you out of your own
account, on demand, by failing to log in."***

All of it deleted. **The password decision removed the problem rather than
mitigating it.** What replaces it is the `attempts` column on the OTP row:

| | Account lockout | OTP attempt cap |
|---|---|---|
| Counter lives on | the **user** | the **code** |
| Exhausting it costs the victim | their account, 30 minutes | nothing — they request another |
| Can a stranger trigger it? | **yes**, knowing only the identifier | only against a code they cannot obtain |

**The general lesson, and it is worth more than the feature: a control that
needs careful tuning to avoid becoming a weapon is often a sign that something
upstream is wrong.** Every knob on that design existed to manage a hazard
created by having a long-lived, publicly addressable secret. Remove the secret
and the knobs go with it. Not always available; when it is, it beats any
amount of tuning.

Also stated rather than assumed: **rate limits are for resources, attempt caps
are for secrets.** A time-windowed limiter on `verify-code` would be strictly
worse — wait out the window and you get five more guesses at the same code,
forever.

### My own self-check had three holes, and every one was a fixture defect

The wrong-cases found all three. Worth recording because they are the same
mistake in three costumes — **a fixture that cannot distinguish the right
answer from the wrong one**:

- **`retryAfterMs` was only ever checked against a one-stamp window**, where
  oldest and newest are the same number. "Use the newest" passed cleanly.
  Fixed with two stamps at different ages.
- **The mutation fixture was on a *refused* path.** An implementation that
  records the request on the way out only reaches that code when allowed, so
  the bug was unreachable. There is now an explicit check asserting the
  fixture is on the allowed path — the assertion about the *test* rather than
  the code.
- **`NOW` was 10,000,000 ms**, small enough that daily-window fixtures
  produced **negative timestamps**, which a bucket-based implementation
  mis-binned. Raised to a real epoch value.

**And the fixed-bucket mistake needed a fixture built around a boundary.**
A bucket and a sliding window agree at most wall-clock offsets, which is
exactly why that bug survives testing — so the check now computes a moment
sitting precisely on a 60-second boundary. **Choosing an arbitrary "now" would
have passed the mistake most of the time and failed it occasionally**, which is
worse than either.

**Eighth time a wrong-case has caught a gap in the self-check beside it.**

### I introduced a `render-as-authored` and the audit caught it

One new explanation said *"each request is the first one that key has ever
seen"* — about requests, not options, so the check was a false trigger. **It
does not matter that it was a false trigger:** a flagged question renders
unshuffled, so its keyed answer sits at the authored index. Reworded, back to
0. That check has now earned its place twice in three days.

### b4/0002 — the grace window went from described to implemented (2026-08-22)

M3: **`refreshOutcome`**. 21 self-checks, 12 wrong-cases. Was `unverifiable`
with no wrong-cases since 2026-08-16; now **verified**. All 19 email references
gone — the two that remain say *"there is no email"*.

**The lesson was already good, which changed the job.** It had *Why this way*,
*When this breaks* with five subsections, and a cost table. It had already
found its own reuse-detection bug and its own log-everyone-out bug. What it did
**not** have was any of it executing, and one section that said *"nobody has a
perfect answer… decide it deliberately"* about the grace window — which is a
fine thing for prose to say and a bad thing for a lesson to leave as prose.

Now implemented, and the two ways it goes wrong are the exercise:

- **A replay must return the existing successor, not rotate again.** Rotating
  on a retry forks the chain, so the client holds one token while the newest
  row is another — and **the *next* genuine refresh is then reported as
  reuse.** The failure surfaces one request after the bug, which is what makes
  it expensive to find.
- **The window is measured from `superseded_at`, not from creation.** A session
  refreshed every fifteen minutes for a month is otherwise never inside any
  window you pick.

### `revoked_at` and `superseded_at` are now separate columns

Both make a row unusable and **they mean opposite things.** Rotated away is
probably a retry; deliberately killed is not, and it must **never** revoke the
family — the user ended that session on purpose, and treating it as theft logs
out every device they chose to keep.

The old code had one column and therefore could not tell them apart. This is
the same shape as `a11/0005`'s two counters and `b4/0001`'s two meanings of
`expires_at`: **one name covering two events is a bug waiting for the second
event to happen.**

### The wrong-case that is a denial-of-service handle

*"An unknown token is suspicious, so revoke the family to be safe."* There is
no family — no row matched, so there is no `family_id` to revoke. And if it
somehow worked, **anyone could log out any user by posting random bytes.**
An unknown token teaches you nothing and must cost nothing. That is now the
first rule of the exercise and the first wrong-case.

### Sessions never expiring made the device list load-bearing

`expires_at` is gone from `refresh_tokens`. Family-based revocation already
existed and was **unusable on its own**: it revokes *a* family and nothing let
a user say which. So `device_label` and `last_used_at` were added, and the
exercise now includes `GET /devices` and `DELETE /devices/:familyId`.

**With no expiry, revocation is the only way a session ends — and a revocation
nobody can reach is not a control.** Without that screen the only exit from a
compromised session is deleting the account.

### Settled 2026-08-22, fourth round

Four more, all surfaced by the B4 work rather than carried over.

| Question | Answer |
|---|---|
| **Session lifetime** | **Effectively forever.** The refresh token *is* the device credential |
| **OTP rate limiting** | **Per-number, per-IP, and a daily cap** |
| **`display_name`** | **Collected immediately after first verification**, on a screen that cannot be skipped |
| **C5 vs B2 ordering** | **Write C5 next, after B4** |

**Session.** `b4/0002`'s 7-day refresh expiry is removed; the 15-minute access
token stays. Two reasons, and the second decides it: a re-login SMS costs money
and **proves nothing**, since the attacker holding the phone also receives the
code; and a stolen unlocked phone is `a10`'s biometric app-lock problem, which
works at any session age. Revocation becomes **per-device rather than
time-based**, which is the actual rewrite in `0002`.

**`display_name` had immediate follow-through and it was my own defect.**
`b4/0001`'s solution inserted the literal string `'New user'` — a placeholder
that would render to real users as their name. The column stays `NOT NULL`
(nullable was rejected: every render site would then need `?? 'Unnamed'`, the
hazard `a11/0003` found when `''` got through validation), so the row now takes
an unrenderable sentinel and the response carries `needsDisplayName`.

**The subtlety worth keeping: the flag is computed from the current value, not
from whether the row was just created.** `xmax = 0` tells you the row is new,
and using *that* means a user who closed the app on the name screen is never
asked again and keeps the sentinel forever. **"Is this their first visit" and
"is this still unset" are different questions**, and only the second one is
about the thing you actually care about.

### b4/0001 — rewritten as phone + OTP, and the old login's "constant-time" comment was false (2026-08-22)

Renamed `0001-password-hashing-registration.html` →
**`0001-phone-signup-otp.html`**, because the old name described a lesson
that no longer exists. All four referrers swept per the rename checklist:
module README, `0002`'s prev link, `search-index.json`, and the stale
`verification-log.json` key pruned by script.

M3: **`verifyOtp`**. 25 self-checks, 12 wrong-cases, verified.

**The find: the old login's constant-time claim was false, and the lesson
disproved itself three screens later.** The code was:

```js
// Constant-time response: don't reveal whether email exists
if (!user) throw ApiError.unauthorized('Invalid email or password');
const valid = await argon2.verify(user.password_hash, password);
```

The message really is identical on both paths. The *work* is not — no
account is one indexed `SELECT` at ~1 ms, an existing account is that plus
an argon2 verify at ~200 ms. **That gap is visible by eye, on the first
attempt, over ordinary broadband.** And the lesson carried a section titled
*Timing attacks* three screens below, explaining the concept in terms of
string comparison, while its own login leaked the answer by a margin four
orders of magnitude larger than the one it warned about.

**The general form, and the reason this is worth more than the fix: an early
return is a disclosure.** Two branches that must be indistinguishable have to
*do the same work*, not merely say the same words. The same trap reappears in
the OTP flow as skipping the SMS send for an unknown number.

### `expires_at` means the opposite thing one table over

`otp_requests.expires_at` is `NOT NULL`, and a null expiry must be **refused**.
On `tokens`, null means *never expires* and is a normal state. Same column
name, opposite meaning, because an OTP that never expires is a bug rather than
a policy.

**This is the `max_uses` shape again** — a value whose meaning inverts between
two tables — and it is the lesson's headline wrong-case: carrying the `tokens`
habit across produces a one-time code that works forever. The broken-on-purpose
playground opens with exactly that mistake.

### A wrong-case named the wrong check, and the mistake turned out to be worse

The compare-before-cap case was written expecting *"at the cap, the correct
code is still refused"* and did not trip it — because a correct code **does**
still reach the cap test. What it actually breaks is inverted and worse: a
**wrong** code returns `wrong_code` and increments forever, so guessing is
never limited, while the only thing the cap ever stops is the legitimate user
typing the right code. **The guess limit protects nothing and locks out only
the person who should get in.**

Caught by running the case individually rather than trusting the summary line.
It also exposed a genuine hole — nothing asserted that a wrong guess at the cap
is *stopped* rather than counted — so a check was added. **Seventh time a
wrong-case has found a gap in the self-check written beside it.**

### The neighbour contradiction, found by writing the function

`b3/0001` ended: *"Token's answer to a phone number is not to hash it, it is
not to have it."* Written before anyone had asked, and flatly against the
settled decision. Rewritten rather than deleted, because the *reasoning* above
it is correct and only the conclusion overreached:

**The argument was about what a hash protects you from; the decision is about
what the product needs in order to work. A rule derived from the first cannot
settle the second.** What survives is the narrower claim — a hashed phone
number is a lookup key, not an anonymisation — which is exactly why the privacy
policy says *"we store a scrambled version of your phone number"* rather than
*"we do not collect your phone number"*. Re-verified `b3/0001` after the edit;
a prose change to a verified lesson still has to re-run.

---

Four decisions were taken on 2026-08-22 (third round, below). The queue they
produce, in order:

1. ~~Delete the 40 legacy lessons~~ — **done 2026-08-22.** They were already
   fully orphaned: `index.html` linked to none of them, `search-index.json`
   held zero entries and `verification-log.json` zero keys, so only prose in
   `CLAUDE.md` and `HANDOFF.md` pointed at them. **Warnings went 1 → 0**,
   which confirms the last one really was the dead link inside `07`.
2. ~~Rewrite `b4-auth-server`~~ — **done 2026-08-22, all three lessons.** The
   OTP-specific pass landed inside them rather than as a fourth unit: the
   denial oracle and its timing half in `0001`, replay and single-use in
   `0001` and `0002`, DLT template constraints in `0001`, cost control in
   `0003`. All three now verified; the module had **one** verified lesson
   before this session and has three now.
3. **Write C5 — end-to-end encryption.** **`0001`, `0002` and `0003` done
   2026-08-22** — everything ADR-0002 determines. **The remaining two are
   blocked on decisions and must not be guessed:**
   - **`0004` (backup &amp; recovery)** — **unblocked 2026-08-23.** The split:
     everything but message bodies auto-restores from the phone number; a
     12-word phrase, offered and skippable, unlocks message text. Ready to
     write.
   - **`0005` (multi-device)** — **the student chose one device for v1**, so
     this lesson has no product to describe. Options: rewrite it as *"why
     Token is single-device, and what it would cost to change"* — which is
     genuinely useful, since the answer shapes C5's whole key model — or drop
     it and make C5 four lessons. **Decide when `0004` lands.**
4. **`a3/0002` M3 extraction**, then **`a2` runtime type guards**.
5. The small `a8/0004` fix — `tokenCode` is sent over the WebSocket on every
   chat message, twice. The holder knows the code so nothing leaks to *them*,
   but it lands in server logs and Redis pub/sub payloads against ADR-0007,
   and the holder JWT already carries `conversationId`. Not a decision, just
   not done yet.

### C5 comes after B2, and the plan says the opposite

`TOKEN-TRACK.md` line 255 says C5 **"MUST precede B2"**. B2 is written and C5
does not exist, so on the face of it the plan was violated. **It was not, and
the reason matters:** `b2/0002` did the E2EE schema rewrite already —
`ciphertext`, `nonce`, `key_version`, no `content` column — so B2 was written
*E2EE-aware* without C5 existing. The dependency was real and it was satisfied
by anticipation rather than by ordering.

What is genuinely missing is everything about the keys themselves: generation,
distribution, verification, backup and multi-device. Two things now wait on it:

- **The `participants` orphan table**, one of the two known-and-blocked items,
  whose real gate has always been C5.
- **The SIM-swap constraint**, handed to C5 by this session's OTP decision:
  whoever controls the SIM controls the account, so **the key backup must not
  be recoverable by SMS alone.** It is recorded in `CLAUDE.md` and is the first
  thing C5 has to answer.

`TOKEN-TRACK.md` needs its line corrected when C5 is written — not to say C5
came late, but to say the prerequisite was met differently than planned.

### Rewriting `b4-auth-server` for phone + OTP

**All three lessons are email-coupled, not just the first** — `0002` has 19
references and `0003` has 35, so "fix `0001` and move on" would leave the
module contradicting itself.

| Lesson | Currently | Becomes |
|---|---|---|
| ~~`0001`~~ | ~~argon2 over email + password~~ | **Done 2026-08-22.** Renamed to `0001-phone-signup-otp.html`; `phone_hash` with a pepper, OTP issue/verify, the denial oracle and its timing half, DLT. M3 on `verifyOtp` |
| ~~`0002`~~ | ~~email-keyed, 7-day refresh expiry~~ | **Done 2026-08-22.** Expiry removed, `superseded_at` split from `revoked_at`, device list added, grace window implemented. M3 on `refreshOutcome` |
| ~~`0003`~~ | ~~email-keyed rate limiting + account lockout~~ | **Done 2026-08-22.** Three OTP layers, lockout deleted outright. M3 on `checkLimits`. **B4 complete** |
| ~~old `0003` note~~ | **Gains real substance.** Three layers now decided: ~1 code per number per 60s, ~5 per number per day, and a per-IP ceiling. The daily cap is the one that bounds the bill — without it a script walking the number range costs real money whether or not anyone signs up. Per-IP alone was rejected: Indian carriers NAT huge numbers of users behind shared addresses, so a useful limit locks out real people. 35 email references |

**The OTP-specific pass** — the student chose the option that includes it.
Nothing in the course currently covers: the denial oracle in the OTP response
(fifth layer), OTP replay and expiry windows, single-use enforcement, and the
DLT template constraint that the message text is *pre-registered* and cannot
be composed at send time.

### Sign-in is by phone number — settled 2026-08-22

The student was asked in concrete terms (*"when you lose your phone and
reinstall Token, what do you type to get back in?"*) with the costs of all
three options laid out, and chose **the phone number**. So:

- `users` keeps `phone_hash`, `display_name`, `avatar_url`. **No `email`
  column, now or later.** `b2/0001` and `CLAUDE.md` were right; `b4` is the
  outlier.
- `a11/0005`'s store declaration is already correct and needs no change.
- **Do not reconcile the two by adding an email column.** That is the tempting
  move and it is backwards.

**What is settled is the identifier, not the challenge.** How a user *proves*
they hold the number is a genuinely separate question and it is open — see
below. `b4/0001` can be rewritten around `phone_hash` without answering it,
because the hashing, the normalisation and the enumeration argument are the
same either way; `b4/0002`'s login flow probably cannot.

| Lesson | Currently | Needs |
|---|---|---|
| `b4/0001` | `ALTER TABLE users ADD COLUMN email`, argon2 over a password, `/register` + `/login` on email | `phone_hash` on the existing column. **`b3/0001` already wrote the right hashing argument** — a bare `sha256(phone)` is not enough, because ten digits with a known prefix is enumerable. It needs the server-side pepper, exactly as `code_hash` does |
| `b4/0002` | login/session on email | the same flow keyed on `phone_hash`, and this is where the challenge question lands |
| `b4/0003` | (check before assuming) | — |

**One thing to carry in: `b4/0001`'s "constant-time response" note is good and
should survive the rewrite.** It refuses to say whether the account exists —
which is the denial-oracle rule from `b7/0001`, `a8/0002` and `b3/0004`, for
the fourth time. On a phone-keyed login it matters *more*, not less: the
identifier is enumerable, so an endpoint that distinguishes "no such account"
from "wrong credential" is a registered-user oracle over the whole Indian
mobile range.

**The prediction that a lesson had nothing runnable in it was wrong 15 times
out of 15.** `--unverifiable` was reached for exactly zero times across the
whole of M3. Retire the reflex, not just the count.

The next thing worth doing is **one of these, and it is the student's call**:

1. **Answer open question 0** — phone or email sign-in. It is the only thing
   here that blocks real work: `b4` is a whole module written the other way,
   and `a11/0005`'s store declaration now depends on the answer.
2. **Check the message-touching modules against ADR-0002** (B5, B8, legacy
   `04`). A6 mentioned E2EE zero times until it was checked.
3. **Phase 3** — the ten C-modules, just-in-time. The student is nowhere near.

Given the student is partway through Module 01, **(1) is the only one with a
deadline attached, and it is a two-minute question.**

| Work | Gate |
|---|---|
| ~~**M3** — extract the plain function from the logic-rich lessons~~ | **done 2026-08-22**, 37 lessons |
| **Decide phone-vs-email sign-in** — `b4` contradicts `b2/0001` and `CLAUDE.md` | needs the student; see *Open questions* 0 |
| **Check the message-touching modules against ADR-0002** — A6 mentioned E2EE zero times until 2026-08-20 | none; likely candidates are B5, B8 and the legacy `04` |
| A TypeScript-aware runner, so `a2/*` and `a3/0002` can be verified | needs a decision first — see *Open questions* |
| **Phase 3** — the ten C-modules | just-in-time; the student is nowhere near |
| **Phase 4** — the operating track | after launch |
| The **two** remaining orphan tables | `participants` behind C5/E2EE, `calls` behind B6. Parked in `scripts/known-issues.json`; `deletion_queue` closed 2026-08-22 |
| ~~`users.phone_hash`~~ | **settled 2026-08-22** — keep the column, fix the sentence. See above and `CLAUDE.md` |
| ~~The one remaining warning — a dead link in legacy `07`~~ | **closed 2026-08-22** by deleting the legacy modules. Warnings are now **0** |

**Do not ask the student where they are in Module 01.** They asked on
2026-08-18 not to be asked again. Do not infer it from the files either — that
inference is what produced the "Modules 1 and 2 complete" claim that mispitched
the course for months. Pitch to the profile in `CLAUDE.md` and let them steer.

### Settled 2026-08-22, second round

The student asked to be given every open decision at once, with options. Four
were put; three came back decided.

| Question | Answer |
|---|---|
| **Proving the phone number** | **SMS OTP through an aggregator.** The third party is accepted, on the FCM/APNs precedent |
| **Expiry modelled twice** | **Keep both, state precedence** — `tokens.expires_at` wins, the `ExpiryPayload` rule is a display convenience |
| **Lookahead** | **Keep working ahead.** Asked and answered four times now; stop re-asking |
| TypeScript runner | Deferred to a recommendation — see below |

**On the OTP answer — what it commits you to, so nobody re-litigates it.**
An SMS aggregator joins FCM/APNs as an accepted third party. The reasoning
that makes it consistent rather than a hole in the rule: `CLAUDE.md` bans
third-party *comms SDKs* because they would carry the conversation, and the
conversation is what E2EE exists to protect. An OTP carries a six-digit
number to a phone the user already owns, once. **The banned SDKs replace the
product; this one authenticates entry to it.**

Two things that follow and have a lead time, so they are not "later":
- **DLT registration with TRAI**, plus a registered sender header and
  pre-approved templates. Paperwork measured in weeks, not a signup form.
- The OTP is a **denial oracle by construction** — "we sent a code" versus
  "no such account" tells an enumerator which numbers are registered, over
  the whole enumerable Indian mobile range. `b4/0001`'s constant-time note
  already has the right instinct; it now has to survive into the OTP flow.
  Fifth layer of the same rule.

**On the expiry answer.** The student chose the documented-precedence option
having been shown that two writable copies of one fact is the shape that
produced the `max_uses` bug. Their call, and it is recorded. **The way to
honour it without inheriting that risk is the mechanism this project already
adopted for `status`/`paused_at`/`revoked_at`: make the agreement a database
fact rather than a convention.** A `CHECK` that refuses a rules payload whose
expiry disagrees with the column turns "documented precedence" into
"enforced precedence" at the cost of one constraint. Propose it when B2 is
next touched; do not silently implement the other option.

### Settled 2026-08-22, third round

Four more put to the student with options; all four came back decided.

| Question | Answer |
|---|---|
| **Password as well as OTP?** | **No password at all.** The OTP is the login; the device holds the credential |
| **B4 rewrite scope** | **All three lessons, plus an OTP-specific pass** — the fullest option |
| **TypeScript runner** | **Recommendation taken** — no runner |
| **The 40 legacy lessons** | **Delete them.** They are in git |

**The password answer removes `b4/0001`'s subject.** It is not "swap email for
phone" — argon2, `password_hash` and the whole hashing narrative go, because
there is no longer a user-chosen secret to hash. What replaces it is OTP
issuance and verification over `phone_hash`.

**And it hands C5 a hard constraint, recorded in `CLAUDE.md`: whoever controls
the SIM controls the account.** Acceptable for the account — an attacker gets a
token list, which is recoverable. **Not** acceptable for message history, so
the E2EE key backup must never be recoverable by SMS alone. C5 designs the
second factor; the requirement is now written down so C5 cannot quietly skip
it.

**On deleting the legacy 40.** `04` (7), `05` (9), `06` (7), `07` (7), `08`
(9), `09` (7). Firebase's `03` went the same way on 2026-08-16 and nobody has
missed it. Before deleting, sweep what points at them — `index.html`,
`search-index.json`, module READMEs, and `scripts/known-issues.json` — because
**a rename is never just the file** and a delete is a rename with no
destination. The audit's one remaining warning is a dead link inside `07` and
should disappear with it; if it does not, the warning was pointing somewhere
else and that is worth knowing.

### The TypeScript four — recommendation given 2026-08-22 and accepted

`a2/0001`, `a2/0002`, `a2/0003`, `a3/0002`. **Do not build the runner.** The
evidence that decides it is not about tooling:

- **Three of the four have no runtime behaviour at all.** The exercises are
  *"Define the TypeScript types for Token's core data model"* and *"Build
  Token's API type system"*. Strip the types and the file is empty. A
  strip-and-run verifier would execute nothing and report success — the worst
  possible outcome, since `verified` would then mean less than `unverifiable`
  does now.
- `a2/0003` is a React Native screen and is unverifiable in any language.
- **`a3/0002` is the exception and needs no TypeScript support**: it has a
  real generic `request` function. That is an ordinary M3 extraction.
- Node here is **v24**, which strips types natively, so the cheap option is
  free — and worthless for exactly the lessons it was meant to help.
- The project has **no `package.json` and no `node_modules`.** `tsc` is the
  only thing that would genuinely verify a type declaration, and it costs
  that property.

**The recommendation instead: apply M3 to `a2` by adding runtime type
guards.** `isToken(x): x is Token` next to `interface Token` is idiomatic,
useful to Token specifically (it is what should validate an API response),
executes, and self-checks.

**And it closes a real gap: `a2` never says that types are erased at
runtime.** A grep for it finds nothing — the only "at runtime" mentions are
quiz distractors about performance. That omission matters most at `a3/0002`,
the API client, where the beginner conclusion *"I annotated the response as
`Token`, so it is a `Token`"* is exactly wrong and exactly what a hostile or
merely out-of-date server will punish.

### Open questions for the student

**None.** Everything that was open has been decided across the three rounds on
2026-08-20, -21 and -22. Do not invent one to fill this space — if a decision
is genuinely needed, it will surface from the work.

**The lookahead question is closed. Stop asking it.** It was raised on
2026-08-18, -20, -21 and -22 and answered "keep going" every time. Four
identical answers is the student telling you it is not a live question.

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
| **M3 — the plain function in Track A/B lessons** | **done 2026-08-22** — 37 lessons. A3, A4, A5, A6, A8, B5, all of B2, B3, B7, B10 and A11, plus A7's `0005` |

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
| `b3/0003` | `buildPage` | the `limit + 1` probe is not content; the cursor comes from *items*, never from `rows` |
| `b3/0004` | `toErrorResponse` | helpfulness is scoped to who is asking; never `err.message`; validate `err.status` |
| `b3/0001` | `checkEnv` | report *all* problems; `'undefined'` is a string; the result is going into a log |
| `b10/0001` | `pickForLog` | allow-list, not deny-list; a value not a subtree; absent ≠ `undefined` |
| `a11/0004` | `placeConfig` | *who needs it, and when* — not *is it sensitive*; unclassifiable ⇒ do not ship |
| `b10/0002` | `planErasure` | order is read off the foreign keys, never off the list you were handed; a cycle is refused, not guessed; only data you could *read* leaves a backup tail |
| `a11/0003` | `toCreateTokenPayload` | blank is an absence, never `''`; `maxUses: 0` and absent are opposites; an unreadable value is refused, never defaulted |
| `a11/0002` | `auditContrast` | the sRGB gamma decode, which the usual anchors cannot catch; a pair is audited, not a colour; a value with alpha has no ratio and must be skipped, not scored |
| `a11/0001` | `swipeOutcome` | the threshold is a *fraction* of the width, never a pixel; a flick back vetoes a committed distance; `commit` decides the gesture, never whether the action asks first |
| `c5/0003` | `safetyNumber` | both ends must derive the identical value, so the order comes from the keys and never from the caller; the number binds *both* keys; too short is refused, never truncated |
| `c5/0002` | `classifyPeerKey` | a missing key is blocked, never downgraded to plaintext; exactly one branch may pin; a rotation increments and a substitution does not |
| `c5/0001` | `planKeyInit` | only `null` is a first run — `''` is a locked Keychain; a key that will not load is refused, never regenerated; length is not validity |
| `b4/0003` | `checkLimits` | a sliding window, never a bucket that resets; the per-number limits cannot see an enumerator at all; `retryAfterMs` comes from the oldest live stamp |
| `b4/0002` | `refreshOutcome` | an unknown token must cost nothing, because there is no family to revoke and garbage would otherwise log anyone out; a replay returns the *existing* successor, never a fresh rotation; logout is not theft |
| `a11/0005` | `planRelease` | an OTA moves no numbers, because bumping the version is what stops it reaching anyone; `versionCode` never resets and `buildNumber` always does; a crypto change is plain JS and still needs a reviewed build |
| `b4/0001` | `verifyOtp` | a null `expires_at` is refused here and honoured on `tokens`; the cap gates the comparison rather than reporting on it; every refusal is byte-identical and the reason exists only for the log |

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

**M3 is done.** Of the 30 lessons still `unverifiable`: **~26 are genuinely
infra** (a device, a VPS, two phones, a live TURN server) and **4 are
TypeScript**, which the runner cannot execute at all. Any further gain needs
the TypeScript runner — see *Open questions* 2 — or a rewrite, not another
extraction pass.

**The A5/A7 prediction held all the way to the end.** `a11/0005` was the last
pre-pattern lesson checked and it had neither an `explain.js` script tag nor a
`createExplain` prompt, exactly like `a5/*` and `a7/0005`. Both added. Assume
the gap in any module written before the practice pattern became universal.

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
- **When you fix a lesson's prose, fix its `createSolution` in the same
  commit.** Twice now (`b10/0001`, `b10/0002`) the body was corrected and the
  revealed solution — the copy the student actually pastes — kept the defect.
  They are different strings and only one of them gets re-read.
- **Check every column name against the migration, not against memory.**
  `b10/0002` named seven that do not exist. `verify-lesson.mjs` cannot see SQL,
  so a `<pre>` block full of confident queries is unchecked by anything.
- **A wrong-case must differ from the right answer in exactly one way.** Six of
  `b10/0002`'s tripped two checks until they were tightened, which hides which
  distinction each one tests — and one of them was then failing for a reason
  that had nothing to do with the case at all.
  **`a11/0003` is the pattern that makes this structural rather than careful:**
  one correct implementation split into named fragments, and each mistake
  overrides exactly one. Shorter file, and single-variable by construction.
  A case may still trip several checks — that is fine when one behavioural
  change genuinely has several consequences, and wrong when the extra failure
  comes from something you forgot to include.
- **When a value cannot be understood, refuse it — never substitute a
  default.** The default you reach for is always the permissive one, because
  permissive is what "no opinion" looks like. `b7/0002`, `b3/0001`, `a5/0005`
  and now `a11/0003`.
- **Check the quiz for executable questions.** `a11/0003` had 25 and **none**
  the verifier could run — all framework API trivia. A lesson can be fully
  "verified" with an entirely unchecked quiz.
- **A self-check must never dereference a lookup that can miss.**
  `find(list, name).ratio` throws when a mistake puts the entry in a different
  bucket, and a throw aborts every check below it — so the case reports
  "passed everything" or "could not run", both of which read as a broken
  verifier. Write a `bucketOf`/`valueOf` helper that returns a sentinel.
  **Three of `a11/0002`'s eleven cases were hidden by this**, in a self-check
  written the same day as the note warning about it.
- **An early return is a disclosure.** Two branches that must be
  indistinguishable have to *do the same work*, not just say the same words.
  `b4/0001`'s old login returned the identical message and leaked the answer
  by 200 ms, under a comment that said "constant-time". Check the *cost* of
  each path, not only its output.
- **A value's meaning can invert between two tables.** `expires_at` null means
  *never* on `tokens` and is *refused* on `otp_requests`. Same name, opposite
  rule, because the domains differ. This is the `max_uses` shape, and the tell
  is a field you already have a confident habit about.
- **When a wrong-case names a check and trips a different one, believe the
  runner.** `b4/0001`'s compare-before-cap case did not break what the comment
  claimed; it broke something worse and inverted. Run the case on its own
  rather than reading the summary line — and expect the real failure to be
  more interesting than the one you predicted.
- **A check that cannot fail is not a weak check, it is noise.** It costs a
  line, reports PASS forever, and makes the suite look more thorough than it
  is. `c5/0003` asserted a function did not reorder the caller's array when
  the function takes two strings — unfalsifiable, and only the wrong-case
  found it. When you write an assertion, ask what input would make it fail.
- **A compliance form is read off the schema, never off memory.** `a11/0005`
  declared an `email` column that has never existed and omitted the
  `phone_hash` that does. The second is the one that removes an app: declaring
  data you do not hold is embarrassing, failing to declare data you do hold is
  a breach of a binding statement. Same move that found `b10/0002`'s seven
  invented columns — open the migration next to the document.
- **"We hash it" is not a reason to leave it off the form.** Collection is
  about what leaves the device. A hash of an enumerable value — a ten-digit
  Indian mobile with a known prefix — is a lookup key, not an anonymisation.
- **A marketing version number is a decision about who receives the fix.**
  Under `runtimeVersion: { policy: 'appVersion' }`, bumping `version` for a
  JS-only OTA sends it to a binary nobody has installed. It reaches zero users
  and nothing reports an error. Asking for a new version number *is* asking for
  a new build.
- **`versionCode` never resets; `buildNumber` always does.** Applying the iOS
  rule to Android burns the range permanently — no rollback, no support ticket.
  It is the second number in this course with no undo, after `revoked_at`.
- **An animation that removes something is a claim that it is gone.** Fire it
  from the state changing, never from the gesture ending. `a11/0001` animated
  the card off-screen and *then* called revoke, so a failed request left the
  user believing a live token was dead. The general test: **if the request
  fails, does the screen still say it worked?**
- **When a lesson loses a field, grep its `key=` too.** `a11/0001` had
  `key={token.code}` on a list whose response has no `code` — so every key was
  `undefined`, React fell back to the array index, and *removing the first row
  animated the wrong card out*. A data-shape bug that presents as an animation
  bug, which is the hardest kind to trace backwards.
- **Pick the fixture that isolates the variable you are testing.** `a11/0002`'s
  channel-weighting case was aimed at the wrong check, because greys are the
  one input where weighted and unweighted luminance nearly agree. Pure blue
  separates them 8.59 vs 2.74. **Anchors that are famous are usually the ones
  that discriminate least** — black-on-white is exactly 21 with or without the
  sRGB gamma decode, which is the actual bug.

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
- **Warnings are at 0** as of 2026-08-22, the first time. The last one was a
  dead link in legacy `07` and it went when the legacy modules did. Every
  warning this audit has ever raised turned out to be correct content, so
  **the next one to appear is real** — there is no longer any standing noise
  to explain it away as.
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
