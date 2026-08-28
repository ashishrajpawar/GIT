// Wrong-answer cases for c0/0002 — inForce.
//
// Fragment-composed: one correct implementation split into named
// pieces, each mistake overriding exactly one.
//
//   FILTER   — topic isolation, and the 'none' guard
//   IDS      — the id set, built FROM THE TOPIC, not from everything
//   DANGLING — must run before the cycle conclusion
//   COUNT    — cycle / ambiguous / in_force, by counting not walking
//
// `alternatives` is a map of name -> source string and `mistakes` is a
// list of { expect, impl }. verify-lesson.mjs concatenates the
// alternative VALUE onto the self-check, so an array of objects there
// stringifies to "[object Object]" and fails as a SyntaxError.

const FRAGMENTS = {
  FILTER: `
  const onTopic = records.filter(function (r) { return r.topic === topic; });
  if (onTopic.length === 0) {
    return { id: null, status: "none" };
  }`,

  IDS: `
  const ids = {};
  onTopic.forEach(function (r) { ids[r.id] = true; });`,

  DANGLING: `
  const dangling = onTopic.some(function (r) {
    return r.supersededBy !== null && !ids[r.supersededBy];
  });
  if (dangling) {
    return { id: null, status: "dangling" };
  }`,

  COUNT: `
  const live = onTopic.filter(function (r) { return r.supersededBy === null; });
  if (live.length === 0) return { id: null, status: "cycle" };
  if (live.length > 1) return { id: null, status: "ambiguous" };
  return { id: live[0].id, status: "in_force" };`,
};

const build = (overrides = {}) => {
  const f = { ...FRAGMENTS, ...overrides };
  return `function inForce(records, topic) {${f.FILTER}${f.IDS}${f.DANGLING}${f.COUNT}
}`;
};

// Styles that must all pass. Behaviour, not resemblance.
const alternatives = {
  // Sets and arrow functions instead of a plain object and forEach.
  "Set and arrow functions": `
const inForce = (records, topic) => {
  const onTopic = records.filter((r) => r.topic === topic);
  if (!onTopic.length) return { id: null, status: "none" };
  const ids = new Set(onTopic.map((r) => r.id));
  if (onTopic.some((r) => r.supersededBy !== null && !ids.has(r.supersededBy))) {
    return { id: null, status: "dangling" };
  }
  const live = onTopic.filter((r) => r.supersededBy === null);
  if (!live.length) return { id: null, status: "cycle" };
  return live.length > 1
    ? { id: null, status: "ambiguous" }
    : { id: live[0].id, status: "in_force" };
};`,

  // reduce() into a tally instead of two filter passes. Same answers,
  // and it must still compare supersededBy against null rather than
  // testing truthiness, so an empty-string pointer stays dangling.
  //
  // An earlier draft of this alternative got the DIRECTION wrong:
  // it collected the supersededBy VALUES and treated records not in
  // that set as live. Those values are the records that REPLACED
  // something, not the ones that were replaced -- so it returned the
  // oldest record in the chain. It is left recorded here because the
  // inversion is easy to make and the fixture caught it.
  "reduce into a tally": `
function inForce(records, topic) {
  const t = records.reduce(function (acc, r) {
    if (r.topic !== topic) return acc;
    acc.count++;
    acc.present[r.id] = true;
    if (r.supersededBy === null) { acc.live.push(r.id); }
    else { acc.pointers.push(r.supersededBy); }
    return acc;
  }, { count: 0, present: {}, live: [], pointers: [] });

  if (t.count === 0) return { id: null, status: "none" };
  const dangling = t.pointers.some(function (p) { return !t.present[p]; });
  if (dangling) return { id: null, status: "dangling" };
  if (t.live.length === 0) return { id: null, status: "cycle" };
  if (t.live.length > 1) return { id: null, status: "ambiguous" };
  return { id: t.live[0], status: "in_force" };
}`,

  // A single pass building both facts at once, and the result object
  // assembled at the end with its keys in a different order.
  "one pass, result assembled last": `
function inForce(records, topic) {
  let count = 0, dangling = false, liveId = null, liveCount = 0;
  const present = {};
  for (const r of records) if (r.topic === topic) present[r.id] = true;
  for (const r of records) {
    if (r.topic !== topic) continue;
    count++;
    if (r.supersededBy !== null && !present[r.supersededBy]) dangling = true;
    if (r.supersededBy === null) { liveCount++; liveId = r.id; }
  }
  if (count === 0) return { status: "none", id: null };
  if (dangling) return { status: "dangling", id: null };
  if (liveCount === 0) return { status: "cycle", id: null };
  if (liveCount > 1) return { status: "ambiguous", id: null };
  return { status: "in_force", id: liveId };
}`,
};

