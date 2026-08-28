/**
 * Wrong-answer cases for C1/0002 — isExpired and makeCodeGenerator.
 *
 *   node scripts/verify-lesson.mjs modules/c1-testing-quality/0002-time-randomness-and-fakes.html \
 *        --wrong scripts/cases/0002-time-randomness-and-fakes.mjs
 *
 * Staged: `clock` -> pg-exercise-clock, `gen` -> pg-exercise-gen.
 *
 * Two fixture choices in the lesson are load-bearing and the cases here are
 * what prove it:
 *
 *   - The clock self-check asks about a 2027 expiry against a 2031 clock AND a
 *     2020 expiry against a 2019 clock. One of those two fails for any
 *     implementation that reads the real clock, whatever year it is run in. A
 *     single future-facing case would have started passing by accident in 2031.
 *   - The generator self-check feeds bytes 248 THROUGH 255 consecutively, not
 *     one high byte. A rejection written as `if` instead of `while` handles one
 *     rejection correctly and fails on two in a row, which is roughly one draw
 *     in a thousand in production and never in a test that rejects once.
 */

export const stages = {
  clock: {
    alternatives: {
      "Date.parse and getTime instead of Date comparison": `
function isExpired(token, now) {
  if (token.expiresAt === null) return false;
  return Date.parse(token.expiresAt) <= now.getTime();
}`,

      "the comparison written the other way round": `
function isExpired(token, now) {
  if (token.expiresAt === null) return false;
  return now >= new Date(token.expiresAt);
}`,

      "an if/else with two returns": `
function isExpired(token, now) {
  if (token.expiresAt === null) {
    return false;
  } else if (new Date(token.expiresAt) <= now) {
    return true;
  } else {
    return false;
  }
}`,

      "the parsed date pulled out after the guard": `
function isExpired(token, now) {
  if (token.expiresAt === null) return false;
  const expiry = new Date(token.expiresAt);
  return expiry.getTime() <= now.getTime();
}`,
    },

    mistakes: {
      /* The one the whole lesson is about. A token that never expires reports
         as expired in 1970, the holder is denied, and the user's screen shows
         a live token. */
      "no null guard at all": {
        impl: `
function isExpired(token, now) {
  return new Date(token.expiresAt) <= now;
}`,
        expect: "a token with no expiry is not expired",
      },

      /* The guard written as a value rather than as an exit. Line 2 is right
         and line 3 undoes it — the shape from the lesson's broken playground. */
      "the guard computes null instead of returning": {
        impl: `
function isExpired(token, now) {
  const expiry = token.expiresAt === null ? null : new Date(token.expiresAt);
  return expiry.getTime() <= now.getTime();
}`,
        expect: "Cannot read properties of null",
      },

      /* The clock fetched instead of accepted. Note which check catches it:
         the past-facing one, which fails in every year this can be run. */
      "reads the real clock and ignores now": {
        impl: `
function isExpired(token) {
  if (token.expiresAt === null) return false;
  return new Date(token.expiresAt) <= new Date();
}`,
        expect: "a past clock sees a 2020 expiry as not yet expired",
      },

      /* Off by one instant. The token is usable for exactly the moment it
         dies, which is invisible until an expiry and a use limit disagree
         about the same second. */
      "< instead of <= at the moment of expiry": {
        impl: `
function isExpired(token, now) {
  if (token.expiresAt === null) return false;
  return new Date(token.expiresAt) < now;
}`,
        expect: "the exact moment of expiry counts as expired",
      },

      /* The string never parsed, and the failure is quieter than it looks.
         A relational operator asks both sides for a NUMBER, so the Date
         becomes its timestamp and the ISO string becomes NaN — and every
         comparison against NaN is false. The function therefore answers "not
         expired" to everything, including tokens that died years ago. It also
         answers the FUTURE case correctly, by accident, which is why a suite
         testing only the happy direction would let it through. */
      "the ISO string compared without parsing": {
        impl: `
function isExpired(token, now) {
  if (token.expiresAt === null) return false;
  return token.expiresAt <= now;
}`,
        expect: "an expiry in the past is expired",
      },

      /* Answers the question and returns the wrong type. Every caller written
         as if (isExpired(t)) treats both strings as true. */
      "returns a word instead of a boolean": {
        impl: `
function isExpired(token, now) {
  if (token.expiresAt === null) return "active";
  return new Date(token.expiresAt) <= now ? "expired" : "active";
}`,
        expect: "the answer is a boolean, not a string",
      },
    },
  },

  gen: {
    alternatives: {
      "an array and join instead of string concatenation": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  function nextChar() {
    let byte = nextByte();
    while (byte >= 248) byte = nextByte();
    return ALPHABET[byte % 31];
  }
  return function () {
    const chars = [];
    for (let i = 0; i < 12; i++) chars.push(nextChar());
    return [
      chars.slice(0, 4).join(""),
      chars.slice(4, 8).join(""),
      chars.slice(8).join("")
    ].join("-");
  };
}`,

      "a do/while, and charAt instead of indexing": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LIMIT = ALPHABET.length * 8;

function makeCodeGenerator(nextByte) {
  return function () {
    let out = "";
    for (let i = 0; i < 12; i++) {
      let byte;
      do { byte = nextByte(); } while (byte >= LIMIT);
      if (i === 4 || i === 8) out += "-";
      out += ALPHABET.charAt(byte % ALPHABET.length);
    }
    return out;
  };
}`,

      "the groups built one at a time": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  function draw() {
    let byte = nextByte();
    while (byte >= 248) byte = nextByte();
    return ALPHABET[byte % 31];
  }
  function group() {
    return draw() + draw() + draw() + draw();
  }
  return function () {
    return group() + "-" + group() + "-" + group();
  };
}`,

      "rejection expressed as a recursive draw": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  function draw() {
    const byte = nextByte();
    return byte >= 248 ? draw() : ALPHABET[byte % 31];
  }
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) chars += draw();
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
    },

    mistakes: {
      /* The bias itself. Every code is well-formed, every character is legal,
         and the digits come up 12.5% more often than the letters. Only the
         distribution check can see it. */
      "no rejection — byte % 31 on every draw": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) chars += ALPHABET[nextByte() % 31];
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
        expect: "every letter comes up equally often over 62 codes",
      },

      /* Rejecting above the threshold instead of at it. 248 % 31 is 0, so
         exactly one character keeps its extra weight — a smaller version of
         the same bug, and even harder to see. */
      "> 248 instead of >= 248": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) {
      let byte = nextByte();
      while (byte > 248) byte = nextByte();
      chars += ALPHABET[byte % 31];
    }
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
        expect: "bytes 248 to 255 are all rejected",
      },

      /* One rejection handled, two not. This is the case the consecutive-high
         -bytes fixture exists for: with a single high byte in the source it
         passes perfectly. */
      "rejection written as an if rather than a loop": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) {
      let byte = nextByte();
      if (byte >= 248) byte = nextByte();
      chars += ALPHABET[byte % 31];
    }
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
        expect: "bytes 248 to 255 are all rejected",
      },

      /* A threshold that is not a multiple of 31. It throws away more bytes
         than it needs to AND is still uneven, and the boundary check is what
         names it: 247 is a perfectly good byte being discarded. */
      "threshold rounded to 240": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) {
      let byte = nextByte();
      while (byte >= 240) byte = nextByte();
      chars += ALPHABET[byte % 31];
    }
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
        expect: "byte 247 is still accepted, and maps to Z",
      },

      /* One byte drawn and reused for all twelve characters. Produces
         2222-2222-2222 from a counting source, which no shape check dislikes. */
      "one byte drawn for the whole code": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let byte = nextByte();
    while (byte >= 248) byte = nextByte();
    const ch = ALPHABET[byte % 31];
    const chars = ch.repeat(12);
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
        expect: "the bytes decide the code, exactly",
      },

      /* The randomness fetched instead of accepted, which is the design
         mistake rather than an arithmetic one. Every shape check still
         passes; nothing about the mapping can be asserted at all. */
      "Math.random used instead of the byte source": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) {
      chars += ALPHABET[Math.floor(Math.random() * 31)];
    }
    return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
  };
}`,
        expect: "the bytes decide the code, exactly",
      },

      /* The dashes forgotten. Twelve valid characters and a code no field in
         the product will accept. */
      "the groups never joined with dashes": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  return function () {
    let chars = "";
    for (let i = 0; i < 12; i++) {
      let byte = nextByte();
      while (byte >= 248) byte = nextByte();
      chars += ALPHABET[byte % 31];
    }
    return chars;
  };
}`,
        expect: "a code is 14 characters with its two dashes",
      },

      /* Returns the code rather than the generator. Reads fine and every
         caller holding onto it gets the same code forever. */
      "returns a code instead of a function": {
        impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCodeGenerator(nextByte) {
  let chars = "";
  for (let i = 0; i < 12; i++) {
    let byte = nextByte();
    while (byte >= 248) byte = nextByte();
    chars += ALPHABET[byte % 31];
  }
  return chars.slice(0, 4) + "-" + chars.slice(4, 8) + "-" + chars.slice(8);
}`,
        expect: "makeCodeGenerator returns a function",
      },
    },
  },
};
