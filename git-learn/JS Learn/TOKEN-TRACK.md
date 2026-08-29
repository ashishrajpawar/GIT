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
> 3. **B2.2 under-delivered — and all three orphans are now closed.**
>    The row below promises "conversations, messages, participants,
>    read_receipts" and the lesson creates only the first two.
>    `deletion_queue` was **defined** once `b10/0002` settled the erasure
>    policy; `participants` was **deleted** by `c5/0005`, because a conversation
>    has exactly two parties and the holder is not a user, so half of every row
>    could never have been filled in; and `calls` was **defined by `b6/0001`**
>    on 2026-08-25, which is where it belonged, since what a call record
>    persists is a signalling question. Run `node scripts/audit.mjs` for the
>    live list.
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
| B4 | Auth (server) | 1. Phone sign-up & one-time codes | phone_hash with a pepper, OTP issue/verify, the denial oracle and its timing half, DLT templates | Sign-in with no password anywhere | **REWRITTEN 2026-08-22** |
| B4 | | 2. JWT issuance & refresh rotation | Short access token, a refresh token that never expires, reuse detection, retry grace window, per-device revocation | Sessions that end by revocation, not by clock | **REWRITTEN 2026-08-22** |
| B4 | | 3. Rate limiting | Three OTP layers (per-number burst, per-number daily, per-IP), CGNAT, IPv6. **No account lockout** — there is no password to brute-force | Bounds the SMS bill as well as the attack surface | **REWRITTEN 2026-08-22** |
| B5 | WebSocket Server | 1. WS connection lifecycle | Upgrade, auth on connect, heartbeat, reconnect handling | All real-time features run over your WS server | Replaces Firebase real-time |
| B5 | | 2. Message routing | Routing a message to the right socket(s), fan-out | Delivering chat messages in real time | Replaces Firestore listeners |
| B5 | | 3. Presence & typing | Ephemeral state, Redis pub/sub (optional for v1) | Online indicators, typing bubbles | NEW |
| B6 | WebRTC Signalling | 1. Signalling server | Offer/answer/ICE relay over your WS, room concept | Replacing Firestore-based signalling from old Module 5 | Rewrites Module 5 |
| B6 | | 2. coturn setup | Installation, configuration, time-limited credentials, and the bandwidth arithmetic that follows from relaying **every** call | Not a fallback: relay-only is the baseline, so TURN is on the critical path and its bandwidth is a line item | NEW |
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
| **C5** | End-to-End Encryption | 5 | **COMPLETE, 2026-08-22/23.** Written after B4 — the plan said before B2, and the dependency was met anyway because `b2/0002` did the E2EE schema rewrite up front, so the prerequisite was satisfied by *anticipation* rather than by ordering. `0005` was planned as multi-device and became *why Token is one phone, and what a second would cost* when the student chose one device for v1; it also resolved the `participants` orphan, by deletion |
| **C1** | Testing & Quality | 5 | **WRITTEN 2026-08-28.** After B3 — test the API as it is built, not at the end. The exercises are a test runner, an injected clock and byte source, the redemption handler as a plain function, the pure half of a `LEFT JOIN`, and a property checker |
| **C2** | CI/CD & Release Engineering | 4 | **WRITTEN 2026-08-29.** After C1 — nothing to automate until tests exist. The exercises are a build verdict, a startup configuration check, a migration-plan review and the update verdict the server gives a launching app. Its spine is one asymmetry followed down three layers: a container is replaceable, a dropped column is not, and a phone in somebody's pocket is not even reachable |
| **C3** | Trust, Safety & Abuse | 3 | **WRITTEN 2026-08-29.** After A5 — redesigned around client-side report packaging (ADR-0006), since E2EE removes server-side moderation. The exercises are the screening of a submitted report, the metadata assessment that ranks and never decides, and the automatic interim suspension of ADR-0011. Its engineering half only: F1/0006 keeps the threat model, triage matrix, SLA and transparency report |
| **C6** | Scale & Performance | 5 | **WRITTEN 2026-08-29.** Planned alongside the B-track — you cannot defer what you are building for — and in the event written after C7, on the argument that you cannot tune what you cannot see. The exercises are a capacity ceiling, a socket fan-out plan, a sliding-window limiter, a cache read plan and a query-trace review. Its spine is one sentence in five costumes: **a fact that is true of one process is not a fact about the system**, and every optimisation in it makes Token wrong rather than slow |
| **C4** | Data, Media & Offline | 4 | After A6 — SQLite cache, offline outbox, attachments, background jobs |
| **C7** | Observability | 4 | **WRITTEN 2026-08-29.** Extends B9 — self-hosted error tracking, metrics, logs, alerting, runbooks. The module where Token's privacy promises meet the tools that habitually break them: a tracker attaching request bodies, a metrics label per user, a log line pasted into chat. Exercises are the log line, the crash-report hook, the scrape summary and the alert evaluation |
| **C8** | Product Analytics | 2 | After C7 — privacy-first analytics for a privacy product |
| **C9** | Launch, Support & Operations | 5 | Replaces the A11 tail — store compliance, account deletion, i18n/a11y, support, incident response |
| **F1** | Founder Track — Non-Technical | 16 | **WRITTEN 2026-08-26.** Phase 7 / "Ship it", but six of its items are ⏳ and start on day one. See below |

