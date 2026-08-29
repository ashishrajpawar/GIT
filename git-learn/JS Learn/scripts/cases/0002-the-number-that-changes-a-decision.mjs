// Wrong-answer cases for C8/0002 — reviewMetric().
//
// This one is a policy expressed as code, so most of the mistakes are not
// arithmetic errors but disagreements with the policy — a check demoted from
// blocking to advisory, a truthiness test where three values are meaningful,
// a severity split moved to where it feels natural rather than where the
// argument put it.

const HELPERS = `function saidSomething(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function declaredCells(metric) {
  const declared = metric.declaredValues || {};
  let cells = 1;
  for (const name of metric.dimensions) {
    const values = declared[name];
    if (typeof values !== "number" || values <= 0) return null;
    cells *= values;
  }
  return cells;
}
`;

const CORRECT = `function reviewMetric(metric, policy) {
  const problems = [];
  const block = (kind, detail) => problems.push({ kind: kind, severity: "blocking", detail: detail });
  const advise = (kind, detail) => problems.push({ kind: kind, severity: "advisory", detail: detail });

  if (metric.subject !== "none") block("subject_is_a_person", metric.subject);

  for (const name of metric.dimensions) {
    if (policy.allowedDimensions.indexOf(name) === -1) block("dimension_not_allowed", name);
  }

  if (!saidSomething(metric.decision)) block("no_decision", null);

  if (metric.basis !== "consent") block("consent_missing", metric.basis);

  if (metric.retainDays === null || metric.retainDays === undefined) {
    block("retention_unbounded", null);
  } else if (metric.retainDays > policy.maxRetainDays) {
    block("retention_too_long", metric.retainDays);
  }

  if (!saidSomething(metric.actAt)) advise("no_threshold", null);

  const cells = declaredCells(metric);
  if (cells === null || cells > policy.maxCells) advise("high_cardinality", cells);

  return {
    accepted: problems.every(p => p.severity !== "blocking"),
    problems: problems
  };
}`;

export const alternatives = {
  // A table of rules walked in order, each returning a problem or nothing.
  "rule table": HELPERS + `
function reviewMetric(metric, policy) {
  const problems = [];

  const single = [
    () => metric.subject !== "none"
      ? { kind: "subject_is_a_person", severity: "blocking", detail: metric.subject } : null
  ];
  single.forEach(r => { const p = r(); if (p) problems.push(p); });

  metric.dimensions
    .filter(n => !policy.allowedDimensions.includes(n))
    .forEach(n => problems.push({ kind: "dimension_not_allowed", severity: "blocking", detail: n }));

  if (!saidSomething(metric.decision)) {
    problems.push({ kind: "no_decision", severity: "blocking", detail: null });
  }
  if (metric.basis !== "consent") {
    problems.push({ kind: "consent_missing", severity: "blocking", detail: metric.basis });
  }
  if (metric.retainDays == null) {
    problems.push({ kind: "retention_unbounded", severity: "blocking", detail: null });
  } else if (metric.retainDays > policy.maxRetainDays) {
    problems.push({ kind: "retention_too_long", severity: "blocking", detail: metric.retainDays });
  }
  if (!saidSomething(metric.actAt)) {
    problems.push({ kind: "no_threshold", severity: "advisory", detail: null });
  }

  const cells = declaredCells(metric);
  if (cells === null || cells > policy.maxCells) {
    problems.push({ kind: "high_cardinality", severity: "advisory", detail: cells });
  }

  return { accepted: !problems.some(p => p.severity === "blocking"), problems: problems };
}`,

  // Blocking and advisory collected separately and concatenated, so the
  // ordering requirement is structural rather than a matter of call order.
  "two lists concatenated": HELPERS + `
function reviewMetric(metric, policy) {
  const blocking = [];
  const advisory = [];

  if (metric.subject !== "none") {
    blocking.push({ kind: "subject_is_a_person", severity: "blocking", detail: metric.subject });
  }

  for (let i = 0; i < metric.dimensions.length; i++) {
    const name = metric.dimensions[i];
    if (policy.allowedDimensions.indexOf(name) === -1) {
      blocking.push({ kind: "dimension_not_allowed", severity: "blocking", detail: name });
    }
  }

  if (!saidSomething(metric.decision)) {
    blocking.push({ kind: "no_decision", severity: "blocking", detail: null });
  }

  if (metric.basis !== "consent") {
    blocking.push({ kind: "consent_missing", severity: "blocking", detail: metric.basis });
  }

  const days = metric.retainDays;
  if (typeof days !== "number") {
    blocking.push({ kind: "retention_unbounded", severity: "blocking", detail: null });
  } else if (days > policy.maxRetainDays) {
    blocking.push({ kind: "retention_too_long", severity: "blocking", detail: days });
  }

  if (!saidSomething(metric.actAt)) {
    advisory.push({ kind: "no_threshold", severity: "advisory", detail: null });
  }

  const cells = declaredCells(metric);
  if (cells === null || cells > policy.maxCells) {
    advisory.push({ kind: "high_cardinality", severity: "advisory", detail: cells });
  }

  return { accepted: blocking.length === 0, problems: blocking.concat(advisory) };
}`,

  // reduce over the dimensions for the product, and a switch-free chain of
  // small predicates.
  "predicates and reduce": `
const nonEmpty = v => typeof v === "string" && v.trim() !== "";

function reviewMetric(metric, policy) {
  const out = [];
  const add = (kind, severity, detail) => out.push({ kind, severity, detail });

  if (metric.subject !== "none") add("subject_is_a_person", "blocking", metric.subject);
  metric.dimensions.forEach(n => {
    if (policy.allowedDimensions.indexOf(n) < 0) add("dimension_not_allowed", "blocking", n);
  });
  if (!nonEmpty(metric.decision)) add("no_decision", "blocking", null);
  if (metric.basis !== "consent") add("consent_missing", "blocking", metric.basis);

  if (metric.retainDays === undefined || metric.retainDays === null) {
    add("retention_unbounded", "blocking", null);
  } else if (metric.retainDays > policy.maxRetainDays) {
    add("retention_too_long", "blocking", metric.retainDays);
  }

  if (!nonEmpty(metric.actAt)) add("no_threshold", "advisory", null);

  const declared = metric.declaredValues || {};
  const cells = metric.dimensions.reduce((acc, n) => {
    if (acc === null) return null;
    const v = declared[n];
    return typeof v === "number" && v > 0 ? acc * v : null;
  }, 1);

  if (cells === null || cells > policy.maxCells) add("high_cardinality", "advisory", cells);

  return { accepted: out.filter(p => p.severity === "blocking").length === 0, problems: out };
}`
};

