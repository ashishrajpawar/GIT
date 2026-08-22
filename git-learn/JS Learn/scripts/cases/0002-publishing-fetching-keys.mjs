// Wrong-answer cases for c5/0002 — classifyPeerKey.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   NOKEY    — rule 1a, the downgrade guard
//   MALFORM  — rule 1b
//   FIRST    — rule 2, the ONLY branch allowed to pin
//   SAME     — rule 3, the bytes are the identity
//   ROLLBACK — rule 4, a rotation increments and a substitution does not
//   CHANGED  — rules 5 and 6
//
// Several cases trip the structural assertion ("exactly one case in seven
// may pin") as well as their specific check. That is inherent: any
// mistake widening the set of inputs that get pinned is exactly what
// that assertion counts, and it is why the assertion is there.

const FRAGMENTS = {
  NOKEY: `
  if (!fetched || fetched.publicKey == null) {
    return out("unusable", "block", "no_key", false);
  }`,

  MALFORM: `
  if (!config.isWellFormed(fetched.publicKey)) {
    return out("unusable", "block", "malformed", false);
  }`,

  FIRST: `
  if (!known) {
    return out("first_contact", "pin", "first_use", false);
  }`,

  SAME: `
  if (known.publicKey === fetched.publicKey) {
    return out("trusted", "proceed", "unchanged", false);
  }`,

  ROLLBACK: `
  if (fetched.keyVersion <= known.keyVersion) {
    return out("unusable", "block", "rollback", false);
  }`,

  CHANGED: `
  return out("changed", "warn", "rotated", known.verifiedAt != null);`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function classifyPeerKey(known, fetched, config) {
  const out = (trust, action, reason, verificationLost) => ({
    trust, action, reason, verificationLost: verificationLost === true,
  });
${f.NOKEY}
${f.MALFORM}
${f.FIRST}
${f.SAME}
${f.ROLLBACK}
${f.CHANGED}
}`;
}

const alternatives = [
  // The two block conditions merged into one guard with the reason
  // computed, and the change branch written as an explicit if.
  build({
    NOKEY: `
  const missing = !fetched || fetched.publicKey == null;
  const badShape = !missing && !config.isWellFormed(fetched.publicKey);
  if (missing || badShape) {
    return out("unusable", "block", missing ? "no_key" : "malformed", false);
  }`,
    MALFORM: ``,
  }),

  // Rollback expressed as its positive ("did it increment?") and the
  // verification flag computed into a local first.
  build({
    ROLLBACK: `
  const incremented = fetched.keyVersion > known.keyVersion;
  if (!incremented) {
    return out("unusable", "block", "rollback", false);
  }`,
    CHANGED: `
  const wasVerified = known.verifiedAt !== null && known.verifiedAt !== undefined;
  return out("changed", "warn", "rotated", wasVerified);`,
  }),
];

const mistakes = [
  {
    // THE downgrade. A missing key becomes permission to send plaintext,
    // so the server reads anything it likes by answering null.
    expect: "a null key is BLOCKED, never sent in the clear",
    impl: build({
      NOKEY: `
  if (!fetched || fetched.publicKey == null) {
    return out("none", "send_plaintext", "no_key", false);
  }`,
    }),
  },
  {
    // Silent re-pinning: the substitution attack succeeding. The one
    // event pinning exists to make visible is handled by not mentioning
    // it.
    expect: "...and is NEVER pinned silently",
    impl: build({
      CHANGED: `
  return out("changed", "pin", "rotated", known.verifiedAt != null);`,
    }),
  },
  {
    // No rollback check at all, so a substituted key at the same version
    // is treated as an ordinary rotation. Still warns -- which is why
    // this is only caught by a check that reads the reason.
    expect: "a different key at the SAME version is blocked",
    impl: build({ ROLLBACK: `` }),
  },
  {
    // Off by one: only a STRICTLY lower version is a rollback, so a
    // different key at the SAME version sails through as a rotation.
    // The single most likely substitution shape, since a server that
    // swaps a key has no reason to touch the number.
    expect: "a different key at the SAME version is blocked",
    impl: build({
      ROLLBACK: `
  if (fetched.keyVersion < known.keyVersion) {
    return out("unusable", "block", "rollback", false);
  }`,
    }),
  },
  {
    // Compares the VERSION rather than the key bytes to decide whether
    // anything changed. Warns about a key identical to the trusted one,
    // which trains the user to dismiss the warning that matters.
    expect: "...even if only the version moved",
    impl: build({
      SAME: `
  if (known.keyVersion === fetched.keyVersion) {
    return out("trusted", "proceed", "unchanged", false);
  }`,
    }),
  },
  {
    // Malformed check runs before the null check, so null reaches
    // isWellFormed. It returns false rather than throwing here, so the
    // result is a wrong REASON: 'malformed' for a peer who simply has
    // not set up yet.
    expect: "...reported as no_key",
    impl: build({
      NOKEY: `
  if (!config.isWellFormed(fetched && fetched.publicKey)) {
    return out("unusable", "block", "malformed", false);
  }`,
      MALFORM: `
  if (!fetched || fetched.publicKey == null) {
    return out("unusable", "block", "no_key", false);
  }`,
    }),
  },
  {
    // Truthiness instead of well-formedness. A non-empty string that is
    // not a key passes, and the client encrypts to garbage -- which
    // fails later, somewhere else, with no indication of why.
    expect: "a malformed key is blocked",
    impl: build({
      MALFORM: `
  if (!fetched.publicKey) {
    return out("unusable", "block", "malformed", false);
  }`,
    }),
  },
  {
    // Verification carried across a key change. An attacker who
    // substitutes a key inherits the green tick the user earned by
    // meeting their friend in person.
    expect: "a key change loses a verification that existed",
    impl: build({
      CHANGED: `
  return out("changed", "warn", "rotated", false);`,
    }),
  },
  {
    // verificationLost reported on a BLOCKED rollback. Nothing was
    // accepted, so nothing was lost -- and telling the user to
    // re-verify a key that never changed is the kind of false alarm
    // that teaches people to ignore real ones.
    expect: "a BLOCKED rollback loses nothing either",
    impl: build({
      ROLLBACK: `
  if (fetched.keyVersion <= known.keyVersion) {
    return out("unusable", "block", "rollback", known.verifiedAt != null);
  }`,
    }),
  },
  {
    // The first-contact branch runs before the null check, so a peer
    // who has published nothing gets pinned as publicKey null -- and
    // every later fetch compares against a pin of null.
    expect: "...and blocked on first contact too",
    impl: build({
      NOKEY: `
  if (!known) {
    return out("first_contact", "pin", "first_use", false);
  }
  if (!fetched || fetched.publicKey == null) {
    return out("unusable", "block", "no_key", false);
  }`,
      FIRST: ``,
    }),
  },
  {
    // Rule 7. Writes the fetched key into the caller's pinned record on
    // the warn path, so a change the user has not accepted is already
    // recorded as trusted by the time the dialog appears.
    expect: "classifyPeerKey does not mutate the pinned record",
    impl: build({
      CHANGED: `
  known.publicKey = fetched.publicKey;
  known.keyVersion = fetched.keyVersion;
  return out("changed", "warn", "rotated", known.verifiedAt != null);`,
    }),
  },
];

export const stages = {
  keys: { alternatives, mistakes },
};
