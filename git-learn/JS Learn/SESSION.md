# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress — PHASE 1

Phase 0 is done (see `HANDOFF.md` for the 10 steps and their commits).
Phase 1 is COURSE-REVIEW.md §6 item 1.1: retrofit practice into `01/0005`–`01/0012`,
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

### Unit 11 — Phase 2 begins: the spine, and a wrong alphabet — IN PROGRESS

Phase 2 is 20 spine lessons × 3 sections (**Why this way / When this breaks /
What this costs you**) plus verifying their code. This unit did the assessment,
one lesson, and the systemic defect the assessment turned up.

#### Four of the 20 should not be deepened yet

`TOKEN-TRACK.md`'s revised sequence marks **B2 (schema) and B5 (WebSocket) as
REWRITES** — B2 for ciphertext and partitioning, B5 for multi-node and Redis.
That is `b2/0001`, `b2/0003`, `b5/0001`, `b5/0002`. Deepening a lesson that is
scheduled to be rewritten is work thrown away, and C5 (E2EE, which must precede
B2) is not written yet. **Deepenable set: 16.**

#### The alphabet was wrong in three lessons

Found by reading `b7/0001` rather than its word count. It taught:

```
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
```

That comment is false — the string contains **L**, and it is 32 characters,
not 31. `a2/0001` and `b3/0001` carried the same literal. Meanwhile `a5/0001`,
`a5/0002` and all of Module 01 use the canonical 31, so **the server generated
codes the client's own validator rejects.**

The keyspace arithmetic was wrong too, and not by a little: the lesson claimed
32<sup>12</sup> = 1,099,511,627,776 (~1.1 trillion). That is 32<sup>8</sup>.
The real figure is 31<sup>12</sup> = 787,662,783,788,549,761 — about
7.9 × 10<sup>17</sup>, six orders of magnitude out, and four quiz keys were
built on the wrong number.

**Why 32 was tempting, and why it loses:** 256 divides evenly by 32, so
`byte % 32` needs no rejection sampling. The only way to reach 32 is to put an
ambiguous character back. That is now written into the lesson as the rejected
alternative rather than left as a silent bug.

**The audit now guards alphabets, not just codes** — any 20+ character
`A-Z0-9` literal that looks like an alphabet must equal the canonical one, as
an **error**. Escape hatch `audit-allow-alphabet` for a deliberate
counter-example, so a legitimate teaching case never trains anyone to ignore
the check. One false positive found and excluded on the way: the plain English
A–Z pasted into a `maxLength` question in `02/0004`; a token alphabet has
digits in it.

#### `b7/0001` deepened — 709 → 2,190 words

The three sections carry real material, not padding:

- **Why this way** — 31 vs 32; the unique index rather than the retry loop as
  the actual collision guarantee (check-then-insert is a TOCTOU race, so the
  correct shape is insert-and-catch `23505`); holder JWT rather than a guest
  account.
- **When this breaks** — `FOR UPDATE` through `pool.query()` **does nothing**,
  because the lock dies with the implicit single-statement transaction and the
  next query is a different pooled connection. The lesson body shipped that
  bug while its own exercise solution did it correctly. Plus the
  count-then-insert race on `max_uses`, which unlike a code collision is
  *likely*; two clocks; and the holder JWT outliving revocation.
- **What this costs you** — a table: rejection sampling, random-key index
  write amplification, redemptions of one token serialising under the row
  lock, plaintext codes making a database dump a set of working capabilities,
  and 12 characters being the human ceiling.

**The open decision was put to the student and taken: ADR-0007.** `tokens`
stores `code_hash` (SHA-256 of the normalised code plus a server-side pepper,
indexed, for lookup) and `code_enc` (AES-256-GCM, decrypted only when the owner
asks to see one token). The bare code is never stored.

Hash-only was the other serious option and lost on **product** grounds, not
security ones — it makes re-showing a code or its QR impossible forever. It
stays right for anything nobody needs to see twice, which is why refresh tokens
should use it.

