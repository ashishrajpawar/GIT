# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated, and the narrative of
**why** anything was done lives in `HANDOFF.md`.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

**Nothing.** Working tree clean as of 2026-08-17, last commit `59089b0`.

## Next action

**Ask the student where they actually are.** Last stated position: *partway
through Module 01*, somewhere in `0006`–`0012`, given by them on 2026-08-17.
Never infer this from the files — that inference is what produced the "Modules 1
and 2 complete" claim that mispitched the course for months.

Everything ahead of them is now retrofitted and verified, so the honest answer
is usually that the course does not need more written material. What remains, in
the order it becomes due:

| Work | Gate |
|---|---|
| **Rename `0013`/`0014`** so the filenames stop saying `chat` | none — do it any time |
| **Phase 3** — the ten C-modules | just-in-time; the student is nowhere near |
| **Phase 4** — the operating track | after launch |
| The three orphan tables | blocked behind the B2 rewrite, itself behind C5/E2EE |

Nothing else is queued. M1 and M2 are both done.

### The filename rename, spelled out

`0013-chat-list-screen.html` and `0014-message-thread-screen.html` now carry
titles, breadcrumbs and content that all say *Token List Screen* and *Message
Thread Screen*; only the filenames disagree. Renaming touches
`search-index.json`, `modules/02-react-native/README.html`, and the prev/next
nav in `0012`, `0013` and `0014`. Small and self-contained — and the audit's
broken-link check catches a missed reference, so it is safe to attempt.

## Blocked on

Nothing.

---

## Phase status

Per-item status only. The plan itself is in `TOKEN-TRACK.md`; the counts are in
`PROGRESS.md`; why any of it went the way it did is in `HANDOFF.md`.

| Phase | Status |
|---|---|
| 0 — repair the map | done |
| 1 — unblock where the student is | **done**, all five items |
| 2 — deepen the spine | done (16 of 16 deepenable; 4 deliberately skipped as rewrites) |
| 3 — the ten C-modules | not started, deliberately |
| 4 — the operating track | not started, deliberately |
| M1 — verify what was never executed | done |
| M2 — the invalid example codes | done |

### Phase 1 items

| # | Work | Status |
|---|---|---|
| 1.1 | Retrofit `01/0005`–`01/0012` | done |
| 1.2 | Module 01 capstone | done — Token repo `221e6b0` |
| 1.3 | One "explain it in your own words" prompt per lesson | done, Modules 01 and 02 |
| 1.4 | Spaced review from the previous two lessons | done — built into each retrofit |
| 1.5 | The same retrofit for Module 02 | **done** — all 14, 2026-08-17 |

### Phase 1.5 — the exercise in each Module 02 lesson

Every one is a plain function the component calls, so `verify-lesson.mjs` can
run it. Each has a `--wrong` case file beside it in `scripts/cases/`.

| Lesson | Exercise |
|---|---|
| `0001` Expo & EAS | `resolveProfile` — `eas.json` `extends` chains, cycles, unknown names |
| `0002` core components | `toRowModel` — the badge that must be `null`, never `0` |
| `0003` styling & flexbox | `layoutRow` — flex is a share of the leftover, divided by the sum |
| `0004` textinput & keyboard | `normaliseCode` — the 31-character alphabet, not `[A-Z0-9]` |
| `0005` useState | `applyTokenAction` — revoked is permanent; identity on a no-op |
| `0006` useEffect | `subscribeToToken` — the cleanup a subscribe hands back |
| `0007` FlatList | `mergePage` — overlapping pages, duplicate keys |
| `0008` navigation | `applyNavAction` — navigate vs push vs replace |
| `0009` passing data | `toRouteParams` — build by naming, never spread-and-delete |
| `0010` forms | `validateRegistration` — never transform a password, only measure it |
| `0011` images | `prepareAttachment` — EXIF carries GPS |
| `0012` loading states | `viewState` — four checks, and the order is the whole answer |
| `0013` token list screen | `orderTokens` — `sort()` reorders React state in place |
| `0014` message thread | `buildThreadItems` — calendar days are not durations |

---

## Notes for the next session

Durable gotchas only. Anything narrative is in `HANDOFF.md`.

### Writing a lesson

- **`--wrong` mistakes take `impl`, not `code`.** Getting it wrong yields a row
  of identical `ReferenceError`s that look like a verifier bug and are not.
- **Choose fixture values that differ from what a wrong answer produces.** Five
  self-checks in Phase 1.5 passed a wrong answer by coincidence — three children
  all 100dp wide, a screen at stack index 0, a label unchanged by trimming, a
  password long enough to survive it. Every one was caught by a wrong-case, never
  by the self-check passing.
- **Where a mistake can throw rather than return, wrap that check on its own.**
  An uncaught throw aborts every check below it and hides what it never reached.
- **Look for the plain function before reaching for `--unverifiable`.** The
  prediction that a lesson has no runnable logic was wrong four times out of four
  in Phase 1.5 — flexbox is arithmetic, the keyboard lesson is string
  normalisation, the image picker is a payload filter, and Expo setup is
  `eas.json` inheritance.
- **Never bulk-edit lesson content through a shell**, not only when writing it.
  A blanket replacement injected real newlines into four quiz strings in `0011`
  and broke the whole block.

### Tooling limits worth knowing

- `verify-lesson.mjs` shims `setTimeout` and `clearTimeout` onto a drainable
  queue but **does not model Node's phase ordering** — `process.nextTick` and
  `setImmediate` questions are skipped, because the sandbox gets them wrong.
- `setInterval` is still not shimmed. It has not bitten anything yet.
- The `dom-sandbox` selector engine has no `>`, `+`, `~` or pseudo-classes. If a
  lesson needs one, add it to the sandbox *and* to `scripts/test-dom-sandbox.mjs`
  in the same commit.
- A file containing **`audit-allow-token-fixtures`** is skipped by the
  example-code check. Only `02/0004` has it, because its subject *is* invalid
  codes. The alphabet check is an error and still applies to opted-out files.

### Standing facts

- **Student progress is never inferred from the files.** It comes from the
  student or from `progress.js` localStorage.
- **When the student reaches `01/0013`** they need Node 19+ (`node -v`) —
  `crypto.getRandomValues` as a global is the only environment requirement in
  Module 01.
- The three orphan tables (`participants`, `deletion_queue`, `calls`) are schema
  gaps for the B2 rewrite, not quick fixes. B2 is itself waiting on C5 (E2EE).
- Module 02 carries **zero WhatsApp-clone framing**. If a future edit
  reintroduces "chat", "Priya" or an avatar, it is a regression, not a leftover.
