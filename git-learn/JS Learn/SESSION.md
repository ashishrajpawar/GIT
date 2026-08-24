# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

> **Do not ask the student where they are in the course.** Asked 2026-08-23
> and declined: *"dont ask as it wont affect your work or plan."* That closes
> it the way the lookahead question was closed. **`CLAUDE.md`'s other rule
> still stands and is now the whole rule: never *infer* progress from the
> files either.** Make no claims about progress at all — not in prose, not in
> a commit message, not as a reason for prioritising anything.

**Nothing in flight.** Working tree clean, everything committed.

**Started the `unverifiable` cluster** — the recommended body of work in
*Next action*. A7, A10 and X1 are finished; B9 is two of three. 6 to go.

**State as of 2026-08-23** — run `node scripts/audit.mjs` before trusting any
of it:

- **101 lessons.** Audit **green**, 2 warnings, six suites pass.
- **Every lesson has been executed at least once.** The verification log has
  no absent entries: **95 verified, 6 `unverifiable`** with a stated reason,
  1 `nothing-to-verify`. All four remaining A7 lessons moved across on
  2026-08-23/24.
- **`known-issues.json` is down to one entry** — `calls`, gated on B6.
- `render-as-authored` is **0**, and this time it means it (see *The `variant`
  blind spot*).
- **Complete modules:** 01, 02, A2, A3, A4, **A7**, **A10**, B1, B2, B3, B4,
  B7, B10, A11, C5, X1, X2.

**Nothing is blocked.** See *Next action* for the four candidate bodies of
work and why the `unverifiable` cluster is the recommendation.

### b9/0002 — present is not usable, and a flag nobody read (2026-08-24)

M3: **`checkEnv`**. 17 self-checks, 8 wrong-cases.

**The downstream-grep rule earned its place on its first outing.** It found
three leftover `dist/server.js` references from yesterday's `rootDir` change
— two in `b9/0001` itself and one in `b3/0001`, which was re-verified.

### The startup check tested presence, not shape

The lesson says a container that boots with a bad secret *"turns a
configuration mistake into an incident"* — and then checked only
`!process.env[k]`.

**The realistic failure is specific.** The pepper is 64 hex characters, the
key is base64, both are "32 random bytes" from a one-line
`crypto.randomBytes(32)`, and the two commands differ only in the encoding at
the end. Paste the hex one into `TOKEN_CODE_KEY` and it is **48 bytes of
perfectly valid base64** — present, non-empty, check passes, container starts,
health check green, and `createCipheriv` throws on the first token created.

**A check that only asks "is it set?" turns a missing variable into a clean
refusal and a malformed one into a 3am page.** And the one you got wrong is
the likelier mistake, because you had to be thinking about it to set it at
all.

### ADR-0007's rule generalises to config diagnostics

The helpful message is *"expected 32 bytes, got 48 (aG0xN…)"*. That prints a
production secret into a deploy log — read by more people than the database
is, kept longer than anyone intends, shipped to whatever collects build
output. **A diagnostic about a secret may name the variable and describe the
fault, and must never quote the value.** "got 48" is enough to fix it.

### And b9/0001's first shutdown step was a no-op

`b9/0001` opens its handler with *"fail readiness first, so the proxy stops
sending new requests"*, calls `setNotReady()`, and waits two seconds.
**`b9/0002`'s `/health` never read that flag.** So the proxy noticed nothing,
kept routing for the whole two seconds, and kept routing while the pool
closed.

Neither file is wrong alone — one sets a flag, the other answers a question,
and they never agreed it was the same flag. **The most carefully reasoned step
in the shutdown sequence was a two-second pause that achieved nothing.**
Fourth time this session a defect has existed only *between* two lessons.

### Two self-check holes, both about unreachable code

- **The `break`-at-first-fault mistake passed everything**, because I put the
  break at the *bottom* of the loop and every branch `continue`s before
  reaching it. Moved to the top.
- **My "not a URL" fixture was a valid URL.** `new URL("pgbouncer:6432/token")`
  parses happily — `pgbouncer:` is a legal scheme — so the fixture never
  reached the throwing path it existed to test. Now `"not a url at all"`.

### b9/0001 — a shutdown sequence with no total, and a correction to x1/0003 (2026-08-24)

M3: **`planShutdown`**. 15 self-checks, 7 wrong-cases. The lesson already had
a layer-caching playground and 3 executable questions, so the M3 went to the
part with a real defect.

**The shutdown handler was well argued and had no budget.** Docker sends
SIGKILL ten seconds after SIGTERM, and `server.close()` is unbounded — worse,
**it does not close idle keep-alive connections at all**, so a browser holding
a connection open for its next request keeps the server "busy" indefinitely.
The handler written to prevent an ungraceful exit produces exactly one, and
takes the full ten seconds doing it.

**The symptom is a deploy that takes a fraction over ten seconds**, which
nobody reads as a bug report.

Fixed with `closeIdleConnections()` plus a race against a hard ceiling, and
the ceiling comes from `planShutdown`.

### Which phase may be cut is a design decision, not an average

- **Readiness is fully compressible** — it is an optimisation, and cutting it
  only means some in-flight requests fail.
- **Closing the pool and Redis is not** — that is the step that stops work
  being stranded, which is the entire reason for a graceful shutdown.
- **Slack goes to the drain**, never back to the wait. One wrong-case does
  exactly that: it fits, it exits cleanly, and it spends six seconds standing
  still while real requests get the minimum.

### ⚠ A correction to x1/0003, made an hour after writing it

**I recommended removing `rootDir`, and that was the weaker of the two
fixes.** Deleting it makes TypeScript *infer* the root as the common ancestor
of whatever files happen to be inputs — so:

- adding an import from `shared/` to a project that had none **moves every
  output file**, and
- the calculation runs again inside Docker against a different layout, giving
  **a different output path from the same source**.

`b9/0001`'s `CMD ["node", "dist/server.js"]` is the proof: in the repo the
inferred root is the repo root, in the container it is `/app`. Now
`"rootDir": ".."` — explicit, deterministic, and the `CMD` says
`dist/api/src/server.js` with a callout explaining why.

**The general rule: an inferred value feeding a hard-coded path is a
coincidence waiting to be noticed.** Both lessons now say so, and both were
re-verified.

**Worth noting how it was caught** — not by re-reading `x1/0003`, but by the
next lesson's Dockerfile disagreeing with it. That is the sibling-lesson
pattern again, and this time the sibling I had to check against was my own
work from an hour earlier.

### x1/0003 — paths is a router, not a dictionary, and X1 is finished (2026-08-24)

M3: **`resolveAlias`**. 15 self-checks, 8 wrong-cases, 2 new executable quiz
questions. **X1 is complete — three of three.** The "git and shell setup
rather than runnable code" excuse was wrong all three times, and all three
turned out to be an algorithm with a **precedence order**.

**`paths` looks like a dictionary lookup and behaves like a longest-prefix
router.** An exact pattern beats every wildcard; among wildcards the longest
*prefix* wins; the order they are written in is irrelevant.

**In a monorepo the wrong answer is usually a file that exists.** So resolving
against the wrong pattern does not give "cannot find module" — it gives a type
error about a symbol you have never heard of, in a file you did not mean to
open.

### The config defect: rootDir and a shared folder cannot both hold

`api/tsconfig.json` had `"rootDir": "./src"` and imports `@token/shared/*`
from outside it. That is `TS6059`, and with `declaration: true` the build
simply stops.

**The alias is not a trick that copies the file in.** It resolves to a real
path outside `api/`, so that file becomes an input to the api build — and
`rootDir` is a promise that every input lives under one directory. Removing
`rootDir` is the fix; TypeScript then infers the common ancestor and the
output nests one level deeper, which is a Dockerfile path change and nothing
more.

### Three mistakes passed everything, and the fixture was the reason

The first draft's precedence fixtures used `"@token/*": ["./*"]` against
`"@token/shared/*": ["./shared/*"]` — and **both resolve `@token/shared/types`
to the same string**, so first-match, last-match and longest-prefix were
indistinguishable. `CLAUDE.md` states the rule I broke: *choose fixture values
that differ from what a wrong answer would produce.*

Two more fixtures proved nothing for the same family of reason: the
length-guard case failed the `startsWith` test first, so the guard was never
reached, and the longest-prefix-versus-longest-pattern case used patterns
where both metrics agree.

### Two wrong-cases were written and then deleted, with the reasons kept

Flagging these rather than quietly dropping them:

- **`>=` instead of `>` on prefix length** differs from the correct answer
  *only* when two prefixes are the same length, and **what TypeScript does on
  that tie is not something I am confident enough to teach.** A wrong-case has
  to encode a rule you are sure of, so it is gone rather than guessed at.
- **The two-star guard is unreachable.** With a prefix/suffix split a key like
  `@token/*/*` leaves a literal `*` in the suffix, which no ordinary specifier
  can match. The guard stays in the solution as belt-and-braces, but the
  self-check *cannot observe it* — and **a rule you cannot test is worth
  knowing you cannot test.**

### x1/0002 — the check that cries wolf, and the one that stays silent (2026-08-24)

M3: **`findConflicts`**. 14 self-checks, 8 wrong-cases, 2 new executable quiz
questions.

**The defect: `git add .` in the conflict-resolution recipe.** Git will stage
and commit a file still containing `<<<<<<<` without a word — conflict markers
stop being special to git the moment the merge is over. The recipe now runs
`git diff --check` and adds files by name.

### A detector has two ways to be useless, and this one is unusual in testing both

Almost every wrong-case in this course so far fails in one direction. Here
they split:

- **Too eager.** Searching lines for `=======` fires on Markdown setext
  heading underlines, ASCII table borders and comment banners. The new quiz
  question runs it over eight lines of ordinary Markdown and gets **three
  false positives and zero conflicts**. A check like that is switched off
  within a week, and then the real one goes unread.