The lesson's code paths were rewritten to match, because prose teaching one
thing while the samples do another is the drift this project exists to stop:
`codeStore.ts` helpers, insert-and-catch-`23505` instead of check-then-insert,
every lookup on `code_hash`, and a `GET /tokens/:id/code` reveal endpoint —
one token, its owner, logged, never a list. Four quiz fixtures updated with it.
709 → 3,021 words.

**Cost written into the ADR and the deployment follow-on:** the pepper and key
become critical operational state. Lose them and every token is dead. They go
in the disaster-recovery plan, backed up somewhere the database backups are
not. Rotating the pepper rewrites every row — possible only because the
plaintext stays recoverable.

Also fixed a malformed fill-blank (two blanks, one answer) — warnings 52 → 51.

#### Tooling: `--unverifiable "<reason>"`

Track B solutions are Express routes needing Postgres. The verifier previously
had two options: fail forever, or lie. It now takes a mandatory reason, records
`status: "unverifiable"` with it, and still runs everything else — `b7/0001`'s
2 playgrounds and 5 executable `predict-output` answers all pass. The audit
prints `n/a` for that lesson rather than counting it as verified.

**Student decided the pace: full depth on all 15 remaining.** Order — thinnest
and most load-bearing first: ~~`b3/0003` REST design~~ **done**, ~~`b4/0003`
rate limiting~~ **done**, ~~`a3/0002` API client~~ **done**, ~~`b3/0004`
validation~~ **done**, ~~`a4/0002` auth context~~ **done**,
~~`b4/0002` JWT rotation~~ **done**, ~~`a10/0001` secure
storage~~ **done**, `b7/0002` (1,126), `b7/0003` (1,139), then `b9/0002`, `b6/0001`,
`b9/0001`, `b10/0001`, `a5/0001`, `a5/0004`.

#### `b3/0003` REST design — done, 713 → 2,091 words

The deepening turned up a design defect, not just thinness. Every owner-facing
endpoint addressed tokens as `/api/tokens/:code`.

**A URL is the least private part of a request.** The path is written down by
the reverse proxy's access log, browser history, the `Referer` header sent to
whatever the next page loads, crash reporters and APM traces (which capture
URLs by default and bodies almost never), and any CDN in front. Bodies get none
of that. So ADR-0007's care — never storing the code in the database — would
have been undone one layer up by nginx writing it to disk in plain text.

Owner endpoints now take `:id`. Redemption takes the code in a **POST body**;
the holder has nothing else to identify themselves with, and the redemption
*page* is still `tokn.app/t/CODE` because a person has to type it — it reads
the code from the path and sends it onward in a body.

Three more corrections of substance:

- **`403` on someone else's token is an enumeration oracle.** The lesson had
  `if (!token) 404; if (token.user_id !== me) 403;` — so any account could walk
  ids and learn which are real. Fixed by scoping the query with
  `AND user_id = $2` and returning 404 for both. A resource you may not see
  does not exist.
- **`DELETE` → `POST /revoke`.** Revocation keeps the row and records every
  later attempt against it; a verb meaning "remove this" invites someone to
  implement the removal it promises. It also sits consistently with
  `/pause` and `/resume`.
- **The exercise generated codes with `randomBytes(9).toString('base64url')
  .toUpperCase()`** — which yields `0`, `O`, `1`, `I`, `L`, underscores and
  stray hyphens. Every code it produced was one the system rejects. Now imports
  B7's generator. The new alphabet guard could not catch this one: there is no
  alphabet literal to check, which is worth knowing about the guard's reach.

Also documented: `JSON.parse` on a client-supplied cursor turns `?cursor=hello`
into a **500** rather than a 400, and `{"id":"abc"}` into a Postgres error;
`COALESCE` in PATCH cannot distinguish "field absent" from "set to null", so
clearing an expiry silently does nothing. The solution now uses
`'label' in req.body`.

#### `b4/0003` rate limiting — done, 794 → 2,314 words

Three defects, one of which the quiz was actively teaching as correct.

