// Wrong-answer cases for b4/0001 — verifyOtp.
//
// Fragment-composed, the a11/0003 way: one correct implementation split
// into named pieces, each mistake overriding exactly one. Single-variable
// by construction rather than by care.
//
// The fragments:
//   REFUSAL  — the one refusal object every failing branch returns
//   NORECORD — rule 1
//   USED     — rule 2, the replay guard
//   EXPIRY   — rules 3 and 4, including the null that is NOT "never"
//   CAP      — rule 5, the guess limit that gates the comparison
//   COMPARE  — rule 6, the only branch that increments
//   OK       — rule 7
//
// Several cases trip more than one check. Each was run against the
// self-check individually; the extras are consequences of the same single
// change (a record that reaches the wrong branch fails that branch's
// reason check as well as its accept check), never an unrelated failure.

const FRAGMENTS = {
  REFUSAL: `
  const REFUSAL = { status: 400, body: { error: "That code is not valid." } };
  const no = (reason, attemptsAfter) => ({
    accept: false, reason, attemptsAfter, consumed: false, response: REFUSAL,
  });`,

  NORECORD: `
  if (!record) return no("no_request", 0);`,

  USED: `
  if (record.consumedAt != null) return no("already_used", attempts);`,

  EXPIRY: `
  if (record.expiresAt == null || config.now >= record.expiresAt) {
    return no("expired", attempts);
  }`,

  CAP: `
  if (attempts >= config.maxAttempts) return no("too_many_attempts", attempts);`,

  COMPARE: `
  if (config.hash(attempt) !== record.codeHash) return no("wrong_code", attempts + 1);`,

  OK: `
  return {
    accept: true, reason: "ok", attemptsAfter: attempts,
    consumed: true, response: null,
  };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function verifyOtp(record, attempt, config) {
${f.REFUSAL}
${f.NORECORD}

  const attempts = record.attempts;
${f.USED}
${f.EXPIRY}
${f.CAP}
${f.COMPARE}
${f.OK}
}`;
}

const alternatives = [
  // Same behaviour as a table of guards walked in order. The precedence is
  // data rather than control flow, and it still has to come out right.
  build({
    USED: `
  const guards = [
    [record.consumedAt != null, "already_used"],
    [record.expiresAt == null || config.now >= record.expiresAt, "expired"],
    [attempts >= config.maxAttempts, "too_many_attempts"],
  ];
  for (const [tripped, reason] of guards) if (tripped) return no(reason, attempts);`,
    EXPIRY: ``,
    CAP: ``,
  }),

  // Early-returns replaced by a single computed reason, and the expiry
  // condition written the other way round (valid-until rather than
  // expired-at). Neither changes an answer.
  build({
    USED: `
  const stillLive = record.expiresAt != null && config.now < record.expiresAt;
  if (record.consumedAt != null) return no("already_used", attempts);
  if (!stillLive) return no("expired", attempts);`,
    EXPIRY: ``,
  }),
];