export const mistakes = [
  {
    // A device id waved through because it is not "a user".
    expect: "a device is a subject too, however anonymous it sounds",
    impl: HELPERS + CORRECT.replace(
      `if (metric.subject !== "none") block("subject_is_a_person", metric.subject);`,
      `if (metric.subject === "user") block("subject_is_a_person", metric.subject);`
    )
  },
  {
    // The subject check demoted to a warning, so a per-user timeline is
    // accepted with a note attached.
    expect: "a metric with a user subject is refused",
    impl: HELPERS + CORRECT.replace(
      `if (metric.subject !== "none") block("subject_is_a_person", metric.subject);`,
      `if (metric.subject !== "none") advise("subject_is_a_person", metric.subject);`
    )
  },
  {
    // Only the first offending dimension reported, so a fix-and-resubmit cycle
    // takes as many rounds as there are problems.
    expect: "every unlisted dimension is named, in the order they were asked for",
    impl: HELPERS + CORRECT.replace(
      `  for (const name of metric.dimensions) {
    if (policy.allowedDimensions.indexOf(name) === -1) block("dimension_not_allowed", name);
  }`,
      `  const firstBad = metric.dimensions.filter(n => policy.allowedDimensions.indexOf(n) === -1)[0];
  if (firstBad !== undefined) block("dimension_not_allowed", firstBad);`
    )
  },
  {
    // no_decision demoted to advisory, which is the whole DPDP argument given
    // away in one word.
    expect: "a metric with no decision behind it is refused rather than warned about",
    impl: HELPERS + CORRECT.replace(
      `if (!saidSomething(metric.decision)) block("no_decision", null);`,
      `if (!saidSomething(metric.decision)) advise("no_decision", null);`
    )
  },
  {
    // A presence check rather than a content check, so a field that is present
    // and blank reads as satisfied — a11/0003's display-name hole exactly.
    expect: "a decision of nothing but whitespace counts as no decision",
    impl: HELPERS + CORRECT.replace(
      `if (!saidSomething(metric.decision)) block("no_decision", null);`,
      `if (metric.decision === null || metric.decision === undefined) block("no_decision", null);`
    )
  },
  {
    // Any stated basis accepted, so "necessary" passes and the claim that the
    // product needs the analytics goes unchallenged.
    expect: "analytics on any basis other than consent is refused",
    impl: HELPERS + CORRECT.replace(
      `if (metric.basis !== "consent") block("consent_missing", metric.basis);`,
      `if (!saidSomething(metric.basis)) block("consent_missing", metric.basis);`
    )
  },
  {
    // if (retainDays) — the safest possible policy and the worst one land in
    // the same branch, and keeping nothing is reported as keeping forever.
    expect: "retention of zero means nothing is kept and is perfectly fine",
    impl: HELPERS + CORRECT.replace(
      `  if (metric.retainDays === null || metric.retainDays === undefined) {`,
      `  if (!metric.retainDays) {`
    )
  },
  {
    // The retention ceiling made exclusive, so the published maximum is
    // refused and the real limit is one day lower than the policy says.
    expect: "retention exactly at the ceiling is allowed",
    impl: HELPERS + CORRECT.replace(
      "} else if (metric.retainDays > policy.maxRetainDays) {",
      "} else if (metric.retainDays >= policy.maxRetainDays) {"
    )
  },
  {
    // Both retention problems reported for a null, because the second branch
    // is no longer an else — and null > 180 is false, so it does not fire...
    // which is why this case names the ordering check instead: the fix people
    // reach for is to compare unconditionally, and Number(null) is 0.
    expect: "retention of null means forever and is refused",
    impl: HELPERS + CORRECT.replace(
      `  if (metric.retainDays === null || metric.retainDays === undefined) {
    block("retention_unbounded", null);
  } else if (metric.retainDays > policy.maxRetainDays) {
    block("retention_too_long", metric.retainDays);
  }`,
      `  if (Number(metric.retainDays) > policy.maxRetainDays) {
    block("retention_too_long", metric.retainDays);
  }`
    )
  },
  {
    // no_threshold promoted to blocking, which forbids the exploration that
    // establishes what a threshold should be.
    expect: "no threshold is advisory and does not stop the metric",
    impl: HELPERS + CORRECT.replace(
      `if (!saidSomething(metric.actAt)) advise("no_threshold", null);`,
      `if (!saidSomething(metric.actAt)) block("no_threshold", null);`
    )
  },
  {
    // An undeclared cardinality treated as one value, so the least-known
    // dimension in the register is also the safest-looking.
    expect: "a dimension with no declared count is unbounded, not small",
    impl: `function saidSomething(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function declaredCells(metric) {
  const declared = metric.declaredValues || {};
  let cells = 1;
  for (const name of metric.dimensions) {
    cells *= declared[name] || 1;
  }
  return cells;
}
` + CORRECT
  },
  {
    // The largest dimension used instead of the product, so four dimensions of
    // ten values each read as ten cells rather than ten thousand.
    expect: "a cell count over budget is advisory and carries the product",
    impl: `function saidSomething(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function declaredCells(metric) {
  const declared = metric.declaredValues || {};
  let widest = 0;
  for (const name of metric.dimensions) {
    const values = declared[name];
    if (typeof values !== "number" || values <= 0) return null;
    if (values > widest) widest = values;
  }
  return widest;
}
` + CORRECT
  },
  {
    // The cell budget made exclusive.
    expect: "a cell count exactly at the budget is not reported",
    impl: HELPERS + CORRECT.replace(
      "if (cells === null || cells > policy.maxCells)",
      "if (cells === null || cells >= policy.maxCells)"
    )
  },
  {
    // accepted derived from the problem count rather than from severity, so
    // the advisory level exists in the output and does nothing.
    expect: "no threshold is advisory and does not stop the metric",
    impl: HELPERS + CORRECT.replace(
      "    accepted: problems.every(p => p.severity !== \"blocking\"),",
      "    accepted: problems.length === 0,"
    )
  },
  {
    // Advisory checks run first, so the report opens with the least important
    // thing wrong with the metric.
    expect: "everything at once comes back with the blocking kinds first, in their fixed order",
    impl: HELPERS + `function reviewMetric(metric, policy) {
  const problems = [];
  const block = (kind, detail) => problems.push({ kind: kind, severity: "blocking", detail: detail });
  const advise = (kind, detail) => problems.push({ kind: kind, severity: "advisory", detail: detail });

  if (!saidSomething(metric.actAt)) advise("no_threshold", null);
  const cells = declaredCells(metric);
  if (cells === null || cells > policy.maxCells) advise("high_cardinality", cells);

  if (metric.subject !== "none") block("subject_is_a_person", metric.subject);
  for (const name of metric.dimensions) {
    if (policy.allowedDimensions.indexOf(name) === -1) block("dimension_not_allowed", name);
  }
  if (!saidSomething(metric.decision)) block("no_decision", null);
  if (metric.basis !== "consent") block("consent_missing", metric.basis);
  if (metric.retainDays === null || metric.retainDays === undefined) {
    block("retention_unbounded", null);
  } else if (metric.retainDays > policy.maxRetainDays) {
    block("retention_too_long", metric.retainDays);
  }

  return { accepted: problems.every(p => p.severity !== "blocking"), problems: problems };
}`
  },
  {
    // Normalising the metric on the way through, which is helpful and is also
    // a caller's object quietly rewritten.
    expect: "the metric definition is not modified",
    impl: HELPERS + CORRECT.replace(
      `  if (metric.subject !== "none") block("subject_is_a_person", metric.subject);`,
      `  metric.reviewedAt = "2026-08-29";

  if (metric.subject !== "none") block("subject_is_a_person", metric.subject);`
    )
  }
];
