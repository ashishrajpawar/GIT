/* Wrong-answer cases for 01/0011-modern-javascript-es6.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0011-modern-javascript-es6.html \
 *        --wrong scripts/cases/0011-modern-javascript-es6.mjs
 *
 * `alternatives` are other correct styles — all must PASS. Optional chaining is
 * the modern way, not the only way, so the pre-ES6 && guards have to pass too.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The two mistakes that matter both use || where ?? was needed. Every check
 * except two passes with ||, which is exactly why the bug survives review.
 */

export const alternatives = {
  "optional chaining throughout": `function describeToken(token) {
  return {
    code: token?.code ?? "(no code)",
    label: token?.issuedTo ?? "(unlabelled)",
    maxUses: token?.rule?.maxUses ?? "unlimited",
    expiresOn: token?.rule?.expiresOn ?? "never",
    status: token?.revoked ? "revoked" : "active"
  };
}`,

  "pre-ES6 && guards, no optional chaining at all": `function describeToken(token) {
  var rule = (token && token.rule) ? token.rule : {};
  var code = (token && token.code !== undefined && token.code !== null)
    ? token.code : "(no code)";
  var label = (token && token.issuedTo !== undefined && token.issuedTo !== null)
    ? token.issuedTo : "(unlabelled)";
  var maxUses = (rule.maxUses !== undefined && rule.maxUses !== null)
    ? rule.maxUses : "unlimited";
  var expiresOn = (rule.expiresOn !== undefined && rule.expiresOn !== null)
    ? rule.expiresOn : "never";
  return {
    code: code,
    label: label,
    maxUses: maxUses,
    expiresOn: expiresOn,
    status: (token && token.revoked) ? "revoked" : "active"
  };
}`,

  "explicit if statements building the result up": `function describeToken(token) {
  const out = {
    code: "(no code)",
    label: "(unlabelled)",
    maxUses: "unlimited",
    expiresOn: "never",
    status: "active"
  };
  if (token === null || token === undefined) return out;
  if (token.code !== null && token.code !== undefined) out.code = token.code;
  if (token.issuedTo !== null && token.issuedTo !== undefined) {
    out.label = token.issuedTo;
  }
  if (token.revoked) out.status = "revoked";
  const rule = token.rule;
  if (rule !== null && rule !== undefined) {
    if (rule.maxUses !== null && rule.maxUses !== undefined) {
      out.maxUses = rule.maxUses;
    }
    if (rule.expiresOn !== null && rule.expiresOn !== undefined) {
      out.expiresOn = rule.expiresOn;
    }
  }
  return out;
}`,

  "destructures with defaults from a guarded rule": `const describeToken = (token) => {
  const { code, issuedTo, revoked, rule } = token ?? {};
  const { maxUses, expiresOn } = rule ?? {};
  return {
    code: code ?? "(no code)",
    label: issuedTo ?? "(unlabelled)",
    maxUses: maxUses ?? "unlimited",
    expiresOn: expiresOn ?? "never",
    status: revoked ? "revoked" : "active"
  };
}`
};

export const mistakes = {
  // The lesson's whole point. Passes 8 of 10 checks.
  "uses || for maxUses, so a real limit of 0 becomes unlimited": {
    impl: `function describeToken(token) {
  return {
    code: token?.code ?? "(no code)",
    label: token?.issuedTo ?? "(unlabelled)",
    maxUses: token?.rule?.maxUses || "unlimited",
    expiresOn: token?.rule?.expiresOn ?? "never",
    status: token?.revoked ? "revoked" : "active"
  };
}`,
    expect: "maxUses of 0 stays 0 - it is a real rule, not a missing one"
  },

  "uses || for the label, so an empty label becomes a placeholder": {
    impl: `function describeToken(token) {
  return {
    code: token?.code ?? "(no code)",
    label: token?.issuedTo || "(unlabelled)",
    maxUses: token?.rule?.maxUses ?? "unlimited",
    expiresOn: token?.rule?.expiresOn ?? "never",
    status: token?.revoked ? "revoked" : "active"
  };
}`,
    expect: "an empty label stays empty - it is a value, not an absence"
  },

  "|| everywhere - the version that looks tidy and is wrong twice": {
    impl: `function describeToken(token) {
  return {
    code: token?.code || "(no code)",
    label: token?.issuedTo || "(unlabelled)",
    maxUses: token?.rule?.maxUses || "unlimited",
    expiresOn: token?.rule?.expiresOn || "never",
    status: token?.revoked ? "revoked" : "active"
  };
}`,
    expect: "maxUses of 0 stays 0 - it is a real rule, not a missing one"
  },

  // Guards the nested level but not the token itself.
  "forgets to guard the token, so undefined throws": {
    impl: `function describeToken(token) {
  return {
    code: token.code ?? "(no code)",
    label: token.issuedTo ?? "(unlabelled)",
    maxUses: token.rule?.maxUses ?? "unlimited",
    expiresOn: token.rule?.expiresOn ?? "never",
    status: token.revoked ? "revoked" : "active"
  };
}`,
    expect: "undefined does not throw"
  },

  "guards the token but not the rule": {
    impl: `function describeToken(token) {
  return {
    code: token?.code ?? "(no code)",
    label: token?.issuedTo ?? "(unlabelled)",
    maxUses: token?.rule.maxUses ?? "unlimited",
    expiresOn: token?.rule.expiresOn ?? "never",
    status: token?.revoked ? "revoked" : "active"
  };
}`,
    expect: "a token with no rule falls back on both rule fields"
  },

  "returns the token itself instead of a described view": {
    impl: `function describeToken(token) {
  return token ?? {};
}`,
    expect: "a complete token comes through unchanged"
  },

  "status inverted": {
    impl: `function describeToken(token) {
  return {
    code: token?.code ?? "(no code)",
    label: token?.issuedTo ?? "(unlabelled)",
    maxUses: token?.rule?.maxUses ?? "unlimited",
    expiresOn: token?.rule?.expiresOn ?? "never",
    status: token?.revoked ? "active" : "revoked"
  };
}`,
    expect: "a complete token comes through unchanged"
  },

  "forgets to return": {
    impl: `function describeToken(token) {
  const out = {
    code: token?.code ?? "(no code)",
    label: token?.issuedTo ?? "(unlabelled)",
    maxUses: token?.rule?.maxUses ?? "unlimited",
    expiresOn: token?.rule?.expiresOn ?? "never",
    status: token?.revoked ? "revoked" : "active"
  };
}`,
    expect: "a complete token comes through unchanged"
  }
};
