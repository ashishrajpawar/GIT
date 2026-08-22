// Wrong-answer cases for c5/0001 — planKeyInit.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   FIRSTRUN — rule 1, the ONLY branch allowed to generate
//   UNREAD   — rules 2 and 3, a failed read is not an absent key
//   DECODE   — rules 4 and 7, decode once and judge the result
//   SIZE     — rule 5, the DECODED length
//   OK       — rule 6
//
// Note what most of these mistakes have in common: they widen the set of
// inputs that reach 'generate'. The self-check's last assertion counts
// that set directly — exactly one of nine inputs may generate — which is
// why several cases trip it as well as their specific check. That extra
// failure is inherent and is the point of the assertion.

const FRAGMENTS = {
  FIRSTRUN: `
  if (stored === null) {
    return { action: "generate", reason: "first_run", keyBytes: null };
  }`,

  UNREAD: `
  if (typeof stored !== "string" || stored === "") {
    return no("unreadable");
  }`,

  DECODE: `
  const bytes = config.decode(stored);
  if (bytes === null) {
    return no("not_base64");
  }`,

  SIZE: `
  if (bytes.length !== config.expectedBytes) {
    return no("wrong_size");
  }`,

  OK: `
  return { action: "reuse", reason: "ok", keyBytes: bytes };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function planKeyInit(stored, config) {
  const no = (reason) => ({ action: "refuse", reason, keyBytes: null });
${f.FIRSTRUN}
${f.UNREAD}
${f.DECODE}
${f.SIZE}
${f.OK}
}`;
}

const alternatives = [
  // A single guard expression instead of two, and the size test written
  // as a positive rather than a negative. Same answers throughout.
  build({
    UNREAD: `
  const unreadable = typeof stored !== "string" || stored.length === 0;
  if (unreadable) return no("unreadable");`,
    SIZE: `
  const rightSize = bytes.length === config.expectedBytes;
  if (!rightSize) return no("wrong_size");`,
  }),

  // Decodes into a descriptor first and returns from one place at the
  // end. Still exactly one decode call, which rule 7 requires.
  build({
    DECODE: `
  const decoded = { bytes: config.decode(stored) };
  if (decoded.bytes === null) return no("not_base64");
  const bytes = decoded.bytes;`,
  }),
];

const mistakes = [
  {
    // THE one. !stored is true for '' as well as null, so a locked
    // Keychain -- most launches from a notification -- generates a fresh
    // identity over a real key and destroys every message on the device.
    expect: "an empty string does NOT generate",
    impl: build({
      FIRSTRUN: `
  if (!stored) {
    return { action: "generate", reason: "first_run", keyBytes: null };
  }`,
    }),
  },
  {
    // == null instead of ===, so undefined joins the generate branch.
    // An undefined from the storage layer is an unexpected read, not an
    // absent key.
    expect: "undefined is refused, not generated",
    impl: build({
      FIRSTRUN: `
  if (stored == null) {
    return { action: "generate", reason: "first_run", keyBytes: null };
  }`,
    }),
  },
  {
    // The refuse branches are replaced by generate, which is the
    // "recover gracefully" instinct in its purest form. Every corrupt or
    // unreadable state now silently starts a new identity.
    expect: "exactly one input in nine may generate, and it is null",
    impl: build({
      UNREAD: `
  if (typeof stored !== "string" || stored === "") {
    return { action: "generate", reason: "first_run", keyBytes: null };
  }`,
    }),
  },
  {
    // Length used as validity. 44 characters of garbage is the right
    // LENGTH, so it passes and then fails at the first decrypt instead
    // of here -- with no indication of what went wrong.
    expect: "44 characters of garbage is refused",
    impl: build({
      DECODE: `
  if (stored.length !== 44) {
    return no("wrong_size");
  }
  const bytes = config.decode(stored);`,
    }),
  },
  {
    // The size check reads the STRING length rather than the decoded
    // length. Passes for well-formed input, which is what makes it
    // survive review, and rejects valid keys whose encoding differs.
    expect: "a good stored key is reused",
    impl: build({
      SIZE: `
  if (stored.length !== config.expectedBytes) {
    return no("wrong_size");
  }`,
    }),
  },
  {
    // Rule 7: decode called twice. The value that was validated is
    // discarded and a second, unvalidated decode is returned. Harmless
    // while the decoder is pure, and a real bug the moment it is not.
    expect: "decode is called at most once per input",
    impl: build({
      DECODE: `
  if (config.decode(stored) === null) {
    return no("not_base64");
  }
  const bytes = config.decode(stored);`,
    }),
  },
  {
    // A short but valid key is reported as not_base64 rather than
    // wrong_size, because the size check was folded into the decode
    // branch. Nothing is destroyed -- it is a diagnosis defect, and it
    // sends whoever debugs it looking for corruption instead of a
    // format migration.
    expect: "...reported as wrong_size",
    impl: build({
      DECODE: `
  const bytes = config.decode(stored);
  if (bytes === null || bytes.length !== config.expectedBytes) {
    return no("not_base64");
  }`,
      SIZE: ``,
    }),
  },
  {
    // Rule 7's other half: the base64 string is returned instead of the
    // validated bytes, so every caller decodes again -- after the point
    // where anything is checking.
    expect: "...with the DECODED bytes attached",
    impl: build({
      OK: `
  return { action: "reuse", reason: "ok", keyBytes: stored };`,
    }),
  },
  {
    // keyBytes left populated on a refusal. A caller that checks
    // keyBytes rather than action now proceeds with a key the function
    // just rejected.
    expect: "keyBytes is null on every non-reuse outcome",
    impl: build({
      SIZE: `
  if (bytes.length !== config.expectedBytes) {
    return { action: "refuse", reason: "wrong_size", keyBytes: bytes };
  }`,
    }),
  },
  {
    // A non-string is coerced rather than refused. String(12345) is
    // '12345', which decodes fine as base64 and is the wrong size -- so
    // this reports wrong_size for what is actually a storage-layer bug.
    expect: "...as unreadable, not as a corrupt key",
    impl: build({
      UNREAD: `
  if (stored === "") return no("unreadable");
  stored = String(stored);`,
    }),
  },
  {
    // The truncated-read case treated as first run. Distinct from the
    // '' case: this is a string of real key material that is simply
    // short, and the instinct is that a partial key is as good as none.
    expect: "a truncated read is refused, never regenerated",
    impl: build({
      SIZE: `
  if (bytes.length !== config.expectedBytes) {
    return { action: "generate", reason: "first_run", keyBytes: null };
  }`,
    }),
  },
];

export const stages = {
  init: { alternatives, mistakes },
};
