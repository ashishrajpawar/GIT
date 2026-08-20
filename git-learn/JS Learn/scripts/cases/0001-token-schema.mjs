/* Wrong-answer cases for b2/0001 — codeHashInput.
 *
 *   node scripts/verify-lesson.mjs modules/b2-schema-design/0001-token-schema.html \
 *        --wrong scripts/cases/0001-token-schema.mjs
 *
 * Staged: `exercise-1` is a Postgres migration and carries its own
 * per-exercise `unverifiable` reason, so only `normalise` has cases.
 *
 * This function is unusual among the ones in this course: it is eight lines,
 * it has no branches worth arguing about, and it is nearly impossible to
 * change once it has run in production. Every code_hash in the table was
 * computed by whatever this did on the day it ran, so a "small improvement"
 * six months later silently orphans rows.
 *
 * That makes the mistakes here split into two kinds.
 *
 * TOO STRICT — a real code the holder typed reasonably is rejected, and they
 * cannot redeem a token that exists. Forgetting to uppercase is the common
 * one, and it presents as "the code doesn't work" for anyone whose keyboard
 * or autocorrect lower-cased it.
 *
 * TOO LOOSE — two different inputs reach the same row, or an input that was
 * never a valid code produces a hash anyway. The tempting version is being
 * "helpful" about the excluded letters: mapping O to 0 and I to 1 looks like
 * kindness, and neither 0 nor 1 is in the alphabet either, so it maps a typo
 * onto a character that is equally invalid. Stripping more punctuation than
 * spaces and hyphens is the same failure in a different coat.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const ALPHA = `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";`;

export const stages = {
  normalise: {
    alternatives: [
      // split/join instead of a regex, and every() instead of a loop.
      `${ALPHA}
      function codeHashInput(raw) {
        if (typeof raw !== "string") return null;
        const compact = raw.split(" ").join("").split("-").join("").toUpperCase();
        if (compact.length !== 12) return null;
        const ok = compact.split("").every(function (ch) { return ALPHABET.includes(ch); });
        return ok ? compact : null;
      }`,

      // A single regex test built from the alphabet.
      `${ALPHA}
      function codeHashInput(raw) {
        if (typeof raw !== "string") return null;
        const compact = raw.replace(/[- ]/g, "").toUpperCase();
        const valid = new RegExp("^[" + ALPHABET + "]{12}$");
        return valid.test(compact) ? compact : null;
      }`,

      // Uppercase first, then strip — order between those two does not matter.
      `${ALPHA}
      function codeHashInput(raw) {
        if (typeof raw !== "string") return null;
        let out = "";
        for (const ch of raw.toUpperCase()) {
          if (ch === " " || ch === "-") continue;
          if (ALPHABET.indexOf(ch) === -1) return null;
          out += ch;
        }
        return out.length === 12 ? out : null;
      }`,
    ],

    mistakes: [
      {
        // Never uppercases. A lower-cased code hashes to nothing in the
        // table, so a real token simply stops working for that holder.
        expect: "every way of typing the same code normalises identically",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          const compact = raw.replace(/[- ]/g, "");
          if (compact.length !== 12) return null;
          for (const ch of compact) {
            if (ALPHABET.indexOf(ch) === -1) return null;
          }
          return compact;
        }`,
      },
      {
        // Strips hyphens but not spaces, so a code read aloud and typed
        // with gaps is rejected.
        expect: "every way of typing the same code normalises identically",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          const compact = raw.replace(/-/g, "").toUpperCase();
          if (compact.length !== 12) return null;
          for (const ch of compact) {
            if (ALPHABET.indexOf(ch) === -1) return null;
          }
          return compact;
        }`,
      },
      {
        // The "helpful" one. Maps O to 0 and I/L to 1 -- neither of which
        // is in the alphabet, so it converts one invalid character into
        // another and then rejects it anyway, or worse, lets it through.
        expect: "an excluded letter O is rejected, not mapped to zero",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          let compact = raw.replace(/[- ]/g, "").toUpperCase();
          // Being kind to people reading codes off a label.
          compact = compact.replace(/O/g, "0").replace(/[IL]/g, "1");
          if (compact.length !== 12) return null;
          return compact;
        }`,
      },
      {
        // No alphabet check at all. Anything twelve characters long hashes,
        // including strings that the generator could never have produced.
        expect: "every excluded character is rejected (0 O 1 I L)",
        impl: `function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          const compact = raw.replace(/[- ]/g, "").toUpperCase();
          return compact.length === 12 ? compact : null;
        }`,
      },
      {
        // Strips all non-alphanumerics, so MERC_8GH2_KP4X and
        // MERC-8GH2-KP4X reach the same row. Two different inputs, one hash.
        expect: "only spaces and hyphens are stripped",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          if (compact.length !== 12) return null;
          for (const ch of compact) {
            if (ALPHABET.indexOf(ch) === -1) return null;
          }
          return compact;
        }`,
      },
      {
        // Truncates instead of rejecting, so a code with a stray character
        // pasted on the end silently matches a different token.
        expect: "thirteen characters is not a code",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          const compact = raw.replace(/[- ]/g, "").toUpperCase().slice(0, 12);
          if (compact.length !== 12) return null;
          for (const ch of compact) {
            if (ALPHABET.indexOf(ch) === -1) return null;
          }
          return compact;
        }`,
      },
      {
        // Measures length before stripping, so the dashed form -- the one
        // printed on every label -- is rejected as too long.
        expect: "dashes are stripped",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          if (typeof raw !== "string") return null;
          if (raw.length !== 12) return null;
          const compact = raw.replace(/[- ]/g, "").toUpperCase();
          for (const ch of compact) {
            if (ALPHABET.indexOf(ch) === -1) return null;
          }
          return compact;
        }`,
      },
      {
        // No type guard: a number or null throws rather than returning
        // null, so a malformed request becomes a 500 instead of a refusal.
        expect: "non-strings are null, not a crash",
        impl: `${ALPHA}
        function codeHashInput(raw) {
          const compact = raw.replace(/[- ]/g, "").toUpperCase();
          if (compact.length !== 12) return null;
          for (const ch of compact) {
            if (ALPHABET.indexOf(ch) === -1) return null;
          }
          return compact;
        }`,
      },
    ],
  },
};
