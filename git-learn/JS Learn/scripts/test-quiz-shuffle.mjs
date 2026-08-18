#!/usr/bin/env node
/**
 * test-quiz-shuffle.mjs — the option shuffle in assets/quiz.js still works.
 *
 *   node scripts/test-quiz-shuffle.mjs
 *
 * WHY THIS EXISTS
 * ---------------
 * 61.4% of keyed questions still have `correct` at index 1. That is fine only
 * because `optionDisplayOrder` shuffles options at render, so the clustering
 * never reaches the student. The authored data was deliberately left alone —
 * rewriting 1,284 keys can break keys, a renderer change cannot.
 *
 * Which means the entire defence against "pick the second option, score 64%"
 * is one function, and CLAUDE.md now tells authors the exploit is dead. If that
 * function regresses the exploit comes back silently, across 1,368 questions,
 * and the documentation actively says not to worry about it.
 *
 * So: the shuffle is tested, and so are the two cases it must NOT shuffle,
 * because a shuffle that respects no exceptions is its own bug — it would put
 * "All of the above" in the middle and make explanations name the wrong option.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quizSrc = fs.readFileSync(path.join(ROOT, "assets", "quiz.js"), "utf8");

/* quiz.js is an IIFE around a DOM component and the ordering helpers are
   internal to it. Lift the real function out by slicing the IIFE body rather
   than reimplementing it here — a local copy could agree with itself while
   disagreeing with what the browser actually runs, which is the one failure
   this suite cannot afford. */
const lines = quizSrc.split("\n");
const open = lines.findIndex((l) => /^\(function \(global\) \{/.test(l));
const close = lines.findIndex((l) => /^\}\)\(typeof window/.test(l));
if (open < 0 || close < 0) {
  console.error("could not find the IIFE boundaries in assets/quiz.js — " +
                "the wrapper changed, so fix this slice before trusting the suite");
  process.exit(1);
}
const optionDisplayOrder = new Function(
  "global",
  lines.slice(open + 1, close).join("\n") + "\nreturn optionDisplayOrder;"
)({});

let passed = 0, failed = 0;
const check = (label, ok, detail) => {
  if (ok) { passed++; console.log("  ok    " + label); return; }
  failed++;
  console.log("  FAIL  " + label);
  if (detail) console.log("        " + detail);
};

const OPTS = ["alpha", "bravo", "charlie", "delta"];

console.log("\n1. it actually shuffles");

/* One shuffle can legitimately come back in order. Over many runs, a working
   Fisher-Yates must move index 1 off index 1 most of the time; a no-op shuffle
   leaves it there every time. */
let stayed = 0;
const RUNS = 2000;
for (let i = 0; i < RUNS; i++) {
  const order = optionDisplayOrder({ explanation: "plain text" }, OPTS);
  if (order.indexOf(1) === 1) stayed++;
}
const stayedPct = (100 * stayed) / RUNS;
check(`the authored index 1 does not stay at slot 1 (${stayedPct.toFixed(1)}%, expect ~25%)`,
  stayedPct > 15 && stayedPct < 35,
  `a no-op shuffle would give 100%, a broken one something far from 25%`);

/* Every option must still be present exactly once — a shuffle that drops or
   duplicates an option is worse than no shuffle. */
let wellFormed = true;
for (let i = 0; i < 500; i++) {
  const order = optionDisplayOrder({ explanation: "plain" }, OPTS);
  const seen = [...order].sort((a, b) => a - b).join(",");
  if (seen !== "0,1,2,3") { wellFormed = false; break; }
}
check("every option appears exactly once", wellFormed);

console.log("\n2. it refuses to shuffle where order carries meaning");

const pinned = ["alpha", "bravo", "All of the above"];
let alwaysLast = true;
for (let i = 0; i < 500; i++) {
  const order = optionDisplayOrder({ explanation: "plain" }, pinned);
  if (order[order.length - 1] !== 2) { alwaysLast = false; break; }
}
check('"All of the above" is pinned last', alwaysLast);

const bothPinned = ["alpha", "bravo", "Both A and B"];
let bothLast = true;
for (let i = 0; i < 500; i++) {
  const order = optionDisplayOrder({ explanation: "plain" }, bothPinned);
  if (order[order.length - 1] !== 2) { bothLast = false; break; }
}
check('"Both A and B" is pinned last', bothLast);

for (const explanation of [
  "Option A creates a label statement",
  "The second option is the only one that compiles",
  "answer C is a red herring",
]) {
  let untouched = true;
  for (let i = 0; i < 200; i++) {
    const order = optionDisplayOrder({ explanation }, OPTS);
    if (order.join(",") !== "0,1,2,3") { untouched = false; break; }
  }
  check(`renders as authored when the explanation says "${explanation.slice(0, 34)}…"`, untouched);
}

console.log("\n3. degenerate input does not throw or reorder");

check("a single option is returned as-is",
  optionDisplayOrder({ explanation: "" }, ["only"]).join(",") === "0");
check("an empty option list is returned as-is",
  optionDisplayOrder({ explanation: "" }, []).join(",") === "");
check("a missing explanation is treated as no explanation",
  optionDisplayOrder({}, OPTS).length === 4);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
