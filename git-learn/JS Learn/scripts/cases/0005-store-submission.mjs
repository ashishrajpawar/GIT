// Wrong-answer cases for a11/0005 — planRelease.
//
// Built the a11/0003 way: one correct implementation split into named
// fragments, and each mistake overrides exactly ONE of them. That makes a
// case single-variable by construction rather than by care.
//
// The fragments:
//   NONE     — rule 1, the nothing-changed guard
//   REASONS  — rule 2, the four forcing conditions and their order
//   OTA      — rule 3, what an over-the-air release does to the numbers
//   VERSION  — rule 6, which of three ways the version changes
//   BUILDNO  — rule 5, the iOS counter that resets
//   CODE     — rule 4, the Android counter that never does
//   BUMP     — the patch arithmetic
//
// Six of the twelve trip more than one check, and every one of those is
// INHERENT: the channel is decided first, so a mistake that gets it wrong
// makes everything downstream of "this is a build" wrong too. That is one
// behavioural change with several consequences, which is allowed. What is
// not allowed — and what had to be fixed in b10/0002 — is a case that also
// fails for a reason unrelated to the distinction it tests. Each case here
// was run against the self-check individually to confirm which is which.

const FRAGMENTS = {
  NONE: `
  if (!touchesJs && !touchesNative) {
    return { channel: "none", next: null, reasons: [] };
  }`,

  REASONS: `
  if (touchesNative) reasons.push("native code changed");
  if (change.touchesCrypto === true) reasons.push("key handling ships as a reviewed build");
  if (change.changesPrimaryPurpose === true) reasons.push("a change of primary purpose needs review");
  if (wantsVersion) reasons.push("a new version number is a new binary");`,

  OTA: `
    return {
      channel: "ota",
      next: {
        version: current.version,
        buildNumber: current.buildNumber,
        versionCode: current.versionCode,
      },
      reasons: [],
    };`,

  VERSION: `
  let version = current.version;
  if (wantsVersion) {
    version = change.nextVersion;
  } else if (touchesNative) {
    version = bumpPatch(current.version);
  }`,

  BUILDNO: `version === current.version ? current.buildNumber + 1 : 1`,

  CODE: `current.versionCode + 1`,

  BUMP: `
  const parts = version.split(".");
  const patch = Number(parts[2]) + 1;
  return parts[0] + "." + parts[1] + "." + patch;`,
};

// The one place the shape of planRelease lives. Everything else overrides
// a fragment inside it.
function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function planRelease(change, current) {
  const touchesJs = change.touchesJs === true;
  const touchesNative = change.touchesNative === true;
${f.NONE}

  const reasons = [];
  const wantsVersion =
    typeof change.nextVersion === "string" &&
    change.nextVersion !== current.version;
${f.REASONS}

  if (reasons.length === 0) {
${f.OTA}
  }
${f.VERSION}

  return {
    channel: "build",
    next: {
      version,
      buildNumber: ${f.BUILDNO},
      versionCode: ${f.CODE},
    },
    reasons,
  };
}