- **Too quiet.** Missing the diff3 `|||||||` base section, missing markers
  behind a trailing `\r`, dropping a conflict left open at EOF.

**This repo has the scar for the first kind:** `check-pre-blocks.mjs` fired 71
times on its first run and every hit was wrong.

**The fix is not a cleverer test for the divider.** It is that only
`<<<<<<<` opens a conflict — everything else is ordinary text until something
has opened. One rule, and every false positive above disappears.

### Two fixtures that proved nothing until they were sharpened

Both found by a wrong-case tripping the wrong check:

- **The CRLF fixture used *labelled* markers.** `<<<<<<< HEAD\r` still has a
  space at index 7, so it survives the stray carriage return by luck — and an
  implementation that never strips anything passed. Only the **bare** form,
  where index 7 *is* the `\r`, tells them apart.
- **The embedded-marker fixture had no embedded *opener*.** It contained a
  `=======` and a `>>>>>>>` inside lines, and since neither can open a
  conflict, the `includes`-based mistake passed it happily.

### And the self-check caught one of my own alternatives

The reduce-based "correct alternative" **never reported a conflict left open
at EOF** — reduce has no natural place for the after-the-loop step, so the
first draft simply dropped it. The self-check failed it, correctly.

Worth recording because it is the mechanism running the other way: the
alternatives exist to prove the check accepts different *styles*, and this
time the check proved one of the styles was not a correct implementation at
all.

### x1/0001 — .gitignore is not configuration (2026-08-24)

M3: **`isIgnored`**. 24 self-checks, 10 wrong-cases, 3 new executable quiz
questions. First of the X1 trio, and **the "git and shell setup rather than
runnable code" excuse was wrong again** — `.gitignore` is a pattern language
with a precedence order and a tree walk.

**The rule that costs an afternoon, and it is not a precedence rule at all:**

```
node_modules/
!node_modules/patched/index.js     # does nothing
```

Git does not evaluate patterns against every file. It **walks the tree, and
never descends into an excluded directory** — so the negation naming the file
inside is never reached. The negation did not lose the precedence contest; it
was never considered. That is exactly why `node_modules/*` behaves
differently: excluding the *contents* leaves git willing to look inside.

The wrong-case for this is the interesting one — an implementation with
**perfect precedence and no ancestor walk** gets it wrong, so getting
precedence right does not fix it.

### Three more rules that are one character apart

- **A bare name matches at any depth.** `.env` is not "the `.env` in the
  root"; it matches `api/.env` too.
- **A slash *anywhere* anchors to the root.** So adding one to be "more
  specific" silently changes the rule from *anywhere* to *exactly here*.
- **A trailing slash is directories only**, and leaves a file of that name
  tracked.

### And a real defect in the lesson's own .gitignore

It listed `.env` and `.env.local` — **the two files on the machine today** —
and not `.env.*`. So `.env.production` is committed, silently, because git
only warns about files it already tracks. Under ADR-0007 that file holds
`TOKEN_CODE_PEPPER` and `TOKEN_CODE_KEY`. Added `.env.*` with
`!.env.example`, plus the signing-key patterns (`*.keystore`, `*.jks`,
`*.p8`, `*.p12`, `*.mobileprovision`) — an Android keystore is the one secret
that cannot be rotated for an app already published.

**Ignore the shape of the name, not the names you happen to have.**

### The direction of failure is what makes these hard to find

A `.gitignore` bug that ignores **too much** is loud: the file is missing from
the repo and you notice within the hour. One that ignores **too little** is
silent, and what it commits is the file you were trying to keep out. Six of
the ten wrong-cases fail that way.

### Two bugs that hide each other

An unescaped `.` in the compiled glob and an unanchored regex are separate
mistakes, and **a fixture exercising one will pass an implementation with the
other** — `^.env$` against `aenv.bak` is false purely because of the anchors.
The self-check now has a case for each, added because a wrong-case tripped the
wrong check.

### a10/0002 — the lock that only works if you never change the setting (2026-08-24)

M3: **`applyAppState`**. 18 self-checks, 9 wrong-cases, 2 new executable quiz
questions. **A10 is complete**, and there is no contradiction with the session
decision — this is a lock timeout, not a session expiry, which is what
`CLAUDE.md` intends.

**`inactive` was treated as leaving.** On iOS the sequence out is
`active → inactive → background` and the sequence back is
`background → inactive → active` — so a handler that stamps the away time on
`inactive` **overwrites it with *now* one step before `active` reads it.**
Elapsed comes out at a few milliseconds however long the phone sat on the
table.

**And look at who it affects.** With the default timeout of `0`,
`elapsed >= 0` is still true, so the lock works. It fails only for someone who
went into Settings and chose "after 1 minute" — **the bug is invisible unless
you change the setting the lesson provides a picker for.**

`inactive` is not a departure at all: it fires for the app switcher, a
notification banner, a permission dialog, an arriving call. In every one the
phone is still in the user's hand.

### Two more, both failing open

- **`parseInt` on a corrupt preference gives `NaN`, and `elapsed >= NaN` is
  `false`** — so a damaged setting silently switches the control off. The
  familiar *refuse, do not substitute* rule, with the addition that matters
  for a security control: **the fallback has to be the strict direction.** A
  lock that cannot read its timeout should lock.
- **The `activeCall` guard cleared the away timestamp and returned.** A call
  that *ends while the app is backgrounded* therefore left it unlocked however
  long it had been away. The fix is one field instead of an early return:
  read `inCall` at evaluation time, so the clock survives the call.

### The wrong-case found a hole again, on a one-character difference

`elapsed > timeout` instead of `>=` **passed every check in the file.** The
timeout-0 case is 0.1 seconds away and `0.1 > 0` is true, so nothing separated
the two operators. Added a check that is away for *exactly* the timeout — the
only fixture that can tell them apart, and the one "after 1 minute" actually
means. **Seventh time a wrong-case has exposed a gap in the self-check written
beside it.**

Also worth keeping: one case deliberately fails in the **safe** direction —
ignoring `inCall`, so the user is locked out mid-call. A self-check that only
tests one direction stops being a specification.

### a10/0001 — the body was right and the exercise was wrong, four times (2026-08-24)

M3: **`planChunks`**. 14 self-checks, 7 wrong-cases, 3 correct alternatives.
The lesson already had 5 executable quiz questions.

**A new pattern, and worth checking for directly from now on: the prose was
sound throughout and every defect was in the revealed solution.** A7's lessons
had the answer in the quiz; this one has it in the body, a few hundred lines
above the code that contradicts it.

- **`set(key, value)` took two parameters and `saveRefreshToken` called it
  with three**, so `keychainAccessible` was silently dropped and everything
  got *default* accessibility. The lesson spends four paragraphs explaining
  that the identity key needs `WHEN_UNLOCKED_THIS_DEVICE_ONLY` or it syncs to
  iCloud and hands Apple a copy of the key ADR-0002 depends on. **The class it
  told you to build could not pass the option at all.**
- **`value.length <= MAX_ITEM_SIZE` measured UTF-16 units against a byte
  limit** — the exact mistake the `secureStorage` wrapper earlier in the same
  file warns about, with a comment about `नमस्ते` being 6 units and 18 bytes.
- **`isAvailable()` cached**, commented *"it won't change during a session"*.
  The Keychain is unavailable before first unlock and available after.
- **`StoredCredentials { accessToken, refreshToken }`** against the body's
  *"the access token is not stored at all"*. The methods were right; the type
  was a contradicting leftover — `a3/0002`'s root cause again.

Also fixed `get()`, which returned `null` both for *absent* and for *Keychain
unreadable*. It now throws on unreadable. Collapsing those means a locked
Keychain at startup reads as "logged out" — and for the identity key, as
"generate a new one", which orphans every message on the device.

### The bug is at encode time, which is why the obvious check cannot see it

Slicing a string by index can cut a surrogate pair in half. But **in pure
JavaScript `s.slice(0,5) + s.slice(5)` reproduces `s` exactly**, even across
that pair — so a plain `join()` round-trip assertion passes on the broken
implementation.

The corruption happens when the chunk is **encoded to UTF-8** to be stored: a
lone surrogate has no UTF-8 representation, so it becomes **U+FFFD**, and the
write *succeeds*. My first self-check missed the very bug it was written for,
and only the wrong-cases showed it. The checks now model what the Keychain
actually does — encode going in, decode coming back.

**A refresh token is base64, so every boundary in it is safe.** The corruption
needs a multi-byte character near a chunk boundary, which is why an app for the
Indian market should assume it rather than hope.

### Three corruptions, kept distinguishable by check order

Index-slicing corrupts emoji but **not** Devanagari, which is all BMP.
Byte-slicing corrupts both. Counting `.length` corrupts neither and just
produces over-sized chunks. Ordering the checks *Devanagari round-trip → emoji
round-trip → Devanagari byte limit* is what makes each of the three trip a
different check first; any other order collapses two of them together.

### I walked into the backtick trap I have been quoting all session

`CLAUDE.md` documents it: **a backtick inside a `createSolution` solution
string terminates the template literal.** My edits put three in — a
`` `false` `` in a comment, an `` `options` ``, and a nested template literal
in a thrown error. The whole script block stopped parsing and the error named
a token forty lines away.

Same lesson as the verification-log deletion: **writing the trap down does not
stop you walking into it**, because the habit that causes it — marking up code
in a comment — is the correct habit everywhere else.

### a7/0004 — the phantom call, and A7 is finished (2026-08-24)

M3: **`decideIncoming`**. 21 self-checks, 10 wrong-cases, 3 new executable
quiz questions. **A7 is complete — five of five verified.**

**The A7 shape held for the fourth time**, and here it is a *resource balance*
rather than a display rule: **a call reported to CallKit is ended exactly
once.**

