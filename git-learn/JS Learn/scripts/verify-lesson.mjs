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
 *
 *   --unverifiable "<reason>"
 *                        the revealed solution cannot be executed here — it is
 *                        an Express route needing Postgres, a React Native
 *                        screen needing a device, a Dockerfile needing a VPS.
 *                        Section 4 records the reason instead of failing, and
 *                        the log entry is `unverifiable` rather than
 *                        `verified`, which is what the audit reports.
 *
 *                        Everything else still runs and still fails on error:
 *                        the inline blocks must parse, the playgrounds must
 *                        run, and every executable predict-output answer must
 *                        match. A lesson full of SQL usually still has a dozen
 *                        checkable claims in it.
 *
 *                        The reason is mandatory and it is stored. "Cannot be
 *                        verified" with no reason is how a lesson nobody ever
 *                        checked ends up looking the same as one that cannot
 *                        be checked.
 *
 * STAGED EXERCISES
 * ----------------
 * A lesson with one exercise names it `createSolution("exercise-…")` and puts
 * the self-check in `createPlayground("pg-exercise", …)`. The capstone builds
 * one program in three stages, each with its own exercise, so that single pair
 * is not enough: `exercise-<name>` looks for `pg-exercise-<name>` first and
 * falls back to `pg-exercise`. A one-exercise lesson is unaffected.
 *
 * A staged `--wrong` file exports `stages` instead of the flat pair:
 *
 *   export const stages = {
 *     gen:   { alternatives: {...}, mistakes: {...} },   // -> pg-exercise-gen
 *     store: { alternatives: {...}, mistakes: {...} }
 *   };
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

/* A lesson may deliberately reject a promise and attach the .catch() a tick
   later — that is a thing async code legitimately does, and 01/0009 shows it.
   Node reports it as PromiseRejectionHandledWarning, which is noise here, not
   a finding. Every other warning is still printed.
   Node installs its own printing listener at startup, so filtering means
   replacing it rather than adding alongside it. */
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name !== "PromiseRejectionHandledWarning") console.warn(w.stack || String(w));
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const lessonArg = args.find((a) => !a.startsWith("--"));
const wrongIdx = args.indexOf("--wrong");
const wrongFile = wrongIdx >= 0 ? args[wrongIdx + 1] : null;
const unverIdx = args.indexOf("--unverifiable");
const unverifiableReason = unverIdx >= 0 ? args[unverIdx + 1] : null;

if (unverIdx >= 0 && (!unverifiableReason || unverifiableReason.startsWith("--"))) {
  console.error('--unverifiable needs a reason: --unverifiable "the route needs Postgres"');
  process.exit(2);
}

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

/** Yield past the microtask queue. `await Promise.resolve()` advances only one
 *  tick, so a chain of .then()s would need one await per link; setImmediate
 *  runs in the check phase, after everything the microtask queue holds. */
const drainMicrotasks = () => new Promise((r) => setImmediate(r));

/** Run code the way the playground does: instrumented, guarded, log captured.
 *  setTimeout callbacks are queued and drained afterwards — without that, any
 *  playground demonstrating async behaviour (the classic var-in-a-loop closure
 *  trap, for one) silently produces no output and looks like it passed.
 *
 *  Async, because promise callbacks are microtasks: a synchronous runner
 *  finishes before any of them execute, so every `.then()` and `await` in the
 *  lesson printed nothing. Playgrounds reported "ok" with the output missing,
 *  and correct predict-output answers were reported as wrong.
 *
 *  `opts.dom` swaps in the sandboxed document from assets/dom-sandbox.js, the
 *  same one the browser gets, with `opts.html` as the starting body. Returns
 *  `dom` — the final markup — so a caller can assert on the page, not just the
 *  logs. */
async function runLikePlayground(code, opts = {}) {
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

  /* setTimeout is shimmed onto a drainable queue; clearTimeout must be too.
     Without it, student code reached Node's real clearTimeout holding an id
     this queue invented, so nothing was ever cancelled and every debounce
     lesson verified as firing all its calls. The browser has real timers and
     debounces correctly — the verifier and the browser disagreeing about a
     lesson is the failure this tooling exists to prevent. Ids are a running
     counter, not the queue length, so cancelling one does not invalidate the
     rest. */
  const queue = [];
  let timerSeq = 0;
  const setTimeoutShim = (fn, ms) => { queue.push([fn, ms || 0, ++timerSeq]); return timerSeq; };
  const clearTimeoutShim = (id) => {
    const i = queue.findIndex((t) => t[2] === id);
    if (i >= 0) queue.splice(i, 1);
  };

  const sandbox = opts.dom ? createDomSandbox(opts.html || "") : null;

  /* A lesson demonstrating a rejected promise without a .catch() would
     otherwise take the whole verifier down with it — unhandled rejections are
     fatal in modern Node. Recorded the way the browser playground records
     them, so the two agree. */
  let rejection = null;
  const onRejection = (reason) => {
    rejection = "Uncaught (in promise): " +
      (reason && reason.message ? reason.message : String(reason));
  };
  process.on("unhandledRejection", onRejection);

  let threw = null;
  try {
    const names = ["console", "__tick", "setTimeout", "clearTimeout"];
    const values = [fake, makeTicker(), setTimeoutShim, clearTimeoutShim];
    if (sandbox) {
      names.push("document", "window", "localStorage", "Event");
      values.push(sandbox.document, sandbox.window, sandbox.localStorage, sandbox.Event);
    }
    new Function(...names, instrument(code))(...values);

    /* Real event-loop ordering: every microtask the synchronous pass queued
       runs before the first timer, and again after each timer callback. Get
       this wrong and the classic "sync, micro, timer" question — the one this
       lesson is built around — verifies to the wrong answer. */
    await drainMicrotasks();
    for (let guard = 0; queue.length && guard < 10000; guard++) {
      queue.sort((a, b) => a[1] - b[1]);
      const [fn] = queue.shift();
      fn();
      await drainMicrotasks();
    }
  } catch (e) {
    threw = e && e.message === "__CAP__" ? "output cap" : `${e.name}: ${e.message}`;
  } finally {
    process.off("unhandledRejection", onRejection);
  }

  if (rejection && !threw) logs.push(rejection);
  return { logs, threw, dom: sandbox ? sandbox.serialize() : null };
}

