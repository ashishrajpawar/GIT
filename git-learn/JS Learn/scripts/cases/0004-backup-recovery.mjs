// Wrong-answer cases for c5/0004 — planRestore.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   ACCOUNT   — rule 1, the split. Account never depends on the phrase
//   FETCH     — rule 2, 'not yet fetched' is not 'gone'
//   NOBACKUP  — rule 3, genuinely gone, and not an error
//   PHRASE    — rules 4 and 7, normalise once, empty is not an answer
//   UNWRAP    — rules 5 and 6, a typo is not a loss
//
// The interesting mistakes here are not wrong answers, they are two
// states merged into one. Every merge is written by someone being
// concise, and every one of them reports the PERMANENT outcome for the
// temporary case — which is the direction that costs a user something.
//
// Six of the twelve trip more than one check, and each was run against
// the self-check on its own to confirm the extra failures are inherent.
// They are, and for one reason throughout: this function's output is
// five fields describing a single decision, so a change to the decision
// is visible in three or four of them at once. Removing the fetch guard
// (mistake 2) trips five, because it changes the answer for five
// distinct states a returning user can be in.
//
// Two cases were rewritten because they failed for the wrong reason —
// see the notes on mistakes 1 and 6. A case that fails for an unrelated
// reason is indistinguishable from one that passes for an unrelated
// reason until you make it differ in exactly one way.

