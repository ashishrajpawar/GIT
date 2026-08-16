# Token — Two-Track Course Plan

> **SUPERSEDED IN PART — read this box before the tables below.**
> Reviewed 2026-08-15; resequenced after the student
> settled seven open decisions the same day (`HANDOFF.md`).
>
> The A/B tables below still describe **what exists on disk**, which is why they
> are kept. They no longer describe **the order it will be studied in**, or the
> full scope. The revised sequence is in § "Revised sequence" at the foot of
> this file.
>
> Four things below are known to be wrong:
>
> 1. **Ten modules of coverage are missing entirely** — architecture/ADRs,
>    testing, CI/CD, trust & safety, data/media/offline, E2EE, scale &
>    performance, observability, analytics, and launch/support/ops. ~36 lessons.
>    Specified as C0–C9 in the work plan at the end of this file.
> 2. **B2 and B5 need rewriting, not deepening.** E2EE lands in v1, so the
>    messaging schema stores ciphertext; and the WebSocket layer is multi-node
>    from the start rather than single-node-then-fixed.
> 3. **B2.2 under-delivered.** The row below promises "conversations, messages,
>    participants, read_receipts" and the lesson creates only the first two.
>    `participants`, `deletion_queue`, and `calls` are queried by later lessons
>    and created by none — run `node scripts/audit.mjs` for the live list.
> 4. **The timeline was for an MVP by someone who already codes.** With E2EE in
>    v1 and a scale-out architecture, the realistic figure is **12–18 months and
>    ~145 lessons**, not the 3–4 months below.

---

## Repo layout (one repo, four folders)

```
token/
  app/          ← React Native + Expo (mobile client)
  web/          ← Vite + React (redemption page, deployed on same Coolify VPS)
  api/          ← Node.js + Express/Fastify (backend)
  shared/       ← TypeScript types, API client, validation (zod schemas)
```

No monorepo tooling on day one — plain folders, shared via relative imports
with `tsconfig` path aliases. `web/` is a plain web app (Vite + React), NOT
React Native Web — screens cannot be shared between RN and the browser.

All three deployable targets (app via EAS, web and api as containers) ship
from this one git repo.

---

## Track A — Mobile & Web Client

