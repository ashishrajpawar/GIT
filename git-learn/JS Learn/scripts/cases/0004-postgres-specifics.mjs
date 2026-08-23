// Wrong-answer cases for b1/0004 — jsonbContains.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   KIND     — telling an object from an array from a scalar
//   TOPLEVEL — rules 4 and 5, the exception and its boundary
//   MISMATCH — rules 6 and 7, structure matches from the top
//   SCALAR   — rule 1, no coercion
//   ARRAY    — rule 3, "is each of these in there"
//   OBJECT   — rules 2 and 8
//
// Almost every mistake here makes @> MORE permissive, and that is the
// direction that hurts: a containment query is usually a filter, so a
// too-generous one returns rows that do not match and a report that is
// quietly wrong. The exception is the array-equality mistake, which is
// too strict and at least shows up as "my query finds nothing".

const FRAGMENTS = {
  KIND: `
  const kindOf = (v) => {
    if (Array.isArray(v)) return "array";
    if (v !== null && typeof v === "object") return "object";
    return "scalar";
  };
  const docKind = kindOf(doc);
  const queryKind = kindOf(query);`,

  TOPLEVEL: `
  if (topLevel && docKind === "array" && queryKind === "scalar") {
    return doc.some((element) => element === query);
  }`,

  MISMATCH: `
  if (docKind !== queryKind) return false;`,

  SCALAR: `
  if (queryKind === "scalar") return doc === query;`,

  ARRAY: `
  if (queryKind === "array") {
    return query.every((wanted) =>
      doc.some((element) => jsonbContains(element, wanted, false))
    );
  }`,

  OBJECT: `
  return Object.keys(query).every(
    (key) =>
      Object.prototype.hasOwnProperty.call(doc, key) &&
      jsonbContains(doc[key], query[key], false)
  );`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function jsonbContains(doc, query, topLevel = true) {
${f.KIND}
${f.TOPLEVEL}
${f.MISMATCH}
${f.SCALAR}
${f.ARRAY}
${f.OBJECT}
}`;
}

const alternatives = [
  // Uses a switch on the kind and an explicit loop for the object case.
  // Same answers throughout.
  build({
    OBJECT: `
  for (const key of Object.keys(query)) {
    if (!(key in doc)) return false;
    if (!jsonbContains(doc[key], query[key], false)) return false;
  }
  return true;`,
  }),

  // Handles the top-level exception by normalising the query into an
  // array first, which is the other natural way to read the Postgres
  // documentation. Equivalent for every input here.
  build({
    TOPLEVEL: `
  if (topLevel && docKind === "array" && queryKind === "scalar") {
    return jsonbContains(doc, [query], false);
  }`,
  }),
];

const mistakes = [
  {
    // THE bug. Containment read as a search, so a value nested anywhere
    // satisfies the query. Every filter written with @> then returns
    // rows that happen to have the value SOMEWHERE, which is a report
    // that is wrong in the direction nobody checks.
    expect: "containment does not find a value nested deeper",
    impl: build({
      MISMATCH: `
  if (docKind === "object" && queryKind === "object") {
    const directly = Object.keys(query).every(
      (key) =>
        Object.prototype.hasOwnProperty.call(doc, key) &&
        jsonbContains(doc[key], query[key], false)
    );
    if (directly) return true;
    return Object.values(doc).some(
      (nested) => kindOf(nested) === "object" && jsonbContains(nested, query, false)
    );
  }
  if (docKind !== queryKind) return false;`,
    }),
  },
  {
    // Rule 5: the top-level exception applied at every depth, which is
    // the natural thing to write once you have read rule 4. It makes
    // {"tags":["qr"]} @> {"tags":"qr"} true -- and that query looks so
    // reasonable that nobody questions the result.
    expect: "a NESTED array does not contain a bare scalar",
    impl: build({
      TOPLEVEL: `
  if (docKind === "array" && queryKind === "scalar") {
    return doc.some((element) => element === query);
  }`,
    }),
  },
  {
    // Rule 4 dropped entirely, so the exception never applies and a
    // top-level tag query returns nothing. Too strict rather than too
    // loose -- which at least announces itself as "my query finds no
    // rows" instead of quietly over-matching.
    expect: "a top-level array contains a bare scalar",
    impl: build({ TOPLEVEL: `` }),
  },
  {
    // Rule 3 written as array EQUALITY: index by index, same length.
    // Order and duplicates now matter, so the commonest containment
    // query in the lesson -- days: [1] against days: [1,2,3,4,5] --
    // returns false.
    expect: "a payload contains a subset of its keys",
    impl: build({
      ARRAY: `
  if (queryKind === "array") {
    if (doc.length !== query.length) return false;
    return query.every((wanted, i) => jsonbContains(doc[i], wanted, false));
  }`,
    }),
  },
  {
    // Rule 3 half-right: subset, but positional. [3,1] against
    // [1,2,3,4,5] fails because 3 is not at index 0 -- so the query
    // works or not depending on the order somebody typed it in.
    expect: "an array contains its elements in any order",
    impl: build({
      ARRAY: `
  if (queryKind === "array") {
    return query.every((wanted, i) => i < doc.length && jsonbContains(doc[i], wanted, false));
  }`,
    }),
  },
  {
    // Rule 1 with loose equality, so 10 == "10" is true. The type rule
    // is the whole reason ->> is a separate operator, and this quietly
    // erases it -- a filter on a numeric field then matches rows whose
    // value arrived as a string from some other writer.
    expect: "10 does not contain \"10\"",
    impl: build({
      SCALAR: `
  if (queryKind === "scalar") return doc == query;`,
    }),
  },
  {
    // Rule 7 for null, and the reason kindOf has an explicit null test:
    // typeof null is "object", so a null doc is treated as an object
    // and Object.keys(null) throws. It fails loudly rather than
    // quietly, which is the one mercy in this file -- and it fails on
    // the ordinary case of a nullable column compared against null.
    expect: "null contains null",
    impl: build({
      KIND: `
  const kindOf = (v) => {
    if (Array.isArray(v)) return "array";
    if (typeof v === "object") return "object";
    return "scalar";
  };
  const docKind = kindOf(doc);
  const queryKind = kindOf(query);`,
    }),
  },
  {
    // Rule 2's presence test written as a truthiness check on the
    // VALUE rather than a question about the KEY. A key holding false,
    // 0, null or '' then reads as absent -- so {allow_video: false}
    // does not contain {allow_video: false}, which is the only query
    // anyone would write about that column.
    //
    // Note what is NOT a mistake, and was in this file until it was
    // run: `doc[key] !== undefined` instead of hasOwnProperty. JSON has
    // no undefined, so the two are equivalent for every input this
    // function can receive -- a wrong-case that changes nothing.
    expect: "a boolean false is a value like any other",
    impl: build({
      OBJECT: `
  return Object.keys(query).every(
    (key) => doc[key] && jsonbContains(doc[key], query[key], false)
  );`,
    }),
  },
  {
    // Rule 8 for arrays, from the wrong direction: an empty query array
    // returns false because the implementation asks "does doc have at
    // least one element that matches" rather than "is every wanted
    // element present". Empty means nothing to fail.
    expect: "any array contains the empty array",
    impl: build({
      ARRAY: `
  if (queryKind === "array") {
    return query.length > 0 && query.every((wanted) =>
      doc.some((element) => jsonbContains(element, wanted, false))
    );
  }`,
    }),
  },
  {
    // Rule 7 relaxed between the container kinds, so an object contains
    // an array whenever the array is empty, and vice versa. It looks
    // like a tidy shortcut for rule 8 and it makes the two container
    // types interchangeable at exactly the point they are not.
    expect: "...but an array does not contain the empty OBJECT",
    impl: build({
      MISMATCH: `
  if (docKind !== queryKind) {
    if (queryKind === "object" && Object.keys(query).length === 0) return true;
    if (queryKind === "array" && query.length === 0) return true;
    return false;
  }`,
    }),
  },
];

export const stages = {
  contains: { alternatives, mistakes },
};
