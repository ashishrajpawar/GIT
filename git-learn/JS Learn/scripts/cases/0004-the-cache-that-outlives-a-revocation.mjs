// Wrong-answer cases for C6/0004 — planTokenRead().
//
// Every mistake here returns a well-formed plan. Several of them also make the
// product measurably faster, which is the uncomfortable part: the wrong answers
// in this lesson are the ones a performance review would praise.

const CORRECT = `function planTokenRead(request, cached, now, policy) {
  const fromOrigin = (reason, store) => ({
    source: "origin", store: store, revalidate: false, reason: reason
  });

  if (policy.looksLikeCode(request.key)) return fromOrigin("code_shaped_key", false);

  if (request.purpose === "authorise") return fromOrigin("authorisation_path", false);
  if (request.purpose !== "display") return fromOrigin("unknown_purpose", false);

  if (cached === null || cached === undefined) return fromOrigin("miss", true);
  if (cached.key !== request.key) return fromOrigin("key_mismatch", true);
  if (cached.version !== policy.currentVersion) return fromOrigin("version_changed", true);

  const age = now - cached.storedAt;
  if (age < 0) return fromOrigin("clock_skew", true);

  if (age < policy.ttlMs) {
    return { source: "cache", store: false, revalidate: false, reason: "fresh" };
  }

  const grace = policy.staleWhileRevalidateMs;
  if (grace && age <= policy.ttlMs + grace) {
    return { source: "cache", store: true, revalidate: true, reason: "stale_while_revalidate" };
  }

  return fromOrigin("expired", true);
}`;

export const alternatives = {
  // A table of guards evaluated in order, rather than a chain of ifs.
  "guard table": `
function planTokenRead(request, cached, now, policy) {
  const deny = reason => ({ source: "origin", store: false, revalidate: false, reason });
  const refetch = reason => ({ source: "origin", store: true, revalidate: false, reason });

  const refusals = [
    [() => policy.looksLikeCode(request.key), () => deny("code_shaped_key")],
    [() => request.purpose === "authorise", () => deny("authorisation_path")],
    [() => request.purpose !== "display", () => deny("unknown_purpose")],
    [() => !cached, () => refetch("miss")],
    [() => cached.key !== request.key, () => refetch("key_mismatch")],
    [() => cached.version !== policy.currentVersion, () => refetch("version_changed")],
    [() => now - cached.storedAt < 0, () => refetch("clock_skew")]
  ];

  for (const [when, then] of refusals) {
    if (when()) return then();
  }

  const age = now - cached.storedAt;
  if (age < policy.ttlMs) return { source: "cache", store: false, revalidate: false, reason: "fresh" };

  const limit = policy.ttlMs + (policy.staleWhileRevalidateMs || 0);
  if (policy.staleWhileRevalidateMs && age <= limit) {
    return { source: "cache", store: true, revalidate: true, reason: "stale_while_revalidate" };
  }
  return refetch("expired");
}`,

  // A single exit built from a reason chosen first, with the flags derived
  // from the reason by lookup.
  "reason then flags": `
const PLANS = {
  code_shaped_key:        { source: "origin", store: false, revalidate: false },
  authorisation_path:     { source: "origin", store: false, revalidate: false },
  unknown_purpose:        { source: "origin", store: false, revalidate: false },
  miss:                   { source: "origin", store: true,  revalidate: false },
  key_mismatch:           { source: "origin", store: true,  revalidate: false },
  version_changed:        { source: "origin", store: true,  revalidate: false },
  clock_skew:             { source: "origin", store: true,  revalidate: false },
  expired:                { source: "origin", store: true,  revalidate: false },
  fresh:                  { source: "cache",  store: false, revalidate: false },
  stale_while_revalidate: { source: "cache",  store: true,  revalidate: true }
};

function reasonFor(request, cached, now, policy) {
  if (policy.looksLikeCode(request.key)) return "code_shaped_key";
  if (request.purpose === "authorise") return "authorisation_path";
  if (request.purpose !== "display") return "unknown_purpose";
  if (cached == null) return "miss";
  if (cached.key !== request.key) return "key_mismatch";
  if (cached.version !== policy.currentVersion) return "version_changed";

  const age = now - cached.storedAt;
  if (age < 0) return "clock_skew";
  if (age < policy.ttlMs) return "fresh";
  if (policy.staleWhileRevalidateMs && age <= policy.ttlMs + policy.staleWhileRevalidateMs) {
    return "stale_while_revalidate";
  }
  return "expired";
}

function planTokenRead(request, cached, now, policy) {
  const reason = reasonFor(request, cached, now, policy);
  return Object.assign({ reason: reason }, PLANS[reason]);
}`,

  // Switch on the purpose, with the display case in its own function.
  "switch on purpose": `
function planDisplay(request, cached, now, policy) {
  const refetch = reason => ({ source: "origin", store: true, revalidate: false, reason: reason });

  if (typeof cached === "undefined" || cached === null) return refetch("miss");
  if (request.key !== cached.key) return refetch("key_mismatch");
  if (policy.currentVersion !== cached.version) return refetch("version_changed");

  const age = now - cached.storedAt;
  if (age < 0) return refetch("clock_skew");
  if (age < policy.ttlMs) return { source: "cache", store: false, revalidate: false, reason: "fresh" };

  const grace = policy.staleWhileRevalidateMs;
  if (grace > 0 && age - policy.ttlMs <= grace) {
    return { source: "cache", store: true, revalidate: true, reason: "stale_while_revalidate" };
  }
  return refetch("expired");
}

function planTokenRead(request, cached, now, policy) {
  const deny = reason => ({ source: "origin", store: false, revalidate: false, reason: reason });

  if (policy.looksLikeCode(request.key)) return deny("code_shaped_key");

  switch (request.purpose) {
    case "authorise": return deny("authorisation_path");
    case "display":   return planDisplay(request, cached, now, policy);
    default:          return deny("unknown_purpose");
  }
}`
};

