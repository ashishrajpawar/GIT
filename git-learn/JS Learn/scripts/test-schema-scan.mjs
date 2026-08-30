/* test-schema-scan.mjs — does the orphan-table check still catch anything?
 *
 * The check exists because `calls` was queried by b7 and created by nobody, and
 * the orphan turned out to be a real defect rather than a documentation gap:
 * the per-day call cap was counting an empty table and permitting unlimited
 * calls. That is the class of bug this must keep finding.
 *
 * It gained a suppression on 2026-08-30 — Postgres system schemas — and this
 * file exists so that suppression cannot quietly widen into "and anything else
 * that looked noisy at the time". Both directions, as with token-scan.
 *
 *   node scripts/test-schema-scan.mjs
 */
import { tablesIn, orphanTablesIn } from "./schema-scan.mjs";

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? "  ok    " : "  FAIL  ") + label);
  if (!ok) console.log(`          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  ok ? pass++ : fail++;
}
const q = (code) => tablesIn(code).queried;
const c = (code) => tablesIn(code).created;

console.log("\n1. CREATE TABLE is recognised in the forms this course writes");

check("plain", c("CREATE TABLE users (\n  id SERIAL PRIMARY KEY\n);"), ["users"]);
check("IF NOT EXISTS", c("CREATE TABLE IF NOT EXISTS schema_migrations (id INT);"), ["schema_migrations"]);
check("lower case", c("create table access_rules (id INT);"), ["access_rules"]);
check("several in one migration",
  c("CREATE TABLE users (id INT);\nCREATE TABLE tokens (id INT);"), ["users", "tokens"]);

console.log("\n2. all four reference forms are found");

check("INSERT INTO", q("INSERT INTO redemption_events (token_id) VALUES ($1)"), ["redemption_events"]);
check("UPDATE ... SET", q("UPDATE tokens SET status = 'revoked'"), ["tokens"]);
check("DELETE FROM", q("DELETE FROM otp_requests WHERE phone_hash = $1"), ["otp_requests"]);
check("SELECT ... FROM", q("SELECT id, label FROM tokens WHERE user_id = $1"), ["tokens"]);
check("JOIN ... ON", q("SELECT * FROM a_table JOIN conversations c ON c.id = m.conversation_id"),
  ["a_table", "conversations"]);

console.log("\n3. the real orphan is still caught end to end");

/* This is the b6/b7 defect exactly: the reader existed, the writer did not. */
check("a table queried and never created is reported",
  orphanTablesIn([
    { id: "b7/0002", code: "SELECT COUNT(*) FROM calls WHERE token_id = $1" },
    { id: "b2/0001", code: "CREATE TABLE tokens (id SERIAL PRIMARY KEY);" },
  ]),
  [{ table: "calls", files: ["b7/0002"] }]);

check("a table created anywhere in the course clears it everywhere",
  orphanTablesIn([
    { id: "b7/0002", code: "SELECT COUNT(*) FROM calls WHERE token_id = $1" },
    { id: "b6/0001", code: "CREATE TABLE calls (id BIGSERIAL PRIMARY KEY);" },
  ]),
  []);

check("every file that queries an orphan is named, not just the first",
  orphanTablesIn([
    { id: "b7/0002", code: "SELECT id FROM calls" },
    { id: "b7/0003", code: "DELETE FROM calls WHERE id = $1" },
  ]),
  [{ table: "calls", files: ["b7/0002", "b7/0003"] }]);

console.log("\n4. Postgres system schemas are the database describing itself");

/* The false positive that caused the extraction. b10/0002 teaches generating
   the foreign-key list rather than reading it off the page, which means
   querying the catalog. */
check("information_schema is not an orphan",
  q("SELECT tc.table_name FROM information_schema.table_constraints tc"), []);

check("pg_catalog is not an orphan",
  q("SELECT relname FROM pg_catalog.pg_class"), []);

check("the pg_ prefix covers the whole catalog without listing it",
  q("SELECT * FROM pg_stat_activity"), []);

/* The narrowing must not become an escape hatch: a real table is still judged
   in the same statement as a system one. */
check("a real orphan alongside a system schema is still reported",
  orphanTablesIn([{ id: "x", code:
    "SELECT * FROM information_schema.columns;\nSELECT id FROM widgets WHERE id = $1" }]),
  [{ table: "widgets", files: ["x"] }]);

/* The suppression is the `pg_` prefix, which Postgres reserves — not the
   letters "pg". A table called pgboss_jobs is an ordinary table and must still
   be judged, or the escape hatch is two characters wide. */
check("a table merely NAMED like the catalog is still judged",
  q("SELECT id FROM pgboss_jobs"), ["pgboss_jobs"]);

console.log("\n5. SQL grammar is not mistaken for table names");

for (const word of ["select", "values", "where", "only", "set", "and", "not", "null"]) {
  check(`the keyword ${word} is grammar`,
    q(`INSERT INTO ${word} (a) VALUES (1)`), []);
}

console.log("\n6. English prose is not SQL");

/* The failure mode the grammar-matching exists to prevent: a bare FROM/JOIN
   scan invents tables out of ordinary sentences. */
check("a sentence containing 'from' invents nothing",
  q("// the value returned from the screen is discarded"), []);

check("'join' in prose invents nothing",
  q("Two people join a call and neither learns the other's address."), []);

check("FROM without a SELECT is not a query",
  q("-- copied from the migration above"), []);

console.log("\n7. SQL inside a JS string literal is still SQL");

/* Where most real queries in this course actually live — the reason the
   scanner does not restrict itself to blocks that "look like SQL". */
check("a template literal query is scanned",
  q("await db.query(`SELECT id FROM key_backups WHERE user_id = $1`, [id])"),
  ["key_backups"]);

check("a single-quoted query is scanned",
  q("await client.query('DELETE FROM push_receipts WHERE user_id = $1', [id])"),
  ["push_receipts"]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
