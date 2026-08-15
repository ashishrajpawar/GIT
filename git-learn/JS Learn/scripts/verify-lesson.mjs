#!/usr/bin/env node
/**
 * verify-lesson.mjs — run a lesson's practice material and prove it works.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0006-scope-and-closures.html
 *
 * Checks, in order:
 *   1. every inline <script> parses (an unescaped </script> silently kills one)
 *   2. every playground runs under the real loop guard and output cap
 *   3. every predict-output quiz answer matches what the code actually prints
 *   4. the revealed solution passes its own self-check
 *
 * DOM lessons: playgrounds created with `{ dom: true }` and predict-output
 * questions touching `document` or `localStorage` run against the sandbox in
 * assets/dom-sandbox.js — the same one the browser loads, so the verifier and
 * the student see identical behaviour. Before this existed, every DOM question
 * was skipped and every DOM playground failed open.
 *
 * What it deliberately does NOT do: judge whether the prose is any good, or
 * whether a wrong answer trips only its own check. Those need a human and a
 * per-lesson list of wrong answers respectively — see --wrong below.
 *
 *   --wrong <file.mjs>   a module exporting { alternatives, mistakes } to test
 *                        that other correct styles pass and each mistake fails
 *                        only the check it should.
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const lessonArg = args.find((a) => !a.startsWith("--"));
const wrongIdx = args.indexOf("--wrong");
const wrongFile = wrongIdx >= 0 ? args[wrongIdx + 1] : null;

if (!lessonArg) {
  console.error("usage: node scripts/verify-lesson.mjs <lesson.html> [--wrong <cases.mjs>]");
  process.exit(2);
}

const lessonPath = path.resolve(ROOT, lessonArg);
const html = fs.readFileSync(lessonPath, "utf8");
let failures = 0;
const fail = (m) => { failures++; console.log("  FAIL  " + m); };
const ok = (m) => console.log("  ok    " + m);

// ---- the real playground guard, borrowed rather than reimplemented --------
const pgSrc = fs.readFileSync(path.join(ROOT, "assets", "playground.js"), "utf8");
const guardSrc = pgSrc.slice(pgSrc.indexOf("var TIME_BUDGET_MS"), pgSrc.indexOf("function runCode"));
const { instrument, makeTicker, MAX_OUTPUT_LINES } =
  new Function(guardSrc + ";return {instrument, makeTicker, MAX_OUTPUT_LINES};")();

// ---- the same DOM the browser playground uses, for the same reason --------
const domSrc = fs.readFileSync(path.join(ROOT, "assets", "dom-sandbox.js"), "utf8");
const createDomSandbox = new Function(domSrc + "\nreturn createDomSandbox;")();

// ---- 1. parse -------------------------------------------------------------
console.log("\n1. inline <script> blocks parse");
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
blocks.forEach((b, i) => {
  try { new vm.Script(b); ok(`block ${i + 1}`); }
  catch (e) { fail(`block ${i + 1}: ${e.message.slice(0, 70)}`); }
});

// ---- collect payloads -----------------------------------------------------
const playgrounds = {};
const solutions = {};
const quizzes = {};
for (const b of blocks) {
  if (!/create(Quiz|Playground|Solution)\s*\(/.test(b)) continue;
  const permissive = new Proxy(function () {}, {
    get: () => permissive, apply: () => permissive, set: () => true,
    has: () => true, construct: () => permissive,
  });
  const ctx = {
    createPlayground: (id, code, opts) => (playgrounds[id] = { code, opts: opts || {} }),
    createSolution: (id, cfg) => (solutions[id] = cfg),
    createQuiz: (id, qs) => (quizzes[id] = qs),
    document: permissive, window: permissive, console: { log() {}, warn() {}, error() {} },
    setTimeout() {}, addEventListener() {},
  };
  ctx.globalThis = ctx;
  try { vm.createContext(ctx); new vm.Script(b).runInContext(ctx, { timeout: 5000 }); }
  catch (e) { fail(`evaluating a block: ${e.message.slice(0, 70)}`); }
}

/** Run code the way the playground does: instrumented, guarded, log captured.
 *  setTimeout callbacks are queued and drained afterwards — without that, any
 *  playground demonstrating async behaviour (the classic var-in-a-loop closure
 *  trap, for one) silently produces no output and looks like it passed.
 *
 *  `opts.dom` swaps in the sandboxed document from assets/dom-sandbox.js, the
 *  same one the browser gets, with `opts.html` as the starting body. Returns
 *  `dom` — the final markup — so a caller can assert on the page, not just the
 *  logs. */
function runLikePlayground(code, opts = {}) {
  const logs = [];
  const fake = {
    log: (...a) => {
      if (logs.length >= MAX_OUTPUT_LINES) throw new Error("__CAP__");
      logs.push(a.map((v) => {
        if (v && v.__isDomNode) return String(v);   // elements print as markup
        return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
      }).join(" "));
    },
  };
  fake.warn = fake.info = fake.error = fake.log;

  const queue = [];
  const setTimeoutShim = (fn, ms) => { queue.push([fn, ms || 0]); return queue.length; };

  const sandbox = opts.dom ? createDomSandbox(opts.html || "") : null;

  let threw = null;
  try {
    const names = ["console", "__tick", "setTimeout"];
    const values = [fake, makeTicker(), setTimeoutShim];
    if (sandbox) {
      names.push("document", "window", "localStorage", "Event");
      values.push(sandbox.document, sandbox.window, sandbox.localStorage, sandbox.Event);
    }
    new Function(...names, instrument(code))(...values);
    // Drain in delay order, as a browser would. Callbacks may queue more.
    for (let guard = 0; queue.length && guard < 10000; guard++) {
      queue.sort((a, b) => a[1] - b[1]);
      const [fn] = queue.shift();
      fn();
    }
  } catch (e) {
    threw = e && e.message === "__CAP__" ? "output cap" : `${e.name}: ${e.message}`;
  }
  return { logs, threw, dom: sandbox ? sandbox.serialize() : null };
}

