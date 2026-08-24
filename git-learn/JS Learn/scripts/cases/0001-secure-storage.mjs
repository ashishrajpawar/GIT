/* Wrong-answer cases for a10/0001 — planChunks.
 *
 *   node scripts/verify-lesson.mjs modules/a10-device-security/0001-secure-storage.html \
 *        --wrong scripts/cases/0001-secure-storage.mjs
 *
 * Staged: `exercise-1` is a React Native service calling expo-secure-store and
 * carries its own per-exercise `unverifiable` reason, so only `chunks` has
 * cases.
 *
 * Every mistake below is CORRECT for a base64 refresh token, which is the only
 * value anybody tests this with. They diverge only on a value containing a
 * multi-byte character near a chunk boundary — and the divergence is not an
 * error, it is a different value coming back out.
 *
 * That is the whole reason this is a pure function with a round-trip
 * assertion rather than a few lines inside `set()`. The bug has no symptom at
 * the point it happens. Its symptom is a login loop nobody can reproduce, or
 * a message history that will not decrypt.
 *
 * The three failure modes:
 *
 *   Measuring `.length` against a BYTE limit. The check passes and the write
 *   fails, or worse, silently truncates. 'नमस्ते' is 6 units and 18 bytes.
 *
 *   Slicing by index. This is the dangerous one: `slice` cuts between UTF-16
 *   CODE UNITS, so it can leave half a surrogate pair. Half a surrogate is not
 *   invalid input — it encodes to U+FFFD and the write SUCCEEDS.
 *
 *   Checking "does it fit in the remaining space" before "can it fit at all".
 *   A character bigger than maxBytes then loops for ever or is emitted in an
 *   over-sized chunk.
 *
 * TWO of these trip eight checks each, and that is deliberate rather than a
 * diagnostics failure. Cases 0 and 2 are whole-strategy substitutions — slice
 * by index, and slice by byte — not one-line slips, so everything involving a
 * multi-byte character breaks at once. Case 0 in particular is the lesson's
 * OWN shipped implementation copied verbatim, and narrowing it to make the
 * output tidier would stop it being that. The four ASCII checks still pass in
 * both, which is exactly the point being made: the tests everyone writes are
 * the ones these survive.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const PRELUDE = `function utf8Bytes(str) {
  return new TextEncoder().encode(str).length;
}
`;

export const stages = {
  chunks: {
    alternatives: [
      // Array.from + reduce. Array.from also splits by code point, so it is
      // as safe as for...of — a different spelling of the same correct choice.
      PRELUDE +
        `function planChunks(value, maxBytes) {
        if (typeof value !== "string") throw new TypeError("value must be a string");
        if (!(maxBytes > 0)) throw new RangeError("maxBytes must be positive");

        return Array.from(value).reduce(function (acc, ch) {
          const size = utf8Bytes(ch);
          if (size > maxBytes) {
            throw new RangeError("character needs " + size + " bytes, over " + maxBytes);
          }
          const last = acc[acc.length - 1];
          if (last === undefined || utf8Bytes(last) + size > maxBytes) {
            acc.push(ch);
          } else {
            acc[acc.length - 1] = last + ch;
          }
          return acc;
        }, []);
      }`,

      // Uses the string iterator explicitly and tracks a running byte total,
      // pushing on overflow rather than checking the accumulated chunk.
      PRELUDE +
        `function planChunks(value, maxBytes) {
        if (typeof value !== "string") throw new TypeError("value must be a string");
        if (!(maxBytes > 0)) throw new RangeError("maxBytes must be positive");

        const out = [];
        const it = value[Symbol.iterator]();
        let buf = "";
        let used = 0;

        for (let step = it.next(); !step.done; step = it.next()) {
          const ch = step.value;
          const n = utf8Bytes(ch);
          if (n > maxBytes) {
            throw new RangeError("character needs " + n + " bytes, over " + maxBytes);
          }
          if (used + n > maxBytes) {
            out.push(buf);
            buf = "";
            used = 0;
          }
          buf = buf + ch;
          used = used + n;
        }

        if (buf.length > 0) out.push(buf);
        return out;
      }`,

      // Re-measures the whole accumulated chunk on every character rather
      // than keeping a running total. Behaviourally identical and O(n^2);
      // included so the self-check has to accept it, which is what proves it
      // is testing behaviour rather than shape.
      PRELUDE +
        `function planChunks(value, maxBytes) {
        if (typeof value !== "string") throw new TypeError("value must be a string");
        if (!(maxBytes > 0)) throw new RangeError("maxBytes must be positive");

        const out = [];
        let current = "";

        for (const ch of value) {
          if (utf8Bytes(ch) > maxBytes) {
            throw new RangeError("character too large for the limit");
          }
          if (utf8Bytes(current + ch) > maxBytes) {
            out.push(current);
            current = "";
          }
          current = current + ch;
        }

        return current === "" ? out : out.concat([current]);
      }`,
    ],

    mistakes: [
      {
        // The bug in the lesson's own exercise solution: slice by index,
        // count by .length. Correct for ASCII, and for a 4-byte emoji it
        // cuts the surrogate pair in half — which encodes to U+FFFD without
        // raising anything.
        expect: "emoji survive being written and read back",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          if (value.length <= maxBytes) return value === "" ? [] : [value];
          const out = [];
          const n = Math.ceil(value.length / maxBytes);
          for (let i = 0; i < n; i++) {
            out.push(value.slice(i * maxBytes, (i + 1) * maxBytes));
          }
          return out;
        }`,
      },
      {
        // Iterates code points correctly, so nothing is ever split — but
        // measures the CHUNK in characters rather than bytes. Round-trips
        // perfectly and produces chunks the Keychain will refuse.
        expect: "no Devanagari chunk exceeds the BYTE limit",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          const out = [];
          let current = "";
          for (const ch of value) {
            if (current.length + ch.length > maxBytes) {
              out.push(current);
              current = "";
            }
            current += ch;
          }
          if (current !== "") out.push(current);
          return out;
        }`,
      },
      {
        // Encodes the whole string to bytes, slices the BYTES, then decodes
        // each slice back. The slice lands mid-sequence and TextDecoder
        // substitutes U+FFFD rather than complaining — the same corruption
        // by a more sophisticated-looking route.
        expect: "Devanagari survives being written and read back",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          if (value === "") return [];
          const bytes = new TextEncoder().encode(value);
          const dec = new TextDecoder();
          const out = [];
          for (let i = 0; i < bytes.length; i += maxBytes) {
            out.push(dec.decode(bytes.slice(i, i + maxBytes)));
          }
          return out;
        }`,
      },
      {
        // No too-big-character guard, and the overflow test runs first. A
        // 4-byte emoji at maxBytes 3 pushes an empty chunk and then emits
        // an over-sized one, silently.
        expect: "a single character larger than the limit throws",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          const out = [];
          let current = "";
          let used = 0;
          for (const ch of value) {
            const n = utf8Bytes(ch);
            if (used + n > maxBytes) {
              out.push(current);
              current = "";
              used = 0;
            }
            current += ch;
            used += n;
          }
          if (current !== "") out.push(current);
          return out;
        }`,
      },
      {
        // Returns [''] for an empty value, so the caller writes an empty
        // Keychain item. On the next read that is a present-but-blank
        // secret rather than an absent one — the distinction a10 spends the
        // rest of its length on.
        expect: "an empty value produces no chunks",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          const out = [];
          let current = "";
          let used = 0;
          for (const ch of value) {
            const n = utf8Bytes(ch);
            if (n > maxBytes) {
              throw new RangeError("character needs " + n + " bytes, over " + maxBytes);
            }
            if (used + n > maxBytes) {
              out.push(current);
              current = "";
              used = 0;
            }
            current += ch;
            used += n;
          }
          out.push(current);          // unconditional
          return out;
        }`,
      },
      {
        // Splits evenly into equal-sized pieces instead of packing greedily.
        // Every chunk is within the limit and the value round-trips, so it
        // is only wrong in using more Keychain items than it needs — but at
        // 2048 bytes with a big value that is a real cost, and the count is
        // what removeChunks walks.
        expect: "one byte over the limit is two chunks",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          if (value === "") return [];
          const chars = Array.from(value);
          const total = utf8Bytes(value);
          const parts = Math.ceil(total / maxBytes);
          const per = Math.ceil(chars.length / parts);
          const out = [];
          for (let i = 0; i < chars.length; i += per) {
            out.push(chars.slice(i, i + per).join(""));
          }
          return out;
        }`,
      },
      {
        // Off by one: allows a chunk to reach maxBytes + 1 because the
        // comparison is >= rather than >. Invisible on ASCII at a round
        // limit, and the Keychain rejects the write.
        expect: "a value exactly on the limit is still one chunk",
        impl:
          PRELUDE +
          `function planChunks(value, maxBytes) {
          const out = [];
          let current = "";
          let used = 0;
          for (const ch of value) {
            const n = utf8Bytes(ch);
            if (n > maxBytes) {
              throw new RangeError("character needs " + n + " bytes, over " + maxBytes);
            }
            if (used + n >= maxBytes) {
              out.push(current);
              current = "";
              used = 0;
            }
            current += ch;
            used += n;
          }
          if (current !== "") out.push(current);
          return out;
        }`,
      },
    ],
  },
};
