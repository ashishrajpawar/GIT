// Wrong-answer cases for c5/0005 — planEnvelopes.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   STALE    — rule 1, checked FIRST and on the right boundary
//   THEIRS   — rules 2 and 4, their active devices, and zero is a refusal
//   MINE     — rules 5 and 6, my other devices, and zero is fine
//   VALIDATE — rule 3, refuse rather than skip
//   BUILD    — rules 7 and 8, sorted, and empty on every refusal
//
// The mistake that matters most is the one in MINE that drops self
// devices entirely: it produces a completely well-formed plan, the send
// succeeds, the recipient gets the message, and the sender's own second
// device is missing their half of every conversation for ever. Only the
// first check catches it.
//
// Seven of the twelve trip more than one check, and each was run against
// the self-check alone to confirm the extras are inherent. They are, and
// for one reason: this function answers a single question about a set,
// so a change to how the set is built is visible from every state that
// set can be in. Keeping retired devices (mistake 2) trips three,
// because "retired" appears on both sides AND interacts with the
// validation rule -- one change, three vantage points, no coincidences.

const FRAGMENTS = {
  STALE: `
  if (config.now - recipient.fetchedAt > config.maxListAgeMs) {
    return no("stale_device_list", true);
  }`,

  THEIRS: `
  const theirs = active(recipient.devices);
  if (theirs.length === 0) {
    return no("no_recipient_devices", false);
  }`,

  MINE: `
  const mine = active(self.devices).filter((d) => d.deviceId !== self.thisDeviceId);`,

  VALIDATE: `
  const all = theirs.concat(mine);
  if (all.some((d) => !config.isWellFormed(d.publicKey))) {
    return no("malformed_key", false);
  }`,

  BUILD: `
  const envelopes = all
    .map((d) => ({ deviceId: d.deviceId, publicKey: d.publicKey, keyVersion: d.keyVersion }))
    .sort((a, b) => (a.deviceId < b.deviceId ? -1 : a.deviceId > b.deviceId ? 1 : 0));
  return { envelopes, reason: "ok", canRetry: false };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function planEnvelopes(recipient, self, config) {
  const no = (reason, canRetry) => ({ envelopes: [], reason, canRetry });
  const active = (list) => (list || []).filter((d) => d.retiredAt === null || d.retiredAt === undefined);
${f.STALE}
${f.THEIRS}
${f.MINE}
${f.VALIDATE}
${f.BUILD}
}`;
}

const alternatives = [
  // Builds the two halves with explicit loops and sorts with localeCompare.
  // Same answers throughout.
  build({
    MINE: `
  const mine = [];
  for (const d of active(self.devices)) {
    if (d.deviceId !== self.thisDeviceId) mine.push(d);
  }`,
    BUILD: `
  const envelopes = all
    .map((d) => ({ deviceId: d.deviceId, publicKey: d.publicKey, keyVersion: d.keyVersion }))
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  return { envelopes, reason: "ok", canRetry: false };`,
  }),

  // Expresses staleness as an age and the freshness bound as >=, which is
  // the same boundary said the other way round. Validates with every()
  // rather than some().
  build({
    STALE: `
  const ageMs = config.now - recipient.fetchedAt;
  if (!(ageMs <= config.maxListAgeMs)) {
    return no("stale_device_list", true);
  }`,
    VALIDATE: `
  const all = theirs.concat(mine);
  if (!all.every((d) => config.isWellFormed(d.publicKey))) {
    return no("malformed_key", false);
  }`,
  }),
];

