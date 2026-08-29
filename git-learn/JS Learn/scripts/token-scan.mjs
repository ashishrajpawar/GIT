/* The example-code scanner, extracted from audit.mjs on 2026-08-29 so that it
   can be tested in both directions.

   It had been inline, untested, and warning about the phrase "DENY-LIST" —
   which is not a code, never will be one, and is one of a whole family:
   READ-ONLY, LEFT-JOIN, FAIL-FAST, SELF-HOST are all four letters, a hyphen and
   four letters, and this course writes about every one of them. A permanent
   warning is the thing CLAUDE.md says trains everyone to ignore the list, so it
   is not enough to reword one sentence and move on.

   The narrowing, and it is narrow on purpose: in the TWO-group form a match now
   has to contain a digit. Three groups of four is the token shape itself and
   stays unconditional.

   Why a digit is the right discriminator rather than a word list: every example
   code in this course carries one — the canonical MERC-8GH2-KP4X, and every
   deliberate fixture named in CLAUDE.md (TEST-1234, NOPE-0000, IJKL-3333). An
   all-letters pair in capitals is English. If a bad code ever does turn up in
   that shape it is two groups long, which is not a length the product can
   issue, so the alphabet check — an error, and never opt-outable — is the one
   that matters and is unaffected.

   Both directions are asserted in test-token-scan.mjs. A clean course and a
   blind checker look identical from outside. */

export const TOKEN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/* Four-then-four, optionally then-four. */
const SHAPE = /\b([A-Z0-9]{4}-[A-Z0-9]{4}(?:-[A-Z0-9]{4})?)\b/g;

/* Deliberate negative fixtures named in CLAUDE.md, plus a few protocol words
   that happen to land in the shape. Being invalid is their whole job. */
const FIXTURE_PREFIX = /^(TEST|NOPE|OLD1|NEW1|ABCD|IJKL|AAAA|EFGH|ZZZZ|DTLS|HMAC|XXXX)/;

/**
 * Every token-shaped string in `text` that uses a character the product cannot
 * issue, excluding the ones a line-level marker claims.
 *
 * Returns `[{ token, line }]`, line being 1-based, in the order found.
 */
export function badTokensIn(text) {
  const lines = text.split("\n");
  const lineOf = (index) => text.slice(0, index).split("\n").length;
  const found = [];

  for (const m of text.matchAll(SHAPE)) {
    const token = m[1];
    const groups = token.split("-");

    /* A file that must keep being scanned, marking the one line that has a
       legitimate reason to name a bad code. */
    if ((lines[lineOf(m.index) - 1] || "").includes("audit-allow-token-here")) continue;

    /* "0001-0004" is a lesson range, not a token. Every real example code in
       this course carries a letter label in the first group. */
    if (/^\d{4}-/.test(token)) continue;

    if (FIXTURE_PREFIX.test(token)) continue;

    /* The narrowing. Two groups with no digit anywhere is a hyphenated English
       compound in capitals, not a code. */
    if (groups.length === 2 && !/[0-9]/.test(token)) continue;

    const bad = [...token.replace(/-/g, "")].filter((c) => !TOKEN_ALPHABET.includes(c));
    if (!bad.length) continue;

    found.push({ token: token, line: lineOf(m.index) });
  }

  return found;
}
