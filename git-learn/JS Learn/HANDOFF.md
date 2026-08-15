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

> **"Complete" throughout this document means _written_, not _studied_.**
> Student progress as of 2026-08-15 is **3 lessons of 95** — `01/0001`,
> `01/0002` and `01/0003` done with quizzes, next is `01/0004-conditionals`.
> All 95 lessons were
> generated ahead of the student, contrary to the "one module at a time" rule
> in CLAUDE.md. No lesson's code has been executed or confirmed running.

### Existing modules (written during the WhatsApp era)

| Module | Lessons | Status |
|--------|---------|--------|
| 01 — JavaScript Fundamentals | 12 | Written; concepts valid, WhatsApp framing, no exercises — see §6 |
| 02 — React Native | 14 | Written; concepts valid, WhatsApp framing, no exercises — see §6 |
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

**All 24 modules written. The course is finished; the student is on lesson 3,
and the Token repo does not yet exist — see §8.**

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
index.html              ← course home, Token-branded, lists all 24 modules in sequence
modules/
  01-javascript-fundamentals/  02-react-native/          ← 26 legacy-format lessons
  x1-git-dev-environment/      x2-debugging/             ← cross-cutting
  a2-typescript/  a3-api-consumption/  a4-auth-client/
  a5-core-token-features/  a6-chat-realtime/  a7-voice-video/
  a8-redemption-web/  a9-deep-linking/  a10-device-security/
  a11-polish-publish/                                    ← Track A (client)
  b1-sql-fundamentals/  b2-schema-design/  b3-node-http-server/
  b4-auth-server/  b5-websocket-server/  b6-webrtc-signalling/
  b7-token-engine/  b8-push-notifications/  b9-docker-deployment/
  b10-security-compliance/                               ← Track B (backend)
  03-firebase-backend/ … 09-advanced-features/           ← 45 legacy lessons, unlinked
assets/
  styles.css          ← shared stylesheet + responsive breakpoints (768px, 400px)
  quiz.js             ← createQuiz(), 6 question types
  playground.js       ← createPlayground(), sandboxed JS editor
  solution.js         ← createSolution(), exercise → hints → solution
  progress.js         ← localStorage progress tracking
  copy-code.js        ← auto-attaches Copy buttons to <pre>
  search.js           ← client-side search (index.html only)
  search-index.json   ← 95 entries, all 24 modules — regenerate when lessons change
reference/js-basics-cheatsheet.html
MISSION.md      ← why Token, success criteria, out of scope
NOTES.md        ← teacher notes; CLAUDE.md wins where they disagree
RESOURCES.md    ← open-source links only; Firebase/Agora deliberately absent
TOKEN-BRIEF.md  TOKEN-TRACK.md  TOKEN-ASSETS-TASK.md
CLAUDE.md       ← operative orientation
HANDOFF.md      ← this file
```

**Every module has a `README.html`.** Legacy `03-`–`09-` remain on disk but are
linked from nothing.

---

## 5. Course tooling — built, in `assets/`

All six features from `TOKEN-ASSETS-TASK.md` are working. See CLAUDE.md for the
call signatures. Only `search-index.json` needs manual upkeep — it has no build
step and drifted badly once already (see §7).

---

## 6. Lesson format going forward

### Flow per lesson
```
"Why this matters for Token" callout
  → Concept explanation with code
  → Exercise statement ("build this")
  → Student attempts it
  → Collapsible solution revealed
  → 25+ quiz questions (mixed types — see §9)
  → Lesson nav (prev/next)
