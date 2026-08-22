# Token Course — Claude Orientation

## START HERE — resume protocol

**Run the audit before trusting anything in this file.**

```bash
node scripts/audit.mjs        # ground truth: writes PROGRESS.md
cat SESSION.md                # what was in flight
git status && git log -5      # what landed, what is mid-edit
```

Five steps, in order:

1. Read this file for architecture and conventions
2. `node scripts/audit.mjs` — recomputes state from the files
3. `SESSION.md` — **In progress / Next action / Blocked**
4. `git status` + `git log -5` — uncommitted work is the only thing at risk
5. Reconcile and continue

**The audit should say `OK`.** It has since 2026-08-18, which is the first time
in the project's history — so a red audit now means something rather than being
the background state. If you touch `assets/` or `scripts/`, run the five suites
too; together they take a few seconds:

```bash
node scripts/test-quiz-shuffle.mjs      node scripts/test-dom-sandbox.mjs
node scripts/test-check-pre-blocks.mjs  node scripts/test-playground-dom.mjs
node scripts/test-explain.mjs
```

### Document precedence — one fact, one home

| File | Owns | Written by |
|---|---|---|
| `PROGRESS.md` | Anything a script can compute — counts, coverage, verification state | **Generated only.** Never hand-edit |
| `scripts/known-issues.json` | Real errors that are known, gated and deliberately not blocking the audit | Hand, one entry per problem |
| `SESSION.md` | In progress / Next action / Blocked, **and per-item phase status** | Hand, before each unit of work |
| `CLAUDE.md` (this file) | Architecture invariants, conventions, product rules | Hand |
| `HANDOFF.md` | Narrative — why decisions were made, what failed, session log | Hand, appended each session |
| `ARCHITECTURE.md` + `docs/adr/` | Technical design and the decisions behind it | Hand |
| `TOKEN-TRACK.md` | Lesson map, sequencing, and the phase **plan** — what the work is, never how far it has got | Hand |

**Where "how far along are we?" is answered:** the phase-level headline is in
`TOKEN-TRACK.md`'s work plan, per-item status is in `SESSION.md`, and every
countable thing is in `PROGRESS.md`. Three files, three different questions —
and deliberately no status column in the phase tables, because a fact with
three homes has three chances to be wrong.

**A green audit is the point.** It used to exit `FAIL` on the same three orphan
tables every single run, which trains everyone to ignore the exit code — and
then a *new* error lands in a build nobody reads. That is how this course lost
its fill-blank warning and its example-code check. Real problems that cannot be
fixed yet get an entry in `scripts/known-issues.json` with a **why** and a
**gate**; they print under "Known and blocked", still visible, and stop holding
the build red. **An entry is not a fix.** The list is kept honest from both
ends: an unacknowledged error fails, and an acknowledgement that no longer
matches any error *also* fails, as stale — otherwise the file becomes where
errors go to be forgotten.

**The rule that prevents drift: this file and `HANDOFF.md` never restate a
number the audit can compute.** They point at `PROGRESS.md` instead. Prose
asserting something checkable is exactly how "Modules 1 and 2 complete"
survived for months against a student on lesson 2, and how `search-index.json`
decayed to 65 of 95 entries unnoticed. If a document disagrees with the audit,
**the audit is right**.

**Never infer student progress from the files.** Written ≠ studied. That
inference produced the false claim above. Ask, or read `progress.js`
localStorage.

### Working discipline

- **Write-ahead:** update `SESSION.md` *before* starting a unit of work, not after
- **Commit per unit** — one lesson, one script, one fix. Maximum loss from an
  abrupt stop is one unit
- **Architectural reasoning goes into an ADR as it is decided**, not at the end.
  A conclusion without its argument doesn't survive the session

## What this project is
A two-track HTML course teaching one student (Ashish) to build **Token** — a
privacy-first mobile app for the Indian market where users issue revocable
capability tokens instead of sharing phone numbers or emails. Deny-by-default:
nobody contacts the user unless the user issued them a token.

The course lives as plain HTML files opened in a browser. No server, no
framework for the course itself. The *product* being built has its own repo.

## The product being built — Token

A user issues a token (e.g. `MERC-8GH2-KP4X`) to anyone who needs to reach
them. The holder redeems it at `tokn.app/t/CODE` — a web page — and
communicates through that page. They never learn the user's phone number,
email, or identity. The user can set rules, pause, or revoke at any time.

### Token code format — the alphabet is a hard constraint

```
23456789ABCDEFGHJKMNPQRSTUVWXYZ    ← 31 characters
```

36 alphanumerics minus the 5 ambiguous ones: **0, O, 1, I, L are excluded.**
Codes are 12 characters in three groups of four: `MERC-8GH2-KP4X`.

**Every example token you write anywhere — lesson, quiz, doc, test — must be
valid under this alphabet.** The canonical example was `MERC-8GH2-LP4X` for <!-- audit-allow-token-here: the historical wrong value, named so it stays recognisable -->
months; the `L` made it a code the product could never generate, and it had
spread to 36 files including this one before anyone checked. Three quiz answers
were wrong purely because they were regex tests against it.

Derived figures, so nobody recomputes them wrongly again:
- 31<sup>12</sup> ≈ 7.9 × 10<sup>17</sup> possible codes (~25,000 years to
  exhaust at 1M/sec)
- modulo bias: 256 / 31 = 8 remainder 8, so the **first 8** characters are
  12.5% more likely than the rest
- indices 26–30 are `V, W, X, Y, Z`

Note ~15 other example tokens still contain excluded characters. Some are
accidental; some look like deliberate negative fixtures — `TEST-1234`,
`NOPE-0000`, `IJKL-3333`, where being invalid is the point. Telling them apart
needs reading each in context: rewriting a fixture meant to be rejected breaks
its lesson. **Do not bulk-rewrite them.**

**The audit now guards the alphabet itself, not just example codes.** Three
lessons — including `b7/0001`, the server that actually generates codes —
taught `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` and commented it "no 0/O/1/I/L"
while including **L**. A wrong example code is one bad code; a wrong alphabet
is an unlimited supply of them, and the server was emitting codes the client's
validator rejects. Any string literal of 20+ `A-Z0-9` characters that looks
like an alphabet must now equal the canonical one, or the audit **errors**.
A lesson that shows a wrong alphabet deliberately opts out by containing the
string `audit-allow-alphabet`.

