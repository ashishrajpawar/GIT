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
- **Never write a literal `</script>` inside a quiz string** — escape it as
  `<\/script>`. The HTML parser ends a `<script>` element at the first `</script>`
  sequence regardless of JavaScript string context, so an unescaped one truncates
  the block mid-string. Result: `SyntaxError`, `createQuiz()` never runs, the quiz
  silently renders as nothing, and the rest of the sentence leaks onto the page as
  visible text. This bit two XSS-safety lessons — see §10.

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

---

## 9. Quiz expansion — 5 → 25 questions per lesson — COMPLETE

**Done. All 24 modules, all 95 lessons, 2,508 questions.**

Every Token-track lesson carries at least 25 questions with a mix of types
(multiple-choice, predict-output, spot-the-bug, fill-blank, which-breaks, order-steps).

| Module | Lessons | Min | Total | Status |
|--------|---------|-----|-------|--------|
| 01 — JavaScript Fundamentals | 12 | 25 | 313 | ✅ Done |
| 02 — React Native | 14 | 25 | 355 | ✅ Done |
| X1 — Git & Dev Environment | 3 | 25 | 76 | ✅ Done |
| A2 — TypeScript | 3 | 25 | 76 | ✅ Done |
| X2 — Debugging | 2 | 25 | 50 | ✅ Done |
| B1 — SQL Fundamentals | 4 | 25 | 103 | ✅ Done |
| B2 — Schema Design | 3 | 26 | 81 | ✅ Done |
| B3 — Node & HTTP Server | 4 | 28 | 117 | ✅ Done |
| B4 — Auth Server | 3 | 25 | 81 | ✅ Done |
| A3 — API Consumption | 4 | 26 | 111 | ✅ Done |
| A4 — Auth on the Client | 3 | 25 | 80 | ✅ Done |
| A5 — Core Token Features | 5 | 29 | 148 | ✅ Done |
| B5 — WebSocket Server | 3 | 25 | 77 | ✅ Done |
| A6 — Chat & Real-time | 3 | 26 | 78 | ✅ Done |
| B6 — WebRTC Signalling | 2 | 26 | 52 | ✅ Done |
| A7 — Voice & Video | 5 | 26 | 138 | ✅ Done |
| A8 — Redemption Web Page | 4 | 27 | 115 | ✅ Done |
| A9 — Deep Linking & Routing | 2 | 25 | 53 | ✅ Done |
| B7 — Token Engine | 3 | 25 | 77 | ✅ Done |
| B8 — Push Notifications | 1 | 25 | 25 | ✅ Done |
| A10 — Device Security | 2 | 25 | 50 | ✅ Done |
| B9 — Docker & Deployment | 3 | 25 | 77 | ✅ Done |
| B10 — Security & Compliance | 2 | 25 | 50 | ✅ Done |
| A11 — Polish & Publish | 5 | 25 | 125 | ✅ Done |

**"Min" is the smallest question count in that module.** Some lessons run 26–30 —
those extras are genuine questions, not miscounts. 25 was the floor, not a cap.

**Legacy modules are excluded by design.** `modules/03-` through `modules/09-`
(45 WhatsApp-era lessons) remain at 5 or 0 questions. They are superseded and were
never part of this expansion.

### How to re-verify cheaply

Count two independent markers per lesson and check they agree — `explanation:` keys,
and answer keys (`correct:` / `answer:` / `correctOrder:`, exactly one per question):

```bash
for f in $(find modules -name "0*.html" | grep -vE 'modules/0[3-9]-'); do
  printf "%3d %3d  %s\n" "$(grep -cE '^\s*(correct|answer|correctOrder):' "$f")" \
                         "$(grep -c 'explanation:' "$f")" "$f"
done
```

Then syntax-check every lesson's inline `<script>` block (see §7 for why this matters):

```bash
node -e '
const fs=require("fs"),vm=require("vm"),cp=require("child_process");
const files=cp.execSync("find modules -name \"0*.html\" | grep -vE \"modules/0[3-9]-\"")
  .toString().trim().split("\n");
let bad=0;
for(const f of files){const s=fs.readFileSync(f,"utf8");
  const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m;
  while((m=re.exec(s))){try{new vm.Script(m[1]);}catch(e){bad++;console.log("FAIL",f,e.message);}}}
console.log(bad===0?"all clean":bad+" failures");'
```

---

## 10. Commit state

**Everything described in this document is committed.** The working tree is clean.

Commit `99e1678 nv` landed the two large bodies of work:

1. **The quiz expansion** (§9) — ~95 lesson files, 5 → 25+ questions each.
2. **Responsive CSS** — `assets/styles.css` gained ~164 lines: two breakpoints,
   `@media (max-width: 768px)` and `@media (max-width: 400px)`, covering `.quiz`,
   `.quiz-option`, `.playground-editor`, `.solution-block`, `.lesson-nav`,
   `.copy-btn`, and `.badge`. This mobile-layout pass is not recorded anywhere else
   in this document.

### The `</script>` fix

Two lessons had quizzes that did not render at all in a browser — three explanation
strings contained a literal `</script>` (see §7). Now escaped as `<\/script>`:

- `modules/01-javascript-fundamentals/0007-dom-and-browser-apis.html:684`
- `modules/b3-node-http-server/0004-input-validation-error-handling.html:378`
- `modules/b3-node-http-server/0004-input-validation-error-handling.html:511`

Both are XSS-safety lessons — writing about script injection is exactly when this
bug gets typed. Re-run the syntax check in §9 after editing any quiz.