- Miss it and iOS goes on showing the system call screen for a call that is
  over — sometimes until the phone restarts.
- Do it twice and `endCall` fires against a UUID CallKit has already forgotten.

The lesson had `reportIncomingCall` and `endCallFromApp` and **nothing pairing
them**, so an in-app Decline left CallKit ringing for ever.

### "Always end" and "never end" are each exactly half right

Declining **in-app** owes CallKit an `endCall`, because nothing else will send
one. Declining **natively** owes it nothing, because CallKit ended the call
itself before telling you. **Identical from the user's side, one line apart,
opposite correct answers.**

Accepting is a third answer again: an in-app accept needs
`answerIncomingCall` — not `endCall`, which hangs up the call you just took,
and not silence, which leaves the system screen ringing over it.

### Six exits, and the guard belongs at the top

A ringing call can end from six places — accept in-app, accept native, decline
in-app, decline native, caller cancels, 30s timeout — plus a seventh event that
is not an ending: the same call arriving twice, once by VoIP push and once over
the socket when the app foregrounds.

**Two endings for one call is the normal case, not the edge case.** The
terminal guard therefore sits before the switch, not inside each branch: six
branches each remembering to check is six chances to forget, and the one that
forgets is whichever was added last.

### Accept was silent while decline was not

`handleReject` sent `call:reject`; `handleAccept` sent **nothing** — and
`0002`'s caller side subscribes and waits for `call:accepted` before building
its peer connection. **Nobody was sending the message the caller was waiting
for.** Both files read correctly alone; the gap exists only between them. Same
move that found `a8/0004`'s unsent `localId`. `send` was also used in the
screen and never imported.

### Two self-check defects the trip-count exposed

- **One check was doing two jobs.** *"Accepting in-app ANSWERS the native call,
  it does not end it"* conflated two different mistakes — ending it, and doing
  nothing — which have different consequences and were reported alike. Split.
- **A sequence check tested nothing.** *"Decline in-app, then CallKit's own
  endCall"* stays correct even without the terminal guard, because the native
  branch contributes no `end-native` either way. Replaced with the **reversed**
  order, which is the one that actually bites: CallKit ends the call from the
  lock screen, then the app mounts and a stray in-app decline follows. Both
  orders are now checked.

Also fixed a generation artifact: an empty action fragment was leaving an
**array hole**, so a "removed the action" mistake produced `[..., null, ...]`
rather than a clean list. Fragments now carry their own trailing comma.

### a7/0003 — a black rectangle is not a state (2026-08-23)

M3: **`videoStage`**. 15 self-checks, 10 wrong-cases, 3 new executable quiz
questions. Third of the `unverifiable` cluster.

**The prediction held, in a place I did not expect.** `0003` has no call clock,
so it does not duplicate `0002`'s timer — it carries the *ternary*:
`callState === 'connected' ? 'No video' : 'Connecting…'`. Same two-way branch,
same `disconnected` blind spot, different variable. **Worth keeping as a
heuristic: a defect shape travels between sibling screens even when the
feature it attached to does not.**

### The finding: `enabled = false` is local, and nothing carries it across

The viewport was `remoteStream ? <RTCView/> : <placeholder/>`, and **a stream
object existing is not video arriving**. `ontrack` fires during negotiation,
before a frame is decoded — and worse, when the peer presses Video Off the
stream is still there with a disabled track, so `RTCView` faithfully renders
black.

**The lesson's own quiz already said so**: *"What does the remote peer see when
you call `videoTrack.enabled = false`?"* → *"A black/frozen frame."* Third
lesson running where the quiz knows and the code does not act on it.

The part that is genuinely surprising, and is now taught: **muting a track
sends no message.** It swaps the frames for empty ones, and at the media layer
black frames from a disabled camera are the same bytes as black frames from a
camera in a pocket. There is nothing to inspect. So the app must send
`call:media` with `{ videoEnabled }` over the same socket that carried the
offer — which neither `0002` nor `0003` did.

### Which brings back the three-state problem, for the fourth time

`peerVideoEnabled` is `true` / `false` / **`null` — they have not told us**,
and `if (!peerVideoEnabled)` collapses the last two, which are opposites. An
older client that never sends `call:media` would have perfectly good video
replaced by "they turned their camera off" for the whole call.

Same trap as `a2/0002`'s `Partial<T>`, `c5/0004`'s *gone* vs *not fetched*, and
`b1/0001`'s `NULL` vs `''`. **Not being told something is not the same as being
told no.**

### The exercise is precedence, and precedence is invisible until two things coincide

Six rules, and every wrong-case below gets each individual rule right while
producing the wrong screen. A call that failed while their camera was off makes
**both** notices true, and only one is useful — a screen reporting the camera
never tells the user the call is over. That is why `videoStage` is a sequence
of early returns rather than conditions combined at the end.

The order that fell out: **ended → connecting → reconnecting → camera-off →
waiting → live.** Two placements are load-bearing and neither is obvious:
`ended` above `connecting`, or a call that failed before connecting spins for
ever; and `reconnecting` above `camera-off`, because during a blip we no longer
know whether that camera state is current.

### And the mirror was set from the intention, not the result

`handleCameraFlip` called `switchCamera()` and flipped `frontCamera`
regardless. Both the optional chain and the guard inside `switchCamera` can
decline to do anything, so the preview ends up mirrored against a camera that
never moved — and stays inverted for every subsequent flip. `switchCamera` in
`0001` now returns a boolean and the screen only records what happened.
**Same shape as `a11/0001`'s row animating away before the revoke succeeded.**

`0001` was re-verified after that two-line change; it was already `verified`,
so no log entry was at risk.

### The trip-count found a fixture that made two mistakes indistinguishable

The base fixture had `peerVideoEnabled: null`, so *the ordinary good case was
also the not-told case* — and the mistake that collapses null into false
tripped the good-case check rather than the one naming it. Base moved to
`true`, with a comment saying why. It also exposed a **redundant wrong-case**
(two changes at once, duplicating another); replaced with the shape the lesson
actually shipped — no camera-off rule at all. Seven of ten now trip exactly one
check, and the three multi-trips are one removed or moved rule each.

### a7/0002 — the call clock counted ticks, and fixing 0001 made a second bug visible (2026-08-23)

M3: **`callDisplay`**. 16 self-checks, 10 wrong-cases, 3 new executable quiz
questions. Second of the `unverifiable` cluster.

**The clock was `setInterval(() => setDuration(d => d + 1), 1000)`** — a count
of how many times a callback ran, which equals elapsed time only while nothing
stops the ticks. **iOS suspends JS timers for a backgrounded app, and a voice
call is *specifically* the screen the user leaves**: phone to the ear with the
proximity sensor blanking it, switching to Maps to read out an address, locking
the screen and carrying on talking. A fourteen-minute call comes back reading
four.

Nothing errors, the audio never stops, and **the number is wrong by exactly the
interval the user was not watching** — which is the interval they are least
able to check. The fix is to stamp `connectedAt` once and subtract, so the
interval's only job is to trigger a re-render and a missed tick costs nothing.

### Fixing 0001 is what made the second defect reachable

`0001` gave `disconnected` an 8-second grace period instead of hanging up. That
created a window this screen had never had to render — and the render was:

```
{callState === 'connected' ? formatDuration(duration) : 'Connecting...'}
```

**So a four-minute call displays "Connecting…" and loses its timer.** Both
halves point the same way: it reports that nothing has happened yet, on a call
that is still live. A user who believes it hangs up — ending a call that was
about to recover on its own.

**Worth carrying: a ternary has room for two answers and this screen has
four** — never connected, live, momentarily lost but still counting, over. When
the states outnumber the branches the extras do not disappear; they land in
whichever branch is the fallback, and the fallback is the one nobody chose.
Same shape as `a5/0003`'s badge deriving five displayed states from three
stored ones.

### The formatter was wrong in the lesson and right in its own playground

The screen's `formatDuration` had no hours branch **and** computed minutes over
the whole total, so 1h15m read `75:30`. The playground higher up the same page
already had the correct three-part formatter. **Third instance this session of
one lesson holding both the right and the wrong version of the same thing**,
after `0001`'s two quiz explanations.

### A fixture-design defect the trip-count caught

Counting how many checks each mistake trips found one that was **6**: the
falsy-`connectedAt` mistake was breaking every format check too, because I had
written those fixtures with `connectedAt: 0` for arithmetic convenience. They
had no business depending on the falsy behaviour. Moving them to `1000` dropped
it to 1, and **nine of the ten mistakes now trip exactly one check.**

The same count found a check ordering problem: the unpadded-minutes mistake was
tripping the `59:59`/`1:00:00` boundary check first, because `1:00:00` also has
single-digit minutes. The specific check now runs before the boundary one, with
a comment saying why.

**The one that legitimately trips 12 is the tick-counter**, and that is
inherent: the duration is read from the wrong source, so every assertion about
a duration fails. One change, twelve consequences — recorded in the case file
so nobody "fixes" it later.

### A decision worth flagging: the existing interval questions stay

The quiz has several questions built on `setDuration(d => d + 1)` — the
functional updater, the stale closure, the missing `clearInterval`. They are
**not wrong**, so the believe-the-quiz rule does not apply; they teach real
hazards *of accumulating*.

Rather than rewrite three keyed questions for marginal gain, the lesson now
names the consequence directly: `setNow(Date.now())` has no previous state to
capture, so the stale-closure hazard cannot be written at all, while
`clearInterval` still matters because that one is about unmounting rather than
arithmetic. **The cost of leaving them: a reader could take the accumulator as
endorsed.** The callout is what prevents that, and rewriting the questions
remains available if it turns out not to.

### a7/0001 — the quiz was right and the code beside it was wrong, twice (2026-08-23)

