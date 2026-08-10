# Token Course — Claude Orientation

## What this project is
A two-track HTML course teaching one student (Ashish) to build **Token** — a
privacy-first mobile app for the Indian market where users issue revocable
capability tokens instead of sharing phone numbers or emails. Deny-by-default:
nobody contacts the user unless the user issued them a token.

The course lives as plain HTML files opened in a browser. No server, no
framework for the course itself. The *product* being built has its own repo.

## The product being built — Token

A user issues a token (e.g. `MERC-8GH2-LP4X`) to anyone who needs to reach
them. The holder redeems it at `tokn.app/t/CODE` — a web page — and
communicates through that page. They never learn the user's phone number,
email, or identity. The user can set rules, pause, or revoke at any time.

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
  01-javascript-fundamentals/       ← 12 lessons, complete (keep as-is)
  02-react-native/                  ← 14 lessons, complete (keep as-is)
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
  { type: "which-breaks", variants: ["code A", "code B", "code C"], correct: 1, explanation: "..." },

  // Order-steps (click in correct sequence)
  { type: "order-steps", steps: ["connect", "handshake", "send", "close"], correctOrder: [0, 1, 2, 3], explanation: "..." }
]);
```

### `createPlayground(containerId, starterCode)` — `playground.js`

Embeddable JS editor. Textarea + Run + Reset buttons. Sandboxed execution,
captured `console.log` output displayed below. Errors shown in red.

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

## Architecture — fixed decisions, do not revisit

**Mobile app**
- React Native + Expo, EAS Build, TypeScript
- Both iOS and Android — never suggest Android-only shortcuts
- Local cache: SQLite
- EAS Build required for WebRTC (native C++/Obj-C code; Expo Go cannot run it)

**Redemption web page**
- Vite + React (plain web app, NOT React Native Web)
- Native browser WebRTC and WebSocket APIs
- Deployed as a container on the same Coolify VPS as the API

**Backend**
- Node.js + TypeScript
- PostgreSQL — primary datastore
- Redis — presence, rate limiting, socket routing (optional for v1)
- Raw SQL via the `pg` driver first, then Drizzle later
  **Do not use Prisma** — hides the query layer; the student wants to learn SQL
- Express or Fastify (decided during B3)

**Communication**
- Chat: WebSocket on own server
- Voice/video: WebRTC (`react-native-webrtc` on mobile, native APIs in browser)
- Signalling: own WebSocket server — NOT Firestore
- STUN: Google (free). TURN: self-hosted coturn.
- Consider `iceTransportPolicy: 'relay'` for IP privacy (cover the trade-off)

**Push notifications**
- FCM + APNs via Expo Notifications (only third-party dependency)

**Deployment**
- Coolify on a VPS, deploy from git
- `api/` and `web/` as separate containers, Postgres and Redis as containers
- Automatic TLS via Coolify

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

5. **Exactly 5 quiz questions** using `createQuiz(containerId, [...])`.
   Mix of types: predict-output, spot-the-bug, fill-blank, which-breaks,
   order-steps. Not all multiple-choice. At least 2 of the 5 must be
   non-multiple-choice types.

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

- Completed Modules 1 (JS) and 2 (React Native). Not an experienced programmer.
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