| # | Module | Lesson | Covers | Why Token needs it | Replaces / extends |
|---|--------|--------|--------|--------------------|--------------------|
| A1 | Git & Dev Environment | 1. Git fundamentals | init, add, commit, branch, merge, .gitignore | Managing one repo with 4 folders from day one | NEW — nothing existed |
| A1 | | 2. GitHub workflow | remote, push, pull, PRs, SSH keys | Collaboration, deployment triggers | NEW |
| A1 | | 3. Dev environment | Node version managers, VS Code, ESLint, Prettier, the monorepo tsconfig | Consistent tooling across app/web/api | NEW |
| A2 | TypeScript | 1. Types and interfaces | Primitives, arrays, objects, type vs interface, union types | Entire stack is TS; you can't write Token without it | NEW — 3 passing mentions in old course |
| A2 | | 2. Generics, utility types, enums | `Partial<T>`, `Pick<T>`, `Record<K,V>`, `Omit`, const enums | Typing API responses, shared types in `shared/` | NEW |
| A2 | | 3. TypeScript with React Native | Typing props, state, navigation params, event handlers | Every component in `app/` is typed | NEW |
| A3 | API Consumption | 1. fetch & HTTP fundamentals | GET/POST/PUT/DELETE, headers, status codes, JSON parsing | Talking to your own API instead of Firebase SDK | Replaces Module 3 entirely |
| A3 | | 2. API client layer | Typed wrapper around fetch, base URL config, interceptors | `shared/` exports a typed client both app and web use | NEW |
| A3 | | 3. Loading, empty & error states | Skeleton screens, retry, request cancellation (AbortController) | Every screen that fetches data | Extends Module 2 L12 |
| A3 | | 4. Pagination & infinite scroll | Cursor-based pagination, FlatList onEndReached, loading more | Token list, message history | Extends Module 8 L2 |
| A4 | Auth on the client | 1. JWT flow — login, signup, token storage | Access + refresh tokens, expo-secure-store, silent refresh | Replacing Firebase Auth entirely | Replaces Module 3 L2 |
| A4 | | 2. Auth context & protected routes | createContext, useContext, custom useAuth hook | Auth state accessible everywhere without prop drilling | NEW (Context was deferred, never delivered) |
| A4 | | 3. Handling 401s, logout, session expiry | Interceptor that refreshes, force-logout on revoked refresh | Secure session lifecycle | NEW |
| A5 | Core Token Features | 1. Token generation & display | Crypto-safe random codes, formatting, copy-to-clipboard | The primary product action | NEW |
| A5 | | 2. QR generation & scanning | expo-camera barcode scanner, QR generation library | Core sharing path — no channel that identifies you | NEW |
| A5 | | 3. Token list & management | FlatList of issued tokens, swipe-to-revoke, pause toggle | The main screen of the app | NEW |
| A5 | | 4. Access rules UI | Time windows, contact limits, category restrictions | Users control what a token allows | NEW |
| A5 | | 5. Share-path warnings | Detect if sharing via a channel that already identifies you | Privacy protection — the product's core promise | NEW |
| A6 | Chat & Real-time | 1. WebSocket basics on the client | Connecting, reconnecting, heartbeat, auth on the socket | All real-time comms go through your own WS server | Replaces Firebase real-time |
| A6 | | 2. Message thread UI | Send/receive messages, optimistic updates, delivery status | Same UI patterns as old Module 4 but over WS | Extends Module 4 L3 |
| A6 | | 3. Typing indicators & presence | Ephemeral WS events, debouncing, online/offline dots | Standard chat UX | Extends Module 4 |
| A7 | Voice & Video (client) | 1. WebRTC refresher + new signalling | ICE/STUN/TURN theory, your WS server as signalling | Same theory as old Module 5, new signalling layer | Rewrites Module 5 L1, L4 |
| A7 | | 2. 1:1 voice call | react-native-webrtc, audio-only offer/answer, call UI | Core feature | Rewrites Module 5 L5 |
| A7 | | 3. 1:1 video call | Adding video track, camera switching, PiP | Core feature | Rewrites Module 5 L6 |
| A7 | | 4. Incoming calls (Android + iOS) | FCM foreground service, CallKit + VoIP push | Platform-specific requirements | Rewrites Module 5 L7–L8 |
| A7 | | 5. relay-only mode & IP privacy | `iceTransportPolicy: 'relay'`, trade-off (latency vs privacy) | Privacy feature matching the product's ethos | NEW |
| A8 | Redemption Web Page | 1. Vite + React project setup | Project in `web/`, shared types, env config | The second client — browser-based | NEW |
| A8 | | 2. Token redemption flow | Enter code or land via URL, identify yourself, connect | The only way holders reach the user | NEW |
| A8 | | 3. Browser WebRTC & WebSocket | Native browser APIs, no RN libraries, same signalling | Voice/video calls from the web page | NEW |
| A8 | | 4. No-app-installed experience | Full functionality without installing the mobile app | Frictionless for the token holder | NEW |
| A9 | Deep Linking & Routing | 1. Universal Links & App Links | `tokn.app/t/CODE` opens app if installed, web if not | Seamless redemption path | Rewrites Module 9 L3 |
| A9 | | 2. In-app deep link handling | Expo linking config, parsing params, navigating to screen | Handling the inbound link inside the app | Extends Module 9 L3 |
| A10 | Device Security & Storage | 1. Secure storage | expo-secure-store, Keychain, Keystore, what goes where | Tokens and keys must never be in plaintext AsyncStorage | NEW (AsyncStorage mentioned 11x, never secured) |
| A10 | | 2. Biometric app lock | expo-local-authentication, Face ID, fingerprint | Privacy app needs a lock screen | NEW |
| A11 | Polish & Publish | 1. Animations & gestures | Reanimated, gesture-handler, swipe-to-revoke, bottom sheets | Polished interactions for token management | NEW |
| A11 | | 2. Theming & dark mode | Light/dark toggle, theme context, consistent colours | User preference, clean design | NEW |
| A11 | | 3. Forms & validation | react-hook-form + zod, shared validation with backend | Registration, rule editing, settings | NEW |
| A11 | | 4. Environment config | app.config.js, expo-constants, EAS secrets, dev/staging/prod | Multiple environments for real deployment | NEW |
| A11 | | 5. Store submission | EAS Build, Play Store, App Store, privacy policy | Final step — get it published | Extends Module 6 |

