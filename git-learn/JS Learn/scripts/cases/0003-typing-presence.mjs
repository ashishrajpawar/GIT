/* Wrong-answer cases for a6/0003 — presenceFor.
 *
 *   node scripts/verify-lesson.mjs modules/a6-chat-realtime/0003-typing-presence.html \
 *        --wrong scripts/cases/0003-typing-presence.mjs
 *
 * Staged: `exercise-1` is the React Native typing/presence components and
 * carries its own per-exercise `unverifiable` reason, so only `presence` has
 * cases.
 *
 * The lesson's usePresence hook only ever changed state when a presence:update
 * arrived. Nothing expired, and nothing consulted our own socket — so once the
 * client disconnected, the last thing it heard stayed on screen indefinitely.
 * The green dot is at its most confident exactly when the app knows least.
 *
 * The function turns two booleans into three answers, and the third is the
 * whole point:
 *
 *   'offline' is a claim about THEM — we are connected, we would have heard,
 *   their TTL key lapsed. Presence in ADR-0003 is a Redis key with a TTL and
 *   there is no "went offline" event at all, so silence past the TTL is the
 *   signal rather than the absence of one.
 *
 *   'unknown' is a fact about US. It has to outrank everything, because every
 *   other branch reasons from information that could not have reached us.
 *
 * Fixtures avoid coincidence: freshness is 20s (clearly inside) or 90s
 * (clearly outside), never near the boundary except in the two cases that
 * test the boundary itself — 60000 exactly and 59999.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  presence: {
    alternatives: [
      // Positional property access and a single expression.
      `function presenceFor(state, now) {
        if (state.socketConnected !== true) return "unknown";
        const fresh = now - state.updatedAt < 60000;
        return fresh && state.status === "online" ? "online" : "offline";
      }`,

      // Computes an age first, then a small switch.
      `function presenceFor({ socketConnected, status, updatedAt }, now) {
        if (!socketConnected) return "unknown";
        const ageMs = now - updatedAt;
        if (ageMs >= 60000) return "offline";
        switch (status) {
          case "online": return "online";
          default: return "offline";
        }
      }`,

      // Guard-free style using early returns in a different order — still
      // correct, because staleness and an offline status agree.
      `function presenceFor(s, now) {
        if (!s.socketConnected) return "unknown";
        if (s.status !== "online") return "offline";
        if (now - s.updatedAt >= 60000) return "offline";
        return "online";
      }`,
    ],

    mistakes: [
      {
        // The lesson's actual behaviour: never consults our own socket, so a
        // disconnected client shows a green dot for as long as it is down.
        expect: "our socket down -> 'unknown', even with a fresh online record",
        impl: `function presenceFor({ status, updatedAt }, now) {
          if (now - updatedAt >= 60000) return "offline";
          return status === "online" ? "online" : "offline";
        }`,
      },
      {
        // Collapses 'unknown' into 'offline'. Looks like a safe default and
        // is not: it asserts something about them that we cannot know.
        expect: "our socket down -> 'unknown', not 'offline'",
        impl: `function presenceFor({ socketConnected, status, updatedAt }, now) {
          if (!socketConnected) return "offline";
          if (now - updatedAt >= 60000) return "offline";
          return status === "online" ? "online" : "offline";
        }`,
      },
      {
        // Precedence inverted: staleness is tested before the connection, so
        // a disconnected client with a stale record answers 'offline' —
        // a claim about them derived from silence that we caused.
        expect: "disconnected AND stale is still 'unknown'",
        impl: `function presenceFor({ socketConnected, status, updatedAt }, now) {
          if (now - updatedAt >= 60000) return "offline";
          if (!socketConnected) return "unknown";
          return status === "online" ? "online" : "offline";
        }`,
      },
      {
        // No expiry at all. Passes every connected-and-fresh case, and keeps
        // a months-old 'online' record green forever.
        expect: "a stale 'online' record expires to offline",
        impl: `function presenceFor({ socketConnected, status }) {
          if (!socketConnected) return "unknown";
          return status === "online" ? "online" : "offline";
        }`,
      },
      {
        // Strictly greater-than, so a record exactly at the TTL is still
        // trusted. One millisecond of wrongness, and the kind that survives
        // review because the fixture usually is not on the boundary.
        expect: "exactly at the 60s boundary counts as stale",
        impl: `function presenceFor({ socketConnected, status, updatedAt }, now) {
          if (!socketConnected) return "unknown";
          if (now - updatedAt > 60000) return "offline";
          return status === "online" ? "online" : "offline";
        }`,
      },
      {
        // Over-corrects the boundary into seconds and rounds the window
        // down, so the last full second of a live record reads as stale.
        expect: "one millisecond inside the window is still online",
        impl: `function presenceFor({ socketConnected, status, updatedAt }, now) {
          if (!socketConnected) return "unknown";
          if (Math.floor((now - updatedAt) / 1000) >= 59) return "offline";
          return status === "online" ? "online" : "offline";
        }`,
      },
      {
        // Trusts freshness alone and ignores what the record actually says,
        // so a recent 'offline' update reads as online.
        expect: "connected + told offline -> offline",
        impl: `function presenceFor({ socketConnected, updatedAt }, now) {
          if (!socketConnected) return "unknown";
          return now - updatedAt < 60000 ? "online" : "offline";
        }`,
      },
    ],
  },
};
