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
>
> **Student progress, from the student (2026-08-15): `01/0001`–`01/0004` done
> with quizzes; next is `01/0005-loops`.** This is the one fact no script can
> compute — never infer it from the files. Doing exactly that produced the
> "Modules 1 and 2 complete" claim that mispitched every session for months.
>
> Every lesson was generated ahead of the student, contrary to the "one module
> at a time" rule in CLAUDE.md, and none has been executed. Verification is now
> tracked in `PROGRESS.md`; the student chose to verify all of it (decision 4,
> 2026-08-15 session below).

### Existing modules (written during the WhatsApp era)

| Module | Lessons | Status |
|--------|---------|--------|
| 01 — JavaScript Fundamentals | 12 | Lessons 1-4 have playgrounds + exercise + self-check; 5-12 do not. WhatsApp framing throughout — see §6 |
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

**All 24 modules are written — which is not the same as finished.** Written ≠
verified ≠ studied. The 2026-08-15 review found ten missing modules (~36
lessons) and scope has since grown to ~145 lessons total; see
`COURSE-REVIEW.md`. For counts and coverage run `node scripts/audit.mjs` and
read `PROGRESS.md` — never trust a number stated here.

---

## 3. Architecture — fixed decisions

**Mobile app:** React Native + Expo, EAS Build, TypeScript, SQLite cache
**Redemption web page:** Vite + React (NOT RN Web), same Coolify VPS
**Backend:** Node.js + TypeScript, PostgreSQL (pooled, partition-aware), **Redis
required** — socket routing, presence, distributed rate limiting — raw SQL then
Drizzle. API is **stateless**; see `ARCHITECTURE.md`.
**Messages are end-to-end encrypted from v1** — the server stores ciphertext only.
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
  search-index.json   ← regenerate when lessons change; audit reports its accuracy
scripts/audit.mjs   ← ground truth; generates PROGRESS.md
PROGRESS.md         ← GENERATED state — counts, coverage, verification. Never hand-edit
SESSION.md          ← hand-written: In progress / Next action / Blocked
reference/js-basics-cheatsheet.html
MISSION.md      ← why Token, success criteria, out of scope
NOTES.md        ← teacher notes; CLAUDE.md wins where they disagree
RESOURCES.md    ← open-source links only; Firebase/Agora deliberately absent
COURSE-REVIEW.md ← 2026-08-15 audit: vision-vs-course gaps, phased plan,
                   verified defects, and what is still unverified
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
  unverified; when something fails, suspect the lesson. Partially addressed
  2026-08-15: the 188 executable `predict-output` snippets were run and 8 wrong
  keys fixed. The other ~92% of the quiz bank is still unverified.
- **Every example token must be valid under the 31-character alphabet**
  (`23456789ABCDEFGHJKMNPQRSTUVWXYZ` — no 0, O, 1, I, L). The canonical example
  contained an `L` for months and reached 36 files including `CLAUDE.md`. See
  CLAUDE.md § "Token code format" — it is a hard constraint, not a style note.
- **Never tag a "which is correct?" question as `which-breaks`.** The renderer
  prints a fixed "Which of these will fail?" prompt regardless of your
  `question` text, which inverts the question. Ten had this defect.
- **The playground cannot run async code and has no loop guard.** `new Function`
  plus a synchronous log read means `.then()` and `await` both print
  `(no output)`; `while (true)` hangs the tab. Fix before adding practice to
  `01/0005` or `01/0009`. See `COURSE-REVIEW.md` §7.2.
- **Lessons do not compose into one codebase.** `participants`, `read_receipts`,
  `deletion_queue` and `push_tokens` are queried by later lessons but created by
  none. Following the course in order produces a database B10 cannot run
  against. See `COURSE-REVIEW.md` §8.

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

**Do not write more lessons.** There is a ~91-lesson backlog against a student
on lesson 5. Adding to it is the trap this project already fell into. If a gap
appears, fix an existing lesson instead.

