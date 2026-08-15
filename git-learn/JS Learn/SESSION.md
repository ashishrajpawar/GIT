# SESSION

Hand-written. The one file that records what is *in flight* — everything
measurable lives in `PROGRESS.md`, which is generated.

Written **before** starting a unit of work, updated when it lands. If a session
dies mid-edit, this already says what was being attempted; `git status` shows
how far it got.

---

## In progress

**Phase 0 — foundations.** See `COURSE-REVIEW.md` §6 for the full phase plan.

| Step | Status |
|---|---|
| 1. `scripts/audit.mjs` + generated `PROGRESS.md` | done — `8c06ac3` |
| 2. `SESSION.md` + resume protocol in `CLAUDE.md` | done |
| 3. `HANDOFF.md` session entry — the 7 decisions | done |
| 4. Token repo scaffold at `GIT/token/` | done — `3d12ca6` |
| 5. `ARCHITECTURE.md` + ADRs | done — `3db9fdc` |
| 6. `CLAUDE.md` architecture rewrite | done |
| 7. `TOKEN-TRACK.md` resequenced | done |
| 8. Playground async + loop guard | done |
| 9. Quiz answer-position bias | done |
| 10. Broken links + delete stale `lessons/` | pending |

## Next action

Fix 5 broken links and delete the stale lessons/ duplicate, then re-run the audit and close Phase 0 (step 10).

## Blocked on

Nothing.

## Notes for the next session

- The audit found a **fourth** orphan table beyond the manual review:
  `calls`, queried by `b7/0002` and `b7/0003`, created nowhere. Together with
  `participants` and `deletion_queue` these are schema gaps to close when B2 is
  rewritten for E2EE — not quick fixes.
- Student progress (which lessons Ashish has actually studied) is **never**
  inferred from files. It comes from him or from `progress.js` localStorage.