M3: **`ingestSignal`**. 18 self-checks, 11 wrong-cases, 3 executable quiz
questions where the lesson had none. **First of the 17 `unverifiable`
lessons**; it now reaches `verified` on the per-exercise opt-out, with only the
`react-native-webrtc` wrapper excused.

**Both defects were already contradicted by the lesson's own quiz**, which is
the rule `b1/0001` established: *when a lesson's quiz disagrees with its body,
believe the quiz.* This is the strongest instance of it so far, because the
quiz was right **twice** and neither answer had been carried into the code.

- **No ICE buffering.** `handleRemoteIce` called `addIceCandidate`
  unconditionally, which throws `InvalidStateError` with no remote description
  — while a quiz explanation in the same file read *"In Token's code, we buffer
  incoming ICE candidates if they arrive before the remote description is
  set."* It did not.
- **`disconnected` was treated as `failed`.**
  `if (state === 'disconnected' || state === 'failed') onHangup()` — while the
  state table three sections up documents `disconnected → connected` as
  recovery, the exercise said *"or 'disconnected' for too long"*, and an
  `order-steps` explanation said *"Token should show a 'Reconnecting...' UI
  during the disconnected state rather than immediately hanging up."* Three
  statements of the right answer around one line of the wrong one.

### The race is why it survived: it works on the office network

The remote side starts gathering at `setLocalDescription`, which is *before* it
sends the offer, and both travel one WebSocket. The `subscribe` switch calls
`this.handleRemoteOffer(payload.sdp)` **without awaiting**, so the next frame is
dispatched while the offer is still three `await`s from being applied. The new
executable question pins the ordering exactly:
`setRemoteDescription -> iceArrives -> remoteReady`.

**And nothing logged it.** `handleRemoteIce` is `async` and called without
`await`, so the throw became an unhandled rejection. Two phones on one Wi-Fi
win the race; mobile data does not. **The bug reaches users as "calls sometimes
don't connect", which is the hardest sentence in a bug tracker** — and the
office is the best possible network, so the test that would catch it is the
test nobody runs.

### The cap has a direction, and the obvious one is backwards

Buffering unboundedly hands a peer who never sends an offer control of your
memory. But `slice(-MAX)` — keep the most recent — is the version everyone
writes, and it means **anyone can flush your working relay candidates out of
the queue by sending 64 more**. Drop what is *arriving*, keep what is *held*:
the earliest candidates are the real ones from the peer's first gathering
round, and under relay-only policy there are only ever a handful.

Both directions are bounded, which is exactly why "is it bounded?" is the wrong
question to stop at.

### Two wrong-cases were worth more than the other nine

- **Flushing the queue *before* the description** is not a partial fix, it is
  no fix — it reproduces the identical `InvalidStateError`. It is also what you
  write if you think of the queue as a backlog to clear before handling the new
  thing.
- **Flushing on `'offer'` only.** The callee receives an offer, so their side
  is perfect; the caller only ever receives an *answer*, so every candidate
  they buffered is silently abandoned. **Debug either device alone and it looks
  correct** — the same two-sides-must-be-read-together move that found
  `a8/0004`'s `localId`.

Also: the self-check's queue-cap assertion is `=== 64`, not `<= 64`, because an
implementation that buffers nothing at all also has a "bounded" queue and must
not pass. All multi-trip mistakes were run individually and confirmed inherent.

### Two smaller things fixed in passing

- **The revealed solution was a comment block** — *"See the full
  TokenPeerConnection class in the lesson code above"* — against lesson
  invariant 4, which requires a complete pasteable file. It is now the real
  file.
- **`createExplain` was missing.** A7 `0001`–`0004` have no prompt, and the
  count is the tell: **`createExplain` is at 84/101 and `verified` was at
  84/101 — the 17 lessons without a prompt are exactly the 17 that were
  `unverifiable`.** Adding it belongs to each M3 pass rather than to a separate
  sweep.

### The ADR-0007 sweep — the last known violation was three (2026-08-23)

Going to fix `a8/0004`'s `tokenCode` over the WebSocket, I swept the course
for the same shape. It was not one violation, it was **three lessons**, and
the worst was not the one on the list.

**`a8/0004`** sent `{ text, tokenCode: code }` on every chat message. The
holder already knows the code — they typed it — **which is exactly why it
survived review**. The problem is everywhere the message goes next: the socket
server's log, the Redis pub/sub payload that fans it across nodes, and any
error thrown with the frame attached. And the server never needed it: the
holder JWT is `{ conversationId, tokenId, holderName }`, so the connection
knew its conversation before the first message. **Re-sending an identifier the
connection already carries is how a credential ends up somewhere nobody
designed.**

**It also had `a6/0002`'s bug.** `b5/0002` echoes `localId` back *unchanged*
so the client can find its optimistic bubble; this page generated
`'local-' + Date.now()`, stored it, and **never sent it** — so the ack arrived
with nothing to match and the message stayed "sending" for ever. Fixed on
mobile in August; this is the same bug in the web client, found by reading the
two sides against each other rather than either alone.

**`b9/0003` was the bad one, and it is the production logging lesson.** Its
redemption handler broke three rules simultaneously: the code read from
`req.params` (a path reaches the proxy log before your handler runs), the code
written to **four** log lines, and `404` for not-found against `410` for
revoked — the oracle again, sixth layer. Plus five sample log lines and a quiz
answer carrying codes.

**The interesting part of that fix is the first log line, because it is the one
with nothing in it.** At *"redemption attempt"* the token has not been found,
so there is no id to record — and the pull towards writing *something*
identifying is precisely how the code got there. `requestId` is enough.

**`x2/0001`** had the same navigation-params defect as `a2/0003`, plus
`console.warn('Token about to expire:', token.code)` in the lesson that
teaches console methods.

### The trap I documented, and then walked into

Running `verify-lesson.mjs` on `b9/0003` without `--unverifiable` **deleted its
log entry** — the exact hazard written into this file after it happened to
`b6/0001` earlier the same day. Recovered from `git show HEAD:` and re-run with
its original reason.

**Writing the trap down did not stop me walking into it**, because the reflex
that causes it — verify after editing — is the correct reflex. The only real
fix is to check the log first, which is now the sentence in that warning.

### The verification story is finished (2026-08-23)

**Every lesson in the course has been executed at least once.** The log holds
102 entries against 101 lessons plus one README: **84 verified, 17
`unverifiable` with a stated reason, 1 `nothing-to-verify`.** Nothing is
absent any more.

Nine lessons went from *never attempted* to covered in this pass, and **seven
of the nine were hiding a real defect** — which is the argument for having
done it rather than accepting the number:

| Lesson | What it was doing |
|---|---|
| `a2/0001` | Types carried a `code` field ADR-0007 forbids |
| `a2/0002` | `Partial<T>` collapsing absent and null |
| `a2/0003` | The token code in navigation params, which persist to disk |
| `a3/0002` | `TokenListItem` declared `code`, so the list rendered `undefined` |
| `a9/0002` | A denial oracle: 404 / 410 / 403 rendered to anyone with a link |
| `b1/0001` | `NOT NULL` glossed as "can't be empty", against its own quiz |
| `b1/0002` | A LEFT JOIN commented "most recent" that returns all of them |
| `b1/0004` | Clean — the `@>` rules simply had nothing executable behind them |
| `x2/0001` | Clean — the isolate step was sound and untestable |
| `x2/0002` | Taught `tokenCode: token.code` as best practice, in the logging lesson |

**Two of the nine were clean.** That is worth recording as honestly as the
seven: the reflex to assume a never-executed lesson is a broken one is wrong
about a fifth of the time, and both clean ones still gained an exercise that
did not exist.

### a2/0003 — the code was in the navigation params (2026-08-23)

M3: **`readRouteParams`**. 22 self-checks, 10 wrong-cases. The last of the
nine.

`TokenDetail: { tokenCode: string }` — and navigation params are **written to
disk**. React Navigation persists its state to restore where you were, and
with linking configured those same params become the deep-link URL. A code
there is a live capability in AsyncStorage *and* in a URL. It was also
unfillable: `GET /tokens` returns no code, so
`navigate('TokenDetail', { tokenCode: item.code })` navigated with
`undefined`. Fourth occurrence of that field, after `a5/0003`, `a11/0001` and
`a3/0002`.

**And the part the types cannot do.** `RootStackParamList` type-checks every
`navigate()` call *in your code* — which is real. But `route.params` has two
other sources that never consulted it: a **deep link**, where every value is
text parsed out of a URL, and **restored navigation state** written by an
older build. So `route.params` is the same kind of value as `res.json()` in
`a3/0002` — annotated, not checked.

The exercise is that check, and its sharp edges are the coercions:
`Number('')` is `0` — **a real token id** — `parseInt('7x')` is `7`, and
`Boolean('false')` is **true**, because a non-empty string is truthy. Each one
answers *what would this be* when the question is *is this one*.

### a2/0002 — `Partial<T>` gives a field three states, and the column has two (2026-08-23)

M3: **`toUpdatePayload`**. 16 self-checks, 9 wrong-cases.

`Partial<Token>` turns `maxUses: number | null` into `maxUses?: number | null`,
and the extra state **is** the meaning of a PATCH:

| Sent | Server must |
|---|---|
| `{}` — absent | leave it alone; this edit is not about that field |
| `{ maxUses: null }` | set it to unlimited — null is the value the user just chose |
| `{ maxUses: 5 }` | set it to five |

**Collapse the first two and "unlimited" becomes unsendable.** A client
building its body with `if (value != null)` can set a limit and never remove
one: the user unticks the box, presses Save, the request succeeds, and the
limit is still there. Nothing errors, so it is reported as *"saving doesn't
work sometimes"*.