The one defensible piece of new work: **adding `createPlayground()` to Module 01**
— 12 lessons, pure JavaScript, runs in-browser. It serves exactly where the
student is. Scoped but not started, and it needs asking first, since it
contradicts the "keep 01/02 as-is" note in CLAUDE.md — which was written back
when 01 and 02 were believed complete.

---

## 9. Quiz expansion — 5 → 25 questions per lesson — COMPLETE

**Done. All 24 modules, all 95 lessons, 2,508 questions.**

> **"Complete" here means the questions exist and are well-formed — not that
> their answers are right.** The 2,508 count was independently confirmed on
> 2026-08-15, and structure came back clean. But running the 188 executable
> `predict-output` questions found **8 wrong keys**, and a framing check found
> **10 more** inverted by a wrong `type`. All 18 are fixed. Only 7.5% of the
> bank has been checked against ground truth. See §"Session of 2026-08-15 —
> full course review" and `COURSE-REVIEW.md` §10.

Every Token-track lesson carries at least 25 questions with a mix of types
(multiple-choice, predict-output, spot-the-bug, fill-blank, which-breaks, order-steps).

**Per-module counts have moved to `PROGRESS.md`** (generated by
`scripts/audit.mjs`). A hand-maintained table here would drift the moment a
lesson changed — which is the failure mode this project already has twice. Run
the audit for current numbers.

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

### Session of 2026-08-15 — quiz answer-position bugs

The student reported that every *"Put these steps in the correct order"* question
displayed the steps already in the correct order. Confirmed and fixed in
`92aad6c`: `renderOrderSteps` iterated `q.steps` in array order, and 252 of the
275 order-steps questions are authored with the steps correctly sequenced and
`correctOrder: [0, 1, 2, …]`. Clicking straight down the list always scored.

The renderer now shuffles the buttons (Fisher-Yates) while each button keeps its
original index in `dataset.stepIndex`, so scoring against `correctOrder` is
unchanged and no lesson data needed editing — including the 23 questions whose
author had scrambled the steps by hand. The shuffle takes `correctOrder` as an
*avoid* sequence, so the displayed order is never itself the answer.

**Open — the same bug class in multiple-choice, not fixed.** Correct-answer
positions are clustered hard across all 1,309 `correct: N` questions
(multiple-choice, spot-the-bug, which-breaks):

| Position | Count | Share |
|----------|-------|-------|
| 2nd option (`correct: 1`) | 837 | 64% |
| 3rd option (`correct: 2`) | 326 | 25% |
| 1st option (`correct: 0`) | 120 | 9% |
| 4th option (`correct: 3`) | 26 | 2% |

Always picking the second option scores ~64% course-wide without reading the
question. Same root cause: a positional habit in the generator, preserved by a
renderer that paints options in array order.

Unlike order-steps this is **not** safe as a pure renderer shuffle:

- ~27 options are "All of the above" / "Neither" kind and break unless rendered last
- ~46 explanations name a position or letter ("option B", "the third option") and
  would contradict a shuffled display

(Both counts are from a quick grep and need proper verification before anyone
acts on them.) The workable fix shuffles by default but pins position-dependent
options and skips questions whose explanation names a position.

**Deliberately left open.** The student was told and chose to move on rather than
pause the course, on the grounds that knowing the pattern exists is enough to not
exploit it. Do not "helpfully" fix this mid-module — it rewrites quiz rendering
across ~95 lessons for a problem the student has opted to work around. Raise it
again only if they ask, or at a natural break between tracks.

### Session of 2026-08-15 — practice retrofit, lessons 01/0001-0004

The student said some lessons left them wanting more practice. An audit showed
why: **modules 01-09 (71 lessons, all pre-pivot) contain zero playgrounds and
zero exercises.** Every Token-track module (`a*`, `b*`, `x*`) has them — 41
lessons with `createPlayground`, 69 with `createSolution` — so module 01 is the
only stretch of the course where the student can read but never write.

