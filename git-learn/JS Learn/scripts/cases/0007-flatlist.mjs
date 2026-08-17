/* Wrong-answer cases for 02/0007-flatlist.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0007-flatlist.html \
 *        --wrong scripts/cases/0007-flatlist.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for is the plain concat. It is correct on every
 * page that does not overlap, which is every page in a list nobody is writing
 * to — so it survives all local testing. The moment a token is issued while the
 * user scrolls, the same row arrives in two pages, React sees two identical
 * keys, and one of the rows renders as the wrong token.
 */

export const alternatives = {
  "filter with a Set, then decide what to return": `function mergePage(existing, page) {
  const seen = new Set(existing.map((t) => t.id));
  const fresh = page.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  return fresh.length ? existing.concat(fresh) : existing;
}`,

  "a Map keyed by id, rebuilt only when something is new": `function mergePage(existing, page) {
  const byId = new Map(existing.map((t) => [t.id, t]));
  const fresh = [];

  for (const token of page) {
    if (byId.has(token.id)) continue;
    byId.set(token.id, token);
    fresh.push(token);
  }

  if (!fresh.length) return existing;
  return [...existing, ...fresh];
}`,

  "an index loop with a plain array of ids": `function mergePage(existing, page) {
  const ids = existing.map(function (t) { return t.id; });
  const fresh = [];

  for (let i = 0; i < page.length; i++) {
    const token = page[i];
    if (ids.indexOf(token.id) !== -1) continue;
    ids.push(token.id);
    fresh.push(token);
  }

  if (fresh.length === 0) return existing;

  const out = [];
  for (const t of existing) out.push(t);
  for (const t of fresh) out.push(t);
  return out;
}`,
};

export const mistakes = {
  "just concatenates, so an overlapping page duplicates a row": {
    expect: "an id already present is not added twice",
    impl: `function mergePage(existing, page) {
  return [...existing, ...page];
}`,
  },

  "always returns a new array, even when nothing was added": {
    expect: "an empty page returns the SAME array",
    impl: `function mergePage(existing, page) {
  const seen = new Set(existing.map((t) => t.id));
  const fresh = page.filter((t) => !seen.has(t.id));
  return [...existing, ...fresh];
}`,
  },

  "lets the incoming copy win, so a resent row replaces the one on screen": {
    expect: "a duplicate keeps the entry already on screen",
    impl: `function mergePage(existing, page) {
  const byId = new Map(existing.map((t) => [t.id, t]));
  let changed = false;

  for (const token of page) {
    if (!byId.has(token.id)) changed = true;
    byId.set(token.id, token);   // overwrites the entry already on screen
  }

  if (!changed) return existing;
  return [...byId.values()];
}`,
  },

  "pushes onto the existing array instead of copying it": {
    expect: "the original array is never mutated",
    impl: `function mergePage(existing, page) {
  const seen = new Set(existing.map((t) => t.id));
  let added = 0;

  for (const token of page) {
    if (seen.has(token.id)) continue;
    seen.add(token.id);
    existing.push(token);
    added++;
  }

  return existing;
}`,
  },

  "sorts the result by id, throwing away the server's order": {
    expect: "the API's order is preserved",
    impl: `function mergePage(existing, page) {
  const seen = new Set(existing.map((t) => t.id));
  const fresh = page.filter((t) => !seen.has(t.id));
  if (!fresh.length) return existing;
  return [...existing, ...fresh].sort((a, b) => a.id.localeCompare(b.id));
}`,
  },

  "dedupes against the existing list but not within the page itself": {
    expect: "duplicates within the incoming page are collapsed too",
    impl: `function mergePage(existing, page) {
  const seen = new Set(existing.map((t) => t.id));
  const fresh = page.filter((t) => !seen.has(t.id));
  if (fresh.length === 0) return existing;
  return [...existing, ...fresh];
}`,
  },

  "puts the new page in front of the old one": {
    expect: "a fresh page is appended in order",
    impl: `function mergePage(existing, page) {
  const seen = new Set(existing.map((t) => t.id));
  const fresh = [];
  for (const token of page) {
    if (seen.has(token.id)) continue;
    seen.add(token.id);
    fresh.push(token);
  }
  if (!fresh.length) return existing;
  return [...fresh, ...existing];
}`,
  },
};
