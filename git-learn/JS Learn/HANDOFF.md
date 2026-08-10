# HANDOFF — JS Learn / Token Course

## 1. What this project is

A two-track HTML course teaching one student (Ashish) to build **Token** — a
privacy-first mobile app for the Indian market. Users issue revocable
capability tokens instead of sharing phone numbers or emails.
Deny-by-default: nobody contacts the user unless they issued a token.

The course lives as plain HTML files opened in a browser. No server, no
framework. The Token product itself has its own repo with four folders:
`app/`, `web/`, `api/`, `shared/`.

**The project pivoted from a WhatsApp clone to Token.** Firebase was dropped
entirely. The backend is now built from scratch (Node + Postgres). See
`TOKEN-BRIEF.md` for the full product brief and `TOKEN-TRACK.md` for the
two-track lesson plan.

---

## 2. Current state

### Existing modules (written during the WhatsApp era)

| Module | Lessons | Status |
|--------|---------|--------|
| 01 — JavaScript Fundamentals | 12 | Complete, still valid |
| 02 — React Native | 14 | Complete, still valid |
| 03 — Firebase Backend | 5 | SUPERSEDED — replaced by Track B |
| 04 — WhatsApp Features | 6 | Partially salvageable |
| 05 — Audio & Video Calls | 8 | Theory transfers, signalling rewritten |
| 06 — Polish & Publish | 6 | Keep for reference |
| 07 — Store Compliance & Safety | 6 | Partially relevant |
| 08 — Production at Scale | 8 | Partially relevant (no Firebase parts) |
| 09 — Advanced Features | 6 | Deep linking rewritten for Token |

Total: 71 lessons across 9 modules.

### Two-track plan — written and reviewed

- `TOKEN-TRACK.md` — full table of both tracks with sequencing
- `TOKEN-BRIEF.md` — product brief (supersedes old WhatsApp sections)
- `CLAUDE.md` — rewritten for Token context

### Course tooling upgrade — COMPLETE

All six features from `TOKEN-ASSETS-TASK.md` are built and working in `assets/`:

1. Extended `createQuiz()` with 5 new question types
2. Runnable JS playground (`playground.js`)
3. Progress tracking (`progress.js`, localStorage)
4. Collapsible solution component (`solution.js`)
5. Copy buttons on code blocks (`copy-code.js`)
6. Client-side search (`search.js` + `search-index.json`)

### New lessons written

| Module | Lessons | Status |
|--------|---------|--------|
| X1 — Git & Dev Environment | 3 | Complete |
| A2 — TypeScript | 3 | Complete |
| X2 — Debugging | 2 | Complete |
| B1 — SQL Fundamentals | 4 | Complete |
| B2 — Schema Design | 3 | Complete |
| B3 — Node & HTTP Server | 4 | Complete |
| B4 — Auth (Server) | 3 | Complete |
| A3 — API Consumption | 4 | Complete |
| A4 — Auth on the Client | 3 | Complete |
| A5 — Core Token Features | 5 | Complete |
| B5 — WebSocket Server | 3 | Complete |
| A6 — Chat & Real-time | 3 | Complete |
| B6 — WebRTC Signalling | 2 | Complete |
| A7 — Voice & Video | 5 | Complete |
| A8 — Redemption Web Page | 4 | Complete |
| A9 — Deep Linking & Routing | 2 | Complete |
| B7 — Token Engine | 3 | Complete |
| B8 — Push Notifications | 1 | Complete |
| A10 — Device Security & Storage | 2 | Complete |
| B9 — Docker & Deployment | 3 | Complete |
| B10 — Security & Compliance | 2 | Complete |
| A11 — Polish & Publish | 5 | Complete |

**All phases complete. Course finished.**

---

## 3. Architecture — fixed decisions

**Mobile app:** React Native + Expo, EAS Build, TypeScript, SQLite cache
**Redemption web page:** Vite + React (NOT RN Web), same Coolify VPS
**Backend:** Node.js + TypeScript, PostgreSQL, Redis (optional v1), raw SQL then Drizzle
**Communication:** WebSocket (chat), WebRTC (voice/video), own signalling server
**Push:** FCM + APNs via Expo Notifications (only third-party dep)
**Deployment:** Coolify on VPS, `api/` and `web/` as containers, auto TLS

**Explicitly out of scope:** Firebase, PSTN voice, email, payment gateway,
third-party comms SDKs (Agora/Twilio/etc), Prisma.

---

## 4. File structure