Lessons 1-4 now have playgrounds at each concept, one deliberately-broken
snippet each, and an exercise with a behavioural self-check. See CLAUDE.md
§ "The practice pattern" for the shape to match. Exercises: variables
(`tokenCode`/`issuedTo`/`timesUsed`), a six-property `token` object across five
types, `issueToken`/`describeToken`, and `checkAccess(token)` — the last being
Token's real deny-by-default rule, including the ordering trap that revoking
must outrank pausing.

**Still open, ranked, and all discussed with the student:**

1. **Lessons 01/0005-0012 and all of module 02** still have no practice.
   Retrofit just-in-time as the student reaches them — do not batch ahead.
2. **No capstone anywhere in the course.** All 95 lessons checked: zero
   build-something-that-combines-it points. Module 01 ends after lesson 12 with
   no consolidation. A small pure-JS token issuer would fit.
3. **No spaced review.** Nothing revisits lesson 2 while the student is on
   lesson 5. The 25-30 question banks are the obvious raw material: ~8 at the
   end of the lesson, the rest into a pool the next lesson opens with.
4. **Only 3 of 95 lessons ask the student to explain anything in words.**
   One "write one sentence explaining X" prompt per lesson would fix it.
5. **Nothing the student writes persists** — playgrounds reset on refresh, and
   the Token repo does not exist yet (§8). They chose to keep the repo at X1 as
   originally sequenced. A plain `practice/` folder of `.js` files was offered
   as a lighter middle ground and not taken up. Their call; do not re-open it
   unprompted.

The student's stated preference throughout: keep studying, retrofit one lesson
at a time, do not pause the course for tooling work.

**Not committed:** `.claude/settings.local.json` carries local permission state
and is deliberately left alone.

### Session of 2026-08-15 — full course review, and quiz-key repairs

The student asked for a 360° review: does the course actually deliver a
production-grade, scalable, self-operated Token without Googling the gaps.
Findings and the phased plan live in **`COURSE-REVIEW.md`** — read that before
planning any further course work. Headlines:

- **Architecture is sound and the open-source constraint holds.** Every Track
  A/B lesson was searched for Firebase, Agora, Twilio, Prisma, Auth0, Supabase
  and ten others. One violation remains unfixed: `a7/0004` imports
  `@react-native-firebase/messaging`, contradicting B8's Expo Notifications.
- **Depth is inverted.** Modules 01/02 average 2,303 words of prose; the 69
  Token-track lessons that actually build the product average **1,106**. The
  thinning happened exactly where the product gets built.
- **Ten modules of coverage are missing** — testing, CI/CD, observability,
  analytics, scale/performance, offline+media+jobs, E2EE, trust & safety,
  architecture/ADRs, launch & support. Zero lessons on each.
- **Lessons do not compose into one codebase** (see §7).
- **Realistic timeline is 8–12 months**, ~130 lessons — not the 3–4 months in
  `TOKEN-TRACK.md`, which costed an MVP by someone who already codes.

#### Quiz keys — verified in part, 18 fixed

All 2,508 track questions were extracted by executing each lesson's inline
script. Structure is clean: 0 out-of-range keys, 0 malformed `correctOrder`,
0 genuinely missing fields. Semantics are another matter.

| Fixed | What |
|-------|------|
| 8 wrong answer keys | Found by running the 188 executable `predict-output` snippets — a 4.3% error rate on the testable sample |
| 10 inverted questions | Multiple-choice questions tagged `which-breaks`, so the key rewarded the correct option under a "which will fail?" prompt |
| 187 invalid tokens | `MERC-8GH2-LP4X` → `MERC-8GH2-KP4X` across 36 files |
| 6 stale figures | Lesson `a5/0001` used alphabet size 29 throughout; it is 31. Every derived number was wrong, one twice over |

`which-breaks` 312 → 302, multiple-choice 600 → 610, total holds at 2,508.
All 140 lessons still parse clean. **47 files changed, not committed.**