```

**Modules 01 and 02 do not follow this format.** They predate the tooling: zero
`createPlayground()`, zero `createSolution()`, 208 WhatsApp references, and only
a closing quiz. They are read-then-quiz lessons. This matters more than it looks
— they are the 26 lessons the student is working through right now. The 69
Token-track lessons carry 41 playgrounds and 69 exercises between them.

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
- **Do not trust progress claims in these docs.** This file and CLAUDE.md both
  asserted the student had completed Modules 1 and 2. He had done two lessons.
  The claim is read at the top of every session and silently mispitches
  everything downstream. Ask; don't infer from "Complete".
- **Stale docs contradict the architecture louder than CLAUDE.md corrects it.**
  `MISSION.md`, `NOTES.md` and `RESOURCES.md` survived the pivot unedited and
  presented Firebase as the backend plan, with `RESOURCES.md` recommending the
  Agora SDK. Rewritten 2026-08-14. When an architecture decision changes, grep
  every `.md` — not just the ones that look official.
- **`search-index.json` drifts silently.** No build step, hand-maintained, and
  it decayed to 65 entries covering 14 of 24 modules with 13 dead links before
  anyone noticed. Search fails quietly — no error, just no results. Regenerate
  after adding or renaming lessons.
- **No lesson code has ever been executed.** All 95 lessons were generated ahead
  of the student without the "confirm it runs" gate. Treat every snippet as
  unverified; when something fails, suspect the lesson.

---

## 8. What is next

**The course is written. The product is not.** All 24 modules and 95 lessons
exist. Zero lines of Token exist.

CLAUDE.md states the working method: *"One repo, growing. The Token repo exists
from lesson 1. Every lesson adds to it and commits. The repo is the output; the
lessons are scaffolding."* That never happened. A search of the whole `GIT`
folder on 2026-08-14 found no `package.json`, no `.ts`/`.tsx`, no `.sql`, and no
`app/ web/ api/ shared/` anywhere. The scaffolding became the deliverable.

The companion rule — *"One module at a time. Do not generate ahead. Student
confirms it runs before the next is written"* — was inverted too. Everything was
generated ahead; nothing was confirmed.

### For the student

1. **Work through 01 and 02** with the browser console open, typing every
   example by hand. Those lessons have no playground and no exercise, so the
   practice has to be manual, with javascript.info (already linked at the foot
   of each lesson) as the real source of drills.
2. **Keep a plain folder** of per-lesson practice files. Not a git repo yet —
   git and JavaScript at the same time is two unfamiliar things at once.
3. **Around lesson 8–10, do X1 and create the Token repo.** It must live
   *outside* the course repo, whose root is `…/Ashish/GIT` — the entire `GIT`
   folder is one repository, and nesting inside it will cost an evening. The
   practice folder becomes its first commit.
4. **Then X1 → A2 → X2 → B1**, and start putting real SQL into `api/`.

### For whoever writes course material next

**Do not write more lessons.** There is a ~92-lesson backlog against a student
on lesson 4. Adding to it is the trap this project already fell into. If a gap
appears, fix an existing lesson instead.

The one defensible piece of new work: **adding `createPlayground()` to Module 01**
— 12 lessons, pure JavaScript, runs in-browser. It serves exactly where the
student is. Scoped but not started, and it needs asking first, since it
contradicts the "keep 01/02 as-is" note in CLAUDE.md — which was written back
when 01 and 02 were believed complete.

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

### Session of 2026-08-14 — audit and repairs

A full review of the project produced four commits after `99e1678`:

| Commit | What |
|--------|------|
| `75d5c6a` | The `</script>` escapes above, and §10 corrected — it had claimed ~98 files were uncommitted when `99e1678` had already landed them |
| `cb88051` | `search-index.json` regenerated: 65 → 95 entries, 14 → 24 modules, 13 dead links removed. Hand-written keywords preserved by matching module dir + lesson number, so the renamed module-02 files kept theirs |
| `ea95287` | Module 02's last lesson pointed *Next* at the superseded `03-firebase-backend` — the dead end sat exactly at the student's transition point. Now points at X1. `MISSION.md`, `NOTES.md` and `RESOURCES.md` rewritten: all three still presented Firebase as the plan, and `RESOURCES.md` recommended Agora |
| `3e27eca` | Student progress corrected from "Modules 1 and 2 complete" to the actual 2 lessons of 95 |

**Also found, not fixed:** the Token repo does not exist (§8), and modules 01/02
have no exercises or playgrounds (§6). Both are decisions for the student, not
cleanups.

**Not committed:** `.claude/settings.local.json` carries local permission state
and is deliberately left alone.

### Watch out when editing this file from a shell

Backticks in a `python -c` string get evaluated by bash *before* Python sees
them. Rewriting §8 that way spliced ~2KB of `git help` output into the document.
Write the replacement text to a file with an editor tool, then splice it with a
script that reads that file — never inline prose containing backticks into a
shell argument.
