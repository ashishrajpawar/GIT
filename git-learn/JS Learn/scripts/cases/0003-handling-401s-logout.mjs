/* Wrong-answer cases for a4/0003 — planFor.
 *
 *   node scripts/verify-lesson.mjs modules/a4-auth-client/0003-handling-401s-logout.html \
 *        --wrong scripts/cases/0003-handling-401s-logout.mjs
 *
 * Staged: `exercise-1` is the TypeScript interceptor and carries its own
 * per-exercise `unverifiable` reason, so only `plan` has cases.
 *
 * Two of these are the failures the lesson is about: dropping the isRetry
 * guard gives an infinite refresh loop, and treating 403 as refreshable spends
 * a refresh on a permission error and then logs the user out over it.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  plan: {
    alternatives: {
      "one combined logout condition": `function planFor(response) {
  if (response.status !== 401) return 'pass';
  if (response.isRefreshEndpoint || response.isRetry) return 'logout';
  return 'refresh-then-retry';
}`,

      "early return for the happy path": `function planFor(response) {
  if (response.status === 401) {
    if (response.isRefreshEndpoint) return 'logout';
    if (response.isRetry) return 'logout';
    return 'refresh-then-retry';
  }
  return 'pass';
}`,

      "a ternary chain": `function planFor(response) {
  return response.status !== 401 ? 'pass'
       : response.isRefreshEndpoint ? 'logout'
       : response.isRetry ? 'logout'
       : 'refresh-then-retry';
}`,
    },

    mistakes: {
      "no isRetry guard — the infinite refresh loop": {
        expect: "a 401 on an already-retried request logs out",
        impl: `function planFor(response) {
  if (response.status !== 401) return 'pass';
  if (response.isRefreshEndpoint) return 'logout';
  return 'refresh-then-retry';
}`,
      },

      "refreshes on a 403 as well, spending a refresh on a permission error": {
        expect: "a 403 passes through rather than refreshing",
        impl: `function planFor(response) {
  if (response.status !== 401 && response.status !== 403) return 'pass';
  if (response.isRefreshEndpoint) return 'logout';
  if (response.isRetry) return 'logout';
  return 'refresh-then-retry';
}`,
      },

      "tries to refresh a rejected refresh": {
        expect: "a 401 from the refresh endpoint logs out",
        impl: `function planFor(response) {
  if (response.status !== 401) return 'pass';
  if (response.isRetry) return 'logout';
  return 'refresh-then-retry';
}`,
      },

      "logs out on the first 401 instead of refreshing at all": {
        expect: "a first 401 refreshes and retries",
        impl: `function planFor(response) {
  if (response.status !== 401) return 'pass';
  return 'logout';
}`,
      },

      "treats any error status as an auth problem": {
        expect: "a 500 passes through",
        impl: `function planFor(response) {
  if (response.status < 400) return 'pass';
  if (response.isRefreshEndpoint) return 'logout';
  if (response.isRetry) return 'logout';
  return 'refresh-then-retry';
}`,
      },

      "checks isRetry before the status, so a retried 403 logs out": {
        expect: "isRetry does not change what a non-401 means",
        impl: `function planFor(response) {
  if (response.isRetry) return 'logout';
  if (response.status !== 401) return 'pass';
  if (response.isRefreshEndpoint) return 'logout';
  return 'refresh-then-retry';
}`,
      },
    },
  },
};
