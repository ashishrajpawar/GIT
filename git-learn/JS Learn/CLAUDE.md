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

### Document precedence — one fact, one home

| File | Owns | Written by |
|---|---|---|
| `PROGRESS.md` | Anything a script can compute — counts, coverage, verification state | **Generated only.** Never hand-edit |
| `SESSION.md` | In progress / Next action / Blocked | Hand, before each unit of work |
| `CLAUDE.md` (this file) | Architecture invariants, conventions, product rules | Hand |
| `HANDOFF.md` | Narrative — why decisions were made, what failed, session log | Hand, appended each session |
| `ARCHITECTURE.md` + `docs/adr/` | Technical design and the decisions behind it | Hand |
| `COURSE-REVIEW.md` | The 2026-08-15 audit and the phase plan | Hand |
| `TOKEN-TRACK.md` | Lesson map and sequencing | Hand |

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
valid under this alphabet.** The canonical example was `MERC-8GH2-LP4X` for
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
accidental; some look like deliberate negative fixtures. See `COURSE-REVIEW.md`
§12.5 — do not bulk-rewrite them without reading each in context.

### Token repo layout (one git repo, four folders)
```
token/
  app/          ← React Native + Expo (mobile client)
  web/          ← Vite + React (redemption web page)
  api/          ← Node.js + Express/Fastify (backend)
  shared/       ← TypeScript types, API client, zod validation schemas
```
No monorepo tooling — plain folders with tsconfig path aliases.
`web/` is a plain web app (Vite + React), NOT React Native Web.
`web/` and `api/` both deploy as containers on the same Coolify VPS.

---

## Course structure
```
index.html                          ← course home page
modules/
  01-javascript-fundamentals/       ← 12 lessons; 1-4 retrofitted with practice
  02-react-native/                  ← 14 lessons, written (no practice yet)
  x1-git-dev-environment/           ← 3 lessons, complete
  a2-typescript/                    ← 3 lessons, complete
  x2-debugging/                     ← 2 lessons, complete
  b1-sql-fundamentals/              ← 4 lessons, complete
  b2-schema-design/                 ← 3 lessons, complete
  b3-node-http-server/              ← 4 lessons, complete
  b4-auth-server/                   ← 3 lessons, complete
  a3-api-consumption/               ← 4 lessons, complete
  a4-auth-client/                   ← 3 lessons, complete
  03-firebase-backend/              ← SUPERSEDED — replaced by Track B
  04-whatsapp-features/             ← partially salvageable
  05-audio-video-calls/             ← theory transfers, implementation rewritten
  06-polish-and-publish/            ← keep for reference
  07-store-compliance-and-safety/   ← partially relevant
  08-production-at-scale/           ← partially relevant
  09-advanced-features/             ← deep linking rewritten for Token
assets/
  styles.css                        ← shared stylesheet
  quiz.js                           ← createQuiz() widget (multi-type)
  playground.js                     ← createPlayground() inline JS editor
  solution.js                       ← createSolution() exercise-first component
  progress.js                       ← lesson/module progress tracking (localStorage)
  copy-code.js                      ← auto-attaches Copy buttons to <pre> blocks
  search.js                         ← client-side search on index.html
  search-index.json                 ← static search index (title, module, path, keywords)
reference/
  js-basics-cheatsheet.html
TOKEN-BRIEF.md                      ← product brief (supersedes old CLAUDE.md app section)
TOKEN-TRACK.md                      ← full two-track plan with sequencing
TOKEN-ASSETS-TASK.md                ← course tooling upgrade spec (separate session)
COURSE-REVIEW.md                    ← 2026-08-15 audit: gaps, plan, verified defects
HANDOFF.md                          ← project handoff / state summary
```

## Running / viewing lessons
No build step. Open any `.html` file directly in a browser.
The quiz widget is loaded via `<script src="../../assets/quiz.js"></script>`.
All lessons in `modules/` share `assets/styles.css` and `assets/quiz.js`.

### Additional shared scripts (load after quiz.js)
```html
<script src="../../assets/playground.js"></script>
<script src="../../assets/solution.js"></script>
<script src="../../assets/progress.js"></script>
<script src="../../assets/copy-code.js"></script>
```
Not every lesson needs all of them — only load what's used.

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

### `createPlayground(containerId, starterCode)` — `playground.js`

Embeddable JS editor. Textarea + Run + Reset buttons. Sandboxed execution,
captured `console.log` output displayed below. Errors shown in red.

