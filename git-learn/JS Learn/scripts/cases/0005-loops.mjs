/**
 * Wrong-answer cases for 01/0005 — summariseTokens.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0005-loops.html \
 *        --wrong scripts/cases/0005-loops.mjs
 *
 * The first exercise in the course that accumulates: an answer built up across
 * a loop rather than computed in one expression. Every mistake below is a way
 * of getting the accumulation wrong, and the two that matter most are the ones
 * where the counts are right and the ARRAY is wrong — because `activeCodes` is
 * a list of live token codes, and a revoked token appearing in it is the whole
 * product failing quietly.
 *
 * The lesson's self-check is already careful in two ways worth preserving if
 * it is ever edited:
 *
 *   - the mixed-list fixture uses FOUR tokens with two active ones that are
 *     not adjacent, so an implementation that keeps only the last active code,
 *     or reverses the array, is distinguishable from one that is right;
 *   - the last check asserts active + revoked + paused === total, which is the
 *     one check that catches a token counted twice. Every other check looks at
 *     a single number and a double-count of one state can hide behind a
 *     missing count of another.
 */

export const alternatives = {
  "an index loop instead of for...of": `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  }
  return summary;
}`,

  "forEach, with total taken from the length": `
function summariseTokens(tokens) {
  const summary = { total: tokens.length, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  tokens.forEach(function (token) {
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  });
  return summary;
}`,

  "filter and map, no explicit loop at all": `
function summariseTokens(tokens) {
  const revoked = tokens.filter((t) => t.revokedAt !== null);
  const paused = tokens.filter((t) => t.revokedAt === null && t.isPaused);
  const active = tokens.filter((t) => t.revokedAt === null && !t.isPaused);
  return {
    total: tokens.length,
    active: active.length,
    revoked: revoked.length,
    paused: paused.length,
    activeCodes: active.map((t) => t.code)
  };
}`,

  "a helper that names the state, then one switch on it": `
function stateOf(token) {
  if (token.revokedAt !== null) return "revoked";
  if (token.isPaused) return "paused";
  return "active";
}

function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    summary.total++;
    const state = stateOf(token);
    summary[state]++;
    if (state === "active") summary.activeCodes.push(token.code);
  }
  return summary;
}`,
};

export const mistakes = {
  /* Precedence again, one lesson on from 0004 and now inside a loop. A revoked
     token counted as paused is a token the list shows as resumable. */
  "isPaused checked before revokedAt": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    summary.total++;
    if (token.isPaused) {
      summary.paused++;
    } else if (token.revokedAt !== null) {
      summary.revoked++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  }
  return summary;
}`,
    expect: "revoked BEATS paused when both are true",
  },

  /* The push moved out of the branch. Counts are all correct — this is the
     mistake that is invisible in every number the function returns, and puts
     a revoked code on a list of live ones. */
  "the code pushed for every token, not just the active ones": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
    }
    summary.activeCodes.push(token.code);
  }
  return summary;
}`,
    expect: "a revoked token contributes NO code",
  },

  /* else-if collapsed into two separate ifs. A revoked token is counted as
     revoked AND, because isPaused is false, as active — so it appears in
     activeCodes too. Two bugs from one missing keyword. */
  "separate ifs instead of else if, so a revoked token is counted twice": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    }
    if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  }
  return summary;
}`,
    expect: "a revoked token counts as revoked",
  },

  /* The accumulator declared once, outside the function — the same shape as
     the shared-counter mistake in 0006's closure exercise, met here first.
     Every call adds to the previous one's answer, and calling it once looks
     perfect. */
  "the summary object declared outside the function": {
    impl: `
const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };

function summariseTokens(tokens) {
  for (const token of tokens) {
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  }
  return summary;
}`,
    expect: "a revoked token counts as revoked",
  },

  /* activeCodes never initialised. The empty list returns undefined for it
     rather than [], which is the distinction the second check exists for:
     "no active tokens" and "I never built the list" are different answers,
     and only one of them can be safely looped over by the caller. */
  "activeCodes left out of the starting object": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0 };
  for (const token of tokens) {
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes = (summary.activeCodes || []).concat(token.code);
    }
  }
  return summary;
}`,
    expect: "an empty list has no active codes",
  },

  /* The whole token pushed instead of its code string. JSON.stringify of the
     result still looks like a list of tokens, which is why the check compares
     element by element rather than eyeballing the shape. */
  "the token object pushed instead of token.code": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token);
    }
  }
  return summary;
}`,
    expect: "an active token contributes its code",
  },

  /* total never incremented. Every state count is right and they sum to more
     than the total, which is the check that catches it. */
  "total never counted": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  }
  return summary;
}`,
    expect: "a fresh token counts as active",
  },

  /* Loops over the array and returns nothing. The self-check's own try/catch
     reports it, and the message it prints is the one a beginner needs. */
  "the summary built but never returned": {
    impl: `
function summariseTokens(tokens) {
  const summary = { total: 0, active: 0, revoked: 0, paused: 0, activeCodes: [] };
  for (const token of tokens) {
    summary.total++;
    if (token.revokedAt !== null) {
      summary.revoked++;
    } else if (token.isPaused) {
      summary.paused++;
    } else {
      summary.active++;
      summary.activeCodes.push(token.code);
    }
  }
}`,
    expect: "Cannot read properties of undefined",
  },
};
