// Wrong-answer cases for b4/0003 — checkLimits.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   HELPERS — the sliding-window filter and the retry-after calculation
//   IP      — rule 2's first check, and the only one an enumerator trips
//   NUMBER  — rules 3 and 4, the two per-number limits behind a null guard
//   OK      — the allowed path
//
// Every case was run against the self-check individually. Where one trips
// more than one check the extras are consequences of the same change.

const FRAGMENTS = {
  HELPERS: `
  const live = (stamps, windowMs) => (stamps || []).filter((t) => now - t < windowMs);
  const wait = (stamps, windowMs) => {
    if (stamps.length === 0) return 0;
    return Math.max(0, Math.min(...stamps) + windowMs - now);
  };`,

  IP: `
  const ipHits = live(state.byIp[req.ip], config.perIp.windowMs);
  if (ipHits.length >= config.perIp.max) {
    return refuse("ip", ipHits, config.perIp.windowMs);
  }`,

  NUMBER: `
  if (req.phoneHash != null) {
    const numStamps = state.byNumber[req.phoneHash];
    const burstHits = live(numStamps, config.burst.windowMs);
    if (burstHits.length >= config.burst.max) {
      return refuse("burst", burstHits, config.burst.windowMs);
    }
    const dailyHits = live(numStamps, config.daily.windowMs);
    if (dailyHits.length >= config.daily.max) {
      return refuse("daily", dailyHits, config.daily.windowMs);
    }
  }`,

  OK: `
  return { allowed: true, hit: null, retryAfterMs: 0 };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function checkLimits(req, state, config) {
  const now = req.now;
${f.HELPERS}
  const refuse = (hit, stamps, windowMs) => ({
    allowed: false, hit, retryAfterMs: wait(stamps, windowMs),
  });
${f.IP}
${f.NUMBER}
${f.OK}
}`;
}

const alternatives = [
  // A reduce instead of filter, and retryAfterMs computed by sorting.
  // Same answers, different route.
  build({
    HELPERS: `
  const live = (stamps, windowMs) =>
    (stamps || []).reduce((keep, t) => (now - t < windowMs ? keep.concat([t]) : keep), []);
  const wait = (stamps, windowMs) => {
    if (!stamps.length) return 0;
    const sorted = stamps.slice().sort((a, b) => a - b);
    const ms = sorted[0] + windowMs - now;
    return ms > 0 ? ms : 0;
  };`,
  }),

  // The two number limits expressed as a loop over a table, and the null
  // guard written as an early skip rather than a wrapper.
  build({
    NUMBER: `
  const numberLimits = [
    ["burst", config.burst],
    ["daily", config.daily],
  ];
  if (req.phoneHash !== null && req.phoneHash !== undefined) {
    for (const [name, limit] of numberLimits) {
      const hits = live(state.byNumber[req.phoneHash], limit.windowMs);
      if (hits.length >= limit.max) return refuse(name, hits, limit.windowMs);
    }
  }`,
  }),
];