**The limiter key was `${req.ip}:${req.body.email}`, described as "IP + email
so we cover both". It covers neither** — the attacker supplies both halves.
Vary the email and one host works through many accounts five at a time; vary
the IP and a botnet works on one account. Replaced with **two independent
limiters**, both of which must pass: one keyed by IP alone, one by the account
alone. Then there is nothing left to vary. The quiz question that taught the
composite key as the fix was rewritten — it had the reasoning backwards.

**The in-memory store contradicted ADR-0003.** Redis was a commented-out
"production consideration"; with N replicas, five attempts is five per replica,
and a deploy resets every counter. Now Redis-backed, with the ADR named.

**Login leaked account existence twice**, and fixing the message does not fix
the second one. "Account locked, try again after 14:32" confirms the email is
registered — obvious. Less obvious: `if (!user) throw` returns in a
millisecond while a real account spends ~100ms in argon2, so **the clock
answers the question the message refused to.** Now one message for every
failure and a dummy-hash verification when there is no user, so both paths
cost the same. Also made the failure counter atomic — read-then-write loses
increments exactly when attempts overlap, which is the case it exists for.

Two things worth keeping from the new sections:

- **CGNAT is not an edge case for this product.** Indian mobile networks put
  thousands of subscribers behind one address. An IP limit of 5/15min locks out
  a neighbourhood because one person mistyped. Hence IP loose (20) and account
  strict (5) — the account limiter carries the security, the IP limiter is a
  coarse net.
- **`trust proxy` breaks in both directions.** Unset, everyone shares the
  proxy's bucket and the fifth failed login anywhere locks out the world. Set
  to `true`, a client can forge `X-Forwarded-For` and mint unlimited buckets.
  `1` means "exactly one proxy in front of me".

Also recorded as a real decision rather than a default: **if Redis is down,
auth fails closed and the general API limiter fails open** — refusing all
traffic to protect capacity is just the outage arriving sooner.

**Five pre-existing broken quiz questions surfaced**, all the premise-in-comment
pattern SESSION.md already warned about: comment-only code with a prose answer,
so they print nothing. Two became multiple-choice, three became runnable. They
were invisible until the verifier ran over this lesson for the first time.

#### `a3/0002` API client — done, 845 → 2,164 words

The client is the other half of B3.3 and B4.3, and it was undoing both.

**The single worst bug in the four lessons so far: the refresh stampede.** The
obvious `onUnauthorized: () => refresh()` means six simultaneous 401s trigger
six refreshes with the same refresh token. Rotation (B4.2) invalidates the
old one as soon as the first succeeds, so the other five present a revoked
token — and any rotation scheme worth having treats that as theft and kills
the session. **The user is logged out by opening a screen that loads six
things.** Fixed with a single shared in-flight promise; the quiz question is
now runnable and prints `1` versus `6`.

Three more, all of which only show on a real network:

- **No timeout.** `fetch` has no default one, so a phone that switches from
  wifi to mobile mid-request leaves a promise that never settles — no error to
  catch, and every spinner in the app waiting on it. Now `AbortController` at
  15s, chosen for Indian mobile networks: long enough for a slow 3G handshake,
  short enough to answer while the user is still holding the phone.
- **`response.json()` on everything.** A restarting container gets an HTML
  error page from Coolify's proxy, so the user saw `Unexpected token <` and
  the actual 502 never reached the screen. Now checks `content-type` first.
- **429 ignored.** A screen that retries against a rate-limited endpoint
  extends its own lockout. `ApiError` now carries `retryable` and
  `retryAfterSeconds` from `RateLimit-Reset`, so the UI can count down.

Endpoints moved from `/tokens/${code}` to `/tokens/${id}`, `revokeToken` from
DELETE to POST, and `revealCode(id)` added — the client is where 30 screens
get their URLs, so B3.3's decision lives or dies here.

**`retryable` is deliberately a hint to the screen, not a licence for the
client to retry.** A timeout means "no answer", not "it did not happen" — the
request may have created a token whose response was lost. Auto-retrying a POST
gives the user two tokens, one of whose codes they will never see.