---

## Track B — Backend

| # | Module | Lesson | Covers | Why Token needs it | Replaces / extends |
|---|--------|--------|--------|--------------------|--------------------|
| B1 | SQL Fundamentals | 1. Tables, INSERT, SELECT | CREATE TABLE, INSERT, SELECT, WHERE, ORDER BY | The data lives in Postgres — you write every query | NEW |
| B1 | | 2. Joins & relationships | INNER JOIN, LEFT JOIN, foreign keys, one-to-many | Users → tokens → messages → redemptions | NEW |
| B1 | | 3. Indexes, transactions, constraints | CREATE INDEX, BEGIN/COMMIT, CHECK, UNIQUE, NOT NULL | Performance + correctness guarantees at the DB level | NEW |
| B1 | | 4. Postgres specifics | JSONB, LISTEN/NOTIFY, pg-specific types, dialect diffs vs SQLite | Rule payloads stored as JSONB, real-time triggers | NEW |
| B2 | Schema Design | 1. Token schema | users, tokens, access_rules, redemption_events | The core data model — constraints enforce revocation | NEW |
| B2 | | 2. Messaging schema | conversations, messages, participants, read_receipts | Chat data structure | Replaces Firestore schema |
| B2 | | 3. Migrations | Schema versioning, up/down scripts, running in CI | Evolving the schema safely over time | NEW |
| B3 | Node & HTTP Server | 1. Node.js fundamentals | Event loop, modules, file I/O, environment variables | The runtime your backend runs on | NEW |
| B3 | | 2. Express/Fastify setup | Routing, middleware, request/response lifecycle | The HTTP framework | NEW |
| B3 | | 3. REST API design | Resources, verbs, status codes, pagination, versioning | A well-designed API for both clients to consume | NEW |
| B3 | | 4. Input validation & error handling | zod on the server, shared schemas, consistent error format | Security boundary — never trust client input | NEW |
| B4 | Auth (server) | 1. Password hashing & user registration | argon2/bcrypt, never plaintext, salt, timing attacks | Secure user creation | NEW |
| B4 | | 2. JWT issuance & refresh rotation | Access token (short-lived), refresh token (rotated), revocation | Stateless auth with revocation capability | NEW |
| B4 | | 3. Rate limiting & brute-force protection | Per-IP, per-account limits on auth endpoints | Security — auth is the #1 attack surface | NEW |
| B5 | WebSocket Server | 1. WS connection lifecycle | Upgrade, auth on connect, heartbeat, reconnect handling | All real-time features run over your WS server | Replaces Firebase real-time |
| B5 | | 2. Message routing | Routing a message to the right socket(s), fan-out | Delivering chat messages in real time | Replaces Firestore listeners |
| B5 | | 3. Presence & typing | Ephemeral state, Redis pub/sub (optional for v1) | Online indicators, typing bubbles | NEW |
| B6 | WebRTC Signalling | 1. Signalling server | Offer/answer/ICE relay over your WS, room concept | Replacing Firestore-based signalling from old Module 5 | Rewrites Module 5 |
| B6 | | 2. coturn setup | Installation, configuration, relay mode, credentials, bandwidth | TURN fallback for restrictive networks | NEW |
| B7 | Token Engine | 1. Token generation & redemption | Crypto-random codes, redemption endpoint, validation | The core backend logic — issue, validate, redeem | NEW |
| B7 | | 2. Access rules engine | Evaluating rules (time, count, category), deny-by-default | The product's value prop — rules enforced server-side | NEW |
| B7 | | 3. Revocation & pause | Instant revocation, pause/resume, propagation to active sessions | Security guarantee — revoked tokens never honoured | NEW |
| B8 | Push Notifications | 1. FCM + APNs via Expo | Server-side push for incoming calls, messages when offline | The only third-party dependency, unavoidable | Extends Module 4 L6 |
| B9 | Docker & Deployment | 1. Docker fundamentals | Images, containers, Dockerfile, Docker Compose | Portability — run anywhere, move to AWS later | NEW |
| B9 | | 2. Coolify setup | VPS, control plane, deploy from git, Postgres + Redis containers, TLS | Your actual production deployment | NEW |
| B9 | | 3. Logs, backups & monitoring | Structured logs, pg_dump, basic uptime alerting | Ops — knowing when things break and recovering | NEW |
| B10 | Security & Compliance | 1. Security hardening | Parameterised queries, secrets management, CORS, CSP headers | Never string-concatenate SQL, never commit secrets | NEW |
| B10 | | 2. India's DPDP Act | Consent, revocation, data portability, what Token must do | Token IS a consent/revocation product — the law is the spec | NEW |

