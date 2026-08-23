// Wrong-answer cases for a2/0001 — isToken.
//
// The first TypeScript lesson with executable wrong-cases, which is only
// possible since verify-lesson.mjs learned to strip types on 2026-08-23.
// These are written in TypeScript on purpose: if the runner ever silently
// stops stripping, every one of them fails to parse and this file says so
// loudly.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   OBJECT   — rule 1, and the two things typeof calls 'object'
//   BASICS   — rule 2
//   STATUS   — rule 3, the whole point of the exercise
//   NULLABLE — rule 4, null and absent are different facts
//   MAXUSES  — rule 5, the falsy trap
//
// Nothing here rejects extra properties, so the forward-compatibility
// mistake has to ADD a check rather than remove one — which is worth
// noticing: it is the only case where the wrong answer is more code than
// the right one, and it is the one a careful person writes.

const PRELUDE = `
type TokenStatus = 'active' | 'paused' | 'revoked';
const STATUSES: TokenStatus[] = ['active', 'paused', 'revoked'];
function isStringOrNull(v: unknown): boolean {
  return v === null || typeof v === 'string';
}
`;

const FRAGMENTS = {
  OBJECT: `
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;`,

  BASICS: `
  if (typeof v.id !== 'number') return false;
  if (typeof v.label !== 'string') return false;`,

  STATUS: `
  if (typeof v.status !== 'string') return false;
  if (!STATUSES.includes(v.status as TokenStatus)) return false;`,

  NULLABLE: `
  if (typeof v.createdAt !== 'string') return false;
  if (!isStringOrNull(v.expiresAt)) return false;
  if (!isStringOrNull(v.pausedAt)) return false;
  if (!isStringOrNull(v.revokedAt)) return false;`,

  MAXUSES: `
  if (!(v.maxUses === null || typeof v.maxUses === 'number')) return false;`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `${PRELUDE}
function isToken(value: unknown): boolean {
${f.OBJECT}
${f.BASICS}
${f.STATUS}
${f.NULLABLE}
${f.MAXUSES}
  return true;
}`;
}

const alternatives = [
  // A single guard object walked with Object.entries, and a Set for the
  // status lookup. Same answers throughout.
  build({
    BASICS: `
  const strings = ['label', 'createdAt'];
  for (const key of strings) {
    if (typeof v[key] !== 'string') return false;
  }
  if (typeof v.id !== 'number') return false;`,
    STATUS: `
  const allowed = new Set(['active', 'paused', 'revoked']);
  if (typeof v.status !== 'string' || !allowed.has(v.status)) return false;`,
    NULLABLE: `
  for (const key of ['expiresAt', 'pausedAt', 'revokedAt']) {
    if (!(v[key] === null || typeof v[key] === 'string')) return false;
  }`,
  }),

  // Expresses the whole thing as one boolean expression. Ugly, correct,
  // and it exercises the same rules from the other direction -- note
  // maxUses written as a positive test rather than a negated one.
  build({
    OBJECT: `
  const isPlainObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  if (!isPlainObject) return false;
  const v = value as Record<string, unknown>;`,
    MAXUSES: `
  const maxUsesOk = v.maxUses === null || typeof v.maxUses === 'number';
  if (!maxUsesOk) return false;`,
  }),
];