**A lesson whose *subject* is invalid codes opts out of the example-code check
with `audit-allow-token-fixtures`.** `02/0004` teaches the redemption field and
`01/0012` validates codes before calling the API, so both carry deliberately
impossible codes as the thing being rejected — `01/0012`'s `MERC-8GH2-KP4O` is <!-- audit-allow-token-here: naming the fixture is the point of the sentence -->
the canonical example with its last character swapped for an excluded letter,
which is precisely why it is useful. Standing warnings about those would train
everyone to ignore the list. The bargain is deliberately narrow: **the alphabet
check is an error and still applies to opted-out files.** A wrong example code
is one bad code; a wrong alphabet is an unlimited supply, and that one is never
opt-outable.

**One line, not one file: `audit-allow-token-here`.** A file that must keep
being scanned, but has a single legitimate reason to name a bad code, marks that
*line* instead. This file is the only user: the paragraph above names
`MERC-8GH2-LP4X` while explaining why it was wrong, and the check was warning <!-- audit-allow-token-here: same historical value as above -->
about the documentation of the bug it exists to prevent. A whole-file opt-out
here would be actively dangerous — `CLAUDE.md` carries the canonical code a
lesson copies, which is how the original spread to 36 files. **A marker must be
claimable only by the content it guards.**

### Token repo layout (one git repo, four folders)

**It is a separate git repo, beside this one, at `GIT/token/`** — not inside
`git-learn/`. Its own commits, its own history. `ARCHITECTURE.md` and the ADRs
live there.

```
token/
  app/          ← React Native + Expo (mobile client)
  web/          ← Vite + React (redemption web page)
  api/          ← Node.js + Express/Fastify (backend)
  shared/       ← TypeScript types, API client, zod validation schemas
  practice/     ← lesson exercises; 01-token-issuer is the Module 01 capstone
  docs/adr/     ← the decisions, numbered and append-only
```
No monorepo tooling — plain folders with tsconfig path aliases.
`web/` is a plain web app (Vite + React), NOT React Native Web.
`web/` and `api/` both deploy as containers on the same Coolify VPS.

---

## Course structure
```
index.html                          ← course home page
modules/
  01-javascript-fundamentals/       ← 12 lessons + `0013` capstone (see PROGRESS.md
                                       for what carries practice and what is verified)
  02-react-native/                  ← 14 lessons, retrofitted 2026-08-17: practice
                                       pattern throughout. WhatsApp fixtures and
                                       palette removed 2026-08-18 — four `chat`/
                                       `avatar` mentions remain ON PURPOSE (the
                                       "Token cannot show a face" contrasts)
  x1-git-dev-environment/           ← 3 lessons, complete
  a2-typescript/                    ← 3 lessons, complete
  x2-debugging/                     ← 2 lessons, complete
  b1-sql-fundamentals/              ← 4 lessons, complete
  b2-schema-design/                 ← 3 lessons, complete
  b3-node-http-server/              ← 4 lessons, complete
  b4-auth-server/                   ← 3 lessons, complete
  a3-api-consumption/               ← 4 lessons; M3 pass 2026-08-18 (0002 is
                                       TypeScript, so it cannot be executed)
  a4-auth-client/                   ← 3 lessons; M3 pass 2026-08-18
  (03-firebase-backend/)           ← DELETED 2026-08-16. Firebase is out of
                                      scope; Track B replaces it
  (04 … 09/)                        ← DELETED 2026-08-22, 40 pre-pivot lessons.
                                      They had been carried as "partially
                                      salvageable" since the pivot and nobody
                                      ever salvaged any of it. All in git
                                      history if ever wanted back
assets/
  styles.css                        ← shared stylesheet
  quiz.js                           ← createQuiz() widget (multi-type)
  playground.js                     ← createPlayground() inline JS editor
  dom-sandbox.js                    ← in-memory document for DOM playgrounds
  solution.js                       ← createSolution() exercise-first component
  explain.js                        ← createExplain() "in your own words" prompt
  progress.js                       ← lesson/module progress tracking (localStorage)
  copy-code.js                      ← auto-attaches Copy buttons to <pre> blocks
  search.js                         ← client-side search on index.html
  search-index.json                 ← static search index (title, module, path, keywords)
reference/
  js-basics-cheatsheet.html
docs/archive/                       ← closed session logs, split out of HANDOFF.md
TOKEN-TRACK.md                      ← full two-track plan with sequencing
MISSION.md  NOTES.md  RESOURCES.md  ← the `teach` skill's interface; it reads
                                       these by name. CLAUDE.md wins on any
                                       overlap — see the note in each
HANDOFF.md                          ← project handoff / state summary
```

## Running / viewing lessons
No build step. Open any `.html` file directly in a browser.
The quiz widget is loaded via `<script src="../../assets/quiz.js"></script>`.
All lessons in `modules/` share `assets/styles.css` and `assets/quiz.js`.

### Additional shared scripts (load after quiz.js)
```html
<script src="../../assets/dom-sandbox.js"></script>  <!-- before playground.js -->
<script src="../../assets/playground.js"></script>
<script src="../../assets/solution.js"></script>
<script src="../../assets/explain.js"></script>
<script src="../../assets/progress.js"></script>
<script src="../../assets/copy-code.js"></script>
```
Not every lesson needs all of them — only load what's used. `dom-sandbox.js` is
the one with an ordering requirement: `playground.js` looks for it at Run time,
so it must come first, and only DOM lessons need it at all.

## Link paths inside module lessons
From any `modules/XX-name/` subfolder:
- Stylesheet:  `../../assets/styles.css`
- Quiz script: `../../assets/quiz.js`
- Cheatsheet:  `../../reference/js-basics-cheatsheet.html`
- Same module: `./0002-topic.html` (no prefix)
- Module home: `./README.html`

---

## Course tooling — shared components in `assets/`

### `createQuiz(containerId, questions)` — `quiz.js`

Questions without a `type` field default to multiple-choice (backward-compatible).
New question types use a `type` field:

```js
createQuiz("lesson-quiz", [
  // Multiple-choice (existing, no type needed)
  { question: "...", options: [...], correct: 1, explanation: "..." },

  // Predict-output
  { type: "predict-output", code: "console.log(2 + '2')", answer: "22", explanation: "..." },

  // Predict-output about the DOM — `html` is the starting page, shown to the
  // student above the code and loaded into the sandbox by verify-lesson.mjs,
  // so what they read and what the key is checked against cannot drift apart.
  { type: "predict-output", html: '<p class="msg">one</p><p class="msg">two</p>',
    code: 'console.log(document.querySelectorAll(".msg").length);',
    answer: "2", explanation: "..." },

  // Spot-the-bug (options point to lines/sections)
  { type: "spot-the-bug", code: "...", bugLine: 3, options: ["Line 1", "Line 3", "Line 5"], correct: 1, explanation: "..." },

  // Fill-blank (code with ___ placeholder)
  { type: "fill-blank", code: "const x = arr.___((a, b) => a + b, 0);", answer: "reduce", explanation: "..." },

  // Which-breaks (multiple snippets, one fails)
  // `correct` = the one that BREAKS. The renderer always prints the fixed
  // prompt "Which of these will fail?" above the options, whatever your
  // `question` text says — see the warning below.
  { type: "which-breaks", variants: ["code A", "code B", "code C"], correct: 1, explanation: "..." },

  // Order-steps (click in correct sequence)
  { type: "order-steps", steps: ["connect", "handshake", "send", "close"], correctOrder: [0, 1, 2, 3], explanation: "..." }
]);
```