Also flagged rather than fixed: the web config reads the access token from
`sessionStorage`, where any injected script can read it. The safer shape is
in-memory access token plus an `httpOnly` refresh cookie. **A8 builds the
redemption page — make that decision there deliberately rather than inheriting
this line.**

The cost worth remembering from the new table: **you cannot force a mobile app
update.** Someone will run today's build in two years, so shared types mean
additive API changes only — new optional fields, never renamed or removed —
for far longer than feels necessary.

#### `b3/0004` validation — done, 858 → 2,190 words

**The sanitization section taught the wrong model and had to go.** It stripped
tags with `input.replace(/<[^>]*>/g, '')` — a regex that loses the arms race
(`<img src=x onerror=…` with no closing bracket walks past it) and, worse,
destroys data: a label of `Mum <3` is stored as `Mum`, permanently, and nobody
finds out until the user asks. Replaced with the rule that actually holds:
**validate on input, escape on output, per destination.** React escapes text
nodes, `$1` stops SQL parsing it, JSON encoding handles the response — the
only place needing care is hand-built HTML or URLs. Plus the note that with
E2EE the server *cannot* filter message content, as a fact about the
architecture rather than a policy.

Three schema defects, all of which the earlier lessons had already implied:

- **`maxUses: z.number().int().min(0).default(0)`** — third lesson carrying
  this. 0 is a token nobody can use and b7/0001 rejects it; null means
  unlimited. Now `min(1).nullable().default(null)` in the schema *and* the
  solution.
- **`cursor: z.string().optional()`** is validation in name only — it checks a
  string is a string and hands `?cursor=hello` to `JSON.parse`, which is the
  500 identified in b3/0003. The decode now happens *inside* the schema via
  `transform` + `ctx.addIssue`, so a bad cursor is a 400 from the validator.
  General rule written down: **anything decoded after validation is still
  unvalidated input.**
- **`payload: z.record(z.unknown())` with the comment "validated per type in
  the service layer"** — which means validated nowhere the day someone
  forgets, and the type system cannot help because `unknown` accepts anything.
  Now a `discriminatedUnion`.

Added `redeemSchema`, which is where the alphabet regex belongs on the public
endpoint, with the denial wording matching every other denial.

Also written up: `.optional()` cannot express "clear this field" (the PATCH
ambiguity from B3.3 — the handler needs `'expiresAt' in req.body`); Zod's
`details` array describes your schema to strangers, so public endpoints should
return the message only; middleware order is cheapest-first (limit → auth →
validate) so an attacker does not get Zod parsing for free; and
`console.error` with no request id means "it failed around 3pm" is
untraceable.

#### `a4/0002` auth context — done, 865 → 2,143 words

Five defects, and the first one ships to users.

- **`fetch('http://localhost:3000/api/auth/login')` in the context.** That
  address is in the production build; every install would try to reach a server
  on the phone itself. It also bypassed everything A3.2 built — no timeout, no
  401 handling, no envelope. Auth is not a special case deserving its own
  networking; it is the part most worth doing consistently.
- **Offline was treated as logged out.** `restoreSession` caught every error
  the same way, so opening the app on a train sends the user to Login with a
  perfectly good session. Now checks `err.retryable` — the flag added in A3.2
  is what makes the distinction available here.
- **Logout did not log out.** It sent the refresh token in the `Authorization`
  header, where the server expects an access token; the call fails, `catch {}`
  hides it, local tokens are cleared, and it *looks* like it worked. **The
  refresh token stays valid on the server** — anyone with a copy keeps a
  working session while the user believes they are protected.
- **`register` then called `login`.** Separately rate limited (B4.3), so the
  register can succeed and the login be refused: account created, user sees an
  error, tries again, "email already taken". Register now returns a session.
- **Context value rebuilt every render**, so every screen re-renders on any
  provider change. `useMemo`, one line.

