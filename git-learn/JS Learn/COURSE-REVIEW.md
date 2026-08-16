# Course Review — Vision vs. Reality, and the Plan

Reviewed 2026-08-15 against the stated vision: *one-stop course that takes a
beginner to a production-grade, scalable, self-operated Token, with no paid
libraries and no need to Google or AI-research the gaps.*

---

## 1. Verdict

**The map is right. The territory is thin, and it stops at launch day.**

| Dimension | Verdict |
|---|---|
| Architecture matches the vision | ✅ Fully. Verified: zero paid/banned dependencies across all 69 Token-track lessons |
| Coverage of *building* Token | 🟡 Good skeleton, ~10 real holes |
| Coverage of *scaling* Token | ❌ Essentially absent |
| Coverage of *operating* Token post-launch | ❌ One lesson out of 95 |
| Depth per lesson ("no Googling") | ❌ Averages 1,106 words of teaching prose. That is a briefing, not a bible |
| Code you can trust | ❌ Not one line has ever been executed |
| The repo being the output | ❌ Never happened. 95 lessons exist, 0 lines of Token exist |

You did not ask for reassurance, so: the course as it stands will get you to a
working prototype and then leave you on your own for everything that makes it a
product. That is fixable, and the fix is smaller than it looks — because the
hard part (the architecture, the sequencing, the refusal to use paid SDKs) is
already done and done well.

---

## 2. What is genuinely good — do not rebuild this

- **The architecture decisions are coherent and correct for your goals.** Own
  Postgres, own WebSocket, own signalling, own TURN, raw SQL before an ORM,
  Expo + EAS, Vite for the web client. A more experienced developer would make
  the same calls.
- **The open-source constraint holds.** I grepped every Track A/B lesson for
  Firebase, Agora, Twilio, Exotel, Stream, Sendbird, Prisma, Auth0, Clerk,
  Supabase, Pusher, OneSignal, Algolia, Cloudinary. One genuine contradiction
  found (see §3.4); everything else is clean, and the exclusions are documented
  in `RESOURCES.md` and `MISSION.md`.
- **The two-track interleaving is the right structure.** Backend before client,
  then client meets server, then real-time. That dependency ordering is not
  obvious and it is right.
- **The individual lessons are accurate where they go.** The JWT refresh-rotation
  lesson, the security-hardening lesson, and the logs/backups lesson are real
  engineering content, not filler.
- **The tooling is good.** Playgrounds, self-checking exercises, six quiz types,
  progress tracking. Better than most paid courses have.
- **`HANDOFF.md` is unusually honest.** It already flags the missing repo, the
  unverified code, and the quiz answer-position bias. That candour is worth
  preserving.

---

## 3. The gaps

Three distinct classes. They need different fixes, so keep them separate.

### 3.1 Class A — Depth: the lessons are too thin to be a bible

Measured across all 69 Token-track lessons:

| Metric | Value |
|---|---|
| Average teaching prose per lesson | **1,106 words** (~4 minutes of reading) |
| Thinnest core lessons | REST API design **713**, Rate limiting **794**, JWT & refresh rotation **923** |
| Exercises per lesson | Exactly **1** |
| Playgrounds per lesson | **0 or 1** |
| Quiz questions per lesson | **25–30** |

Assessment outweighs instruction roughly two to one by file size. A 713-word
lesson on REST API design cannot answer the questions that come up while you
actually design an API — so you will Google them. That is precisely the outcome
you said you wanted to avoid.

What is structurally missing from nearly every lesson:

- **"Why this way"** — the alternatives that were considered and rejected, and
  on what grounds. This is the deep-understanding layer, and it is the one thing
  Googling is worst at giving you.
- **"When this breaks"** — the failure modes, the limits, what this design does
  at 100× the load.
- **"What this costs you"** — every choice has a bill. Refresh-token rotation
  costs you a database write per refresh. E2EE costs you server-side search.
