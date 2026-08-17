/* Wrong-answer cases for 02/0004-textinput-and-keyboard.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0004-textinput-and-keyboard.html \
 *        --wrong scripts/cases/0004-textinput-and-keyboard.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for validates with /^[A-Z0-9]+$/. It accepts
 * every real code, so it passes any test written from valid examples. What it
 * also accepts is codes containing 0, O, 1, I and L — which the generator can
 * never produce, so the holder is told "no such token" for a code they may
 * have typed correctly after confusing 1 with L.
 */

export const alternatives = {
  "every() over the alphabet instead of a loop": `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "").toUpperCase();
  if (bare.length !== 12) return { ok: false, reason: "length" };
  if (![...bare].every((ch) => ALPHABET.includes(ch))) return { ok: false, reason: "alphabet" };
  return { ok: true, code: bare.replace(/(.{4})(.{4})(.{4})/, "$1-$2-$3") };
}`,

  "a Set for membership and a match() for the grouping": `const ALLOWED = new Set("23456789ABCDEFGHJKMNPQRSTUVWXYZ".split(""));

function normaliseCode(raw) {
  const bare = (raw === null || raw === undefined ? "" : String(raw))
    .toUpperCase()
    .split("")
    .filter((ch) => ch !== "-" && !/\\s/.test(ch))
    .join("");

  if (bare.length !== 12) return { ok: false, reason: "length" };
  for (let i = 0; i < bare.length; i++) {
    if (!ALLOWED.has(bare[i])) return { ok: false, reason: "alphabet" };
  }
  return { ok: true, code: bare.match(/.{4}/g).join("-") };
}`,

  "an explicitly negated character class, which happens to be equivalent": `function normaliseCode(raw) {
  const bare = String(raw == null ? "" : raw).replace(/[\\s-]/g, "").toUpperCase();
  if (bare.length !== 12) return { ok: false, reason: "length" };
  // Everything alphanumeric EXCEPT the five ambiguous characters.
  if (/[^A-Z0-9]|[OIL01]/.test(bare)) return { ok: false, reason: "alphabet" };
  return {
    ok: true,
    code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12),
  };
}`,
};

export const mistakes = {
  "validates with /^[A-Z0-9]+$/, so L and zero are accepted": {
    expect: "a code containing L is rejected for alphabet",
    impl: `function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "").toUpperCase();
  if (bare.length !== 12) return { ok: false, reason: "length" };
  if (!/^[A-Z0-9]+$/.test(bare)) return { ok: false, reason: "alphabet" };
  return { ok: true, code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12) };
}`,
  },

  "checks the alphabet before the length, so a short code reports the wrong reason": {
    expect: "length is reported before alphabet",
    impl: `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "").toUpperCase();
  for (const ch of bare) {
    if (!ALPHABET.includes(ch)) return { ok: false, reason: "alphabet" };
  }
  if (bare.length !== 12) return { ok: false, reason: "length" };
  return { ok: true, code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12) };
}`,
  },

  "strips hyphens but not whitespace, so a pasted code fails": {
    expect: "surrounding whitespace and a pasted newline are stripped",
    impl: `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/-/g, "").toUpperCase();
  if (bare.length !== 12) return { ok: false, reason: "length" };
  for (const ch of bare) {
    if (!ALPHABET.includes(ch)) return { ok: false, reason: "alphabet" };
  }
  return { ok: true, code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12) };
}`,
  },

  "never upper-cases, so a lower-case code fails the alphabet check": {
    expect: "lower case is accepted",
    impl: `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "");
  if (bare.length !== 12) return { ok: false, reason: "length" };
  for (const ch of bare) {
    if (!ALPHABET.includes(ch)) return { ok: false, reason: "alphabet" };
  }
  return { ok: true, code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12) };
}`,
  },

  "returns the bare code without regrouping it": {
    expect: "comes back in XXXX-XXXX-XXXX form",
    impl: `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "").toUpperCase();
  if (bare.length !== 12) return { ok: false, reason: "length" };
  for (const ch of bare) {
    if (!ALPHABET.includes(ch)) return { ok: false, reason: "alphabet" };
  }
  return { ok: true, code: bare };
}`,
  },

  "accepts anything at least 12 characters long instead of exactly 12": {
    expect: "a long code is rejected for length",
    impl: `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "").toUpperCase();
  if (bare.length < 12) return { ok: false, reason: "length" };
  for (const ch of bare) {
    if (!ALPHABET.includes(ch)) return { ok: false, reason: "alphabet" };
  }
  return { ok: true, code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12) };
}`,
  },

  "excludes only the letters, forgetting that 0 and 1 are out too": {
    expect: "a code containing 0 is rejected for alphabet",
    impl: `function normaliseCode(raw) {
  const bare = String(raw ?? "").replace(/[\\s-]/g, "").toUpperCase();
  if (bare.length !== 12) return { ok: false, reason: "length" };
  if (/[OIL]/.test(bare) || !/^[A-Z0-9]+$/.test(bare)) return { ok: false, reason: "alphabet" };
  return { ok: true, code: bare.slice(0, 4) + "-" + bare.slice(4, 8) + "-" + bare.slice(8, 12) };
}`,
  },
};
