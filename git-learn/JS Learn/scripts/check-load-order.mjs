/* check-load-order.mjs — the widget that never renders.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every lesson calls its widgets from an inline <script> in the body:
 *
 *     <div id="pg-exercise"></div>
 *     <script>createPlayground("pg-exercise", `...`);</script>
 *
 * and loads the widget itself from a <script src> tag somewhere on the page.
 * Classic scripts run in document order, so if the src tag comes AFTER the
 * call, `createPlayground` is not defined yet: the inline script throws a
 * ReferenceError, and — because one throw ends that script block — the widget
 * never renders. In several lessons the very first inline call is the one that
 * dies, taking the whole page's exercises with it.
 *
 * Nothing in this project could see that. `verify-lesson.mjs` reads the
 * playground and solution CONFIGS straight out of the HTML with a parser of its
 * own and runs them in `node:vm`; it never loads the page, so document order is
 * invisible to it. `audit.mjs` counted a `createExplain(` call as proof the
 * prompt was present. Both were true of pages where the student sees nothing.
 *
 * It was found on 2026-08-28 while writing C1/0001, by copying the structure of
 * C0 — the newest and most carefully written module in the course, whose two
 * lessons load every asset AFTER every call. 26 files were affected:
 *
 *   - all 16 F1 lessons called createExplain before explain.js. F1 has no quiz
 *     and no self-check by design, so that prompt is its ONLY assessment, and
 *     audit.mjs errors if the source lacks one. The check and the defect were
 *     looking at the same line and disagreeing.
 *   - both C0 lessons: every widget, dead.
 *   - six B2/B3 lessons called createPlayground with playground.js not on the
 *     page at all.
 *   - x2/0001 called createExplain with explain.js not on the page at all.
 *
 * WHAT IT CHECKS
 * --------------
 * For each of the five widget entry points, if a lesson calls it, the matching
 * asset must be loaded, and loaded EARLIER in the file. Two findings:
 *
 *   missing   — the call exists and the <script src> is nowhere on the page
 *   late      — the <script src> is there but below the first call
 *
 * The rule is deliberately "before first use" rather than a fixed position.
 * Head or end-of-body is a matter of taste; being defined before you are
 * called is what the browser actually requires, and it is mechanical.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK
 * -----------------------------------
 * `defer`, `async` and `type="module"` change execution order, and none of them
 * are used anywhere in this course — every tag is a plain classic script. If
 * that ever changes this check needs to learn about it, and the test suite
 * asserts the current shape so the change cannot pass unnoticed.
 *
 * It also does not check the dom-sandbox.js ordering requirement (it must
 * precede playground.js). That one has no call site to key on — it is consumed
 * by playground.js at Run time, not by lesson code — so there is nothing to
 * compare a position against.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* The five entry points, and the file each one is defined in. */
export const WIDGETS = {
  createQuiz: "quiz.js",
  createPlayground: "playground.js",
  createSolution: "solution.js",
  createExplain: "explain.js",
  createSearch: "search.js",
};

/* Scan one page's source. Returns findings, or [] when the page is fine. */
export function scanLoadOrder(html, rel = "") {
  const findings = [];
  const lineOf = (idx) => html.slice(0, idx).split("\n").length;

  for (const [fn, src] of Object.entries(WIDGETS)) {
    /* The call site: the identifier followed by an open paren. Matching the
       paren is what keeps a mention in prose ("the createQuiz widget") from
       counting as a call. */
    const call = html.search(new RegExp(fn + "\\s*\\("));
    if (call === -1) continue;

    /* Any src ending in the asset name, whatever the relative prefix. A page
       one directory up uses ./assets/, a lesson uses ../../assets/. */
    const tag = html.search(new RegExp('<script[^>]*src="[^"]*' + src.replace(".", "\\.") + '"'));

    if (tag === -1) {
      findings.push({ file: rel, kind: "missing", fn, src, line: lineOf(call) });
    } else if (tag > call) {
      findings.push({ file: rel, kind: "late", fn, src, line: lineOf(call), tagLine: lineOf(tag) });
    }
  }
  return findings;
}

function htmlFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const out = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

export function scanLoadOrderIn(target) {
  const findings = [];
  let filesScanned = 0;
  for (const file of htmlFiles(target)) {
    filesScanned++;
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    findings.push(...scanLoadOrder(fs.readFileSync(file, "utf8"), rel));
  }
  return { findings, filesScanned };
}

/* CLI only when run directly, so importing it stays side-effect free. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, "modules");
  const { findings, filesScanned } = scanLoadOrderIn(target);

  for (const f of findings) {
    if (f.kind === "missing") {
      console.log(`${f.file}:${f.line}`);
      console.log(`    calls ${f.fn}() and never loads assets/${f.src}\n`);
    } else {
      console.log(`${f.file}:${f.line}`);
      console.log(`    calls ${f.fn}() before assets/${f.src} loads (line ${f.tagLine})\n`);
    }
  }
  console.log(`scanned ${filesScanned} file(s)`);
  if (findings.length) {
    console.log(`\n${findings.length} widget(s) that never render — the student sees an empty div`);
    process.exit(1);
  }
  console.log("every widget is defined before it is called");
}
