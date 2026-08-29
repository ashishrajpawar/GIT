// Wrong-answer cases for C6/0005 — reviewAccessPath().
//
// Two families here. Some mistakes make the review MISS something, which is
// the ordinary kind. Others make it report something harmless, which matters
// just as much in this course: a report containing things that need no action
// is a report people stop reading, and c2/0001 and c7/0004 both made the case
// at their own layers.

const CORRECT = `const KINDS = ["unindexed_on_auth_path", "n_plus_one", "offset_pagination", "unbounded"];

function reviewAccessPath(trace, policy) {
  const summary = new Map();

  trace.forEach((query, position) => {
    let entry = summary.get(query.label);
    if (entry === undefined) {
      entry = { label: query.label, position: position, count: 0, totalMs: 0,
                unindexedOnAuth: false, maxOffset: null, maxRowsUnbounded: null };
      summary.set(query.label, entry);
    }

    entry.count += 1;
    entry.totalMs += query.endedAt - query.startedAt;

    if (query.indexed === false && query.path === "authorise") entry.unindexedOnAuth = true;

    if (query.offset !== null && query.offset !== undefined) {
      if (entry.maxOffset === null || query.offset > entry.maxOffset) entry.maxOffset = query.offset;
    }

    if (query.limit === null || query.limit === undefined) {
      if (entry.maxRowsUnbounded === null || query.rows > entry.maxRowsUnbounded) {
        entry.maxRowsUnbounded = query.rows;
      }
    }
  });

  const ordered = Array.from(summary.values()).sort((a, b) => a.position - b.position);

  const findings = [];
  for (const kind of KINDS) {
    for (const entry of ordered) {
      if (kind === "unindexed_on_auth_path" && entry.unindexedOnAuth) {
        findings.push({ kind: kind, label: entry.label, value: entry.totalMs });
      } else if (kind === "n_plus_one" && entry.count >= policy.repeatThreshold) {
        findings.push({ kind: kind, label: entry.label, value: entry.count });
      } else if (kind === "offset_pagination"
                 && entry.maxOffset !== null && entry.maxOffset > policy.maxOffset) {
        findings.push({ kind: kind, label: entry.label, value: entry.maxOffset });
      } else if (kind === "unbounded"
                 && entry.maxRowsUnbounded !== null && entry.maxRowsUnbounded >= policy.rowWarn) {
        findings.push({ kind: kind, label: entry.label, value: entry.maxRowsUnbounded });
      }
    }
  }

  let peakConnections = 0;
  for (const at of trace) {
    let inFlight = 0;
    for (const other of trace) {
      if (other.startedAt <= at.startedAt && at.startedAt < other.endedAt) inFlight += 1;
    }
    if (inFlight > peakConnections) peakConnections = inFlight;
  }

  return { ok: findings.length === 0, findings: findings, peakConnections: peakConnections };
}`;

