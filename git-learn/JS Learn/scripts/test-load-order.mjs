/* test-load-order.mjs — does the widget load-order check still catch anything?
 *
 * check-load-order.mjs reports zero findings across the whole course once the
 * 26 broken files are repaired. That is either a healthy course or a dead
 * check, and the two look identical from outside — the same problem
 * test-check-pre-blocks.mjs exists for.
 *
 * It matters here because the defect this check finds is INVISIBLE to every
 * other tool in the project. verify-lesson.mjs parses widget configs out of the
 * HTML itself and runs them in node:vm, so document order never comes up; it
 * marked all 26 files `verified`. audit.mjs read a createExplain( call as proof
 * the F1 prompt was present, on 16 pages where the prompt never rendered.
 *
 *   node scripts/test-load-order.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanLoadOrder, scanLoadOrderIn, WIDGETS } from "./check-load-order.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? "  ok    " : "  FAIL  ") + label);
  if (!ok) console.log(`          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  ok ? pass++ : fail++;
}

/* Findings reduced to "kind:function", which is what the assertions are about.
   Line numbers are deliberately not asserted — they would make every test
   brittle against an added blank line, and the line number is not the
   behaviour under test. */
const kinds = (html) => scanLoadOrder(html).map((f) => `${f.kind}:${f.fn}`);

const page = (body) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body>
${body}
</body></html>`;

const TAG = (src) => `<script src="../../assets/${src}"></script>`;

console.log("\n1. the two real failure shapes are caught");

check("a call below its script tag is fine",
  kinds(page(`${TAG("playground.js")}\n<script>createPlayground("pg", "code");</script>`)), []);

check("a call ABOVE its script tag is late",
  kinds(page(`<script>createPlayground("pg", "code");</script>\n${TAG("playground.js")}`)),
  ["late:createPlayground"]);

check("a call with no script tag at all is missing",
  kinds(page(`<script>createPlayground("pg", "code");</script>`)),
  ["missing:createPlayground"]);

/* The C0 shape: every asset at the very end, every call above it. This is the
   one that shipped, in the newest module in the course. */
check("the C0 shape — four widgets, all loaded after all of them are called",
  kinds(page(`<script>createPlayground("pg", "x");</script>
<script>createSolution("ex", {});</script>
<script>createExplain("ex1", {});</script>
<script>createQuiz("q", []);</script>
${TAG("quiz.js")}
${TAG("playground.js")}
${TAG("solution.js")}
${TAG("explain.js")}`)),
  ["late:createQuiz", "late:createPlayground", "late:createSolution", "late:createExplain"]);

/* The F1 shape: everything else is fine and the one mandatory widget is late.
   F1 has no quiz and no self-check, so this single finding is the whole
   assessment of the module not rendering. */
check("the F1 shape — only createExplain is late",
  kinds(page(`<script>createExplain("explain-f1-0001", { prompt: "..." });</script>
${TAG("explain.js")}
${TAG("progress.js")}`)),
  ["late:createExplain"]);

/* The B2/B3 shape: a script block that is correctly placed but incomplete. */
check("the B2 shape — tags present and above, but playground.js absent",
  kinds(page(`${TAG("quiz.js")}
${TAG("solution.js")}
<script>createSolution("ex", {});</script>
<script>createPlayground("pg-exercise-normalise", "code");</script>`)),
  ["missing:createPlayground"]);

console.log("\n2. it does not cry wolf");

check("a lesson that loads everything first",
  kinds(page(`${TAG("quiz.js")}
${TAG("playground.js")}
${TAG("solution.js")}
${TAG("explain.js")}
<script>createPlayground("pg", "x");</script>
<script>createSolution("ex", {});</script>
<script>createExplain("e", {});</script>
<script>createQuiz("q", []);</script>`)), []);

check("a lesson using no widgets at all",
  kinds(page("<h1>Prose only</h1><p>Nothing to render.</p>")), []);

/* A widget NAMED in prose is not a widget CALLED. Documentation pages and
   several lesson callouts discuss createQuiz by name; flagging those would be
   the false-positive rate that gets a check ignored. */
check("a widget merely named in prose, with no call",
  kinds(page("<p>The <code>createQuiz</code> widget renders the quiz.</p>")), []);

check("a widget named in prose while a different one is genuinely late",
  kinds(page(`<p>See <code>createSolution</code> for the exercise component.</p>
<script>createExplain("e", {});</script>
${TAG("explain.js")}`)),
  ["late:createExplain"]);

/* Whitespace between the name and the paren is legal JavaScript and must still
   count as a call. */
check("a call written with a space before the paren",
  kinds(page(`<script>createQuiz ("q", []);</script>\n${TAG("quiz.js")}`)),
  ["late:createQuiz"]);

/* index.html sits one directory up and uses a shorter relative path. The check
   must key on the asset filename, not on ../../ */
check("a different relative prefix still counts as loaded",
  kinds(page(`<script src="./assets/search.js"></script>\n<script>createSearch("box");</script>`)),
  []);

console.log("\n3. the assumption the check is built on still holds");

/* The check reads document order literally, which is only correct while every
   asset tag is a plain classic script. `defer`, `async` and type="module" all
   move execution, and a deferred asset genuinely loaded after its call would
   work in a browser while this check called it late — or, worse, a deferred
   asset ABOVE its call would break in a browser while the check stayed quiet.
   Neither is a bug today because none of them are used. If that changes, this
   assertion fails and whoever changed it has to teach the check first. */
const { findings } = scanLoadOrderIn(path.join(ROOT, "modules"));
check("the whole course is clean", findings.map((f) => `${f.file}:${f.kind}`), []);

const fs = await import("node:fs");
const assetTags = [];
for (const dir of ["modules", "reference"]) {
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".html")) {
        const html = fs.readFileSync(full, "utf8");
        for (const m of html.matchAll(/<script[^>]*src="[^"]*assets\/[^"]+"[^>]*>/g)) assetTags.push(m[0]);
      }
    }
  };
  walk(path.join(ROOT, dir));
}
check("every asset tag in the course is a plain classic script",
  assetTags.filter((t) => /\b(defer|async)\b|type="module"/.test(t)), []);

check("the widget list still names five entry points",
  Object.keys(WIDGETS).length, 5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