---

## Cross-cutting (placed early, before both tracks diverge)

| # | Module | Lesson | Covers | Why Token needs it |
|---|--------|--------|--------|--------------------|
| X1 | Git & Dev Environment | (Same as A1 above) | git, GitHub, tooling | Managing 4 folders in one repo from day one |
| X2 | Debugging | 1. React Native debugging | Flipper, console, React DevTools, network inspector | Multiplies every other skill — unblocks you when stuck |
| X2 | | 2. Node.js debugging | --inspect, breakpoints, logging, reading stack traces | Same for the backend |

---

## Recommended sequence (interleaved)

The key dependency: the mobile app can't do anything useful until the API
exists to talk to. And the API is meaningless without a client exercising it.
So they must be interleaved.

```
Phase 1 — Foundation (weeks 1–2)
  X1  Git & Dev Environment (3 lessons)
  A2  TypeScript (3 lessons)
  X2  Debugging (2 lessons)

Phase 2 — Backend core (weeks 3–5)
  B1  SQL Fundamentals (4 lessons)
  B2  Schema Design (3 lessons)
  B3  Node & HTTP Server (4 lessons)
  B4  Auth — server side (3 lessons)

Phase 3 — Client meets server (weeks 5–7)
  A3  API Consumption (4 lessons)
  A4  Auth on the client (3 lessons)
  A5  Core Token Features (5 lessons)

Phase 4 — Real-time (weeks 7–9)
  B5  WebSocket Server (3 lessons)
  A6  Chat & Real-time (3 lessons)
  B6  WebRTC Signalling (2 lessons)
  A7  Voice & Video — client (5 lessons)

Phase 5 — The second client (weeks 9–10)
  A8  Redemption Web Page (4 lessons)
  A9  Deep Linking & Routing (2 lessons)

Phase 6 — Token engine & hardening (weeks 10–11)
  B7  Token Engine (3 lessons)
  B8  Push Notifications (1 lesson)
  A10 Device Security & Storage (2 lessons)

Phase 7 — Ship it (weeks 11–13)
  B9  Docker & Deployment (3 lessons)
  B10 Security & Compliance (2 lessons)
  A11 Polish & Publish (5 lessons)
```

Total: ~60 new lessons across both tracks.

---

## Scope note — an honest assessment

The original target was 2 months for a Firebase-backed app. Firebase
eliminates the entire backend track — auth, database, real-time, hosting
are all managed services you configure rather than build.

**What changed:**
- You are now building the backend from scratch (~25 lessons, ~5 weeks alone)
- You are adding a second client (the redemption web page, ~4 lessons)
- TypeScript, Git, and secure storage are new prerequisites (~8 lessons)
- The WebRTC signalling layer is rebuilt against your own server

**Realistic timeline: 3–4 months of consistent daily work.**

The long poles are:
1. **Phase 2 (Backend core)** — this is entirely new territory for you. SQL,
   server architecture, and auth are each full disciplines. Budget extra time.
2. **Phase 4 (Real-time)** — WebSocket + WebRTC signalling on your own server
   is the hardest integration point. Debugging is harder than Firebase because
   there's no dashboard — it's your logs and your breakpoints.
3. **Phase 7 (Deployment)** — Docker and Coolify have a learning curve, and
   things that work locally will break in production in surprising ways.

**Where you save time:**
- Module 1 (JS fundamentals) and Module 2 (React Native) are done and still
  valid — you don't restart from zero on the client side.
- The TypeScript module is short because you already know JS.
- `shared/` types and validation mean you write things once, not twice.

