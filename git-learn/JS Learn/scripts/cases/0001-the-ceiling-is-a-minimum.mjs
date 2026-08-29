// Wrong-answer cases for C6/0001 — capacityCeiling().
//
// The lesson's thesis is that every casual error in a capacity calculation
// makes the number LARGER. Six of the eleven mistakes below do exactly that,
// which is the point: the self-check has to be able to tell an optimistic
// answer from a correct one, and an optimistic answer still returns a number
// and still looks like a capacity report.

const RESOURCES_SRC = `const RESOURCES = [
  { name: "memory",   limit: "memoryMb",        reserve: "reservedMemoryMb",      cost: "memoryPerConnectionKb",      scale: 1024 },
  { name: "fds",      limit: "fileDescriptors", reserve: "reservedFds",           cost: "fdsPerConnection",           scale: 1 },
  { name: "database", limit: "dbConnections",   reserve: "reservedDbConnections", cost: "dbConnectionsPerConnection", scale: 1 }
];
`;

const CORRECT_BODY = `function capacityCeiling(box, workload, policy) {
  const nearPct = policy && policy.nearPct !== undefined ? policy.nearPct : 10;
  const limits = {};
  const unknown = [];
  for (const res of RESOURCES) {
    const total = box[res.limit];
    if (total === undefined || total === null) {
      limits[res.name] = null;
      unknown.push(res.name);
      continue;
    }
    const reserved = box[res.reserve] || 0;
    const available = Math.max(0, (total - reserved) * res.scale);
    const cost = workload[res.cost];
    limits[res.name] = cost === 0 ? Infinity : Math.floor(available / cost);
  }
  const known = RESOURCES.map(r => r.name).filter(name => limits[name] !== null);
  if (known.length === 0) {
    return { connections: null, binding: null, near: [], limits: limits, unknown: unknown };
  }
  let connections = Infinity;
  for (const name of known) {
    if (limits[name] < connections) connections = limits[name];
  }
  let binding = null;
  if (connections !== Infinity) {
    for (const name of known) {
      if (limits[name] === connections) { binding = name; break; }
    }
  }
  const near = [];
  if (binding !== null) {
    const cutoff = connections * (1 + nearPct / 100);
    for (const name of known) {
      if (name === binding) continue;
      if (limits[name] !== Infinity && limits[name] <= cutoff) near.push(name);
    }
  }
  return { connections, binding, near, limits, unknown };
}`;

export const alternatives = {
  // reduce() instead of a for loop, and Object.entries instead of a name list.
  "reduce and entries": RESOURCES_SRC + `
function capacityCeiling(box, workload, policy) {
  const nearPct = policy?.nearPct ?? 10;
  const limits = {};
  const unknown = [];

  RESOURCES.forEach(res => {
    const total = box[res.limit];
    if (total === undefined || total === null) {
      limits[res.name] = null;
      unknown.push(res.name);
      return;
    }
    const available = Math.max(0, (total - (box[res.reserve] ?? 0)) * res.scale);
    const cost = workload[res.cost];
    limits[res.name] = cost === 0 ? Infinity : Math.floor(available / cost);
  });

  const known = Object.entries(limits).filter(([, v]) => v !== null);
  if (known.length === 0) {
    return { connections: null, binding: null, near: [], limits, unknown };
  }

  const connections = known.reduce((lowest, [, v]) => (v < lowest ? v : lowest), Infinity);
  const hit = connections === Infinity ? undefined : known.find(([, v]) => v === connections);
  const binding = hit ? hit[0] : null;

  const near = binding === null
    ? []
    : known
        .filter(([n, v]) => n !== binding && v !== Infinity && v <= connections * (1 + nearPct / 100))
        .map(([n]) => n);

  return { connections, binding, near, limits, unknown };
}`,

  // A per-resource helper that returns the ceiling, keeping the main function short.
  "helper per resource": RESOURCES_SRC + `
function ceilingFor(box, workload, res) {
  const total = box[res.limit];
  if (total === undefined || total === null) return null;
  const available = Math.max(0, (total - (box[res.reserve] || 0)) * res.scale);
  const cost = workload[res.cost];
  if (cost === 0) return Infinity;
  return Math.floor(available / cost);
}

function capacityCeiling(box, workload, policy) {
  const nearPct = policy && typeof policy.nearPct === "number" ? policy.nearPct : 10;
  const limits = {};
  for (const res of RESOURCES) limits[res.name] = ceilingFor(box, workload, res);

  const order = RESOURCES.map(r => r.name);
  const unknown = order.filter(n => limits[n] === null);
  const known = order.filter(n => limits[n] !== null);

  if (!known.length) return { connections: null, binding: null, near: [], limits, unknown };

  const connections = Math.min(...known.map(n => limits[n]));
  const binding = connections === Infinity ? null : known.filter(n => limits[n] === connections)[0];

  const cutoff = connections * (1 + nearPct / 100);
  const near = binding === null
    ? []
    : known.filter(n => n !== binding && limits[n] !== Infinity && limits[n] <= cutoff);

  return { connections, binding, near, limits, unknown };
}`,

  // Sorting a copy of the known resources rather than scanning for the minimum.
  // Sort is stable, so the RESOURCES order survives a tie and the tie-break holds.
  "sorted copy": RESOURCES_SRC + `
function capacityCeiling(box, workload, policy) {
  const nearPct = (policy || {}).nearPct === undefined ? 10 : policy.nearPct;
  const limits = {};
  const unknown = [];

  for (const res of RESOURCES) {
    const total = box[res.limit];
    if (total === undefined || total === null) {
      limits[res.name] = null;
      unknown.push(res.name);
    } else {
      const available = Math.max(0, (total - (box[res.reserve] || 0)) * res.scale);
      const cost = workload[res.cost];
      limits[res.name] = cost === 0 ? Infinity : Math.floor(available / cost);
    }
  }

  const ranked = RESOURCES
    .map(r => r.name)
    .filter(n => limits[n] !== null)
    .slice()
    .sort((a, b) => limits[a] - limits[b]);

  if (ranked.length === 0) {
    return { connections: null, binding: null, near: [], limits, unknown };
  }

  const connections = limits[ranked[0]];
  const binding = connections === Infinity ? null : ranked[0];
  const near = binding === null ? [] : ranked
    .slice(1)
    .filter(n => limits[n] !== Infinity && limits[n] <= connections * (1 + nearPct / 100));

  return { connections, binding, near, limits, unknown };
}`
};

