# Brief — course pivot from WhatsApp clone to "Token"

Read `CLAUDE.md` and `HANDOFF.md` before acting on this.

This document supersedes the app description in both of those files.

---

## 1. What I am actually building

**Token** — a privacy-first mobile app for the Indian market.

Instead of sharing a phone number or email address, a user issues a
**revocable capability token** (e.g. `MERC-8GH2-KP4X`) to whoever needs to
reach them. Deny-by-default: nobody can contact the user unless the user has
issued them a token. The user can set rules on it, pause it, or revoke it at
any time, all from inside the app.

**Code format.** 12 characters in three groups of four, drawn from the
31-character alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` — the ambiguous
**0, O, 1, I and L are excluded** so a code can be read aloud or copied off a
printed card without error. Every example token written anywhere must be valid
under this alphabet; see `CLAUDE.md` § "Token code format".

The business or person holding a token redeems it at a web page —
`tokn.app/t/CODE` — and communicates through that page. They never learn the
user's phone number, email, or identity.

**Key point about the redemption page:** it is not a fallback or a
convenience path. With SMS and phone-network voice out of scope (see §3), the
browser page is the *only* way a token holder reaches the user. It needs the
same engineering care as the mobile app and is a full codebase in its own
right.

### How a token gets shared — this is the product, not a detail

There is a bootstrap problem to design around: if I send someone a token over
my own WhatsApp or email, they already have my details and the token has
protected nothing. **The rule is that a token must never travel over a
channel that already identifies me.**

Paths that work, in priority order:

1. **Request-a-token (reverse flow)** — the business publishes a request
   link, I open it, and *my app* generates and delivers the token from
   inside the system. I never send anything from a personal channel. This
   is a **core v1 flow**, not a later nice-to-have.
2. **QR code** — shown on my screen, scanned by theirs. No channel at all.
3. **Typed into their form field** — I paste a token where a website asks
   for my phone number. The channel is theirs, not mine.
4. **Spoken or printed** — read aloud at a counter, on a card or a listing.

Consequences for the build:
- QR generation and scanning are core, not optional
- The app should **warn** when a user is about to share a token over a
  channel that already identifies them
- Onboarding must teach this rule, or users will conclude the product does
  not work
- Highest value is where I hand my number to an entity that does not know me
  and will keep it forever: e-commerce checkout, property listings, job
  applications, service bookings. Lowest value is with existing contacts.

---

## 2. Architecture — fixed decisions, do not revisit

**Mobile app**
- React Native + Expo, EAS Build
- TypeScript
- Both iOS and Android — never suggest Android-only shortcuts
- Local cache: SQLite 

**Redemption web page**
- Browser-based, no install required
- React or Next.js
- Uses native browser WebRTC and WebSocket APIs
- Separate codebase, separately hosted


**Backend**
- Node.js + TypeScript 
- PostgreSQL — primary datastore
- Redis — presence, rate limiting, socket routing across instances.
  Optional for v1; do not treat as required.
- Raw SQL via the `pg` driver first, then Drizzle later.
  **Do not use Prisma** — it hides the query layer and I want to learn SQL
  properly, not learn an ORM.


**Communication**
- Chat: WebSocket on my own server
- Voice and video: WebRTC (`react-native-webrtc` on mobile, native APIs in
  the browser)
- Signalling: my own WebSocket server — **not** Firestore
- STUN: Google's free servers. TURN: self-hosted coturn.
- Consider forcing `iceTransportPolicy: 'relay'` so peers never see each
  other's public IP. This is a privacy feature, not a performance
  compromise — cover the trade-off.

**Push notifications**
- FCM + APNs via Expo Notifications. This is the only third-party dependency
  in the whole system and there is no self-hosted alternative.

---

## 3. Explicitly out of scope — do not teach, do not suggest

- **Firebase — all of it.** No Auth, no Firestore, no Storage, no Cloud
  Functions. My backend does all of this.
- **Phone-network (PSTN) voice.** Requires a DoT telecom licence. Dropped.
- **Email.** No relay, no bridge, no transactional email, no SES. Nothing.
- **Payment gateway.** Deferred. Build subscription tiers into the data model
  so they are not a retrofit, but no gateway integration in v1.
- **Third-party comms SDKs** — no Agora, no Twilio, no Exotel, no Stream, no
  Sendbird. Open standards only.

---

## 4. Status of the existing 71 lessons

**Still valid, keep as-is:**
- Module 1 — JavaScript Fundamentals (12 lessons)
- Module 2 — React Native (14 lessons)
- Module 6 — Polish & Publish (6 lessons)

**Concepts transfer, implementation does not — needs rewriting:**
- Module 5 — Audio & Video Calls. WebRTC theory, ICE, STUN/TURN, CallKit and
  the Android foreground service all still apply. The signalling layer runs
  through Firestore and must be rebuilt against my own WebSocket server.

**Teaches patterns I will not use — replace:**
- Module 3 — Firebase Backend (5 lessons). Entirely superseded.
- 
**Partially relevant, needs re-targeting:**
- Module 7 — Store Compliance & Safety
- Module 8 — Production at Scale. Firestore security rules and Cloud
  Functions lessons do not apply; pagination, offline, retry, monitoring and
  testing do.
- Module 9 — Advanced Features. Deep linking needs rewriting for the
  redemption flow specifically.

---

## 5. The course needs TWO tracks, not one

This is the most important structural point in this brief.

The existing course teaches the frontend plus a backend somebody else built.
I have now decided to build the backend myself. That is a second discipline
of roughly equal size, and the course currently covers **none** of it.

Do not bolt a few Node lessons onto a React Native course. Plan two parallel
tracks with an explicit dependency order between them.

### Track A — Mobile and web client

Gaps in the current course:

- **TypeScript** — my stack is TS, the course is plain JS with three passing
  mentions. Place this immediately after Module 2.
- **Consuming a REST API** — `fetch`/`axios`, status codes, error handling,
  loading and empty states, retry, request cancellation. There is currently
  **not one lesson** on calling my own API; everything goes through the
  Firebase SDK.
- **JWT auth on the client** — storing the access token, silent refresh,
  handling 401s, logout that actually invalidates.
- **Secure device storage** — `expo-secure-store`, iOS Keychain, Android
  Keystore, and a clear rule for what goes where. AsyncStorage is unencrypted
  plaintext and must never hold tokens or keys. The course mentions
  AsyncStorage in 11 lessons and has no dedicated storage lesson at all.
- **Context API and custom hooks** — `createContext` and `useContext` appear
  **zero times** in 71 lessons. This was deferred in Module 2 and never
  delivered. Needed for auth state, the token list, and theme.
- **QR generation and scanning** — `expo-camera` / barcode scanner plus a QR
  generation library. Central to token sharing and redemption; currently
  absent.
- **Biometric app lock** — `expo-local-authentication`. Zero coverage.
- **Deep linking for redemption** — `tokn.app/t/CODE` opening the app when
  installed, falling back to the web page when not, plus iOS Universal Links
  and Android App Links domain verification.
- **The redemption web page** — browser WebRTC and WebSocket, hosting,
  the no-app-installed experience.
- **Time, expiry and timezones** — token expiry, time-window access rules,
  scheduled revocation.
- **Environment config** — `app.config.js`, `expo-constants`, EAS secrets,
  separating dev/staging/prod API URLs.
- **Animations and gestures** — Reanimated, gesture-handler. Zero coverage;
  needed for swipe-to-revoke, bottom sheets, the pause toggle.
- **Forms and validation at scale** — react-hook-form + zod.
- **Theming and dark mode** — I want a light/dark toggle.
- **App architecture** — folder structure, separating the API layer from UI.

### Track B — Backend (starts from nothing)

- **SQL fundamentals** — SELECT, JOIN, WHERE, indexes, transactions. Teach
  once against Postgres. SQLite is the same SQL with dialect differences;
  cover the differences in a single short lesson, not a separate track.
- **Postgres specifics** — constraints, foreign keys, CHECK, JSONB for
  flexible rule payloads, LISTEN/NOTIFY.
- **Schema design for Token** — users, tokens, access rules, redemption
  events, messages. Explain *why* constraints belong in the database rather
  than in application code: a revoked token must never be honoured, and
  "the database rejected it" is a stronger guarantee than "the code was
  supposed to check".
- **Migrations** — schema versioning as a discipline.
- **Node + Express/Fastify** — routing, middleware, error handling.
- **REST API design** — resources, status codes, versioning, pagination.
- **Auth done properly** — argon2 or bcrypt password hashing (never
  plaintext), JWT issuance, refresh-token rotation, revocation.
- **WebSocket server** — connection lifecycle, reconnection, routing a
  message to the right socket, authentication on the socket.
- **WebRTC signalling on my own server** — replacing the Firestore approach
  from Module 5.
- **coturn** — installation, configuration, relay mode, bandwidth cost.
- **Input validation and rate limiting** at the API boundary.
- **Security basics** — parameterised queries (never string-concatenate SQL),
  secrets never committed, rate limits on every auth endpoint.
- **Docker basics** — images, containers, Docker Compose. This is the
  portability layer: it means I can move from a VPS to AWS later without
  rewriting anything.
- **Coolify setup** — installing the control plane on a VPS, deploying
  from git, provisioning Postgres and Redis as containers, automatic TLS.
- **Deployment and ops** — logs, backups, basic monitoring, what to do when
  it goes down.

### Cross-cutting — needed early, currently missing

- **Git** — I will be managing three codebases. This belongs near the very
  start, not at the end.
- **Debugging and dev tools** — no lesson exists; it multiplies every other
  difficulty.
- **India's DPDP Act** — I am building a consent-and-revocation product for
  the Indian market. The law is close to a product spec for Token.

---

## 6. Lesson format — keep these invariants, change the framing

Everything in the existing `CLAUDE.md` about lesson structure stays:

1. A "why this matters" callout at the top — but tied to **Token**, not to a
   WhatsApp clone.
2. Every concept shown in code, using Token-relevant names — `tokenCode`,
   `issuedTo`, `redemptionEvent`, `accessRule`, `revokedAt`.
3. A working end state — but delivered as **exercise first, solution
   revealed after** (see §8), not handed over up front.
4. Exactly 25 quiz questions via `createQuiz()` with a unique container ID,
   using the question types in §9 rather than plain multiple choice.
5. Lesson nav at the bottom using the planned filename even if the next
   lesson does not exist yet.
6. Every lesson's code is committed to the Token repo, not left standalone.

Backend lessons need a different shape from the mobile ones — a runnable
`App.js` makes no sense for a Node module. Propose the equivalent invariant
for Track B rather than forcing the mobile format onto it.

Also drop the WhatsApp colour palette from `CLAUDE.md`. Token's design
direction is light, clean and trustworthy.

---

## 7. About me — calibrate to this

- Coding background is HTML and CSS. I have worked through the JavaScript
  and React Native modules but I am not an experienced programmer.
- I want **deep understanding, not vibe coding**. Explain why, not just what.
  If there is a trade-off, name both sides.
- I am motivated by the end goal — tie concepts to Token concretely.
- Short lessons with something working at the end beat thorough theory.
- Goal: publish to both the Play Store and the App Store, then get real
  users.
- **Everything must be open source.** Do not suggest anything requiring a
  commercial licence or a paid SDK. Hosting is rented hardware — that is
  fine and unavoidable — but the software running on it must be open source.


---

## 8. How the course must work from here

This is a change in method, not just content. The current course has 71
lessons written and I have zero lines of Token written. That needs to invert.

**One repo, growing.** Create the Token project as a real repo now. Every
lesson adds to it and commits. The repo is the output; the lessons are
scaffolding. No more standalone `App.js` files that exist in isolation.

**Exercise before solution.** Each lesson states what to build, I attempt it,
*then* the worked solution is revealed. Do not hand me a complete working
file up front — that is how I end up pasting code I do not understand.

**One module at a time.** Do not generate ahead. Write one module, then stop.
I will confirm the code runs on my phone before you write the next one. This
also keeps the context window manageable.

**Git from the start.** I will be managing three codebases. Teach this early,
not as an afterthought.

---

## 9. Quiz and course tooling

Quiz questions should stay at 5 per lesson, but the *types* need to change.
Multiple-choice only tests whether I read the page. Use a mix of:

- Predict the output — given a snippet, what prints?
- Spot the bug — code that looks right and is not
- Fill in the blank — real code with one line removed
- Which of these breaks, and why — variations where one fails
- Order the steps — sequence operations correctly

Quizzes come *after* an exercise, not instead of one.

Shared course tooling to build once in `assets/`, so all existing and future
lessons benefit (this is a separate session — do not do it as part of the
plan):

- Runnable in-page JS playground
- Progress tracking in localStorage, per-lesson and per-module
- Collapsible "solution" component for exercise-first lessons
- Copy buttons on code blocks
- Client-side search across all lessons

No badges, streaks, XP or mascots.

---

## 10. What I want from you right now

**A plan only. Do not write any lessons yet.**

1. A table covering both tracks, in dependency order:

   | Track | Module | Lesson | What it covers | Why Token needs it | Replaces / extends |

2. A recommended **sequence across both tracks** — what to learn in what
   order, given that backend and mobile depend on each other at specific
   points.

3. An honest note on scope. My original target was two months, but that was
   scoped for a Firebase-backed app. Tell me what this actually looks like
   now and where the long poles are.

4. Then rewrite `CLAUDE.md` so every future lesson uses Token examples,
   the two-track structure, the architecture decisions above, and the
   working method in §8.

Do **not** do the course-tooling work in §9 in this session — that is a
separate task and will be requested separately.

Write the plan to `TOKEN-TRACK.md` so it survives compaction.

I will review the table before you write a single lesson.