**`?` means the key may be absent; `| null` means the value may be null. They
are different questions, and `Partial<T>` only answers the first.** Same
distinction as `c5/0004`'s *gone* vs *not fetched* and `b1/0001`'s `NULL` vs
`''`, now with a name in the type system.

Also `issuedTo` → `label` (17 occurrences) and `maxUses: number` → `| null`,
which left **three stale type strings in quiz answers** — none executable, so
nothing would have caught them.

### The wrong-case that hid inside the thing it was describing

The mistake that treats `undefined` as a value builds
`{ label: 'Veg box', maxUses: undefined, expiresAt: undefined }` — and
**`JSON.stringify` drops keys whose value is `undefined`**, so it serialises
identically to the correct payload. My check compared stringified output, so
it passed.

That is precisely why sending `undefined` is dangerous rather than harmless,
and precisely why a check that stringifies cannot see it. The check now
compares **keys**.

### a3/0002 — the type that declared the field ADR-0007 forbids (2026-08-23)

M3: **`parseListResponse`**. 20 self-checks, 10 wrong-cases.

**`TokenListItem` declared `code: string`** — so the list screen's
`keyExtractor={item => item.code}` and `<Text>{item.code}</Text>` were not a
slip, they were the type doing what it said. `GET /tokens` returns no code
(ADR-0007), so every row rendered nothing and every key was `undefined`, which
makes React fall back to the array index and reuse rows across positions.
**Third occurrence of this exact defect**, after `a5/0003` and `a11/0001`.

The type was wrong in three more ways: no `id` (while line 256 filters on
`t.id`), `maxUses: number` against `null = unlimited`, and no `expiresAt`.

### The lesson had no boundary at all, which is what the generics conceal

`client.get<ApiResponse<Paginated<TokenListItem>>>('/tokens')` reads as a
guarantee and is a **type assertion** over `res.json()`, which returns `any`.
**The compiler proved things about code it could see, and the response body is
the one value it could not.** So the M3 is the boundary: one function, at the
point data enters, that refuses what it cannot understand.

**The contrast it is built around** — and the two rules look redundant until
you delete one:

- **An unknown extra field is fine.** A server shipping a new column before
  the app knows about it must not break every client.
- **A field you know must never arrive is not.** `isItem` allows unknown
  fields *by design* (`a2/0001` rule 6), so nothing else will ever catch a
  `code`. **Tolerating what you do not know is not the same as tolerating what
  you know is wrong.**

### Two more self-check holes, and the backtick trap caught me

- **`data` as a bare array** was never tested, so a check that only asks
  `typeof raw.data === "object"` passed — and an API that drops its pagination
  envelope is a common thing.
- **A *missing* `success` field** was never tested, which is precisely the case
  a falsy test lets through: `!undefined` is true and `undefined !== undefined`
  is false.

And I hit the trap `CLAUDE.md` documents: **a backtick inside a template
literal.** Writing `` `code` `` as Markdown emphasis inside a `createSolution`
solution string terminated it, and the parse error named an identifier three
lines away. The rule is already written down; the file it is written in is
where I broke it.

### b1/0004 — `@>` is not a search, and B1 is finished (2026-08-23)

M3: **`jsonbContains`**. 29 self-checks, 10 wrong-cases. **B1 is now three
verified and one `unverifiable`-with-a-reason** — the module went from *no
lesson ever executed* to fully covered in one pass.

`@>` is the operator the GIN index accelerates, so it is the one you end up
writing, and its rule is narrower than the word "contains" suggests.
**Structure matches from the top down; the only things it may skip are extra
keys and extra array elements, never a level of nesting.** So
`{"a":{"b":1}} @> {"b":1}` is **false**, which is the mistake everyone makes
because containment sounds like a search.

Three more that each bite:

- **Arrays ignore order and duplicates.** `[1,2,3] @> [3,1]` is true, and so
  is `[1,2,3] @> [1,1,1]` — the question is *is each of these in there*, not
  *are these the same array*.
- **A top-level array contains a bare scalar** — `["qr"] @> "qr"` is true,
  documented as an exception because "is this tag present" is the commonest
  JSONB question there is.
- **The exception stops at the top.** `{"tags":["qr"]} @> {"tags":"qr"}` is
  **false**. One rule with one exception at one level is exactly the thing
  that works in the psql prompt where you tested it and fails in the query
  you shipped.

### One wrong-case was not a mistake, and only running it showed that

`doc[key] !== undefined` instead of `hasOwnProperty` — **JSON has no
`undefined`, so the two are equivalent for every input this function can
receive.** It passed everything because it was correct. Replaced with the
genuine version, a truthiness test on the value, which rejects
`{allow_video: false}` — the only query anyone would write about that column.

That is the second time in this batch a wrong-case turned out to be a
no-op (after `O`→`0` in `a9/0002`), and both were caught the same way:
**a case that passes everything is either a hole in the self-check or a
mistake that is not one, and the only way to tell is to look.**

### b1/0001 — the NOT NULL gloss contradicted the lesson's own quiz (2026-08-23)

M3: **`checkRow`**. 21 self-checks, 9 wrong-cases.

Its breakdown of the schema read *"`TEXT NOT NULL` — text column that can't be
empty (null)"* — **two different facts in one parenthesis**, while the same
lesson's quiz spends a question separating them. The rule already written down
applies: *when a lesson's own quiz contradicts its body, believe the quiz.*
And the consequence was already paid downstream — `a11/0003` found `''`
passing validation, satisfying a `NOT NULL` column, then rendering as nothing
because `?? 'Unnamed'` catches `null` and not `''`.

Also `issued_to` → `label`, and **the `max_uses` callout referenced an
`expires_at` column the table never defined** — it is now there.

### Three things NULL does, and they are one thing

The exercise is built on SQL's three-valued logic, because all three
surprises come from it — a comparison against NULL is *unknown*, and each
constraint decides differently what to do with unknown:

| | Rejects | Quietly allows |
|---|---|---|
| `NOT NULL` | only `NULL` | `''`, `'   '`, `'0'` |
| `UNIQUE` | a repeated **value** | any number of NULLs |
| `CHECK (x IN …)` | only what it proves **false** | `NULL` |

**The third is the one that surprises people: a `CHECK` does not imply
`NOT NULL`**, so a column constrained to three statuses accepts a null status
happily.

### Three wrong-cases exposed three holes, and all three were fixture design

Not weak cases — a fixture that could not *express* the rule being tested:

- **No NOT NULL numeric column**, so the falsy-check mistake had nothing to
  reject. `max_uses` is nullable, so `0` there proves nothing about `NOT NULL`.
- **No nullable UNIQUE column**, so "nulls never collide" was unobservable —
  `code` is `UNIQUE NOT NULL`. Added `external_ref`, which is the only shape
  where the rule exists at all.
- **A `CHECK` that threw on null** rather than returning false, so the mistake
  that runs checks on null failed *every* assertion and hid which rule broke.
  In SQL a CHECK does not throw; it simply is not false.

### b1/0002 — a JOIN is not a lookup, and its own example forgot that (2026-08-23)

M3: **`joinRows`**. 17 self-checks, 10 wrong-cases. **The first B1 lesson ever
executed** — the M3 hunt had never been run over that module.

Its LEFT JOIN example was commented *"All tokens, plus their most recent
redemption (if any)"* and returns **every** redemption of each. A token
redeemed four times comes back as four rows — which is the row multiplication
the lesson teaches two sections further down, contradicted by its own example.
**A join reads like "attach the matching row" and means "produce one row per
matching pair", so a query that looks like it enriches a list silently
lengthens it.**

Also `t.issued_to` → `t.label` and `r.redeemed_at` → `r.created_at`, the exact
rename `b10/0002` found elsewhere. **`t.code` stays** — that one is the
labelled simplification in `b1/0001`, and the callout now says so, since a
reader landing mid-module would not otherwise know which of the three is
deliberate.

### The headline of the exercise: JavaScript and SQL disagree about null

`null === null` is **true** in JavaScript; `NULL = NULL` is **unknown** in SQL.
So a join written in JavaScript joins every orphaned row to every orphaned
row — a cartesian product of precisely the rows that should have matched
nothing, and it gets **bigger the more broken your data is**, which is the
opposite of what anyone expects.

One wrong-case slipped through and the fix is worth keeping: my "missing key"
check had an absent key on the **left only**, where `undefined` never equals a
real id, so a half-fixed null check (handles `null`, ignores `undefined`)
passed. **It takes two absent keys to make `undefined === undefined`.** The
fixture now has one on each side.

### x2/0001 — a probe that never ran is not a probe that saw zero (2026-08-23)

M3: **`firstDivergence`**. 17 self-checks, 10 wrong-cases. No pre-existing
defect in this one — the lesson's *isolate* step was sound and simply had
nothing executable in it.

**The exercise is the gap between the technique and doing it right.** Dropping
a counter at each stage and reading down the column works; the trap is the
line that never printed. Read carelessly — or by anything doing
`count || 0` — a missing probe is a zero, and the answer becomes *"lost at
setTokens"* when execution never reached setTokens and the cause is upstream.
**"I did not observe this" and "I observed nothing" are different facts, and
only one of them is about the data.** Same distinction as `c5/0004`'s
*gone* versus *not fetched*, arriving as a missing property rather than a
network state.