**Deliberately not fixed:** ~15 other example tokens contain excluded characters.
Some are accidental like MERC was; others look like deliberate negative fixtures
(`TEST-1234`, `NOPE-0000`, `IJKL-3333`) where invalidity may be the point.
Reading each in context is required — do not bulk-rewrite.

#### Honest coverage of the key verification

188 of 2,508 keys (**7.5%**) were checked against ground truth. The remaining
600 multiple-choice, 456 fill-blank, 372 spot-the-bug, 302 which-breaks and 275
order-steps rest on domain judgement that execution cannot settle. If the 4.3%
rate holds, roughly a hundred more questions carry a wrong key. That is an
extrapolation from one sample, not a finding.

#### Decisions still open with the student

1. Depth-first (deepen ~20 spine lessons) or breadth-first (add the 10 modules)?
2. Create the Token repo now? — recommended, highest-leverage item in the review
3. E2EE in v1 or v2? Must be settled **before** B2 schema design
4. Verify all lesson code by execution?
5. Fix the answer-position bias (63.6% at index 1) at the 01/02 break?
6. What scale is v1 for? "Millions" and "one Coolify VPS" are different designs
7. Modernise off Expo SDK 49, or leave it?

### Session of 2026-08-15 — seven decisions taken, Phase 0 begun

The student reviewed `COURSE-REVIEW.md` and settled every open decision. **Four
followed the recommendation; three deliberately overrode it, all in the more
ambitious direction.** The overrides change the architecture, so the reasoning
on both sides is recorded here — a future session must not "helpfully" revert
them.

| # | Decision | Choice |
|---|---|---|
| 1 | Sequencing | Depth first, **then breadth in waves** |
| 2 | Token repo | Create now, at `GIT/token/` |
| 3 | E2EE | **v1 — built in from the start** ← override |
| 4 | Verify lesson code | **Everything** ← override |
| 5 | Quiz answer-position bias | Fix it |
| 6 | v1 scale | **Build for millions from day one** ← override |
| 7 | Expo SDK | Modernise Track A before he reaches it |

#### The three overrides, and why

**E2EE in v1** (recommended: v2, designed for). The case for v2 was that E2EE
costs server-side search, blocks content moderation — which a product where
strangers can message you genuinely needs — makes multi-device hard, and turns
key backup into a product problem to solve before launch. The student chose v1
anyway: E2EE is the core of Token's privacy promise, and retrofitting it is a
rewrite of the message schema. **Accepted. It is his product and his call.**

**Verify everything** (recommended: the ~20 spine lessons). Bounded verification
covers the code the product is built from. He wants the whole bank. Accepted,
with a method note: some lessons cannot be executed without a device, a VPS, or
a domain. Those are recorded as `unverifiable` with a reason in
`scripts/verification-log.json` — never silently marked verified.

**Build for millions from day one** (recommended: first 10,000, instrumented).
The reconciliation that makes this coherent: **build the architecture that
scales, deploy it on one box until traffic justifies more.** Stateless API,
Redis-backed socket fan-out, pooled connections, partition-aware schema — then
scaling out is a config change, not a rewrite. That is what "I don't want to
re-architect after production" actually requires, so this is not a compromise
version of his choice.

#### What changed as a result

Architecture decisions previously marked "do not revisit" — revised by the
student, deliberately, which is the only legitimate way that happens:

- Redis: *optional for v1* → **required** (socket routing across nodes, presence,
  distributed rate limiting)
- API: implicitly single-node → **explicitly stateless**
- Postgres: one container → **pooled, partition-aware, read-replica-ready**
- Messages: server-readable → **server stores ciphertext only**

Module sequence:

- **E2EE moves before B2** — a schema prerequisite now, not an add-on, and grows
  from 2 lessons to ~5 (key generation, distribution, verification, backup and
  recovery, multi-device — the last being the hardest thing in the plan)
- **Trust & Safety redesigned and moved earlier.** Server-side moderation is off
  the table. The answer is client-side report packaging: the reporting user's
  device decrypts and submits the message with cryptographic proof of
  authorship. Signal and WhatsApp both do this, and it satisfies Apple's and
  Google's abuse-reporting requirements — but it is a design constraint from day
  one, not a later feature