function bumpPatch(version) {
${f.BUMP}
}`;
}

const alternatives = [
  // Same behaviour, written as a lookup table rather than four ifs. The
  // order still has to come out right, which is the point.
  build({
    REASONS: `
  const forcing = [
    [touchesNative, "native code changed"],
    [change.touchesCrypto === true, "key handling ships as a reviewed build"],
    [change.changesPrimaryPurpose === true, "a change of primary purpose needs review"],
    [wantsVersion, "a new version number is a new binary"],
  ];
  for (const [applies, text] of forcing) if (applies) reasons.push(text);`,
  }),

  // Spreads current instead of listing the three fields, and derives the
  // patch bump with map/join. Both are stylistic; neither changes an answer.
  build({
    OTA: `
    return { channel: "ota", next: { ...current }, reasons: [] };`,
    BUMP: `
  return version
    .split(".")
    .map((part, i) => (i === 2 ? Number(part) + 1 : part))
    .join(".");`,
  }),
];

const mistakes = [
  {
    // The headline bug from the broken playground. Reads as tidy symmetry:
    // a new version, so start both counters fresh.
    expect: "...but versionCode still increments, never resets",
    impl: build({ CODE: `version === current.version ? current.versionCode + 1 : 1` }),
  },
  {
    // The mirror: treating versionCode's rule as universal, so the iOS
    // counter never resets either. Harmless on Play, and Apple will not
    // take a buildNumber that skipped its version's sequence.
    expect: "a version change resets buildNumber to 1",
    impl: build({ BUILDNO: `current.buildNumber + 1` }),
  },
  {
    // String concatenation instead of arithmetic. Invisible for the first
    // nine patches of any minor version, which is exactly long enough to
    // reach production.
    expect: '...and the patch is a NUMBER: 1.0.9 becomes 1.0.10',
    impl: build({
      BUMP: `
  const parts = version.split(".");
  return parts[0] + "." + parts[1] + "." + (parts[2] + 1);`,
    }),
  },
  {
    // The version-number trap: nextVersion is honoured but is not treated
    // as a forcing condition, so it ships over the air to nobody.
    expect: "asking for a new version number forces a build",
    impl: build({
      REASONS: `
  if (touchesNative) reasons.push("native code changed");
  if (change.touchesCrypto === true) reasons.push("key handling ships as a reviewed build");
  if (change.changesPrimaryPurpose === true) reasons.push("a change of primary purpose needs review");`,
    }),
  },
  {
    // Crypto is plain JavaScript, so an implementation written from
    // "can this ship as JS?" lets it out over the air. The code is right
    // and the policy is missing.
    expect: "a JS-only crypto change still needs a build",
    impl: build({
      REASONS: `
  if (touchesNative) reasons.push("native code changed");
  if (change.changesPrimaryPurpose === true) reasons.push("a change of primary purpose needs review");
  if (wantsVersion) reasons.push("a new version number is a new binary");`,
    }),
  },
  {
    // The OTA bumps the version "so users can see they got the fix",
    // which is the single change that stops them getting it.
    expect: "an OTA leaves version alone",
    impl: build({
      OTA: `
    return {
      channel: "ota",
      next: {
        version: bumpPatch(current.version),
        buildNumber: current.buildNumber,
        versionCode: current.versionCode,
      },
      reasons: [],
    };`,
    }),
  },
  {
    // An OTA is treated as a release like any other, so it burns a
    // versionCode Play never saw. Nothing breaks today; the numbers just
    // drift away from what was actually uploaded.
    expect: "an OTA leaves versionCode alone",
    impl: build({
      OTA: `
    return {
      channel: "ota",
      next: {
        version: current.version,
        buildNumber: current.buildNumber,
        versionCode: current.versionCode + 1,
      },
      reasons: [],
    };`,
    }),
  },
  {
    // Rule 1 missing: an empty change falls through to the OTA branch and
    // publishes a bundle identical to the one already running.
    expect: "no change at all is 'none', not 'ota'",
    impl: build({ NONE: `` }),
  },
  {
    // Re-derives "did the version change" from the flags instead of
    // comparing the answer, and remembers only touchesNative. So a
    // release renamed to 1.1.0 keeps counting buildNumbers from the old
    // version's sequence.
    expect: "...resetting buildNumber, because the version changed",
    impl: build({ BUILDNO: `touchesNative ? 1 : current.buildNumber + 1` }),
  },
  {
    // Order swapped in the reasons list. The channel is still right, so
    // this one is only caught by the check that reads the whole array --
    // which is why that check exists.
    expect: "every forcing condition is reported, in order",
    impl: build({
      REASONS: `
  if (change.touchesCrypto === true) reasons.push("key handling ships as a reviewed build");
  if (touchesNative) reasons.push("native code changed");
  if (change.changesPrimaryPurpose === true) reasons.push("a change of primary purpose needs review");
  if (wantsVersion) reasons.push("a new version number is a new binary");`,
    }),
  },
  {
    // A nextVersion equal to the current one is treated as a request
    // rather than a no-op, so re-stating the version you are already on
    // turns a JS fix into a store round-trip.
    expect: "a nextVersion EQUAL to the current one is not a reason",
    impl: build({
      REASONS: `
  if (touchesNative) reasons.push("native code changed");
  if (change.touchesCrypto === true) reasons.push("key handling ships as a reviewed build");
  if (change.changesPrimaryPurpose === true) reasons.push("a change of primary purpose needs review");
  if (typeof change.nextVersion === "string") reasons.push("a new version number is a new binary");`,
    }),
  },
  {
    // Rule 7. Writes the new numbers back into the object it was handed,
    // so the caller's config is edited by a function that was asked to
    // plan. Checked in its own block because it can throw on a frozen
    // input rather than returning a wrong answer.
    //
    // This one also trips both buildNumber checks, and DO NOT "fix" that:
    // the cascade is the lesson. Assigning to current.version before the
    // return object is evaluated corrupts `version === current.version`,
    // which is the exact comparison rule 5 depends on — so the mutation
    // breaks the caller AND silently breaks the function's own arithmetic.
    // That is why hint 3 says to compare against current.version rather
    // than re-derive the answer from the flags.
    expect: "planRelease does not mutate current",
    impl: build({
      VERSION: `
  let version = current.version;
  if (wantsVersion) {
    version = change.nextVersion;
  } else if (touchesNative) {
    version = bumpPatch(current.version);
  }
  current.version = version;`,
    }),
  },
];

export const stages = {
  release: { alternatives, mistakes },
};
