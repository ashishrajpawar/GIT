// Wrong-answer cases for C6/0003 — checkLimit().
//
// Note what the mistakes are NOT about. None of them is a wrong count in the
// ordinary sense; every one is a policy decision written as an expression, and
// each returns a perfectly plausible result object. That is the module's
// warning in miniature: a limiter that is wrong still answers the question.

const CORRECT = `function checkLimit(bucket, now, policy) {
  if (bucket === null || bucket === undefined) {
    return { allowed: false, remaining: 0, retryAfterMs: policy.unavailableRetryMs,
             reason: "store_unavailable", keep: [] };
  }
  if (policy.limit === 0) {
    return { allowed: false, remaining: 0, retryAfterMs: null, reason: "no_quota", keep: [] };
  }

  const cutoff = now - policy.windowMs;
  const kept = bucket.hits.filter(at => at > cutoff);

  if (policy.limit === null || policy.limit === undefined) {
    return { allowed: true, remaining: null, retryAfterMs: 0, reason: "ok",
             keep: kept.concat([now]) };
  }

  if (kept.length < policy.limit) {
    const keep = kept.concat([now]);
    return { allowed: true, remaining: Math.max(0, policy.limit - keep.length),
             retryAfterMs: 0, reason: "ok", keep: keep };
  }

  const oldest = Math.min.apply(null, kept);
  return { allowed: false, remaining: 0, retryAfterMs: oldest + policy.windowMs - now,
           reason: "over_limit", keep: kept };
}`;

export const alternatives = {
  // A reduce for the oldest, an explicit index loop for the prune, and the
  // uncapped case handled by treating it as a very large limit at the end.
  "loop and reduce": `
function checkLimit(bucket, now, policy) {
  if (bucket == null) {
    return { allowed: false, remaining: 0, retryAfterMs: policy.unavailableRetryMs,
             reason: "store_unavailable", keep: [] };
  }
  if (policy.limit === 0) {
    return { allowed: false, remaining: 0, retryAfterMs: null, reason: "no_quota", keep: [] };
  }

  const kept = [];
  for (let i = 0; i < bucket.hits.length; i++) {
    if (bucket.hits[i] > now - policy.windowMs) kept.push(bucket.hits[i]);
  }

  const uncapped = policy.limit == null;
  if (uncapped || kept.length < policy.limit) {
    const keep = kept.slice();
    keep.push(now);
    return {
      allowed: true,
      remaining: uncapped ? null : Math.max(0, policy.limit - keep.length),
      retryAfterMs: 0,
      reason: "ok",
      keep: keep
    };
  }

  const oldest = kept.reduce((lowest, at) => (at < lowest ? at : lowest), Infinity);
  return { allowed: false, remaining: 0, reason: "over_limit",
           retryAfterMs: oldest + policy.windowMs - now, keep: kept };
}`,

  // A result assembled at the end from variables rather than four early
  // returns, with a sorted copy used to find the oldest.
  "single exit": `
function checkLimit(bucket, now, policy) {
  let allowed, remaining, retryAfterMs, reason, keep;

  if (bucket === undefined || bucket === null) {
    allowed = false; remaining = 0; retryAfterMs = policy.unavailableRetryMs;
    reason = "store_unavailable"; keep = [];
  } else if (policy.limit === 0) {
    allowed = false; remaining = 0; retryAfterMs = null; reason = "no_quota"; keep = [];
  } else {
    const kept = bucket.hits.filter(function (at) { return at > now - policy.windowMs; });

    if (policy.limit === null || typeof policy.limit === "undefined") {
      allowed = true; remaining = null; retryAfterMs = 0; reason = "ok";
      keep = kept.concat([now]);
    } else if (kept.length < policy.limit) {
      keep = kept.concat([now]);
      allowed = true; retryAfterMs = 0; reason = "ok";
      remaining = policy.limit - keep.length;
      if (remaining < 0) remaining = 0;
    } else {
      const bySize = kept.slice().sort(function (a, b) { return a - b; });
      allowed = false; remaining = 0; reason = "over_limit";
      retryAfterMs = bySize[0] + policy.windowMs - now;
      keep = kept;
    }
  }

  return { allowed, remaining, retryAfterMs, reason, keep };
}`,

  // Arrow function, destructured policy, ternaries.
  "destructured arrow": `
const checkLimit = (bucket, now, policy) => {
  const { limit, windowMs, unavailableRetryMs } = policy;

  if (!bucket) {
    return { allowed: false, remaining: 0, retryAfterMs: unavailableRetryMs,
             reason: "store_unavailable", keep: [] };
  }
  if (limit === 0) {
    return { allowed: false, remaining: 0, retryAfterMs: null, reason: "no_quota", keep: [] };
  }

  const kept = bucket.hits.filter(at => at > now - windowMs);
  const capped = limit !== null && limit !== undefined;
  const over = capped && kept.length >= limit;

  if (over) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.min(...kept) + windowMs - now,
      reason: "over_limit",
      keep: kept
    };
  }

  const keep = [...kept, now];
  return {
    allowed: true,
    remaining: capped ? Math.max(0, limit - keep.length) : null,
    retryAfterMs: 0,
    reason: "ok",
    keep
  };
};`
};