Also added the wiring the two lessons had been describing separately: the
client's `onUnauthorized` now calls A3.2's `refreshOnce`, with a module-level
session-lost handler so a 401 can be handled when no component is mounted.

#### `b4/0002` JWT rotation — done, 923 → 2,688 words

**The lesson claimed theft detection it did not implement.** The comment said
"possible theft — revoke ALL user's tokens"; the code did neither thing:

- the lookup filtered `revoked_at IS NULL`, so a reused token produced *no
  row* — indistinguishable from one never issued. The only signal worth having
  was discarded before it was read.
- the "revoke all" query matched `token_hash = $1 AND revoked_at IS NULL`, the
  condition that had just failed. **It updated zero rows, every time.**

Fixed properly, which needed a schema change: `family_id` on
`refresh_tokens`, one family per login. Look the token up unconditionally,
treat `revoked_at IS NOT NULL` as reuse, revoke the family. The insight worth
keeping is that **rotation only detects anything because revoked rows are
kept** — delete them and a reused token looks like a token that never existed.

Four more:

- **Rotation was two statements with no transaction.** If the insert fails
  after the revoke, the user has no session and nothing logged why. Now one
  transaction with `FOR UPDATE`, which also stops two concurrent refreshes
  both rotating.
- **Logout revoked every device.** Signing out on the phone ended the session
  on the redemption web page mid-conversation. Now family-scoped, with
  `logout-all` as a separate deliberate action. It also sat behind
  `requireAuth`, so logout failed exactly when the access token was stale —
  which is when people log out. The refresh token in the body is the
  credential.
- **`jwt.verify(token, secret)` with no `algorithms`** lets the token say how
  it should be checked — the shape of `alg: none` and RS256→HS256 confusion.
  Pinned.
- **`require('crypto')` inside an ESM module** is a ReferenceError.

**The honest problem I wrote up rather than solved:** a client that times out
and retries a refresh presents a token the server already rotated. That is
indistinguishable from theft, so the family dies and a user on a bad
connection is logged out for doing nothing wrong. The mitigation is a
few-second grace window returning the same new pair — which permits replay
inside it. Recorded as a decision to take deliberately, not discover from
support tickets. It is also why A3.2's single-flight refresh matters.

Two quiz questions fixed: one premise-in-comment, and one whose stated answer
was the old revoke-everything behaviour.

#### `a10/0001` secure storage — done, 982 → 2,162 words

**The one that could destroy a user's history.** The error handler caught any
Keychain read failure and called `clearAllSecureData()`, which deleted the
E2EE identity key along with the tokens. But a read fails for two different
reasons — *transient* (device locked, Keystore busy) and *permanent* (restored
to a new device) — and treating the first as the second **deletes the key that
makes every message on the device readable, because the phone was locked when
a background task ran.** There is no recovery. Reads now return `null` and
delete nothing; clearing is something the user asks for, and the identity key
is not in the session-clear list at all.

