/**
 * Wrong-answer cases for C1/0004 — rowsToToken.
 *
 *   node scripts/verify-lesson.mjs modules/c1-testing-quality/0004-testing-against-postgres.html \
 *        --wrong scripts/cases/0004-testing-against-postgres.mjs
 *
 * Staged: only `rows` has cases. `exercise-suite` carries its own per-exercise
 * `unverifiable` reason — it connects to a real Postgres — and the lesson still
 * reaches `verified` because this stage actually executes.
 *
 * TWO BLIND SPOTS, LEFT OPEN DELIBERATELY, because closing them would mean
 * testing resemblance rather than behaviour:
 *
 *   - Taking the token's columns from `rows[rows.length - 1]` instead of
 *     `rows[0]` passes everything. A join repeats the left side identically on
 *     every row, so the fixtures cannot tell the two apart — and inventing rows
 *     where they disagree would be inventing a database that does not exist.
 *   - Filtering the rule rows on `rule_type !== null` instead of
 *     `rule_id !== null` also passes. Both are null on the same row. `rule_id`
 *     is the column the join is keyed on, so it stays correct if a rule type is
 *     ever permitted to be null, but today the choice is unobservable.
 */

export const stages = {
  rows: {
    alternatives: {
      "a for-of loop instead of filter and map": `
function rowsToToken(rows) {
  if (rows.length === 0) return null;

  const first = rows[0];
  const rules = [];
  for (const r of rows) {
    if (r.rule_id === null) continue;
    rules.push({ id: r.rule_id, type: r.rule_type, payload: r.payload });
  }

  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rules
  };
}`,

      "reduce, with destructuring in the callback": `
function rowsToToken(rows) {
  if (!rows.length) return null;

  const { token_id, status, expires_at, max_uses } = rows[0];

  const rules = rows.reduce(function (acc, r) {
    if (r.rule_id !== null) acc.push({ id: r.rule_id, type: r.rule_type, payload: r.payload });
    return acc;
  }, []);

  return { id: token_id, status: status, expiresAt: expires_at, maxUses: max_uses, rules: rules };
}`,

      "the guard written as a ternary over the whole body": `
function toRule(r) {
  return { id: r.rule_id, type: r.rule_type, payload: r.payload };
}

function rowsToToken(rows) {
  return rows.length === 0 ? null : {
    id: rows[0].token_id,
    status: rows[0].status,
    expiresAt: rows[0].expires_at,
    maxUses: rows[0].max_uses,
    rules: rows.filter(function (r) { return r.rule_id !== null; }).map(toRule)
  };
}`,

      "?? instead of a plain copy, which is a no-op here but survives undefined": `
function rowsToToken(rows) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at ?? null,
    maxUses: first.max_uses ?? null,
    rules: rows
      .filter(function (r) { return r.rule_id !== null; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
    },

    mistakes: {
      /* No guard at all. The friendly version of the bug, because it crashes
         rather than answering. */
      "rows[0] read before checking there is one": {
        impl: `
function rowsToToken(rows) {
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows
      .filter(function (r) { return r.rule_id !== null; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
        expect: "Cannot read properties of undefined",
      },

      /* The dangerous version: an empty token rather than no token. The
         caller now cannot tell a code nobody ever issued from a token with
         nothing attached, and deny-by-default rests on that distinction. */
      "an empty token returned for no rows": {
        impl: `
function rowsToToken(rows) {
  if (rows.length === 0) {
    return { id: null, status: null, expiresAt: null, maxUses: null, rules: [] };
  }
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows
      .filter(function (r) { return r.rule_id !== null; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
        expect: "no rows means no token",
      },

      /* Every row mapped, including the null one the LEFT JOIN produced. The
         token comes back carrying a rule whose type is null, and what the
         engine does with a rule it cannot evaluate is the next bug along. */
      "the null rule row mapped into a rule": {
        impl: `
function rowsToToken(rows) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows.map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
        expect: "...and its rules are an empty array",
      },

      /* The helpful filter. An unenforceable rule becomes an invisible one,
         and an invisible restriction is no restriction. */
      "rules filtered down to the three known types": {
        impl: `
const KNOWN = ["time_window", "contact_limit", "channel_restrict"];

function rowsToToken(rows) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows
      .filter(function (r) { return r.rule_id !== null && KNOWN.indexOf(r.rule_type) !== -1; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
        expect: "an unrecognised rule type is carried through, not dropped",
      },

      /* || on a column where 0 and null mean opposite things. A token issued
         to permit no uses at all becomes one that permits any number. */
      "max_uses defaulted with ||": {
        impl: `
function rowsToToken(rows) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at || null,
    maxUses: first.max_uses || null,
    rules: rows
      .filter(function (r) { return r.rule_id !== null; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
        expect: "max_uses of 0 survives as 0, not as null",
      },

      /* Tidying the rows on the way past. Harmless here and not harmless to
         the caller, who passed in an object it still intends to use. */
      "the rows normalised in place before reading them": {
        impl: `
function rowsToToken(rows) {
  if (rows.length === 0) return null;

  rows.forEach(function (r) { r.payload = r.payload || {}; });

  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows
      .filter(function (r) { return r.rule_id !== null; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
  };
}`,
        expect: "the input rows are not modified",
      },

      /* Rules reversed. Nothing about the shape is wrong and rule order is
         the thing a precedence-sensitive engine reads. */
      "the rules returned newest first": {
        impl: `
function rowsToToken(rows) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows
      .filter(function (r) { return r.rule_id !== null; })
      .map(function (r) { return { id: r.rule_id, type: r.rule_type, payload: r.payload }; })
      .reverse()
  };
}`,
        expect: "rules keep their row order",
      },

      /* The rows handed back as they came out of the driver. Everything is
         present and nothing is named what the rest of the code expects. */
      "the raw rows used as the rules": {
        impl: `
function rowsToToken(rows) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return {
    id: first.token_id,
    status: first.status,
    expiresAt: first.expires_at,
    maxUses: first.max_uses,
    rules: rows.filter(function (r) { return r.rule_id !== null; })
  };
}`,
        expect: "rules keep their row order",
      },
    },
  },
};