export const mistakes = [
  {
    // The half-open window, given away. A hit exactly on the edge counts
    // against you whenever the clock lands there.
    expect: "hits outside the window are pruned and the edge one is excluded",
    impl: CORRECT.replace("at => at > cutoff", "at => at >= cutoff")
  },
  {
    // Off by one at the top: a limit of five enforces four.
    expect: "the fifth request against a limit of five is allowed, not the fourth",
    impl: CORRECT.replace("if (kept.length < policy.limit) {", "if (kept.length + 1 < policy.limit) {")
  },
  {
    // remaining computed before the request is counted, so it always reads one
    // higher than the caller has left.
    expect: "remaining counts the request being allowed right now",
    impl: CORRECT.replace(
      "remaining: Math.max(0, policy.limit - keep.length),",
      "remaining: Math.max(0, policy.limit - kept.length),"
    )
  },
  {
    // Future timestamps discarded, so a node with a fast clock refunds requests.
    expect: "a timestamp from a node with a fast clock still counts against the limit",
    impl: CORRECT.replace("at => at > cutoff", "at => at > cutoff && at <= now")
  },
  {
    // The oldest taken by position rather than by time, which is only the same
    // thing while every clock agrees.
    expect: "the retry is set by the oldest kept hit, not by whichever arrived first",
    impl: CORRECT.replace("const oldest = Math.min.apply(null, kept);", "const oldest = kept[0];")
  },
  {
    // Fail open. Honest about what it is doing, and still wrong.
    expect: "an unreachable store refuses rather than counting locally",
    impl: CORRECT.replace(
      `  if (bucket === null || bucket === undefined) {
    return { allowed: false, remaining: 0, retryAfterMs: policy.unavailableRetryMs,
             reason: "store_unavailable", keep: [] };
  }
`,
      `  if (bucket === null || bucket === undefined) {
    return { allowed: true, remaining: null, retryAfterMs: 0, reason: "ok", keep: [] };
  }
`
    )
  },
  {
    // The local fallback: the per-node limiter the lesson exists to remove,
    // returning a result that looks exactly like a working one.
    expect: "an unreachable store refuses rather than counting locally",
    impl: CORRECT.replace(
      `  if (bucket === null || bucket === undefined) {
    return { allowed: false, remaining: 0, retryAfterMs: policy.unavailableRetryMs,
             reason: "store_unavailable", keep: [] };
  }
`,
      `  if (bucket === null || bucket === undefined) {
    bucket = { hits: [] };
  }
`
    )
  },
  {
    // if (policy.limit) — zero and null collapsed into one branch, and the
    // endpoint somebody switched off during an incident is thrown open.
    expect: "a limit of zero permits nothing and has no retry time at all",
    impl: `function checkLimit(bucket, now, policy) {
  if (bucket === null || bucket === undefined) {
    return { allowed: false, remaining: 0, retryAfterMs: policy.unavailableRetryMs,
             reason: "store_unavailable", keep: [] };
  }

  const kept = bucket.hits.filter(at => at > now - policy.windowMs);

  if (!policy.limit) {
    return { allowed: true, remaining: null, retryAfterMs: 0, reason: "ok",
             keep: kept.concat([now]) };
  }

  if (kept.length < policy.limit) {
    const keep = kept.concat([now]);
    return { allowed: true, remaining: Math.max(0, policy.limit - keep.length),
             retryAfterMs: 0, reason: "ok", keep: keep };
  }

  const oldest = Math.min.apply(null, kept);
  return { allowed: false, remaining: 0, retryAfterMs: oldest + policy.windowMs - now,
           reason: "over_limit", keep: kept };
}`
  },
  {
    // A quota of zero given a retry time, which invites a client to come back
    // and be refused again for as long as it is willing to.
    expect: "a limit of zero permits nothing and has no retry time at all",
    impl: CORRECT.replace(
      `    return { allowed: false, remaining: 0, retryAfterMs: null, reason: "no_quota", keep: [] };`,
      `    return { allowed: false, remaining: 0, retryAfterMs: policy.windowMs, reason: "no_quota", keep: [] };`
    )
  },
  {
    // Uncapped, and therefore not recorded — so lowering the limit later takes
    // effect only after a whole free window has gone by.
    expect: "a limit of null is uncapped, reports no remaining figure, and still records the hit",
    impl: CORRECT.replace(
      `             keep: kept.concat([now]) };`,
      `             keep: [] };`
    )
  },
  {
    // Pushing onto the caller's array. The prune is right, the storage write is
    // right, and the bucket the caller still holds has quietly gained an entry.
    expect: "the bucket handed in is not modified",
    impl: CORRECT.replace(
      `  if (kept.length < policy.limit) {
    const keep = kept.concat([now]);`,
      `  if (kept.length < policy.limit) {
    bucket.hits.push(now);
    const keep = kept.concat([now]);`
    )
  }
];
