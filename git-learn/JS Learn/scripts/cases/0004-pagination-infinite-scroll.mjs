/* Wrong-answer cases for a3/0004 — applyPage.
 *
 *   node scripts/verify-lesson.mjs modules/a3-api-consumption/0004-pagination-infinite-scroll.html \
 *        --wrong scripts/cases/0004-pagination-infinite-scroll.mjs
 *
 * Staged, because the lesson has two exercises and only one of them runs here:
 * `exercise-1` is the React Native screen and carries its own per-exercise
 * `unverifiable` reason, so only the `merge` stage has cases.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const t = (id) => ({ id, label: "token " + id });

export const stages = {
  merge: {
    alternatives: {
      "reduce instead of a for loop": `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const base = response.cursor === null ? [] : state.items;
  const merged = response.items.reduce((acc, item) => {
    return acc.some(x => x.id === item.id) ? acc : acc.concat([item]);
  }, base.slice());
  return {
    items: merged,
    nextCursor: response.nextCursor,
    hasMore: response.nextCursor !== null,
    requestId: state.requestId,
  };
}`,

      "a Map keyed by id, values() at the end": `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const base = response.cursor === null ? [] : state.items;
  const byId = new Map();
  for (const item of base) byId.set(item.id, item);
  for (const item of response.items) if (!byId.has(item.id)) byId.set(item.id, item);
  return {
    items: Array.from(byId.values()),
    nextCursor: response.nextCursor,
    hasMore: Boolean(response.nextCursor),
    requestId: state.requestId,
  };
}`,

      "early return for the refresh case": `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const dedupe = (list) => {
    const seen = new Set();
    return list.filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  };
  if (response.cursor === null) {
    return {
      items: dedupe(response.items),
      nextCursor: response.nextCursor,
      hasMore: response.nextCursor !== null,
      requestId: state.requestId,
    };
  }
  return {
    items: dedupe(state.items.concat(response.items)),
    nextCursor: response.nextCursor,
    hasMore: response.nextCursor !== null,
    requestId: state.requestId,
  };
}`,
    },

    mistakes: {
      "returns a fresh copy for a stale response instead of the same object": {
        expect: "a stale response returns the SAME state object",
        impl: `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return { ...state };
  const base = response.cursor === null ? [] : state.items;
  const seen = new Set(base.map(i => i.id));
  const merged = base.slice();
  for (const item of response.items) { if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); } }
  return { items: merged, nextCursor: response.nextCursor, hasMore: response.nextCursor !== null, requestId: state.requestId };
}`,
      },

      "appends on refresh instead of replacing": {
        expect: "a refresh replaces the list",
        impl: `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const seen = new Set(state.items.map(i => i.id));
  const merged = state.items.slice();
  for (const item of response.items) { if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); } }
  return { items: merged, nextCursor: response.nextCursor, hasMore: response.nextCursor !== null, requestId: state.requestId };
}`,
      },

      "concatenates with no de-duplication at all": {
        expect: "an overlapping page is appended without repeating a held id",
        impl: `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const base = response.cursor === null ? [] : state.items;
  return { items: base.concat(response.items), nextCursor: response.nextCursor, hasMore: response.nextCursor !== null, requestId: state.requestId };
}`,
      },

      "dedupes against the held list but not within the page": {
        expect: "a duplicate inside the incoming page is dropped too",
        impl: `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const base = response.cursor === null ? [] : state.items;
  const held = new Set(base.map(i => i.id));
  const fresh = response.items.filter(i => !held.has(i.id));
  return { items: base.concat(fresh), nextCursor: response.nextCursor, hasMore: response.nextCursor !== null, requestId: state.requestId };
}`,
      },

      "treats hasMore as 'the page came back non-empty'": {
        expect: "hasMore goes false when nextCursor is null",
        impl: `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const base = response.cursor === null ? [] : state.items;
  const seen = new Set(base.map(i => i.id));
  const merged = base.slice();
  for (const item of response.items) { if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); } }
  return { items: merged, nextCursor: response.nextCursor, hasMore: response.items.length > 0, requestId: state.requestId };
}`,
      },

      "pushes onto the existing array, mutating state": {
        expect: "the original items array is not mutated",
        impl: `function applyPage(state, response) {
  if (response.requestId !== state.requestId) return state;
  const base = response.cursor === null ? [] : state.items;
  const seen = new Set(base.map(i => i.id));
  for (const item of response.items) { if (!seen.has(item.id)) { seen.add(item.id); base.push(item); } }
  return { items: base, nextCursor: response.nextCursor, hasMore: response.nextCursor !== null, requestId: state.requestId };
}`,
      },

      "ignores requestId entirely, so a stale page lands": {
        expect: "a stale response returns the SAME state object",
        impl: `function applyPage(state, response) {
  const base = response.cursor === null ? [] : state.items;
  const seen = new Set(base.map(i => i.id));
  const merged = base.slice();
  for (const item of response.items) { if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); } }
  return { items: merged, nextCursor: response.nextCursor, hasMore: response.nextCursor !== null, requestId: state.requestId };
}`,
      },
    },
  },
};
