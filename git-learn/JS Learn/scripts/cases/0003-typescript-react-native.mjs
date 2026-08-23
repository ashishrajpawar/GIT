// Wrong-answer cases for a2/0003 — readRouteParams.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   SOURCE  — rule 1, undefined params are the ordinary case
//   PRESENT — rules 2 and 3, absent required vs absent optional
//   NUMBER  — rule 4, a deep link is text
//   BOOLEAN — rule 5, 'false' is truthy
//   STRING  — rule 6, no String()
//   RETURN  — rule 8
//
// Every mistake here is a coercion that answers a different question
// from the one being asked. Number(), Boolean() and String() all say
// "what would this be if it were one" -- and validation asks "is this
// one". They never throw, so each of these produces a screen that opens
// on the wrong token, or opens with a setting inverted, and reports
// nothing.

const FRAGMENTS = {
  SOURCE: `
  const source = raw === undefined || raw === null ? {} : raw;`,

  PRESENT: `
    const present = Object.prototype.hasOwnProperty.call(source, name)
      && source[name] !== undefined;
    if (!present) {
      if (required) return no("missing", name);
      continue;
    }`,

  NUMBER: `
    if (type === "number") {
      if (typeof value === "number") {
        if (!Number.isFinite(value)) return no("invalid", name);
        params[name] = value;
      } else if (typeof value === "string" && /^-?\\d+$/.test(value)) {
        params[name] = Number(value);
      } else {
        return no("invalid", name);
      }
      continue;
    }`,

  BOOLEAN: `
    if (type === "boolean") {
      if (typeof value === "boolean") params[name] = value;
      else if (value === "true") params[name] = true;
      else if (value === "false") params[name] = false;
      else return no("invalid", name);
      continue;
    }`,

  STRING: `
    if (typeof value !== "string") return no("invalid", name);
    params[name] = value;`,

  RETURN: `
  return { ok: true, params, reason: "ok", field: null };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function readRouteParams(raw, spec) {
  const no = (reason, field) => ({ ok: false, params: {}, reason, field });
${f.SOURCE}
  const params = {};
  for (const { name, type, required } of spec) {
${f.PRESENT}
    const value = source[name];
${f.NUMBER}
${f.BOOLEAN}
${f.STRING}
  }
${f.RETURN}
}`;
}

const alternatives = [
  // Uses a lookup of per-type parsers rather than a chain of ifs, and
  // `in` for presence. Same answers throughout.
  build({
    NUMBER: `
    const parsers = {
      number: (v) => {
        if (typeof v === "number") return Number.isFinite(v) ? { ok: true, v } : { ok: false };
        if (typeof v === "string" && /^-?\\d+$/.test(v)) return { ok: true, v: Number(v) };
        return { ok: false };
      },
      boolean: (v) => {
        if (typeof v === "boolean") return { ok: true, v };
        if (v === "true") return { ok: true, v: true };
        if (v === "false") return { ok: true, v: false };
        return { ok: false };
      },
      string: (v) => (typeof v === "string" ? { ok: true, v } : { ok: false }),
    };
    const parsed = parsers[type](value);
    if (!parsed.ok) return no("invalid", name);
    params[name] = parsed.v;
    continue;`,
    BOOLEAN: ``,
    STRING: ``,
  }),

  // Expresses the integer test with Number.isInteger on a converted
  // value, guarded by a trim-and-non-empty check -- the other natural
  // way to write rule 4, and equivalent for every input here.
  build({
    NUMBER: `
    if (type === "number") {
      if (typeof value === "number") {
        if (!Number.isInteger(value)) return no("invalid", name);
        params[name] = value;
      } else if (typeof value === "string" && value.trim() === value && value !== "" && Number.isInteger(Number(value))) {
        params[name] = Number(value);
      } else {
        return no("invalid", name);
      }
      continue;
    }`,
  }),
];