export const alternatives = {
  // A plain object as the summary and four separate collection passes.
  "object summary, four passes": `
function reviewAccessPath(trace, policy) {
  const labels = [];
  const by = {};

  trace.forEach((q, i) => {
    if (!Object.prototype.hasOwnProperty.call(by, q.label)) {
      labels.push(q.label);
      by[q.label] = { count: 0, totalMs: 0, badIndex: false, offset: null, rows: null };
    }
    const e = by[q.label];
    e.count++;
    e.totalMs += q.endedAt - q.startedAt;
    if (q.indexed === false && q.path === "authorise") e.badIndex = true;
    if (q.offset != null) e.offset = e.offset === null ? q.offset : Math.max(e.offset, q.offset);
    if (q.limit == null) e.rows = e.rows === null ? q.rows : Math.max(e.rows, q.rows);
  });

  const findings = [];
  labels.forEach(l => { if (by[l].badIndex) findings.push({ kind: "unindexed_on_auth_path", label: l, value: by[l].totalMs }); });
  labels.forEach(l => { if (by[l].count >= policy.repeatThreshold) findings.push({ kind: "n_plus_one", label: l, value: by[l].count }); });
  labels.forEach(l => { if (by[l].offset !== null && by[l].offset > policy.maxOffset) findings.push({ kind: "offset_pagination", label: l, value: by[l].offset }); });
  labels.forEach(l => { if (by[l].rows !== null && by[l].rows >= policy.rowWarn) findings.push({ kind: "unbounded", label: l, value: by[l].rows }); });

  let peak = 0;
  trace.forEach(a => {
    const n = trace.filter(b => b.startedAt <= a.startedAt && a.startedAt < b.endedAt).length;
    if (n > peak) peak = n;
  });

  return { ok: findings.length === 0, findings, peakConnections: peak };
}`,

  // A boundary sweep for the peak instead of counting at each start, and
  // filter/map for the findings.
  "sweep line": `
function reviewAccessPath(trace, policy) {
  const seen = new Map();
  for (let i = 0; i < trace.length; i++) {
    const q = trace[i];
    if (!seen.has(q.label)) {
      seen.set(q.label, { label: q.label, count: 0, totalMs: 0,
                          unindexed: false, offset: null, rows: null });
    }
    const e = seen.get(q.label);
    e.count += 1;
    e.totalMs += q.endedAt - q.startedAt;
    if (!q.indexed && q.path === "authorise") e.unindexed = true;
    if (typeof q.offset === "number") e.offset = Math.max(e.offset === null ? q.offset : e.offset, q.offset);
    if (q.limit === null || q.limit === undefined) {
      e.rows = Math.max(e.rows === null ? q.rows : e.rows, q.rows);
    }
  }

  const entries = [...seen.values()];
  const findings = [
    ...entries.filter(e => e.unindexed).map(e => ({ kind: "unindexed_on_auth_path", label: e.label, value: e.totalMs })),
    ...entries.filter(e => e.count >= policy.repeatThreshold).map(e => ({ kind: "n_plus_one", label: e.label, value: e.count })),
    ...entries.filter(e => e.offset !== null && e.offset > policy.maxOffset).map(e => ({ kind: "offset_pagination", label: e.label, value: e.offset })),
    ...entries.filter(e => e.rows !== null && e.rows >= policy.rowWarn).map(e => ({ kind: "unbounded", label: e.label, value: e.rows }))
  ];

  const edges = [];
  for (const q of trace) {
    edges.push({ at: q.startedAt, delta: 1 });
    edges.push({ at: q.endedAt, delta: -1 });
  }
  // Ends are applied before starts at the same instant, which is what makes
  // the interval half-open.
  edges.sort((a, b) => (a.at - b.at) || (a.delta - b.delta));

  let running = 0;
  let peakConnections = 0;
  for (const e of edges) {
    running += e.delta;
    if (running > peakConnections) peakConnections = running;
  }

  return { ok: findings.length === 0, findings, peakConnections };
}`,

  // reduce for the summary, a KINDS table of predicates and value extractors.
  "predicate table": `
const RULES = [
  { kind: "unindexed_on_auth_path", when: (e) => e.unindexed, value: (e) => e.totalMs },
  { kind: "n_plus_one", when: (e, p) => e.count >= p.repeatThreshold, value: (e) => e.count },
  { kind: "offset_pagination", when: (e, p) => e.offset !== null && e.offset > p.maxOffset, value: (e) => e.offset },
  { kind: "unbounded", when: (e, p) => e.rows !== null && e.rows >= p.rowWarn, value: (e) => e.rows }
];

function reviewAccessPath(trace, policy) {
  const entries = trace.reduce((acc, q) => {
    let e = acc.find(x => x.label === q.label);
    if (!e) { e = { label: q.label, count: 0, totalMs: 0, unindexed: false, offset: null, rows: null }; acc.push(e); }
    e.count += 1;
    e.totalMs += q.endedAt - q.startedAt;
    if (q.indexed === false && q.path === "authorise") e.unindexed = true;
    if (q.offset !== null && q.offset !== undefined && (e.offset === null || q.offset > e.offset)) e.offset = q.offset;
    if ((q.limit === null || q.limit === undefined) && (e.rows === null || q.rows > e.rows)) e.rows = q.rows;
    return acc;
  }, []);

  const findings = [];
  for (const rule of RULES) {
    for (const e of entries) {
      if (rule.when(e, policy)) findings.push({ kind: rule.kind, label: e.label, value: rule.value(e) });
    }
  }

  let peakConnections = 0;
  for (const a of trace) {
    let n = 0;
    for (const b of trace) if (b.startedAt <= a.startedAt && a.startedAt < b.endedAt) n++;
    peakConnections = Math.max(peakConnections, n);
  }

  return { ok: findings.length === 0, findings: findings, peakConnections: peakConnections };
}`
};