- **Scale & Performance moves alongside the backend track**, not after deployment
- **B2 (schema) and B5 (WebSocket) get rewritten**, not merely deepened

**Timeline, revised honestly: 12–18 months and ~145 lessons.** The earlier
8–12 month figure assumed the moderate path on decisions 3 and 6. The old 3–4
month estimate in `TOKEN-TRACK.md` costed an MVP by someone who already codes.

#### Phase 0 — progress

Live status is in `SESSION.md`; measured state is in `PROGRESS.md`. Do not look
for either here.

The first audit run found a **fourth orphan table** the manual review missed:
`calls`, queried by `b7/0002` and `b7/0003`, created by no lesson. It joins
`participants` and `deletion_queue`. All three get closed when B2 is rewritten
for E2EE — they are schema design work, not typo fixes.

#### Corrections to this document

- §2 said "the course is finished". It is written, not finished, and the scope
  has since grown by ~50 lessons. Written ≠ studied ≠ verified.
- §3 listed Redis as optional for v1. It is required (decision 6).
- §9's per-module quiz table restated counts the audit computes. Superseded by
  `PROGRESS.md` — see the precedence rule in `CLAUDE.md`.

### Session of 2026-08-16 — the Module 01 capstone, and the repo's first code

Phase 1.2. The Token repo had been scaffolded on 2026-08-15 and contained
nothing but READMEs and ADRs; it now contains a program.

**`token/practice/01-token-issuer/`** — `issuer.mjs`, `demo.mjs`, `test.mjs`,
`README.md`. Generate, store, apply rules, revoke, in memory, no dependencies.
`node test.mjs` runs 36 deterministic checks. `.mjs` throughout so `import`
works with no `package.json`, which keeps the whole configuration of the
project at zero.

**`modules/01-javascript-fundamentals/0013-capstone-token-issuer.html`** —
three staged exercises rather than one. A single hundred-line exercise on
lesson 13 is where a beginner stops; `generateCode`, then the store, then the
rules, each with its own self-check, is where they finish.

#### Why the generator uses a CSPRNG

The easy version of this lesson uses `Math.random()` and leaves the real thing
to Track B. That would have been wrong in a way the course could not undo:
codes already issued under a biased or predictable generator cannot be fixed
retroactively. So the capstone teaches `crypto.getRandomValues` with rejection
sampling, and spends a section deriving 256 / 31 = 8 remainder 8 rather than
asserting it.

The proof is in `test.mjs`, and it is exact rather than statistical: feed the
generator the bytes 0–255 in order and count the letters. Correct code uses
every letter equally often. Deleting the `if (byte >= 248) continue;` line
makes the counts run 375 to 422 — the 12.5%, measured. Detecting the same
thing against real randomness would have needed tens of thousands of samples
and still been flaky.

That test only exists because **`generateCode` takes its byte source as an
argument**, and the same move is made again with `now` on every issuer method.
Both are stated in the lesson as the reason the tests can be exact, not as a
style preference.

#### The two mistakes it is built around

Both produce output that looks correct, which is the whole argument for the
`--wrong` cases:

- **Modulo bias.** Every code looks perfect. Eight of the thirty-one
  characters are 12.5% more likely than the rest, permanently.
- **Chatty denial messages.** Every rule enforced correctly, and the page is
  friendlier to use. It is also a code-guessing oracle — different wording per
  reason hands out one bit per guess, which is exactly what a search needs.

22 mistakes and 11 alternative correct styles are checked, each mistake
against the specific check it should trip.

#### Tooling

- **Staged exercises.** `verify-lesson.mjs` paired every `createSolution` with
  the one playground `pg-exercise`, so a multi-exercise page was unverifiable.
  `exercise-<stage>` now looks for `pg-exercise-<stage>` and falls back to the
  old name; `--wrong` files may export `stages`. Every earlier lesson
  re-verified unchanged.
