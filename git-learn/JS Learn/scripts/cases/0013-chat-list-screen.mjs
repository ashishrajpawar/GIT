/* Wrong-answer cases for 02/0013 — the token list screen.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0013-chat-list-screen.html \
 *        --wrong scripts/cases/0013-chat-list-screen.mjs
 *
 * (The file is still named 0013-chat-list-screen.html. Renaming it touches
 * search-index.json, the module README and prev/next nav in three lessons, so
 * it is its own unit rather than a rider on this retrofit.)
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for calls sort() on the array it was handed.
 * The returned order is correct, so the function looks right in isolation; the
 * array is React state, so the screen does not re-render and the rows may
 * shuffle later when something unrelated forces one.
 */

export const alternatives = {
  "a rank helper and chained comparisons": `function rankOf(status) {
  if (status === "active") return 0;
  if (status === "paused") return 1;
  if (status === "revoked") return 2;
  return 3;
}

function usedAt(token) {
  return token.lastUsedAt === null || token.lastUsedAt === undefined ? -Infinity : token.lastUsedAt;
}

function orderTokens(tokens) {
  return tokens.slice().sort((a, b) =>
    rankOf(a.status) - rankOf(b.status) ||
    usedAt(b) - usedAt(a) ||
    a.label.localeCompare(b.label));
}`,

  "an array of comparators applied in turn": `const ORDER = ["active", "paused", "revoked"];

const byStatus = (a, b) => {
  const ra = ORDER.indexOf(a.status), rb = ORDER.indexOf(b.status);
  return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
};
// Both never-used means -Infinity - -Infinity, which is NaN, and NaN is not 0
// — so the chain below would stop here instead of falling through to the label.
const byRecency = (a, b) => {
  const ua = a.lastUsedAt ?? null;
  const ub = b.lastUsedAt ?? null;
  if (ua === null && ub === null) return 0;
  if (ua === null) return 1;
  if (ub === null) return -1;
  return ub - ua;
};
const byLabel = (a, b) => a.label.localeCompare(b.label);

function orderTokens(tokens) {
  const comparators = [byStatus, byRecency, byLabel];
  return [...tokens].sort((a, b) => {
    for (const cmp of comparators) {
      const result = cmp(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}`,

  "buckets by status, sorts each bucket, then concatenates": `function orderTokens(tokens) {
  const buckets = { active: [], paused: [], revoked: [], other: [] };
  for (const token of tokens) {
    (buckets[token.status] || buckets.other).push(token);
  }

  const within = (list) =>
    list.slice().sort((a, b) => {
      const ua = a.lastUsedAt == null ? -Infinity : a.lastUsedAt;
      const ub = b.lastUsedAt == null ? -Infinity : b.lastUsedAt;
      if (ua !== ub) return ub - ua;
      return a.label.localeCompare(b.label);
    });

  return [
    ...within(buckets.active),
    ...within(buckets.paused),
    ...within(buckets.revoked),
    ...within(buckets.other),
  ];
}`,
};

export const mistakes = {
  "sorts the array it was given, in place": {
    expect: "the array you were given is not reordered",
    impl: `const STATUS_RANK = { active: 0, paused: 1, revoked: 2 };

function orderTokens(tokens) {
  return tokens.sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 3;
    const rankB = STATUS_RANK[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    const usedA = a.lastUsedAt ?? -Infinity;
    const usedB = b.lastUsedAt ?? -Infinity;
    if (usedA !== usedB) return usedB - usedA;
    return a.label.localeCompare(b.label);
  });
}`,
  },

  "treats a never-used token as brand new": {
    expect: "a never-used token sorts below one that has been used",
    impl: `const STATUS_RANK = { active: 0, paused: 1, revoked: 2 };

function orderTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 3;
    const rankB = STATUS_RANK[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    const usedA = a.lastUsedAt ?? Infinity;    // null wins every comparison
    const usedB = b.lastUsedAt ?? Infinity;
    if (usedA !== usedB) return usedB - usedA;
    return a.label.localeCompare(b.label);
  });
}`,
  },

  "sorts by recency first, so a revoked token can top the list": {
    expect: "status beats recency",
    impl: `const STATUS_RANK = { active: 0, paused: 1, revoked: 2 };

function orderTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const usedA = a.lastUsedAt ?? -Infinity;
    const usedB = b.lastUsedAt ?? -Infinity;
    if (usedA !== usedB) return usedB - usedA;
    const rankA = STATUS_RANK[a.status] ?? 3;
    const rankB = STATUS_RANK[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    return a.label.localeCompare(b.label);
  });
}`,
  },

  "has no tiebreak, so equal tokens keep whatever order they arrived in": {
    expect: "an exact tie is broken by label, A-Z",
    impl: `const STATUS_RANK = { active: 0, paused: 1, revoked: 2 };

function orderTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 3;
    const rankB = STATUS_RANK[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    return (b.lastUsedAt ?? -Infinity) - (a.lastUsedAt ?? -Infinity);
  });
}`,
  },

  "orders oldest first": {
    expect: "within a group, most recently used comes first",
    impl: `const STATUS_RANK = { active: 0, paused: 1, revoked: 2 };

function orderTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 3;
    const rankB = STATUS_RANK[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    const usedA = a.lastUsedAt ?? -Infinity;
    const usedB = b.lastUsedAt ?? -Infinity;
    if (usedA !== usedB) return usedA - usedB;   // ascending
    return a.label.localeCompare(b.label);
  });
}`,
  },

  "puts revoked above paused": {
    expect: "active comes before paused, and paused before revoked",
    impl: `const STATUS_RANK = { active: 0, revoked: 1, paused: 2 };

function orderTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 3;
    const rankB = STATUS_RANK[b.status] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    const usedA = a.lastUsedAt ?? -Infinity;
    const usedB = b.lastUsedAt ?? -Infinity;
    if (usedA !== usedB) return usedB - usedA;
    return a.label.localeCompare(b.label);
  });
}`,
  },

  "lets an unknown status sort to the top": {
    expect: "an unknown status sorts last rather than crashing",
    impl: `const STATUS_RANK = { active: 0, paused: 1, revoked: 2 };

function orderTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? -1;   // unknown wins
    const rankB = STATUS_RANK[b.status] ?? -1;
    if (rankA !== rankB) return rankA - rankB;
    const usedA = a.lastUsedAt ?? -Infinity;
    const usedB = b.lastUsedAt ?? -Infinity;
    if (usedA !== usedB) return usedB - usedA;
    return a.label.localeCompare(b.label);
  });
}`,
  },
};