### `createPlayground(containerId, starterCode, options)` — `playground.js`

Embeddable JS editor. Textarea + Run + Reset buttons. Sandboxed execution,
captured `console.log` output displayed below. Errors shown in red.

```html
<div id="playground-1"></div>
<script>
  createPlayground("playground-1", `const tokens = ["ABC", "DEF"];\nconsole.log(tokens.length);`);
</script>
```

Two limits described here for months — async output swallowed, no infinite-loop
guard — **were fixed in `5b07d93`** and the paragraph saying otherwise survived
two more lessons. `await` and `.then()` now print, and a runaway loop is stopped
by a 2s budget plus a 1000-line output cap.

#### DOM playgrounds — `options.dom`

Student code normally runs in the page's own scope, where `document` is the
real lesson page and `localStorage` is where `progress.js` keeps the student's
completed lessons. In a DOM lesson that is a live hazard, not a theoretical
one: `document.body.innerHTML = ""` deletes the lesson being read, and
`localStorage.clear()` erases their progress. Both are things a beginner types
on purpose while experimenting.

Pass `{ dom: true }` and the playground swaps in the in-memory document from
`assets/dom-sandbox.js`, plus a fake `window` and `localStorage`, and shows the
resulting markup in a preview pane above the console output. `options.html` is
the sandbox's starting `<body>`. **Every playground in a lesson that touches
`document` or `localStorage` must set `dom: true`** — the sandbox is only
protective where it is switched on.

```html
<script src="../../assets/dom-sandbox.js"></script>   <!-- before playground.js -->
<script>
  createPlayground("pg-append", `const list = document.getElementById("token-list");
const row = document.createElement("li");
row.textContent = "MERC-8GH2-KP4X";
list.appendChild(row);`, { dom: true, html: '<ul id="token-list"></ul>' });
</script>
```

It is a teaching sandbox, **not a security boundary** — it prevents accidents,
not attacks. Its deliberate limits (no `>`/`+`/`~` or pseudo-class selectors, no
layout, no CSS cascade) are listed at the top of `dom-sandbox.js`. Check them
before writing a lesson that leans on one.

### `createSolution(containerId, config)` — `solution.js`

Exercise-first component: shows the exercise, optionally hints, then solution.

```html
<div id="exercise-1"></div>
<script>
  createSolution("exercise-1", {
    exercise: "Build a function that generates a token code in the format XXXX-XXXX-XXXX.",
    hints: [
      "Use Math.random() and toString(36) to generate random characters.",
      "Split into groups of 4 with a helper function."
    ],
    solution: `function generateToken() {\n  // ...\n}`
  });
</script>
```

### `createExplain(containerId, config)` — `explain.js`

One prompt per lesson, sitting between the exercise and the quiz. The student
writes the idea out in a sentence; the answer is saved to `localStorage` and
restored on the next visit.

```html
<div id="explain-0006"></div>
<script>
  createExplain("explain-0006", {
    prompt: "Explain how the token list inside <code>createIssuer()</code> is still there long after it has finished, while no code outside can reach it."
  });
