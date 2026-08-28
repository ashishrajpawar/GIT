/**
 * Wrong-answer cases for C1/0005 — forAll.
 *
 *   node scripts/verify-lesson.mjs modules/c1-testing-quality/0005-what-to-test.html \
 *        --wrong scripts/cases/0005-what-to-test.mjs
 *
 * The last exercise of the module, and it deliberately reuses both of the
 * module's earlier arguments: a property that THROWS must become a result
 * rather than ending the run (lesson 1's test runner, one level up), and the
 * generator is a function of an index so a counter-example is reproducible
 * (lesson 2's byte source, same reason).
 *
 * The fixture that earns its place is `recording()`, a generator that remembers
 * which indices it was asked for. Without it, three of the eight mistakes below
 * are invisible: stopping late, calling generate twice for the reported index,
 * and reporting the last counter-example instead of the first all produce a
 * result object that looks perfectly reasonable.
 */

export const alternatives = {
  "a while loop": `
function forAll(generate, property, n) {
  let i = 0;
  while (i < n) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = Boolean(property(value));
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) return { ok: false, checked: i + 1, counterExample: value, message: message };
    i++;
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,

  "the evaluation pulled into its own helper": `
function evaluate(property, value) {
  try {
    return Boolean(property(value))
      ? { held: true, message: null }
      : { held: false, message: "returned false" };
  } catch (err) {
    return { held: false, message: err instanceof Error ? err.message : String(err) };
  }
}

function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    const outcome = evaluate(property, value);
    if (!outcome.held) {
      return { ok: false, checked: i + 1, counterExample: value, message: outcome.message };
    }
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,

  "duck-typing the error, and !! instead of Boolean": `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = "returned false";
    try {
      held = !!property(value);
    } catch (err) {
      message = err && err.message ? err.message : String(err);
    }
    if (!held) return { ok: false, checked: i + 1, counterExample: value, message: message };
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,

  "the result built in a variable and returned at the end": `
function forAll(generate, property, n) {
  let result = { ok: true, checked: n, counterExample: null, message: null };

  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = Boolean(property(value));
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) {
      result = { ok: false, checked: i + 1, counterExample: value, message: message };
      break;
    }
  }

  return result;
}`,
};

export const mistakes = {
  /* generate called twice for the same index — once to test, once to report.
     Correct for a pure generator and silently wrong for any other, which is
     the kind of bug that only ever shows up in the field. */
  "generate called a second time to report the counter-example": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    let held = false;
    let message = null;
    try {
      held = Boolean(property(generate(i)));
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) {
      return { ok: false, checked: i + 1, counterExample: generate(i), message: message };
    }
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "generate is called once per index",
  },

  /* No try/catch. The input that breaks the harness is exactly the one worth
     knowing about, and this reports nothing at all about it. */
  "a throwing property left to escape": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    if (!property(value)) {
      return { ok: false, checked: i + 1, counterExample: value, message: "returned false" };
    }
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "a property that throws is a counter-example, not a crash",
  },

  /* Runs to the end collecting failures and reports the last one. More
     thorough, less useful: the last counter-example is usually the same bug
     as the first, and it is nearly always larger. */
  "every failure collected, and the last one reported": {
    impl: `
function forAll(generate, property, n) {
  let last = null;
  let message = null;
  let failures = 0;

  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    try {
      held = Boolean(property(value));
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) { failures++; last = value; }
  }

  if (failures > 0) return { ok: false, checked: n, counterExample: last, message: message };
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "the run stops at the first failure",
  },

  /* checked reports how many PASSED rather than how far it got, so a failure
     at index 0 reports zero inputs checked. */
  "checked excludes the failing input": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = Boolean(property(value));
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) return { ok: false, checked: i, counterExample: value, message: message };
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "checked counts the failing input too",
  },

  /* Demanding a literal boolean. Properties get written as .length checks and
     indexOf results, and every one of those is now a counter-example. */
  "the property required to return exactly true": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = property(value) === true;
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) return { ok: false, checked: i + 1, counterExample: value, message: message };
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "any truthy value counts as holding",
  },

  /* A failure with no stated reason. The same defect as a test runner
     printing a count and no messages, met one module later. */
  "no message for a property that simply returned false": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = Boolean(property(value));
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) return { ok: false, checked: i + 1, counterExample: value, message: message };
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "a falsy return is reported as such",
  },

  /* err.message read unguarded. Not every throw is an Error — the same trap
     as lesson 1, and the failure is a counter-example with no reason. */
  "the message read straight off whatever was thrown": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = Boolean(property(value));
      if (!held) message = "returned false";
    } catch (err) {
      message = err.message;
    }
    if (!held) return { ok: false, checked: i + 1, counterExample: value, message: message };
  }
  return { ok: true, checked: n, counterExample: null, message: null };
}`,
    expect: "a thrown string is reported as its own text",
  },

  /* The success case left half-built. Every caller reading result.message has
     to cope with undefined as well as null, which is the kind of thing that
     is never written down and always discovered. */
  "the success result missing its null fields": {
    impl: `
function forAll(generate, property, n) {
  for (let i = 0; i < n; i++) {
    const value = generate(i);
    let held = false;
    let message = null;
    try {
      held = Boolean(property(value));
      if (!held) message = "returned false";
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (!held) return { ok: false, checked: i + 1, counterExample: value, message: message };
  }
  return { ok: true, checked: n };
}`,
    expect: "...with no counter-example and no message",
  },
};
