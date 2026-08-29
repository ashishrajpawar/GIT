// Wrong-answer cases for C8/0001 — aggregate().
//
// Two of these produce a report that is more useful than the correct one. That
// is the shape of every privacy control in this module: the wrong answer is
// the one with more numbers on it.

const CORRECT = `function aggregate(events, spec, policy) {
  const problems = [];

  for (const name of spec.dimensions) {
    if (policy.allowedDimensions.indexOf(name) === -1) {
      problems.push({ kind: "dimension_not_allowed", detail: name });
    }
  }

  const counts = new Map();
  if (problems.length === 0) {
    for (const event of events) {
      const key = spec.dimensions.map(function (name) {
        const value = event[name];
        return value === undefined || value === null ? "unknown" : String(value);
      }).join("|");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (counts.size > policy.maxCells) {
      problems.push({ kind: "too_many_cells", detail: counts.size });
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems: problems, cells: [], suppressed: [],
             suppressedTotal: 0, total: events.length };
  }

  const ordered = Array.from(counts, function (pair) {
    return { key: pair[0], count: pair[1] };
  }).sort(function (a, b) {
    return (b.count - a.count) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  });

  const kept = [];
  const held = [];
  for (const cell of ordered) {
    if (cell.count < policy.minCell) held.push(cell);
    else kept.push(cell);
  }

  if (held.length === 1 && kept.length > 0) {
    held.push(kept.pop());
  }

  const alone = held.length === 1;

  return {
    ok: true,
    problems: problems,
    cells: kept,
    suppressed: held.map(function (c) { return c.key; }).sort(),
    suppressedTotal: alone ? null : held.reduce(function (n, c) { return n + c.count; }, 0),
    total: alone ? null : events.length
  };
}`;

export const alternatives = {
  // reduce into a plain object, and a partition helper.
  "object counts and partition": `
function aggregate(events, spec, policy) {
  const problems = spec.dimensions
    .filter(n => !policy.allowedDimensions.includes(n))
    .map(n => ({ kind: "dimension_not_allowed", detail: n }));

  const counts = problems.length ? {} : events.reduce((acc, e) => {
    const key = spec.dimensions
      .map(n => (e[n] === undefined || e[n] === null ? "unknown" : String(e[n])))
      .join("|");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const size = Object.keys(counts).length;
  if (!problems.length && size > policy.maxCells) {
    problems.push({ kind: "too_many_cells", detail: size });
  }

  if (problems.length) {
    return { ok: false, problems, cells: [], suppressed: [], suppressedTotal: 0, total: events.length };
  }

  const ordered = Object.keys(counts)
    .map(key => ({ key, count: counts[key] }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const kept = ordered.filter(c => c.count >= policy.minCell);
  const held = ordered.filter(c => c.count < policy.minCell);

  if (held.length === 1 && kept.length > 0) held.push(kept.pop());

  const lone = held.length === 1;
  return {
    ok: true,
    problems,
    cells: kept,
    suppressed: held.map(c => c.key).sort(),
    suppressedTotal: lone ? null : held.reduce((n, c) => n + c.count, 0),
    total: lone ? null : events.length
  };
}`,

  // A separate keyOf helper, an explicit index loop, and a single exit.
  "helper and single exit": `
function keyOf(event, dimensions) {
  const parts = [];
  for (let i = 0; i < dimensions.length; i++) {
    const v = event[dimensions[i]];
    parts.push(v === null || v === undefined ? "unknown" : String(v));
  }
  return parts.join("|");
}

function aggregate(events, spec, policy) {
  let ok = true;
  const problems = [];
  let cells = [];
  let suppressed = [];
  let suppressedTotal = 0;
  let total = events.length;

  for (let i = 0; i < spec.dimensions.length; i++) {
    if (policy.allowedDimensions.indexOf(spec.dimensions[i]) < 0) {
      problems.push({ kind: "dimension_not_allowed", detail: spec.dimensions[i] });
    }
  }

  if (problems.length === 0) {
    const counts = new Map();
    for (let i = 0; i < events.length; i++) {
      const k = keyOf(events[i], spec.dimensions);
      counts.set(k, (counts.get(k) || 0) + 1);
    }

    if (counts.size > policy.maxCells) {
      problems.push({ kind: "too_many_cells", detail: counts.size });
    } else {
      const ordered = [...counts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => (a.count === b.count ? (a.key > b.key ? 1 : a.key < b.key ? -1 : 0) : b.count - a.count));

      const small = [];
      const big = [];
      ordered.forEach(c => (c.count < policy.minCell ? small : big).push(c));

      if (small.length === 1 && big.length > 0) small.push(big[big.length - 1]), big.length = big.length - 1;

      cells = big;
      suppressed = small.map(c => c.key).slice().sort();
      if (small.length === 1) {
        suppressedTotal = null;
        total = null;
      } else {
        suppressedTotal = small.reduce((n, c) => n + c.count, 0);
      }
    }
  }

  if (problems.length > 0) {
    ok = false;
    cells = [];
    suppressed = [];
    suppressedTotal = 0;
    total = events.length;
  }

  return { ok, problems, cells, suppressed, suppressedTotal, total };
}`,

  // Everything through small named steps, with the suppression expressed as a
  // split index into the ordered array rather than two arrays.
  "split index": `
function aggregate(events, spec, policy) {
  const bad = spec.dimensions.filter(function (n) {
    return policy.allowedDimensions.indexOf(n) === -1;
  });
  if (bad.length) {
    return {
      ok: false,
      problems: bad.map(function (n) { return { kind: "dimension_not_allowed", detail: n }; }),
      cells: [], suppressed: [], suppressedTotal: 0, total: events.length
    };
  }

  const tally = {};
  events.forEach(function (e) {
    const key = spec.dimensions.map(function (n) {
      return e[n] == null ? "unknown" : String(e[n]);
    }).join("|");
    tally[key] = (tally[key] || 0) + 1;
  });

  const keys = Object.keys(tally);
  if (keys.length > policy.maxCells) {
    return {
      ok: false,
      problems: [{ kind: "too_many_cells", detail: keys.length }],
      cells: [], suppressed: [], suppressedTotal: 0, total: events.length
    };
  }

  const ordered = keys.map(function (key) { return { key: key, count: tally[key] }; });
  ordered.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  // Everything from splitAt onwards is suppressed.
  let splitAt = ordered.length;
  while (splitAt > 0 && ordered[splitAt - 1].count < policy.minCell) splitAt -= 1;
  if (ordered.length - splitAt === 1 && splitAt > 0) splitAt -= 1;

  const kept = ordered.slice(0, splitAt);
  const held = ordered.slice(splitAt);
  const lone = held.length === 1;

  return {
    ok: true,
    problems: [],
    cells: kept,
    suppressed: held.map(function (c) { return c.key; }).sort(),
    suppressedTotal: lone ? null : held.reduce(function (n, c) { return n + c.count; }, 0),
    total: lone ? null : events.length
  };
}`
};