</script>
```

- `config.prompt` may contain inline HTML (it is set with `innerHTML`, like
  `createSolution`'s exercise text). Author content only — never student input.
- Storage is one key, `jslearn-explain`, holding
  `{ "<lesson file>::<containerId>": { text, savedAt } }` — the same
  one-key-one-object shape `progress.js` uses. The lesson file is part of the
  key, so the same container id in two lessons cannot collide.
- Saving an empty box **deletes** the entry rather than storing blanks.
- Every read and write is wrapped: a browser with storage disabled shows
  "could not save" instead of taking the lesson down with it.
- `createExplain.count()` returns how many prompts have been answered. Nothing
  reads it yet; it exists so a "7 of 13 written" line needs no format change.

**Why it saves rather than just asking.** Every other component in the course
tests recognition — a quiz offers four answers, a self-check runs code the
student already wrote. The sentence you cannot finish is the one thing that
names the section to re-read, and it is the only record of what was actually
understood as opposed to what was clicked.

Verify it with `node scripts/test-explain.mjs` (18 assertions, run against
`dom-sandbox.js` so it exercises the same DOM the browser gives it).

### `progress.js` — auto-loaded on every page

- `markComplete(lessonPath)` / `isComplete(lessonPath)` / `clearProgress()`
- Adds a "Mark complete" button at the bottom of each lesson
- On `README.html`: renders a per-module progress bar
- On `index.html`: overall progress + "Resume where I left off" link

### `copy-code.js` — auto-runs on DOMContentLoaded

Finds every `<pre>` block and injects a small "Copy" button (top-right).
Confirms with a checkmark on click. No configuration needed — just load it.

### Client-side search — `search.js` + `search-index.json`

- `search-index.json`: static array of `{ title, module, path, keywords }`
- `search.js`: reads the index, renders a filtered list from a text input
- Used only on `index.html` (the search input is added there)
- No build step — index is maintained manually or regenerated with a script

---

## Two-track plan (see TOKEN-TRACK.md for full detail)

**Track A — Mobile & Web Client**
TypeScript → API consumption → client auth → core token features → chat →
voice/video → redemption web page → deep linking → device security → polish

**Track B — Backend**
SQL → schema design → Node/Express → server auth → WebSocket → WebRTC
signalling → token engine → push → Docker/Coolify → security/DPDP

**Cross-cutting (early)**
Git & dev environment, debugging

Tracks interleave — the app can't work without the API, and the API is
pointless without a client. See TOKEN-TRACK.md § "Recommended sequence".

---

## Architecture — fixed decisions

**The full reasoning lives in `token/ARCHITECTURE.md` and `token/docs/adr/`.**
This is the summary. Where the two disagree, the ADRs win — they carry the
alternatives that were rejected and why, which is what stops a decision being
re-litigated every few months.

> **"Do not revisit" means not casually.** The student revised four of these on
> 2026-08-15, deliberately, after being shown the costs. That is the only
> legitimate way they change — see `HANDOFF.md` for the reasoning on both sides
> of each, so a future session does not "helpfully" revert them.

### The two constraints that shape everything else

**1. Messages are end-to-end encrypted from v1** (ADR-0002). The server stores
ciphertext and cannot read it. This *removes options*, and every lesson touching
messages must respect it:

- No server-side search — search runs on-device over the SQLite cache
- No server-side content moderation — see ADR-0006, abuse handling works from
  user-submitted reports (with signatures proving authorship) and metadata
- Multi-device needs explicit key sharing; there is no server copy to sync
- Key backup and recovery is a **v1 feature**, not a later nicety — and it must
  not be a server-held copy of the key, or the guarantee is theatre

**2. Built to scale out, deployed on one box** (ADR-0003). The architecture
assumes N replicas; the deployment runs one until traffic says otherwise.
Retrofitting statelessness or partitioning is a rewrite; adding a replica is a
config change.

- The API is **stateless** — no in-memory session, no node-local socket registry
- **Redis is required, not optional** — socket fan-out via pub/sub, presence as
  TTL keys, rate limiting as shared counters. Without it a second replica
  silently drops messages between users on different nodes
- Postgres connections go through **pgbouncer**
- `messages` is **partitioned by time from the first migration**
- Media never transits the API

### Mobile app — `app/`
- React Native + Expo, EAS Build, TypeScript
- Both iOS and Android — never suggest Android-only shortcuts
- Local cache: SQLite. Private keys in `expo-secure-store` (Keychain / Keystore),
  **never** `AsyncStorage`
- EAS Build required for WebRTC (native code; Expo Go cannot run it)

### Redemption web page — `web/`
- Vite + React (plain web app, **NOT** React Native Web)
- Native browser WebRTC and WebSocket APIs
- Deployed as a container alongside the API

### Backend — `api/`
- Node.js + TypeScript, Express or Fastify (decided during B3)
- PostgreSQL — primary datastore, pooled and partition-aware, behind pgbouncer
- **Redis — required** (ADR-0003)
- Raw SQL via the `pg` driver first, Drizzle later.
  **Never Prisma** — it hides the query layer, and learning SQL is a goal here
- Parameterised queries always (`$1`), never string concatenation

### The token code is never stored in the clear (ADR-0007)

`tokens` holds two derived columns and not the code:

- `code_hash` — SHA-256 of the normalised code plus a server-side pepper,
  `UNIQUE`, and the only way a code is looked up
- `code_enc` — AES-256-GCM, decrypted only when the owner asks to see that one
  token, and logged when it happens

Deliberately **not** bcrypt or argon2: they salt randomly, so a row could not
be found by its code without scanning the table. `TOKEN_CODE_PEPPER` and
`TOKEN_CODE_KEY` are required environment variables, validated at startup.
**Lose them and every token ever issued is permanently unusable** — they belong
in the disaster-recovery plan, stored somewhere the database backups are not.

Three consequences that reach beyond the schema, and are the reason this is
summarised here rather than left in the ADR:

- **Codes never go in a URL path.** A path reaches the proxy's access log,
  browser history, `Referer` and crash reports. Owner endpoints take `:id`; the
  redemption endpoint takes the code in a POST body — `POST /api/redeem` and
  `POST /api/redeem/check`, both with `{ code }` in the body. This costs the
  check endpoint its GET, which it would otherwise deserve, and that is the
  right trade. **Several lessons still violate this** — `b3/0002`, `a9/0002`,
  `a2/0002`, `a3/0002` — see `SESSION.md`; `a8/0002` is the corrected model.
  - The one place the code legitimately *is* in a path is the redemption **page**
    URL the QR encodes, because a browser has to get there somehow. That path is
    defended with headers instead: `Referrer-Policy: no-referrer`,
    `Cache-Control: no-store` and a per-path `X-Robots-Tag` from nginx — never a
    `robots` meta tag, which one SPA `index.html` would apply to the whole site.
- **Codes never go in a log.** The redeem body is the sensitive part precisely
  because the code was moved there. Log an allow-list of fields, and configure
  the error tracker's scrubbing — it attaches request bodies by default.
- **The code is returned exactly once**, in the response to `POST /tokens`.
  Everything else shows the label and the state. Showing it again is a separate,
  logged request. In particular `GET /tokens` returns **no `code` field at all** —
  serving a list of codes would mean AES-decrypting every row on every scroll.

### Token state — the two conventions that keep being got backwards

- **`max_uses`: `null` is unlimited, `0` permits no uses at all.** Opposite
  meanings, and only one of them is falsy, which is why `if (token.max_uses)`
  is wrong and `token.max_uses != null` is right. `01/0011` teaches this and
  `a5/0003` shipped a sample row contradicting it. Same for `expires_at`:
  `null` means never, and `new Date(null)` is 1970, so test for null *before*
  parsing.
- **Stored status is not displayed status.** The `status` column holds
  `active | paused | revoked`, but a token also dies when `expires_at` passes
  or its use count reaches `max_uses`, and nothing writes to the row when a
  clock ticks over. The badge derives five states from three, in a fixed
  precedence: **revoked → expired → exhausted → paused → active**. Paused comes
  last of the four deliberately — a paused-and-expired token reading "paused"
  offers a Resume button that would achieve nothing. See `a5/0003`.

- **State is stored twice on purpose, and the database enforces the
  agreement** (decided 2026-08-20, after five lessons disagreed). `status` is
  what you **read** — one field, what the badge renders and what `canRedeem`
  branches on. `paused_at` and `revoked_at` are what you **write**, so a
  transition is a `WHERE` clause Postgres enforces rather than a check two
  simultaneous requests can both pass:

  ```sql
  UPDATE tokens SET status = 'revoked', revoked_at = NOW(), paused_at = NULL
   WHERE id = $1 AND revoked_at IS NULL;
  ```

  The duplication is made safe rather than tolerated, by two **biconditional**
  constraints that refuse disagreement in either direction:

  ```sql
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CHECK ((status = 'paused')  = (paused_at  IS NOT NULL))
  ```

  Note `paused_at = NULL` in the revoke — a revoked token is not a paused one,
  and the second constraint would reject the row otherwise. **The state
  machine's exclusivity is a database fact, not a convention.** See `b2/0001`.

- **There is no `use_count` column** (decided the same day). The number of uses
  is counted from `conversations`. A stored counter is a second copy of a fact
  and every way it drifts — a transaction that fails after incrementing, a
  manual fix, an ordinary bug — ends with a token permitting the wrong number
  of uses, silently.

  The cost is real and is not hidden: **the limit can no longer be a `CHECK`
  constraint**, because there is no column to constrain. Enforcement lives in
  the redemption transaction, which takes `FOR UPDATE` on the token row, counts,
  then inserts — see `b7/0001`. `idx_conversations_token_id` is load-bearing
  rather than an optimisation. The API may still *return* a computed count;
  `a5/0003`'s `displayStatus` takes one.

### What the server knows about the user (decided 2026-08-22)

`users` holds `phone_hash`, `display_name`, `avatar_url`. **The phone number is
hashed at sign-up and kept**, because it is how a user gets back into their
account; passphrase-only sign-up was considered and rejected, since a lost
passphrase would be an unrecoverable account.

**Sign-in is by phone number, and there is no email anywhere** (asked and
answered 2026-08-22). The student was given the three options with their costs
and chose the phone. So `users` has **no `email` column and never will** —
which matches the out-of-scope list below, and means one identifier is stored
rather than two.

> **`b4-auth-server` contradicts this and has not been rewritten yet.** All
> three of its lessons teach `ALTER TABLE users ADD COLUMN email`, an
> argon2 `password_hash`, and `/register` + `/login` keyed on email. That is
> the *only* place in the course still doing so, it predates the decision, and
> **`b2/0001` is right where `b4` is wrong.** Do not "reconcile" them by
> adding an email column to the schema. See `SESSION.md`.

**The number is proved by SMS OTP through an aggregator** (decided
2026-08-22). This is a deliberate addition to the third-party list, made on
the FCM/APNs precedent, and the distinction that keeps the rule coherent is:
**the banned comms SDKs would carry the conversation, which is what E2EE
exists to protect. An OTP carries six digits to a phone the user already
owns, once.** One authenticates entry to the product; the others replace it.

**There is no password anywhere in Token** (decided 2026-08-22). The OTP *is*
the login. The device then holds a long-lived credential in
`expo-secure-store`, so a user proves the number once per device rather than
once per session. `users` has no `password_hash` column, and **`b4/0001`'s
argon2 material is being removed rather than rekeyed** — there is no secret
left for it to hash.

> **The consequence that must shape C5: whoever controls the SIM controls the
> account.** That is the accepted cost of an OTP-only login, and it is fine
> for the *account* — an attacker gets the token list, which is bad but
> recoverable. It is **not** acceptable for the message history, so **the
> E2EE key backup must never be recoverable by SMS alone.** Anything that lets
> a fresh SIM-swapped device decrypt old messages hands the whole ADR-0002
> guarantee to whoever ports the number. C5 designs the second factor; this
> file only records that it needs one.

**The session does not expire** (decided 2026-08-22). The refresh token *is*
the device credential: minted on successful verification, kept in
`expo-secure-store`, and valid until the user logs out or revokes that device.
It is not re-issued on a schedule and there is no weekly re-verification.

Two reasons, and the second is the one that decides it:

- **A re-login SMS costs money and proves nothing.** The attacker holding the
  phone also receives the code, so periodic re-verification buys no security
  against the threat it appears to address.
- **A stolen unlocked phone is `a10`'s problem, not auth's.** The biometric
  app-lock is the control for that, and it works whether the session is an
  hour old or a year old.

`b4/0002`'s 15-minute *access* token is unchanged and still correct — short
access, long refresh. What changed is that the refresh token no longer expires
after 7 days, and revocation becomes **per-device** rather than time-based.

**`display_name` is collected immediately after the first successful
verification** (decided 2026-08-22), on a screen the user cannot skip. The
column stays `NOT NULL`; making it nullable was considered and rejected,
because every render site would then need a `?? 'Unnamed'` fallback — the
exact hazard `a11/0003` found when `''` was allowed through validation. The
verify-code response carries `needsDisplayName` so the client knows to show
the screen.

Two consequences that are not "later":

- **DLT registration with TRAI is required to send a transactional SMS in
  India at all**, plus a registered sender header and pre-approved templates.
  That is a lead time measured in weeks. Start it before it is on the critical
  path.
- **An OTP flow is a denial oracle by construction.** "We sent a code" versus
  "no such account" tells an enumerator which numbers are registered, across
  a phone-number space small enough to enumerate completely. The response must
  be identical either way — the fifth layer this same rule has had to be
  applied at, after `b7/0001`, `a8/0002`, `b3/0004` and the login in
  `b4/0001`.

**So do not write "Token does not collect your phone number."** A ten-digit
Indian mobile has a known prefix and a small enough space to enumerate, so
`phone_hash` is a lookup key, not an anonymisation — the same argument
`b3/0001` makes about a different column. The accurate sentence, and the one
lessons and the privacy policy must use, is **"we store a scrambled version of
your phone number, used only to sign you in."**

**Two different claims that had been collapsed into one line**, and only one of
them was ever true:

- *What a token holder learns* — **nothing**: not the number, not the email,
  not the identity. This is the product's actual promise and is unaffected.
- *What the company collects* — a hashed number and a display name.

Most "no phone number" phrasing across the course is about the first and is
fine. `b10/0002` was making the second claim, in a compliance document, and was
corrected. **When you see the phrase, check which one it means.**

### Communication
- Chat: WebSocket on own server, routed across nodes through Redis pub/sub
- Voice/video: WebRTC (`react-native-webrtc` on mobile, native APIs in browser)
- Signalling: own WebSocket server — **not** Firestore
- TURN: self-hosted coturn. STUN is **not** used — see below
- **`iceTransportPolicy: 'relay'` on both clients, mobile and web.** ICE
  candidates *are* IP addresses, so any direct path hands each side the other's
  address — on the redemption page that means a delivery company learning the
  issuer's home IP, which undoes the hashed codes, the labels and the E2EE all
  at once. Relay-only is why STUN is pointless here: a `srflx` candidate is
  exactly the thing being suppressed. Cover the trade-off in any lesson that
  touches it: **every** call goes through TURN including two people in one room,
  relay bandwidth is the likeliest surprise on the bill, and a coturn outage
  becomes a *total* call outage rather than a degraded one. `a8/0003` is the
  worked version; **check `a7-voice-video` still needs this** (see `SESSION.md`)

### Push notifications
- FCM + APNs via Expo Notifications (the only unavoidable third party — only
  Apple and Google can wake a backgrounded app)

### Deployment
- Coolify on a VPS, deploy from git
- `api/` and `web/` as containers; Postgres and Redis as containers
- Automatic TLS via Coolify
- **The single-box ceiling, stated honestly:** a few thousand concurrent
  WebSocket connections and low tens of thousands of users, bounded by memory
  and file descriptors first, then Postgres connections. Passing it means adding
  replicas, not redesigning

---

## Explicitly out of scope — do not teach, do not suggest

- **Firebase — all of it.** No Auth, no Firestore, no Storage, no Cloud Functions.
- **Phone-network (PSTN) voice.** Requires DoT telecom licence. Dropped.
- **Email.** No relay, no bridge, no transactional email.
- **Payment gateway.** Deferred (model subscription tiers in the schema, no integration).
- **Third-party comms SDKs** — no Agora, no Twilio, no Exotel, no Stream, no
  Sendbird. **An SMS OTP aggregator is the one exception** (decided
  2026-08-22): it authenticates entry rather than carrying the conversation.
  See *What the server knows about the user*. Do not read that exception as
  opening the door to the SDKs above — the same vendor selling both does not
  make them the same decision.
- **Prisma** — use raw SQL or Drizzle.

---

## Lesson format — invariants

### Track A (mobile & web) lessons

1. **"Why this matters" callout** at the top — tied concretely to **Token**,
   not to a WhatsApp clone. Use Token-relevant names: `tokenCode`, `issuedTo`,
   `redemptionEvent`, `accessRule`, `revokedAt`.

2. **Code examples** — every concept shown in code with Token context.
   For JS-only concepts, include a `createPlayground()` so the student can
   experiment inline.

3. **Exercise first, solution revealed after.** State what to build using
   `createSolution()`. Student attempts it, then reveals the full working
   solution. Optional hints between exercise and solution. Do NOT hand over
   complete code up front.

4. **Full runnable App.js / component** — the revealed solution must be
   complete and pasteable. No partial snippets as the final example.

5. **25+ quiz questions** using `createQuiz(containerId, [...])`.
   (This said "exactly 5" until 2026-08-15; every lesson has carried 25-30
   since the quiz expansion. The text was simply never updated.)
   Mix of types: predict-output, spot-the-bug, fill-blank, which-breaks,
   order-steps. Not all multiple-choice.

   **Answer positions: the exploit is fixed in the renderer, not in the data.**
   61.4% of keyed questions still have `correct` at index 1, and the audit still
   prints it — but `quiz.js` shuffles options at render (`optionDisplayOrder`),
   so that clustering is invisible to students and picking the second option
   scores nothing. The paragraph here claimed the ~64% exploit was live long
   after `quiz.js` had killed it; that was the same stale-prose failure as the
   playground loop-guard note below. Authored keys are deliberately left alone —
   rewriting 1,284 of them can break keys, a renderer change cannot.

   Two carve-outs where authored order *does* reach the student:
   - A question whose **explanation names a position** ("Option A creates…")
     renders as authored, because shuffling would contradict the explanation.
     All 48 of these were reworded on 2026-08-18, so the audit now reports
     `render-as-authored: 0` and every question shuffles. **Never write an
     explanation that names an option by letter or place** — describe what the
     option *says*. If that number rises above 0, one has crept back in.
   - Options whose meaning depends on position ("All of the above", "Both…")
     are pinned last. And per the note above, `quiz.js` shuffling is exactly why
     "Both A and B" is broken wherever it sits.

   **Never write an option that refers to the other options at all** — not
   "All of the above" (the audit errors on it), and not "All three", which the
   audit *cannot* see. Restructure so every option stands alone. `01/0006` q27
   had "All three — a function is just a value" as its **correct** answer and
   was safe only by accident: its explanation named a position, which stopped
   the whole question shuffling. Tidying that explanation would have dropped an
   all-of-the-above into the middle of the list. It is now four self-contained
   statements.

   The check stays narrow deliberately — widening it to catch "All three" gave
   two false positives out of three hits ("All three get equal space" is about
   flex children; "both of them" about two sessions). `test-quiz-shuffle.mjs`
   asserts that "All three…" is *not* pinned, so the gap stays visible instead
   of being forgotten. **This is the trap for anyone rewriting the remaining
   position-naming explanations: read the options before you unpin a question.**

   `order-steps` steps are shuffled at render, so `correctOrder` may be authored
   in any order.

   **Never tag a "which is correct?" question as `which-breaks`.** The renderer
   prints a fixed "Which of these will fail?" prompt, so the key ends up
   rewarding the *right* option while the screen asks for the failing one —
   a student who understands the material is marked wrong. Ten questions had
   this defect and were converted to multiple-choice on 2026-08-15. Use
   `which-breaks` only when the question genuinely asks which snippet fails.

   **Verify keys by executing them.** Every `predict-output` question whose
   code runs without a browser, DB or React Native should be run and its
   output compared to `answer`. Doing this to the 188 executable ones found
   8 wrong keys — a 4.3% error rate. `verify-lesson.mjs` now does this
   automatically for every executable question; that audit is why it exists.

6. **Lesson nav** at the bottom with prev/next links using the planned
   filename even if the next lesson doesn't exist yet.

7. **Every lesson's code is committed to the Token repo**, not left standalone.

8. **Load `copy-code.js`** — it auto-attaches to all `<pre>` blocks.

### Track B (backend) lessons

Same structure as Track A except point 4 becomes:

4. **Full runnable server file or migration** — the revealed solution must be
   a complete file the student can run with `node` or apply with a migration
   tool. For SQL lessons: a complete `.sql` file they can paste into `psql`.

### Lesson page template (scripts to load)

```html
<link rel="stylesheet" href="../../assets/styles.css" />
<!-- at end of body -->
<script src="../../assets/quiz.js"></script>
<script src="../../assets/dom-sandbox.js"></script>  <!-- if lesson touches the DOM -->
<script src="../../assets/playground.js"></script>   <!-- if lesson has playgrounds -->
<script src="../../assets/solution.js"></script>     <!-- if lesson has exercises -->
<script src="../../assets/explain.js"></script>      <!-- every lesson: the explain prompt -->
<script src="../../assets/progress.js"></script>
<script src="../../assets/copy-code.js"></script>
```

### The practice pattern (established 2026-08-15, lessons 01/0001-0004)

Every lesson that teaches runnable JavaScript gets all four of these. Match
this shape when retrofitting further lessons:

1. **A playground per concept**, placed where the concept lands — not all
   collected at the end. Introduce with an `<h3>Try it yourself</h3>`.

2. **At least one playground that is broken on purpose.** The student reads
   the real error and fixes it. Debugging is taught in X2, ~26 lessons after
   the student needs it; these are the stopgap. Good ones so far: reassigning
   a `const`, reading past the end of an array, a missing `return`.

3. **One `createSolution()` exercise before the quiz**, under the heading
   "Now build it yourself", with 3 hints.

3b. **One `createExplain()` prompt**, between the exercise and the quiz. It
   must be answerable only if the lesson landed — name the specific thing the
   lesson exists for, and ask *why*, not *what*. "Explain why
   `if (token.maxUses)` is wrong for `maxUses: 0`" is a prompt; "Explain
   conditionals" is a heading. One per lesson, `explain-<lesson number>` as
   the container id.

4. **A self-check in the exercise playground.** Starter code is a blank
   space, then a line reading `// --- Self-check: leave everything below this
   line alone ---`, then a `check(label, passed, detail)` helper and one
   check per requirement, all wrapped in `try/catch` so an empty editor gives
   a friendly message rather than a crash.

   Self-checks must test **behaviour, not resemblance** — a correct answer in
   a different style (arrow function, properties in another order) has to
   pass. Every `FAIL` prints what the student's code actually produced.

**Verify a retrofit by running it, never by reading it:**

```bash
node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0006-scope-and-closures.html \
     --wrong scripts/cases/0006-scope-and-closures.mjs