### F1 — the non-technical track

Written 2026-08-26 from `token-nontech-taskboard.md`, on the student's
instruction, in one pass. It is the only module in the course with **no quizzes,
no playgrounds and no self-checks** — the reasoning and the audit consequences
are in `CLAUDE.md` § *The founder track*.

Sixteen lessons, one per section of the task board: DPDP and the RoPA ·
intermediary law · IP and brand · Google Play · Apple · trust & safety ·
positioning and GTM · support · vendors and DPAs · release and QA · the
compliance calendar · SMS DLT and CERT-In · age, consumers and dark patterns ·
the holder-side notice · opsec and brand defence · payments and tax (parked).

**Where it sits in the sequence is misleading and the README says so.** It is
filed under Phase 7 because that is where most of it is *needed*, but the
critical path of the whole launch runs through two of its items:

```
SMS DLT registration (1-3 weeks)
   └─→ OTP login works
           └─→ closed test can begin
                   └─→ 12 testers × 14 continuous days
                           └─→ Play production access

Data inventory (RoPA)
   ├─→ privacy policy       ├─→ Play Data Safety form
   ├─→ Apple privacy labels └─→ retention policy → deletion → the web
                                                   deletion page Play requires
```

Neither can be compressed by writing code faster, and both are waiting on other
people. **Start them on day one, whatever phase the code is in.**

**F1 does not overlap C9 as much as it looks.** C9 is *Launch, Support &
Operations* on the engineering side — building account deletion, i18n, a11y,
incident tooling. F1 is the paperwork, the registrations and the decisions that
those features are built to satisfy. Where they touch (store compliance,
support, incident response), F1 states the obligation and C9 builds the
mechanism. When C9 is eventually written, cross-link rather than duplicate.

## Phase order