- **The demo-stripping filter was matching indented lines.** `const issuer =
  createIssuer(gen)` inside a solution's function body would have been deleted
  before the self-check ran, and the student blamed for the failure. Anchored
  to column 0.
- **`Verified` in the audit had read 0 since the column existed** — nothing
  ever wrote `scripts/verification-log.json`. It is now written by a passing
  verifier run and cleared by a failing one, and all 13 Module 01 lessons were
  re-run to fill it. A number nobody maintains is worse than no number.

#### New gotcha

A backtick inside a `createSolution` **exercise** or **solution** string ends
the template literal and kills the entire `<script>` block. Hints are ordinary
quoted strings and are safe. This is the `</script>` trap's sibling and it is
now in CLAUDE.md beside it.

### Session of 2026-08-16 — Firebase out of Module 02, and Phase 0.4 finally done

Prompted by building a phase table and checking each item against the files
instead of the record. **Phase 0 was recorded as complete; item 0.4 was not
done.** `a7/0004-incoming-calls` still imported `@react-native-firebase/
messaging`. That is the same failure mode as "Modules 1 and 2 complete" — a
claim nobody re-checked — and it is the argument for the audit and the
verification log both being generated rather than asserted.

#### 0.4 — and the distinction that caused it

Replaced with `expo-notifications` + `expo-task-manager`, and a callout added
that states the thing the course had never said plainly:

> **FCM is the transport. Firebase is the platform.**

Only Apple and Google can wake a backgrounded app, so FCM/APNs is the one
third party Token accepts — but `expo-notifications` already speaks to both.
Pulling in the `@react-native-firebase` native SDK to receive a push buys
nothing and costs a native dependency, a `google-services.json` in the repo,
and an analytics client nobody asked for. The server sends a data-only
high-priority message; Google routes bytes and learns a device got something,
never who is calling whom.

#### Module 02 — 15 files, ~81 mentions, now zero

Not one job but four: prose data-source references, forward references to
**Module 03 (superseded)**, real Firebase code, and quiz questions naming it.

The one that needed thought was `0006-useeffect`, whose cleanup section taught
`firebase.firestore()…onSnapshot()` — the exact pattern Token replaces. It now
teaches a WebSocket subscription and makes the general rule explicit: *a
subscribe call returns the function that undoes it*, which is why one cleanup
pattern covers timers, event listeners and sockets alike.

`README.html` pointed "next" at `03-firebase-backend`, walking the student
straight into the superseded module. It now points at X1, which is what the
revised sequence in `TOKEN-TRACK.md` actually says comes next.

**Negative references were kept deliberately.** `a6`, `b5`, `b6` and the new
`a7/0004` callout all name Firebase to say what Token does not use and why —
`b6/0001` has a quiz question whose whole point is that answer. Those are the
constraint being taught. A future grep-and-replace should leave them alone.

Proof nothing broke: per-lesson question counts are unchanged (25 each, 30 in
`0002`), so no `<script>` block was damaged, and the audit reports the same 3
pre-existing schema errors and 52 warnings as before — no new link errors,
which is what confirms the new nav target resolves.

#### And then Module 03 was deleted

Raised as a separate decision; the student took it the same day. `modules/
03-firebase-backend/` is gone — 5 lessons and a README, 3,071 lines: project
setup, authentication, two Firestore lessons and Storage.

The reasoning on both sides, since deletions are the one thing that cannot be
re-derived from the files afterwards: it was the only written material on
auth, real-time sync and file upload, and Track B has not reached any of the
three. Against that, every line of it teaches a stack that is out of scope —
so the material would have to be rewritten rather than adapted, and leaving it
in place meant a student who wandered in would be studying the wrong product.
Git keeps it either way.

Order of operations mattered: the two inbound links from
`modules/04-whatsapp-features/` were turned into disabled spans **before**
`git rm`, so the deletion added **no new audit warnings** — still 52, with the
same 3 pre-existing schema errors. Legacy lessons 45 → 40; track lessons
unchanged at 96, because 03 was never counted as track. Nothing else referenced
it: not `index.html`, not `search-index.json`.

