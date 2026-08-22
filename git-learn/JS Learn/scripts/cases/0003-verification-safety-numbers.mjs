// Wrong-answer cases for c5/0003 — safetyNumber.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   MALFORMED — rule 1, and it checks BOTH keys
//   TOOSHORT  — rule 2, refuse rather than truncate further
//   ORDER     — rule 3, the canonical ordering. The whole lesson.
//   HASH      — rules 4 and 5, one call, no padding
//   GROUP     — rule 6
//
// The ORDER mistakes are the interesting ones: they produce a perfectly
// well-formed number that is simply different on the two devices, so
// every shape check passes and only the two-ended comparison catches
// them. That is exactly why that check is written first.

const FRAGMENTS = {
  MALFORMED: `
  if (!config.isWellFormed(myKey) || !config.isWellFormed(theirKey)) {
    return no("malformed");
  }`,

  TOOSHORT: `
  if (config.digits < config.minDigits) {
    return no("too_short");
  }`,

  ORDER: `
  const [first, second] = [myKey, theirKey].sort();`,

  HASH: `
  const raw = config.hash(first + second);
  if (raw.length < config.digits) {
    return no("hash_too_short");
  }
  const shown = raw.slice(0, config.digits);`,

  GROUP: `
  const groups = [];
  for (let i = 0; i < shown.length; i += config.groupSize) {
    groups.push(shown.slice(i, i + config.groupSize));
  }
  return { number: groups.join(" "), groups, reason: "ok" };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function safetyNumber(myKey, theirKey, config) {
  const no = (reason) => ({ number: null, groups: [], reason });
${f.MALFORMED}
${f.TOOSHORT}
${f.ORDER}
${f.HASH}
${f.GROUP}
}`;
}

const alternatives = [
  // The canonical order chosen by explicit comparison rather than sort().
  // Equivalent, and it is what someone writes who has been told sort()
  // mutates.
  build({
    ORDER: `
  const first = myKey < theirKey ? myKey : theirKey;
  const second = myKey < theirKey ? theirKey : myKey;`,
  }),

  // Grouping via a regex match, and the two refusals merged into one
  // guard with a computed reason. Same answers throughout.
  build({
    MALFORMED: `
  const badKey = !config.isWellFormed(myKey) || !config.isWellFormed(theirKey);
  const badLen = config.digits < config.minDigits;
  if (badKey || badLen) {
    return no(badKey ? "malformed" : "too_short");
  }`,
    TOOSHORT: ``,
    GROUP: `
  const groups = shown.match(new RegExp(".{1," + config.groupSize + "}", "g")) || [];
  return { number: groups.join(" "), groups, reason: "ok" };`,
  }),
];

const mistakes = [
  {
    // THE bug. Each device puts its own key first, so each hashes a
    // different string. Every shape check still passes -- the number is
    // 60 digits in 12 groups of 5 and looks perfect. It is simply a
    // different perfect number on each phone.
    expect: "both ends of the conversation see the SAME number",
    impl: build({
      ORDER: `
  const first = myKey;
  const second = theirKey;`,
    }),
  },
  {
    // The same bug wearing a tidier coat: join() on an unsorted array.
    // This is the one that survives a review where someone remembered
    // "we sort the keys" and checked that an array was involved.
    expect: "both ends of the conversation see the SAME number",
    impl: build({
      ORDER: `
  const [first, second] = [myKey, theirKey];`,
    }),
  },
  {
    // Sorts correctly and then hashes only the SMALLER key. Both ends
    // agree, so the headline check passes and the number looks entirely
    // right -- but it no longer depends on both keys, so every peer
    // whose key sorts after yours shows you the SAME number.
    //
    // This is the case that needed a fixture change to catch: two pairs
    // sharing a key is not enough, they have to share the SMALLER one.
    expect: "...and a different peer gives a different number",
    impl: build({
      ORDER: `
  const [first] = [myKey, theirKey].sort();
  const second = "";`,
    }),
  },
  {
    // Refusal replaced by silent truncation. Returns an 8-digit number
    // that an attacker can match by grinding keypairs, and shows it
    // with the same green tick as a real one.
    expect: "fewer digits than minDigits produces NO number",
    impl: build({ TOOSHORT: `` }),
  },
  {
    // Off by one on the floor: exactly minDigits is refused, so the
    // documented minimum is not actually usable. Harmless in Token,
    // which shows 60 -- and it means the constant does not mean what
    // it says, which is how the next person picks the wrong value.
    expect: "exactly minDigits is allowed",
    impl: build({
      TOOSHORT: `
  if (config.digits <= config.minDigits) {
    return no("too_short");
  }`,
    }),
  },
  {
    // A short hash is padded with zeros. Invents digits that carry no
    // information while making the number look full length -- the
    // too_short problem arriving through a different door.
    expect: "a hash shorter than requested produces no number",
    impl: build({
      HASH: `
  const raw = config.hash(first + second);
  const shown = raw.padEnd(config.digits, "0").slice(0, config.digits);`,
    }),
  },
  {
    // Only the peer's key is checked for well-formedness. A corrupt
    // LOCAL key then produces a number that matches nothing, and the
    // user is told they are under attack when their own device is at
    // fault.
    expect: "...and so does a malformed LOCAL key",
    impl: build({
      MALFORMED: `
  if (!config.isWellFormed(theirKey)) {
    return no("malformed");
  }`,
    }),
  },
  {
    // Rule 4: the hash is called twice, so the value that was length-
    // checked is not the value that is displayed.
    expect: "hash is called exactly once",
    impl: build({
      HASH: `
  if (config.hash(first + second).length < config.digits) {
    return no("hash_too_short");
  }
  const shown = config.hash(first + second).slice(0, config.digits);`,
    }),
  },
  {
    // Grouping walks by 1 instead of by groupSize, so every digit
    // becomes its own group. The joined number still contains the right
    // digits in the right order, just spaced wrongly -- which is why
    // this is caught by the group checks and not by the match check.
    expect: "60 digits come back as 12 groups",
    impl: build({
      GROUP: `
  const groups = [];
  for (let i = 0; i < shown.length; i += 1) {
    groups.push(shown.slice(i, i + config.groupSize));
  }
  return { number: groups.join(" "), groups, reason: "ok" };`,
    }),
  },
  {
    // number and groups disagree: the number is built from the raw
    // digits and the groups from the slices. A UI rendering one and a
    // QR encoding the other means the scan never matches the display.
    expect: "...joined by single spaces into number",
    impl: build({
      GROUP: `
  const groups = [];
  for (let i = 0; i < shown.length; i += config.groupSize) {
    groups.push(shown.slice(i, i + config.groupSize));
  }
  return { number: shown, groups, reason: "ok" };`,
    }),
  },
  {
    // A refusal carries a half-answer: groups is populated from a
    // number that was rejected. A caller rendering groups without
    // checking number shows a fragment of a safety number as if it
    // were one.
    expect: "every refusal returns an empty groups array",
    impl: build({
      MALFORMED: `
  if (!config.isWellFormed(myKey) || !config.isWellFormed(theirKey)) {
    return { number: null, groups: [String(theirKey).slice(0, 5)], reason: "malformed" };
  }`,
    }),
  },
];

export const stages = {
  safety: { alternatives, mistakes },
};