export const mistakes = [
  {
    // The whole lesson: authorisation served from cache, which turns revoke
    // into revoke-within-the-TTL.
    expect: "an authorise read goes to origin even when a perfectly fresh entry exists",
    impl: CORRECT.replace(
      `  if (request.purpose === "authorise") return fromOrigin("authorisation_path", false);
  if (request.purpose !== "display") return fromOrigin("unknown_purpose", false);
`,
      ""
    )
  },
  {
    // Authorisation refused the cache but allowed to populate it, so the
    // display cache is filled from a path that has no business writing to it.
    expect: "an authorise read goes to origin even when a perfectly fresh entry exists",
    impl: CORRECT.replace(
      `if (request.purpose === "authorise") return fromOrigin("authorisation_path", false);`,
      `if (request.purpose === "authorise") return fromOrigin("authorisation_path", true);`
    )
  },
  {
    // The code check demoted below the purpose check. Every authorise read with
    // a code key now reports the wrong reason, and the refusal holds only while
    // the check above it stays right.
    expect: "the code-shaped key is refused before the purpose is considered",
    impl: `function planTokenRead(request, cached, now, policy) {
  const fromOrigin = (reason, store) => ({
    source: "origin", store: store, revalidate: false, reason: reason
  });

  if (request.purpose === "authorise") return fromOrigin("authorisation_path", false);
  if (policy.looksLikeCode(request.key)) return fromOrigin("code_shaped_key", false);
  if (request.purpose !== "display") return fromOrigin("unknown_purpose", false);

  if (cached === null || cached === undefined) return fromOrigin("miss", true);
  if (cached.key !== request.key) return fromOrigin("key_mismatch", true);
  if (cached.version !== policy.currentVersion) return fromOrigin("version_changed", true);

  const age = now - cached.storedAt;
  if (age < 0) return fromOrigin("clock_skew", true);
  if (age < policy.ttlMs) {
    return { source: "cache", store: false, revalidate: false, reason: "fresh" };
  }
  const grace = policy.staleWhileRevalidateMs;
  if (grace && age <= policy.ttlMs + grace) {
    return { source: "cache", store: true, revalidate: true, reason: "stale_while_revalidate" };
  }
  return fromOrigin("expired", true);
}`
  },
  {
    // No code check at all: the key goes into Redis, MONITOR, SLOWLOG and the
    // rdb snapshot, and nothing anywhere reports it.
    expect: "a code-shaped key is refused and never becomes a cache key",
    impl: CORRECT.replace(
      `  if (policy.looksLikeCode(request.key)) return fromOrigin("code_shaped_key", false);
`,
      ""
    )
  },
  {
    // An unrecognised purpose treated as display, so a call site added next
    // year silently gets the permissive behaviour.
    expect: "an unrecognised purpose is denied the cache rather than treated as display",
    impl: CORRECT.replace(
      `  if (request.purpose !== "display") return fromOrigin("unknown_purpose", false);
`,
      ""
    )
  },
  {
    // Version ignored, so freshness is age alone and an entry written five
    // seconds ago survives a revoke that happened four seconds ago.
    expect: "a five-second-old entry whose row has changed is stale as a fact, not as an age",
    impl: CORRECT.replace(
      `  if (cached.version !== policy.currentVersion) return fromOrigin("version_changed", true);
`,
      ""
    )
  },
  {
    // The clock check placed after the freshness test, where it can never run:
    // a negative age is below any TTL, so the entry is already fresh by then.
    expect: "an entry stamped in the future is refetched rather than treated as fresh",
    impl: CORRECT.replace(
      `  const age = now - cached.storedAt;
  if (age < 0) return fromOrigin("clock_skew", true);

  if (age < policy.ttlMs) {`,
      `  const age = now - cached.storedAt;

  if (age < policy.ttlMs) {`
    )
  },
  {
    // Version demoted below the clock check, so an entry that is both changed
    // and skewed reports NTP trouble instead of the write that actually
    // happened — the actionable fact loses to the incidental one.
    expect: "the version check is reached before the clock check",
    impl: CORRECT.replace(
      `  if (cached.version !== policy.currentVersion) return fromOrigin("version_changed", true);

  const age = now - cached.storedAt;
  if (age < 0) return fromOrigin("clock_skew", true);
`,
      `  const age = now - cached.storedAt;
  if (age < 0) return fromOrigin("clock_skew", true);
  if (cached.version !== policy.currentVersion) return fromOrigin("version_changed", true);
`
    )
  },
  {
    // Freshness inclusive of the TTL, so the edge lands inside the window.
    expect: "an entry aged exactly the TTL is out of the window, not in it",
    impl: CORRECT.replace("if (age < policy.ttlMs) {", "if (age <= policy.ttlMs) {")
  },
  {
    // The key check dropped: an entry belonging to another token is served,
    // which on a token list means one row's label under another row's id.
    expect: "an entry belonging to another key is not served",
    impl: CORRECT.replace(
      `  if (cached.key !== request.key) return fromOrigin("key_mismatch", true);
`,
      ""
    )
  },
  {
    // The grace window measured from storedAt rather than from expiry, so a
    // TTL of 30s with 10s of grace serves nothing stale at all.
    expect: "inside the grace window the entry is served and refreshed behind it",
    impl: CORRECT.replace(
      "if (grace && age <= policy.ttlMs + grace) {",
      "if (grace && age <= grace) {"
    )
  },
  {
    // Grace applied whether or not it is configured, so a policy that switched
    // stale serving off still serves stale entries. Worth reading: the first
    // version of this case did not discriminate at all, because at any age
    // comfortably past the TTL a grace of zero puts the entry outside the
    // window either way. The two implementations differ at EXACTLY the TTL and
    // nowhere else, so the fixture had to move to that age — another instance
    // of an assertion whose two sides could not differ.
    expect: "with no grace configured an expired entry goes straight to origin",
    impl: CORRECT.replace(
      "if (grace && age <= policy.ttlMs + grace) {",
      "if (age <= policy.ttlMs + grace) {"
    )
  },
  {
    // Stamping the request on the way through. Invisible in every other check,
    // which is exactly why the mutation check exists.
    expect: "neither the request nor the cached entry is modified",
    impl: CORRECT.replace(
      "  const age = now - cached.storedAt;",
      "  cached.lastPlannedAt = now;\n  const age = now - cached.storedAt;"
    )
  }
];
