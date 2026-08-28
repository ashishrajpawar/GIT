/**
 * Wrong-answer cases for 01/0001 — the three variables and the sentence.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0001-what-is-javascript.html \
 *        --wrong scripts/cases/0001-what-is-javascript.mjs
 *
 * This is the first exercise in the course and the self-check is four lines,
 * which is exactly why it needs wrong-cases: a check this small is the easiest
 * kind to pass by accident. Three of the four checks are equality against a
 * literal, and the fourth — "was this a const?" — is the only one testing
 * anything a beginner gets wrong on purpose rather than by typo.
 *
 * `alternatives` are genuinely correct in a different style; all must pass, or
 * the check is testing resemblance. `mistakes` must each fail, and `expect`
 * names the check it should trip.
 *
 * WHAT THIS SELF-CHECK CANNOT SEE, and no rewrite of it could:
 *
 *   const timesUsed = 3;   // never started at 0, never changed
 *
 * passes every check, because the exercise's step 3 ("start at 0") and step 4
 * ("change it to 3") describe a history, and only the end state survives into
 * the check. It is left uncovered deliberately rather than papered over with a
 * source-text scan — grepping the student's code for the characters `let` and
 * `= 0` would test resemblance, which is the thing these files exist to stop.
 * The `const`/`let` check earns its place because it tests behaviour: it tries
 * the reassignment and sees whether the language refuses.
 */

export const alternatives = {
  "template literal instead of + concatenation": `
const tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

timesUsed = 3;

console.log(\`Token \${tokenCode} issued to \${issuedTo} was used \${timesUsed} times\`);`,

  "counted up to 3 instead of assigning it": `
const tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

timesUsed = timesUsed + 1;
timesUsed += 2;

console.log("Token " + tokenCode + " issued to " + issuedTo + " was used " + timesUsed + " times");`,

  "single quotes with an escaped apostrophe, different sentence": `
const tokenCode = 'MERC-8GH2-KP4X';
const issuedTo = 'Sara\\'s Bakery';
let timesUsed = 0;

timesUsed = 3;

console.log(issuedTo + ' used ' + tokenCode + ' ' + timesUsed + ' times');`,

  "declared in a different order": `
let timesUsed = 0;
const issuedTo = "Sara's Bakery";
const tokenCode = "MERC-8GH2-KP4X";

timesUsed = 3;

console.log("Token " + tokenCode + " issued to " + issuedTo + " was used " + timesUsed + " times");`,
};

export const mistakes = {
  /* Rule 1 of the exercise. A token code that can be reassigned is the bug the
     lesson is about, and it is invisible in the output — every console.log
     prints the same sentence either way. */
  "tokenCode declared with let instead of const": {
    impl: `
let tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

timesUsed = 3;

console.log("Token " + tokenCode + " issued to " + issuedTo + " was used " + timesUsed + " times");`,
    expect: "tokenCode was declared with const, not let",
  },

  /* The mirror image, and the one the second hint warns about by name. This
     one does not reach the self-check at all: assigning to a const throws
     where it is written, above the marker, so the whole script dies. */
  "timesUsed declared with const, then changed": {
    impl: `
const tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
const timesUsed = 0;

timesUsed = 3;`,
    expect: "Assignment to constant variable",
  },

  /* Also from hint 2: writing the keyword again the second time. A SyntaxError,
     so nothing runs — including the parts that were right. */
  "re-declared timesUsed with let a second time": {
    impl: `
const tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

let timesUsed = 3;`,
    expect: "already been declared",
  },

  "timesUsed left at 0 — declared but never changed": {
    impl: `
const tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

console.log("Token " + tokenCode + " issued to " + issuedTo + " was used " + timesUsed + " times");`,
    expect: "timesUsed was changed to 3",
  },

  /* Quoting a number is the mistake 0002 is entirely about, met early. The
     sentence it prints is indistinguishable from the correct one. */
  "timesUsed set to the string \"3\"": {
    impl: `
const tokenCode = "MERC-8GH2-KP4X";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

timesUsed = "3";

console.log("Token " + tokenCode + " issued to " + issuedTo + " was used " + timesUsed + " times");`,
    expect: "timesUsed was changed to 3",
  },

  /* An excluded character in the code — `L` for `4`. It looks like a token and
     the product could never generate it. */
  "token code mistyped with an excluded letter": {
    impl: `
const tokenCode = "MERC-8GH2-KPLX";
const issuedTo = "Sara's Bakery";
let timesUsed = 0;

timesUsed = 3;

console.log("Token " + tokenCode + " issued to " + issuedTo + " was used " + timesUsed + " times");`,
    expect: "tokenCode holds the right value",
  },

  /* The variable never declared at all. Worth a case because the failure is a
     ReferenceError from inside the self-check's try, and the friendly message
     under it ("usually a variable is missing or misspelt") is the first error
     text this course ever shows a student. If that path breaks, nobody finds
     out from a passing solution. */
  "issuedTo never declared": {
    impl: `
const tokenCode = "MERC-8GH2-KP4X";
let timesUsed = 0;

timesUsed = 3;

console.log("Token " + tokenCode + " was used " + timesUsed + " times");`,
    expect: "issuedTo is not defined",
  },
};
