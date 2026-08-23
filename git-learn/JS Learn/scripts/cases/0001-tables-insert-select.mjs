// Wrong-answer cases for b1/0001 — checkRow.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   UNKNOWN  — rule 1, a typo'd column is a value you think you stored
//   RESOLVE  — rules 2 and 3, DEFAULT is for absence, not for null
//   NULLABLE — rules 4, 5 and 6, what null opts out of
//   VALUE    — rules 5 and 6 for a real value
//
// Every mistake in this file is a disagreement with SQL's three-valued
// logic, and they split cleanly in two directions. Half treat null as
// though it were a value (so it collides, or fails a CHECK); half treat
// a value as though it were null (so '' or 0 is rejected). Both produce
// a confident verdict about a row the database would have handled
// differently -- which is worse than no checker, because the whole
// point of one is to answer before the round trip.

const FRAGMENTS = {
  UNKNOWN: `
  const known = new Set(table.columns.map((c) => c.name));
  for (const key of Object.keys(row)) {
    if (!known.has(key)) violations.push({ column: key, rule: "unknown_column" });
  }`,

  RESOLVE: `
    const supplied = Object.prototype.hasOwnProperty.call(row, column.name);
    let value;
    if (supplied) {
      value = row[column.name];
    } else if (column.hasDefault) {
      value = column.defaultValue;
    } else {
      value = null;
    }`,

  NULLABLE: `
    if (value === null || value === undefined) {
      if (column.notNull) violations.push({ column: column.name, rule: "not_null" });
      continue;
    }`,

  VALUE: `
    if (column.unique) {
      const taken = table.rows.some((existing) => existing[column.name] === value);
      if (taken) violations.push({ column: column.name, rule: "unique" });
    }
    if (column.check && column.check(value) === false) {
      violations.push({ column: column.name, rule: "check" });
    }`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function checkRow(row, table) {
  const violations = [];
  const stored = {};
${f.UNKNOWN}
  for (const column of table.columns) {
${f.RESOLVE}
    stored[column.name] = value;
${f.NULLABLE}
${f.VALUE}
  }
  return { ok: violations.length === 0, stored, violations };
}`;
}

const alternatives = [
  // Resolves the value with a small helper and uses `in` rather than
  // hasOwnProperty. Same answers throughout.
  build({
    RESOLVE: `
    const resolve = () => {
      if (column.name in row) return row[column.name];
      return column.hasDefault ? column.defaultValue : null;
    };
    const value = resolve();`,
  }),

  // Expresses the null rule as an explicit "is this SQL NULL" predicate
  // and the constraint checks as a chain of ifs on a non-null value.
  build({
    NULLABLE: `
    const isSqlNull = (v) => v === null || v === undefined;
    if (isSqlNull(value)) {
      if (column.notNull) violations.push({ column: column.name, rule: "not_null" });
      continue;
    }`,
    VALUE: `
    const collides = column.unique
      && table.rows.filter((existing) => existing[column.name] === value).length > 0;
    if (collides) violations.push({ column: column.name, rule: "unique" });
    const failsCheck = typeof column.check === "function" && !column.check(value);
    if (failsCheck) violations.push({ column: column.name, rule: "check" });`,
  }),
];

const mistakes = [
  {
    // THE headline. NOT NULL read as "not empty", which is exactly the
    // gloss this lesson carried for months. It rejects a row Postgres
    // would accept -- so the bug is a false alarm rather than a leak,
    // and it hides the real lesson: if empty is meaningless in your
    // product, that rule lives in validation and has to be WRITTEN.
    expect: "an empty string satisfies NOT NULL",
    impl: build({
      NULLABLE: `
    if (value === null || value === undefined || value === "") {
      if (column.notNull) violations.push({ column: column.name, rule: "not_null" });
      continue;
    }`,
    }),
  },
  {
    // The same mistake with a falsy test, which additionally swallows 0
    // -- and 0 on max_uses means "no uses permitted", the one value the
    // product needs to be able to write down. a11/0003, b7/0002 and
    // a5/0003 have each had to fix this shape somewhere else.
    expect: "...and 0 satisfies it on a NOT NULL numeric column",
    impl: build({
      NULLABLE: `
    if (!value) {
      if (column.notNull) violations.push({ column: column.name, rule: "not_null" });
      continue;
    }`,
    }),
  },
  {
    // Rule 3: the default is substituted for an explicit null, so a
    // deliberate "no status" silently becomes 'active'. The row is
    // accepted, nothing is reported, and the stored value is not the
    // one that was passed -- which is the failure `stored` exists to
    // make visible.
    expect: "an explicit null on a NOT NULL column with a DEFAULT is still a violation",
    impl: build({
      RESOLVE: `
    let value = row[column.name];
    if ((value === undefined || value === null) && column.hasDefault) {
      value = column.defaultValue;
    } else if (value === undefined) {
      value = null;
    }`,
    }),
  },
  {
    // Rule 5's null exemption dropped: UNIQUE compares nulls, so two
    // rows with a null max_uses collide. In Postgres any number of
    // nulls coexist in a unique column, so this refuses inserts the
    // database would take -- and it gets worse as the table fills with
    // perfectly legal nulls.
    expect: "...and nulls never collide, however many there are",
    impl: build({
      NULLABLE: `
    if (value === null || value === undefined) {
      if (column.notNull) violations.push({ column: column.name, rule: "not_null" });
      if (column.unique) {
        const taken = table.rows.some((existing) => existing[column.name] === value);
        if (taken) violations.push({ column: column.name, rule: "unique" });
      }
      continue;
    }`,
    }),
  },
  {
    // Rule 6's null exemption dropped: the CHECK runs on null. Here it
    // throws, because the check reads v.length -- which is the honest
    // demonstration that a CHECK was never written with null in mind.
    // In SQL it does not throw, it simply does not fail, and the column
    // accepts the one value the CHECK exists to exclude.
    expect: "...but null does not run the CHECK at all",
    impl: build({
      NULLABLE: `
    if (value === null || value === undefined) {
      if (column.notNull) violations.push({ column: column.name, rule: "not_null" });
      if (column.check && column.check(value) === false) {
        violations.push({ column: column.name, rule: "check" });
      }
      continue;
    }`,
    }),
  },
  {
    // Rule 1 dropped. A typo'd column name is accepted in silence, so
    // the value never lands and nothing says so -- issued_to instead of
    // label, exactly the rename this module just went through.
    expect: "a column that does not exist is reported",
    impl: build({ UNKNOWN: `` }),
  },
  {
    // Rule 7: returns at the first violation. A row with five problems
    // takes five round trips to fix, one message at a time, which is
    // precisely the experience a checker exists to replace.
    expect: "every violation is reported, not just the first",
    impl: `
function checkRow(row, table) {
  const violations = [];
  const stored = {};
  const known = new Set(table.columns.map((c) => c.name));
  for (const key of Object.keys(row)) {
    if (!known.has(key)) return { ok: false, stored, violations: [{ column: key, rule: "unknown_column" }] };
  }
  for (const column of table.columns) {
    const supplied = Object.prototype.hasOwnProperty.call(row, column.name);
    let value;
    if (supplied) value = row[column.name];
    else if (column.hasDefault) value = column.defaultValue;
    else value = null;
    stored[column.name] = value;
    if (value === null || value === undefined) {
      if (column.notNull) return { ok: false, stored, violations: [{ column: column.name, rule: "not_null" }] };
      continue;
    }
    if (column.unique && table.rows.some((e) => e[column.name] === value)) {
      return { ok: false, stored, violations: [{ column: column.name, rule: "unique" }] };
    }
    if (column.check && column.check(value) === false) {
      return { ok: false, stored, violations: [{ column: column.name, rule: "check" }] };
    }
  }
  return { ok: true, stored, violations };
}`,
  },
  {
    // Rule 2: an omitted nullable column is left out of `stored`
    // entirely rather than being null. The row is accepted, and the
    // caller reading stored.max_uses gets undefined -- so "unlimited"
    // and "the checker did not mention it" become the same answer.
    expect: "...and an omitted nullable column with no default is null",
    impl: build({
      RESOLVE: `
    const supplied = Object.prototype.hasOwnProperty.call(row, column.name);
    let value;
    if (supplied) value = row[column.name];
    else if (column.hasDefault) value = column.defaultValue;
    else value = undefined;`,
    }),
  },
  {
    // Rule 8: mutates the caller's row, filling defaults into it. The
    // verdict is right and the object handed back to the caller now
    // claims a status it never set -- so a second checkRow on the same
    // object cannot see the null that was originally passed.
    expect: "the input row is not mutated",
    impl: build({
      RESOLVE: `
    const supplied = Object.prototype.hasOwnProperty.call(row, column.name);
    if (!supplied && column.hasDefault) row[column.name] = column.defaultValue;
    const value = supplied || column.hasDefault ? row[column.name] : null;`,
    }),
  },
];

export const stages = {
  row: { alternatives, mistakes },
};