```
index.html                          ← course home page (still WhatsApp-branded, update pending)
modules/
  01-javascript-fundamentals/       ← 12 lessons
  02-react-native/                  ← 14 lessons
  03-firebase-backend/              ← 5 lessons (superseded)
  04-whatsapp-features/             ← 6 lessons
  05-audio-video-calls/             ← 8 lessons
  06-polish-and-publish/            ← 6 lessons
  07-store-compliance-and-safety/   ← 6 lessons
  08-production-at-scale/           ← 8 lessons
  09-advanced-features/             ← 6 lessons
assets/
  styles.css                        ← shared stylesheet
  quiz.js                           ← createQuiz() widget (multiple-choice only, upgrade pending)
reference/
  js-basics-cheatsheet.html
TOKEN-BRIEF.md                      ← product brief
TOKEN-TRACK.md                      ← two-track plan with sequencing
TOKEN-ASSETS-TASK.md                ← course tooling upgrade spec
CLAUDE.md                           ← Claude orientation (current project instructions)
HANDOFF.md                          ← this file
```

---

## 5. Planned tooling files (after assets task)

```
assets/
  quiz.js             ← extended with 5 new question types (backward-compatible)
  playground.js       ← embeddable JS editor + sandboxed runner
  progress.js         ← localStorage progress tracking
  solution.js         ← collapsible exercise/hint/solution component
  copy-code.js        ← auto-attaches copy buttons to all <pre> blocks
  search.js           ← client-side lesson search
  search-index.json   ← static lesson index (no build step)
```

---

## 6. Lesson format going forward

### Flow per lesson
```
"Why this matters for Token" callout
  → Concept explanation with code
  → Exercise statement ("build this")
  → Student attempts it
  → Collapsible solution revealed
  → 5 quiz questions (mixed types)
  → Lesson nav (prev/next)
```

### Quiz question types
- `multiple-choice` — existing, unchanged
- `predict-output` — code snippet, ask what it prints
- `spot-the-bug` — code with a defect, identify it
- `fill-blank` — code with one line/expression removed
- `which-breaks` — several variations, one fails
- `order-steps` — put operations in correct sequence

### Track B (backend) difference
Point 4 of the lesson format becomes: a full runnable server file or
migration (`.sql` for SQL lessons, `.js`/`.ts` for Node lessons).

---

## 7. Gotchas and things not to retry

- **No Firebase** — do not suggest or reference it anywhere
- **No third-party comms SDKs** — WebRTC only, self-hosted signalling
- **No Prisma** — raw SQL or Drizzle
- **Redemption web page is Vite + React, NOT React Native Web**
- **Both iOS and Android** — never Android-only shortcuts
- **Token sharing rule** — a token must never travel over a channel that
  already identifies the user. The app warns if the user tries.
- **Exercise before solution** — never hand over complete code up front
- **No gamification** — no badges, streaks, XP, points, mascots

---

## 8. What is next

1. ~~**Build course tooling** (`TOKEN-ASSETS-TASK.md`)~~ — DONE
2. ~~**Update `index.html`** — rebrand from WhatsApp to Token~~ — DONE
3. ~~**Write X1 — Git & Dev Environment** (3 lessons)~~ — DONE
4. ~~**Write A2 — TypeScript** (3 lessons)~~ — DONE
5. ~~**Write X2 — Debugging** (2 lessons)~~ — DONE
6. ~~**Write B1 — SQL Fundamentals** (4 lessons)~~ — DONE
7. ~~**Write B2 — Schema Design** (3 lessons)~~ — DONE
8. ~~**Write B3 — Node & HTTP Server** (4 lessons)~~ — DONE
9. ~~**Write B4 — Auth Server** (3 lessons)~~ — DONE
10. ~~**Write A3 — API Consumption** (4 lessons)~~ — DONE
11. ~~**Write A4 — Auth on the Client** (3 lessons)~~ — DONE
12. ~~**Write A5 — Core Token Features** (5 lessons)~~ — DONE
13. ~~**Write B5 — WebSocket Server** (3 lessons)~~ — DONE
14. ~~**Write A6 — Chat & Real-time** (3 lessons)~~ — DONE
15. ~~**Write B6 — WebRTC Signalling** (2 lessons)~~ — DONE
16. ~~**Write A7 — Voice & Video** (5 lessons)~~ — DONE
17. ~~**Write A8 — Redemption Web Page** (4 lessons)~~ — DONE
18. ~~**Write A9 — Deep Linking & Routing** (2 lessons)~~ — DONE
19. ~~**Write B7 — Token Engine** (3 lessons)~~ — DONE
20. ~~**Write B8 — Push Notifications** (1 lesson)~~ — DONE
21. ~~**Write A10 — Device Security & Storage** (2 lessons)~~ — DONE
22. ~~**Write B9 — Docker & Deployment** (3 lessons)~~ — DONE
23. ~~**Write B10 — Security & Compliance** (2 lessons)~~ — DONE
24. ~~**Write A11 — Polish & Publish** (5 lessons)~~ — DONE
25. ~~Phase 7 completes the course.~~ — COURSE COMPLETE