```

It parses every inline block, runs every playground under the real loop guard
and output cap, executes each `predict-output` answer against its own code, and
runs the revealed solution through its self-check. With `--wrong` it also proves
alternative correct styles pass and that each mistake trips the check it should.

DOM lessons verify the same way — playgrounds marked `dom: true` and questions
touching `document` or `localStorage` run against `assets/dom-sandbox.js`, the
same document the browser loads. Two supporting suites back that up:

```bash
node scripts/test-dom-sandbox.mjs      # the sandbox behaves like a DOM (55 assertions)
node scripts/test-playground-dom.mjs   # playground.js wiring: preview, Reset,
                                       # fresh sandbox per Run, host page safety
node scripts/test-explain.mjs          # explain.js: saving, restoring, key
                                       # collisions, storage being unavailable
```

**`verify-lesson.mjs` only runs what a lesson *executes*.** A plain
`<pre><code>` block is display-only — nothing parses it — so a broken one
passes every check and fails in the student's editor when they copy it.
`02/0014` carried a shell-mangle fragment (`timy!',`) for a fortnight while
marked `verified`. `scripts/check-pre-blocks.mjs` closes that gap and **runs
inside `audit.mjs`**, as an error; run it alone to see the detail:

```bash
node scripts/check-pre-blocks.mjs                    # whole course
node scripts/check-pre-blocks.mjs modules/02-react-native
node scripts/test-check-pre-blocks.mjs               # 14 assertions — see below
node scripts/test-quiz-shuffle.mjs                   # the option shuffle still shuffles
```

