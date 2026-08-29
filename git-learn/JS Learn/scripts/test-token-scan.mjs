/* test-token-scan.mjs — does the example-code scanner still catch anything?
 *
 * The scanner reported two warnings for weeks and both were noise by the end:
 * one deliberate fixture that wanted the documented file-level opt-out, and the
 * phrase "DENY-LIST", which is not a code and never will be. A list that cannot
 * reach zero stops being read — CLAUDE.md says so, and it is how this course
 * previously lost its fill-blank warning and its example-code check.
 *
 * So the two-group form was narrowed to require a digit. That narrowing is
 * exactly the move CLAUDE.md warns about elsewhere: "if the check ever starts
 * crying wolf, tighten it and ADD THE CASE TO THE SUITE — do not demote it to a
 * warning and walk away." This file is that suite, and it asserts both
 * directions, because a clean course and a blind checker look identical from
 * outside.
 *
 *   node scripts/test-token-scan.mjs
 */
import { badTokensIn, badAlphabetsIn, TOKEN_ALPHABET } from "./token-scan.mjs";

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? "  ok    " : "  FAIL  ") + label);
  if (!ok) console.log(`          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  ok ? pass++ : fail++;
}
const found = (text) => badTokensIn(text).map((f) => f.token);

console.log("\n1. the alphabet itself");

check("31 characters, and none of the five ambiguous ones",
  [TOKEN_ALPHABET.length, [..."0O1IL"].some((c) => TOKEN_ALPHABET.includes(c))],
  [31, false]);

console.log("\n2. bad codes are still caught");

/* The canonical example with its last character swapped for an excluded
   letter. CLAUDE.md calls this the useful one. */
check("an excluded O in the third group",
  found("redeem MERC-8GH2-KP4O now"), ["MERC-8GH2-KP4O"]);

/* The historical defect: this exact value spread to 36 files before anyone
   checked, because L is excluded and the code was unissuable. */
check("the L that made the old canonical code impossible",
  found("MERC-8GH2-LP4X"), ["MERC-8GH2-LP4X"]);

check("an excluded character anywhere in the string",
  found("MERC-8GH2-KPLX / MERC-I8G2-KP4X"), ["MERC-8GH2-KPLX", "MERC-I8G2-KP4X"]);

check("a two-group code with a digit and an excluded zero",
  found("MERC-8GH0"), ["MERC-8GH0"]);

check("several on one line are all reported",
  found("MERC-8GH2-KP4O and MERC-8GH2-KPLX"), ["MERC-8GH2-KP4O", "MERC-8GH2-KPLX"]);

console.log("\n3. good codes and ordinary prose are left alone");

check("the canonical code is fine",
  found("MERC-8GH2-KP4X"), []);

/* The family that produced the standing warning. Every one of these is four
   letters, a hyphen and four letters, and this course writes about all of
   them. */
for (const phrase of ["DENY-LIST", "READ-ONLY", "LEFT-JOIN", "FAIL-FAST", "SELF-HOST", "HTTP-ONLY", "OPEN-DATA"]) {
  check(`the phrase ${phrase} is prose, not a code`, found(phrase), []);
}

check("lower case is not a code either",
  found("deny-list and read-only"), []);

check("a lesson range is not a code",
  found("lessons 0001-0004 and 0005-0012"), []);

check("the named negative fixtures stay exempt",
  found("TEST-1234 NOPE-0000 IJKL-3333"), []);

console.log("\n4. the digit rule is a narrowing, not an escape hatch");

/* The whole risk of the change: it must not become a way to write a bad code
   that the scanner ignores. Three groups is the token shape and stays
   unconditional whether or not a digit appears. */
check("three all-letter groups are still checked",
  found("MERC-ABCL-KPQX"), ["MERC-ABCL-KPQX"]);

check("three all-letter groups that are valid stay quiet",
  found("MERC-ABCD-KPQX"), []);

console.log("\n5. the line-level marker claims its own line and no other");

const marked = [
  'const a = "MERC-8GH2-KP4O";  // audit-allow-token-here: being invalid IS the fixture',
  'const b = "MERC-8GH2-KPLX";'
].join("\n");
check("the marked line is exempt and the next one is not",
  found(marked), ["MERC-8GH2-KPLX"]);

const markedAbove = [
  "// audit-allow-token-here: this comment is on its own line",
  'const c = "MERC-8GH2-KP4O";'
].join("\n");
check("a marker on the line ABOVE claims nothing",
  found(markedAbove), ["MERC-8GH2-KP4O"]);

console.log("\n6. line numbers are 1-based and point at the offender");

check("the reported line is where the code actually sits",
  badTokensIn(["first", "second", 'third MERC-8GH2-KP4O'].join("\n")),
  [{ token: "MERC-8GH2-KP4O", line: 3 }]);

/* ------------------------------------------------------------------ *
 * The alphabet check. It is an ERROR in the audit rather than a warning, so a
 * blind one is worse than a blind warning: it is the check standing between
 * this project and a code generator that emits codes its own validator
 * rejects, which is a thing that has actually happened here.
 * ------------------------------------------------------------------ */

const alphabets = (text) => badAlphabetsIn(text).map((f) => `${f.literal}:${f.reason}`);

console.log("\n7. the canonical alphabet is accepted, however it is quoted");

for (const q of ["'", '"', "`"]) {
  check(`quoted with ${q}`, alphabets(`const A = ${q}${TOKEN_ALPHABET}${q};`), []);
}