Recover with `git show fbf79c0~1:"git-learn/JS Learn/modules/03-firebase-backend/README.html"`
or check the whole tree out of that commit.

### Session of 2026-08-16 — Phase 1.3, and a test suite that hid its own failure

One "explain it in your own words" prompt in each of Module 01's 13 lessons,
between the exercise and the quiz. New component `assets/explain.js`, backed by
`scripts/test-explain.mjs`.

#### The one design decision

The item as written in `COURSE-REVIEW.md` is "add a one-sentence prompt". A
prompt in a callout is free to build and free to ignore, so this one **saves
the answer** and restores it on the next visit.

That is not a flourish. Every other component in this course tests
recognition — a quiz offers four options, a self-check runs code the student
already wrote. Writing the idea out in a sentence is the only thing here that
tests production, the sentence you cannot finish is what names the section to
re-read, and the saved text is the only record anywhere of what was understood
rather than clicked.

Storage deliberately copies `progress.js`: one key holding one object, keyed by
lesson file *and* container, so the same id in two lessons cannot collide and a
future "you have written 7 of 13" needs no migration.

#### The test suite hid its own worst failure

Standard practice here is to prove a new suite has teeth by breaking the thing
it guards. Breaking `keyFor` did make it fail — but an assertion read `.text`
off an entry that was now `undefined`, so the run **crashed at test 11** and
every test after it, including the cross-lesson separation check, never
reported. The check protecting the worst failure mode was the one silenced by
the failure.

Lookups now go through `entryOf`/`textOf` helpers returning `null`. Re-proved
after the fix: dropping the lesson from the key fails 6 checks cleanly, and
removing the `trim()` fails 3.

This is the same defect CLAUDE.md already names for lesson self-checks — "a
mistake that trips *every* check means the self-check has poor diagnostics" —
appearing in a test suite instead. Worth remembering that the rule applies to
the tooling, not just the lessons.

#### Prompts

They ask **why**, not **what**, and each names the specific thing its lesson
exists for: `maxUses: 0` truthiness in `0004`, `textContent` versus
`innerHTML` in `0007`, where 248 comes from in the capstone. A prompt that
could be answered from the lesson title is decoration.

Inserted by a script written to a file rather than piped through a shell — the
prompts carry apostrophes and inline `<code>`, which is precisely what gets
mangled otherwise. It refuses to run twice, and aborts rather than guessing if
a lesson does not have exactly one quiz heading and one `progress.js` tag.

All 13 lessons re-verified afterwards; the audit is unchanged.

**Module 02 was left out on purpose.** Its prompts belong with the 1.5
retrofit, written against the lesson as it will be rather than the pre-pivot
version — otherwise they get written twice.

### Session of 2026-08-16 — Phase 2 opens, and the server was using the wrong alphabet

Phase 2 is "deepen the ~20 spine lessons". The assessment that precedes it
found something worth more than the deepening.

#### The defect

`b7/0001` — the lesson that builds the server-side code generator — taught:

```
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
```

The comment is false. The literal contains **L** and is 32 characters. The same
literal was in `a2/0001` and `b3/0001`. Module 01, `a5/0001` and `a5/0002` all
use the canonical 31 — so **the server generated codes the client rejects**.

This is the `MERC-8GH2-LP4X` failure one level up. That was one bad example
code; this was a bad *generator*, producing an unlimited supply of them.

The arithmetic was wrong with it: the lesson claimed 32<sup>12</sup> ≈ 1.1
trillion. 32<sup>12</sup> is 1.15 × 10<sup>18</sup>; 1.1 trillion is
32<sup>8</sup>. The correct figure for the real alphabet is 31<sup>12</sup> =
787,662,783,788,549,761. Four quiz keys were derived from the wrong number.

**The audit now checks alphabets, not just codes**, as an error, with an
`audit-allow-alphabet` opt-out for deliberate counter-examples. The check that
existed could only catch a wrong code — which is why this survived: no example
code in the lesson was wrong, because the lesson never printed one.