// ---- 2. playgrounds run ---------------------------------------------------
console.log("\n2. playgrounds run (deliberate breakage is expected, hangs are not)");
for (const [id, pg] of Object.entries(playgrounds)) {
  if (id === "pg-exercise") continue; // covered by the self-check below
  const t0 = Date.now();
  const { logs, threw } = runLikePlayground(pg.code, pg.opts);
  const ms = Date.now() - t0;
  const tag = pg.opts.dom ? " [dom]" : "";
  if (ms > 4000) fail(`${id}: took ${ms}ms — the guard is not stopping it`);
  else ok(`${id}${tag}: ${logs.length} lines, ${ms}ms${threw ? `, stopped by ${threw.slice(0, 40)}` : ""}`);
}

// ---- 3. predict-output answers -------------------------------------------
console.log("\n3. predict-output answers match what the code prints");
let checked = 0;
for (const [qid, qs] of Object.entries(quizzes)) {
  for (const [i, q] of qs.entries()) {
    if (q.type !== "predict-output" || !q.code) continue;

    /* DOM questions used to be skipped wholesale. They now run against the
       sandbox, using the question's own `html` as the starting page — which is
       the same markup the student is shown, so the two cannot drift. */
    const needsDom = /\b(document|localStorage)\b/.test(q.code) || q.html;
    // Still skip anything needing a server, React Native, or a database.
    if (/require\(|fetch\(|React|useState|StyleSheet|expo|SELECT |INSERT /.test(q.code)) continue;
    if (!needsDom && /window\./.test(q.code)) continue;

    const { logs, threw } = runLikePlayground(q.code, needsDom ? { dom: true, html: q.html } : {});
    if (threw) continue; // e.g. deliberately-throwing snippets
    const norm = (s) => String(s).replace(/['"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    checked++;
    if (norm(logs.join("\n")) !== norm(q.answer))
      fail(`${qid} q${i}: stated ${JSON.stringify(q.answer)} but prints ${JSON.stringify(logs.join("\n"))}`);
  }
}
ok(`${checked} executable predict-output questions verified`);

// ---- 4. the revealed solution passes its own self-check -------------------
console.log("\n4. revealed solution passes its self-check");
const MARKER = "// --- Self-check: leave everything below this line alone ---";
for (const [id, cfg] of Object.entries(solutions)) {
  const pg = playgrounds["pg-exercise"];
  if (!pg || !pg.code.includes(MARKER)) { fail(`${id}: no self-check found in pg-exercise`); continue; }
  const selfCheck = pg.code.split(MARKER)[1];
  // Strip the solution's own demo calls — the self-check supplies its own data.
  const impl = cfg.solution.split("\n").filter((l) => !/^console\.log|^const \w+ = create|^const \w+ = make/.test(l.trim())).join("\n");
  const { logs, threw } = runLikePlayground(impl + "\n" + selfCheck, pg.opts);
  if (threw) { fail(`${id}: self-check threw — ${threw}`); continue; }
  const bad = logs.filter((l) => l.startsWith("FAIL"));
  const passed = logs.filter((l) => l.startsWith("PASS"));
  if (bad.length) { bad.forEach((b) => fail(`${id}: ${b}`)); }
  else ok(`${id}: all ${passed.length} checks pass`);
}

// ---- 5. optional: alternatives and mistakes -------------------------------
if (wrongFile) {
  const cases = await import("file://" + path.resolve(ROOT, wrongFile));
  const pg = playgrounds["pg-exercise"];
  const selfCheck = pg.code.split(MARKER)[1];
  const runCase = (impl) => {
    const { logs, threw } = runLikePlayground(impl + "\n" + selfCheck, pg.opts);
    return { fails: logs.filter((l) => l.startsWith("FAIL")).map((l) => l.slice(6).trim()), threw };
  };
  console.log("\n5. alternative correct styles also pass (behaviour, not resemblance)");
  for (const [name, impl] of Object.entries(cases.alternatives || {})) {
    const { fails, threw } = runCase(impl);
    if (threw || fails.length) fail(`${name}: ${threw || fails.join(" | ").slice(0, 90)}`);
    else ok(name);
  }
  console.log("\n6. each mistake trips the check it should");
  for (const [name, { impl, expect }] of Object.entries(cases.mistakes || {})) {
    const { fails, threw } = runCase(impl);
    const hit = threw ? threw : fails.join(" | ");
    if (!fails.length && !threw) fail(`${name}: passed everything — the self-check misses this mistake`);
    else if (expect && !hit.includes(expect)) fail(`${name}: expected "${expect}", got "${hit.slice(0, 80)}"`);
    else ok(`${name} -> ${hit.slice(0, 70)}`);
  }
}

console.log(`\n${failures ? `FAIL — ${failures} problem(s)` : "OK — lesson verified"}\n`);
process.exit(failures ? 1 : 0);
