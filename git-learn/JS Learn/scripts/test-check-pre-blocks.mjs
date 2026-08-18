/* test-check-pre-blocks.mjs — does the display-block check still catch anything?
 *
 * check-pre-blocks.mjs reports zero findings across all 166 lesson files. That
 * is either a clean course or a broken check, and the two look identical from
 * the outside. This suite is the only thing that tells them apart.
 *
 * It matters more than usual here because the check was tuned DOWN three times
 * to kill false positives -- shell `#` comments, non-JS blocks, JSX children.
 * Every one of those suppressions is a chance to have silenced the signal too.
 *
 *   node scripts/test-check-pre-blocks.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = path.join(ROOT, "scripts", "check-pre-blocks.mjs");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pre-blocks-"));
let pass = 0, fail = 0;

function page(body) {
  return `<html><body>${body}</body></html>`;
}
function pre(code) {
  const esc = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<pre><code>${esc}</code></pre>`;
}

/* Run the checker over a directory holding one file, return true if it FLAGGED. */
function flags(name, html) {
  const dir = fs.mkdtempSync(path.join(tmp, "case-"));
  fs.writeFileSync(path.join(dir, `${name}.html`), page(html));
  try {
    execFileSync(process.execPath, [CHECK, dir], { encoding: "utf8", cwd: ROOT });
    return false;                       // exit 0 -> nothing flagged
  } catch {
    return true;                        // exit 1 -> flagged
  }
}

function check(label, actual, expected) {
  if (actual === expected) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${expected ? "FLAG" : "clean"}, got ${actual ? "FLAG" : "clean"}`); }
}

console.log("\n1. it catches the damage it was written for");

/* The literal 02/0014 line, as it stood while the lesson was marked verified. */
check("the real 0014 shell-mangle fragment", flags("m", pre(
`const SAMPLE_TOKENS = [
  { id: '1', label: 'Flipkart delivery', code: 'KART-4KN9-RT2M', iconColor: '#2F9E7E', timy!', time: '10:32', unread: 2 },
];`)), true);

check("a stray quote in an object value", flags("m", pre(
`const config = { retries: 3, mode: 'relay', label: 'gym' unread: 0 };
function go() { return config; }`)), false);   // balanced quotes: not this check's job

check("a truncated string mid-array", flags("m", pre(
`const codes = ['KART-4KN9-RT2M', 'GYMX-7PQ8-VN3K, 'RENT-2WX7-HJ5D'];
function list() { return codes; }`)), true);

check("an unterminated double-quoted prop", flags("m", pre(
`function Row() {
  const style = { color: "#2F9E7E, fontWeight: '600' };
  return style;
}`)), true);

console.log("\n2. the three suppressions did not silence it");

check("damage inside a block that also has shell-style # lines", flags("m", pre(
`const cmd = 'docker compose up';
# See what's changed
const broken = { a: 'one', b: 'two, c: 'three' };
function run() { return broken; }`)), true);

check("damage on a line that also contains JSX", flags("m", pre(
`function Row() {
  const t = { label: 'Gym, code: 'GYMX-7PQ8-VN3K' };
  return <Text>Don't panic</Text>;
}`)), true);

console.log("\n3. it stays quiet on the things that are fine");

check("shell comment with an apostrophe", flags("m", pre(
`# See what's changed
const x = 'ok';
function f() { return x; }`)), false);

check("SQL comment with an apostrophe", flags("m", pre(
`-- the token's hash is the only lookup key
const q = 'SELECT 1';
function f() { return q; }`)), false);

check("JSX children spanning lines", flags("m", pre(
`function Login() {
  return (
    <Text>
      Don't have an account? Register
    </Text>
  );
}`)), false);

check("a JS line comment with an apostrophe", flags("m", pre(
`const x = 1;   // don't touch this
function f() { return x; }`)), false);

check("a template literal spanning lines", flags("m", pre(
'const msg = `line one\n  line two, it\'s fine`;\nfunction f() { return msg; }')), false);

check("an escaped apostrophe inside a string", flags("m", pre(
`const rows = [
  { id: 'm2', text: 'Yes, I\\'m free after 3pm.', sender: 'me' },
];
function f() { return rows; }`)), false);

check("a non-JS status-code table", flags("m", pre(
`200 OK              — request succeeded, here's the data
404 Not Found       — resource doesn't exist`)), false);

check("UI copy that merely opens with a // line", flags("m", pre(
`// When relay mode is OFF:
"Direct connection — lowest latency.
 The other party can see your IP address."`)), false);

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