const mistakes = [
  {
    // THE headline. The tokens-table habit carried to a table where a
    // missing deadline is a bug rather than a policy. Produces a one-time
    // code that works forever.
    expect: "a null expiry is REFUSED, not treated as 'never expires'",
    impl: build({
      EXPIRY: `
  if (record.expiresAt != null && config.now >= record.expiresAt) {
    return no("expired", attempts);
  }`,
    }),
  },
  {
    // No replay guard at all. Anyone who sees one SMS -- a shoulder
    // surfer, a synced lock-screen notification -- can use it again.
    expect: "an already-used code is refused even though it is correct",
    impl: build({ USED: `` }),
  },
  {
    // The cap is reported on rather than enforced, and the effect is
    // exactly inverted: a WRONG code returns wrong_code and increments
    // forever, so guessing is never limited, while a CORRECT code at the
    // cap is the only thing the cap ever stops. The guess limit ends up
    // protecting nothing and locking out only the legitimate user.
    //
    // Worth knowing that this case does NOT trip "at the cap, the correct
    // code is still refused" -- that check passes, because the correct
    // code does reach the cap test. The counter check is the one that
    // sees it, which is why a self-check needs both.
    expect: "...and the counter does not grow past the cap",
    impl: build({
      CAP: ``,
      COMPARE: `
  if (config.hash(attempt) !== record.codeHash) return no("wrong_code", attempts + 1);
  if (attempts >= config.maxAttempts) return no("too_many_attempts", attempts);`,
    }),
  },
  {
    // The other route to unlimited guesses: the cap is checked, but
    // nothing ever moves the counter, so it never arrives.
    expect: "...and increments the attempt counter",
    impl: build({
      COMPARE: `
  if (config.hash(attempt) !== record.codeHash) return no("wrong_code", attempts);`,
    }),
  },
  {
    // Off by one. Grants exactly one guess past the limit -- the same
    // shape as useCount > max_uses in b7/0001.
    expect: "at the cap, the correct code is still refused",
    impl: build({
      CAP: `
  if (attempts > config.maxAttempts) return no("too_many_attempts", attempts);`,
    }),
  },
  {
    // Boundary: a code expiring exactly now is treated as still valid.
    // Invisible except in the one millisecond it matters, which is
    // exactly when a slow SMS arrives.
    expect: "expiring exactly NOW is expired, not valid for one more ms",
    impl: build({
      EXPIRY: `
  if (record.expiresAt == null || config.now > record.expiresAt) {
    return no("expired", attempts);
  }`,
    }),
  },
  {
    // Success does not consume. The row is left usable, so the same code
    // logs in repeatedly -- the replay hole reached from the other side.
    expect: "...and consumes the record",
    impl: build({
      OK: `
  return {
    accept: true, reason: "ok", attemptsAfter: attempts,
    consumed: false, response: null,
  };`,
    }),
  },
  {
    // A successful verification is counted as an attempt. Harmless once,
    // and it means five logins in a session lock the user out of a
    // record that has already been consumed anyway.
    expect: "...and a success does not count as an attempt",
    impl: build({
      OK: `
  return {
    accept: true, reason: "ok", attemptsAfter: attempts + 1,
    consumed: true, response: null,
  };`,
    }),
  },
  {
    // The oracle. Every branch builds its own body, and the reason --
    // which exists for the logs -- is handed to the caller. This is the
    // helpful-detail drift the lesson warns about, in its finished form.
    expect: "every refusal returns the byte-identical response",
    impl: build({
      REFUSAL: `
  const no = (reason, attemptsAfter) => ({
    accept: false, reason, attemptsAfter, consumed: false,
    response: { status: 400, body: { error: "That code is not valid.", reason } },
  });`,
    }),
  },
  {
    // Precedence inverted: expiry checked before the replay guard. Both
    // refuse, so nothing is let in -- but the log now says "expired" for
    // a replayed code, which is the difference between noticing an
    // attack and filing it under slow SMS delivery.
    expect: "used AND expired reports already_used (fixed precedence)",
    impl: build({
      USED: `
  if (record.expiresAt == null || config.now >= record.expiresAt) {
    return no("expired", attempts);
  }`,
      EXPIRY: `
  if (record.consumedAt != null) return no("already_used", attempts);`,
    }),
  },
  {
    // No record is reported as a wrong code. The body is still identical,
    // so this is only visible in the logs -- where it destroys the one
    // signal that distinguishes "someone is guessing at a real account"
    // from "someone is walking the number range".
    expect: "...with reason no_request and no attempts",
    impl: build({
      NORECORD: `
  if (!record) return no("wrong_code", 0);`,
    }),
  },
  {
    // Rule 8. Writes the counter back into the caller's row. Checked in
    // its own block because a mutation bug can throw on a frozen input
    // rather than returning a wrong answer.
    expect: "verifyOtp does not mutate the record",
    impl: build({
      COMPARE: `
  if (config.hash(attempt) !== record.codeHash) {
    record.attempts = attempts + 1;
    return no("wrong_code", record.attempts);
  }`,
    }),
  },
];

export const stages = {
  otp: { alternatives, mistakes },
};