const mistakes = [
  {
    // typeof null === 'object', so this reaches for v.id on null and
    // throws. The caller wrote the guard PRECISELY to avoid a crash on
    // an unexpected response, and it crashes on the commonest one.
    expect: "null is refused, not thrown on",
    impl: build({
      OBJECT: `
  if (typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;`,
    }),
  },
  {
    // typeof [] === 'object' too. An empty array passes every property
    // check by being undefined everywhere... except it does not, because
    // the id check catches it. So this only shows up when the array is
    // non-empty and carries objects -- which is exactly what
    // GET /tokens returns, making "the whole list" test as "one token".
    expect: "...including an array OF tokens",
    impl: build({
      OBJECT: `
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Array.isArray(value)) {
    // "close enough" -- reads the first element instead of refusing
    const first = (value as unknown[])[0];
    if (typeof first === 'object' && first !== null) {
      Object.assign(v, first as Record<string, unknown>);
    }
  }`,
    }),
  },
  {
    // THE bug. typeof check only, so 'archived' from a newer server is
    // a Token. Everything downstream switches on status and takes its
    // default branch, silently, for a token that is not any of the
    // states the app knows how to render.
    expect: "an unrecognised status is refused",
    impl: build({
      STATUS: `
  if (typeof v.status !== 'string') return false;`,
    }),
  },
  {
    // The same bug wearing a tidier coat, and worse: substring matching.
    // 'act' passes. So does '' -- every string is a substring of every
    // string at position 0 -- so a token whose status the server left
    // blank is accepted as valid.
    //
    // It does NOT trip the headline check: 'archived' really is absent
    // from that string, so the tidy version is correct for the obvious
    // wrong input and wrong for the subtle one. The self-check had no
    // substring case until this wrong-case found the hole.
    expect: "...and so is a status that is merely part of a real one",
    impl: build({
      STATUS: `
  if (typeof v.status !== 'string') return false;
  if (!'active paused revoked'.includes(v.status)) return false;`,
    }),
  },
  {
    // Rule 5, the falsy trap, and the one this course has now met four
    // times. 0 means no uses permitted and null means unlimited --
    // opposite meanings, one of them falsy -- so this rejects a valid
    // token whose owner deliberately permitted nothing.
    expect: "maxUses of 0 passes -- 0 permits no uses, which is a real state",
    impl: build({
      MAXUSES: `
  if (!v.maxUses && v.maxUses !== null) return false;`,
    }),
  },
  {
    // != null accepts anything non-nullish, so the string "3" is a
    // Token. It then reaches a comparison against a number somewhere
    // downstream, where "3" > 2 happens to be true and "10" > 2 is
    // false.
    expect: "...a numeric string is refused",
    impl: build({
      MAXUSES: `
  if (v.maxUses !== null && v.maxUses === undefined) return false;`,
    }),
  },
  {
    // Rule 4 collapsed: undefined treated as an acceptable absence, so
    // a response that omits expiresAt entirely is read as "never
    // expires". The token renders as live for ever.
    expect: "...but a MISSING expiresAt is refused",
    impl: build({
      NULLABLE: `
  if (typeof v.createdAt !== 'string') return false;
  const nullable = (x: unknown) => x == null || typeof x === 'string';
  if (!nullable(v.expiresAt)) return false;
  if (!nullable(v.pausedAt)) return false;
  if (!nullable(v.revokedAt)) return false;`,
    }),
  },
  {
    // Only expiresAt was fixed; the other two nullable fields still
    // accept a missing value. The kind of thing that happens when a bug
    // is fixed at the site it was reported rather than in the helper.
    expect: "...and the same holds for pausedAt and revokedAt",
    impl: build({
      NULLABLE: `
  if (typeof v.createdAt !== 'string') return false;
  if (!isStringOrNull(v.expiresAt)) return false;
  if (v.pausedAt !== undefined && !isStringOrNull(v.pausedAt)) return false;
  if (v.revokedAt !== undefined && !isStringOrNull(v.revokedAt)) return false;`,
    }),
  },
  {
    // The id check dropped, so a response with no id at all is a Token.
    // It survives every render and fails at the first request that
    // needs to name the token -- a revoke, on the wrong screen, later.
    expect: "a missing id is refused",
    impl: build({
      BASICS: `
  if (typeof v.label !== 'string') return false;`,
    }),
  },
  {
    // Rule 6, and the ONLY case here where the wrong answer is MORE
    // code than the right one. Rejecting unknown fields feels like
    // rigour; it means the day the server ships a new column, every
    // token fails its guard and the list renders empty for anyone who
    // has not updated the app.
    expect: "an unknown EXTRA field is allowed",
    impl: build({
      MAXUSES: `
  if (!(v.maxUses === null || typeof v.maxUses === 'number')) return false;
  const known = [
    'id', 'label', 'status', 'createdAt',
    'expiresAt', 'maxUses', 'pausedAt', 'revokedAt',
  ];
  if (Object.keys(v).some((k) => !known.includes(k))) return false;`,
    }),
  },
  {
    // Shape confused with validity: an empty label refused inside the
    // type guard. A product rule buried where no caller thinks to look,
    // and it makes isToken(x) === false mean two unrelated things.
    expect: "an empty label is still a Token",
    impl: build({
      BASICS: `
  if (typeof v.id !== 'number') return false;
  if (typeof v.label !== 'string' || v.label.trim() === '') return false;`,
    }),
  },
];

export const stages = {
  guard: { alternatives, mistakes },
};
