/* Wrong-answer cases for b7/0003 — planTransition.
 *
 *   node scripts/verify-lesson.mjs modules/b7-token-engine/0003-revocation-pause.html \
 *        --wrong scripts/cases/0003-revocation-pause.mjs
 *
 * Staged: `exercise-1` is Express routes with Postgres transactions and Redis
 * fan-out, and carries its own per-exercise `unverifiable` reason, so only
 * `transition` has cases.
 *
 * The whole exercise turns on one distinction that a state machine written
 * from the transitions table alone will miss: **'unchanged' and 'refused' are
 * different answers.** Both leave the state exactly as it was. One is a
 * request that was already satisfied, the other is a request that can never
 * be satisfied, and they become a 204 and an error respectively.
 *
 * Collapsing them in either direction is a real bug with a real victim:
 *
 *   unchanged folded into refused — a user hammering the revoke button on a
 *   bad connection is told their revocation failed, when it succeeded. They
 *   will then try harder, or believe the token is still live.
 *
 *   refused folded into unchanged — resuming a revoked token reports success,
 *   and the caller believes a permanently dead token is active again.
 *
 * The other family is the terminal state. `revoked` has exactly one legal
 * incoming action (revoke, idempotently) and no outgoing ones, and the
 * tempting `if (status === 'revoked') return refused(...)` guard placed too
 * early breaks revoke's idempotency.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const HELPERS = `function changed(next) { return { outcome: "changed", status: next, reason: "ok" }; }
function unchanged(status, reason) { return { outcome: "unchanged", status: status, reason: reason }; }
function refused(status, reason) { return { outcome: "refused", status: status, reason: reason }; }`;

export const stages = {
  transition: {
    alternatives: [
      // A transition table plus an explicit idempotency map.
      `${HELPERS}
      const MOVES = {
        revoke: { active: "revoked", paused: "revoked" },
        pause: { active: "paused" },
        resume: { paused: "active" },
      };
      const SAME = {
        revoke: { revoked: "already_revoked" },
        pause: { paused: "already_paused" },
        resume: { active: "already_active" },
      };
      function planTransition(token, action) {
        const status = token.status;
        const next = MOVES[action][status];
        if (next) return changed(next);
        const same = SAME[action][status];
        if (same) return unchanged(status, same);
        return refused(status, "revoked_is_terminal");
      }`,

      // switch statement, revoke handled first.
      `${HELPERS}
      function planTransition(token, action) {
        const s = token.status;
        switch (action) {
          case "revoke":
            return s === "revoked" ? unchanged(s, "already_revoked") : changed("revoked");
          case "pause":
            if (s === "revoked") return refused(s, "revoked_is_terminal");
            return s === "paused" ? unchanged(s, "already_paused") : changed("paused");
          default:
            if (s === "revoked") return refused(s, "revoked_is_terminal");
            return s === "active" ? unchanged(s, "already_active") : changed("active");
        }
      }`,

      // Computes the target first, then classifies.
      `${HELPERS}
      function planTransition(token, action) {
        const s = token.status;
        const target = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
        if (s === target) {
          return unchanged(s, "already_" + target);
        }
        if (s === "revoked") return refused(s, "revoked_is_terminal");
        return changed(target);
      }`,
    ],

    mistakes: [
      {
        // The terminal guard placed before revoke, so revoking an already
        // revoked token is refused. The user is told their revocation
        // failed when it had already succeeded.
        expect: "revoking twice is UNCHANGED, not refused",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          if (s === "revoked") return refused(s, "revoked_is_terminal");
          if (action === "revoke") return changed("revoked");
          if (action === "pause") {
            return s === "paused" ? unchanged(s, "already_paused") : changed("paused");
          }
          return s === "active" ? unchanged(s, "already_active") : changed("active");
        }`,
      },
      {
        // The opposite collapse: everything that does not move is reported
        // as unchanged, so resuming a revoked token looks like success.
        expect: "resuming a revoked token is REFUSED",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          const target = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
          if (s === target) return unchanged(s, "already_" + target);
          if (s === "revoked") return unchanged(s, "already_revoked");
          return changed(target);
        }`,
      },
      {
        // No idempotency at all: repeating any action is refused. Passes
        // every first-time transition, which is all anyone tests by hand.
        expect: "pausing an already-paused token is unchanged",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          const target = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
          if (s === "revoked" && action !== "revoke") return refused(s, "revoked_is_terminal");
          if (s === target) return refused(s, "already_" + target);
          return changed(target);
        }`,
      },
      {
        // Treats paused as terminal too, so a paused token can never be
        // revoked -- pausing would trap a token permanently half-alive.
        expect: "a paused token can still be revoked",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          if (action === "revoke") {
            if (s === "revoked") return unchanged(s, "already_revoked");
            // Wrong: treats paused as a state you must resume out of before
            // you are allowed to revoke. Everything else here is correct.
            if (s === "paused") return refused(s, "revoked_is_terminal");
            return changed("revoked");
          }
          if (s === "revoked") return refused(s, "revoked_is_terminal");
          if (action === "pause") {
            return s === "paused" ? unchanged(s, "already_paused") : changed("paused");
          }
          return s === "active" ? unchanged(s, "already_active") : changed("active");
        }`,
      },
      {
        // Reports the TARGET status on a refusal, so a caller that writes
        // back result.status would resurrect a revoked token.
        expect: "a refused or unchanged plan never invents a status",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          const target = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
          if (action === "revoke") {
            return s === "revoked" ? unchanged(s, "already_revoked") : changed("revoked");
          }
          if (s === "revoked") return refused(target, "revoked_is_terminal");
          if (s === target) return unchanged(s, "already_" + target);
          return changed(target);
        }`,
      },
      {
        // resume from revoked treated as a legal move back to active. The
        // worst outcome available: a revoked token becomes live again.
        expect: "resuming a revoked token is REFUSED",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          if (action === "revoke") {
            return s === "revoked" ? unchanged(s, "already_revoked") : changed("revoked");
          }
          if (action === "pause") {
            if (s === "revoked") return refused(s, "revoked_is_terminal");
            return s === "paused" ? unchanged(s, "already_paused") : changed("paused");
          }
          return s === "active" ? unchanged(s, "already_active") : changed("active");
        }`,
      },
      {
        // Collapses the two no-move outcomes into one string, so the route
        // cannot tell a 204 from an error.
        expect: "'unchanged' and 'refused' are different answers",
        impl: `${HELPERS}
        function planTransition(token, action) {
          const s = token.status;
          const target = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
          if (s === target) return unchanged(s, "already_" + target);
          if (s === "revoked") return unchanged(s, "revoked_is_terminal");
          return changed(target);
        }`,
      },
    ],
  },
};
