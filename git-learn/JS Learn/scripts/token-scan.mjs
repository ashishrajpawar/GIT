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

/* ------------------------------------------------------------------ *
 * The alphabet check.
 *
 * The one above catches a bad *code*. This catches a bad *alphabet*, and that
 * one is worse by a different order: a wrong example is one bad code, a wrong
 * alphabet is an unlimited supply of them. Three lessons — including b7/0001,
 * the server that actually generates codes — taught
 * ABCDEFGHJKLMNPQRSTUVWXYZ23456789 and commented it "no 0/O/1/I/L" while
 * including L, so the server emitted codes the client's validator rejects.
 *
 * It is an ERROR in the audit, never a warning, and unlike the code check it is
 * never opt-outable at file level for a lesson that merely uses fixtures — only
 * a lesson deliberately SHOWING a wrong alphabet may opt out, and it says so
 * with `audit-allow-alphabet`.
 *
 * Extracted 2026-08-29 for the same reason as the scanner above: it carries
 * four separate suppression clauses, each one a chance to have silenced the
 * signal instead of the noise, and nothing tested any of them.
 * ------------------------------------------------------------------ */

const ALPHABET_LITERAL = /['"`]([A-Z0-9]{20,})['"`]/g;
const EXCLUDED = "0O1IL";

/**
 * Every string literal in `text` that looks like a code alphabet and is not the
 * canonical one.
 *
 * Returns `[{ literal, reason, excluded }]`, where reason is one of
 * `excluded_characters`, `wrong_length` or `reordered`.
 */
export function badAlphabetsIn(text) {
  const found = [];

  for (const m of text.matchAll(ALPHABET_LITERAL)) {
    const literal = m[1];

    if (literal === TOKEN_ALPHABET) continue;

    /* A token alphabet contains digits. Without this the plain English A-Z,
       pasted into a maxLength question in 02/0004, reads as one. */
    if (!/[0-9]/.test(literal)) continue;

    /* Only judge strings that are plausibly an alphabet. A base64 blob or a
       hex digest shares far fewer characters with the canonical set. */
    const distinct = [...new Set(literal)];
    if (distinct.filter((c) => TOKEN_ALPHABET.includes(c)).length < 20) continue;

    const excluded = distinct.filter((c) => EXCLUDED.includes(c));

    /* Three reasons, because "is 31 characters, not 31" is what the second one
       used to say about a correctly-sized alphabet in the wrong order — a true
       error reported with a nonsense explanation, which is how a real finding
       gets read as a bug in the checker. Order is load-bearing here: CLAUDE.md
       derives the modulo bias from the FIRST EIGHT characters and names indices
       26–30 as V, W, X, Y, Z. Permute the alphabet and both are false. */
    const reason = excluded.length
      ? "excluded_characters"
      : literal.length !== TOKEN_ALPHABET.length
        ? "wrong_length"
        : "reordered";

    found.push({ literal: literal, reason: reason, excluded: excluded });
  }

  return found;
}