/** Which playground carries a given exercise's self-check. `exercise-gen` uses
 *  `pg-exercise-gen` when the lesson defines one, otherwise the lone
 *  `pg-exercise` — which is every lesson written before the capstone. */
function pairFor(solutionId) {
  const suffix = solutionId.replace(/^exercise-?/, "");
  return playgrounds[`pg-exercise-${suffix}`] ? `pg-exercise-${suffix}` : "pg-exercise";
}
const exercisePlaygrounds = new Set(Object.keys(solutions).map(pairFor));

// ---- 2. playgrounds run ---------------------------------------------------
console.log("\n2. playgrounds run (deliberate breakage is expected, hangs are not)");
for (const [id, pg] of Object.entries(playgrounds)) {
  if (exercisePlaygrounds.has(id)) continue; // covered by the self-check below
  const t0 = Date.now();
  const { logs, threw } = await runLikePlayground(pg.code, pg.opts);
  const ms = Date.now() - t0;
  const tag = pg.opts.dom ? " [dom]" : "";
  if (ms > 4000) fail(`${id}: took ${ms}ms — the guard is not stopping it`);
  /* A playground that is broken on purpose throws at RUN time — a TypeError
     from a null selector, a ReferenceError from an out-of-scope variable. A
     SyntaxError means the code never parsed, so the student sees an error
     message about the lesson's own typo rather than about the concept. This
     was reported as "ok" until 01/0011 shipped two playgrounds whose escaped
     backticks produced `\` outside a string. */
  else if (/^SyntaxError/.test(threw || "")) {
    fail(`${id}: ${threw} — the playground code does not parse. Deliberate ` +
         `breakage should throw at run time, not fail to compile.`);
  } else {
    ok(`${id}${tag}: ${logs.length} lines, ${ms}ms${threw ? `, stopped by ${threw.slice(0, 40)}` : ""}`);
  }
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
    /* Node's phase ordering is not modelled here. runLikePlayground drains a
       microtask queue and a timer queue; it has no notion of nextTick running
       ahead of promises, or of the check phase. It reported b3/0001 q5 as
       "3,4,2,1" when real Node gives "4,3,…" — the lesson was right and the
       verifier was wrong, which is the one failure this tool must not produce. */
    if (/process\.nextTick|setImmediate/.test(q.code)) continue;

    const { logs, threw } = await runLikePlayground(q.code, needsDom ? { dom: true, html: q.html } : {});
    if (threw) continue; // e.g. deliberately-throwing snippets
    /* "A, D, C, B" and "A\nD\nC\nB" are the same prediction. Several lessons
       write a multi-line output as a comma-separated list, which is how a
       student would type it into the box, so commas separate exactly like
       newlines here. */
    const norm = (s) =>
      String(s).replace(/['"]/g, "").replace(/\s*,\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    checked++;
    if (norm(logs.join("\n")) !== norm(q.answer))
      fail(`${qid} q${i}: stated ${JSON.stringify(q.answer)} but prints ${JSON.stringify(logs.join("\n"))}`);
  }
}
ok(`${checked} executable predict-output questions verified`);

// ---- 4. the revealed solution passes its own self-check -------------------
console.log("\n4. revealed solution passes its self-check");
const MARKER = "// --- Self-check: leave everything below this line alone ---";
/* Strip the solution's own demo calls — the self-check supplies its own data.
   Matched at column 0 only: an indented `const issuer = createIssuer(gen)`
   inside a function body is part of the implementation, and stripping it
   silently removes a line the self-check then blames the student for. */
const stripDemo = (src) =>
  src.split("\n").filter((l) => !/^(console\.log|const \w+ = (create|make))/.test(l)).join("\n");

for (const [id, cfg] of Object.entries(solutions)) {
  const pgId = pairFor(id);
  const pg = playgrounds[pgId];
  if (unverifiableReason) { ok(`${id}: not executed — ${unverifiableReason}`); continue; }
  if (!pg || !pg.code.includes(MARKER)) { fail(`${id}: no self-check found in ${pgId}`); continue; }
  const selfCheck = pg.code.split(MARKER)[1];
  const impl = stripDemo(cfg.solution);
  const { logs, threw } = await runLikePlayground(impl + "\n" + selfCheck, pg.opts);
  if (threw) { fail(`${id}: self-check threw — ${threw}`); continue; }
  const bad = logs.filter((l) => l.startsWith("FAIL"));
  const passed = logs.filter((l) => l.startsWith("PASS"));
  if (bad.length) { bad.forEach((b) => fail(`${id}: ${b}`)); }
  else ok(`${id}: all ${passed.length} checks pass`);
}

// ---- 5. optional: alternatives and mistakes -------------------------------
if (wrongFile) {
  const cases = await import("file://" + path.resolve(ROOT, wrongFile));

  /* Flat form (one exercise) is the same thing with a single unnamed stage,
     so both shapes go through one code path. */
  const stages = cases.stages
    ? Object.entries(cases.stages).map(([name, c]) => [`pg-exercise-${name}`, name, c])
    : [["pg-exercise", null, { alternatives: cases.alternatives, mistakes: cases.mistakes }]];

  console.log("\n5. alternative correct styles also pass (behaviour, not resemblance)");
  const mistakeRuns = [];
  for (const [pgId, name, c] of stages) {
    const pg = playgrounds[pgId];
    if (!pg) { fail(`--wrong names stage "${name}" but the lesson has no ${pgId}`); continue; }
    const selfCheck = pg.code.split(MARKER)[1];
    const runCase = async (impl) => {
      const { logs, threw } = await runLikePlayground(impl + "\n" + selfCheck, pg.opts);
      return { fails: logs.filter((l) => l.startsWith("FAIL")).map((l) => l.slice(6).trim()), threw };
    };
    const label = (n) => (name ? `${name}: ${n}` : n);
    for (const [n, impl] of Object.entries(c.alternatives || {})) {
      const { fails, threw } = await runCase(impl);
      if (threw || fails.length) fail(`${label(n)}: ${threw || fails.join(" | ").slice(0, 90)}`);
      else ok(label(n));
    }
    for (const [n, m] of Object.entries(c.mistakes || {})) mistakeRuns.push([label(n), m, runCase]);
  }

  console.log("\n6. each mistake trips the check it should");
  for (const [name, { impl, expect }, runCase] of mistakeRuns) {
    const { fails, threw } = await runCase(impl);
    const hit = threw ? threw : fails.join(" | ");
    if (!fails.length && !threw) fail(`${name}: passed everything — the self-check misses this mistake`);
    else if (expect && !hit.includes(expect)) fail(`${name}: expected "${expect}", got "${hit.slice(0, 80)}"`);
    else ok(`${name} -> ${hit.slice(0, 70)}`);
  }
}

/* ---- record the run ------------------------------------------------------
   audit.mjs reports a "Verified" column read from this file. It said 0 of 95
   for as long as it existed, because nothing wrote it — while eight lessons
   had in fact been verified by running them. A number nobody maintains is
   worse than no number, so the verifier maintains it: one entry per lesson,
   written only by an actual passing run, and cleared by a failing one. */
const LOG_PATH = path.join(ROOT, "scripts", "verification-log.json");
const log = fs.existsSync(LOG_PATH) ? JSON.parse(fs.readFileSync(LOG_PATH, "utf8")) : {};
const lessonId = path.relative(ROOT, lessonPath).split(path.sep).join("/");

/* A lesson with no playgrounds, no solution and no executable question passes
   every section by having nothing in them. Recording that as `verified` — the
   same word the capstone earns with 13 playgrounds and 29 self-checks — is how
   a count starts overstating what was measured, which is the failure this log
   was written to end. It gets its own status instead. */
const ranSomething =
  checked > 0 ||
  Object.keys(playgrounds).length > 0 ||
  (!unverifiableReason && Object.keys(solutions).length > 0);

if (failures) delete log[lessonId];
else log[lessonId] = {
  status: unverifiableReason ? "unverifiable" : ranSomething ? "verified" : "nothing-to-verify",
  reason: unverifiableReason || undefined,
  at: new Date().toISOString().slice(0, 10),
  solutions: Object.keys(solutions).length,
  playgrounds: Object.keys(playgrounds).length,
  executableQuestions: checked,
  wrongCases: wrongFile ? path.basename(wrongFile) : null,
};

const ordered = Object.fromEntries(Object.keys(log).sort().map((k) => [k, log[k]]));
fs.writeFileSync(LOG_PATH, JSON.stringify(ordered, null, 2) + "\n");

const verdict = failures
  ? `FAIL — ${failures} problem(s)`
  : unverifiableReason
    ? `OK — everything runnable checked; solution recorded UNVERIFIABLE (${unverifiableReason})`
    : ranSomething
      ? "OK — lesson verified"
      : "OK — but NOTHING TO VERIFY: no playground, no solution, no executable question";
console.log(`\n${verdict}\n`);
process.exit(failures ? 1 : 0);
