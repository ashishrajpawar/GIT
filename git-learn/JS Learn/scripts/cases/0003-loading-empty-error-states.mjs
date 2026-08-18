/* Wrong-answer cases for a3/0003 — retryPlan.
 *
 *   node scripts/verify-lesson.mjs modules/a3-api-consumption/0003-loading-empty-error-states.html \
 *        --wrong scripts/cases/0003-loading-empty-error-states.mjs
 *
 * Staged: `exercise-1` is the React Native screen set and carries its own
 * per-exercise `unverifiable` reason, so only `retry` has cases.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  retry: {
    alternatives: {
      "one expression with nested ternaries": `function retryPlan(error, attempt, maxRetries = 3) {
  return attempt >= maxRetries || !error.retryable
    ? null
    : { delayMs: error.retryAfterSeconds != null
        ? error.retryAfterSeconds * 1000
        : Math.pow(2, attempt) * 1000 };
}`,

      "computes the delay first, then decides": `function retryPlan(error, attempt, maxRetries = 3) {
  const delayMs = error.retryAfterSeconds != null
    ? error.retryAfterSeconds * 1000
    : 1000 * (2 ** attempt);
  if (attempt >= maxRetries) return null;
  if (error.retryable !== true) return null;
  return { delayMs };
}`,

      "bit-shift instead of Math.pow, undefined check spelled out": `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (!error.retryable) return null;
  if (error.retryAfterSeconds !== undefined && error.retryAfterSeconds !== null) {
    return { delayMs: error.retryAfterSeconds * 1000 };
  }
  return { delayMs: (1 << attempt) * 1000 };
}`,
    },

    mistakes: {
      "decides from the status code instead of the retryable flag": {
        expect: "a 429 is retried even though it is a 4xx",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (error.status < 500) return null;
  if (error.retryAfterSeconds != null) return { delayMs: error.retryAfterSeconds * 1000 };
  return { delayMs: Math.pow(2, attempt) * 1000 };
}`,
      },

      "ignores Retry-After and always backs off exponentially": {
        expect: "Retry-After is honoured exactly",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (!error.retryable) return null;
  return { delayMs: Math.pow(2, attempt) * 1000 };
}`,
      },

      "tests Retry-After for truthiness, so 0 falls through to backoff": {
        expect: "a Retry-After of 0 means 0, not 'missing'",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (!error.retryable) return null;
  if (error.retryAfterSeconds) return { delayMs: error.retryAfterSeconds * 1000 };
  return { delayMs: Math.pow(2, attempt) * 1000 };
}`,
      },

      "retries everything, including a 404": {
        expect: "a 404 is not retried",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (error.retryAfterSeconds != null) return { delayMs: error.retryAfterSeconds * 1000 };
  return { delayMs: Math.pow(2, attempt) * 1000 };
}`,
      },

      "off by one — allows one attempt past maxRetries": {
        expect: "giving up once attempt reaches maxRetries",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt > maxRetries) return null;
  if (!error.retryable) return null;
  if (error.retryAfterSeconds != null) return { delayMs: error.retryAfterSeconds * 1000 };
  return { delayMs: Math.pow(2, attempt) * 1000 };
}`,
      },

      "starts the backoff at 2s because it doubles before waiting": {
        expect: "backoff is 1s, 2s, 4s from attempt 0",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (!error.retryable) return null;
  if (error.retryAfterSeconds != null) return { delayMs: error.retryAfterSeconds * 1000 };
  return { delayMs: Math.pow(2, attempt + 1) * 1000 };
}`,
      },

      "treats Retry-After as milliseconds rather than seconds": {
        expect: "Retry-After is honoured exactly",
        impl: `function retryPlan(error, attempt, maxRetries = 3) {
  if (attempt >= maxRetries) return null;
  if (!error.retryable) return null;
  if (error.retryAfterSeconds != null) return { delayMs: error.retryAfterSeconds };
  return { delayMs: Math.pow(2, attempt) * 1000 };
}`,
      },
    },
  },
};