#### Why 32 was tempting

Worth recording, because it is now the "what was rejected" paragraph in the
lesson rather than a silent bug: 256 divides evenly by 32, so `byte % 32` needs
no rejection sampling at all. The only way to get to 32 characters is to put an
ambiguous one back. Four lines of rejection loop against a permanent human-error
cost is not a close call — but it explains how someone got there.

#### What was deepened

`b7/0001`, 709 → 2,190 words. The three sections are load-bearing, and the
sharpest is in **When this breaks**: the lesson's own body used

```
await pool.query('SELECT * FROM tokens WHERE code = $1 FOR UPDATE', [code]);
```

A row lock lives as long as its transaction. `pool.query` runs one statement in
an implicit transaction that commits immediately, so the lock is released before
the next line reads `max_uses` — and the next query comes from a different
pooled connection anyway. The lesson shipped that while its own exercise
solution did `connect()` / `BEGIN` / `COMMIT` correctly. Both are now in the
lesson, one as the trap and one as the model.

The other correction of substance: `createUniqueCode()` does SELECT-then-INSERT,
which is a TOCTOU race. The guarantee is the `UNIQUE` index; the correct shape
is insert-and-catch `23505`, which is also one round trip instead of two.

#### The open decision, put to the student and taken — ADR-0007

Whether `tokens.code` should hold the code at all. Raised as a fork rather than
decided in a lesson edit; the student chose **hash for lookup + encrypted copy
for display**.

`tokens` now stores `code_hash` (SHA-256 of the normalised code plus a
server-side pepper, indexed) and `code_enc` (AES-256-GCM). The bare code exists
only in memory on its way to the creation response, and in the reveal endpoint's
output.

Deliberately **not** bcrypt or argon2 — they salt randomly, which makes finding
a row by its code impossible without scanning the table. The pepper does the
salt's job, and slow hashing buys nothing against a code drawn from
31<sup>12</sup>.

**Hash-only lost on product grounds, not security ones.** It is the simpler and
slightly stronger option, and it makes re-showing a code or its QR impossible
forever — a limitation the user never asked for. It stays correct for anything
nobody needs to see twice; refresh tokens should use it.

The lesson's code was rewritten to match rather than left describing one design
and demonstrating another. That is the specific drift this project keeps
finding, so it was not left for later.

**The cost is operational and it is in the ADR:** the pepper and key are
critical state. Lose them and every token in the system is dead. They belong in
the disaster-recovery plan, backed up somewhere the database backups are not.
Rotating the pepper rewrites every row — possible only because C keeps the
plaintext recoverable; under hash-only it could not be done at all.

**Follow-on, recorded so it is not forgotten:** B2 must be written against these
columns (it is already scheduled for rewrite), `b7/0002` and `b7/0003` look
tokens up by code and need `code_hash`, and B9 must carry the two secrets as
required environment variables.

#### Tooling: `--unverifiable "<reason>"`

Track B solutions need Postgres. The verifier could previously only fail or lie.
It now takes a mandatory reason, records `status: "unverifiable"` in the log,
and still runs everything else — parse, playgrounds, executable predict-output.
The audit prints `n/a` rather than counting the lesson verified.

#### Scope note for whoever continues

Four of the twenty must **not** be deepened yet: `b2/0001`, `b2/0003`,
`b5/0001`, `b5/0002` are marked REWRITE in the revised sequence (E2EE for B2,
multi-node Redis for B5), and C5 has not been written. Deepening them is work
that gets thrown away. Fifteen of the remaining sixteen are still to do;
`SESSION.md` carries the suggested order, thinnest and most load-bearing first.

### Watch out when editing this file from a shell

Backticks in a `python -c` string get evaluated by bash *before* Python sees
them. Rewriting §8 that way spliced ~2KB of `git help` output into the document.
Write the replacement text to a file with an editor tool, then splice it with a
script that reads that file — never inline prose containing backticks into a
shell argument.
