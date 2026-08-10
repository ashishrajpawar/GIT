# Task — upgrade shared course tooling

Read `TOKEN-BRIEF.md` and `CLAUDE.md` first.

**Run this only after the two-track plan (`TOKEN-TRACK.md`) exists and I have
reviewed it.** The backend lesson format needs to be settled before these
components are built, or they will be shaped for mobile lessons only.

---

## Scope

Work in `assets/` only. Do not rewrite individual lesson files except where a
mechanical change is unavoidable — and list any such change before making it.

Everything here must work with all 71 existing lessons unchanged.

---

## 1. Extend `createQuiz()` with new question types

Keep the existing multiple-choice type working exactly as-is so no current
lesson breaks. Add:

- **predict-output** — show a code snippet, ask what it prints
- **spot-the-bug** — show code with one defect, ask where it is
- **fill-blank** — real code with one line or expression removed
- **which-breaks** — several variations, one of which fails, ask which and why
- **order-steps** — drag or click to put operations in the correct sequence

Each type needs an explanation shown after answering, not just right/wrong.

---

## 2. Runnable JS playground component

An embeddable editor lessons can drop in: edit JavaScript in the page, run it,
see the output. Essential for Module 1 — I should be able to break things and
see what happens rather than only reading about it.

- CodeMirror or a plain textarea, whichever is simpler to maintain
- Sandboxed execution, captured `console.log` output
- Pre-fillable with starter code from the lesson
- Reset button

---

## 3. Progress tracking

Stored in `localStorage`, and also publish to git repo

- Mark a lesson complete
- Per-module progress bar on each `README.html`
- Overall progress and a "resume where I left off" link on `index.html`
- A way to clear progress

---

## 4. Collapsible solution component

For the exercise-first format in §8 of the brief:

- "Try it yourself" block stating what to build
- Hidden solution revealed on click
- Optional hint level between the two

---

## 5. Copy buttons on code blocks

Every `<pre>` gets one. Small, unobtrusive, confirms on click.

---

## 6. Client-side search

Search across all lesson titles and content from `index.html`. Static index is
fine — no build step, keep it dependency-free.

---

## Explicitly not wanted

No badges, streaks, XP, points, mascots, animated transitions, or
gamification of any kind.

---

## After building

Update `CLAUDE.md` with the new lesson format so every future lesson uses:

> exercise → my attempt → revealed solution → quiz

and the new quiz question types.

---

## Process

Show me the plan before writing any code. Keep this to one session — I do not
want course tooling to become the project.