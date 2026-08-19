/* Wrong-answer cases for a5/0001 — codeFromBytes.
 *
 *   node scripts/verify-lesson.mjs modules/a5-core-token-features/0001-token-generation-display.html \
 *        --wrong scripts/cases/0001-token-generation-display.mjs
 *
 * Staged: `exercise-1` is an Express route plus a React Native screen and
 * carries its own per-exercise `unverifiable` reason, so only `bytes` has
 * cases.
 *
 * The mistakes are ordered by how likely they are to ship. The first is the
 * position this lesson held until 2026-08-18 — fold the biased bytes and call
 * the bias acceptable — and it is the reason the exercise exists. The second
 * is the one that survives review, because `> 248` and `>= 248` look equally
 * plausible on the page and disagree about exactly one byte in 256.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 *
 * Note on the wrong alphabet below: it is assembled by concatenation rather
 * than written as one literal, so that the audit's alphabet check — which
 * errors on any 20+ character A-Z0-9 literal that is not the canonical one,
 * and which is deliberately not opt-outable — does not fire on a fixture whose
 * whole purpose is to be wrong.
 */

export const stages = {
  bytes: {
    alternatives: {
      "an index loop rather than for..of": `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (let i = 0; i < bytes.length && letters.length < 12; i++) {
    if (bytes[i] >= 248) continue;
    letters += A[bytes[i] % A.length];
  }
  if (letters.length !== 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,

      "filters first, then maps and joins": `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const letters = Array.from(bytes)
    .filter(function (b) { return b < 248; })
    .slice(0, 12)
    .map(function (b) { return A[b % A.length]; })
    .join('');
  if (letters.length < 12) return null;
  return [letters.slice(0, 4), letters.slice(4, 8), letters.slice(8, 12)].join('-');
}`,

      "a while loop with an explicit cursor and an array accumulator": `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const out = [];
  let i = 0;
  while (out.length < 12 && i < bytes.length) {
    const b = bytes[i];
    i += 1;
    if (b < 248) out.push(A[b % A.length]);
  }
  if (out.length < 12) return null;
  const s = out.join('');
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
}`,

      "names the threshold as an expression instead of the literal 248": `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const REJECT_AT = 256 - (256 % A.length);
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte >= REJECT_AT) continue;
    letters += A[byte % A.length];
  }
  return letters.length < 12
    ? null
    : letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
    },

    mistakes: {
      "folds the biased bytes instead of rejecting them — the position this lesson used to take": {
        expect: "bytes of 248 and up are skipped, not folded",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    letters += A[byte % A.length];
  }
  if (letters.length < 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
      },

      "rejects above 248 rather than at it, so byte 248 still folds onto '2'": {
        expect: "248 is rejected -- it is the first biased byte",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte > 248) continue;
    letters += A[byte % A.length];
  }
  if (letters.length < 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
      },

      "rejects from 240, throwing away eight values that were perfectly uniform": {
        expect: "247 is kept -- it is the last unbiased byte",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte >= 240) continue;
    letters += A[byte % A.length];
  }
  if (letters.length < 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
      },

      "rejects the low bytes, having the bias backwards": {
        expect: "a byte below 31 maps to the alphabet position of that number",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte < 8) continue;
    letters += A[byte % A.length];
  }
  if (letters.length < 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
      },

      "pads a short block out to a code instead of returning null": {
        expect: "running out of usable bytes returns null",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte >= 248) continue;
    letters += A[byte % A.length];
  }
  while (letters.length < 12) letters += A[0];
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
      },

      "never stops collecting, so a spare usable byte lengthens the last group": {
        expect: "the twelfth letter ends the code",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (byte >= 248) continue;
    letters += A[byte % A.length];
  }
  if (letters.length < 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8);
}`,
      },

      "uses the alphabet that still contains L, and is 32 characters besides": {
        expect: "twelve usable bytes give the canonical code",
        impl: `function codeFromBytes(bytes) {
  // Assembled, not a literal — see the header note. This is the alphabet three
  // lessons taught while commenting it "no 0/O/1/I/L".
  const A = 'ABCDEFGH' + 'JKLMN' + 'PQRSTUVWXYZ' + '23456789';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte >= 248) continue;
    letters += A[byte % 31];
  }
  if (letters.length < 12) return null;
  return letters.slice(0, 4) + '-' + letters.slice(4, 8) + '-' + letters.slice(8, 12);
}`,
      },

      "returns the twelve letters ungrouped": {
        expect: "the code is grouped XXXX-XXXX-XXXX",
        impl: `function codeFromBytes(bytes) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let letters = '';
  for (const byte of bytes) {
    if (letters.length === 12) break;
    if (byte >= 248) continue;
    letters += A[byte % A.length];
  }
  if (letters.length < 12) return null;
  return letters;
}`,
      },
    },
  },
};
