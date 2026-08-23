// Wrong-answer cases for x2/0001 — firstDivergence.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   EMPTY    — rule 7, you cannot bisect nothing
//   MISSING  — rule 1, the probe that never ran. The whole exercise
//   READABLE — rule 2, a count scraped out of log text
//   SOURCE   — rule 3, never anything vs something lost
//   COMPARE  — rules 4 and 5, which step is blamed and in which direction
//
// What every mistake here has in common: it still returns a confident
// answer naming a step, and the step is wrong. A debugging tool that
// says "I don't know" wastes an hour; one that points at the wrong line
// wastes the afternoon, because you believe it.
//
// Five of the ten trip more than one check, and each was run against the
// self-check alone to confirm the extras are inherent. They are: this
// function returns four fields describing one judgement, so a change to
// the judgement shows up in the verdict, the blamed step and both counts
// at once. The falsy-check mistake trips five, because the base trace
// ends in a genuine 0 and so does half the fixture set -- one change,
// five vantage points.

const FRAGMENTS = {
  EMPTY: `
  if (!Array.isArray(trace) || trace.length === 0) return none("no_trace");`,

  MISSING: `
    if (count === undefined || count === null) {
      return none("never_reached", entry && entry.step);
    }`,

  READABLE: `
    if (!Number.isInteger(count) || count < 0) {
      return none("unreadable", entry.step);
    }`,

  SOURCE: `
      if (count === 0) return none("empty_at_source", entry.step, null, 0);`,

  COMPARE: `
      return none(
        count < previous.count ? "lost" : "grew",
        entry.step,
        previous.count,
        count
      );`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function firstDivergence(trace) {
  const none = (verdict, at, from, to) => ({
    verdict,
    at: at === undefined ? null : at,
    from: from === undefined ? null : from,
    to: to === undefined ? null : to,
  });
${f.EMPTY}
  let previous = null;
  for (const entry of trace) {
    const count = entry ? entry.count : undefined;
${f.MISSING}
${f.READABLE}
    if (previous === null) {
${f.SOURCE}
    } else if (count !== previous.count) {
${f.COMPARE}
    }
    previous = entry;
  }
  return none("intact");
}`;
}

const alternatives = [
  // An indexed loop with the previous entry read back out of the array,
  // and the readability test expressed as a positive. Same answers.
  build({
    READABLE: `
    const usable = typeof count === "number" && Number.isInteger(count) && count >= 0;
    if (!usable) return none("unreadable", entry.step);`,
  }),

  // Uses Object.prototype.hasOwnProperty for rule 1 rather than testing
  // the value, which is the more literal reading of "has no count
  // property" and behaves identically for every trace here.
  build({
    MISSING: `
    if (!entry || !Object.prototype.hasOwnProperty.call(entry, "count") || entry.count == null) {
      return none("never_reached", entry && entry.step);
    }`,
  }),
];

const mistakes = [
  {
    // THE bug, and the reason the lesson has a callout. A missing count
    // is coalesced to 0, so "this line never ran" is reported as "the
    // data was lost here". You then read a setState that never executed
    // while the real cause -- a rejected promise, an early return -- sits
    // one step upstream, untouched.
    expect: "a probe with no count is never_reached, not lost",
    impl: build({
      MISSING: ``,
      READABLE: `
    const safe = count === undefined || count === null ? 0 : count;
    if (!Number.isInteger(safe) || safe < 0) {
      return none("unreadable", entry.step);
    }`,
      SOURCE: `
      if ((count || 0) === 0) return none("empty_at_source", entry.step, null, 0);`,
      COMPARE: `
      return none(
        (count || 0) < previous.count ? "lost" : "grew",
        entry.step,
        previous.count,
        count || 0
      );`,
    }),
  },
  {
    // Rule 1 written as a falsy test, which folds a real 0 into "never
    // ran". The exact inverse of the mistake above and just as
    // destructive: a genuine loss to zero -- the commonest finding there
    // is -- is reported as code that did not execute.
    expect: "...while an explicit 0 in the middle is still a loss",
    impl: build({
      MISSING: `
    if (!count) {
      return none("never_reached", entry && entry.step);
    }`,
    }),
  },
  {
    // Rule 1 checked AFTER the comparison. undefined !== previous.count
    // is true, so it is reported as a change -- and undefined < number
    // is false, so the direction comes out as 'grew'. A step that never
    // ran, reported as duplicated data.
    expect: "...and never_reached wins over a comparison it would also fail",
    impl: build({
      MISSING: ``,
      COMPARE: `
      if (count === undefined || count === null) {
        return none(
          count < previous.count ? "lost" : "grew",
          entry.step,
          previous.count,
          count === undefined ? null : count
        );
      }
      return none(
        count < previous.count ? "lost" : "grew",
        entry.step,
        previous.count,
        count
      );`,
    }),
  },
  {
    // Rule 4's off-by-one: blames the EARLIER step. The earlier probe is
    // the one that told the truth, so this sends you to read the code
    // that worked and skip the code that did not.
    expect: "...blamed on the LATER step, where the number changed",
    impl: build({
      COMPARE: `
      return none(
        count < previous.count ? "lost" : "grew",
        previous.step,
        previous.count,
        count
      );`,
    }),
  },
  {
    // Rule 5 collapsed: any change is a loss. A count going UP is a
    // duplicate -- a list appended to twice, a socket and a REST fetch
    // both delivering -- and calling it a loss sends you hunting for a
    // leak in the one direction the data definitely did not go.
    expect: "a rise is grew, not lost",
    impl: build({
      COMPARE: `
      return none("lost", entry.step, previous.count, count);`,
    }),
  },
  {
    // Rule 3 never fires, because the first step is compared instead of
    // inspected. An API that returned nothing is reported as 'intact'
    // when every count is 0 -- the data arrived, go look at your
    // rendering -- which is the most expensive wrong answer in the file.
    expect: "a first count of 0 is empty_at_source, not lost",
    impl: build({ SOURCE: `` }),
  },
  {
    // Rule 2 dropped, so a trace scraped out of log text is compared as
    // strings. It does not throw and it does not refuse: '10' < '5' is
    // true, so a count that GREW from 5 to 10 is reported as lost, with
    // a confident step name attached.
    expect: "a string count is unreadable, not compared",
    impl: build({ READABLE: `` }),
  },
  {
    // Rule 2 written with typeof, which admits NaN. NaN !== NaN, so the
    // step carrying it always reads as a change; and NaN < n is false,
    // so the direction is always 'grew'. One unparsed number turns every
    // subsequent step into a spurious duplicate report.
    expect: "...and so is NaN",
    impl: build({
      READABLE: `
    if (typeof count !== "number" || count < 0) {
      return none("unreadable", entry.step);
    }`,
    }),
  },
  {
    // Rule 7: an empty trace reported as 'intact'. It claims the data
    // survived a journey nobody watched -- and the commonest reason a
    // trace is empty is that the instrumentation itself did not run,
    // which is precisely when a reassuring answer costs the most.
    expect: "an empty trace is no_trace",
    impl: build({ EMPTY: `` }),
  },
  {
    // Reports the LAST divergence rather than the first, by finishing
    // the loop and keeping the most recent finding. Every step after the
    // first fault is downstream of a cause not yet found, so this names
    // a symptom of a symptom.
    expect: "the FIRST divergence is reported, not the last",
    impl: `
function firstDivergence(trace) {
  const none = (verdict, at, from, to) => ({
    verdict,
    at: at === undefined ? null : at,
    from: from === undefined ? null : from,
    to: to === undefined ? null : to,
  });
  if (!Array.isArray(trace) || trace.length === 0) return none("no_trace");
  let previous = null;
  let found = none("intact");
  for (const entry of trace) {
    const count = entry ? entry.count : undefined;
    if (count === undefined || count === null) {
      return none("never_reached", entry && entry.step);
    }
    if (!Number.isInteger(count) || count < 0) {
      return none("unreadable", entry.step);
    }
    if (previous === null) {
      if (count === 0) return none("empty_at_source", entry.step, null, 0);
    } else if (count !== previous.count) {
      found = none(
        count < previous.count ? "lost" : "grew",
        entry.step,
        previous.count,
        count
      );
    }
    previous = entry;
  }
  return found;
}`,
  },
];

export const stages = {
  trace: { alternatives, mistakes },
};