console.log("\n8. a wrong alphabet is caught");

/* THE historical defect: taught in three lessons, including b7/0001 — the
   server that actually generates codes — and commented "no 0/O/1/I/L" while
   containing L. */
check("the L that three lessons shipped",
  alphabets(`const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";`),
  ["ABCDEFGHJKLMNPQRSTUVWXYZ23456789:excluded_characters"]);

check("every excluded character is named, not just the first",
  badAlphabetsIn(`const A = "0O1IL23456789ABCDEFGHJKMNPQRSTUVWXYZ";`)[0].excluded,
  ["0", "O", "1", "I", "L"]);

check("a short alphabet is wrong even with no excluded characters",
  alphabets(`const A = "23456789ABCDEFGHJKMNPQRSTUVWXY";`),
  ["23456789ABCDEFGHJKMNPQRSTUVWXY:wrong_length"]);

/* The right characters in the wrong order. This used to report "is 31
   characters, not 31" — a true error with a nonsense explanation, which is how
   a real finding gets dismissed as a bug in the checker. */
check("the right characters in the wrong order are still wrong",
  alphabets(`const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";`),
  ["ABCDEFGHJKMNPQRSTUVWXYZ23456789:reordered"]);

console.log("\n9. the four suppressions silence noise and not signal");

/* Each of these exists because something legitimate was being flagged. Each is
   also a chance to have switched the check off, which is what these assert
   did not happen. */
check("plain English A-Z is not an alphabet — it has no digits",
  alphabets(`maxLength: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"`), []);

check("...but the same letters WITH digits are judged",
  alphabets(`const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";`),
  ["ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:excluded_characters"]);

check("a hex digest shares too little with the alphabet to be one",
  alphabets(`const h = "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08";`),
  []);

check("a short run is not long enough to be an alphabet",
  alphabets(`const s = "ABC123";`), []);

console.log("\n10. every literal is reported, and each one once");

check("two different wrong alphabets in one file are both reported",
  alphabets(`const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";\nconst b = "23456789ABCDEFGHJKMNPQRSTUVWXY";`),
  ["ABCDEFGHJKLMNPQRSTUVWXYZ23456789:excluded_characters",
   "23456789ABCDEFGHJKMNPQRSTUVWXY:wrong_length"]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
