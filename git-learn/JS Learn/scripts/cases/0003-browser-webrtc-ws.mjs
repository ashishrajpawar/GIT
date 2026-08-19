/* Wrong-answer cases for a8/0003 — reconnectPlan.
 *
 *   node scripts/verify-lesson.mjs modules/a8-redemption-web/0003-browser-webrtc-ws.html \
 *        --wrong scripts/cases/0003-browser-webrtc-ws.mjs
 *
 * Staged: `exercise-1` is the browser WebSocket and RTCPeerConnection modules
 * and carries its own per-exercise `unverifiable` reason, so only `reconnect`
 * has cases.
 *
 * The first mistake is textbook exponential backoff with no jitter — the code
 * this lesson shipped, under a comment claiming it "prevents hammering the
 * server". It does not. Every client was dropped by the same restart, so every
 * client waits the same 1000ms and returns in the same millisecond, and then
 * does it again at 2000, and again at 4000. Backoff spaces out ONE client's
 * attempts; only jitter spaces out the herd.
 *
 * The second is retrying a rejected JWT. A holder session lasts 24 hours, so
 * this is not hypothetical — it is what every abandoned tab does overnight,
 * and it is a hot loop pointed at your own API with a credential that can
 * never be accepted.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  reconnect: {
    alternatives: {
      "a table of terminal close codes": `const STOP = { 1000: 'closed', 4401: 'auth' };
const CAP = 30000;

function reconnectPlan(attempt, closeCode, rand) {
  const stop = STOP[closeCode];
  if (stop) return { retry: false, delayMs: 0, reason: stop };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };

  const window = Math.min(1000 * 2 ** (attempt - 1), CAP);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,

      "computes the window by doubling in a loop rather than with a power": `function windowFor(attempt) {
  let ms = 1000;
  for (let i = 1; i < attempt; i++) {
    ms *= 2;
    if (ms >= 30000) return 30000;
  }
  return Math.min(ms, 30000);
}

function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  return { retry: true, delayMs: Math.floor(rand * windowFor(attempt)), reason: 'backoff' };
}`,

      "decides the reason first, then derives everything from it": `function reasonFor(attempt, closeCode) {
  if (closeCode === 1000) return 'closed';
  if (closeCode === 4401) return 'auth';
  if (attempt > 10) return 'exhausted';
  return 'backoff';
}

function reconnectPlan(attempt, closeCode, rand) {
  const reason = reasonFor(attempt, closeCode);
  if (reason !== 'backoff') return { retry: false, delayMs: 0, reason };

  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: Math.floor(window * rand), reason };
}`,

      "uses a bit shift for the doubling, guarded against the shift overflowing": `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };

  // attempt is at most 10 here, so 1 << 9 is safe; the Math.min still caps it.
  const window = Math.min(1000 * (1 << (attempt - 1)), 30000);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
    },

    mistakes: {
      "backoff with no jitter — every client returns in the same millisecond": {
        expect: "different rand gives a different delay — this IS the jitter",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  // Textbook, and it does not do what its comment says. rand is ignored, so
  // 500 clients dropped together all come back together.
  return { retry: true, delayMs: Math.min(1000 * Math.pow(2, attempt - 1), 30000), reason: 'backoff' };
}`,
      },

      "reconnects after a rejected JWT, looping against its own API forever": {
        expect: "a rejected JWT does not reconnect",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
      },

      "reconnects after a normal closure, so leaving the page reopens the socket": {
        expect: "a normal closure does not reconnect",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
      },

      "uses 2^attempt, so the first wait is twice as long as intended": {
        expect: "attempt 1 draws from a 1000ms window",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  const window = Math.min(1000 * Math.pow(2, attempt), 30000);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
      },

      "never caps the window, so attempt 9 waits over three minutes": {
        expect: "the window is capped at 30000ms",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  const window = 1000 * Math.pow(2, attempt - 1);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
      },

      "caps after applying the jitter instead of before, flattening the spread": {
        expect: "the window is capped at 30000ms",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  // Capping last means high attempts all pile onto exactly 30000 -- the
  // lockstep the jitter was supposed to break.
  const delay = Math.min(Math.floor(rand * 1000 * Math.pow(2, attempt - 1)), 30000);
  return { retry: true, delayMs: delay, reason: 'backoff' };
}`,
      },

      "retries forever, so a dead server is polled until the tab is closed": {
        expect: "it gives up after ten attempts",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
      },

      "stops one attempt early by testing >= instead of >": {
        expect: "the tenth attempt still runs",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt >= 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: Math.floor(rand * window), reason: 'backoff' };
}`,
      },

      "leaves the delay as a float": {
        expect: "the delay is a whole number of milliseconds",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: rand * window, reason: 'backoff' };
}`,
      },

      "carries a delay on a plan that will never run": {
        expect: "a no-retry plan has no delay",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  const delayMs = Math.floor(rand * window);
  if (closeCode === 1000) return { retry: false, delayMs, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs, reason: 'exhausted' };
  return { retry: true, delayMs, reason: 'backoff' };
}`,
      },

      "halves the window instead of scaling it by rand": {
        expect: "attempt 1 draws from a 1000ms window",
        impl: `function reconnectPlan(attempt, closeCode, rand) {
  if (closeCode === 1000) return { retry: false, delayMs: 0, reason: 'closed' };
  if (closeCode === 4401) return { retry: false, delayMs: 0, reason: 'auth' };
  if (attempt > 10) return { retry: false, delayMs: 0, reason: 'exhausted' };
  // "Equal jitter" -- half fixed, half random. A reasonable strategy, but not
  // the one specified, and the difference shows at every attempt.
  const window = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  return { retry: true, delayMs: Math.floor(window / 2 + rand * window / 2), reason: 'backoff' };
}`,
      },
    },
  },
};