const FRAGMENTS = {
  ACCOUNT: `
  const account = {
    ok: "restored",
    pending: "pending",
    failed: "failed",
  }[snapshot.accountData];`,

  FETCH: `
  if (snapshot.backupFetch !== "ok") {
    return done("pending", "not_fetched", true, []);
  }`,

  NOBACKUP: `
  if (!snapshot.backup) {
    return done("gone", "no_backup", false, ["message bodies"]);
  }`,

  PHRASE: `
  const phrase = config.normalise(attempt.phrase || "");
  if (phrase.length === 0) {
    return done("locked", "awaiting_phrase", true, []);
  }`,

  UNWRAP: `
  if (!config.unwrap(snapshot.backup, phrase)) {
    return done("locked", "wrong_phrase", true, []);
  }
  return done("readable", "ok", false, []);`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function planRestore(snapshot, attempt, config) {
${f.ACCOUNT}
  const done = (messages, reason, canRetry, lost) => ({
    account, messages, reason, canRetry, lost,
  });
${f.FETCH}
${f.NOBACKUP}
${f.PHRASE}
${f.UNWRAP}
}`;
}

const alternatives = [
  // A switch instead of a lookup object, the two refusals expressed as
  // early returns of a literal, and the unwrap written as a ternary.
  // Same answers throughout.
  build({
    ACCOUNT: `
  let account;
  switch (snapshot.accountData) {
    case "ok": account = "restored"; break;
    case "pending": account = "pending"; break;
    default: account = "failed";
  }`,
    UNWRAP: `
  const opened = config.unwrap(snapshot.backup, phrase);
  return opened
    ? done("readable", "ok", false, [])
    : done("locked", "wrong_phrase", true, []);`,
  }),

  // Normalises a null phrase by coalescing rather than by || "", and
  // tests emptiness with a truthiness check on the normalised value.
  // Equivalent because normalise always returns a string.
  build({
    PHRASE: `
  const phrase = config.normalise(attempt.phrase ?? "");
  if (!phrase) {
    return done("locked", "awaiting_phrase", true, []);
  }`,
  }),
];

const mistakes = [
  {
    // Rule 1, and the one with the most users behind it. The account is
    // gated on a phrase most people will never have, so everyone who
    // skipped the backup opens a new phone to an empty app -- while
    // their entire token list sits on the server needing no key.
    expect: "a user who never wrote the words down still gets their account back",
    impl: build({
      ACCOUNT: `
  const account = attempt.phrase ? "restored" : "failed";`,
    }),
  },
  {
    // The subtler half of rule 1: account derived from the MESSAGE
    // outcome rather than from the server's answer. Looks tidy, and it
    // means a correct phrase papers over a failed bootstrap request --
    // the app shows a restored account it does not have the data for.
    //
    // The fallback keeps the correct mapping on purpose. An earlier
    // draft returned snapshot.accountData raw, which ALSO broke the
    // ok -> 'restored' translation -- so the case failed the first
    // check for a reason that had nothing to do with phrase-gating,
    // and a case that fails for the wrong reason proves nothing.
    expect: "...and a correct phrase does not rescue a failed account fetch",
    impl: build({
      ACCOUNT: `
  const mapped = {
    ok: "restored",
    pending: "pending",
    failed: "failed",
  }[snapshot.accountData];
  const account = snapshot.backup && attempt.phrase ? "restored" : mapped;`,
    }),
  },
  {
    // THE bug. A failed fetch and an absent backup arrive at the same
    // line with the same-looking data, so the fetch check is dropped and
    // a network blip reports a permanently destroyed history. The user
    // does not retry, because you do not retry something that is gone.
    expect: "a backup fetch still in flight is 'pending', not 'gone'",
    impl: build({ FETCH: `` }),
  },
  {
    // The same merge wearing a coat: the fetch IS checked, but only for
    // 'failed'. A request still in flight falls through to the blob
    // check, finds null, and is reported as no backup.
    expect: "a backup fetch still in flight is 'pending', not 'gone'",
    impl: build({
      FETCH: `
  if (snapshot.backupFetch === "failed") {
    return done("pending", "not_fetched", true, []);
  }`,
    }),
  },
  {
    // Order inverted: the blob is trusted before the fetch status is
    // consulted. Works for every case where a failure leaves backup
    // null -- and a stale blob from a previous attempt, still in state
    // when a refresh fails, is then unwrapped as if it were current.
    expect: "...even when a blob somehow arrived alongside the failure",
    impl: build({
      FETCH: ``,
      NOBACKUP: `
  if (!snapshot.backup) {
    if (snapshot.backupFetch !== "ok") {
      return done("pending", "not_fetched", true, []);
    }
    return done("gone", "no_backup", false, ["message bodies"]);
  }`,
    }),
  },
  {
    // Rule 3 treated as a failure rather than as the ordinary path.
    // canRetry on an outcome with nothing to retry against gives the
    // screen a button that can only ever produce the same answer.
    expect: "...reported as no_backup, and NOT retryable",
    impl: build({
      NOBACKUP: `
  if (!snapshot.backup) {
    return done("gone", "no_backup", true, ["message bodies"]);
  }`,
    }),
  },
  {
    // Rule 4 merged into rule 5: an untouched box is run through unwrap
    // and comes back false, so the screen accuses the user of a wrong
    // phrase before they have typed anything. It also burns an unwrap
    // call -- an Argon2id derivation -- on every keystroke that clears
    // the field.
    //
    // Note the outcome this does NOT change: messages is still 'locked',
    // because unwrap returning false lands in the same state. Only the
    // reason moves, which is the entire user-visible difference -- and
    // the first draft of this case named the messages check and passed.
    // Removing one guard trips the reason, the three-spaces case and
    // the unwrap-call count; all three are that one change being seen
    // from three sides.
    expect: "...reported as awaiting_phrase",
    impl: build({
      PHRASE: `
  const phrase = config.normalise(attempt.phrase || "");`,
    }),
  },
  {
    // Emptiness tested on the RAW phrase instead of the normalised one,
    // so three spaces counts as an attempt. Same false accusation as
    // above, arriving from a stray keystroke rather than an empty box.
    expect: "...and three spaces is not an answer either",
    impl: build({
      PHRASE: `
  if (!attempt.phrase) {
    return done("locked", "awaiting_phrase", true, []);
  }
  const phrase = config.normalise(attempt.phrase);`,
    }),
  },
  {
    // Rule 7 skipped: the raw string goes to unwrap. Twelve words
    // copied off paper arrive with capitals and stray spaces, so a
    // CORRECT phrase is reported as a wrong one -- and the user, who
    // can see the words in front of them, concludes the app is broken
    // or that their backup is corrupt.
    expect: "the phrase as typed off paper opens the backup",
    impl: build({
      PHRASE: `
  const phrase = attempt.phrase || "";
  if (config.normalise(phrase).length === 0) {
    return done("locked", "awaiting_phrase", true, []);
  }`,
    }),
  },
  {
    // Rule 5, and the actively destructive one. A wrong phrase is
    // treated as proof the backup is unusable. The blob is still on the
    // server and the paper is still in a drawer, and the screen has
    // told them both are worthless.
    expect: "a wrong phrase is 'locked', never 'gone'",
    impl: build({
      UNWRAP: `
  if (!config.unwrap(snapshot.backup, phrase)) {
    return done("gone", "wrong_phrase", false, ["message bodies"]);
  }
  return done("readable", "ok", false, []);`,
    }),
  },
  {
    // Rule 8. The outcome is right and the field is not: a transient
    // 'locked' carries a permanent-sounding loss, so a screen that
    // renders lost announces a destroyed history over a phrase box the
    // user has not filled in yet.
    expect: "nothing is 'lost' while a state is still transient",
    impl: build({
      PHRASE: `
  const phrase = config.normalise(attempt.phrase || "");
  if (phrase.length === 0) {
    return done("locked", "awaiting_phrase", true, ["message bodies"]);
  }`,
    }),
  },
  {
    // Rule 7's other half: unwrap called twice, once to decide and once
    // to fetch the key. Each call is a full Argon2id derivation -- on a
    // phone, seconds of work and a visibly stalled screen, doubled for
    // no gain.
    expect: "unwrap is called at most once",
    impl: build({
      UNWRAP: `
  if (config.unwrap(snapshot.backup, phrase)) {
    const key = config.unwrap(snapshot.backup, phrase);
    return done("readable", "ok", false, []);
  }
  return done("locked", "wrong_phrase", true, []);`,
    }),
  },
];

export const stages = {
  restore: { alternatives, mistakes },
};