**The privacy one:** the identity key was stored with default accessibility,
so iOS syncs it to iCloud Keychain and both platforms put it in device
backups. ADR-0002 says the server cannot read messages; a private key synced
to iCloud is **a key Apple holds a copy of**. Nobody attacked anything — the
default did it. Now `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, which is also precisely
why key backup has to be a designed v1 feature rather than a platform
accident.

Three more:

- **The access token was stored in SecureStore**, contradicting B4.2 and A4.2
  which both say memory-only. It lives 15 minutes; persisting it adds a copy
  to steal and saves nothing, since the refresh token replaces it in one
  request.
- **`value.length > 2048` against a byte limit.** `.length` is UTF-16 code
  units — `नमस्ते` is 6 units and 18 bytes. A guard that passes everything an
  English-speaking developer tests with and fails on a real user's data, in an
  app built for the Indian market. Now `TextEncoder`.
- **Migration was treated as the fix.** Moving a secret out of AsyncStorage
  limits future exposure and un-leaks nothing: it sat in plain text, and any
  backup taken since still has it. Session credentials are now dropped and
  re-issued by a fresh login; the identity key moves and is treated as
  compromised. **Moving it is housekeeping; rotating it is the fix.**

Also replaced a duplicated `AuthProvider` with a pointer to A4.2 — two
versions of the same component in two lessons is how they drift.

#### `b7/0002` access rules engine — done, 1,126 → 2,621 words

**A lesson titled "deny-by-default" that allowed by default in four ways.**

The biggest: `evaluateRules` selected one column — `rules` — and never asked
whether the token was still alive. Redemption checks `revoked_at`, so it looked
covered. It is not. **Redemption happens once; messages happen forever.** A
holder who redeemed in March has a conversation, a JWT and a live socket;
revoking in June sets a column nothing on the message path reads. The owner
presses the button the entire product is built around, watches the token vanish
from their list, and the messages keep arriving. State is now checked first, on
every action, before any rule.

The other three:

- **The `evaluateRulesSafe` wrapper was never called.** It caught exceptions;
  the integration code called `evaluateRules` directly. *A safe version that
  can be bypassed is not a safe version* — the try/catch now lives inside the
  one function everyone calls.
- **Unknown rule types were skipped.** Deploys are not atomic, so a new client
  writing `{"geo_fence": …}` hits old replicas that ignore the restriction the
  owner just set, silently, on a subset of requests.
- **Unreadable `rules` read as "no rules"** — corruption treated as consent.

Three correctness bugs:

- **Overnight windows allowed nothing.** `currentTime < start || >= end` is
  right for 09:00–18:00 and false at every minute of the day for 22:00–06:00,
  which is an ordinary do-not-disturb window.
- **The daily counter reset at 05:30 IST** — `setUTCHours(0,0,0,0)` while the
  time window used the owner's timezone. Ten messages at 9pm, ten more at half
  past five: "10 per day" quietly means up to 20 in one Indian day.
- **Count-then-allow race**, the same shape as `max_uses` in B7.1 — with the
  comment "correctness matters more than speed here" sitting directly above
  the racy version. Believing you chose correctness is not the same as having
  it.

Recorded rather than solved: `calls` is queried and created by no migration
(one of the audit's three orphan tables). Left to the B2 rewrite instead of
inventing a shape B2 would then have to be consistent with.

**Also written down so nobody optimises it away:** rules are deliberately not
cached, because `ARCHITECTURE.md` lists immediate revocation as one of four
properties everything else follows from. A 60-second cache makes revocation
take up to 60 seconds, and the difference between those two words is the
product. If reads ever hurt, make the truth faster — never let a stale answer
stand.

#### `b7/0003` revocation and pause — done, 1,139 → 2,569 words

**A named ADR-0003 violation at the centre of it.** The socket registry was a
`Map` in one process. Revoke arrives at replica A, the holder's socket is on
replica B, `getSocketsByTokenId` finds nothing, the loop does nothing, and the
endpoint answers **200 OK**. The owner is told the token is revoked; the
conversation stays live. Nothing errors, nothing logs, and it works perfectly
on a laptop with one process. ADR-0003 says it outright — stateless API, *no
node-local socket registry*, Redis required — and this is the case it was
written for. Now: local map of this replica's own sockets, decision broadcast
over Redis pub/sub.

**The correction that matters most is conceptual.** It is tempting to read the
lesson as "revocation works because we close the sockets". It does not — a
holder can reconnect a second later with a JWT valid for seven more days.
**What enforces revocation is the check on connect and on every action (B7.2);
the socket close is a courtesy that makes it immediate and visible.** Get that
backwards and the security property depends on a broadcast being delivered.
It is also why the whole thing survives a replica being mid-restart when the
message goes out.

Three more:

- **Not idempotent.** Revoke twice returned `400 Cannot transition from
  'revoked' to 'revoked'`. That happens when a user on a bad connection taps
  Revoke, sees nothing, and taps again — the app shows an error for the most
  safety-critical action in the product, and they conclude it did not work.
  Now `WHERE revoked_at IS NULL` and a 204 either way.
- **`PATCH /tokens/:id` with a `status` field**, contradicting B3.3's
  `POST /:id/revoke|pause|resume`. These are actions with consequences, not a
  field being edited.
- **`status` enum instead of `revoked_at`/`paused_at`**, contradicting B7.1 and
  B7.2. Timestamps answer *when*, which the audit needs, and the transition
  rules become `WHERE` clauses the database enforces rather than a lookup table
  two concurrent requests can both pass.
- **`ws.send()` then `ws.close()` on the next line** can drop the frame, so the
  holder sees an unexplained disconnect and reconnects thinking it was a blip.

**A verifier-vs-browser disagreement, handled properly.** Two `predict-output`
questions asserted `[false, true, true]` and `Set(0) {}` — correct in a browser
console, wrong under the verifier, which stringifies with `JSON.stringify`.
Rather than paper over it, both questions were rewritten to print unambiguous
values: how a host renders a `Set` is trivia about the host, not the concept.

#### `b9/0002` Coolify — done, 1,097 → 2,663 words

**ADR-0007's follow-on is now discharged.** `TOKEN_CODE_PEPPER` and
`TOKEN_CODE_KEY` are required environment variables, validated at startup with
`exit(1)` so a missing secret is a container that never becomes healthy rather
than one that fails on the first request that needs it.

**The lesson deployed a database and never mentioned backing it up.** On
managed hosting that omission is survivable because someone else made the
decision; on a VPS it is total — one disk, one machine, no snapshots unless
you asked. Added a backup section, and the three parts that are easy to skip:
restore drills (an untested backup is a belief), the fact that `pg_dump`
captures `code_hash` and `code_enc` and *nothing that makes them meaningful*,
and the awkward requirement that the secrets be recoverable **together with**
the dump and stored **apart from** it.

Three more:

- **`prestart` migrations run in every container.** Two replicas start
  together and both apply the same migration. One `pg_advisory_lock` and the
  second finds nothing to do — dead code on one box, the difference between a
  deploy and an outage on two. ADR-0003 in a paragraph.
- **No pgbouncer**, though CLAUDE.md requires it. Postgres allocates a process
  per connection and defaults to ~100; the failure mode is new connections
  refused while existing ones work, so the API looks healthy and half the
  requests fail. Retrofitting it means re-testing everything that assumed a
  session.
- **Health checks that test every dependency are a trap.** If `/health` fails
  on a Redis blip, the orchestrator kills containers *because a dependency is
  unwell*. Liveness ("is this wedged?") should test almost nothing; readiness
  may check Postgres; Redis belongs in neither, because sockets degrade
  without it and HTTP does not.

Also made the cost table honest: **TURN relay bandwidth is missing and is the
most likely surprise on the bill** — with `iceTransportPolicy: 'relay'` every
call's media crosses your server rather than going peer to peer. And the
single-box ceiling from CLAUDE.md is now written into "what this costs you"
rather than living only in the orientation doc.

#### `b6/0001` signalling — done, 1,616 → 2,873 words

**The Token-specific point this lesson was missing entirely:** WebRTC is
peer-to-peer, and a peer connection means each side learns the other's **IP
address**. Someone holding a code — who by design knows no name, number or
email — places a call and their client logs an address that geolocates to a
neighbourhood. Nothing is hacked; that is how WebRTC works.
`iceTransportPolicy: 'relay'` is the line that prevents it, and it is now
explained as the privacy/bandwidth trade it actually is rather than mentioned
in passing as "when privacy matters".

A quiz question asserted the opposite as its takeaway — *"zero audio/video
through your server"* — which is true of default WebRTC and false for Token.
Rewritten.

**Node-local `Map` again, and it fails harder here than in B7.3.**
`isInCall(calleeId)` consults one replica's memory, so busy detection silently
stops working, and `call:incoming` is looked up in a socket table that does not
contain the callee. **Calls between users on different replicas never connect**
— caller waits, callee's phone never rings, nothing errors. Moved to Redis.

Which introduced the next failure, so it is covered too: cleanup runs in the
hangup handler, and a process killed mid-call never reaches it. Without a TTL
both participants stay marked busy **forever** and can never call again. Every
piece of state a crash can orphan needs an expiry chosen as a deliberate upper
bound — an hour is not "how long calls last", it is "how long is it acceptable
to be wrong".

**The rules engine was never consulted on the call path.** A token whose owner
turned video off, paused it, restricted it to office hours, or revoked it last
week could still place a call, because the conversation existed and nothing
re-asked. Same shape as the B7.2 finding, second location — generalised in the
lesson as: **every path that lets a holder reach the user is an authorisation
point**, not just the door they came in through.

Recorded, not patched: the code treats `holder_id` as a user id while B7.1 is
explicit that holders never become rows in `users`. The two lessons disagree
about what a holder is; it belongs to the B2 rewrite alongside the `calls` and
`participants` orphan tables.

#### Trap that bit twice

**Two escaping failures while writing `b3/0003`, both caught by the verifier**, both
the same family as the `</script>` trap: a scripted edit put real newlines
inside a double-quoted JS string, and an unescaped backtick inside the
`solution:` template literal ended it early. Neither is visible by reading —
run `verify-lesson.mjs` after *every* scripted edit, not at the end.

**ADR-0007 has follow-on work in three of them.** `b7/0002` and `b7/0003` look
tokens up by code and must use `code_hash`; `b9/0002` (Coolify) must add
`TOKEN_CODE_PEPPER` and `TOKEN_CODE_KEY` as required environment variables and
put them in the backup runbook. Do not deepen those without applying it.

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

`COURSE-REVIEW.md` §6 item 1.2: a pure-JavaScript token issuer — generate,
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
`COURSE-REVIEW.md` §12.5 anticipates — **do not "fix" it**; removing it would
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

What remains in COURSE-REVIEW.md §6 Phase 1:

| # | Work | Status |
|---|---|---|
| 1.1 | Retrofit `01/0005`–`01/0012` | **done** |
| 1.2 | Capstone at the end of Module 01 | **done** — Token repo `221e6b0` |
| 1.3 | One "explain it in your own words" prompt per lesson | **done** for Module 01; Module 02's come with 1.5 |
| 1.4 | Spaced review from the previous two lessons | **done** — built into each retrofit |
| 1.5 | Same retrofit for Module 02, just-in-time | not started |

**Phase 1 is now done except 1.5**, which is deliberately just-in-time.

**Recommended next: 1.5, when the student actually reaches Module 02** — and
it is a bigger job than 1.1 was per lesson, because Module 02 needs the
practice retrofit *and* the Token reframe (the WhatsApp clone, Priya, read
ticks) in one pass. The Firebase half is already done. Before writing any of
it, decide how a React Native exercise gets verified: `verify-lesson.mjs`
cannot run RN, so either the self-checks target plain functions the screens
call, or Module 02 exercises are recorded `unverifiable` with a reason. That
decision comes first, not after the lessons are written.

Phase 2 (deepen the ~20 spine lessons) is the other candidate, and it does not
depend on where the student is.

**Do not start Module 02 (1.5) yet.** The student is on lesson 5 or 6 of 12;
Module 02 is just-in-time work and writing it now is exactly the batching-ahead
the working discipline forbids. When it does start, note that `verify-lesson.mjs`
cannot run React Native code — Module 02's exercises will need a different
verification story, and deciding what it is comes before writing the lessons.

**When the student reaches the capstone**, they need Node 19+ on the machine
(`node -v`) — `crypto.getRandomValues` as a global is the only environment
requirement in the whole module. Worth checking before they get there rather
than at the exercise.

Two things to check before writing any further lesson, both of which have now
bitten more than once:

- **Premise-in-comment questions** (`// Given: <div>…`, `// User clicks`).
  Found in 0007 (3) and 0008 (all 5); absent in 0009 and 0010. Cheap to grep:
  `grep -c "// Given\|// User \|// Assume"`.
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
