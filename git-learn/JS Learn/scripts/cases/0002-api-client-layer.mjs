// Wrong-answer cases for a3/0002 — parseListResponse.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   ENVELOPE — rules 1 and 2, raw is genuinely unknown
//   META     — rules 3 and 4, the page metadata, checked first
//   ITEMS    — rules 5 and 6, refuse the page rather than drop a row
//   FORBID   — rule 7, the one field that must never arrive
//   RETURN   — rules 8 and 9
//
// This is the boundary, so every mistake here has the same shape: it
// lets something through that the rest of the app will then treat as
// typed. The compiler cannot help downstream of a bad boundary -- that
// is the entire reason the function exists -- so a permissive bug here
// surfaces as a TypeError in a screen that is not wrong.

const FRAGMENTS = {
  ENVELOPE: `
  const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isPlainObject(raw) || !isPlainObject(raw.data)) return no("not_an_envelope");
  if (raw.success !== true) return no("server_error");`,

  META: `
  if (!(cursor === null || typeof cursor === "string")) return no("missing_cursor");
  if (typeof hasMore !== "boolean") return no("missing_flag");
  if (hasMore === true && cursor === null) return no("inconsistent_page");`,

  ITEMS: `
  if (!Array.isArray(items)) return no("items_not_an_array");
  for (const item of items) {
    if (!config.isItem(item)) return no("invalid_item");
  }`,

  FORBID: `
  for (const item of items) {
    for (const field of config.forbiddenFields) {
      if (Object.prototype.hasOwnProperty.call(item, field)) return no("forbidden_field");
    }
  }`,

  RETURN: `
  return { ok: true, items: items.slice(), cursor, hasMore, reason: "ok" };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function parseListResponse(raw, config) {
  const no = (reason) => ({ ok: false, items: [], cursor: null, hasMore: false, reason });
${f.ENVELOPE}
  const { items, cursor, hasMore } = raw.data;
${f.META}
${f.ITEMS}
${f.FORBID}
${f.RETURN}
}`;
}

const alternatives = [
  // Collects the metadata checks into a small table of predicates and
  // uses every() for the item pass. Same answers throughout.
  build({
    META: `
  const metaProblem =
    !(cursor === null || typeof cursor === "string") ? "missing_cursor"
    : typeof hasMore !== "boolean" ? "missing_flag"
    : hasMore && cursor === null ? "inconsistent_page"
    : null;
  if (metaProblem) return no(metaProblem);`,
    ITEMS: `
  if (!Array.isArray(items)) return no("items_not_an_array");
  if (!items.every((item) => config.isItem(item))) return no("invalid_item");`,
  }),

  // Does the two item passes in one loop, which is fine because the
  // guard and the forbidden-field test are independent of each other.
  build({
    ITEMS: `
  if (!Array.isArray(items)) return no("items_not_an_array");`,
    FORBID: `
  for (const item of items) {
    if (!config.isItem(item)) return no("invalid_item");
    for (const field of config.forbiddenFields) {
      if (Object.prototype.hasOwnProperty.call(item, field)) return no("forbidden_field");
    }
  }`,
  }),
];

