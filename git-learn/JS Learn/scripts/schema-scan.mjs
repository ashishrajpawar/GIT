/* The schema scanner, extracted from audit.mjs on 2026-08-30 so that it can be
   tested in both directions.

   It answers one question across the whole course: is there a table the lessons
   QUERY that no lesson ever CREATES? That question has already earned its keep
   — `calls` was an orphan for weeks, and the orphan was the symptom of a real
   defect rather than a documentation gap: b7 read the table, nothing wrote it,
   and the per-day call cap was counting an empty table and permitting unlimited
   calls.

   It is extracted for the same reason `token-scan.mjs` was, two commits ago and
   for the third time in this project: it is an ERROR with several suppression
   clauses and nothing testing any of them. A suppression is where a check goes
   to die quietly, and the three in here have never been exercised by anything.

   What triggered the extraction: `information_schema` was reported as a table
   queried but never created, after b10/0002 gained a query against Postgres's
   own catalog. That is a false positive of the worst kind — it is *correct*
   about the text and wrong about the world, and the fix ("just add it to the
   ignore list") is one line that nothing would ever check again.

   Both directions are asserted in test-schema-scan.mjs. */

/**
 * Match SQL *grammar*, not whole blocks. Two failure modes to avoid:
 *   - Scanning every <pre> for bare FROM/JOIN pulls in English from JS comments
 *     and invents dozens of tables.
 *   - Scanning only blocks that "look like SQL" misses SQL inside JS string
 *     literals — which is where most of the real queries live.
 * Requiring a SQL continuation token after the table name handles both.
 */
const REFS = [
  /\bINSERT\s+INTO\s+([a-z_]{3,})\s*\(/gi,
  /\bUPDATE\s+([a-z_]{3,})\s+SET\b/gi,
  /\bDELETE\s+FROM\s+([a-z_]{3,})\b/gi,
  // A bare /FROM (\w+)/ matches English ("returned from the screen"), so the
  // statement must actually open with SELECT.
  /\bSELECT\b[\s\S]{0,400}?\bFROM\s+([a-z_]{3,})\b/gi,
  /\bJOIN\s+([a-z_]{3,})(?:\s+(?:AS\s+)?[a-z_]{1,3})?\s+ON\b/gi,
];

/* Words that land in the capture group while being grammar rather than a table
   name. Each one was a real false positive at some point. */
const SQL_KEYWORDS = new Set([
  "select", "values", "where", "only", "dual", "set", "and", "not", "null",
]);

/* Schemas Postgres ships with. Nothing in this course creates them and nothing
   ever should, so a reference to one is not an orphan — it is the database
   describing itself.

   `pg_` covers the whole catalog (pg_class, pg_stat_activity, pg_indexes…)
   without listing it, and no table in this product may be named pg_anything:
   Postgres reserves the prefix. */
const SYSTEM_SCHEMAS = new Set(["information_schema", "pg_catalog"]);
const isSystem = (name) => SYSTEM_SCHEMAS.has(name) || name.startsWith("pg_");

/**
 * Every table name created and referenced in one blob of extracted code.
 *
 * Returns `{ created: string[], queried: string[] }`, lower-cased, each unique
 * and in first-seen order. The caller decides what an orphan is — it needs the
 * whole course to know that.
 */
export function tablesIn(code) {
  const created = [];
  const queried = [];

  for (const m of code.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-z_]+)/gi)) {
    const t = m[1].toLowerCase();
    if (!created.includes(t)) created.push(t);
  }

  for (const re of REFS) {
    for (const m of code.matchAll(re)) {
      const t = m[1].toLowerCase();
      if (SQL_KEYWORDS.has(t)) continue;
      if (isSystem(t)) continue;
      if (!queried.includes(t)) queried.push(t);
    }
  }

  return { created, queried };
}

/**
 * The orphans across a whole course.
 *
 * `sources` is `[{ id, code }]`. Returns `[{ table, files }]` in first-seen
 * order — a table queried somewhere and created nowhere.
 */
export function orphanTablesIn(sources) {
  const created = new Set();
  const queried = new Map();

  for (const { id, code } of sources) {
    const found = tablesIn(code);
    for (const t of found.created) created.add(t);
    for (const t of found.queried) {
      if (!queried.has(t)) queried.set(t, []);
      if (!queried.get(t).includes(id)) queried.get(t).push(id);
    }
  }

  return [...queried.entries()]
    .filter(([t]) => !created.has(t))
    .map(([table, files]) => ({ table, files }));
}
