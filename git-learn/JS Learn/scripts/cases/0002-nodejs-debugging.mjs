// Wrong-answer cases for x2/0002 — redactLogFields.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   HELPERS  — the two questions rules 3 and 4 both reduce to
//   DEPTH    — rule 6, depth and cycles. Two guards, two failures
//   LEAF     — rules 2 and 5, full paths and what an array may hold
//   DESCEND  — rules 3, 4 and 7
//   TOP      — the entry point
//
// Every mistake here fails OPEN. That is the shape of the whole subject:
// a broken redactor does not throw and does not lose a field you notice,
// it writes a credential into a file and looks exactly like a working
// one. Only the first three checks -- "is the secret anywhere in the
// output" -- can see most of them.

const FRAGMENTS = {
  HELPERS: `
  const anythingBelow = (path) => allow.some((p) => p.startsWith(path + "."));
  const isPrimitive = (v) =>
    v === null || ["string", "number", "boolean"].includes(typeof v);`,

  DEPTH: `
    if (depth > config.maxDepth) { dropped.push(path); return undefined; }`,

  LEAF: `
    if (isPrimitive(value)) {
      if (allow.includes(path)) return value;
      dropped.push(path);
      return undefined;
    }
    if (Array.isArray(value)) {
      if (allow.includes(path) && value.every(isPrimitive)) return value.slice();
      dropped.push(path);
      return undefined;
    }
    if (typeof value !== "object" || value === null) {
      dropped.push(path); return undefined;
    }
    if (seen.has(value)) { dropped.push(path); return undefined; }`,

  DESCEND: `
    if (!anythingBelow(path)) { dropped.push(path); return undefined; }
    const next = new Set(seen);
    next.add(value);
    const out = {};
    let kept = 0;
    for (const key of Object.keys(value)) {
      const childPath = path ? path + "." + key : key;
      const result = walk(value[key], childPath, depth + 1, next);
      if (result !== undefined) { out[key] = result; kept++; }
    }
    if (kept === 0) return undefined;
    return out;`,

  TOP: `
  const safe = {};
  for (const key of Object.keys(entry || {})) {
    const result = walk(entry[key], key, 1, new Set([entry]));
    if (result !== undefined) safe[key] = result;
  }
  return { safe, dropped: dropped.sort() };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function redactLogFields(entry, config) {
  const dropped = [];
  const allow = config.allow;
${f.HELPERS}
  const walk = (value, path, depth, seen) => {
${f.DEPTH}
${f.LEAF}
${f.DESCEND}
  };
${f.TOP}
}`;
}

const alternatives = [
  // Builds the result with reduce and tracks seen with an array rather
  // than a Set. Same answers throughout.
  build({
    DESCEND: `
    if (!anythingBelow(path)) { dropped.push(path); return undefined; }
    const next = new Set(seen);
    next.add(value);
    const entries = Object.keys(value)
      .map((key) => [key, walk(value[key], path ? path + "." + key : key, depth + 1, next)])
      .filter(([, v]) => v !== undefined);
    if (entries.length === 0) return undefined;
    return entries.reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});`,
  }),

  // Checks the leaf against a Set built once, and expresses the array
  // rule as "not some non-primitive" rather than "every primitive" --
  // which is the same thing, including for the empty array.
  build({
    HELPERS: `
  const allowSet = new Set(allow);
  allow.includes = (p) => allowSet.has(p);
  const anythingBelow = (path) => allow.some((p) => p.startsWith(path + "."));
  const isPrimitive = (v) =>
    v === null || ["string", "number", "boolean"].includes(typeof v);`,
    LEAF: `
    if (isPrimitive(value)) {
      if (allowSet.has(path)) return value;
      dropped.push(path);
      return undefined;
    }
    if (Array.isArray(value)) {
      if (allowSet.has(path) && !value.some((v) => !isPrimitive(v))) return value.slice();
      dropped.push(path);
      return undefined;
    }
    if (typeof value !== "object" || value === null) {
      dropped.push(path); return undefined;
    }
    if (seen.has(value)) { dropped.push(path); return undefined; }`,
  }),
];