**Recommendation:** Don't try to compress this into 2 months. 3–4 months at
a sustainable pace produces a real product. Rushing the backend leads to
security holes that undermine the entire privacy promise.

---

## What happens to the existing 71 lessons

| Status | Modules | Action |
|--------|---------|--------|
| Keep as-is | 1 (JS Fundamentals), 2 (React Native) | Still valid. Reference from the new plan. |
| Keep for reference | 5 (Audio & Video), 6 (Polish & Publish) | Theory transfers; implementation will be rewritten in A7/A11. |
| Replace entirely | 3 (Firebase Backend) | Superseded by B1–B4. |
| Partially salvage | 4 (WhatsApp Features), 7 (Store Compliance), 8 (Production), 9 (Advanced) | Extract transferable concepts into new modules; delete Firebase-specific content. |

Old modules stay in `modules/` as reference material until the replacement
is written and confirmed working. No deletion without explicit confirmation.

---

# Revised sequence (2026-08-15)

Supersedes "Recommended sequence" above. Driven by the seven decisions in
`HANDOFF.md` — chiefly **E2EE in v1** and **build for millions from day one**,
both of which move modules earlier because they are constraints on design rather
than features bolted on afterwards.

**Written just-in-time, never batched ahead.** Each C-module is written before
the student reaches it, against a repo that exists and code that has been run.
Generating 36 lessons now would repeat exactly the mistake that produced 95
unverified lessons against a student on lesson 5.

## The new modules

| ID | Module | ~Lessons | Why here |
|----|--------|---------|----------|
| **C0** | Architecture & System Design | 2 | Before B1 — the whole-system view, trust boundaries, ADRs, where the seams go |
| **C5** | End-to-End Encryption | 5 | **Before B2** — the schema stores ciphertext, so this is a prerequisite. Grown from 2 lessons: key generation, distribution, verification, backup/recovery, multi-device |
| **C1** | Testing & Quality | 5 | After B3 — test the API as it is built, not at the end |
| **C2** | CI/CD & Release Engineering | 4 | After C1 — nothing to automate until tests exist |
| **C3** | Trust, Safety & Abuse | 3 | After A5 — redesigned around client-side report packaging (ADR-0006), since E2EE removes server-side moderation |
| **C6** | Scale & Performance | 5 | **Alongside B-track**, not after B9 — you cannot defer what you are building for |
| **C4** | Data, Media & Offline | 4 | After A6 — SQLite cache, offline outbox, attachments, background jobs |
| **C7** | Observability | 4 | Extends B9 — self-hosted error tracking, metrics, logs, alerting, runbooks |
| **C8** | Product Analytics | 2 | After C7 — privacy-first analytics for a privacy product |
| **C9** | Launch, Support & Operations | 5 | Replaces the A11 tail — store compliance, account deletion, i18n/a11y, support, incident response |

## Phase order

```
Phase 1 — Where the student actually is
  01/0005–0012  practice retrofit, just-in-time
  01 capstone   pure-JS token issuer → first commit to token/practice/
  02            practice retrofit, just-in-time

Phase 2 — Verify and deepen
  Every verifiable lesson executed; the rest marked unverifiable with a reason
  ~20 spine lessons gain: Why this way / When this breaks / What this costs you

Phase 3 — Foundations, re-architected
  X1  Git & Dev Environment
  C0  Architecture & System Design        ← new
  A2  TypeScript
  X2  Debugging
  B1  SQL Fundamentals
  C5  End-to-End Encryption               ← new, MUST precede B2
  B2  Schema Design                       ← REWRITE for ciphertext + partitioning
  B3  Node & HTTP Server
  C1  Testing & Quality                   ← new
  C2  CI/CD & Release Engineering         ← new
  B4  Auth (server)

Phase 4 — Client meets server
  A3  API Consumption
  A4  Auth on the client
  A5  Core Token Features
  C3  Trust, Safety & Abuse               ← new

Phase 5 — Real-time
  B5  WebSocket Server                    ← REWRITE for multi-node + Redis
  A6  Chat & Real-time
  C4  Data, Media & Offline               ← new
  B6  WebRTC Signalling
  A7  Voice & Video (client)

Phase 6 — The second client
  A8  Redemption Web Page
  A9  Deep Linking & Routing

Phase 7 — Engine and hardening
  B7  Token Engine
  B8  Push Notifications
  A10 Device Security & Storage

Phase 8 — Ship and operate
  B9  Docker & Deployment
  C6  Scale & Performance                 ← new (threads through B-track too)
  C7  Observability                       ← new
  B10 Security & Compliance
  C8  Product Analytics                   ← new
  A11 Polish & Publish                    ← modernised off Expo SDK 49
  C9  Launch, Support & Operations        ← new
```

