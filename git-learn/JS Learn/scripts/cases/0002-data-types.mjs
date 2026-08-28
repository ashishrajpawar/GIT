/**
 * Wrong-answer cases for 01/0002 — the token object with six types in it.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0002-data-types.html \
 *        --wrong scripts/cases/0002-data-types.mjs
 *
 * The self-check here is unusually good already, and the reason is worth
 * naming: three of its seven checks test `typeof` as well as the value, so
 * `"3"` and `3` are distinguishable, and `null` and `undefined` are too. That
 * is the entire subject of the lesson, and a check written as plain `===`
 * against the value would have caught two of those four cases by luck and
 * called it a pass.
 *
 * WHAT IT CANNOT SEE: `tags: ["delivery", "orders", "urgent"]` written out in
 * one go, never pushed. Step 2 of the exercise asks for the push; the object
 * that results is identical, so no check can tell. Left uncovered on purpose —
 * scanning the source for the characters `.push(` would test resemblance.
 * Same for `summary` built with `+` instead of a template literal: the string
 * is the string. The check tests what the student produced, not how, and that
 * is the right trade even though it costs these two.
 */

export const alternatives = {
  "properties assigned one at a time after the object exists": `
const token = {};
token.code = "MERC-8GH2-KP4X";
token.issuedTo = "Sara's Bakery";
token.timesUsed = 3;
token.isActive = true;
token.revokedAt = null;
token.tags = ["delivery", "orders"];

token.tags.push("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;
console.log(summary);`,

  "tags replaced with concat instead of pushed": `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: true,
  revokedAt: null,
  tags: ["delivery", "orders"]
};

token.tags = token.tags.concat("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;
console.log(summary);`,

  "quoted keys, different property order": `
const token = {
  "tags": ["delivery", "orders"],
  "revokedAt": null,
  "isActive": true,
  "timesUsed": 3,
  "issuedTo": "Sara's Bakery",
  "code": "MERC-8GH2-KP4X"
};

token.tags.push("urgent");

const tagCount = token.tags.length;
const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${tagCount} tags\`;
console.log(summary);`,

  "the count pulled out into its own variable first": `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: true,
  revokedAt: null,
  tags: ["delivery", "orders"]
};

token.tags.push("urgent");

const uses = token.timesUsed;
const tags = token.tags.length;
const summary = \`\${token.code} (\${token.issuedTo}) - \${uses} uses, \${tags} tags\`;
console.log(summary);`,
};

export const mistakes = {
  /* The lesson's whole reason for existing. `"3"` prints as 3, renders as 3,
     and reaches the API as a string that fails validation three screens
     later. */
  "timesUsed quoted as a string": {
    impl: `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: "3",
  isActive: true,
  revokedAt: null,
  tags: ["delivery", "orders"]
};

token.tags.push("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;`,
    expect: "token.timesUsed is the number 3",
  },

  /* And the same mistake with a boolean, where it is worse: every non-empty
     string is truthy, so `if (token.isActive)` is true for "false" too. */
  "isActive quoted as a string": {
    impl: `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: "true",
  revokedAt: null,
  tags: ["delivery", "orders"]
};

token.tags.push("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;`,
    expect: "token.isActive is the boolean true",
  },

  /* null vs undefined — "empty on purpose" against "never set". The whole
     product turns on this one: `revoked_at IS NULL` is what says a token is
     still live. */
  "revokedAt left out of the object entirely": {
    impl: `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: true,
  tags: ["delivery", "orders"]
};

token.tags.push("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;`,
    expect: "token.revokedAt is null, not undefined",
  },

  /* Pushing onto a copy. The line runs, nothing throws, and the array the
     object holds is untouched — the classic first encounter with the
     difference between a value and a reference to one. */
  "third tag pushed onto a copy of the array": {
    impl: `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: true,
  revokedAt: null,
  tags: ["delivery", "orders"]
};

const tags = [...token.tags];
tags.push("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;`,
    expect: "token.tags is an array of 3, ending with 'urgent'",
  },

  /* Order of operations. Both lines are individually right; the summary is
     built one line too early and reports two tags. This is the one mistake
     here whose printed output looks entirely plausible. */
  "summary built before the third tag is pushed": {
    impl: `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: true,
  revokedAt: null,
  tags: ["delivery", "orders"]
};

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags.length} tags\`;

token.tags.push("urgent");`,
    expect: "summary reads exactly right",
  },

  /* The array interpolated instead of its length. `${token.tags}` is not an
     error — it stringifies to "delivery,orders,urgent". */
  "summary interpolates the tags array instead of its length": {
    impl: `
const token = {
  code: "MERC-8GH2-KP4X",
  issuedTo: "Sara's Bakery",
  timesUsed: 3,
  isActive: true,
  revokedAt: null,
  tags: ["delivery", "orders"]
};

token.tags.push("urgent");

const summary = \`\${token.code} (\${token.issuedTo}) - \${token.timesUsed} uses, \${token.tags} tags\`;`,
    expect: "summary reads exactly right",
  },
};