export const mistakes = [
  {
    // The lesson's headline error, and the one that produced the number
    // fourteen times too large in section 3.
    expect: "the reserve is subtracted before the division",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "const available = Math.max(0, (total - reserved) * res.scale);",
      "const available = Math.max(0, total * res.scale);"
    )
  },
  {
    expect: "the memory ceiling floors 14298.76 rather than rounding it",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "limits[res.name] = cost === 0 ? Infinity : Math.floor(available / cost);",
      "limits[res.name] = cost === 0 ? Infinity : Math.round(available / cost);"
    )
  },
  {
    // 3072 MB divided by 220 as though both were the same unit.
    expect: "the memory ceiling floors 14298.76 rather than rounding it",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "const available = Math.max(0, (total - reserved) * res.scale);",
      "const available = Math.max(0, total - reserved);"
    )
  },
  {
    // Infinity for a gap in your knowledge — the whole of section 5.
    expect: "a missing box limit is reported by name and left out of the minimum",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      `    if (total === undefined || total === null) {
      limits[res.name] = null;
      unknown.push(res.name);
      continue;
    }`,
      `    if (total === undefined || total === null) {
      limits[res.name] = Infinity;
      continue;
    }`
    )
  },
  {
    // Recorded as unknown, and then counted anyway because the filter is
    // testing for undefined rather than for the null that was stored.
    expect: "a missing box limit is reported by name and left out of the minimum",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      `    if (total === undefined || total === null) {
      limits[res.name] = null;
      unknown.push(res.name);
      continue;
    }`,
      `    if (total === undefined || total === null) {
      limits[res.name] = 0;
      unknown.push(res.name);
      continue;
    }`
    )
  },
  {
    // No clamp: an over-large reserve gives a negative, and a negative wins
    // every comparison, so it is reported as the capacity of the box.
    expect: "a reserve larger than the limit gives zero, never a negative",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "const available = Math.max(0, (total - reserved) * res.scale);",
      "const available = (total - reserved) * res.scale;"
    )
  },
  {
    // Worth reading, because the first version of this case did not discriminate
    // at all. `available / 0` is ALREADY Infinity whenever available is positive,
    // so on the ordinary zero-cost fixture the guard changes nothing and the
    // mistake passed every check — the "assertion whose two sides cannot differ"
    // trap again. The guard only earns its place at 0 / 0, which is NaN: a
    // resource that does not bind, reported as no answer at all. NaN then
    // compares false against everything, so it silently drops out of the
    // minimum and out of the near list, and the report reads as though the
    // resource had been considered. Hence the second fixture, where the
    // descriptor reserve exceeds the limit and the workload needs none.
    expect: "a resource needing nothing per connection does not bind even when nothing is spare",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "limits[res.name] = cost === 0 ? Infinity : Math.floor(available / cost);",
      "limits[res.name] = Math.floor(available / cost);"
    )
  },
  {
    // Ties broken by whichever key the loop happens to reach first when the
    // object is iterated rather than the fixed resource order.
    expect: "an exact tie breaks towards memory, and the loser is near rather than binding",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      `  let binding = null;
  if (connections !== Infinity) {
    for (const name of known) {
      if (limits[name] === connections) { binding = name; break; }
    }
  }`,
      `  let binding = null;
  if (connections !== Infinity) {
    const names = known.slice().reverse();
    for (const name of names) {
      if (limits[name] === connections) { binding = name; break; }
    }
  }`
    )
  },
  {
    // near includes the binding resource, so the list of what else you would
    // have to fix contains the thing you were already fixing.
    expect: "a limit sitting just behind the binding one is reported as near",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "      if (name === binding) continue;\n",
      ""
    )
  },
  {
    // A strictly-less-than cutoff, so a resource exactly at the boundary of
    // the near window disappears — and 1056 against a 1100 cutoff is not the
    // boundary, so this one is caught by the tie fixture instead, where the
    // loser sits exactly at the ceiling.
    expect: "an exact tie breaks towards memory, and the loser is near rather than binding",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      "if (limits[name] !== Infinity && limits[name] <= cutoff) near.push(name);",
      "if (limits[name] !== Infinity && limits[name] < connections) near.push(name);"
    )
  },
  {
    // An empty box reports zero rather than admitting it knows nothing. Zero
    // is a claim about the machine; null is a claim about the calculation.
    expect: "a box with no known limits reports null rather than a number",
    impl: RESOURCES_SRC + CORRECT_BODY.replace(
      `  if (known.length === 0) {
    return { connections: null, binding: null, near: [], limits: limits, unknown: unknown };
  }`,
      `  if (known.length === 0) {
    return { connections: 0, binding: null, near: [], limits: limits, unknown: unknown };
  }`
    )
  }
];