**Two known limits — check before putting a playground in a lesson.**
`runCode()` calls `new Function(...)` and reads the captured log *synchronously*,
so anything resolving in a microtask is lost: `Promise.resolve("x").then(console.log)`
and any `await` both print `(no output)` rather than the right answer. There is
also no infinite-loop guard, so a stray `while (true)` hangs the browser tab.
Both must be fixed before practice is retrofitted into `01/0005` (loops) or
`01/0009` (promises & async/await). See `COURSE-REVIEW.md` §7.2.

```html
<div id="playground-1"></div>
<script>
  createPlayground("playground-1", `const tokens = ["ABC", "DEF"];\nconsole.log(tokens.length);`);
</script>
```

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
- PostgreSQL — primary datastore, pooled and partition-aware
- **Redis — required** (ADR-0003)
- Raw SQL via the `pg` driver first, Drizzle later.
  **Never Prisma** — it hides the query layer, and learning SQL is a goal here
- Parameterised queries always (`$1`), never string concatenation

### Communication
- Chat: WebSocket on own server, routed across nodes through Redis pub/sub
- Voice/video: WebRTC (`react-native-webrtc` on mobile, native APIs in browser)
- Signalling: own WebSocket server — **not** Firestore
- STUN: Google (free). TURN: self-hosted coturn
- `iceTransportPolicy: 'relay'` hides participants' IPs from each other — cover
  the trade-off, including that it forces **every** call through TURN and makes
  relay bandwidth the most likely surprise on the bill

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
- **Third-party comms SDKs** — no Agora, no Twilio, no Exotel, no Stream, no Sendbird.
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

   **Answer positions must vary.** Existing lessons put the correct answer
   at index 1 in 64% of questions — always picking the second option scores
   ~64% course-wide (measured 63.6% across 1,284 keyed questions on
   2026-08-15). Do not add to that pattern. `order-steps` steps are
   shuffled at render, so `correctOrder` may be authored in any order.

   **Never tag a "which is correct?" question as `which-breaks`.** The renderer
   prints a fixed "Which of these will fail?" prompt, so the key ends up
   rewarding the *right* option while the screen asks for the failing one —
   a student who understands the material is marked wrong. Ten questions had
   this defect and were converted to multiple-choice on 2026-08-15. Use
   `which-breaks` only when the question genuinely asks which snippet fails.

   **Verify keys by executing them.** Every `predict-output` question whose
   code runs without a browser, DB or React Native should be run and its
   output compared to `answer`. Doing this to the 188 executable ones found
   8 wrong keys — a 4.3% error rate. The recipe is in `COURSE-REVIEW.md` §10.

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
<script src="../../assets/playground.js"></script>   <!-- if lesson has playgrounds -->
<script src="../../assets/solution.js"></script>     <!-- if lesson has exercises -->
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

4. **A self-check in the exercise playground.** Starter code is a blank
   space, then a line reading `// --- Self-check: leave everything below this
   line alone ---`, then a `check(label, passed, detail)` helper and one
   check per requirement, all wrapped in `try/catch` so an empty editor gives
   a friendly message rather than a crash.

   Self-checks must test **behaviour, not resemblance** — a correct answer in
   a different style (arrow function, properties in another order) has to
   pass. Every `FAIL` prints what the student's code actually produced.

Verify a retrofit by extracting the inline script, stubbing `createPlayground`
/ `createSolution`, and running each starter plus the revealed solution
through `new Function("console", code)`. Also run deliberately *wrong*
answers: each should trip only its own check. And always confirm `<script>`
tags balance — a literal `</script>` inside a JS string silently kills the
whole block.

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

- **Actual progress: 4 lessons of 95** (as of 2026-08-15). Finished
  `01/0001-what-is-javascript` through `01/0004-conditionals` with their
  quizzes; next is `01/0005-loops`. A true beginner — pitch accordingly.
  (This file previously claimed Modules 1 and 2 were complete. They are not.
  "Complete" in the module tables below means *written*, never *studied*.)
- Background: HTML and CSS. Not an experienced programmer.
- Wants **deep understanding, not vibe coding**. Explain why, not just what.
- Motivated by the end goal — tie concepts to Token concretely.
- Short lessons with something working at the end beat thorough theory.
- Goal: publish to Play Store and App Store, then get real users.
- **Everything must be open source.** No commercial licences or paid SDKs.
  Hosting (rented hardware) is fine; software must be open source.

---

## Token sharing — the product rule

A token must **never** travel over a channel that already identifies the user.
Valid sharing paths:
1. Request-a-token (reverse flow) — business publishes a link, user's app
   generates and delivers the token from inside the system
2. QR code — shown on user's screen, scanned by holder
3. Typed into their form field — pasted where a site asks for a phone number
4. Spoken or printed — read aloud, on a card or listing

The app should **warn** when sharing via an identifying channel. Onboarding
must teach this rule.
