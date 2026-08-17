/* Wrong-answer cases for 02/0001-expo-setup-and-eas-build.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0001-expo-setup-and-eas-build.html \
 *        --wrong scripts/cases/0001-expo-setup-and-eas-build.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake worth the lesson is the recursive resolver with no seen-set. It
 * is correct for every eas.json anybody writes on purpose, and it hangs — or
 * blows the stack — the day two profiles extend each other. A build command
 * that sits there doing nothing is a bad afternoon.
 */

export const alternatives = {
  "recursion with an explicit seen set": `function resolveProfile(profiles, name, seen = new Set()) {
  if (seen.has(name)) return { ok: false, reason: "cycle" };
  const profile = profiles[name];
  if (!profile) return { ok: false, reason: "unknown" };

  seen.add(name);

  if (!profile.extends) {
    const own = { ...profile };
    delete own.extends;
    return { ok: true, profile: own };
  }

  const parent = resolveProfile(profiles, profile.extends, seen);
  if (!parent.ok) return parent;

  const merged = { ...parent.profile, ...profile };
  delete merged.extends;
  return { ok: true, profile: merged };
}`,

  "collects the chain with a while loop and reduce": `function resolveProfile(profiles, name) {
  const chain = [];
  const visited = [];
  let current = name;

  while (current) {
    if (visited.indexOf(current) !== -1) return { ok: false, reason: "cycle" };
    visited.push(current);
    const profile = profiles[current];
    if (!profile) return { ok: false, reason: "unknown" };
    chain.unshift(profile);
    current = profile.extends;
  }

  const merged = chain.reduce((acc, p) => Object.assign(acc, p), {});
  delete merged.extends;
  return { ok: true, profile: merged };
}`,

  "guards the depth instead of tracking names": `function resolveProfile(profiles, name) {
  const chain = [];
  let current = name;
  let hops = 0;

  while (current !== undefined) {
    if (hops++ > 50) return { ok: false, reason: "cycle" };
    const profile = profiles[current];
    if (!profile) return { ok: false, reason: "unknown" };
    chain.push(profile);
    current = profile.extends;
  }

  const out = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    for (const key of Object.keys(chain[i])) {
      if (key !== "extends") out[key] = chain[i][key];
    }
  }
  return { ok: true, profile: out };
}`,
};

export const mistakes = {
  "recurses with no cycle guard": {
    expect: "a cycle is reported rather than hanging",
    impl: `function resolveProfile(profiles, name) {
  const profile = profiles[name];
  if (!profile) return { ok: false, reason: "unknown" };

  if (!profile.extends) {
    const own = { ...profile };
    delete own.extends;
    return { ok: true, profile: own };
  }

  const parent = resolveProfile(profiles, profile.extends);
  if (!parent.ok) return parent;

  const merged = { ...parent.profile, ...profile };
  delete merged.extends;
  return { ok: true, profile: merged };
}`,
  },

  "merges parent over child, so inheritance overrides your own settings": {
    expect: "a child's own key wins over the parent's",
    impl: `function resolveProfile(profiles, name) {
  const chain = [];
  const seen = new Set();
  let current = name;

  while (current !== undefined) {
    if (seen.has(current)) return { ok: false, reason: "cycle" };
    seen.add(current);
    const profile = profiles[current];
    if (!profile) return { ok: false, reason: "unknown" };
    chain.push(profile);
    current = profile.extends;
  }

  const merged = Object.assign({}, ...chain);   // child first, so parent wins
  delete merged.extends;
  return { ok: true, profile: merged };
}`,
  },

  "leaves extends in the resolved profile": {
    expect: "extends is not left in the result",
    impl: `function resolveProfile(profiles, name) {
  const chain = [];
  const seen = new Set();
  let current = name;

  while (current !== undefined) {
    if (seen.has(current)) return { ok: false, reason: "cycle" };
    seen.add(current);
    const profile = profiles[current];
    if (!profile) return { ok: false, reason: "unknown" };
    chain.push(profile);
    current = profile.extends;
  }

  return { ok: true, profile: Object.assign({}, ...chain.reverse()) };
}`,
  },

  "only looks one level up, so a two-deep chain loses the root": {
    expect: "a two-deep chain reaches the root",
    impl: `function resolveProfile(profiles, name) {
  const profile = profiles[name];
  if (!profile) return { ok: false, reason: "unknown" };
  if (!profile.extends) {
    const own = { ...profile };
    delete own.extends;
    return { ok: true, profile: own };
  }

  const parent = profiles[profile.extends];
  if (!parent) return { ok: false, reason: "unknown" };

  const merged = { ...parent, ...profile };
  delete merged.extends;
  return { ok: true, profile: merged };
}`,
  },

  "deletes extends from the original profile objects": {
    expect: "the profiles object is never modified",
    impl: `function resolveProfile(profiles, name) {
  const chain = [];
  const seen = new Set();
  let current = name;

  while (current !== undefined) {
    if (seen.has(current)) return { ok: false, reason: "cycle" };
    seen.add(current);
    const profile = profiles[current];
    if (!profile) return { ok: false, reason: "unknown" };
    chain.push(profile);
    const next = profile.extends;
    delete profile.extends;    // mutates eas.json's parsed object
    current = next;
  }

  return { ok: true, profile: Object.assign({}, ...chain.reverse()) };
}`,
  },

  "returns undefined for an unknown name instead of a reason": {
    expect: "an unknown profile name is reported",
    impl: `function resolveProfile(profiles, name) {
  const chain = [];
  const seen = new Set();
  let current = name;

  while (current !== undefined) {
    if (seen.has(current)) return { ok: false, reason: "cycle" };
    seen.add(current);
    const profile = profiles[current];
    if (!profile) return { ok: true, profile: {} };   // shrugs instead of failing
    chain.push(profile);
    current = profile.extends;
  }

  const merged = Object.assign({}, ...chain.reverse());
  delete merged.extends;
  return { ok: true, profile: merged };
}`,
  },
};
