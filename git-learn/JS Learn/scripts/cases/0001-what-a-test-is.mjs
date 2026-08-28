/**
 * Wrong-answer cases for C1/0001 — runTests.
 *
 *   node scripts/verify-lesson.mjs modules/c1-testing-quality/0001-what-a-test-is.html \
 *        --wrong scripts/cases/0001-what-a-test-is.mjs
 *
 * The exercise is a test runner, so these are wrong-cases for a thing whose job
 * is to run wrong-cases. That is less cute than it sounds and more useful: every
 * mistake below is one this project has actually made in a self-check, and the
 * self-check for THIS lesson had to be written to catch each of them.
 *
 * Two fixture choices are load-bearing and should not be "simplified":
 *
 *   - `falsy` returns false and must PASS. A runner written as `if (t.fn())`
 *     passes every check written with a test that returns true, and marks every
 *     assert-style test — which returns undefined — as a failure.
 *   - `mixed` is [ok, bad, quiet, bad, ok]: two failures, neither of them last,
 *     with passes on both sides. A runner that stops at the first throw returns
 *     total 2, and a fixture ending in a failure would hide that.
 */

export const alternatives = {
  "an index loop, counts derived at the end": `
function runTests(tests) {
  const failures = [];
  for (let i = 0; i < tests.length; i++) {
    try {
      tests[i].fn();
    } catch (err) {
      failures.push({
        name: tests[i].name,
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return {
    total: tests.length,
    passed: tests.length - failures.length,
    failed: failures.length,
    failures: failures
  };
}`,

  "forEach, with the message picked by duck-typing instead of instanceof": `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  tests.forEach(function (t) {
    summary.total++;
    try {
      t.fn();
      summary.passed++;
    } catch (err) {
      summary.failed++;
      summary.failures.push({
        name: t.name,
        message: err && err.message ? err.message : String(err)
      });
    }
  });
  return summary;
}`,

  "a helper that runs one test and reports the outcome": `
function runOne(t) {
  try {
    t.fn();
    return null;
  } catch (err) {
    return { name: t.name, message: err instanceof Error ? err.message : String(err) };
  }
}

function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    summary.total++;
    const failure = runOne(t);
    if (failure === null) summary.passed++;
    else { summary.failed++; summary.failures.push(failure); }
  }
  return summary;
}`,

  "reduce, building the summary as it goes": `
function runTests(tests) {
  return tests.reduce(function (summary, t) {
    summary.total++;
    try {
      t.fn();
      summary.passed++;
    } catch (err) {
      summary.failed++;
      summary.failures.push({
        name: t.name,
        message: err instanceof Error ? err.message : String(err)
      });
    }
    return summary;
  }, { total: 0, passed: 0, failed: 0, failures: [] });
}`,
};

export const mistakes = {
  /* No protection at all. The first throwing test escapes runTests entirely,
     so the caller — here, the self-check — takes the exception. This is the
     shape of the naive loop in section 4 of the lesson. */
  "no try/catch anywhere": {
    impl: `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    summary.total++;
    t.fn();
    summary.passed++;
  }
  return summary;
}`,
    expect: "expected 3, got 5",
  },

  /* The verdict taken from the return value. Every test written with assert
     returns undefined on success, so this runner reports a green suite as
     entirely failing — and the first thing anyone does about that is distrust
     the runner. */
  "pass or fail decided by what the test returns": {
    impl: `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    summary.total++;
    if (t.fn()) summary.passed++;
    else { summary.failed++; summary.failures.push({ name: t.name, message: "returned falsy" }); }
  }
  return summary;
}`,
    expect: "a test that returns without throwing passes",
  },

  /* The whole point of the exercise, and the mistake is four characters of
     indentation. Everything about this runner is right except WHERE the try
     begins, and every single-failure fixture in the world passes it. */
  "the try wrapped around the loop instead of inside it": {
    impl: `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  let current = null;
  try {
    for (const t of tests) {
      current = t;
      summary.total++;
      t.fn();
      summary.passed++;
    }
  } catch (err) {
    summary.failed++;
    summary.failures.push({
      name: current.name,
      message: err instanceof Error ? err.message : String(err)
    });
  }
  return summary;
}`,
    expect: "every test runs, including the ones after a failure",
  },

  /* err.message read without checking what was thrown. Reports undefined as
     the reason for the failure, which looks like a bug in the runner rather
     than a bug in the test. */
  "the message read straight off whatever was thrown": {
    impl: `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    summary.total++;
    try {
      t.fn();
      summary.passed++;
    } catch (err) {
      summary.failed++;
      summary.failures.push({ name: t.name, message: err.message });
    }
  }
  return summary;
}`,
    expect: "a thrown string is reported as its own text",
  },

  /* Only the array hoisted out of the function. The counts are right on every
     call, so nothing looks wrong until a later call reads failures and finds
     an earlier call's entries still sitting at the front of it. */
  "the failures array declared outside the function": {
    impl: `
const failures = [];

function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: failures };
  for (const t of tests) {
    summary.total++;
    try {
      t.fn();
      summary.passed++;
    } catch (err) {
      summary.failed++;
      failures.push({
        name: t.name,
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return summary;
}`,
    expect: "failures keep the order the tests were given in",
  },

  /* The catch that contains the throw and records nothing. The suite never
     stops early, so the bug the lesson warns about is fixed — and every
     failure is now invisible, which is worse than the crash. */
  "the failure caught and swallowed": {
    impl: `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    summary.total++;
    try {
      t.fn();
      summary.passed++;
    } catch (err) {
      // contained, and forgotten
    }
  }
  return summary;
}`,
    expect: "a throwing test is counted as failed",
  },

  /* The message recorded and the name dropped. Counts and reasons are all
     correct, and the report says three things went wrong without saying which
     three — the "37 passed, 3 failed" problem from section 5. */
  "failures recorded without the test name": {
    impl: `
function runTests(tests) {
  const summary = { total: 0, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    summary.total++;
    try {
      t.fn();
      summary.passed++;
    } catch (err) {
      summary.failed++;
      summary.failures.push({
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return summary;
}`,
    expect: "the failure carries the test name",
  },
};
