/**
 * Wrong-answer cases for C2/0001 — pipelineOutcome.
 *
 *   node scripts/verify-lesson.mjs modules/c2-cicd-release/0001-continuous-integration.html \
 *        --wrong scripts/cases/0001-continuous-integration.mjs
 *
 * Three fixture choices in the self-check are load-bearing:
 *
 *   - a step with `exitCode: null` (never ran) AND a step with `exitCode: 137`
 *     (killed by the runner). Between them they rule out both loose success
 *     tests: `if (step.exitCode)` lets the skipped one through, and
 *     `step.exitCode !== 1` lets the killed one through. A fixture using only
 *     exit code 1 cannot tell any of the three implementations apart.
 *   - the `several` pipeline has TWO failing required steps with a passing one
 *     between them, so a function that returns at the first failure is
 *     distinguishable from one that collects them all.
 *   - the `ok` invariant is asserted across every case built above it rather
 *     than on one example, which is the technique from C1/0005 applied to the
 *     lesson's own exercise.
 */

export const alternatives = {
  "filter and map instead of a loop": `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const bad = steps.filter(function (s) { return s.exitCode !== 0; });
  const failures = bad.filter(function (s) { return s.required; }).map(function (s) { return s.name; });
  const warnings = bad.filter(function (s) { return !s.required; }).map(function (s) { return s.name; });

  return { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,

  "a helper naming the success test": `
function succeeded(step) {
  return step.exitCode === 0;
}

function pipelineOutcome(steps) {
  if (!steps.length) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const failures = [];
  const warnings = [];

  steps.forEach(function (step) {
    if (succeeded(step)) return;
    (step.required ? failures : warnings).push(step.name);
  });

  return { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,

  "reduce, building both lists at once": `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const out = steps.reduce(function (acc, step) {
    if (step.exitCode !== 0) {
      if (step.required === true) acc.failures.push(step.name);
      else acc.warnings.push(step.name);
    }
    return acc;
  }, { failures: [], warnings: [] });

  return { ok: out.failures.length === 0, failures: out.failures, warnings: out.warnings };
}`,

  "an index loop with the guard written as a ternary return": `
function pipelineOutcome(steps) {
  const failures = [];
  const warnings = [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.exitCode === 0) continue;
    if (s.required) failures.push(s.name); else warnings.push(s.name);
  }

  return steps.length === 0
    ? { ok: false, failures: ["no steps ran"], warnings: [] }
    : { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,
};

export const mistakes = {
  /* The one the lesson is built around. null is falsy, so a step that never
     ran is counted as a success — and exit code 0 is also falsy, correctly,
     which is exactly what makes the line look right. */
  "success tested for truthiness": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const failures = [];
  const warnings = [];

  for (const step of steps) {
    if (!step.exitCode) continue;
    if (step.required) failures.push(step.name);
    else warnings.push(step.name);
  }

  return { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,
    expect: "a required step that never ran fails the build",
  },

  /* Success defined as "not the failure I have seen". 137 is the runner
     killing the process for using too much memory, and it is the failure
     mode a test suite hits first as the project grows. */
  "failure defined as exit code 1": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const failures = [];
  const warnings = [];

  for (const step of steps) {
    if (step.exitCode !== 1) continue;
    if (step.required) failures.push(step.name);
    else warnings.push(step.name);
  }

  return { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,
    expect: "an out-of-memory kill is a failure like any other",
  },

  /* The green tick on a build that executed nothing. Every step passed,
     because there were none. */
  "an empty pipeline treated as a pass": {
    impl: `
function pipelineOutcome(steps) {
  const failures = [];
  const warnings = [];

  for (const step of steps) {
    if (step.exitCode === 0) continue;
    if (step.required) failures.push(step.name);
    else warnings.push(step.name);
  }

  return { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,
    expect: "an empty pipeline is not a pass",
  },

  /* Returning at the first failure. Three independent problems become three
     rounds of push, wait, fix -- and unlike a property test, CI steps run
     independently, so there is nothing to be gained by stopping. */
  "the first failure returned immediately": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const warnings = [];

  for (const step of steps) {
    if (step.exitCode === 0) continue;
    if (step.required) return { ok: false, failures: [step.name], warnings: warnings };
    warnings.push(step.name);
  }

  return { ok: true, failures: [], warnings: warnings };
}`,
    expect: "every failing required step is listed, in order",
  },

  /* Advisory steps failing the build. The distinction exists so that a
     formatter and a leaking endpoint are not the same event; collapsing it
     is how people learn to scroll past red. */
  "every failing step treated as required": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const failures = [];

  for (const step of steps) {
    if (step.exitCode !== 0) failures.push(step.name);
  }

  return { ok: failures.length === 0, failures: failures, warnings: [] };
}`,
    expect: "an advisory failure does not fail the build",
  },

  /* Advisory failures silently dropped. It does not block, which is right,
     and nobody ever sees it, which is how a check goes unrun for months
     while its step keeps appearing in the list. */
  "advisory failures swallowed instead of reported": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const failures = [];

  for (const step of steps) {
    if (step.exitCode === 0) continue;
    if (step.required) failures.push(step.name);
  }

  return { ok: failures.length === 0, failures: failures, warnings: [] };
}`,
    expect: "...but it is still reported",
  },

  /* ok computed from the steps rather than from the failures list, so it
     disagrees with the list it is returned beside. Every caller now has to
     know which of the two fields to trust. */
  "ok derived from every step passing": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  const failures = [];
  const warnings = [];

  for (const step of steps) {
    if (step.exitCode === 0) continue;
    if (step.required) failures.push(step.name);
    else warnings.push(step.name);
  }

  return {
    ok: steps.every(function (s) { return s.exitCode === 0; }),
    failures: failures,
    warnings: warnings
  };
}`,
    expect: "an advisory failure does not fail the build",
  },

  /* Sorting the steps to report them tidily, in place. The caller passed an
     array it still intends to use, and the order it had was the order the
     pipeline ran in. */
  "the steps sorted in place before reporting": {
    impl: `
function pipelineOutcome(steps) {
  if (steps.length === 0) return { ok: false, failures: ["no steps ran"], warnings: [] };

  steps.sort(function (a, b) { return a.name < b.name ? -1 : 1; });

  const failures = [];
  const warnings = [];

  for (const step of steps) {
    if (step.exitCode === 0) continue;
    if (step.required) failures.push(step.name);
    else warnings.push(step.name);
  }

  return { ok: failures.length === 0, failures: failures, warnings: warnings };
}`,
    expect: "the input steps are not modified",
  },
};