export const mistakes = [
  {
    // The key built by walking the event, so a field added upstream joins the
    // grouping and the user id ends up in a cell name.
    expect: "fields the event happens to carry never reach the key",
    impl: CORRECT.replace(
      `      const key = spec.dimensions.map(function (name) {
        const value = event[name];
        return value === undefined || value === null ? "unknown" : String(value);
      }).join("|");`,
      `      const key = Object.keys(event).map(function (name) {
        const value = event[name];
        return value === undefined || value === null ? "unknown" : String(value);
      }).join("|");`
    )
  },
  {
    // A deny-list: the one field somebody thought of is removed, and the one
    // beside it is not.
    expect: "fields the event happens to carry never reach the key",
    impl: CORRECT.replace(
      `      const key = spec.dimensions.map(function (name) {
        const value = event[name];
        return value === undefined || value === null ? "unknown" : String(value);
      }).join("|");`,
      `      const key = Object.keys(event).filter(function (name) {
        return name !== "userId";
      }).map(function (name) {
        const value = event[name];
        return value === undefined || value === null ? "unknown" : String(value);
      }).join("|");`
    )
  },
  {
    // No allow-list check at all, so any field named in the spec is grouped by.
    expect: "a dimension that is not on the allow-list stops the whole report",
    impl: CORRECT.replace(
      `  for (const name of spec.dimensions) {
    if (policy.allowedDimensions.indexOf(name) === -1) {
      problems.push({ kind: "dimension_not_allowed", detail: name });
    }
  }
`,
      ""
    )
  },
  {
    // Count first, validate afterwards, and hand back the rows anyway — the
    // worst of both, since it looks like a report nobody agreed could exist.
    //
    // The first attempt at this case only changed the return, leaving the
    // counting loop behind its `problems.length === 0` guard. The map was
    // therefore empty on the very input that was supposed to expose it, and
    // the case passed. Validating late is the part that has to be wrong.
    expect: "a dimension that is not on the allow-list stops the whole report",
    impl: `function aggregate(events, spec, policy) {
  const counts = new Map();
  for (const event of events) {
    const key = spec.dimensions.map(function (name) {
      const value = event[name];
      return value === undefined || value === null ? "unknown" : String(value);
    }).join("|");
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = Array.from(counts, function (pair) {
    return { key: pair[0], count: pair[1] };
  }).sort(function (a, b) {
    return (b.count - a.count) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  });

  const problems = [];
  for (const name of spec.dimensions) {
    if (policy.allowedDimensions.indexOf(name) === -1) {
      problems.push({ kind: "dimension_not_allowed", detail: name });
    }
  }
  if (counts.size > policy.maxCells) {
    problems.push({ kind: "too_many_cells", detail: counts.size });
  }

  if (problems.length > 0) {
    return { ok: false, problems: problems, cells: rows, suppressed: [],
             suppressedTotal: 0, total: events.length };
  }

  const kept = [];
  const held = [];
  for (const cell of rows) {
    if (cell.count < policy.minCell) held.push(cell);
    else kept.push(cell);
  }
  if (held.length === 1 && kept.length > 0) held.push(kept.pop());
  const alone = held.length === 1;

  return {
    ok: true, problems: problems, cells: kept,
    suppressed: held.map(function (c) { return c.key; }).sort(),
    suppressedTotal: alone ? null : held.reduce(function (n, c) { return n + c.count; }, 0),
    total: alone ? null : events.length
  };
}`
  },
  {
    // The cell budget made exclusive, so a report exactly at the budget is
    // refused and the limit is silently one lower than it says.
    expect: "exactly the budget is allowed, not one fewer",
    impl: CORRECT.replace(
      "if (counts.size > policy.maxCells) {",
      "if (counts.size >= policy.maxCells) {"
    )
  },
  {
    // The floor made inclusive, so a cell of exactly the minimum group size is
    // withheld — and, being alone, takes a second one with it.
    expect: "a cell of exactly the minimum is reported rather than suppressed",
    impl: CORRECT.replace(
      "if (cell.count < policy.minCell) held.push(cell);",
      "if (cell.count <= policy.minCell) held.push(cell);"
    )
  },
  {
    // No complement rule. The report has more numbers on it and hides nothing.
    expect: "a lone suppressed cell drags the smallest reportable one down with it",
    impl: CORRECT.replace(
      `  if (held.length === 1 && kept.length > 0) {
    held.push(kept.pop());
  }
`,
      ""
    )
  },
  {
    // The complement taken from the wrong end: the largest cell is withheld and
    // the smallest published, which costs the most and protects the same amount.
    expect: "a lone suppressed cell drags the smallest reportable one down with it",
    impl: CORRECT.replace("held.push(kept.pop());", "held.push(kept.shift());")
  },
  {
    // The total published whatever happens, which republishes a lone suppressed
    // cell in the one case the suppression existed for.
    expect: "when the only cell is suppressed there is no total to give",
    impl: CORRECT.replace(
      "    total: alone ? null : events.length",
      "    total: events.length"
    )
  },
  {
    // The total withheld correctly and the suppressed sum published, which is
    // the same number wearing a different label.
    expect: "when the only cell is suppressed there is no total to give",
    impl: CORRECT.replace(
      "    suppressedTotal: alone ? null : held.reduce(function (n, c) { return n + c.count; }, 0),",
      "    suppressedTotal: held.reduce(function (n, c) { return n + c.count; }, 0),"
    )
  },
  {
    // No tie-break, so the row order depends on the order events arrived and
    // two runs of the same report cannot be compared.
    expect: "equal counts are ordered by key, so the report is the same every run",
    impl: CORRECT.replace(
      `    return (b.count - a.count) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);`,
      `    return b.count - a.count;`
    )
  },
  {
    // String(undefined) as a cell name.
    expect: "a missing dimension value becomes unknown rather than the word undefined",
    impl: CORRECT.replace(
      `        return value === undefined || value === null ? "unknown" : String(value);`,
      `        return String(value);`
    )
  },
  {
    // The event count zeroed on the problem path, so a refused report cannot
    // even say how much data it refused to describe.
    expect: "more cells than the budget allows is refused, and the count is reported",
    impl: CORRECT.replace(
      `             suppressedTotal: 0, total: events.length };`,
      `             suppressedTotal: 0, total: 0 };`
    )
  },
  {
    // Marking events as counted. Invisible in every other check.
    expect: "the event stream is not modified",
    impl: CORRECT.replace(
      "      counts.set(key, (counts.get(key) || 0) + 1);",
      "      event.counted = true;\n      counts.set(key, (counts.get(key) || 0) + 1);"
    )
  }
];
