/* Wrong-answer cases for a5/0003 — displayStatus.
 *
 *   node scripts/verify-lesson.mjs modules/a5-core-token-features/0003-token-list-management.html \
 *        --wrong scripts/cases/0003-token-list-management.mjs
 *
 * Staged: `exercise-1` is the React Native list screen and carries its own
 * per-exercise `unverifiable` reason, so only `status` has cases.
 *
 * Two of these are the reason the exercise exists at all. `if (token.max_uses)`
 * is the Module 01 trap arriving in a real screen: null and 0 are opposite
 * meanings and only one is falsy. And `new Date(token.expires_at)` on a null
 * gives 1st January 1970, which marks every never-expiring token expired —
 * a bug that looks like a date-handling detail and is actually every token in
 * the list.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  status: {
    alternatives: {
      "computes the conditions as booleans first, then picks in order": `function displayStatus(token, now) {
  const revoked = token.status === 'revoked';
  const expired = token.expires_at != null && Date.parse(token.expires_at) <= now;
  const exhausted = token.max_uses != null && token.use_count >= token.max_uses;
  const paused = token.status === 'paused';

  if (revoked) return 'revoked';
  if (expired) return 'expired';
  if (exhausted) return 'exhausted';
  if (paused) return 'paused';
  return 'active';
}`,

      "a table of predicates walked in precedence order": `const RULES = [
  ['revoked',   function (t) { return t.status === 'revoked'; }],
  ['expired',   function (t, now) { return t.expires_at != null && Date.parse(t.expires_at) <= now; }],
  ['exhausted', function (t) { return t.max_uses != null && t.use_count >= t.max_uses; }],
  ['paused',    function (t) { return t.status === 'paused'; }],
];
function displayStatus(token, now) {
  for (const [label, test] of RULES) {
    if (test(token, now)) return label;
  }
  return 'active';
}`,

      "switch(true) rather than a chain of ifs": `function displayStatus(token, now) {
  switch (true) {
    case token.status === 'revoked':
      return 'revoked';
    case token.expires_at !== null && token.expires_at !== undefined
         && Date.parse(token.expires_at) <= now:
      return 'expired';
    case token.max_uses !== null && token.max_uses !== undefined
         && token.use_count >= token.max_uses:
      return 'exhausted';
    case token.status === 'paused':
      return 'paused';
    default:
      return 'active';
  }
}`,

      "uses Number.isFinite to sort the unlimited case out": `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';

  const expiry = token.expires_at == null ? NaN : Date.parse(token.expires_at);
  if (Number.isFinite(expiry) && expiry <= now) return 'expired';

  if (Number.isFinite(token.max_uses) && token.use_count >= token.max_uses) {
    return 'exhausted';
  }

  return token.status === 'paused' ? 'paused' : 'active';
}`,
    },

    mistakes: {
      "guards the limit with `if (token.max_uses)`, so 0 reads as unlimited": {
        expect: "a max_uses of 0 permits no uses at all",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  if (token.expires_at != null && Date.parse(token.expires_at) <= now) return 'expired';
  // The Module 01 trap. 0 is falsy, so a token permitting no uses at all
  // sails past as though it had no limit.
  if (token.max_uses && token.use_count >= token.max_uses) return 'exhausted';
  if (token.status === 'paused') return 'paused';
  return 'active';
}`,
      },

      "parses expires_at with new Date, so null becomes 1970 and everything expires": {
        expect: "no expiry and no limit reads active",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  // new Date(null) is the epoch, which is comfortably in the past.
  if (new Date(token.expires_at).getTime() <= now) return 'expired';
  if (token.max_uses != null && token.use_count >= token.max_uses) return 'exhausted';
  if (token.status === 'paused') return 'paused';
  return 'active';
}`,
      },

      "compares use_count against max_uses without testing for null first": {
        expect: "a max_uses of null is unlimited, however many uses",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  if (token.expires_at != null && Date.parse(token.expires_at) <= now) return 'expired';
  // 900 >= null coerces to 900 >= 0, so an unlimited token reads exhausted.
  if (token.use_count >= token.max_uses) return 'exhausted';
  if (token.status === 'paused') return 'paused';
  return 'active';
}`,
      },

      "uses > rather than >=, so the last permitted use leaves it looking live": {
        expect: "uses REACHING the limit is exhausted",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  if (token.expires_at != null && Date.parse(token.expires_at) <= now) return 'expired';
  if (token.max_uses != null && token.use_count > token.max_uses) return 'exhausted';
  if (token.status === 'paused') return 'paused';
  return 'active';
}`,
      },

      "uses < rather than <=, so the token is briefly alive at its own expiry": {
        expect: "a token is expired AT its expiry instant",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  if (token.expires_at != null && Date.parse(token.expires_at) < now) return 'expired';
  if (token.max_uses != null && token.use_count >= token.max_uses) return 'exhausted';
  if (token.status === 'paused') return 'paused';
  return 'active';
}`,
      },

      "renders the stored column straight through": {
        expect: "an expiry in the past reads expired",
        impl: `function displayStatus(token, now) {
  return token.status;
}`,
      },

      "checks paused alongside revoked, so an expired token offers Resume": {
        expect: "expired outranks paused",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  if (token.status === 'paused') return 'paused';
  if (token.expires_at != null && Date.parse(token.expires_at) <= now) return 'expired';
  if (token.max_uses != null && token.use_count >= token.max_uses) return 'exhausted';
  return 'active';
}`,
      },

      "checks revoked last, so a revoked token reports how it would have died anyway": {
        expect: "revoked outranks expired and exhausted together",
        impl: `function displayStatus(token, now) {
  if (token.expires_at != null && Date.parse(token.expires_at) <= now) return 'expired';
  if (token.max_uses != null && token.use_count >= token.max_uses) return 'exhausted';
  if (token.status === 'paused') return 'paused';
  if (token.status === 'revoked') return 'revoked';
  return 'active';
}`,
      },

      "puts exhausted ahead of expired, so two screens can disagree": {
        expect: "expired outranks exhausted when both apply",
        impl: `function displayStatus(token, now) {
  if (token.status === 'revoked') return 'revoked';
  if (token.max_uses != null && token.use_count >= token.max_uses) return 'exhausted';
  if (token.expires_at != null && Date.parse(token.expires_at) <= now) return 'expired';
  if (token.status === 'paused') return 'paused';
  return 'active';
}`,
      },
    },
  },
};