## Rewrites, not deepenings

| Module | Why |
|--------|-----|
| **B2 — Schema Design** | Messages store ciphertext; `messages` partitioned by time from the first migration; `participants`, `deletion_queue`, `calls` designed properly rather than patched |
| **B5 — WebSocket Server** | Multi-node from the start: Redis pub/sub fan-out, presence as TTL keys, no node-local socket registry |
| **A7/0004 — Incoming calls** | Imports `@react-native-firebase/messaging`, contradicting both the no-Firebase constraint and B8's Expo Notifications |
| **All of Track A** | Written against Expo SDK 49 (mid-2023); camera, notifications, and secure-store APIs have all moved |

---

# The work plan

Moved here on 2026-08-16 from `COURSE-REVIEW.md`, the 2026-08-15 audit. That
file's findings are fixed and its narrative is in
`docs/archive/handoff-2026-08-14-to-15.md`; this plan was the only part still
live, and it belongs beside the sequence it operates on. The file itself was
removed — it is in git history.

**Status lives in two places and neither is here.** Per-item status is in
`SESSION.md`; anything countable is in `PROGRESS.md`, which is generated.
Do not add a status column below — a fact with three homes has three chances
to be wrong, and that is the failure the audit was written about.

**As of 2026-08-16: Phase 0 done. Phase 1 done except 1.5. Phase 2 done.
Phases 3 and 4 not started, deliberately.**

## Phase 0 — Repair the map

| # | Work |
|---|---|
| 0.1 | Create the Token repo — `app/ web/ api/ shared/`, first commit |
| 0.2 | `ARCHITECTURE.md` + ADRs — the whole-system view and the decisions behind it |
| 0.3 | Add the missing modules to this file as placeholders |
| 0.4 | Fix the `@react-native-firebase` contradiction in `a7/0004` |
| + | Async playground and loop guard; delete the stale `lessons/` duplicate; fix five broken nav links; fix 18 broken quiz questions and the invalid canonical token |

## Phase 1 — Unblock where the student actually is

| # | Work |
|---|---|
| 1.1 | Retrofit practice into `01/0005`–`01/0012`, one or two at a time |
| 1.2 | A capstone at the end of Module 01 — a pure-JS token issuer, the repo's first real commit |
| 1.3 | One "explain it in your own words" prompt per lesson |
| 1.4 | Open each lesson with ~5 questions from the previous two lessons |
| 1.5 | The same retrofit for Module 02, just-in-time |

## Phase 2 — Deepen the spine

Each spine lesson gains three sections — **Why this way (and what was
rejected)** · **When this breaks** · **What this costs you** — and has its code
verified by execution.

The spine, as deepened: `b7/0001` · `b3/0003` · `b4/0003` · `a3/0002` ·
`b3/0004` · `a4/0002` · `b4/0002` · `a10/0001` · `b7/0002` · `b7/0003` ·
`b9/0002` · `b6/0001` · `b9/0001` · `b10/0001` · `a5/0001` · `a5/0004`.

**Sixteen, not twenty.** `b2/0001`, `b2/0003`, `b5/0001` and `b5/0002` are
rewrites (see the table above), so deepening them is work that gets discarded.

## Phase 3 — Insert the missing modules

The ten C-modules, each written **just-in-time** at the point in the sequence
above where the student reaches it. Never batched ahead — writing 36 lessons
now would repeat exactly the mistake that produced 95 unverified ones.

## Phase 4 — The operating track

C7, C8, C6 and C9 together are the "operate Token" half: observability,
analytics, scale, launch and support. Studied after launch, but **built into
the product from Phase 3 onward** — instrumentation retrofitted is
instrumentation that never happens.
