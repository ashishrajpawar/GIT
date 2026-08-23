// Wrong-answer cases for a9/0002 — parseTokenLink.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   ORIGIN   — rule 1, which links are OURS. The security-relevant half
//   PATH     — rules 2 and 3, a prefix rather than a search
//   CANON    — rule 4, three spellings of one code
//   ALPHABET — rule 5, refuse rather than remap
//   LENGTH   — rules 6 and 7
//
// Two of these are bugs this lesson actually shipped: the unanchored
// replace('t/', '') that the prose spent months describing correctly and
// the code got wrong, and the endsWith host check that looks like a host
// check and is a suffix test.

const PRELUDE = `
const no = (reason) => ({ code: null, reason });
`;

const FRAGMENTS = {
  ORIGIN: `
  let path = null;
  const httpsMatch = /^https:\\/\\/([^/?#]+)(\\/.*)?$/i.exec(url);
  const schemeMatch = new RegExp("^" + config.scheme + ":\\\\/\\\\/(.*)$", "i").exec(url);
  if (httpsMatch) {
    const host = httpsMatch[1].toLowerCase();
    if (!config.hosts.includes(host)) return no("not_a_token_link");
    path = (httpsMatch[2] || "").replace(/^\\//, "");
  } else if (schemeMatch) {
    path = schemeMatch[1];
  } else {
    return no("not_a_token_link");
  }`,

  PATH: `
  path = path.split("?")[0].split("#")[0];
  if (!path.startsWith("t/")) return no("not_a_token_link");
  const raw = path.slice(2);`,

  CANON: `
  const canonical = raw.replace(/[\\s-]/g, "").toUpperCase();`,

  ALPHABET: `
  for (const ch of canonical) {
    if (!config.alphabet.includes(ch)) return no("malformed_code");
  }`,

  LENGTH: `
  if (canonical.length !== config.groups * config.groupSize) {
    return no("malformed_code");
  }
  return { code: canonical, reason: "ok" };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `${PRELUDE}
function parseTokenLink(url, config) {
  if (typeof url !== "string" || url.length === 0) return no("not_a_token_link");
${f.ORIGIN}
${f.PATH}
${f.CANON}
${f.ALPHABET}
${f.LENGTH}
}`;
}

const alternatives = [
  // Splits the origin off by hand instead of by regex, and tests the
  // alphabet with a precompiled character set. Same answers throughout.
  build({
    ORIGIN: `
  let path = null;
  const lower = url.toLowerCase();
  if (lower.startsWith("https://")) {
    const rest = url.slice("https://".length);
    const slash = rest.search(/[/?#]/);
    const host = (slash === -1 ? rest : rest.slice(0, slash)).toLowerCase();
    if (!config.hosts.includes(host)) return no("not_a_token_link");
    path = slash === -1 ? "" : rest.slice(slash).replace(/^\\//, "");
  } else if (lower.startsWith(config.scheme.toLowerCase() + "://")) {
    path = url.slice(config.scheme.length + 3);
  } else {
    return no("not_a_token_link");
  }`,
    ALPHABET: `
  const allowed = new Set(config.alphabet.split(""));
  if (![...canonical].every((ch) => allowed.has(ch))) return no("malformed_code");`,
  }),

  // Validates with one anchored regex built from the alphabet, which
  // folds rules 5 and 6 into a single test. Equivalent.
  build({
    ALPHABET: ``,
    LENGTH: `
  const width = config.groups * config.groupSize;
  const shape = new RegExp("^[" + config.alphabet + "]{" + width + "}$");
  if (!shape.test(canonical)) return no("malformed_code");
  return { code: canonical, reason: "ok" };`,
  }),
];

const mistakes = [
  {
    // THE bug this lesson shipped, and its prose described correctly for
    // months while the code did the other thing. replace() with a string
    // argument removes the FIRST match ANYWHERE -- a search, not a prefix
    // strip -- so /settings/t/CODE loses the 't/' from 'settings' and
    // returns a code-shaped fragment of the wrong path.
    expect: "...and neither is a /t/ buried further along the path",
    impl: build({
      PATH: `
  path = path.split("?")[0].split("#")[0];
  if (path.indexOf("t/") === -1) return no("not_a_token_link");
  const raw = path.replace("t/", "");`,
    }),
  },
  {
    // A host check that is a suffix test. 'nottokn.app'.endsWith('tokn.app')
    // is true, so anyone who can register a domain ending in yours picks
    // which conversation the app opens.
    expect: "...nor a host that merely ends with ours",
    impl: build({
      ORIGIN: `
  let path = null;
  const httpsMatch = /^https:\\/\\/([^/?#]+)(\\/.*)?$/i.exec(url);
  const schemeMatch = new RegExp("^" + config.scheme + ":\\\\/\\\\/(.*)$", "i").exec(url);
  if (httpsMatch) {
    const host = httpsMatch[1].toLowerCase();
    if (!config.hosts.some((h) => host.endsWith(h))) return no("not_a_token_link");
    path = (httpsMatch[2] || "").replace(/^\\//, "");
  } else if (schemeMatch) {
    path = schemeMatch[1];
  } else {
    return no("not_a_token_link");
  }`,
    }),
  },
  {
    // No host check at all: any https URL with a /t/ path is accepted.
    // The commonest version, because it works perfectly in testing --
    // every URL you try is your own.
    expect: "an https link from another host is not our link",
    impl: build({
      ORIGIN: `
  let path = null;
  const httpsMatch = /^https:\\/\\/([^/?#]+)(\\/.*)?$/i.exec(url);
  const schemeMatch = new RegExp("^" + config.scheme + ":\\\\/\\\\/(.*)$", "i").exec(url);
  if (httpsMatch) {
    path = (httpsMatch[2] || "").replace(/^\\//, "");
  } else if (schemeMatch) {
    path = schemeMatch[1];
  } else {
    return no("not_a_token_link");
  }`,
    }),
  },
  {
    // Query string left on the end of the code. The code then fails the
    // alphabet test, so the user is told their code is malformed when
    // the real problem is a URL nobody trimmed -- a correct-looking
    // error pointing at the wrong thing.
    expect: "a query string is not part of the code",
    impl: build({
      PATH: `
  if (!path.startsWith("t/")) return no("not_a_token_link");
  const raw = path.slice(2);`,
    }),
  },
  {
    // Hyphens not stripped, so the printed form of every code fails.
    // Works flawlessly against the undashed form a QR produces, and
    // fails for every human who typed what was on the card.
    expect: "...as is a lowercase one",
    impl: build({
      CANON: `
  const canonical = raw;`,
    }),
  },
  {
    // Case not folded. The dashes go, so the QR path works and
    // 'merc-8gh2-kp4x' does not -- and lowercase is what a phone
    // keyboard offers first.
    expect: "...as is a lowercase one",
    impl: build({
      CANON: `
  const canonical = raw.replace(/[\\s-]/g, "");`,
    }),
  },
  {
    // Unknown characters STRIPPED rather than refused, which is what
    // "be liberal in what you accept" turns into here. It is the worst
    // mistake in this file: MERC-8GH2-KP4OX loses its O and becomes
    // MERC8GH2KP4X -- a perfectly valid code that belongs to somebody
    // else. Refusing gives the user an error; this gives them another
    // person's conversation.
    //
    // Worth knowing why the ADJACENT mistake is not a mistake: mapping
    // O to 0 and I/L to 1, the "helpful" fix everyone reaches for, is a
    // no-op here, because 0 and 1 are excluded from the alphabet too.
    // Every character it maps FROM is invalid and every character it
    // maps TO is invalid, so the code is refused either way. That is
    // not luck -- it is why the excluded set is closed under confusion.
    expect: "...and an excluded character is not quietly dropped",
    impl: build({
      CANON: `
  const canonical = raw
    .replace(/[\\s-]/g, "")
    .toUpperCase()
    .split("")
    .filter((ch) => config.alphabet.includes(ch))
    .join("");`,
    }),
  },
  {
    // Alphabet not checked at all, so any twelve characters pass -- an
    // underscore, a digit 0, anything. The server's codeHashInput will
    // refuse it, one network round trip later, as a code that does not
    // exist -- so the user is told the token does not exist when what
    // actually happened is that they mistyped it.
    expect: "a code containing an excluded letter is refused",
    impl: build({ ALPHABET: `` }),
  },
  {
    // Truncates to the first twelve instead of refusing a long one, so
    // a thirteen-character typo silently becomes a DIFFERENT valid
    // code -- the worst outcome available here, because it may belong
    // to somebody.
    expect: "thirteen characters is not a code either",
    impl: build({
      LENGTH: `
  const width = config.groups * config.groupSize;
  if (canonical.length < width) return no("malformed_code");
  return { code: canonical.slice(0, width), reason: "ok" };`,
    }),
  },
  {
    // Rule 7 collapsed: every failure reported as not_a_token_link. The
    // app then hands a link that WAS for it back to the OS, which opens
    // the browser, which opens the web page, which asks the same
    // question again -- and the user sees a round trip instead of a
    // message.
    expect: "our link with a bad code is malformed_code, not not_a_token_link",
    impl: build({
      ALPHABET: `
  for (const ch of canonical) {
    if (!config.alphabet.includes(ch)) return no("not_a_token_link");
  }`,
      LENGTH: `
  if (canonical.length !== config.groups * config.groupSize) {
    return no("not_a_token_link");
  }
  return { code: canonical, reason: "ok" };`,
    }),
  },
  {
    // A bare /t treated as a token link with an empty code, which then
    // fails on length -- so the reason is malformed_code where it
    // should be not_a_token_link. Same collapse as above, from the
    // other direction.
    expect: "...and a bare /t is not one either",
    impl: build({
      PATH: `
  path = path.split("?")[0].split("#")[0];
  if (!path.startsWith("t")) return no("not_a_token_link");
  const raw = path.replace(/^t\\/?/, "");`,
    }),
  },
];

export const stages = {
  link: { alternatives, mistakes },
};