It reports exactly one thing: a `'` or `"` string left open at end of line
inside a **JavaScript** block, where the quote sits in a code position. That
narrowness is deliberate and hard-won — the first version fired 71 times, all
wrong, because shell `#` comments say things like "see what's changed". Three
suppressions followed (non-JS blocks, `#`/`--` comment lines, JSX children),
and each one is a chance to have silenced the signal instead of the noise.
**`test-check-pre-blocks.mjs` is what proves it did not** — it asserts the real
`0014` line is still caught, including when the same block also contains `#`
lines and JSX. A clean course and a broken check look identical from outside;
that suite is the only thing that tells them apart. If the check ever starts
crying wolf, tighten `looksLikeJavaScript` or `blankJsxChildren` and add the
case to the suite — do not demote it to a warning and walk away.

Run both after touching `dom-sandbox.js` or `playground.js`. `verify-lesson.mjs`
reimplements the execution call, so it cannot catch a bug in the widget itself —
that is what `test-playground-dom.mjs` is for.

Write the wrong-answer cases in `scripts/cases/<lesson>.mjs` — `alternatives`
(other correct styles, all must pass) and `mistakes` (each must fail, and
`expect` names the check it should trip). A mistake that trips *every* check
means the self-check has poor diagnostics, not that the student is very wrong.
**Each mistake is `{ expect, impl }` — `impl`, not `code`.** Using `code` yields
a row of identical `ReferenceError`s that look like a verifier bug and are not.