const mistakes = [
  {
    // THE bug of the whole lesson, in its purest form: trust the
    // envelope and return raw.data.items. It is what every generic on
    // the page already implies, it works against a correct server for
    // ever, and the first time the shape changes the failure lands in a
    // screen three steps away.
    expect: "one bad item refuses the whole page",
    impl: `
function parseListResponse(raw, config) {
  const d = raw && raw.data ? raw.data : { items: [], cursor: null, hasMore: false };
  return {
    ok: true,
    items: d.items || [],
    cursor: d.cursor === undefined ? null : d.cursor,
    hasMore: !!d.hasMore,
    reason: "ok",
  };
}`,
  },
  {
    // Rule 6 softened to the thing that feels kinder: drop the bad row,
    // keep the rest. The list is quietly one shorter than the server
    // sent, nothing reports it, and if the shape has changed EVERY row
    // is dropped and the screen shows "no tokens yet" -- which is the
    // empty state, not an error, so it does not even look broken.
    expect: "one bad item refuses the whole page",
    impl: build({
      ITEMS: `
  if (!Array.isArray(items)) return no("items_not_an_array");`,
      RETURN: `
  return {
    ok: true,
    items: items.filter((item) => config.isItem(item)),
    cursor, hasMore, reason: "ok",
  };`,
    }),
  },
  {
    // Rule 7 dropped. isItem allows unknown fields by design -- that is
    // a2/0001 rule 6 -- so nothing else will ever catch a code, and it
    // lands on a list screen and in a React key. The two rules look
    // redundant right up until you delete one.
    expect: "...but a forbidden field is not",
    impl: build({ FORBID: `` }),
  },
  {
    // Rule 3: undefined accepted as "no more pages". The server did not
    // say; this decides on its behalf, and the list stops at whatever
    // the first page happened to hold. Nothing errors and the user sees
    // a plausible, short list.
    expect: "a missing cursor is refused",
    impl: build({
      META: `
  if (!(cursor === null || cursor === undefined || typeof cursor === "string")) {
    return no("missing_cursor");
  }
  if (typeof hasMore !== "boolean") return no("missing_flag");
  if (hasMore === true && cursor == null) return no("inconsistent_page");`,
    }),
  },
  {
    // Rule 3 for hasMore: coerced instead of checked, so the string
    // "yes" is truthy and "false" is ALSO truthy -- a server sending
    // its booleans as strings produces infinite pagination against a
    // cursor that never advances.
    expect: "...and a non-boolean hasMore is refused",
    impl: build({
      META: `
  if (!(cursor === null || typeof cursor === "string")) return no("missing_cursor");
  if (hasMore === undefined) return no("missing_flag");
  if (hasMore && cursor === null) return no("inconsistent_page");`,
    }),
  },
  {
    // Rule 4 dropped. Neither field is wrong on its own, so nothing
    // else catches it: the app is told there is more, has no cursor to
    // ask with, and either stops silently or asks for page one again
    // for ever.
    expect: "hasMore true with a null cursor is inconsistent",
    impl: build({
      META: `
  if (!(cursor === null || typeof cursor === "string")) return no("missing_cursor");
  if (typeof hasMore !== "boolean") return no("missing_flag");`,
    }),
  },
  {
    // Rule 1: an array accepted as an envelope, because typeof [] is
    // "object". An API that drops its envelope in a future version --
    // or a proxy that unwraps it -- then reads as a page with no items
    // and no error.
    expect: "...and so is a data that is an array rather than a page",
    impl: build({
      ENVELOPE: `
  if (raw === null || typeof raw !== "object") return no("not_an_envelope");
  if (!raw.data || typeof raw.data !== "object") return no("not_an_envelope");
  if (raw.success !== true) return no("server_error");`,
    }),
  },
  {
    // Rule 2 read as truthiness rather than identity, so success: "no"
    // and success: 1 both pass. A field whose whole job is to say
    // whether to trust the rest, trusted without being read.
    expect: "...and so is a missing success field",
    impl: build({
      ENVELOPE: `
  const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isPlainObject(raw) || !isPlainObject(raw.data)) return no("not_an_envelope");
  if (!raw.success && raw.success !== undefined) return no("server_error");`,
    }),
  },
  {
    // Rule 8 inverted: an empty page treated as a failure. "No tokens
    // yet" and "could not load" become the same screen, so a new user
    // with no tokens is shown an error -- on their first launch, which
    // is the worst possible moment for it.
    expect: "an empty page is a success",
    impl: build({
      ITEMS: `
  if (!Array.isArray(items)) return no("items_not_an_array");
  if (items.length === 0) return no("items_not_an_array");
  for (const item of items) {
    if (!config.isItem(item)) return no("invalid_item");
  }`,
    }),
  },
  {
    // Rule 9: hands back the array inside raw. A caller that sorts the
    // list in place has now edited the parsed response, so a second
    // read of the same object -- a retry, a cache hit -- sees a
    // different order than the server sent.
    expect: "...and the returned array is a copy",
    impl: build({
      RETURN: `
  return { ok: true, items, cursor, hasMore, reason: "ok" };`,
    }),
  },
];

export const stages = {
  boundary: { alternatives, mistakes },
};