export const mistakes = [
  {
    // An inclusive end, so back-to-back queries look concurrent and every
    // sequential request appears to hold two connections.
    expect: "queries that merely follow one another do not overlap",
    impl: CORRECT.replace(
      "if (other.startedAt <= at.startedAt && at.startedAt < other.endedAt) inFlight += 1;",
      "if (other.startedAt <= at.startedAt && at.startedAt <= other.endedAt) inFlight += 1;"
    )
  },
  {
    // The peak reported as the query count, which is the number the review
    // exists to stop people using.
    expect: "running the repeated query in parallel triples what the request holds",
    impl: CORRECT.replace(
      `  let peakConnections = 0;
  for (const at of trace) {
    let inFlight = 0;
    for (const other of trace) {
      if (other.startedAt <= at.startedAt && at.startedAt < other.endedAt) inFlight += 1;
    }
    if (inFlight > peakConnections) peakConnections = inFlight;
  }
`,
      "  const peakConnections = trace.length;\n"
    )
  },
  // NOT A CASE, deliberately: writing the offset test as `if (query.offset)`.
  // It cannot be distinguished from the explicit null check by any input, since
  // an offset of zero can never exceed a non-negative ceiling, so the only way
  // to fail it would be to rig an assertion about the shape of the code rather
  // than its behaviour — which is how a self-check stops testing behaviour and
  // starts testing resemblance. The lesson's quiz says the same thing in words:
  // a latent hazard, not a live defect. It is written down here so nobody adds
  // the case later, watches it pass, and concludes the checker is broken.
  {
    // The offset ceiling made inclusive, so the boundary value is reported.
    expect: "an offset exactly at the ceiling is allowed, one past it is not",
    impl: CORRECT.replace(
      "&& entry.maxOffset !== null && entry.maxOffset > policy.maxOffset) {",
      "&& entry.maxOffset !== null && entry.maxOffset >= policy.maxOffset) {"
    )
  },
  {
    // The repeat threshold made exclusive, so the smallest repetition worth
    // reporting is the one that is missed.
    expect: "a label repeated exactly the threshold number of times is reported",
    impl: CORRECT.replace(
      "&& entry.count >= policy.repeatThreshold) {",
      "&& entry.count > policy.repeatThreshold) {"
    )
  },
  {
    // The row warning made exclusive, same off-by-one in the other finding.
    expect: "a row count exactly at the warning level counts as unbounded",
    impl: CORRECT.replace(
      "&& entry.maxRowsUnbounded !== null && entry.maxRowsUnbounded >= policy.rowWarn) {",
      "&& entry.maxRowsUnbounded !== null && entry.maxRowsUnbounded > policy.rowWarn) {"
    )
  },
  {
    // The path ignored, so every unindexed query in the request is reported
    // with the same severity as one on the authorisation path.
    expect: "an unindexed query away from the authorisation path is not this report's business",
    impl: CORRECT.replace(
      `if (query.indexed === false && query.path === "authorise") entry.unindexedOnAuth = true;`,
      "if (query.indexed === false) entry.unindexedOnAuth = true;"
    )
  },
  {
    // Any missing limit reported regardless of how many rows came back, so a
    // twelve-row lookup joins the list and the list stops being read.
    expect: "a query with no limit that returned twelve rows is left alone",
    impl: CORRECT.replace(
      "&& entry.maxRowsUnbounded !== null && entry.maxRowsUnbounded >= policy.rowWarn) {",
      "&& entry.maxRowsUnbounded !== null) {"
    )
  },
  {
    // Findings emitted per query rather than per label, so an N+1 of twenty
    // produces twenty findings about itself.
    expect: "the four kinds are reported in kind order, one finding each",
    impl: CORRECT.replace(
      `  const findings = [];
  for (const kind of KINDS) {
    for (const entry of ordered) {`,
      `  const findings = [];
  for (const entry of ordered) {
    for (const kind of KINDS) {`
    ).replace(
      `      }
    }
  }

  let peakConnections = 0;`,
      `      }
    }
  }

  let peakConnections = 0;`
    )
  },
  {
    // The unindexed finding's value taken as the occurrence count rather than
    // the time spent, which is the number that made it a finding.
    expect: "each finding carries the number that made it one",
    impl: CORRECT.replace(
      `        findings.push({ kind: kind, label: entry.label, value: entry.totalMs });`,
      `        findings.push({ kind: kind, label: entry.label, value: entry.count });`
    )
  },
  {
    // ok derived from the peak rather than from the findings, so a request with
    // four problems and one connection is reported as fine.
    expect: "queries that merely follow one another do not overlap",
    impl: CORRECT.replace(
      "return { ok: findings.length === 0, findings: findings, peakConnections: peakConnections };",
      "return { ok: peakConnections <= 1, findings: findings, peakConnections: peakConnections };"
    )
  },
  {
    // Sorting the caller's trace in place, the way somebody would while adding
    // "report the slowest query". Note the first attempt at this case sorted by
    // startedAt, which a trace is already in — so it mutated nothing anybody
    // could observe and passed every check. Sorting by duration is the version
    // that actually reorders.
    expect: "the trace is not modified or reordered",
    impl: CORRECT.replace(
      "  let peakConnections = 0;\n  for (const at of trace) {",
      "  trace.sort((a, b) => (b.endedAt - b.startedAt) - (a.endedAt - a.startedAt));\n\n  let peakConnections = 0;\n  for (const at of trace) {"
    )
  }
];