Four other readings of that column, each sending you somewhere different:
`grew` is a duplicate (`a6/0002`'s REST-plus-socket overlap), `empty_at_source`
means nothing was ever there, `intact` means the data arrived and the bug is
in rendering — the answer people refuse to believe — and `unreadable` catches
a trace scraped out of log text, where `'10' < '5'` is true so a string count
does not fail, it **inverts** the comparison and blames the wrong step.

**What every wrong-case here has in common:** it still returns a confident
answer naming a step, and the step is wrong. A debugging tool that says *"I
don't know"* costs an hour; one that points at the wrong line costs the
afternoon, because you believe it.

### x2/0002 — the logging lesson was teaching the code into the logs (2026-08-23)

M3: **`redactLogFields`**. 17 self-checks, 9 wrong-cases.

Its **"Good — structured, searchable, contextual"** example read
`tokenCode: token.code`. ADR-0007 forbids that outright, and it was labelled
best practice **in the lesson whose whole subject is logging** — the worst
possible place, because that is where the habit forms. A token code is not an
identifier, it is the capability: a log line holding one is a live credential
in a file designed to be copied everywhere. Now logs `token.id`.

**The wider point the fix produced:** remembering not to log the code is not a
mechanism, and this lesson is the proof — the rule was written in ADR-0007 and
the lesson broke it anyway. So the M3 is an **allow-list** redactor. Both list
kinds fail; they fail in opposite directions. A deny-list fails open and
silently, an allow-list fails closed and noisily — *"the log is missing a
field"* is a bug report, *"the log contains a credential"* is an incident.

### Two wrong-cases exposed a rule I had overstated, and a fixture too small

- **I required a cycle guard as a safety property, and it is not one.** The
  depth limit already makes a cycle safe — the separate no-cycle-guard
  wrong-case could only be made to fail by *also* removing the depth limit,
  which is how the overstatement surfaced. The rule now says so: `seen` is
  worth keeping because it reports a cycle once at the path where it closes
  rather than as a column of near-identical paths, and that is tidiness, not
  a guarantee.
- **A two-element `dropped` list reversed into sorted order**, so the
  implementation that called `.reverse()` instead of `.sort()` passed. Three
  droppable branches is the smallest fixture that can tell them apart, and the
  third is now in the fixture with a comment saying why.

### a9/0002 — the deep-link screen was a code oracle (2026-08-23)

M3: **`parseTokenLink`**. 22 self-checks, 11 wrong-cases.

**The lesson taught three distinguishable failures** — 404 *doesn't exist*,
410 *revoked*, 403 *max uses* — and rendered the difference on screen. Anyone
can open a deep link, so that answers a question about a code nobody had to
prove anything to ask: a 404 means *keep guessing*, a 410 means *you found
one*. **`b7/0001` states the rule outright** — one status and one message for
every refusal — and `a8/0002` is the worked version, one screen for all five
unusable outcomes with the distinction kept for metrics. **Sixth layer.**

Its `parseTokenUrl` also had the unanchored `replace('t/', '')` — the bug the
lesson's own prose describes correctly, in the code the student copies. Same
shape as `a5/0004` and `b10/0002`: **prose corrected, code beside it
untouched.**

### Three wrong-cases were wrong, and one of them was not a mistake at all

- **Mapping `O`→`0` and `I`/`L`→`1` is a no-op.** Every character it maps
  *from* is excluded and every character it maps *to* is excluded, so the code
  is refused either way. That is not luck — **the excluded set is closed under
  confusion**, which is the property that makes it worth having. Replaced with
  the genuinely dangerous version: *stripping* unknown characters, where
  `MERC-8GH2-KP4OX` loses its `O` and becomes a different **valid** code
  belonging to somebody else.
- **My solution stripped the query twice**, so the wrong-case that removed one
  strip changed nothing. Dead code in a revealed solution is its own defect;
  the origin regex now keeps the query and the path step removes it.
- One `expect` named a check that a neighbouring rule fires first.

> **⚠ A process trap found the hard way on 2026-08-23.** Running
> `verify-lesson.mjs` on a lesson **without** the `--unverifiable` reason it
> needs **deletes that lesson's log entry**, because a failing run deletes.
> I did this to `b6/0001` while checking whether an edit had broken it, and
> only noticed because a recount disagreed with an earlier one by one. It was
> restored from `git show HEAD:` and re-run with its original reason.
> **Before verifying a lesson you did not just write, check the log for its
> existing status** — `node -e "console.log(require('./scripts/verification-log.json')['modules/…'])"`.

> **`render-as-authored` is 0 again, and this time it means it.** All 69 were
> reworded on 2026-08-23 across 28 lessons. Before assuming a future 0 is
> clean, read *The `variant` blind spot* below — the number was 0 for five
> days while 61 questions were broken.

**State as of 2026-08-23** — run `node scripts/audit.mjs` before trusting any
of it:

- **100 track lessons, 73 verified.** Audit **green**, **0 warnings**, five
  suites pass.
- **Known-and-blocked is 2** — `participants` (gated on C5) and `calls` (gated
  on B6). Both still legitimately gated.
- **M3 is finished**, all 37 lessons. `--unverifiable` was used zero times.
- **Complete:** B2, B3, B4, B7, B10, A11. **C5 is 4 of 5**, and the fifth
  needs a decision before it can be written at all.

**The one thing waiting on the student is `c5/0005`** — see *Next action*.
Everything else in the queue is unblocked.

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

### Four decisions were taken 2026-08-23 (round 2), and nothing is blocked

All four came back as the recommendation. **They are recorded in `CLAUDE.md`,
not just here** — see *Where a token's rules live* and *Expiry is
`tokens.expires_at`*.

| Question | Answer |
|---|---|
| **`c5/0005`** | **Rewrite as *"why one phone, and what a second would cost"***. Decides `participants` with it — expect a deletion |
| **Rules storage** | **`access_rules` rows.** `b7/0002` reads a `tokens.rules` column `b2/0001` does not create, and `b7/0002` is the one that is wrong |
| **Expiry** | **`tokens.expires_at` only.** Not a rule type. `a5/0004` still accepts `'expiry'` in its zod enum |
| **TypeScript** | **Teach the verifier TypeScript**, so `a2/*` and `a3/0002` stop being the only lessons whose code has never run |

### → Start here: pick the next body of work

**The verification story is finished** — see below. Every lesson has been
executed; the log is 84 verified, 17 `unverifiable` with a reason, 1
`nothing-to-verify`, and **nothing is absent**.

What is left, in no forced order:

1. **The `unverifiable` lessons — started 2026-08-23; all of A7, A10 and X1
   plus two of B9 done, 6 left.**
   `CLAUDE.md` warns that the reflex to reach for that flag is wrong more often
   than it is right, and this pass proved it again — nine lessons that looked
   unrunnable produced nine exercises, and `a7/0001` then produced a tenth
   plus two real defects. Remaining clusters: **B6 (2)**, plus `b9/0003`, `a9/0001`,
   `b1/0003`, `b8/0001`. Each needs the same
   move: find the plain function, excuse the rest per-exercise, **and add the
   `createExplain` prompt** — the 6 without one are exactly the 6 still
   excused.

   **Next: `b9/0003-logs-backups-monitoring.html`**, which finishes B9. Its
   redemption handler was fixed on 2026-08-23 (the ADR-0007 sweep) but nothing
   executable was added, so the log-redaction rule is asserted and untested.
   A retention or rotation policy is a precedence problem; a backup schedule
   is an exactly-once one. Check it against `b10/0002`'s retention table and
   `x2/0002`'s `redactLogFields`, both of which already decided things it may
   contradict.

   **A fifth result to carry, new today:** `b9/0001` caught an error I had
   introduced in `x1/0003` an hour earlier, because its Dockerfile disagreed
   with it. **When a lesson changes a decision, grep the modules downstream
   of it in the same session** — the sibling-lesson pattern applies to your
   own edits, not just to what was there before.

   **Four results now carry forward**, confirmed across nine lessons:

   - **The "not runnable code" excuse has been wrong 9 times out of 9.**
   - Lessons hide **precedence, three-state, or exactly-once** problems.
   - **The lesson often already holds the right answer** — in its quiz, or in
     its body while the revealed solution contradicts it. Read both against
     the prose.
   - **A defect shape travels between sibling lessons** even when the feature
     it attached to does not.

   **Three results to carry in**, now confirmed across six lessons:

   - A7 was four for four on **precedence, three-state, or exactly-once**
     problems.
   - **The lesson often already holds the right answer** — in its quiz (A7,
     three of four) or in its body (`a10/0001`, where all four defects were
     in the revealed solution). **Read the quiz and the revealed solution
     against the prose**, not just the prose.
   - **A defect shape travels between sibling lessons even when the feature
     it attached to does not** — `a7/0003` carried `0002`'s ternary on a
     different variable. Read a module's lessons against each other.
2. **The C-modules.** C0–C4 and C6–C9, roughly 34 lessons, none written. C0 is
   architecture and was planned to come *before* B1, so it is already out of
   order.
3. **`calls`, the last `known-issues.json` entry**, which needs B6 written to
   decide what a call record persists.
4. ~~The `a8/0004` fix~~ — **done 2026-08-23, and it was not the only one.**
   See below.

### The TypeScript runner (done 2026-08-23)

**C5 is complete** and the rules model, the `variant` blind spot and the
`participants` orphan all landed on 2026-08-23. **`known-issues.json` is down
to one entry** — `calls`, gated on B6, which is the only genuinely blocked
thing left in the course.

The TypeScript runner is the decided next unit: teach `verify-lesson.mjs` to
execute TypeScript so `a2/0001`, `a2/0003` and `a3/0002` stop being the only
lessons whose code has never run.

**It overlaps with a bigger number: 8 lessons have never been executed at
all.** No `verification-log.json` entry — not `unverifiable`, *absent* — so
the verifier has never run over them:

| Lesson | Why it is stuck |
|---|---|
| `a2/0001`, `a2/0003` | TypeScript — the runner unblocks these |
| `a9/0002`, `x2/0001`, `x2/0002` | Nothing structural; simply never attempted |
| `b1/0001`, `b1/0002`, `b1/0004` | Pure SQL, and the M3 hunt has never been run over B1 |

`Verified: n/101` counts them honestly as unverified. What the number does not
show is that these differ from the rest by never having been *tried* — and
`CLAUDE.md`'s own warning applies: the reflex to call a lesson unrunnable is
wrong more often than it is right, and B1 was never even asked.

---

### The `variant` blind spot — 69 explanations, and a check that read 0 (2026-08-23)

Found while editing `b7/0002`. **It was the largest student-facing defect in
the course, and the audit reported zero.**

`quiz.js` shuffles `which-breaks` variants at render
(`optionDisplayOrder(q, q.variants)`), and 61 explanations across ~25 lessons
say things like *"Variant A uses 0, which is falsy"*. **The letter names a
position the student never saw.** The reader is told the answer in terms of a
label that does not exist on their screen.

**Why the audit says `render-as-authored: 0` anyway** — its detector is:

```js
/\b(?:option|answer|choice)\s+[A-D]\b/i
```

**It does not know the word `variant`**, which is precisely the word you reach
for when the question type is called `which-breaks` and the field is called
`variants`. 10 hits use the words it does catch; **61 use the one it does not.**

**Done in two halves, and the order mattered.**

1. **One word in two places** — `variant` added to
   `explanationNamesAPosition()` in `assets/quiz.js` and its mirror in
   `scripts/audit.mjs`. That *pinned* all 69 immediately, so their
   explanations were true again within a single commit, and lifted the count
   off 0 so they were visible. **Cases went into `test-quiz-shuffle.mjs` in
   both directions** — the phrasings it must catch, and ordinary prose ("A
   variant of this bug appears in b3/0004") it must not, because a false
   positive silently pins a question that should shuffle.
2. **Then the rewording**, 69 questions across 28 lessons. Count back to 0.

Pinning first is the point: it is safe and instant, and rewording is where a
key gets broken. **The trade during the gap is worth naming — a pinned
question with a true explanation beats a shuffled one with a false
explanation**, at the cost of a small second-option edge until the words are
fixed.

### Naming the code instead of the letter made the explanations better

Not merely accurate — better, because you cannot say *which* variant without
saying what it does. The `const`-in-a-block one now points at the missing
keyword as the entire difference between shadowing and a TypeError. The
`setCount(count + 1)` one says which value was captured and why an increment
disappears. Several now note that the failure is **silent**, which is the part
a beginner needs and a letter never carried.

### Three were not wording problems at all

Rewording forced a reading of each question, and three turned out to be broken:

- **`x2/0001` asked which technique "won't help" and keyed the most helpful
  one.** Its explanation argued with itself — *"Wait — all three are useful!
  … Actually variant C is the most helpful, not least."* A student who
  understood the material was marked wrong. It now offers a technique that
  genuinely does not help: `console.log(tokens)` on the line after
  `setTokens(next)`, which always prints the old value and reports "not
  updating" whether or not anything is.
- **`a9/0002`'s keyed answer worked for the URL in the question.**
  `Linking.parse()` returns the path without a leading slash, so the
  `replace('t/', '')` it keyed as failing succeeds. Converted to
  multiple-choice — the honest question was *which is fragile*, and
  `which-breaks` prints a fixed "Which of these will fail?" that cannot ask
  it.
- **`b4/0003` still rate-limited on `req.body.email`**, a fortnight after B4
  was rewritten to phone-only. A grep for `email` would not have found it,
  because the word never appears — only the field.

**That is the argument for doing this by reading rather than by regex.** A
sed over "Variant B" would have fixed 69 strings and left all three defects.

### One self-inflicted break, worth recording

An unescaped pair of double quotes inside a double-quoted explanation string
killed the entire quiz block in `01/0002`. **The listing script caught it
instantly** — the block stopped evaluating, so the file dropped out of the
report — which is the second time a tool that *executes* the content has
caught something reading it would not.

### The order for the rest, and why

1. ~~**The rules model**~~ — **done 2026-08-23**, six lessons.
2. ~~**`c5/0005`**~~ — **done 2026-08-23.** C5 complete; `participants`
   resolved by deletion and its `known-issues.json` entry removed.
3. **The TypeScript runner** — now the head of the queue.

### c5/0005 — the lesson that builds nothing, and the orphan it closed (2026-08-23)

M3: **`planEnvelopes`**. 18 self-checks, 12 wrong-cases. **101 lessons, 74
verified. C5 is complete.**

The planned multi-device lesson lost its subject when the student chose one
phone for v1, and **costing the feature turned out to be worth more than
building it.** The argument that decides it is one row of a table: sharing an
identity key across devices changes nothing downstream and means **you cannot
untrust one device**, because the key *is* the identity. Per-device keys are
the only honest alternative, and they cost:

- **Fan-out onto the message table.** One ciphertext per recipient device, so
  envelopes move to their own table and volume becomes messages × devices — on
  the table `b2/0002` already partitions by time because it was expected to be
  the largest in the system.
- **A new device starts empty**, since everything earlier was sealed to keys it
  does not have. "Add a device" needs a history-transfer protocol.
- **The device list is a race**, so a send must refuse a stale list rather than
  trust it.
- **Safety numbers multiply** — three devices each side is nine pairs.

### The `participants` orphan was a feature, not a schema

Blocked since it was first written, and **resolved by deletion.** The decisive
detail is not that Token lacks groups: **the holder is not a user.**
`b2/0002` identifies them by `holder_session_id` and gives them no `user_id`,
so a `participants(user_id, conversation_id)` junction had a column that could
never have been filled in for half of every row. The correct query walks the
relationship that exists — messages → conversations → tokens → owner.

**The general form, and the three orphans ended three different ways:**
`deletion_queue` was a schema waiting on a policy and appeared once
`b10/0002` decided one; `calls` is still waiting on an unwritten module; this
one described a product Token is not building. **Treating all three as "write
the missing table" would have produced one useful table, one guess, and one
that is always exactly two rows with an impossible column.**

### And a third `access_rules` design, found while closing it

`b1/0002` had its own `access_rules` — columns `allowed_start`,
`allowed_end`, `max_calls_per_day`, `categories` — which is neither the rows
design nor the JSONB one, making it the **third** vocabulary in a course that
had just been reconciled to one. It also carried
`max_calls_per_day INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited`, the exact
inversion `CLAUDE.md` documents, **and** a `SELECT ar.allowed_hours` naming a
column its own `CREATE TABLE` does not define.

**The rules-model sweep missed it because it greps clean:** the file never
mentions `call_limit` or `cooldown`, because its design has no `rule_type` at
all. **A vocabulary sweep finds files using the wrong words, not files using
a wrong shape.**

**Also unblocked and small:** the `a8/0004` fix (`tokenCode` sent over the
WebSocket on every chat message, twice — the holder knows the code so nothing
leaks to *them*, but it lands in server logs and Redis pub/sub against
ADR-0007, and the holder JWT already carries `conversationId`).

### The rules model — settled and applied across six lessons (2026-08-23)

**Three lessons, three vocabularies, and only `time_window` common to all
three.** What began as "rows or a column?" turned out to be a live break: the
engine ran `SELECT rules FROM tokens` against a column `b2/0001` has never
created, and `b2/0001`'s `CHECK` permitted `call_limit`, `category` and
`cooldown` while the engine and the screen evaluated `contact_limit` and
`channel_restrict`. **The database would have rejected every rule the product
creates.**

Settled: **rows, three types, expiry is not one of them.**

| Lesson | What changed |
|---|---|
| `b2/0001` | `CHECK` list, `is_active` → `enabled`, real payload shapes, a callout on why `rule_type` is constrained and `payload` is not, and a new question on the `cooldown` INSERT being refused |
| `b7/0002` | `SELECT rules FROM tokens` → a `LEFT JOIN` on `access_rules`, plus the row→object assembly and the callout below |
| `a5/0004` | `ExpiryPayload`/`formatExpiry`/`'expiry'` removed; `{start, end}` → `{start_time, end_time}`; `allowed`/`blocked` → three booleans; two quiz questions rebuilt |
| `b3/0004` | Zod union → the three real types, payload keys → snake_case, `HH:MM` regex |
| `b1/0004` | Every JSONB example and five quiz questions moved to the real payloads |

### `a5/0004` had already been half-corrected, and that is the pattern

Its `RuleType` excluded `expiry` and its `CHECK` recap listed the right three,
while its zod enum, its `RulePayload` union, its `formatContactLimit` and four
quiz questions still used the old shapes. **Its "When this breaks" section
argues at length that the client must write `start_time`, and its own
`formatTimeWindow` wrote `p.start`.**

**Same failure as `b10/0002`: the prose was corrected and the code beside it
was not.** The rule already written down — *when a lesson's prose gets
corrected, grep its solution block in the same commit* — needs widening.
It is not just `createSolution`: it is every `<pre>` in the file, and the quiz.

### The two words in the new query that are load-bearing

Moving to rows introduced a failure the JSONB column could not have, and it is
worth more than the change that caused it. **An inner join returns zero rows
for a token with no rules, and zero rows is how the engine recognises *token
not found*.** So the naive join refuses every unrestricted token — which is
most of them — reporting "not found" for a token that is right there.

Putting `enabled` in the `WHERE` instead of the `ON` does the same thing to a
token whose only rule is switched off: `WHERE` is applied *after* the join, so
a predicate on the right-hand table discards the null-filled row the
`LEFT JOIN` just produced, quietly converting it back into an inner join.

**Deny-by-default is what makes both silent and total.** Nothing throws, and
the reported reason points the debugger at the wrong table.

And `UNIQUE(token_id, rule_type)` turns out to be load-bearing too:
`rules[row.rule_type] = row.payload` keeps the *last* row it sees, and **row
order is not guaranteed without an `ORDER BY`** — so without the constraint a
duplicated rule type would make the token's behaviour depend on the query
planner.

### Why rows won, stated so it is not re-argued

**Not the join cost**, which is trivial against `idx_rules_token_id`.
**`rule_type` becomes a constrained column, so a rule type nothing can evaluate
is refused at the `INSERT`** — and `b7/0002` had already shipped the defect
that prevents, where an unrecognised type fell through to `allowed`. The
payload stays JSONB because each type has a different shape; the *type* does
not get that latitude.

`cooldown` is the worked example of the trade: dropping it was a product call
(a daily cap of 10 does not stop ten messages in ten seconds), and adding it
back is a migration that appends one value to a `CHECK` list. Under a JSONB
blob it would be the same work with nothing enforcing it.

### Four defects found in passing, and one gap that is still open

- **`b3/0004`'s payload keys are not that file's convention to choose.** Its
  envelope is camelCase like every request body there; the payload is stored
  verbatim as JSONB and read back by the engine, so its keys *are* the column
  contents. A validator that accepts the wrong key names is worse than none,
  because it certifies the payload that breaks the rule.
- **A quiz explanation that argued with itself.** `b7/0002`'s daily-limit
  question ended *"Wait — actually the count is checked before sending…"* and
  never resolved. It has been resolved.
- **`a5/0004`'s conflict-detection fixture was unreachable** — two enabled
  `time_window` rules on one token, which `UNIQUE(token_id, rule_type)` makes
  impossible. Rebuilt around a conflict that can actually occur.
- **`b1/0002` and `b1/0004` have no verification-log entry at all** and never
  did — `verify-lesson.mjs` fails them with *no self-check found*. That is
  pre-existing, not caused by these edits, and it means two SQL lessons have
  never been executed. Candidates for the M3 treatment.
- **Still open: the 61 letter-naming explanations** at the top of *Next
  action*.

### One correction to `CLAUDE.md`, made the same day

**Its warning that `b4-auth-server` still teaches email and argon2 was
stale.** B4 was rewritten on 2026-08-22 and agrees with `b2/0001`. The argon2
that greps in `b4/0001` is **quoted history** — the old password login, shown
so its ~200 ms timing gap can be measured. A grep hit is not a contradiction;
read the paragraph around it.

---

### c5/0004 — the split was already in the schema, and nobody had looked (2026-08-23)

M3: **`planRestore`**. 22 self-checks, 12 wrong-cases. **100 track lessons,
73 verified.** C5 is 4 of 5.

**The lesson's best finding cost nothing to make: read `b2/0002`'s columns and
ask which ones the server can read.** Exactly one cannot —
`messages.ciphertext`. `tokens`, `conversations`, `redemption_events` and
`users` are ordinary rows the server serves every day. So *"what needs the
recovery phrase"* was never a product trade-off to be argued about; it was
settled the morning someone decided which columns stay outside the ciphertext.

**The general move, and it is cheap: list what is encrypted, and the backup
requirement is whatever is left.** Designing the flow first and then working
out what it must carry is how you end up with a recovery phrase protecting a
token list the server hands over anyway — all of the user-facing cost, none of
the security.

### Wrapping beat deriving on one cell of a table

Two honest designs: the phrase **is** the key (12 words → seed → keypair,
nothing uploaded) or the phrase **wraps** the key (generated on-device per
`0001`, encrypted, blob uploaded).

**Deriving loses on a single row — it cannot be skipped**, because the phrase
must exist before the key does. That makes twelve words a wall in front of the
first screen of a product whose pitch is that you can start immediately. It is
what wallets do and it is right *there*, because there is nothing to do until
you have a restorable key. Token is the other case.

The consequence is that the blob sits on a server the SIM-swapper can reach,
so **the phrase is generated by the app and never chosen by the user.** The
attack is offline — no rate limit, no lockout — and the gap between ~128
generated bits and a human-chosen passphrase is about **ninety bits**. No KDF
tuning closes that: a slow hash multiplies the attacker's cost by a constant,
and a constant does not close 2<sup>90</sup>. Argon2id is still there, for
*partial* leaks, which is the case that actually happens.

### The finding that came from reading 0002 against this lesson

**A backup of the current key is not a backup.** `0002` made the key directory
append-only because old messages were sealed to old keys, and `b2/0002` put
`key_version` on the messages table for exactly that. A blob holding one key
means a user who rotated in Tuesday and restores in March gets **every message
since Tuesday and none of the two years before it** — and *nothing errors*,
because the restore genuinely recovered the key it was given. Silent, found
weeks later, unfixable by then.

So the blob is a **set** and re-wrapping is additive, with `key_versions` as a
column so a restore can say *"this covers 1–3 and you have messages at 4"*.
Same family as `UPDATE public_key` and `revoked_at`: **a backup that keeps only
the current state is a backup of the present, and what you lost is the past.**

### `planRestore` exists because two pairs of states get merged

- **"not fetched yet" merged with "gone".** They arrive at the same line with
  the same-looking data — `backup` is null either way — so the guard gets
  dropped. The result is an app telling someone their history is permanently
  destroyed because a train went into a tunnel, and **they will not retry, because
  you do not retry something that is gone.**
- **The account gated on the phrase.** Most users will skip the phrase, and
  the entire token list needs no key at all, so this draws an empty app for
  the majority.

The broken-on-purpose playground runs four real returning-user states through
the naive planner and **all four come back "gone"**, only one of them truly.

**The general rule: not knowing something and knowing it is absent are
different states, and code that merges them reports the permanent answer for
the temporary case.** Cache miss, feature flag that failed to load, permission
that could not be read — the permanent answer is almost always the harmful one
to guess.

### And a third arrival at the false-assurance rule

Showing twelve words and recording a successful backup on **Done** is worse
than having no backup feature: they did not write it down, and the app has now
told them they are protected, so they are *less* careful than they would have
been. Identical in shape to `0003`'s eight-digit safety number. Fix is to ask
three words back at positions the app picks, and record nothing until that
passes. Plus `FLAG_SECURE` — a screenshot of the phrase lands in Google Photos,
which is a **server-held copy of the thing protecting the key**, arriving
through the camera roll.

### The wrong-cases found three things, and two of them were mine

Twelve mistakes, two alternatives. Every multi-trip was run against the
self-check on its own, and the three that were not inherent were fixed:

- **A `expect` that named a check the mistake does not trip.** Dropping the
  empty-phrase guard leaves `messages` as `'locked'` — unwrap returns false
  and lands in the same state — so only the *reason* moves. The first draft
  named the messages check and passed.
- **A case failing for an unrelated reason.** The phrase-gating mistake
  originally fell back to `snapshot.accountData` raw, which also broke the
  `ok → 'restored'` mapping, so it tripped the first check for a reason that
  had nothing to do with gating. Now it keeps the mapping and differs in
  exactly one place.
- **A self-check bundling two claims.** *"a correct phrase does not rescue a
  failed account fetch"* asserted the account **and** the messages outcome, so
  any phrase-handling bug tripped an account check. Split, and the
  messages-independence half now uses no phrase at all.

**That is seven times a wrong-case has caught a gap in the self-check written
beside it, and it remains the only mechanism that does.**

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

### Do not stop to ask. Decide, and write the decision down so it can be reversed

**Standing instruction, given 2026-08-23: stop asking for approvals and stop
putting choices to the student mid-task.** Two rounds of questions were
answered that day and the third was declined outright — *"can u skip that
too"*. Treat that as the rule from here, not as impatience with one question.

**What replaces asking**, and it is stricter rather than looser:

1. **Make the call**, on the evidence in the repo and the decisions already
   recorded. `CLAUDE.md` wins over any lesson; an ADR wins over a habit.
2. **Write it down where the decision lives** — `CLAUDE.md` for a product or
   architecture rule, an ADR in the token repo for anything with alternatives
   worth preserving, this file for anything in flight.
3. **State the cost of the option you rejected.** A decision recorded with its
   cost can be reversed on evidence; one recorded without can only be
   reargued. ADR-0008 is the model — three modes, costed, with a written
   trigger for switching.
4. **Flag it in the session report**, plainly, as *"I decided X, here is what
   it rules out."* The student reverses it by saying so.

**This is not licence to guess quietly.** The failure mode it replaces —
stopping and waiting — is now impossible, so the only remaining failure mode
is a decision buried where nobody sees it. **An unflagged assumption is worse
than a question.**

**Still stop for:** anything irreversible or outward-facing — pushing to a
remote, deleting work that git cannot bring back, anything that leaves the
machine. Everything inside this repo is recoverable, so none of the ordinary
work qualifies.

**Two questions that are permanently closed.** Do not reopen either:

- **The lookahead question** — raised 2026-08-18, -20, -21, -22, answered
  "keep going" every time.
- **Where the student is in the course** — asked 2026-08-23 and declined:
  *"dont ask as it wont affect your work or plan."* `CLAUDE.md`'s other half
  still stands and is now the whole rule: **never infer progress from the
  files either.** Make no claims about it at all.

**If you ever do need to ask — how, based on what worked.** The three
decisions answered on 2026-08-20 landed only after being restated in **money,
minutes and concrete failure**, with each option's cost spelled out. The first
framing named ADR numbers and `iceTransportPolicy` and got nothing back. The
second said "voice is effectively free, video costs about 450 MB an hour, and
if the relay server goes down nobody can call" — and got a decision, plus a
better answer than any option offered ("keep all 3"). **Never ask an
architecture question in architecture vocabulary.**

## Blocked on

**Nothing is blocked from starting.** `c5/0004` is unblocked and designed.

**One thing needs a decision before it is written, and only that one:**
`c5/0005` was multi-device, and the student chose **one device for v1** on
2026-08-23, so the lesson has no product left to describe. Either reframe it as
*"why Token is single-device and what changing it would cost"*, or drop it and
make C5 four lessons. **Do not write it as originally planned.** Everything
else in the queue can proceed without asking.

*(ADR-0008 was the last true blocker and was settled 2026-08-20. The
relay-egress note below is the residue of it.)*

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
