/* Wrong-answer cases for a5/0002 — extractTokenCode.
 *
 *   node scripts/verify-lesson.mjs modules/a5-core-token-features/0002-qr-generation-scanning.html \
 *        --wrong scripts/cases/0002-qr-generation-scanning.mjs
 *
 * Staged: `exercise-1` is React Native with expo-camera and carries its own
 * per-exercise `unverifiable` reason, so only `scan` has cases.
 *
 * The first mistake is the one the lesson itself shipped until 2026-08-19:
 * `https?`, three lines under a table saying HTTPS is required. The second is
 * the one that is hardest to see, because the fix looks like the bug — moving
 * the /i onto the alphabet class appears to solve the case problem and instead
 * returns a code in whatever case the poster was printed in.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 *
 * Note: these impls are template literals, so every regex backslash is doubled.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const stages = {
  scan: {
    alternatives: {
      "no regex at all — compare the prefix and slice": `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const PREFIX = 'https://tokn.app/t/';
  const s = raw.trim();
  if (s.length <= PREFIX.length) return null;
  if (s.slice(0, PREFIX.length).toLowerCase() !== PREFIX) return null;

  const code = s.slice(PREFIX.length).replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  // The segment must not contain a further path, query or fragment. Checking
  // the alphabet covers all three, since /, ? and # are not in it.
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,

      "builds the alphabet check from a Set": `const SAFE = new Set('${ALPHABET}'.split(''));
function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  return code.length === 12 && code.split('').every(function (ch) { return SAFE.has(ch); })
    ? code
    : null;
}`,

      "parses with the URL constructor instead of matching text": `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  let u;
  try {
    u = new URL(raw.trim());
  } catch (e) {
    return null;   // not a URL at all
  }
  if (u.protocol !== 'https:') return null;
  if (u.hostname.toLowerCase() !== 'tokn.app') return null;
  if (u.search || u.hash || u.username || u.password) return null;
  if (!u.pathname.startsWith('/t/')) return null;

  const code = u.pathname.slice(3).replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,

      "validates with a second regex built from the alphabet constant": `const SAFE_RE = new RegExp('^[' + '${ALPHABET}' + ']{12}$');
function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  return SAFE_RE.test(code) ? code : null;
}`,
    },

    mistakes: {
      "accepts http as well as https — what this lesson shipped until 2026-08-19": {
        expect: "cleartext http is refused",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^https?:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },

      "puts the /i on the alphabet class and returns the match unnormalised": {
        expect: "a lowercased URL comes back UPPERCASE",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  // Looks like it handles case. It does -- by accepting a lowercase code and
  // handing it straight back, so the hash lookup on the server misses.
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([${ALPHABET}]{12})$/i);
  return m ? m[1] : null;
}`,
      },

      "forgets the anchors, so any URL containing a redemption URL passes": {
        expect: "a URL that merely CONTAINS a redemption URL is refused",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },

      "takes the last path segment without ever checking the host": {
        expect: "a host that only starts or ends with tokn.app is refused",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().split('/').pop().replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },

      "never strips the display dashes": {
        expect: "the dashed display form is accepted and stripped",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },

      "trusts the length and never checks the alphabet": {
        expect: "a code containing an excluded character is refused",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  return code.length === 12 ? code : null;
}`,
      },

      "checks the alphabet but never the length": {
        expect: "a code of the wrong length is refused",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },

      "never trims, so a trailing newline from the encoder loses the code": {
        expect: "surrounding whitespace is trimmed",
        impl: `function extractTokenCode(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },

      "assumes a string and throws the scanner screen away when handed null": {
        expect: "a non-string payload returns null rather than throwing",
        impl: `function extractTokenCode(raw) {
  const m = raw.trim().match(/^https:\\/\\/tokn\\.app\\/t\\/([0-9A-Za-z-]+)$/i);
  if (!m) return null;
  const code = m[1].replace(/-/g, '').toUpperCase();
  if (code.length !== 12) return null;
  for (const ch of code) {
    if (!'${ALPHABET}'.includes(ch)) return null;
  }
  return code;
}`,
      },
    },
  },
};