const mistakes = [
  {
    // THE headline, and the one the broken playground demonstrates: no IP
    // layer at all. Stops harassment, does nothing to an enumerator, and
    // the difference is an invoice.
    expect: "an enumerator is stopped by the IP limit alone",
    impl: build({ IP: `` }),
  },
  {
    // A fixed bucket instead of a sliding window: everything older than
    // the window is discarded by resetting on a boundary, so a request
    // 5 seconds old stops counting the moment the clock ticks over.
    // Modelled here as counting only stamps inside the CURRENT bucket.
    expect: "a 5s-old request still counts just after a minute boundary",
    impl: build({
      HELPERS: `
  const live = (stamps, windowMs) =>
    (stamps || []).filter((t) => Math.floor(t / windowMs) === Math.floor(now / windowMs));
  const wait = (stamps, windowMs) => {
    if (stamps.length === 0) return 0;
    return Math.max(0, Math.min(...stamps) + windowMs - now);
  };`,
    }),
  },
  {
    // > instead of >=. Allows exactly one more than every limit says,
    // everywhere at once -- which is why it is only caught by the burst
    // limit, where max is 1 and the extra request is 100% overage.
    expect: "a second request 5s later trips the burst limit",
    impl: build({
      NUMBER: `
  if (req.phoneHash != null) {
    const numStamps = state.byNumber[req.phoneHash];
    const burstHits = live(numStamps, config.burst.windowMs);
    if (burstHits.length > config.burst.max) {
      return refuse("burst", burstHits, config.burst.windowMs);
    }
    const dailyHits = live(numStamps, config.daily.windowMs);
    if (dailyHits.length > config.daily.max) {
      return refuse("daily", dailyHits, config.daily.windowMs);
    }
  }`,
    }),
  },
  {
    // <= instead of < in the window test, so a stamp exactly on the edge
    // still counts. One extra second of lockout, invisible until someone
    // is watching a countdown reach zero and nothing happens.
    expect: "a stamp exactly ON the window edge has expired",
    impl: build({
      HELPERS: `
  const live = (stamps, windowMs) => (stamps || []).filter((t) => now - t <= windowMs);
  const wait = (stamps, windowMs) => {
    if (stamps.length === 0) return 0;
    return Math.max(0, Math.min(...stamps) + windowMs - now);
  };`,
    }),
  },
  {
    // retryAfterMs from the NEWEST stamp. Tells a user to wait a full
    // window when they are seconds from a free slot -- and the app shows
    // that number, so it is a visible lie rather than an internal one.
    expect: "...the OLDEST, not the newest, when several are live",
    impl: build({
      HELPERS: `
  const live = (stamps, windowMs) => (stamps || []).filter((t) => now - t < windowMs);
  const wait = (stamps, windowMs) => {
    if (stamps.length === 0) return 0;
    return Math.max(0, Math.max(...stamps) + windowMs - now);
  };`,
    }),
  },
  {
    // Order inverted: the number limits run before the IP limit. Both
    // still refuse, so nothing is let through -- but `hit` now reports
    // burst for a request that was really an enumerator, and the cheap
    // check runs after the expensive one.
    expect: "when IP and burst are both exceeded, hit is 'ip'",
    impl: build({
      IP: ``,
      OK: `
  const ipHits = live(state.byIp[req.ip], config.perIp.windowMs);
  if (ipHits.length >= config.perIp.max) {
    return refuse("ip", ipHits, config.perIp.windowMs);
  }
  return { allowed: true, hit: null, retryAfterMs: 0 };`,
    }),
  },
  {
    // A null phoneHash is rejected outright rather than falling through
    // to the IP limit. Looks defensive; it means a malformed number can
    // never reach the endpoint at all, so the validation error the user
    // needs is replaced by a rate-limit refusal.
    expect: "a null phoneHash skips the number limits",
    impl: build({
      NUMBER: `
  if (req.phoneHash == null) {
    return { allowed: false, hit: "burst", retryAfterMs: 0 };
  }
  const numStamps = state.byNumber[req.phoneHash];
  const burstHits = live(numStamps, config.burst.windowMs);
  if (burstHits.length >= config.burst.max) {
    return refuse("burst", burstHits, config.burst.windowMs);
  }
  const dailyHits = live(numStamps, config.daily.windowMs);
  if (dailyHits.length >= config.daily.max) {
    return refuse("daily", dailyHits, config.daily.windowMs);
  }`,
    }),
  },
  {
    // The null guard wraps the IP check too, so a request with an
    // unparseable number counts against nothing at all. Sending garbage
    // becomes an unlimited free pass to whatever sits behind this.
    expect: "...but a null phoneHash STILL counts against the IP limit",
    impl: build({
      IP: ``,
      NUMBER: `
  if (req.phoneHash != null) {
    const ipHits = live(state.byIp[req.ip], config.perIp.windowMs);
    if (ipHits.length >= config.perIp.max) {
      return refuse("ip", ipHits, config.perIp.windowMs);
    }
    const numStamps = state.byNumber[req.phoneHash];
    const burstHits = live(numStamps, config.burst.windowMs);
    if (burstHits.length >= config.burst.max) {
      return refuse("burst", burstHits, config.burst.windowMs);
    }
    const dailyHits = live(numStamps, config.daily.windowMs);
    if (dailyHits.length >= config.daily.max) {
      return refuse("daily", dailyHits, config.daily.windowMs);
    }
  }`,
    }),
  },
  {
    // The daily limit is checked against the burst window. Five requests
    // in a minute now trip "daily", and five spread over a day trip
    // nothing -- the limit that bounds harassment stops working on the
    // timescale harassment actually happens over.
    expect: "the sixth code in a day trips the daily limit",
    impl: build({
      NUMBER: `
  if (req.phoneHash != null) {
    const numStamps = state.byNumber[req.phoneHash];
    const burstHits = live(numStamps, config.burst.windowMs);
    if (burstHits.length >= config.burst.max) {
      return refuse("burst", burstHits, config.burst.windowMs);
    }
    const dailyHits = live(numStamps, config.burst.windowMs);
    if (dailyHits.length >= config.daily.max) {
      return refuse("daily", dailyHits, config.daily.windowMs);
    }
  }`,
    }),
  },
  {
    // One shared bucket for every number instead of one per number. The
    // limits now apply to the whole system: the sixth user of the day is
    // refused because five other people signed up.
    expect: "another number is unaffected by this one's history",
    impl: build({
      NUMBER: `
  if (req.phoneHash != null) {
    const numStamps = Object.values(state.byNumber).flat();
    const burstHits = live(numStamps, config.burst.windowMs);
    if (burstHits.length >= config.burst.max) {
      return refuse("burst", burstHits, config.burst.windowMs);
    }
    const dailyHits = live(numStamps, config.daily.windowMs);
    if (dailyHits.length >= config.daily.max) {
      return refuse("daily", dailyHits, config.daily.windowMs);
    }
  }`,
    }),
  },
  {
    // Rule 6. Records the request as it decides, so calling the function
    // twice with the same input gives different answers -- and any
    // caller that checks before acting has already spent the allowance.
    expect: "checkLimits does not record the request itself",
    impl: build({
      OK: `
  (state.byNumber[req.phoneHash] ||= []).push(now);
  (state.byIp[req.ip] ||= []).push(now);
  return { allowed: true, hit: null, retryAfterMs: 0 };`,
    }),
  },
];

export const stages = {
  limits: { alternatives, mistakes },
};
