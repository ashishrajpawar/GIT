/* check-pre-blocks.mjs — the display blocks nobody executes.
 *
 * WHY THIS EXISTS
 * ---------------
 * verify-lesson.mjs runs the code a lesson *executes*: playgrounds, the
 * revealed solution, executable predict-output questions. A lesson can pass
 * every one of those while a plain <pre><code> block on the same page is
 * syntactically broken, because nothing ever parses it.
 *
 * That is not hypothetical. 02/0014 sat marked `verified` carrying
 *
 *     { id: '1', label: 'Flipkart delivery', ..., timy!', time: '10:32', ... }
 *
 * a fragment left by a bulk edit run through a shell. The student copies that
 * block into their editor and it does not parse. The verifier had no opinion,
 * because the block is display-only.
 *
 * WHAT IT CHECKS
 * --------------
 * One thing, chosen because it is the damage signature and almost nothing else:
 * a single-quoted or double-quoted string left OPEN at the end of a line. JS
 * string literals cannot span a newline, so an open one at end-of-line is a
 * broken block, full stop. Template literals CAN span lines and are tracked but
 * never reported.
 *
 * The scan is a real character walk that tracks string, line-comment and
 * block-comment state, so an apostrophe in `// don't do this` is understood as
 * a comment and not as an opening quote.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK
 * -----------------------------------
 * Not "is this block valid JavaScript". The blocks are JSX, often deliberate
 * fragments, sometimes SQL or shell, and frequently elided with `// ...`. A
 * parser would reject nearly all of them and the check would be noise inside a
 * week -- which is how this course lost its fill-blank warning and its example
 * -code warning to 87% false-positive rates nobody read any more.
 *
 * JSX TEXT IS THE ONE KNOWN BLIND SPOT
 * ------------------------------------
 * An apostrophe in JSX body text -- <Text>Don't</Text> -- opens a string as far
 * as this scanner is concerned. Those are suppressed by ignoring apostrophes
 * that sit between JSX tags on a line with no quote-delimited attribute. See
 * `looksLikeJsxProse`. If this check ever starts crying wolf, tighten there
 * first; do not lower it to a warning and leave it.
 *
 *   node scripts/check-pre-blocks.mjs            # whole course
 *   node scripts/check-pre-blocks.mjs modules/02-react-native
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function unescapeHtml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/* Only JavaScript blocks get scanned. Most <pre> blocks in this course are not
   JS -- shell, SQL, Dockerfile, nginx, plain reference tables, and UI copy that
   merely opens with a `//` line. Applying JS quoting rules to those produced
   the second wave of false positives: a status-code table reading "here's the
   data" and a settings-screen string spanning two lines are both fine, and
   neither is code a student would paste into a .js file. */
const JS_MARKERS = /\b(const|let|var|function|return|import|export|require|useState|useEffect|console\.log)\b|=>/;
function looksLikeJavaScript(code) {
  return JS_MARKERS.test(code);
}

/* JSX children are prose, not code: the apostrophe in
   `<Text style={styles.dontTitle}>Don't:</Text>` opens nothing. Blank out text
   that sits clearly between a `>` and a `<` before scanning the line. Narrow on
   purpose -- it must not eat `a > b` or the `>` of an arrow function. */
function blankJsxChildren(line) {
  return line.replace(/>([^<>]*)</g, (m, inner) => ">" + inner.replace(/['"]/g, " ") + "<");
}

/* Walk one block, returning lines that end with an open '...' or "..." */
function openStringsInBlock(code) {
  const bad = [];
  let inSingle = false, inDouble = false, inTemplate = false, inBlockComment = false;
  const lines = code.split("\n");

  lines.forEach((rawLine, idx) => {
    let inLineComment = false;
    const line = blankJsxChildren(rawLine);

    /* Whole-line comments in the other languages that live in <pre> blocks:
       `#` for shell / Dockerfile / YAML, `--` for SQL. Their prose is full of
       apostrophes ("# See what's changed") and none of it is a JS string. This
       one omission produced 71 findings on the first run, every one of them
       wrong. */
    if (!inBlockComment && !inSingle && !inDouble && !inTemplate &&
        /^\s*(#|--)/.test(line)) return;

    for (let i = 0; i < line.length; i++) {
      const c = line[i], next = line[i + 1];

      if (inBlockComment) { if (c === "*" && next === "/") { inBlockComment = false; i++; } continue; }
      if (inLineComment) continue;

      if (!inSingle && !inDouble && !inTemplate) {
        if (c === "/" && next === "/") { inLineComment = true; i++; continue; }
        if (c === "/" && next === "*") { inBlockComment = true; i++; continue; }
      }

      if (c === "\\") { i++; continue; }            // escape: skip next char

      if (c === "'"  && !inDouble && !inTemplate) inSingle = !inSingle;
      else if (c === '"'  && !inSingle && !inTemplate) inDouble = !inDouble;
      else if (c === "`"  && !inSingle && !inDouble)   inTemplate = !inTemplate;
    }

    if (inSingle || inDouble) {
      /* Report only when a quote sits in a CODE position -- straight after
         `:`, `=`, `(`, `,` or `[`. JSX children spanning several lines are the
         last big false-positive family ("Don't have an account? Register" on
         its own line inside a <Text>), and prose never opens a quote that way.
         The damage this check exists for always does:
             { id: '1', label: 'Flipkart delivery', ..., timy!', time: '10:32' } */
      if (/[:=(,[]\s*['"]/.test(rawLine)) {
        bad.push({ line: idx + 1, text: rawLine.trim(), quote: inSingle ? "'" : '"' });
      }
      inSingle = inDouble = false;                  // resync so one break != N reports
    }
  });

  return bad;
}

function htmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/* Exported so audit.mjs can run it as part of the standing checks rather than
   this living as a script nobody remembers to type. */
export function scanPreBlocks(target) {
  const findings = [];
  let blocksScanned = 0, blocksSkipped = 0, filesScanned = 0;

  for (const file of htmlFiles(target)) {
    const raw = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    filesScanned++;

    for (const m of raw.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)) {
      const code = unescapeHtml(m[1]);
      if (!looksLikeJavaScript(code)) { blocksSkipped++; continue; }
      blocksScanned++;
      const blockStartLine = raw.slice(0, m.index).split("\n").length;
      for (const hit of openStringsInBlock(code)) {
        findings.push({ file: rel, line: blockStartLine + hit.line - 1, ...hit });
      }
    }
  }
  return { findings, blocksScanned, blocksSkipped, filesScanned };
}

/* CLI only when run directly, so importing it stays side-effect free. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, "modules");
  const { findings, blocksScanned, blocksSkipped, filesScanned } = scanPreBlocks(target);

  for (const f of findings) {
    console.log(`${f.file}:${f.line}`);
    console.log(`    unterminated ${f.quote} string:  ${f.text}\n`);
  }
  console.log(`scanned ${blocksScanned} JavaScript <pre> blocks in ${filesScanned} files ` +
              `(${blocksSkipped} non-JS blocks skipped)`);
  if (findings.length) {
    console.log(`\n${findings.length} broken display block(s) — a student copying these gets a syntax error`);
    process.exit(1);
  }
  console.log("no unterminated strings in display blocks");
}
