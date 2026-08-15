/* Wrong-answer cases for 01/0010-arrays-and-objects.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0010-arrays-and-objects.html \
 *        --wrong scripts/cases/0010-arrays-and-objects.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistakes here are the point of the lesson. Every one of them produces a
 * result array that is correct when you print it — the bug is only visible in
 * what happened to the ORIGINAL, which is why the self-check snapshots it.
 */

export const alternatives = {
  "map with a ternary": `function revokeToken(tokens, code) {
  return tokens.map((t) => (t.code === code ? { ...t, revoked: true } : t));
}`,

  "map with an if and an explicit new object": `function revokeToken(tokens, code) {
  return tokens.map(function (token) {
    if (token.code === code) {
      return {
        code: token.code,
        issuedTo: token.issuedTo,
        uses: token.uses,
        revoked: true
      };
    }
    return token;
  });
}`,

  "Object.assign instead of spread": `function revokeToken(tokens, code) {
  return tokens.map(function (token) {
    if (token.code !== code) return token;
    return Object.assign({}, token, { revoked: true });
  });
}`,

  "builds the array with a loop, but never touches the original": `function revokeToken(tokens, code) {
  const out = [];
  for (const token of tokens) {
    if (token.code === code) {
      out.push({ ...token, revoked: true });
    } else {
      out.push(token);
    }
  }
  return out;
}`
};

export const mistakes = {
  // The classic. find returns the real object, so assigning to it edits the
  // array you were given - and returning `tokens` returns that same array.
  "find and assign, then return the same array": {
    impl: `function revokeToken(tokens, code) {
  const token = tokens.find(function (t) { return t.code === code; });
  if (token) token.revoked = true;
  return tokens;
}`,
    expect: "the returned array is NOT the one passed in"
  },

  // A new array, but the object inside it is the original, mutated.
  "spreads the array but mutates the object inside it": {
    impl: `function revokeToken(tokens, code) {
  const copy = [...tokens];
  const token = copy.find(function (t) { return t.code === code; });
  if (token) token.revoked = true;
  return copy;
}`,
    expect: "the original token OBJECT was not modified"
  },

  "forEach with assignment": {
    impl: `function revokeToken(tokens, code) {
  tokens.forEach(function (t) {
    if (t.code === code) t.revoked = true;
  });
  return [...tokens];
}`,
    expect: "the original token OBJECT was not modified"
  },

  "rebuilds every token, losing object identity for unchanged rows": {
    impl: `function revokeToken(tokens, code) {
  return tokens.map(function (token) {
    return { ...token, revoked: token.revoked || token.code === code };
  });
}`,
    expect: "untouched tokens are reused, not rebuilt"
  },

  "revokes every token": {
    impl: `function revokeToken(tokens, code) {
  return tokens.map(function (token) {
    return { ...token, revoked: true };
  });
}`,
    expect: "the other tokens are not revoked"
  },

  "filters the token out instead of revoking it": {
    impl: `function revokeToken(tokens, code) {
  return tokens.filter(function (token) { return token.code !== code; });
}`,
    expect: "it has the same number of tokens"
  },

  "spread order wrong, so revoked is overwritten by the old value": {
    impl: `function revokeToken(tokens, code) {
  return tokens.map(function (token) {
    if (token.code !== code) return token;
    return { revoked: true, ...token };
  });
}`,
    expect: "the matching token is revoked in the result"
  },

  "forgets to return anything": {
    impl: `function revokeToken(tokens, code) {
  tokens.map(function (token) {
    return token.code === code ? { ...token, revoked: true } : token;
  });
}`,
    expect: "it returns an array"
  }
};
