/* Wrong-answer cases for a4/0001 — decideStartup.
 *
 *   node scripts/verify-lesson.mjs modules/a4-auth-client/0001-jwt-storage.html \
 *        --wrong scripts/cases/0001-jwt-storage.mjs
 *
 * Staged: `exercise-1` is React Native with expo-secure-store and carries its
 * own per-exercise `unverifiable` reason, so only `startup` has cases.
 *
 * The mistakes are ordered by how likely they are to ship. The first two are
 * the bug the lesson's own snippet had until 2026-08-18 — `catch` sending the
 * user to Login — and they are the reason this exercise exists.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  startup: {
    alternatives: {
      "a switch on the outcome shape": `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  const o = state.outcome || {};
  switch (true) {
    case o.ok === true:                        return { screen: 'main', clearToken: false };
    case o.status === 401 || o.status === 403: return { screen: 'login', clearToken: true };
    default:                                   return { screen: 'offline', clearToken: false };
  }
}`,

      "names the rejected statuses in a Set": `const REJECTED = new Set([401, 403]);
function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  if (state.outcome && state.outcome.ok) return { screen: 'main', clearToken: false };
  if (state.outcome && REJECTED.has(state.outcome.status)) {
    return { screen: 'login', clearToken: true };
  }
  return { screen: 'offline', clearToken: false };
}`,

      "builds the answer then returns once": `function decideStartup(state) {
  let screen = 'offline';
  let clearToken = false;
  if (!state.refreshToken) {
    screen = 'login';
  } else if (state.outcome && state.outcome.ok) {
    screen = 'main';
  } else if (state.outcome && [401, 403].indexOf(state.outcome.status) !== -1) {
    screen = 'login';
    clearToken = true;
  }
  return { screen, clearToken };
}`,
    },

    mistakes: {
      "sends a network error to login, the bug the lesson snippet had": {
        expect: "a network error does NOT go to login",
        impl: `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  if (state.outcome && state.outcome.ok) return { screen: 'main', clearToken: false };
  return { screen: 'login', clearToken: true };
}`,
      },

      "routes to offline but clears the token anyway": {
        expect: "a network error keeps the token",
        impl: `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  if (state.outcome && state.outcome.ok) return { screen: 'main', clearToken: false };
  if (state.outcome && (state.outcome.status === 401 || state.outcome.status === 403)) {
    return { screen: 'login', clearToken: true };
  }
  return { screen: 'offline', clearToken: true };
}`,
      },

      "treats any !ok response as a rejection, so a 503 logs out": {
        expect: "a 503 does not go to login",
        impl: `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  if (state.outcome && state.outcome.ok) return { screen: 'main', clearToken: false };
  if (state.outcome && state.outcome.networkError) return { screen: 'offline', clearToken: false };
  return { screen: 'login', clearToken: true };
}`,
      },

      "checks 401 but forgets 403": {
        expect: "a 403 is treated the same as a 401",
        impl: `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  if (state.outcome && state.outcome.ok) return { screen: 'main', clearToken: false };
  if (state.outcome && state.outcome.status === 401) return { screen: 'login', clearToken: true };
  return { screen: 'offline', clearToken: false };
}`,
      },

      "clears the token when there was never one stored": {
        expect: "nothing to clear when nothing was stored",
        impl: `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: true };
  if (state.outcome && state.outcome.ok) return { screen: 'main', clearToken: false };
  if (state.outcome && (state.outcome.status === 401 || state.outcome.status === 403)) {
    return { screen: 'login', clearToken: true };
  }
  return { screen: 'offline', clearToken: false };
}`,
      },

      "goes offline on success because ok is checked last": {
        expect: "a successful refresh goes to main",
        impl: `function decideStartup(state) {
  if (!state.refreshToken) return { screen: 'login', clearToken: false };
  if (state.outcome && (state.outcome.status === 401 || state.outcome.status === 403)) {
    return { screen: 'login', clearToken: true };
  }
  if (state.outcome && state.outcome.networkError) return { screen: 'offline', clearToken: false };
  return { screen: 'offline', clearToken: false };
}`,
      },
    },
  },
};
