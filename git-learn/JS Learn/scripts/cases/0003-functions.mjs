/**
 * Wrong-answer cases for 01/0003 — issueToken and describeToken.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0003-functions.html \
 *        --wrong scripts/cases/0003-functions.mjs
 *
 * Two functions, and the pair is chosen so that one produces a value the other
 * consumes — which is what makes a missing `return` visible here. In 0001 and
 * 0002 the student's work is a set of variables and the self-check can read
 * them; here it can only see what comes back out.
 *
 * The fixture values do work, and it is worth saying why they were not
 * simplified. `describeToken` is checked against two different tokens with
 * different holders, so a function that ignores its argument and hard-codes
 * Sara's Bakery fails on the second. And the revoked fixture is built by
 * mutating a token that `issueToken` returned, rather than by a literal — so a
 * `describeToken` that only handles objects of its own making has nowhere to
 * hide.
 */

export const alternatives = {
  "arrow functions with shorthand properties": `
const issueToken = (code, issuedTo) => ({ code, issuedTo, revokedAt: null });

const describeToken = (token) =>
  token.code + " issued to " + token.issuedTo +
  (token.revokedAt !== null ? " (revoked)" : " (active)");`,

  "template literals and a ternary": `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  const state = token.revokedAt === null ? "active" : "revoked";
  return \`\${token.code} issued to \${token.issuedTo} (\${state})\`;
}`,

  "the object built in a variable before it is returned": `
function issueToken(code, issuedTo) {
  const token = {};
  token.code = code;
  token.issuedTo = issuedTo;
  token.revokedAt = null;
  return token;
}

function describeToken(token) {
  let text = token.code + " issued to " + token.issuedTo;
  if (token.revokedAt === null) {
    text = text + " (active)";
  } else {
    text = text + " (revoked)";
  }
  return text;
}`,

  "the revoked case handled first, with an early return": `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  if (token.revokedAt !== null) {
    return token.code + " issued to " + token.issuedTo + " (revoked)";
  }
  return token.code + " issued to " + token.issuedTo + " (active)";
}`,
};

export const mistakes = {
  /* The mistake this lesson exists for. The object is built correctly and
     thrown away; the function returns undefined and says nothing about it.
     Note it trips two checks — the first FAIL is the one named, and the
     TypeError after it is the self-check's own catch reporting that it cannot
     read `.code` of undefined. */
  "issueToken builds the object but never returns it": {
    impl: `
function issueToken(code, issuedTo) {
  const token = { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  if (token.revokedAt !== null) {
    return token.code + " issued to " + token.issuedTo + " (revoked)";
  }
  return token.code + " issued to " + token.issuedTo + " (active)";
}`,
    expect: "issueToken returns an object",
  },

  /* The parameters used in the wrong order inside the object. Both values are
     present, both are strings, and the sentence still reads like a sentence:
     "Sara's Bakery issued to MERC-8GH2-KP4X (active)". */
  "issueToken swaps code and issuedTo": {
    impl: `
function issueToken(code, issuedTo) {
  return { code: issuedTo, issuedTo: code, revokedAt: null };
}

function describeToken(token) {
  if (token.revokedAt !== null) {
    return token.code + " issued to " + token.issuedTo + " (revoked)";
  }
  return token.code + " issued to " + token.issuedTo + " (active)";
}`,
    expect: "...with the right code",
  },

  /* undefined instead of null, met again. In 0002 it was a property left out;
     here it is written deliberately, which is the more confident version of
     the same misunderstanding. */
  "revokedAt initialised to undefined instead of null": {
    impl: `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: undefined };
}

function describeToken(token) {
  if (token.revokedAt !== undefined) {
    return token.code + " issued to " + token.issuedTo + " (revoked)";
  }
  return token.code + " issued to " + token.issuedTo + " (active)";
}`,
    expect: "...with revokedAt set to null",
  },

  /* The comparison inverted. Every token reads as the opposite of what it is,
     and the dangerous direction is the one the check names second: a revoked
     token described as active. */
  "describeToken tests === null instead of !== null": {
    impl: `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  if (token.revokedAt === null) {
    return token.code + " issued to " + token.issuedTo + " (revoked)";
  }
  return token.code + " issued to " + token.issuedTo + " (active)";
}`,
    expect: "describeToken on an active token",
  },

  /* A misspelt property is not an error in JavaScript — `token.revoked` is
     undefined, undefined is not null, so this reports every token as revoked.
     Reading a property that isn't there gives you a value, not a warning. */
  "describeToken reads token.revoked, a property that does not exist": {
    impl: `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  if (token.revoked !== null) {
    return token.code + " issued to " + token.issuedTo + " (revoked)";
  }
  return token.code + " issued to " + token.issuedTo + " (active)";
}`,
    expect: "describeToken on an active token",
  },

  /* Logging instead of returning — the other half of the missing-return
     lesson, and the one that looks like it works, because running it prints
     exactly the right text. */
  "describeToken logs the sentence instead of returning it": {
    impl: `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  const state = token.revokedAt === null ? "active" : "revoked";
  console.log(token.code + " issued to " + token.issuedTo + " (" + state + ")");
}`,
    expect: "describeToken on an active token",
  },

  /* The holder hard-coded from the first example the student tested with. It
     passes for Sara's Bakery and fails for City Gas — which is why the
     self-check uses two different holders rather than the same one twice. */
  "describeToken hard-codes the holder it was written against": {
    impl: `
function issueToken(code, issuedTo) {
  return { code: code, issuedTo: issuedTo, revokedAt: null };
}

function describeToken(token) {
  const state = token.revokedAt === null ? "active" : "revoked";
  return token.code + " issued to Sara's Bakery (" + state + ")";
}`,
    expect: "describeToken on a revoked token",
  },
};