**The wrong-cases are the only thing that tests the test, so write them.** A
green self-check proves nothing about what it would catch. Five self-checks in
Phase 1.5 passed a wrong answer purely by coincidence — three flex children that
all came out 100dp wide, a navigate target at stack index 0 where "pop back to
it" and "clear the stack" agree, a label identical before and after trimming, a
password long enough to survive being trimmed. Every one was exposed by a
wrong-case that should have failed and did not. **Choose fixture values that
differ from what a wrong answer would produce**, and say why in a comment so the
next person does not "simplify" them back.

**Where a mistake can throw rather than return, wrap that check on its own.** An
uncaught throw aborts every check below it, so the suite hides what it never
reached — the defect `test-explain.mjs` had in Unit 10, and which recurred twice
in Phase 1.5.

A passing run records itself in `scripts/verification-log.json`, which is where
the audit's "Verified" column comes from; a failing run deletes the entry. The
file is **generated** — never hand-edit it, and never claim a lesson is verified
without running the verifier over it.

**Look for the plain function before reaching for `--unverifiable`.** Phase 1.5
predicted four Module 02 lessons had no runnable logic and was wrong about all
four: flexbox is arithmetic, the keyboard lesson is string normalisation, the
image picker is a payload filter, and the Expo setup lesson has `eas.json`
profile inheritance in it. `--unverifiable` was never used once. The reflex to
reach for it is wrong more often than it is right — and the function you find by
resisting it is usually the part of the lesson worth testing.

**Lessons whose solution genuinely cannot run here** — an Express route needing
Postgres, a React Native screen needing a device, a Dockerfile needing a VPS —
take `--unverifiable "<reason>"`. The reason is mandatory and stored, and the log
entry becomes `unverifiable` (the audit prints `n/a`) rather than `verified`.
Everything else still runs and still fails: blocks must parse, playgrounds must
run, executable `predict-output` answers must match. A lesson full of SQL
usually still has a dozen checkable claims in it.

```bash
node scripts/verify-lesson.mjs modules/b7-token-engine/0001-token-generation-redemption.html \
     --unverifiable "the revealed solution is an Express route needing Postgres"
```

**Prefer the per-exercise opt-out to the whole-lesson one.** `--unverifiable` is
all-or-nothing: it skips *every* solution, so a lesson holding both a React
Native screen and a pure function had to declare the whole thing unrunnable, and
the function went untested. That is what kept 69 lessons at `unverifiable` while
most of them contained something perfectly testable. A `createSolution` can now
carry its own reason:

```js
createSolution("exercise-1", {
  unverifiable: "the screen is React Native with FlatList, needing a device and a running API",
  exercise: "...", solution: `...`
});
```

That exercise is skipped with its reason recorded; every *other* exercise in the
lesson still runs, and the lesson reaches `verified`. **The metric stays honest
by one rule: at least one exercise must actually execute.** Excuse them all and
the status is `unverifiable` however many playgrounds the page has — the same
guard as `nothing-to-verify`, and for the same reason.

The pattern this unlocks is Phase 1.5's: **find the plain function inside the
lesson and give it its own exercise.** `a3/0004` is the worked example — the
screen is excused, and `applyPage` (stale responses, refresh-replaces-append,
overlapping pages, `hasMore`) is written, self-checked and covered by seven
wrong-cases. Roughly 25 of the remaining `unverifiable` lessons look like this.
Four cannot be helped this way at all: `a2/*` and `a3/0002` are TypeScript, and
the runner executes JavaScript.

**Staged exercises** — a page that builds one program in several steps names its
exercises `exercise-<stage>` and their self-checks `pg-exercise-<stage>`
(`exercise-gen` → `pg-exercise-gen`). One-exercise lessons keep the original
`pg-exercise` and are unaffected. The matching `--wrong` file exports `stages`
keyed by stage name instead of a flat `alternatives`/`mistakes` pair. Only
`0013` does this so far; three staged exercises beat one 100-line exercise for
a build a beginner is meant to finish.

Three traps this has already caught:

- A literal `</script>` inside a JS string silently kills the whole block.
- **A backtick inside a `createSolution` exercise string.** The exercise text is
  a template literal, so marking up `` `now` `` the way you would in Markdown
  ends the string and the whole block fails to parse. Hints are ordinary quoted
  strings and are safe; the `exercise` and `solution` fields are not.
- **Never build lesson content through a shell.** Escape-heavy strings passed
  through `bash -c` or `node -e` get mangled — `\"` becomes `\\"` and terminates
  the string early, or `\n` becomes a real newline. Use the editor tools, or a
  template literal, for anything containing quotes or backslashes.

---

## Working method (how the course works from here)

- **One repo, growing.** The Token repo exists from lesson 1. Every lesson
  adds to it and commits. The repo is the output; the lessons are scaffolding.

- **Exercise before solution.** Each lesson states what to build. The student
  attempts it, then the worked solution is revealed.

- **One module at a time.** Do not generate ahead. Write one module, stop.
  Student confirms it runs before the next is written.

- **Git from the start.** The student manages one repo with 4 folders.

---

## Platform differences — always cover both

When behaviour differs between platforms, always show both:
- `KeyboardAvoidingView` behavior: `'padding'` iOS, `'height'` Android
- Shadows: `shadowColor/shadowOffset/shadowOpacity/shadowRadius` iOS,
  `elevation` Android
- `multiline` TextInput needs `paddingTop` on iOS to centre text
- Incoming calls: CallKit + VoIP push (iOS), FCM + foreground service (Android)
- iOS publishing needs Apple Developer account ($99/year)

---

## State management conventions

- Plain `useState` for Modules 1–2 (already written)
- **Context API + custom hooks** from Track A Module A4 onward (auth, token
  list, theme). This is the Context lesson that was deferred and never
  delivered.
- Never mutate state arrays/objects directly — always spread into new ones
- Derived values computed inline, not stored in separate state
- Functional updater form (`prev => ...`) for rapid appends

---

## Navigation structure (Token app)
```
RootStack (headerShown: false)
  ├── Login
  ├── Register
  └── Main → RootTabs (headerShown: false)
        ├── Tokens → TokensStack
        │     ├── TokenList
        │     ├── TokenDetail
        │     └── CreateToken
        ├── Messages → MessagesStack
        │     ├── ConversationList
        │     └── MessageThread
        ├── Calls
        └── Settings
```
- Auth screens in the ROOT stack — no tab bar
- After login: `navigation.replace('Main')`
- `headerShown: false` on stacks; custom headers in screen components

---

## Student profile

- **Actual progress: partway through Module 01** — their own answer on
  2026-08-17, somewhere in `0006`–`0012`. A true beginner: pitch accordingly.
  **Ask; never infer this from the files.** That inference is what produced the
  "Modules 1 and 2 complete" claim which mispitched the course for months.
  "Complete" in the module tables above means *written*, never *studied*.
- Background: HTML and CSS. Not an experienced programmer.
- Wants **deep understanding, not vibe coding**. Explain why, not just what.
- Motivated by the end goal — tie concepts to Token concretely.
- Short lessons with something working at the end beat thorough theory.
- Goal: publish to Play Store and App Store, then get real users.
- **Everything must be open source.** No commercial licences or paid SDKs.
  Hosting (rented hardware) is fine; software must be open source.

---

## Token sharing — the product rule

**The bootstrap problem this solves:** if the user sends a token over their own
WhatsApp or email, the recipient already has their number and the token has
protected nothing. So — a token must **never** travel over a channel that
already identifies the user.

Valid sharing paths, in priority order:
1. Request-a-token (reverse flow) — business publishes a link, user's app
   generates and delivers the token from inside the system. **A core v1 flow**,
   not a later nice-to-have
2. QR code — shown on user's screen, scanned by holder. No channel at all
3. Typed into their form field — pasted where a site asks for a phone number.
   The channel is theirs, not the user's
4. Spoken or printed — read aloud, on a card or listing

Consequences for the build:
- **QR generation and scanning are core**, not optional
- The app must **warn** when sharing via an identifying channel — a Share
  button that silently hands the code to WhatsApp defeats the product in one
  tap, using a feature the app provided. See `a5/0001`
- **An unrecognised share target must warn.** Not-on-the-dangerous-list can
  never mean safe: new apps ship every week, and the system share sheet usually
  does not report which one the user picked. See `a5/0005`
- **Pasting a `tokn.app/t/CODE` link into a chat app leaks the code to that
  platform's servers before the recipient sees anything.** WhatsApp, Telegram,
  Slack and iMessage all fetch a pasted URL to build a preview card, so the
  code reaches Meta's or Telegram's crawler and is logged there — and the
  unfurler is a real client, so it can burn a single-use token on the way.
  Generic `og:` tags do not help: **the leak is the request, not the response.**
  A link preview on the redemption page is something to survive, never to
  improve. See `a8/0004`
- Onboarding must teach this rule, or users conclude the product does not work

**Where the product is worth most**, which is what lesson examples should
reach for: handing a number to an entity that does not know the user and will
keep it forever — e-commerce checkout, property listings, job applications,
service bookings. **Worth least:** people who already have the number.