- **Verbal recall.** Only 3 of 95 lessons ask you to explain anything in words.
- **Spaced review.** Nothing revisits lesson 2 while you are on lesson 5.
- **A capstone.** Zero build-something-that-combines-it points in 95 lessons.

### 3.2 Class B — Missing coverage

Verified absent from all 24 Token-track modules. Counts are files containing any
mention at all, across 69 lessons:

| Topic | Lessons | Mentions |
|---|---|---|
| Automated testing (any kind) | **0** | 4 incidental |
| CI/CD pipeline | **0** | 1 incidental |
| Error tracking (Sentry/GlitchTip) | **0** | 1 incidental |
| Metrics & dashboards (Prometheus/Grafana) | **0** | 1 incidental |
| Product analytics (what's working) | **0** | 0 |
| Load testing (k6) | **0** | 0 |
| Local SQLite cache / offline-first | **0** | 3 incidental |
| Media upload & object storage | **0** | 0 |
| Background jobs / queues | **0** | 0 |
| End-to-end encryption | **0** | 3 incidental |
| Abuse, spam & moderation | **0** | 0 |
| Incident response / runbooks / on-call | **0** | 0 |
| Internationalisation & accessibility | **0** | 0 |
| Account deletion / data-safety compliance | **0** | — |

Two of these deserve calling out specifically:

**Post-production is one lesson.** `b9/0003-logs-backups-monitoring` covers pino,
`pg_dump`, and Uptime Kuma. It is a good lesson. It is also the entirety of the
course's answer to "how do I know what is happening in production." No error
tracking, no metrics, no dashboards, no alerting policy, no analytics, no
support tooling, no incident process.

**Scaling is asserted, never taught.** The course says "Redis for presence
(optional for v1)" and moves on. Nothing teaches what actually breaks first as
you grow, in what order, or how to build so it does not. Given that your stated
fear is re-architecting after production, this is the most expensive gap in the
course.

**Trust & safety is absent, and Token needs it more than most apps.** The entire
product premise is that strangers can reach you through a token. Spam through
tokens, harassment, token farming, and the store-review consequences of all
three are not addressed anywhere.

### 3.3 Class C — Nothing has been verified

No lesson's code has ever been run. This is documented in `HANDOFF.md §7` and it
is not theoretical. Reading one lesson closely turned up two defects:

1. `b4-auth-server/0002-jwt-refresh-rotation.html` — the reuse-detection branch
   is commented *"Token not found or revoked — possible theft. Revoke ALL user's
   tokens"* and the query underneath revokes only the single token hash that was
   just established as not present. It is a no-op. The security property the
   lesson is teaching does not exist in the code it teaches.
2. Same file — `require('crypto')` inside a module that otherwise uses ESM
   `import` with `.js` extensions. That throws at runtime under ESM.

One lesson, two bugs, five minutes of reading. Assume the rate holds.

### 3.4 One architectural contradiction

`a7-voice-video/0004-incoming-calls.html` imports
`@react-native-firebase/messaging`. Every other document forbids Firebase and
routes push through Expo Notifications (`b8`). FCM as a *transport* is
unavoidable; the `@react-native-firebase` *library* is not, and it contradicts
both the constraint and the B8 lesson the student will have already done.

### 3.5 Known and already accepted

- Quiz correct-answer positions are clustered: 64% at option 2. You have chosen
  to live with it. Listed here for completeness only.
- Modules 01 and 02 (26 lessons — where you are now) carry WhatsApp framing and,
  apart from lessons 1–4, no practice.

---

## 4. The plan

### The central move

Today the course is **95 lessons written ahead of 0 lines of product**. The
lessons became the deliverable. Every remaining problem in this document is
downstream of that inversion.

So the plan is not "write 40 more lessons." Writing ahead is the trap this
project already fell into once. The plan is to **make the repo the spine and the
lessons just-in-time**, and to add the missing material at the point in the
sequence where you will actually use it.

---

> ### ⚠ These tables are the PLAN, not the status
>
> **As of 2026-08-16: Phase 0 is done, Phase 1 is done except 1.5, Phase 2 is
> done. Phases 3 and 4 are not started and are deliberately just-in-time.**
>
> That headline is the only status kept in this file, and only because a plan
> that reads as an untouched to-do list is actively misleading. **Per-item
> status is in `SESSION.md`; anything countable is in `PROGRESS.md`, which is
> generated.** Do not add a status column to the tables below — three homes for
> one fact is how they drift apart, which is the failure this whole document was
> written about.
>
> Two notes the plan itself cannot carry:
>
> - **Phase 2 covered 16 lessons, not 20.** `b2/0001`, `b2/0003`, `b5/0001` and
>   `b5/0002` are marked REWRITE in `TOKEN-TRACK.md`'s revised sequence, so
>   deepening them is work that gets discarded.
> - **The Phase 3 module list is superseded.** `TOKEN-TRACK.md` § "Revised
>   sequence (2026-08-15)" reorders it — chiefly C5 (E2EE) moving before B2 and
>   C6 alongside the B-track. Where the two disagree, `TOKEN-TRACK.md` wins.

### Phase 0 — Repair the map (before you study anything else)

| # | Work | Why |
|---|---|---|
| 0.1 | Create the Token repo — `app/ web/ api/ shared/`, outside the `GIT` folder, first commit | The stated working method, never executed. Everything downstream assumes it exists |
| 0.2 | Write `ARCHITECTURE.md` + ADR-0001 — the whole-system view, trust boundaries, what is stateless, where the seams go | This is the "don't re-architect later" insurance, and it is a document you read once, not a module you study |
| 0.3 | Add the missing modules to `TOKEN-TRACK.md` as placeholders | An honest map. Right now the plan claims completeness it does not have |
| 0.4 | Fix the `@react-native-firebase` contradiction in `a7/0004` | Small, and it is a constraint violation |

### Phase 1 — Unblock where you actually are (lessons 01/0005 onward)

You are on lesson 5 of 95. Nothing else matters until this stretch works.

| # | Work |
|---|---|
| 1.1 | Retrofit practice into `01/0005`–`01/0012`, **one or two lessons at a time, as you reach them** — matching the pattern already established in 01/0001–0004 |
| 1.2 | Add a **capstone at the end of Module 01**: a pure-JavaScript token issuer — generate, store, apply rules, revoke. This becomes the repo's first real commit |
| 1.3 | Add a one-sentence "explain it in your own words" prompt per lesson |
| 1.4 | Open each lesson with ~5 questions drawn from the previous two lessons' banks (spaced review, using material that already exists) |
| 1.5 | Same retrofit for Module 02, just-in-time |

### Phase 2 — Deepen the spine (not all 69 lessons — the ~20 that carry the architecture)

For each, add three sections and verify every code sample by running it:
**Why this way (and what was rejected)** · **When this breaks** · **What this costs you**.

The spine: `b2/0001` token schema · `b2/0003` migrations · `b3/0003` REST design ·
`b3/0004` validation · `b4/0002` JWT rotation · `b4/0003` rate limiting ·
`b5/0001` WS lifecycle · `b5/0002` message routing · `b6/0001` signalling ·
`b7/0001–0003` the token engine · `b9/0001–0002` Docker & Coolify ·
`b10/0001` hardening · `a3/0002` API client · `a4/0002` auth context ·
`a5/0001` token generation · `a5/0004` access rules · `a10/0001` secure storage.

### Phase 3 — Insert the missing modules, each at its right point in the sequence

Ten new modules, ~36 lessons. **Written just-in-time, never batched ahead.**
Placement matters more than content here — each sits where you will use it.

| Code | Module | Lessons | Inserted | Covers |
|---|---|---|---|---|
| **C0** | Architecture & System Design | 2 | before B1 | Whole-system view, trust boundaries, ADRs, API versioning, where the seams go so v2 is not a rewrite |
| **C1** | Testing & Quality | 5 | after B3 | Vitest unit tests for `shared/` and the rules engine; API integration tests against real Postgres with per-test rollback; RN Testing Library; Maestro for mobile E2E; Playwright for `web/`. All open source |
| **C2** | CI/CD & Release Engineering | 4 | after C1 | GitHub Actions (lint, typecheck, test); migrations in CI; **expand/contract zero-downtime migrations**; EAS profiles dev/staging/prod; Coolify deploy + rollback; release checklist |
| **C3** | Trust, Safety & Abuse | 3 | after A5 | The abuse model for a "strangers can reach you" product: spam through tokens, harassment, token farming. Report/block, per-token rate limits, admin review queue, store policy requirements |
| **C4** | Data, Media & Offline | 4 | after A6 | The SQLite local cache your architecture already promises; offline outbox with idempotency keys; attachments + compression + self-hosted object storage (MinIO/Garage) with presigned uploads; background jobs (pg-boss) for expiry sweeps, token cleanup, push fan-out |
| **C5** | End-to-End Encryption | 2 | after A6 | X25519 + AES-GCM, key storage, public-key distribution through your own API, key verification — **and what E2EE costs you**: no server-side search, no moderation, multi-device pain, key backup |
| **C6** | Scale & Performance | 5 | after B9 | The 1k → 100k → 1M roadmap and what breaks in what order. `EXPLAIN ANALYZE` as a workflow, index design, N+1, pgbouncer, message-table partitioning and archival. Stateless API + horizontal scaling; scaling WebSocket across nodes (Redis pub/sub, sticky sessions). Load testing with k6. Capacity planning and the VPS cost curve. Mobile: FlatList tuning, re-render profiling, startup time |
| **C7** | Observability | 4 | extends B9 | Self-hosted GlitchTip or Sentry across api/web/app; `prom-client` → Prometheus → Grafana, the four golden signals, WS gauges, pool saturation; Loki + correlation IDs end to end; alerting policy, what to page on, and runbooks |
| **C8** | Product Analytics | 2 | after C7 | Self-hosted PostHog. Event taxonomy, funnels, retention, cohorts. **Privacy-first analytics for a privacy product** — what Token may ethically measure, DPDP consent, no PII. The metrics that matter: activation (first token issued), redemption rate, revocation rate, D1/D7/D30 |
| **C9** | Launch, Support & Operations | 5 | replaces A11 tail | Data-safety form, privacy policy, **in-app account deletion** (mandated by both Apple and Google), age gate, export. DPDP consent artefacts and grievance officer. i18n + accessibility for the Indian market. Supporting users you cannot identify; admin/back-office tooling; status page. Incident response for a solo developer: runbooks, postmortems, restore drills |

### Phase 4 — The operating track

C7, C8, C6 and C9 together form the "360 degree" half you asked for and the
course currently lacks: **Operate Token**. Studied after launch, but built into
the product from Phase 3 onward — instrumentation retrofitted is instrumentation
that never happens.

---

## 5. Honest recalibration

`TOKEN-TRACK.md` estimates 3–4 months for ~60 new lessons and a working app.
That estimate is for an MVP, by someone who already codes.

The realistic figure for what you have actually described — production-grade,
scalable, operable, published on both stores, from a beginner start — is
**8–12 months of consistent daily work**. The course would be ~130 lessons.

This is not a reason to shrink the goal. It is a reason to sequence it so that
something works at every stage rather than nothing working until month 10.

---

## 6. Decisions needed before work starts

1. **Depth or breadth first?** Deepen the 20 spine lessons, or add the 10 missing
   modules? *Recommendation: depth first — a thin lesson you have already passed
   is a hole you will fall into later.*
2. **Build the repo now?** *Strong recommendation: yes, Phase 0.1, this week.*
   The single highest-leverage item in this document.
3. **E2EE in v1 or v2?** This is a genuine architectural fork and it must be
   decided **before B2 schema design**. E2EE retrofitted is a rewrite of the
   message schema, the search story, and the moderation story. It is also
   arguably the core of Token's promise.
4. **Should lesson code be verified by execution?** It costs real time and it
   removes the "assume every snippet is broken" tax permanently.
5. **Quiz answer-position bias** — leave it, or fix it at the Module 01/02 break?

---

## 7. Second pass — what the first review missed

### 7.1 The depth finding is inverted

The first pass measured only the 69 Token-track lessons. Measuring Modules 01
and 02 as well:

| Lesson group | Lessons | Avg prose | Builds Token? |
|---|---|---|---|
| Modules 01–02 (pre-pivot, "legacy") | 26 | **2,303 words** | No — fundamentals |
| Tracks A, B, X (the Token course proper) | 69 | **1,106 words** | Yes — every lesson |

The course is not uniformly thin. The old lessons are substantial; the new ones
that actually build the product are half their depth. Module 02's message-thread
lesson runs 3,193 words; the token engine's core lesson runs 709.

### 7.2 The playground cannot run async code — proven

`playground.js` uses `new Function(...)` and reads the captured log
synchronously, so anything resolving in a microtask is lost:

| Student types | Prints | Should print |
|---|---|---|
| `console.log(1 + 1)` | `2` | `2` |
| `Promise.resolve("done").then(v => console.log(v))` | **(no output)** | `done` |
| `await Promise.resolve(42)` then log | **(no output)** | `42` |

Lesson `01/0009` is Promises and async/await, and the whole Token stack is
asynchronous. There is also no infinite-loop guard — `while (true)` hangs the
tab, and loops is `01/0005`, the next lesson.

### 7.3 A stale duplicate of Module 01 in `lessons/`

All twelve files, every one diverged from `modules/01-javascript-fundamentals/`
and roughly half the size — they predate the quiz expansion. Opening the wrong
folder means studying an older edition with no indication anything is wrong.

### 7.4 Stack pinned to a 2023-era Expo

Track A is written against Expo SDK 49. Camera, notifications and secure-store
APIs have all moved since. Nothing teaches how to *keep* a stack current —
changelogs, SDK upgrades, pinning strategy — which for a multi-year product is a
recurring cost the course never names.

### 7.5 Five broken links inside the Token track

Three module READMEs point at pre-pivot directory names (`a5-core-token`,
`b5-websocket`, `a7-incoming-calls`); `01/0009` points "next" at
`0010-fetch-and-http.html`, which does not exist.

### 7.6 No answer to "millions of users", and one sleeper cost

Zero mentions of high availability, failover, or recovery objectives across all
69 lessons. The taught architecture is one VPS, one Postgres container, one
coturn. Right start, wrong destination — and the ceiling is never named.

The sleeper cost is TURN. "I only pay for hosting" holds until video relays
through your own coturn; bandwidth becomes the dominant bill, and the
privacy-motivated `iceTransportPolicy: 'relay'` forces *every* call through it.
Taught as a privacy trade-off, never as a cost one.

### 7.7 No route from "published" to "real users"

Zero mentions of TestFlight, Play internal/closed testing tracks, or beta
programmes. The goal is real users; the course ends at store submission.

### 7.8 Nothing to look things up in

One reference sheet (JavaScript basics) for a course covering SQL, TypeScript,
Postgres, Docker, WebRTC, git and React Native. No glossary. No lesson carries a
"if you see this error, it means this" section.

### 7.9 Legacy salvage is worth less than assumed

42 of 45 archived lessons are Firebase-bound — including every lesson in the
testing, monitoring and compliance modules. Concept references only.

### 7.10 Checked and healthy

Every inline `<script>` in all 95 lessons parses cleanly — the `</script>`
escaping bug has not recurred. `search-index.json` is accurate: 95 entries, no
dead paths, no track lesson missing. Both had drifted badly before.

### 7.11 Added to Phase 0

- Make the playground handle async and guard runaway loops (~20 lines) —
  **before** practice goes into `01/0005` or `01/0009`
- Delete the stale `lessons/` duplicate
- Fix the five broken navigation links
- Start a glossary and a per-lesson "common errors" convention

### 7.12 Two more decisions

6. **What scale is v1 actually aiming at?** "Millions of users" and "one Coolify
   VPS" are different architectures. *Recommendation: build for the first 10,000,
   instrument from day one, and teach the next architecture as a module rather
   than meet it as a surprise.*
7. **Bring the stack current before Track A, or leave it at SDK 49?** Following
   three-year-old Expo instructions fails in ways a beginner cannot diagnose.

---

## 8. Third pass — the lessons do not compose into one codebase

Extracting every `CREATE TABLE` across the course and matching it against every
table the lessons query:

| Table | Created in | Queried in | Consequence |
|---|---|---|---|
| `participants` | **nowhere** | b10/0001, b10/0002, quizzed in b1/0002 | The security lesson teaching correct access control, and the account-deletion routine, both query a table the course never creates |
| `read_receipts` | **nowhere** | — | Promised in the track plan, silently dropped. No data model at all |
| `deletion_queue` | **nowhere** | b10/0002, twice | The legally-required deletion flow writes to a table that does not exist |
| `push_tokens` | **nowhere** | named only inside a quiz option | The push module never stores a device token. Push cannot work as taught |
| `access_rules` | a5/0004 — a *client* lesson | b7 engine, b2 schema | Backend table first defined in a UI module, two phases after the backend was built |
| `schema_migrations` vs `migrations` | b2/0003 vs b9/0002 | both | The deploy lesson runs migrations against a differently-named table than the migrations lesson created |

`b2/0002` creates `conversations` and `messages`. `TOKEN-TRACK.md` promises that
lesson delivers "conversations, messages, participants, read_receipts." Half was
never written, and later modules were authored as though it had been.

**This is the direct answer to the one-stop question.** Individual lessons are
not wrong; following the course in order produces a database that later lessons
in the same course cannot run against. You hit it at B10, ~80 lessons in, and
the only way through is to design the missing schema yourself.

**The good half:** the shared *code* scaffolding does hold. `ApiError`, the
`pool` export and `requireAuth` are each defined in an earlier lesson and reused
consistently across four to nine later ones. The cross-lesson discipline exists
— it was applied to the code and not to the schema.

---

## 9. What remains unverified

Stated plainly, because the answer to "is anything else missing" is *probably yes*.

**Checked directly:** prose depth (all 95), dependency/topic coverage (60 markers),
inline script syntax (all 95), search index, nav links, schema coherence, shared
identifiers, playground async behaviour, `lessons/` divergence.

**Not checked, ranked by risk:**

1. **Code correctness of 94 lessons.** One read in full, two bugs found. Nothing
   has been executed. This is the largest remaining unknown.
2. **2,508 quiz answers.** Nobody has verified that `correct:` points at the
   right option. A wrong key actively teaches an error and marks the right
   answer wrong.
3. **The other three asset scripts** — `quiz.js`, `solution.js`, `progress.js`.
   Only `playground.js` was read, and it had a real defect.
4. **The 01/0001–0004 self-checks.** CLAUDE.md prescribes a verification recipe;
   it has not been run.
5. **Domain accuracy** — WebRTC theory, Postgres specifics, CallKit, coturn.
   Headings sampled, content not audited.
6. **Legal accuracy of the DPDP lesson.** I cannot verify this and will not
   pretend to. It needs a person who knows Indian data-protection law.
7. **Rendering.** No page has been opened in a browser.
8. `.agents/skills` (40+ folders) and `skills-lock.json` — never opened, purpose
   unknown.
9. Lesson time estimates ("~55 min") — unvalidated.

**The meta-point:** each pass changed the question and each found something new.
Auditing has diminishing returns from here. The remaining unknowns are the kind
that only surface under execution — so the way to get confidence is Phase 0:
build the repo by following the lessons, and let every break announce itself.

---

## 10. Fourth pass — quiz key verification

All 2,508 track questions extracted by executing each lesson's inline script and
capturing what is passed to `createQuiz`. Count matches the documented 2,508.

### 10.1 Structure — clean

| Check | Result |
|---|---|
| Answer index out of range | 0 |
| `correctOrder` not a valid permutation | 0 |
| Missing options / answers / explanations | 0 (3 apparent were deliberate empty outputs) |
| Duplicate option text | 0 (1 apparent was a casing question) |
| "All of the above"-type option not last | 2 |

### 10.2 Eight wrong keys, confirmed by execution

188 `predict-output` questions run without a browser/DB/RN. All executed:

| Lesson | Says | Actually | Why |
|---|---|---|---|
| a10/0001 q20 | parse failed | **null** | `JSON.parse(null)` coerces to "null" and returns `null` — never throws |
| a5/0001 q0 | 29 | **31** | The token alphabet is 31 characters |
| a5/0001 q20 | true | **false** | `MERC-8GH2-KP4X` fails the lesson's own format regex |
| a5/0002 q6 | MERC8GH2KP4X | **null** | Same cause |
| a5/0002 q11 | MERC8GH2KP4X | **null** | Same cause |
| a6/0002 q20 | 100:A, local-…:B | **100:A, 100:B** | Both IDs identical, `map` rewrites both |
| a9/0002 q9 | (empty string) | **null** | Explanation reasons over a value the code never produces |
| b6/0002 q19 | 28 MB | **27 MB** | Answer used decimal MB; code divides by 1024² |

### 10.3 The root cause of four of them is a product bug, not a quiz bug

The token alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` deliberately excludes the
ambiguous characters **I, L, O, 0, 1**. The canonical example token used
throughout the course — `MERC-8GH2-KP4X` — **contains an L**.

The flagship example of the product is not a token the product could generate.
It appears in **34 files**, including `CLAUDE.md` and `TOKEN-BRIEF.md`. Any test
or validator written against it disagrees with any code written against the
generator. Fix the example, or fix the alphabet — but not in one place only.

### 10.4 Ten questions are tagged with the wrong type, inverting them

`quiz.js` renders every `which-breaks` question under the fixed prompt
**"Which of these will fail?"**. Roughly ten of 312 were authored as ordinary
multiple-choice — "Which heartbeat interval is best?", "Which iceServers
configuration is correct?" — and their key marks the option that is *right*.

The screen asks which fails; the key rewards the correct one. A student who
understands the material is marked wrong. Confirmed: `a3/0002 q10`,
`a4/0003 q27`, `a6/0002 q2`, `a7/0003 q2`, `a7/0005 q19`, `b5/0001 q2`,
`b5/0002 q2`, `b6/0001 q17`.

### 10.5 Two smaller things

- 25 `fill-blank` questions show 2–3 `___` blanks but carry one answer.
- Answer-position bias reconfirmed exactly: of 1,284 keyed questions, **63.6%**
  at index 1, 25.2% at index 2, 9.2% at index 0, 2.0% at index 3.

---

## 11. Am I confident? No — and here is the coverage

| Question type | Count | Verified how | Confidence |
|---|---|---|---|
| predict-output — executable | 188 | Run; output compared to key | High |
| predict-output — needs browser/DB/RN | 305 | Structure only | None |
| multiple-choice | 600 | Structure only | None |
| fill-blank | 456 | Structure + blank count | Low |
| spot-the-bug | 372 | Structure only | None |
| which-breaks | 312 | Structure + framing check (found 10) | Low |
| order-steps | 275 | Permutation validity, not correctness of order | Low |

**188 of 2,508 keys — 7.5% — were verified against ground truth.** The rest rest
on domain judgement exercised question by question. Execution cannot settle
whether 30 seconds is the best heartbeat interval.

**The hit rate on the testable part was 8 wrong in 188 — 4.3%.** If it holds,
roughly a hundred questions carry a wrong key. That is an extrapolation from one
sample, not a finding — but it is the best number available and it is not small.

### Recommended addition to Phase 0

Fix the 18 confirmed-broken questions and the `MERC-8GH2-KP4X` contradiction.
Both are bounded, and the token example touches 34 files including the
orientation docs — it gets more expensive to change the longer it propagates.

---

## 12. Fixes applied (2026-08-15)

18 confirmed-broken questions and the token contradiction, across 47 files.
**Not committed** — working tree left for review.

### 12.1 The token contradiction

Fixed the example, not the alphabet — excluding I, L, O, 0, 1 is a deliberate
anti-ambiguity choice worth keeping, so the invalid example was at fault.

**`MERC-8GH2-LP4X` → `MERC-8GH2-KP4X`** — all 187 occurrences of the `LP4X`
family across 36 files, including `CLAUDE.md` and `TOKEN-BRIEF.md`. This alone
fixed 3 of the 8 wrong keys, which were regex tests against the invalid token.

**It was worse than one bad example.** Lesson `a5/0001` used the count **29**
everywhere — code comment, entropy claim, modulo-bias arithmetic, three
questions. The alphabet has **31** characters (36 alphanumerics − 5 ambiguous).
Every derived figure was wrong, one twice over: the lesson claimed
29^12 ≈ 1.7 × 10^17 when 29^12 is 3.5 × 10^17. Now corrected throughout to
31^12 ≈ 7.9 × 10^17, ~25,000 years to exhaust at 1M tokens/sec, and bias
256 / 31 = 8 r 8 → the first **8** characters are 12.5% more likely (not 24).

### 12.2 The eight answer keys

Three resolved by the token fix. The other five corrected with their
explanations, each of which was reasoning about a value the code never produced:

| Question | Was | Now |
|---|---|---|
| `a10/0001 q20` | parse failed | **null** — `JSON.parse(null)` coerces to "null" and returns null; it never throws. Explanation rewritten to teach the false-confidence trap |
| `a5/0001 q0` | 29 | **31** |
| `a6/0002 q20` | 100:A, local-…:B | **100:A, 100:B** — old explanation contradicted itself; both IDs are identical so both are rewritten |
| `a9/0002 q9` | (empty string) | **null** — path resolves to `''`, not `'t/'`, so the guard fails |
| `b6/0002 q19` | 28 MB | **27 MB** — snippet divides by 1024², so it prints MiB; the answer was in decimal MB |

### 12.3 The ten inverted questions

All ten were multiple-choice questions tagged `which-breaks`, so `quiz.js`
rendered them under "Which of these will fail?" while the key rewarded the
correct option. Converted to multiple-choice — no re-keying needed. `which-breaks`
312 → 302, multiple-choice 600 → 610, total holds at 2,508.

Left alone: `a11/0004 q17` and `a6/0001 q9` are genuine failure questions.

### 12.4 Verified after

| Check | Before | After |
|---|---|---|
| Executable predict-output mismatches | 14 | **6 — all harness artefacts, 0 real** |
| Inverted `which-breaks` | 10 | **0** |
| Invalid `LP4X`-family tokens | 187 | **0** |
| Stale "29 character" claims | 6 | **0** |
| Inline script syntax, 140 lessons | clean | **clean** |
| Total track questions | 2,508 | **2,508** |

The 6 remaining mismatches are harness limits, not course errors: two conceptual
pseudo-code, one comma-vs-newline formatting, one needs `jwt`, one relies on
Node printing `Set(0) {}`, one on a suppressed unhandled rejection.

### 12.5 Still open — deliberately not touched

~15 other example tokens contain excluded characters (`SHOP-4KN9`, `CAFE-2KL7`,
`DELI-2XN5-QW8R`, …). Some are accidental exactly as MERC was; others look like
deliberate negative fixtures (`TEST-1234`, `NOPE-0000`, `IJKL-3333`) where being
invalid may be the point. Telling them apart needs reading each in context —
rewriting a fixture meant to be rejected would break its lesson. Flagged, not guessed.
