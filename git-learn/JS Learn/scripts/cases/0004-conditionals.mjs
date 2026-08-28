/**
 * Wrong-answer cases for 01/0004 — checkAccess and its precedence order.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0004-conditionals.html \
 *        --wrong scripts/cases/0004-conditionals.mjs
 *
 * The exercise is four rules in a fixed order, and the order is the whole
 * point: three of the four states can be true at once, and only the first one
 * checked is returned. So the mistakes worth writing are not typos, they are
 * re-orderings — each one produces a function that is correct for every token
 * with a single state and wrong only for the combinations.
 *
 * THIS FILE FOUND A HOLE IN THE SELF-CHECK, which is what it is for. The check
 * tested revoked-beats-paused and nothing else, so `checkAccess` written with
 * the limit ahead of the pause passed all six checks — a paused token at its
 * limit reported "limit reached", and the Resume button that fixes a pause was
 * hidden behind a state the user cannot clear. A seventh check was added to
 * the lesson on 2026-08-28. It is the same precedence bug as the badge in
 * `a5/0003`, met for the first time here.
 */

export const alternatives = {
  "early returns, no else": `
function checkAccess(token) {
  if (token.revokedAt !== null) return "revoked";
  if (token.isPaused) return "paused";
  if (token.timesUsed >= token.maxUses) return "limit reached";
  return "allowed";
}`,

  "a ternary chain": `
const checkAccess = (token) =>
  token.revokedAt !== null ? "revoked"
  : token.isPaused ? "paused"
  : token.timesUsed >= token.maxUses ? "limit reached"
  : "allowed";`,

  "the limit comparison written the other way round": `
function checkAccess(token) {
  if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.isPaused === true) {
    return "paused";
  } else if (token.maxUses <= token.timesUsed) {
    return "limit reached";
  } else {
    return "allowed";
  }
}`,

  "the answer held in a variable and returned once at the end": `
function checkAccess(token) {
  let result = "allowed";
  if (token.timesUsed >= token.maxUses) {
    result = "limit reached";
  }
  if (token.isPaused) {
    result = "paused";
  }
  if (token.revokedAt !== null) {
    result = "revoked";
  }
  return result;
}`,
};

export const mistakes = {
  /* Precedence, the first way. Revoking is permanent and pausing is not, so a
     revoked-and-paused token offering a Resume button is a token the user
     believes they can bring back. */
  "pause checked before revocation": {
    impl: `
function checkAccess(token) {
  if (token.isPaused === true) {
    return "paused";
  } else if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.timesUsed >= token.maxUses) {
    return "limit reached";
  } else {
    return "allowed";
  }
}`,
    expect: "revoked BEATS paused when both are true",
  },

  /* Precedence, the second way — and the one that passed this self-check
     until the seventh check was added. Correct for every token with one state
     and wrong for the combination. */
  "the limit checked before the pause": {
    impl: `
function checkAccess(token) {
  if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.timesUsed >= token.maxUses) {
    return "limit reached";
  } else if (token.isPaused === true) {
    return "paused";
  } else {
    return "allowed";
  }
}`,
    expect: "paused BEATS the limit when both are true",
  },

  /* Off by one, and it costs a use. `maxUses: 5` with `timesUsed: 5` means
     five uses have happened; > lets a sixth through. */
  "> instead of >= on the use limit": {
    impl: `
function checkAccess(token) {
  if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.isPaused === true) {
    return "paused";
  } else if (token.timesUsed > token.maxUses) {
    return "limit reached";
  } else {
    return "allowed";
  }
}`,
    expect: "a used-up token has reached its limit",
  },

  /* One `=` instead of three. The assignment succeeds, evaluates to true, and
     every token in the app is paused — including the one being paused as we
     ask. No error anywhere. */
  "assignment instead of comparison on isPaused": {
    impl: `
function checkAccess(token) {
  if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.isPaused = true) {
    return "paused";
  } else if (token.timesUsed >= token.maxUses) {
    return "limit reached";
  } else {
    return "allowed";
  }
}`,
    expect: "a fresh token is allowed",
  },

  /* !== undefined instead of !== null. `null` is a value that IS there, so
     every fresh token reads as revoked and nobody can contact anybody. */
  "revocation tested against undefined instead of null": {
    impl: `
function checkAccess(token) {
  if (token.revokedAt !== undefined) {
    return "revoked";
  } else if (token.isPaused === true) {
    return "paused";
  } else if (token.timesUsed >= token.maxUses) {
    return "limit reached";
  } else {
    return "allowed";
  }
}`,
    expect: "a fresh token is allowed",
  },

  /* No final else. Three branches return and the fourth path falls off the
     end, so an ordinary usable token comes back as undefined — which is
     falsy, so any caller written as `if (checkAccess(t))` denies it. */
  "the final else left off": {
    impl: `
function checkAccess(token) {
  if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.isPaused === true) {
    return "paused";
  } else if (token.timesUsed >= token.maxUses) {
    return "limit reached";
  }
}`,
    expect: "a fresh token is allowed",
  },

  /* The right decision, spelled differently. The four strings are a contract
     with whatever renders the badge, and "limit-reached" is a state that
     screen has never heard of. */
  "the limit state spelled with a hyphen": {
    impl: `
function checkAccess(token) {
  if (token.revokedAt !== null) {
    return "revoked";
  } else if (token.isPaused === true) {
    return "paused";
  } else if (token.timesUsed >= token.maxUses) {
    return "limit-reached";
  } else {
    return "allowed";
  }
}`,
    expect: "a used-up token has reached its limit",
  },
};