const mistakes = [
  {
    // The chain-walking version from the lesson's broken playground.
    // On a cycle it never returns -- the playground's loop guard stops
    // it. Its own try/catch in the self-check is what makes this
    // register as a failure rather than taking out every check below.
    expect: "a cycle is reported, not resolved",
    impl: `
function inForce(records, topic) {
  const onTopic = records.filter(function (r) { return r.topic === topic; });
  if (onTopic.length === 0) return { id: null, status: "none" };
  let current = onTopic[0];
  while (current && current.supersededBy) {
    current = onTopic.find(function (r) { return r.id === current.supersededBy; });
  }
  return current
    ? { id: current.id, status: "in_force" }
    : { id: null, status: "dangling" };
}`,
  },
  {
    // Highest id wins. Right by accident on an ascending fixture; the
    // self-check's CHAIN is deliberately NOT ascending, so 0011 -- a
    // superseded record -- is chosen over 0008.
    expect: "the record nothing supersedes is in force",
    impl: `
function inForce(records, topic) {
  const onTopic = records.filter(function (r) { return r.topic === topic; });
  if (onTopic.length === 0) return { id: null, status: "none" };
  const sorted = onTopic.slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  return { id: sorted[sorted.length - 1].id, status: "in_force" };
}`,
  },
  {
    // No topic filter on the id set: a pointer at another topic's
    // record looks valid, so cross-topic supersession silently works.
    expect: "supersession does not cross topics",
    impl: build({
      IDS: `
  const ids = {};
  records.forEach(function (r) { ids[r.id] = true; });`,
    }),
  },
  {
    // Dangling checked AFTER the count, so data that is both dangling
    // and zero-live is reported as a cycle -- the wrong diagnosis and
    // the wrong fix.
    expect: "a dangling pointer is reported as dangling",
    impl: `
function inForce(records, topic) {
  const onTopic = records.filter(function (r) { return r.topic === topic; });
  if (onTopic.length === 0) return { id: null, status: "none" };
  const ids = {};
  onTopic.forEach(function (r) { ids[r.id] = true; });
  const live = onTopic.filter(function (r) { return r.supersededBy === null; });
  if (live.length === 0) return { id: null, status: "cycle" };
  if (live.length > 1) return { id: null, status: "ambiguous" };
  const dangling = onTopic.some(function (r) {
    return r.supersededBy !== null && !ids[r.supersededBy];
  });
  if (dangling) return { id: null, status: "dangling" };
  return { id: live[0].id, status: "in_force" };
}`,
  },
  {
    // Two unsuperseded records: takes the first instead of reporting
    // ambiguity. A coin toss dressed as an answer.
    expect: "two unsuperseded records are ambiguous, not a coin toss",
    impl: build({
      COUNT: `
  const live = onTopic.filter(function (r) { return r.supersededBy === null; });
  if (live.length === 0) return { id: null, status: "cycle" };
  return { id: live[0].id, status: "in_force" };`,
    }),
  },
  {
    // No topic filter at all. Every other topic's records join in, so
    // realtime becomes ambiguous and 'backups' returns the wrong thing.
    expect: "topics are independent",
    impl: `
function inForce(records, topic) {
  if (records.length === 0) return { id: null, status: "none" };
  const ids = {};
  records.forEach(function (r) { ids[r.id] = true; });
  const dangling = records.some(function (r) {
    return r.supersededBy !== null && !ids[r.supersededBy];
  });
  if (dangling) return { id: null, status: "dangling" };
  const live = records.filter(function (r) { return r.supersededBy === null; });
  if (live.length === 0) return { id: null, status: "cycle" };
  if (live.length > 1) return { id: null, status: "ambiguous" };
  return { id: live[0].id, status: "in_force" };
}`,
  },
  {
    // No 'none' guard: an empty topic falls through to the count,
    // where zero live records reads as a cycle. It does not throw, so
    // it is the plausible version of this mistake -- "no decisions on
    // this topic" is reported as "your records are broken".
    expect: "a topic with no records is 'none', not an error",
    impl: build({
      FILTER: `
  const onTopic = records.filter(function (r) { return r.topic === topic; });`,
    }),
  },
  {
    // id left populated on a refusal. A caller checking .id rather
    // than .status proceeds with a record the function just refused
    // to endorse.
    expect: "id is null on every outcome that is not in_force",
    impl: build({
      COUNT: `
  const live = onTopic.filter(function (r) { return r.supersededBy === null; });
  if (live.length === 0) return { id: onTopic[0].id, status: "cycle" };
  if (live.length > 1) return { id: live[0].id, status: "ambiguous" };
  return { id: live[0].id, status: "in_force" };`,
    }),
  },
  {
    // Sorts the caller's array in place. Everything it returns is
    // correct; the damage is to a list somebody else is holding.
    expect: "the records array is not mutated",
    impl: `
function inForce(records, topic) {
  records.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  const onTopic = records.filter(function (r) { return r.topic === topic; });
  if (onTopic.length === 0) return { id: null, status: "none" };
  const ids = {};
  onTopic.forEach(function (r) { ids[r.id] = true; });
  const dangling = onTopic.some(function (r) {
    return r.supersededBy !== null && !ids[r.supersededBy];
  });
  if (dangling) return { id: null, status: "dangling" };
  const live = onTopic.filter(function (r) { return r.supersededBy === null; });
  if (live.length === 0) return { id: null, status: "cycle" };
  if (live.length > 1) return { id: null, status: "ambiguous" };
  return { id: live[0].id, status: "in_force" };
}`,
  },
];

export { alternatives, mistakes };