const mistakes = [
  {
    // THE bug. Number() used as a validator. It answers "what would
    // this be" and the question is "is this one" -- so '' and '   '
    // both become 0, which is a real token id, and the screen opens on
    // whatever token 0 resolves to instead of refusing.
    expect: "an empty string is NOT zero",
    impl: build({
      NUMBER: `
    if (type === "number") {
      const n = Number(value);
      if (Number.isNaN(n)) return no("invalid", name);
      params[name] = n;
      continue;
    }`,
    }),
  },
  {
    // parseInt, which reads a PREFIX. '7x' becomes 7 and '7.5' becomes
    // 7, so a mistyped or truncated deep link opens a real token that
    // is not the one in the URL -- the worst outcome available here,
    // because it succeeds.
    expect: "...and a numeric PREFIX is not a number",
    impl: build({
      NUMBER: `
    if (type === "number") {
      const n = parseInt(value, 10);
      if (Number.isNaN(n)) return no("invalid", name);
      params[name] = n;
      continue;
    }`,
    }),
  },
  {
    // Rule 4 for a real number that is NaN. NaN is typeof "number", so
    // a check on the type alone lets it through -- and NaN compares
    // false against everything, so the screen queries for token NaN and
    // renders an empty state that looks like "no such token".
    expect: "...nor NaN arriving as a real number",
    impl: build({
      NUMBER: `
    if (type === "number") {
      if (typeof value === "number") {
        params[name] = value;
      } else if (typeof value === "string" && /^-?\\d+$/.test(value)) {
        params[name] = Number(value);
      } else {
        return no("invalid", name);
      }
      continue;
    }`,
    }),
  },
  {
    // Rule 5, and the one nobody sees coming: Boolean('false') is true,
    // because a non-empty string is truthy. A deep link that explicitly
    // says fromDeepLink=false arrives as true, and the setting is
    // inverted with no error anywhere.
    expect: "the string 'false' becomes the boolean false",
    impl: build({
      BOOLEAN: `
    if (type === "boolean") {
      params[name] = Boolean(value);
      continue;
    }`,
    }),
  },
  {
    // Rule 6: String() applied to whatever arrived, so a number where a
    // string was declared becomes "3" and passes. A boundary that
    // converts instead of checking has stopped being a boundary -- it
    // makes every wrong type look right, which is precisely backwards.
    expect: "a number where a string is expected is invalid",
    impl: build({
      STRING: `
    params[name] = String(value);`,
    }),
  },
  {
    // Rule 1: raw undefined treated as a failure. A screen with no
    // required params, reached with no params, is the ordinary case --
    // and this refuses to open it.
    expect: "undefined params with nothing required is fine",
    impl: build({
      SOURCE: `
  if (raw === undefined || raw === null) return no("missing", null);
  const source = raw;`,
    }),
  },
  {
    // Rules 2 and 3 merged: a missing OPTIONAL param written into
    // params as undefined. The screen's `'highlight' in params` test
    // now says yes to a param nobody supplied, and `?? 'default'`
    // still works -- so the two disagree about the same value.
    expect: "a missing OPTIONAL param is simply absent",
    impl: build({
      PRESENT: `
    const present = Object.prototype.hasOwnProperty.call(source, name)
      && source[name] !== undefined;
    if (!present) {
      if (required) return no("missing", name);
      params[name] = undefined;
      continue;
    }`,
    }),
  },
  {
    // Rule 2 softened: a missing required param defaulted rather than
    // refused. There is no safe token id to guess, and 0 is what every
    // "safe default" reaches for -- so the detail screen opens on a
    // token the user did not choose.
    expect: "a missing REQUIRED param is refused",
    impl: build({
      PRESENT: `
    const present = Object.prototype.hasOwnProperty.call(source, name)
      && source[name] !== undefined;
    if (!present) {
      if (required && type === "number") { params[name] = 0; continue; }
      if (required) return no("missing", name);
      continue;
    }`,
    }),
  },
  {
    // Rule 7 inverted: params copied from raw's keys rather than built
    // from the spec, so a legacyTokenCode written by an older build is
    // carried into the screen -- a field this version has no idea about,
    // and in this case a token code, restored from disk.
    expect: "a param not in the spec is dropped silently",
    impl: build({
      RETURN: `
  return { ok: true, params: { ...source, ...params }, reason: "ok", field: null };`,
    }),
  },
  {
    // Rule 8: the refusal carries the params validated before the
    // failure. A caller that renders on `params.tokenId` without
    // checking `ok` gets a partial answer that looks complete.
    // Note where the leak has to be for the check to see it: on a
    // param that fails AFTER an earlier one succeeded. A leaky refusal
    // on the FIRST param returns an empty object anyway, because
    // nothing has been accumulated yet -- which is how the first draft
    // of this case passed everything.
    expect: "...and a refusal carries no half-answer",
    impl: build({
      STRING: `
    if (typeof value !== "string") {
      return { ok: false, params, reason: "invalid", field: name };
    }
    params[name] = value;`,
    }),
  },
];

export const stages = {
  params: { alternatives, mistakes },
};
