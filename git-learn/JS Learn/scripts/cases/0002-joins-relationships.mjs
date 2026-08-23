// Wrong-answer cases for b1/0002 — joinRows.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   MATCH   — rule 6, where SQL and JavaScript disagree about null
//   COLUMNS — rule 4, one output shape rather than two
//   MERGE   — rules 3, 5 and 8, prefixing and null-filling
//   LOOP    — rules 1, 2 and 7, the multiplication itself
//
// The first mistake in this file is the reason it exists. Every other
// one produces rows that are visibly wrong if you count them; that one
// produces rows that are wrong only if you know which entity an id
// belongs to, and a spread that overwrites an id leaves a row which is
// still perfectly well-formed.

const FRAGMENTS = {
  MATCH: `
  const usable = (v) => v !== null && v !== undefined;
  const matches = (l, r) =>
    usable(l[leftKey]) && usable(r[rightKey]) && l[leftKey] === r[rightKey];`,

  COLUMNS: `
  const rightColumns = new Set();
  for (const r of right) {
    for (const key of Object.keys(r)) rightColumns.add(key);
  }`,

  MERGE: `
  const withRight = (leftRow, rightRow) => {
    const out = { ...leftRow };
    for (const key of rightColumns) {
      out[rightPrefix + key] = rightRow ? rightRow[key] ?? null : null;
    }
    return out;
  };`,

  LOOP: `
  const rows = [];
  for (const leftRow of left) {
    const found = right.filter((rightRow) => matches(leftRow, rightRow));
    if (found.length > 0) {
      for (const rightRow of found) rows.push(withRight(leftRow, rightRow));
    } else if (kind === "left") {
      rows.push(withRight(leftRow, null));
    }
  }
  return rows;`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function joinRows(left, right, config) {
  const { leftKey, rightKey, kind, rightPrefix } = config;
${f.MATCH}
${f.COLUMNS}
${f.MERGE}
${f.LOOP}
}`;
}

const alternatives = [
  // flatMap instead of an accumulator, and the right columns collected
  // with reduce. Same answers throughout.
  build({
    COLUMNS: `
  const rightColumns = right.reduce((acc, r) => {
    Object.keys(r).forEach((k) => acc.add(k));
    return acc;
  }, new Set());`,
    LOOP: `
  return left.flatMap((leftRow) => {
    const found = right.filter((rightRow) => matches(leftRow, rightRow));
    if (found.length > 0) return found.map((rightRow) => withRight(leftRow, rightRow));
    return kind === "left" ? [withRight(leftRow, null)] : [];
  });`,
  }),

  // Expresses the null rule as an explicit SQL-flavoured comparison
  // returning "unknown", and builds the merged row with Object.assign.
  build({
    MATCH: `
  const sqlEquals = (a, b) => {
    if (a === null || a === undefined) return "unknown";
    if (b === null || b === undefined) return "unknown";
    return a === b ? "true" : "false";
  };
  const matches = (l, r) => sqlEquals(l[leftKey], r[rightKey]) === "true";`,
    MERGE: `
  const withRight = (leftRow, rightRow) => {
    const nulls = {};
    for (const key of rightColumns) {
      nulls[rightPrefix + key] = rightRow ? rightRow[key] ?? null : null;
    }
    return Object.assign({}, leftRow, nulls);
  };`,
  }),
];

const mistakes = [
  {
    // Rule 5, and the quietest bug in the file. The right row is spread
    // straight over the left one, so redemption_events.id overwrites
    // tokens.id. Every row is still well-formed, still has an id, still
    // renders -- and from here on it identifies the wrong entity. The
    // next person writes DELETE ... WHERE id = row.id.
    expect: "the left id survives the join",
    impl: build({
      MERGE: `
  const withRight = (leftRow, rightRow) => {
    if (!rightRow) {
      const out = { ...leftRow };
      for (const key of rightColumns) out[rightPrefix + key] = null;
      return out;
    }
    return { ...leftRow, ...rightRow };
  };`,
    }),
  },
  {
    // THE rule this exercise exists for. null === null is true in
    // JavaScript, so every orphaned left row joins to every orphaned
    // right row -- a cartesian product of precisely the rows that
    // should have matched nothing. It gets BIGGER the more broken your
    // data is, which is the opposite of what anyone expects.
    expect: "a null key matches nothing, even another null key",
    impl: build({
      MATCH: `
  const matches = (l, r) => l[leftKey] === r[rightKey];`,
    }),
  },
  {
    // The same rule half-remembered: null is handled and undefined is
    // not. A row with no key at all then matches every other row with
    // no key at all, so the bug survives in exactly the data that has
    // been through a migration.
    expect: "...and a MISSING key behaves like a null one",
    impl: build({
      MATCH: `
  const matches = (l, r) =>
    l[leftKey] !== null && r[rightKey] !== null && l[leftKey] === r[rightKey];`,
    }),
  },
  {
    // Rule 1 turned into what people THINK a join does: attach the first
    // match. Three tokens in, three rows out, and the second redemption
    // of the Farm box token has silently vanished. Reads correctly,
    // counts correctly, and is missing data.
    expect: "...with the twice-redeemed token appearing twice",
    impl: build({
      LOOP: `
  const rows = [];
  for (const leftRow of left) {
    const first = right.find((rightRow) => matches(leftRow, rightRow));
    if (first) rows.push(withRight(leftRow, first));
    else if (kind === "left") rows.push(withRight(leftRow, null));
  }
  return rows;`,
    }),
  },
  {
    // Rule 2: 'inner' falls through to the left-join branch, so a token
    // with no redemptions appears anyway. The distinction between the
    // two kinds is the only thing the caller chose.
    expect: "an inner join drops the token with no redemptions",
    impl: build({
      LOOP: `
  const rows = [];
  for (const leftRow of left) {
    const found = right.filter((rightRow) => matches(leftRow, rightRow));
    if (found.length > 0) {
      for (const rightRow of found) rows.push(withRight(leftRow, rightRow));
    } else {
      rows.push(withRight(leftRow, null));
    }
  }
  return rows;`,
    }),
  },
  {
    // Rule 3: the unmatched left row is emitted with no right columns
    // at all, so r_holder_name is undefined rather than null. A caller
    // testing `=== null` for "never redeemed" gets false, and a caller
    // testing `== null` gets true -- so the bug is invisible until
    // somebody tightens a comparison.
    expect: "...with right columns NULL, not missing",
    impl: build({
      MERGE: `
  const withRight = (leftRow, rightRow) => {
    if (!rightRow) return { ...leftRow };
    const out = { ...leftRow };
    for (const key of rightColumns) out[rightPrefix + key] = rightRow[key] ?? null;
    return out;
  };`,
    }),
  },
  {
    // Rule 4: right columns taken from the CURRENT row rather than the
    // union of all of them. Works perfectly while every right row has
    // the same keys, and produces two different shapes the moment one
    // does not -- which is a check that passes on the first page of
    // results and fails on the second.
    expect: "a null-filled row has the same columns as a matched one",
    impl: build({
      COLUMNS: `
  const rightColumns = new Set(right.length > 0 ? [] : []);`,
      MERGE: `
  const withRight = (leftRow, rightRow) => {
    const out = { ...leftRow };
    const keys = rightRow ? Object.keys(rightRow) : [];
    for (const key of keys) out[rightPrefix + key] = rightRow[key] ?? null;
    return out;
  };`,
    }),
  },
  {
    // Rule 7: right rows that matched nothing are appended, which makes
    // this a FULL join wearing a LEFT join's name. The extra rows have
    // no left columns at all, so a list of tokens gains entries with no
    // label.
    expect: "a right row matching nothing is dropped",
    impl: build({
      LOOP: `
  const rows = [];
  const usedRight = new Set();
  for (const leftRow of left) {
    const found = right.filter((rightRow) => matches(leftRow, rightRow));
    found.forEach((r) => usedRight.add(r));
    if (found.length > 0) {
      for (const rightRow of found) rows.push(withRight(leftRow, rightRow));
    } else if (kind === "left") {
      rows.push(withRight(leftRow, null));
    }
  }
  for (const rightRow of right) {
    if (!usedRight.has(rightRow)) rows.push(withRight({}, rightRow));
  }
  return rows;`,
    }),
  },
  {
    // Rule 8: writes the prefixed right columns onto the left row
    // itself. The join output is correct and the caller's own array now
    // carries r_holder_name on every token -- and a SECOND join over
    // the same input inherits the first one's columns.
    expect: "the inputs are not mutated",
    impl: build({
      MERGE: `
  const withRight = (leftRow, rightRow) => {
    for (const key of rightColumns) {
      leftRow[rightPrefix + key] = rightRow ? rightRow[key] ?? null : null;
    }
    return leftRow;
  };`,
    }),
  },
  {
    // Rule 3 again, from the other direction: an empty right array
    // means no matches for anybody, and the left branch is skipped
    // because the code checks right.length first. A LEFT join over an
    // empty table returns nothing, which is the one case where it must
    // return everything.
    expect: "an empty right side leaves a left join intact",
    impl: build({
      LOOP: `
  const rows = [];
  if (right.length === 0) return rows;
  for (const leftRow of left) {
    const found = right.filter((rightRow) => matches(leftRow, rightRow));
    if (found.length > 0) {
      for (const rightRow of found) rows.push(withRight(leftRow, rightRow));
    } else if (kind === "left") {
      rows.push(withRight(leftRow, null));
    }
  }
  return rows;`,
    }),
  },
];

export const stages = {
  join: { alternatives, mistakes },
};