const mistakes = [
  {
    // THE bug. Self devices dropped entirely. The plan is perfectly
    // well-formed -- correct recipient, sorted, valid keys -- and the
    // sender's own tablet never sees a word they wrote. Nothing errors,
    // and no copy exists afterwards that could be used to repair it.
    expect: "my own OTHER device gets an envelope",
    impl: build({ MINE: `
  const mine = [];` }),
  },
  {
    // Self devices included, but the sending device is not excluded, so
    // it is sealed an envelope for a plaintext it already holds. Mild,
    // and it doubles the payload on every single-recipient message.
    expect: "...and the device I am sending FROM does not",
    impl: build({
      MINE: `
  const mine = active(self.devices);`,
    }),
  },
  {
    // Retired devices kept on the recipient's side. c5/0002's argument:
    // a key is often retired BECAUSE it was compromised, so this seals
    // the message to the one key most likely to be in someone else's
    // hands -- while looking like generosity.
    expect: "a retired device of THEIRS gets no envelope",
    impl: build({
      THEIRS: `
  const theirs = recipient.devices || [];
  if (theirs.length === 0) {
    return no("no_recipient_devices", false);
  }`,
    }),
  },
  {
    // The same omission on my own side.
    expect: "...and so does a retired device of MINE",
    impl: build({
      MINE: `
  const mine = (self.devices || []).filter((d) => d.deviceId !== self.thisDeviceId);`,
    }),
  },
  {
    // Rule 4 dropped. An empty recipient list maps to an empty array,
    // so the message is sealed to nobody -- except that MY devices are
    // still in the list, so it returns envelopes and reports ok. The
    // send looks entirely successful and the recipient never existed.
    expect: "...reported as no_recipient_devices, and not retryable",
    impl: build({
      THEIRS: `
  const theirs = active(recipient.devices);`,
    }),
  },
  {
    // Emptiness checked AFTER combining, so my own devices satisfy a
    // rule that is about the recipient. Passes whenever I have a second
    // device, which is exactly the case multi-device exists for.
    expect: "...and my own devices do not satisfy it",
    impl: build({
      THEIRS: `
  const theirs = active(recipient.devices);`,
      VALIDATE: `
  const all = theirs.concat(mine);
  if (all.length === 0) {
    return no("no_recipient_devices", false);
  }
  if (all.some((d) => !config.isWellFormed(d.publicKey))) {
    return no("malformed_key", false);
  }`,
    }),
  },
  {
    // Staleness never checked. A list fetched an hour ago is trusted,
    // so a device the recipient added since receives nothing and its
    // owner never learns a message existed.
    expect: "a device list older than maxListAgeMs is refused",
    impl: build({ STALE: `` }),
  },
  {
    // Off by one on the boundary: exactly maxListAgeMs is refused, so
    // the documented threshold is not actually usable. Harmless in
    // effect and it means the constant does not mean what it says.
    expect: "exactly maxListAgeMs old is still fresh",
    impl: build({
      STALE: `
  if (config.now - recipient.fetchedAt >= config.maxListAgeMs) {
    return no("stale_device_list", true);
  }`,
    }),
  },
  {
    // Staleness checked LAST. Every earlier refusal now outranks it, so
    // a stale fetch that happens to show no devices is reported as
    // no_recipient_devices -- a fact the function never established,
    // pointing the caller at the recipient's setup instead of their own
    // refetch.
    expect: "staleness is decided before the device list is even looked at",
    impl: build({
      STALE: ``,
      BUILD: `
  if (config.now - recipient.fetchedAt > config.maxListAgeMs) {
    return no("stale_device_list", true);
  }
  const envelopes = all
    .map((d) => ({ deviceId: d.deviceId, publicKey: d.publicKey, keyVersion: d.keyVersion }))
    .sort((a, b) => (a.deviceId < b.deviceId ? -1 : a.deviceId > b.deviceId ? 1 : 0));
  return { envelopes, reason: "ok", canRetry: false };`,
    }),
  },
  {
    // Malformed keys skipped rather than refused. A device the
    // recipient is still using is silently dropped, and a shorter
    // envelope list looks exactly like a smaller device list.
    expect: "a malformed key refuses the whole send",
    impl: build({
      VALIDATE: `
  const all = theirs.concat(mine).filter((d) => config.isWellFormed(d.publicKey));`,
    }),
  },
  {
    // Validation moved BEFORE the retirement filter, so a corrupt key
    // on a device nobody is sealing to blocks the send. Refusing too
    // much rather than too little -- safe, and it makes a retired
    // device able to break a working conversation for ever.
    expect: "...but a malformed key on a RETIRED device is nobody's problem",
    impl: build({
      THEIRS: `
  if ((recipient.devices || []).some((d) => !config.isWellFormed(d.publicKey))) {
    return no("malformed_key", false);
  }
  const theirs = active(recipient.devices);
  if (theirs.length === 0) {
    return no("no_recipient_devices", false);
  }`,
    }),
  },
  {
    // Unsorted. Every envelope is correct and the order comes from the
    // concatenation, so two sends of the same message to the same
    // devices can differ -- which makes the output uncomparable rather
    // than wrong, and an uncomparable output is how a regression stays
    // invisible.
    expect: "envelopes come back sorted by deviceId",
    impl: build({
      BUILD: `
  const envelopes = all.map((d) => ({
    deviceId: d.deviceId, publicKey: d.publicKey, keyVersion: d.keyVersion,
  }));
  return { envelopes, reason: "ok", canRetry: false };`,
    }),
  },
];

export const stages = {
  fanout: { alternatives, mistakes },
};
