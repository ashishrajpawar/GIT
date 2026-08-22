// Wrong-answer cases for b4/0002 — refreshOutcome.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   UNKNOWN — rule 1, the no-row branch (and the DoS handle)
//   REVOKED — rule 2, deliberate logout is not theft
//   REUSE   — rules 3, 4 and 6, the grace window and the family kill
//   OK      — rule 5
//
// Every case here was run against the self-check individually. Where one
// trips more than one check the extras are consequences of the same
// change: an outcome that lands in the wrong branch fails that branch's
// reason check as well as its action check.

const FRAGMENTS = {
  UNKNOWN: `
  if (!row) {
    return { action: "reject", reason: "unknown", revokeFamily: false, replayToken: null };
  }`,

  REVOKED: `
  if (row.revokedAt != null) {
    return { action: "reject", reason: "revoked", revokeFamily: false, replayToken: null };
  }`,

  REUSE: `
  if (row.supersededAt != null) {
    const age = config.now - row.supersededAt;
    if (age <= config.graceMs) {
      return { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy };
    }
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,

  OK: `
  return { action: "rotate", reason: "ok", revokeFamily: false, replayToken: null };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function refreshOutcome(row, config) {
${f.UNKNOWN}
${f.REVOKED}
${f.REUSE}
${f.OK}
}`;
}

const alternatives = [
  // The grace comparison written the other way round (still-fresh rather
  // than too-old), and a single exit built from a computed descriptor.
  build({
    REUSE: `
  if (row.supersededAt != null) {
    const withinGrace = config.now - row.supersededAt <= config.graceMs;
    return withinGrace
      ? { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy }
      : { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
  }),

  // Guards as a table, and the null checks written with === null / !== null
  // instead of != null. Equivalent here because the fields are only ever
  // null or a number.
  build({
    UNKNOWN: `
  if (row === null || row === undefined) {
    return { action: "reject", reason: "unknown", revokeFamily: false, replayToken: null };
  }`,
    REVOKED: `
  if (row.revokedAt !== null && row.revokedAt !== undefined) {
    return { action: "reject", reason: "revoked", revokeFamily: false, replayToken: null };
  }`,
  }),
];

const mistakes = [
  {
    // The DoS handle. "An unknown token is suspicious, so kill the family
    // to be safe" -- except there is no family, because there is no row.
    // If it worked, posting random bytes would log out any user.
    expect: "...and an unknown token NEVER revokes a family",
    impl: build({
      UNKNOWN: `
  if (!row) {
    return { action: "reject", reason: "unknown", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
  {
    // Deliberate logout treated as theft. Ending one session on purpose
    // then ends every other device as a punishment for doing it properly.
    expect: "...and does NOT revoke the family",
    impl: build({
      REVOKED: `
  if (row.revokedAt != null) {
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
  {
    // No grace window at all: every dead row is theft. This is the
    // train-journey bug -- a lost response signs the user out of
    // everything, and it is indistinguishable from working correctly
    // until someone has a bad connection.
    expect: "a retry inside the grace window replays",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
  {
    // The replay rotates again instead of returning the existing
    // successor. Looks correct and forks the chain: the client holds one
    // token while the newest row is another, so the NEXT genuine refresh
    // is reported as reuse. The failure surfaces one request later than
    // the bug, which is what makes it hard to find.
    expect: "...returning the EXISTING successor, not a new token",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    const age = config.now - row.supersededAt;
    if (age <= config.graceMs) {
      return { action: "rotate", reason: "retry", revokeFamily: false, replayToken: null };
    }
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
  {
    // Boundary: a retry landing exactly on graceMs is called theft. The
    // least defensible possible place to put a session-ending decision.
    expect: "a retry landing exactly on the window is still a retry",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    const age = config.now - row.supersededAt;
    if (age < config.graceMs) {
      return { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy };
    }
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
  {
    // Reuse is detected and reported, and nothing is revoked. This is the
    // defect the lesson's own "When this breaks" section describes: a
    // comment promising theft detection over code that takes no action.
    expect: "...and THIS is the branch that revokes the family",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    const age = config.now - row.supersededAt;
    if (age <= config.graceMs) {
      return { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy };
    }
    return { action: "reject", reason: "reuse", revokeFamily: false, replayToken: null };
  }`,
    }),
  },
  {
    // Precedence inverted: superseded checked before revoked. A row that
    // was rotated and later killed by a family revocation now re-kills
    // the family on every subsequent request -- noise that buries the
    // one log line that mattered.
    expect: "superseded AND revoked reports revoked, and spares the family",
    impl: build({
      REVOKED: ``,
      OK: `
  if (row.revokedAt != null) {
    return { action: "reject", reason: "revoked", revokeFamily: false, replayToken: null };
  }
  return { action: "rotate", reason: "ok", revokeFamily: false, replayToken: null };`,
    }),
  },
  {
    // The window is measured from the wrong end -- age counted forwards
    // from supersededAt gives a negative number for anything in the past,
    // so every superseded token is "within grace" forever. Replay for
    // everyone, theft detection gone entirely.
    expect: "a token replayed long after rotation is reuse",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    const age = row.supersededAt - config.now;
    if (age <= config.graceMs) {
      return { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy };
    }
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
  {
    // replayToken left set on the reuse branch. Harmless-looking, and it
    // hands the caller the successor token on the exact request that was
    // just classified as theft.
    expect: "replayToken is null on every non-replay outcome",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    const age = config.now - row.supersededAt;
    if (age <= config.graceMs) {
      return { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy };
    }
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: row.replacedBy };
  }`,
    }),
  },
  {
    // An unknown token is reported as reuse. Nothing is revoked, so it is
    // only a logging defect -- and it destroys the distinction between
    // "someone is replaying a real token" and "someone is spraying
    // garbage", which is the difference between an incident and noise.
    expect: "...reported as unknown, not reuse",
    impl: build({
      UNKNOWN: `
  if (!row) {
    return { action: "reject", reason: "reuse", revokeFamily: false, replayToken: null };
  }`,
    }),
  },
  {
    // Rule 7. Marks the row as it goes, so the caller's object is edited
    // by a function that was asked only to decide. Its own block, since
    // a mutation bug can throw on a frozen input.
    expect: "refreshOutcome does not mutate the row",
    impl: build({
      REUSE: `
  if (row.supersededAt != null) {
    const age = config.now - row.supersededAt;
    if (age <= config.graceMs) {
      row.replacedBy = null;
      return { action: "replay", reason: "retry", revokeFamily: false, replayToken: row.replacedBy };
    }
    return { action: "reject", reason: "reuse", revokeFamily: true, replayToken: null };
  }`,
    }),
  },
];

export const stages = {
  refresh: { alternatives, mistakes },
};