```
Phase 1 — Where the student actually is
  01/0005–0012  practice retrofit, just-in-time
  01 capstone   pure-JS token issuer → first commit to token/practice/
  02            practice retrofit, just-in-time

Phase 2 — Verify and deepen
  Every verifiable lesson executed; the rest marked unverifiable with a reason
  ~20 spine lessons gain: Why this way / When this breaks / What this costs you

Maintenance (ungated, runs alongside)
  M1  execute every lesson that never had been              done 2026-08-17
  M2  the example codes that could never be generated       done 2026-08-17
  M3  extract the plain function from Track A/B lessons     started 2026-08-18

Phase 3 — Foundations, re-architected
  X1  Git & Dev Environment
  C0  Architecture & System Design        ← new
  A2  TypeScript
  X2  Debugging
  B1  SQL Fundamentals
  C5  End-to-End Encryption               ← written after B4 instead; see the note above
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
  F1  Founder Track (non-technical)       ← written 2026-08-26; six of its
                                             items start on day one, not here
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

**As of 2026-08-25: Phases 0, 1 and 2 are done, and so are M1, M2 and M3.
Phases 3 and 4 are not started, deliberately.** Phase 1 finished with 1.5, the
Module 02 retrofit. **M3 closed on 2026-08-25**, when the last lesson carrying
a whole-lesson `unverifiable` flag was retrofitted — see the M3 section below
for what that leaves.

**So Phase 3 is the only thing left**, and it is the first time since the
pivot that the next unit of work is *new material* rather than repair.
Everything countable is in `PROGRESS.md`; this line is the phase-level
headline and nothing more.

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

### 1.5 in detail — and the decision that comes before it

Module 02 is the only module needing **two** jobs in one pass: the practice
pattern (playgrounds, a broken-on-purpose one, exercise, explain prompt,
self-check) *and* the WhatsApp-clone reframe — Priya, read ticks, chat threads
— into Token. The Firebase half is already done. Doing the two jobs in
separate passes makes the diff unreviewable; doing all 14 lessons in one pass
breaks the commit-per-unit rule. **One or two lessons per commit, both jobs
together.**

**The decision, settled here so it is not re-litigated per lesson:
`verify-lesson.mjs` cannot run React Native, so every Module 02 exercise puts
its logic in a plain function that the component calls, and the self-check
tests that function.** `groupMessagesByDay(messages)`, `validateLabel(s)`,
`buildSectionData(tokens)` — the screen imports it and renders the result.

Rejected: recording all 14 as `unverifiable`. That is one line of work and
zero checks, and it would make the largest un-retrofitted module the least
verified part of the course — the exact shape of the problem the audit exists
to catch.

The choice is not only about tooling. Separating logic from rendering is how
the app should be built anyway, so the constraint buys a lesson rather than
costing one. It also means the self-checks obey the existing "behaviour, not
resemblance" rule without special-casing JSX.

The decision held. **All 14 lessons carry a plain-function exercise and all 14
verify by execution** — `SESSION.md` lists which function belongs to which
lesson.

> **The prediction below was wrong, and is kept because the way it was wrong is
> the useful part.**
>
> This section originally said four lessons could not have a runnable exercise
> and would take `--unverifiable`, their subject being the rendering:
> `0003-styling-and-flexbox`, `0004-textinput-and-keyboard`,
> `0011-images-imagepicker` and `0001-expo-setup-and-eas-build`.
>
> All four were wrong. Flexbox *is* arithmetic (`layoutRow`); the keyboard
> lesson is string normalisation (`normaliseCode`); the image picker is a
> payload filter (`prepareAttachment`); and the Expo setup lesson has
> `eas.json` profile inheritance in it (`resolveProfile`). **`--unverifiable`
> was never used once in the whole phase.**
>
> Carry that into Phase 3: look for the plain function before deciding a lesson
> has none. On this evidence the reflex is wrong more often than it is right.

**M1 was run over Module 02 before 1.5 started**, which is why the retrofit met
no surprises: the four premise-in-comment questions it found were fixed first,
as their own unit.

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

## Maintenance — M1, M2 and M3

Not phase work: none of them writes a new lesson, and none is gated on where the
student has reached. M1 and M2 are **done**; M3 started 2026-08-18 and is the
only one still open. Added 2026-08-17, after `7c86660` fixed three fill-blank
questions nobody could answer and found a fourth defect purely by re-running
the verifier over the files it had touched. That is the argument for M1.

### M1 — Verify the lessons that have never been executed

The verifier covers a small fraction of the course; `PROGRESS.md` has the
count. Everywhere it has been pointed it has found real defects — an initial
4.3% wrong-key rate, about a dozen premise-in-comment questions across Phase 2,
and `a8/0001` q23 verifying as `""` against a key of `"dist"`. There is no
reason to think the unrun lessons are cleaner than the run ones; they are
simply unmeasured.

Work, per lesson: run `verify-lesson.mjs`, fix what it reports, re-run. Track B
and React Native lessons need `--unverifiable "<reason>"` decided individually
— the reason is stored, so a wrong one is worse than none.

Three things make this cheaper than it looks:

- **Most lessons will fail on `no self-check found in pg-exercise` alone.**
  That is the un-retrofitted state, not a defect, and it is Phase 1.5/3 work.
  Record those as `unverifiable` for the solution and keep the other three
  sections, which still run.
  > **Superseded 2026-08-18 — see M3.** This was the best answer available
  > before `createSolution` had a per-exercise `unverifiable` field. Marking the
  > whole lesson is now the *last* resort: it skips every solution, so a pure
  > function sitting beside a React Native screen goes untested. That is exactly
  > how 69 lessons ended up at `unverifiable` with honest reasons and untested
  > logic inside them.
- **Order by risk, not by module number.** The Phase 2 spine is already
  verified. Start with lessons carrying executable `predict-output` questions,
  since those are where wrong keys hide.
- **Batch the runs, commit the fixes per lesson.** Running the verifier is
  read-only until something is edited.

Expected output: a real Verified count in `PROGRESS.md`, and a list of wrong
keys to fix. Do **not** hand-edit `scripts/verification-log.json`.

### M2 — The example token codes that cannot exist

The audit reports example codes using the five excluded characters
(`0 O 1 I L`); `PROGRESS.md` has the current list. **This is not a bulk
rewrite, and a script must not do it.** Some are accidental. Others —
`TEST-1234`, `NOPE-0000`, `IJKL-3333`, `MERC-8GH2-KP4O` — are deliberate
negative fixtures whose whole teaching point is being invalid, and
`0012-error-handling` has one with a paragraph underneath explaining why.
Rewriting those deletes the lesson.

Method, per code: read it in context and decide which of three it is.

1. **Accidental** — a code used as an ordinary example. Rewrite to a valid one,
   keeping the 12-character `XXXX-XXXX-XXXX` shape and the label's meaning
   (`SHOP-`, `DELI-` are doing work; keep them).
2. **Deliberate negative fixture** — invalidity is the point. Leave it, and add
   a one-line comment saying so if there is not already one, so the next sweep
   does not re-litigate it.
3. **Wrong shape** — 8 characters instead of 12. **This rule was wrong and is
   withdrawn.** It was written assuming the 8-character form was an occasional
   slip, as it was in `0010`. It is not: 84 standalone `MERC-8GH2` across 26
   files, plus a dozen other 8-character codes whose alphabets are perfectly
   valid (`BANK-4FJ7`, `CAFE-2BN7`, `DENT-9KRW`, `PARK-4FX9`, `RENT-2WX7`).
   It is an established shorthand, not an accident. **Fix the alphabet only.**
   Converting the shape is a separate decision touching ~26 files and mostly
   already-valid codes, and it is not a cleanup — if it is ever wanted, it is
   its own unit with its own argument.

The alphabet itself is already guarded as an audit **error**, so this cleanup
cannot regress into the dangerous case — a wrong alphabet in a lesson that
generates codes.

**Two audit bugs found by doing this, both now fixed.** The check scanned
`PROGRESS.md`, which is its own generated output and prints every offending
code inside its warnings — so a code fixed everywhere a student can see it
stayed reported forever and the list could never reach zero. And
`[A-Z0-9]{4}-[A-Z0-9]{4}` matched lesson ranges like `0001-0004`. Every real
example code carries a letter label in its first group, so all-digit first
groups are skipped.

### M3 — The plain function inside a Track A/B lesson

Added 2026-08-18, when M1 finished and left 69 lessons at `unverifiable`. Every
one of those reasons was **true** — an Express route really does need Postgres
— and every one of them was also hiding something testable.

The insight is Phase 1.5's, applied outside Module 02: **the deliverable a
lesson advertises is rarely the thing it teaches.** `a3/0004` advertises an
infinite-scroll FlatList; what it teaches is what to do with a page of results
when it lands. `a4/0001` advertises a splash screen; what it teaches is that
only a 401 ends a session. Those are plain functions, and they run here.

Method, per lesson:

1. Read the lesson for the decision it keeps circling. It is usually the thing
   its own quiz questions are about, and usually has no `await` in it.
2. Excuse the un-runnable exercise **per-exercise**:
   `createSolution("exercise-1", { unverifiable: "…", … })`.
3. Add the function as its own `createSolution` + `pg-exercise-<stage>`
   self-check, following the practice pattern in `CLAUDE.md`.
4. Write the `--wrong` cases. A staged lesson exports `stages`.
5. Verify. At least one exercise must execute or the lesson stays
   `unverifiable`, which is the guard that keeps the count honest.

**Check the neighbouring lessons while you are there.** Writing the function
down has surfaced a defect in the lesson's own prose or snippets **on every
lesson M3 was ever run over** — a rule stated on one page and broken by code on the
same page or the next. Those are worth more than the verification, and they are
not incidental: reading a lesson closely enough to extract its function is the
only process this course has that finds them.

The defects cluster into three kinds, which is worth knowing before starting a
lesson:

- **The lesson argues for something and never makes the student do it**
  (`a5/0001` on rejection sampling, `a8/0001` on VITE\_ secrets).
- **The prose states a rule the code on the same page breaks** (`a5/0002`'s
  HTTPS table above an `https?` regex; `a5/0004`'s "field names are the
  contract" above a playground using the wrong field names).
- **Two lessons each look right alone and contradict each other** — the hardest
  kind, invisible from inside either one, and invisible to the audit.
  `a5/0003` vs ADR-0007 and `01/0011`; `a8/0002` vs `a5/0002`; `a8/0004` vs
  `a5/0005`. **Grep the neighbour for the same noun** — `code`, `max_uses`,
  `expires_at`, `clipboard` — which is what found all of them.

**M3 is closed, 2026-08-25.** The paragraph that used to sit here said roughly
10 lessons still had an extractable function, about **40** were genuinely
infra-bound and should keep the whole-lesson flag, and **four were TypeScript**
and unreachable. All three estimates were wrong in the same direction:

- **No lesson carries the whole-lesson flag.** Not forty, none. Every one of
  the ~40 predicted to be infra-bound turned out to have a plain function in
  it, and the running result over the whole of M3 is that **the reflex to call
  a lesson unrunnable was wrong 22 times out of 22.**
- **The TypeScript category was closed by a tool, not a rewrite.** The runner
  learned TypeScript on 2026-08-23 via Node's `stripTypeScriptTypes`, so
  `a2/*` and `a3/0002` execute like anything else. JSX still does not — that
  limit is real and documented in `CLAUDE.md`.

**What genuinely remains is small and low-risk**, and it is not the same job:
seven lessons are verified and carry a self-check but no `--wrong` cases —
`01/0001`–`0005`, `a11/0002` and `a8/0002`. The five Module 01 lessons predate
the wrong-cases convention. **A self-check with no wrong-cases proves nothing
about what it would catch**, which is the rule `CLAUDE.md` states and the
reason these are worth doing eventually. They are maintenance, not a phase.

## Phase 4 — The operating track

C7, C8, C6 and C9 together are the "operate Token" half: observability,
analytics, scale, launch and support. Studied after launch, but **built into
the product from Phase 3 onward** — instrumentation retrofitted is
instrumentation that never happens.

---

# The queue

Added 2026-08-27. **One ordered list of everything open, across both kinds of
work**, because one person is doing both and they compete for the same week.

**Two kinds of work, and they are not interchangeable:**

- **`W` — writing.** Course lessons. Bounded by your own hours. The whole
  backlog is Phase 3 plus a small maintenance tail.
- **`L` — launch.** Company tasks whose detail lives in the F1 lesson task
  boards. **Several are bounded by other people's calendars**, which is why the
  queue is ordered by *what unblocks what*, not by importance.

**No status column, deliberately** — same rule as the phase tables above. What
is done is in `SESSION.md`; what is countable is in `PROGRESS.md`. This table
answers *what the work is and what has to come first*, and nothing else.

**"Owns the detail" is where the actual checklist lives.** This queue is one
line per unit; the F1 lesson named in that column has the full task board, the
worked example and the cost. Do not copy checklist items up here — that is how
a fact gets three homes.

## Wave 0 — start now, because other people's clocks are running

Nothing in this wave is gated on anything in the project. Every one of them is
gated on someone else, and the two SMS rows sit under the longest chain in the
whole launch.

| # | Unit | Owns the detail | Gate | Lead time |
|---|---|---|---|---|
| L1 | SMS DLT: principal entity, sender header, OTP template, delivery tested on every major operator | F1/0012 | — | **1–3 wks** |
| L2 | Second SMS aggregator — same three registrations, **template wording identical** so failover needs no re-approval | F1/0012 | — | 1–3 wks, alongside L1 |
| L3 | Play Console account + organisation identity verification | F1/0004 | company documents | days–2 wks |
| L4 | Recruit 12 testers (ask 16), tester agreements signed before any build goes out | F1/0004, F1/0015 | L3 for the track; asking starts today | **3–5 wks all in** |
| L5 | D-U-N-S number, then Apple Developer Program enrolment as an organisation | F1/0005 | company documents; D-U-N-S details must match exactly | 1–3 wks |
| L6 | Trademark search in classes 9, 38, 42 + attorney opinion | F1/0003 | — | weeks |
| L7 | **The RoPA** — every field, six columns, cross-checked against the real schema | F1/0001 | technical founder's time | ~1 wk of yours |
| L8 | Brief counsel: privacy policy + terms, RoPA attached — including the holder side and **the Hindi question** | F1/0001, 0002, 0014 | L7 | **2–4 wks turnaround** |
| L9 | One letter to the CA: GST position on subscriptions, place of supply | F1/0016 | — | free, stable answer |

> **L1 → L4 is the critical path of the entire launch**, and none of it is code:
> no DLT → no OTP → no sign-in → no closed test → no 14 continuous days → no
> production access. **L7 is the second chain**: it is upstream of four separate
> documents and of the deletion page Play requires.

## Wave 1 — everything the RoPA unblocks

| # | Unit | Owns the detail | Gate |
|---|---|---|---|
| L10 | Retention policy — a period **and a written justification** per data class | F1/0001 | L7 |
| L11 | Backup locations counted; the verified-dump floor; over-retention reported, rounded up | F1/0001, 0009 | L10 |
| L12 | Play Data Safety form, answered from the schema | F1/0004 | L7 |
| L13 | Apple privacy labels, cross-checked line by line against L12 | F1/0005 | L7, L12 |
| L14 | Consent notice: itemised, unbundled, versioned, withdrawal table | F1/0001 | L7 |
| L15 | Rights procedures + export format, each tested end to end on a dummy account | F1/0001 | L10 |
| L16 | Deletion mechanism + **the web-accessible deletion page** | F1/0004, 0001 | L10, L15 |
| L17 | Grievance officer appointed and published — name, email, **postal address** — plus templates and the log | F1/0001, 0013 | — |
| L18 | Vendor inventory, a DPA from each, residency per service, **error-tracker scrubbing configured** | F1/0009 | L7 |

## Wave 2 — trust & safety, which is the UGC evidence both stores audit

| # | Unit | Owns the detail | Gate |
|---|---|---|---|
| L19 | Threat catalogue, each row marked mitigated or open; the abuse signals worth watching | F1/0006 | — |
| L20 | Report pipeline end to end — and **a test report filed and read**, not a code review | F1/0006 | — |
| L21 | The 24-hour SLA: duty, escalation, the automatic interim suspension, and the instrumentation that keeps it honest | F1/0006, 0005 | L20 |
| L22 | Triage decision matrix, with a worked example under every row | F1/0006 | — |
| L23 | **What a block attaches to** — technical founder's call — then the six-step test passing, including the different-browser step | F1/0006 | technical founder |
| L24 | Crisis protocols, helpline numbers, authority contacts, named emergency-disclosure authority | F1/0006 | — |
| L25 | Law-enforcement protocol, the can/cannot lists, **the recovery position in writing**, the register | F1/0002 | — |
| L26 | The UGC evidence pack for both stores: filtering answer, reporting, blocking, published contact | F1/0004, 0005 | L20, L21, L23, L28 |

## Wave 3 — make it comprehensible, then list it

| # | Unit | Owns the detail | Gate |
|---|---|---|---|
| L27 | Comprehension: three candidate first screens, the ten-second test, the empty state rewritten | F1/0007 | — |
| L28 | Support: tooling, published contact, **holder contact path**, 20 templates, the 7 hard help articles | F1/0008 | — |
| L29 | Positioning statement, ten strangers, the 80-character line and the paragraph | F1/0007 | L27 |
| L30 | Store listing: title, descriptions, icon, feature graphic, **the five captioned screenshots** | F1/0004, 0005 | L29 |
| L31 | Reviewer notes + demo account + a non-expiring demo token, both stores | F1/0004, 0005 | L16, L26 |
| L32 | Analytics: self-hosted, event counts, the five metrics, activation = first redemption | F1/0007 | — |

## Wave 4 — the gates you cannot ship without

| # | Unit | Owns the detail | Gate |
|---|---|---|---|
| L33 | 18+ stated at signup and in terms; store ratings aligned; the underage-account policy | F1/0013 | — |
| L34 | Dark-pattern audit of onboarding, consent, paywall, cancellation | F1/0013 | L14 |
| L35 | Holder notice, the line above Connect, the holder contact path | F1/0014 | L8 |
| L36 | 2FA everywhere, credential vault, bus factor documented, domain locked, SPF/DKIM/DMARC | F1/0015 | — |
| L37 | Five defensive domains redirecting to primary; certificate-transparency monitoring; the takedown process | F1/0015 | L6 informs it |
| L38 | `security.txt`, vulnerability disclosure policy with safe harbour, a named triager | F1/0015 | — |
| L39 | CERT-In: the 6-hour workflow, 180-day logs, clock sync — **kept separate from the DPDP runbook** | F1/0012 | — |
| L40 | Incident runbook, severity tiers, user notification template, **one tabletop actually run** | F1/0001 | — |
| L41 | QA: the bug-report habit, the manual checklist, the smoke test, a real low-end phone, old browsers, accessibility, and the three guarantees re-proved | F1/0010 | — |
| L42 | The compliance calendar and its register — owners, dates, artefacts, triggers | F1/0011 | most of the above exists |
| L43 | Transparency report designed and the counters wired up **from launch** | F1/0006 | L20, L21 |

## Wave 5 — the test, and the two decisions it settles

| # | Unit | Owns the detail | Gate |
|---|---|---|---|
| L44 | Closed test: 12 testers, **14 continuous days**, count checked weekly | F1/0004 | L1, L3, L4, L26, L31 |
| L45 | Decide **replacement vs supplement** and **which segment leads** — from the signals table, before production access | F1/0007 | L44 |
| L46 | Apply for Play production access | F1/0004 | L44, L45 |
| L47 | Apple submission | F1/0005 | L13, L26, L31 |

## The writing queue, which runs in parallel

| # | Unit | Owns the detail | Gate |
|---|---|---|---|
| W1 | **Phase 3 — the C-modules. C0 landed 2026-08-27, C1 on 2026-08-28, C2, C3, C7 and C6 on 2026-08-29**; C5 already existed. **Three remain**: C4, C8, C9. Written **just-in-time**, one module then stop — never batched | this file, § Phase 3 | the student reaching each one |
| W3 | **Phase 4 — the operating track.** C6, C7, C8, C9 studied after launch, but instrumented into the product from Phase 3 onward | this file, § Phase 4 | W1 |

> **W2 was the maintenance tail — `--wrong` cases for every self-check that had
> none — and it is closed.** It is off this list because the list is what is
> open; `SESSION.md` records that it landed. The rule it enforced is permanent
> and lives in `CLAUDE.md` § practice pattern: **a self-check with no
> wrong-cases proves nothing about what it would catch.** Any new lesson with a
> self-check arrives with its cases, rather than joining a tail.

## What is genuinely blocked

Three things, and only three:

| What | On whom | Unblocks |
|---|---|---|
| **L23** — what a block attaches to | the technical founder | L26, and therefore both store submissions |
| **L45** — replacement vs supplement, and the lead segment | the closed test | store copy stops being provisional |
| **The Hindi question** inside L8 | counsel | whether English-only launch stands |

Everything else in this queue can be started today by one person.