const mistakes = [
  {
    // THE bug, and the reason the function exists. A deny-list of the
    // names somebody thought of. It redacts `code` and `authorization`
    // and passes everything else, so it looks perfect against today's
    // log line and leaks the field added next week -- silently, into a
    // file, for months.
    expect: "a field added next week is dropped without anyone updating a list",
    impl: `
function redactLogFields(entry, config) {
  const DENY = ["code", "password", "authorization", "token", "secret"];
  const dropped = [];
  const walk = (value, path, depth) => {
    if (depth > config.maxDepth) { dropped.push(path); return undefined; }
    const key = path.split(".").pop();
    if (DENY.some((d) => key.toLowerCase().includes(d))) {
      dropped.push(path);
      return undefined;
    }
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
    if (Array.isArray(value)) return value.slice();
    if (typeof value !== "object") { dropped.push(path); return undefined; }
    const out = {};
    for (const k of Object.keys(value)) {
      const r = walk(value[k], path ? path + "." + k : k, depth + 1);
      if (r !== undefined) out[k] = r;
    }
    return out;
  };
  const safe = {};
  for (const key of Object.keys(entry || {})) {
    const r = walk(entry[key], key, 1);
    if (r !== undefined) safe[key] = r;
  }
  return { safe, dropped: dropped.sort() };
}`,
  },
  {
    // Rule 2 inverted: matches the KEY NAME anywhere instead of the full
    // path. An allow-list that has quietly become a name-based filter,
    // so any object in the tree with a key called `ip` or `method`
    // contributes it. The headline checks still pass, which is what
    // makes this one survive review.
    expect: "an allowed key name elsewhere in the tree is still dropped",
    impl: build({
      LEAF: `
    if (isPrimitive(value)) {
      const key = path.split(".").pop();
      if (allow.some((p) => p.split(".").pop() === key)) return value;
      dropped.push(path);
      return undefined;
    }
    if (Array.isArray(value)) {
      if (allow.includes(path) && value.every(isPrimitive)) return value.slice();
      dropped.push(path);
      return undefined;
    }
    if (typeof value !== "object" || value === null) {
      dropped.push(path); return undefined;
    }
    if (seen.has(value)) { dropped.push(path); return undefined; }`,
      DESCEND: `
    const next = new Set(seen);
    next.add(value);
    const out = {};
    let kept = 0;
    for (const key of Object.keys(value)) {
      const childPath = path ? path + "." + key : key;
      const result = walk(value[key], childPath, depth + 1, next);
      if (result !== undefined) { out[key] = result; kept++; }
    }
    if (kept === 0) return undefined;
    return out;`,
    }),
  },
  {
    // Rule 3 dropped: descends into every object rather than only those
    // with something allowed below. Nothing leaks here, because the leaf
    // check still holds -- but req.body and req.headers are now reported
    // leaf by leaf, so the dropped list names `req.body.code`. The path
    // of a secret is not the secret, and it is still a list of your
    // field names growing without limit in every log line.
    expect: "a disallowed subtree is reported once, by its own path",
    impl: build({
      DESCEND: `
    const next = new Set(seen);
    next.add(value);
    const out = {};
    let kept = 0;
    for (const key of Object.keys(value)) {
      const childPath = path ? path + "." + key : key;
      const result = walk(value[key], childPath, depth + 1, next);
      if (result !== undefined) { out[key] = result; kept++; }
    }
    if (kept === 0) return undefined;
    return out;`,
    }),
  },
  {
    // Rule 4 dropped: an object with nothing allowed inside is emitted
    // as {}. Harmless-looking, and it tells the reader a field was there
    // while telling them nothing about it -- and it makes every log line
    // carry the SHAPE of the request, which is a slower leak of the same
    // kind.
    expect: "an object with nothing allowed inside it does not appear at all",
    impl: build({
      DESCEND: `
    if (!anythingBelow(path)) { dropped.push(path); return {}; }
    const next = new Set(seen);
    next.add(value);
    const out = {};
    for (const key of Object.keys(value)) {
      const childPath = path ? path + "." + key : key;
      const result = walk(value[key], childPath, depth + 1, next);
      if (result !== undefined) out[key] = result;
    }
    return out;`,
    }),
  },
  {
    // Rule 5: an array is kept whole if its path is allowed, whatever it
    // contains. So one array of objects carries every field of every
    // element straight through -- and arrays are where request payloads
    // put the things there are several of.
    expect: "...but an array containing an object is dropped",
    impl: build({
      LEAF: `
    if (isPrimitive(value)) {
      if (allow.includes(path)) return value;
      dropped.push(path);
      return undefined;
    }
    if (Array.isArray(value)) {
      if (allow.includes(path)) return value.slice();
      dropped.push(path);
      return undefined;
    }
    if (typeof value !== "object" || value === null) {
      dropped.push(path); return undefined;
    }
    if (seen.has(value)) { dropped.push(path); return undefined; }`,
    }),
  },
  {
    // Rule 6: no depth limit at all. It does not leak -- it throws
    // RangeError on the circular fixture and takes down the request
    // that was being logged, because req.socket.server references its
    // own connections and req is the most-logged object in Node.
    //
    // Note it trips BOTH the depth check and the cycle check, and that
    // is the point rather than a flaw in the case: the depth limit IS
    // the cycle guard. An earlier version of this file had a separate
    // no-cycle-guard mistake, which could only be made to fail by also
    // removing the depth limit -- which is how the exercise text came
    // to be corrected. `seen` is a tidiness measure, not a safety one.
    expect: "anything deeper than maxDepth is dropped",
    impl: build({ DEPTH: `` }),
  },
  {
    // Rule 7: mutates the entry, deleting what it will not log. The log
    // line is perfect and the handler that runs next has a request with
    // no body -- so the redactor does not leak the token code, it stops
    // the token being redeemed.
    expect: "the input is not mutated",
    impl: build({
      TOP: `
  const safe = {};
  for (const key of Object.keys(entry || {})) {
    const result = walk(entry[key], key, 1, new Set([entry]));
    if (result !== undefined) safe[key] = result;
    else delete entry[key];
  }
  for (const p of dropped) {
    const parts = p.split(".");
    let node = entry;
    for (let i = 0; i < parts.length - 1 && node; i++) node = node[parts[i]];
    if (node && typeof node === "object") delete node[parts[parts.length - 1]];
  }
  return { safe, dropped: dropped.sort() };`,
    }),
  },
  {
    // The dropped list is not sorted, so two identical requests produce
    // two different log lines and a diff between them is noise. Not a
    // leak -- the one mistake in this file that is only untidiness --
    // and it is here because the sort is the kind of line that gets
    // removed as pointless.
    expect: "...and the dropped list is sorted",
    impl: build({
      TOP: `
  const safe = {};
  for (const key of Object.keys(entry || {})) {
    const result = walk(entry[key], key, 1, new Set([entry]));
    if (result !== undefined) safe[key] = result;
  }
  return { safe, dropped: dropped.reverse() };`,
    }),
  },
  {
    // Emits allowed-but-absent keys as undefined. JSON.stringify drops
    // them, so the written log is identical and the object handed to
    // anything else is not -- a difference that shows up only in the one
    // place nobody tests.
    expect: "an allowed key that is absent simply does not appear",
    impl: build({
      TOP: `
  const safe = {};
  for (const key of Object.keys(entry || {})) {
    safe[key] = walk(entry[key], key, 1, new Set([entry]));
  }
  for (const p of allow) {
    if (!p.includes(".") && !(p in safe)) safe[p] = undefined;
  }
  return { safe, dropped: dropped.sort() };`,
    }),
  },
];

export const stages = {
  redact: { alternatives, mistakes },
};
