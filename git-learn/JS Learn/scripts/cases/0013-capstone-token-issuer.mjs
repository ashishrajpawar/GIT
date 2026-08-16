/* Wrong-answer cases for the Module 01 capstone.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0013-capstone-token-issuer.html \
 *        --wrong scripts/cases/0013-capstone-token-issuer.mjs
 *
 * Three exercises, so this file exports `stages` rather than a flat pair —
 * each key names the playground that carries that stage's self-check
 * (gen -> pg-exercise-gen, and so on).
 *
 * `alternatives` are other correct styles and must all PASS. `mistakes` must
 * each FAIL, and `expect` names the check they should trip.
 *
 * The two mistakes this capstone exists for produce no error and no visibly
 * wrong output:
 *   gen/"folds the top bytes back in"  — every code looks perfect, and eight
 *     characters are 12.5% more likely than the rest, forever.
 *   rules/"chatty messages"            — every rule is enforced correctly and
 *     the page is friendlier to use. It is also a code-guessing oracle.
 */

/* ============================================================ stage 1: gen */

const ALPHABET_LINE = `const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";`;
const RANDOM_BYTE = `function randomByte() {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0];
}`;

const gen = {
  alternatives: {
    "do-while for the redraw instead of continue": `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  for (let i = 0; i < 12; i++) {
    let byte;
    do { byte = nextByte(); } while (byte >= 248);
    letters += ALPHABET[byte % 31];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,

    "an array of characters, joined at the end": `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  const chars = [];
  while (chars.length < 12) {
    const byte = nextByte();
    if (byte < 248) chars.push(ALPHABET.charAt(byte % ALPHABET.length));
  }
  return chars.slice(0, 4).join("") + "-" +
         chars.slice(4, 8).join("") + "-" +
         chars.slice(8, 12).join("");
}`,

    "three groups built separately": `${ALPHABET_LINE}
${RANDOM_BYTE}
function oneLetter(nextByte) {
  while (true) {
    const byte = nextByte();
    if (byte < 248) return ALPHABET[byte % 31];
  }
}
function group(nextByte) {
  return oneLetter(nextByte) + oneLetter(nextByte) +
         oneLetter(nextByte) + oneLetter(nextByte);
}
function generateCode(nextByte = randomByte) {
  return [group(nextByte), group(nextByte), group(nextByte)].join("-");
}`,

    "randomByte fills a bigger buffer and hands bytes out one at a time": `${ALPHABET_LINE}
let pool = [];
function randomByte() {
  if (pool.length === 0) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    pool = Array.from(bytes);
  }
  return pool.pop();
}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    const byte = nextByte();
    if (byte >= 248) continue;
    letters += ALPHABET[byte % ALPHABET.length];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`
  },

  mistakes: {
    // Perfect-looking output. This is the one the stage is written for.
    "folds the top bytes back in with % instead of redrawing": {
      impl: `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    letters += ALPHABET[nextByte() % ALPHABET.length];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,
      expect: "the alphabet is used evenly - no modulo bias"
    },

    "rejects only 255, so seven biased values survive": {
      impl: `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    const byte = nextByte();
    if (byte === 255) continue;
    letters += ALPHABET[byte % ALPHABET.length];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,
      expect: "the alphabet is used evenly - no modulo bias"
    },

    "uses the byte straight as an index": {
      impl: `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  for (let i = 0; i < 12; i++) letters += ALPHABET[nextByte()];
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,
      expect: "every character comes from the alphabet"
    },

    "Math.random as the default source": {
      impl: `${ALPHABET_LINE}
function randomByte() {
  return Math.floor(Math.random() * 256);
}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    const byte = nextByte();
    if (byte >= 248) continue;
    letters += ALPHABET[byte % ALPHABET.length];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,
      expect: "the default source is crypto, not Math.random"
    },

    "ignores the byte source it was handed": {
      impl: `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    const byte = randomByte();         // not nextByte
    if (byte >= 248) continue;
    letters += ALPHABET[byte % ALPHABET.length];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,
      expect: "generateCode uses the byte source it is given"
    },

    "a helpful alphabet that puts O, 0, I, 1 and L back": {
      impl: `const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    const byte = nextByte();
    if (byte >= 252) continue;         // 256 - (256 % 36)
    letters += ALPHABET[byte % ALPHABET.length];
  }
  return letters.slice(0, 4) + "-" + letters.slice(4, 8) + "-" + letters.slice(8, 12);
}`,
      expect: "every character comes from the alphabet"
    },

    "no dashes": {
      impl: `${ALPHABET_LINE}
${RANDOM_BYTE}
function generateCode(nextByte = randomByte) {
  let letters = "";
  while (letters.length < 12) {
    const byte = nextByte();
    if (byte >= 248) continue;
    letters += ALPHABET[byte % ALPHABET.length];
  }
  return letters;
}`,
      expect: "the shape is four-four-four with dashes"
    }
  }
};

/* ========================================================== stage 2: store */

const store = {
  alternatives: {
    "a class with a private field": `class Issuer {
  #tokens = [];
  #newCode;
  constructor(newCode) { this.#newCode = newCode; }
  #statusOf(token, now) {
    if (token.expiresAt !== null && now >= token.expiresAt) return "expired";
    return "active";
  }
  #describe(token, now) {
    return Object.assign({}, token, { status: this.#statusOf(token, now) });
  }
  issue(options, now) {
    const label = options && options.label;
    if (typeof label !== "string" || label.trim() === "") {
      throw new TypeError("issue() needs a label");
    }
    const token = {
      code: this.#newCode(), label: label.trim(), issuedAt: now,
      expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
      uses: 0, revokedAt: null
    };
    this.#tokens.push(token);
    return this.#describe(token, now);
  }
  list(now) { return this.#tokens.map((t) => this.#describe(t, now)); }
}
function createIssuer(newCode) { return new Issuer(newCode); }`,

    "a Map keyed by code, and Object.assign for the copies": `function createIssuer(newCode) {
  const tokens = new Map();

  const describe = function (token, now) {
    const expired = token.expiresAt !== null && now >= token.expiresAt;
    return Object.assign({}, token, { status: expired ? "expired" : "active" });
  };

  return {
    issue: function (options, now) {
      if (!options || typeof options.label !== "string" || options.label.trim() === "") {
        throw new TypeError("issue() needs a label");
      }
      const code = newCode();
      const token = {
        code: code, label: options.label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.set(code, token);
      return describe(token, now);
    },
    list: function (now) {
      return Array.from(tokens.values()).map(function (t) { return describe(t, now); });
    }
  };
}`,

    "explicit field-by-field copy rather than spread": `function createIssuer(newCode) {
  const tokens = [];

  function describe(t, now) {
    return {
      code: t.code, label: t.label, issuedAt: t.issuedAt,
      expiresAt: t.expiresAt, maxUses: t.maxUses, uses: t.uses,
      revokedAt: t.revokedAt,
      status: (t.expiresAt !== null && now >= t.expiresAt) ? "expired" : "active"
    };
  }

  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") {
        throw new TypeError("issue() needs a label");
      }
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: typeof options.expiresAt === "number" ? options.expiresAt : null,
        maxUses: typeof options.maxUses === "number" ? options.maxUses : null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      return describe(token, now);
    },
    list(now) { return tokens.map((t) => describe(t, now)); }
  };
}`
  },

  mistakes: {
    "list returns the store itself": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  const withStatus = function (t, now) {
    t.status = (t.expiresAt !== null && now >= t.expiresAt) ? "expired" : "active";
    return t;
  };
  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      return withStatus(token, now);
    },
    list(now) {
      tokens.forEach((t) => withStatus(t, now));
      return tokens;
    }
  };
}`,
      expect: "adding to or trimming list()'s result leaves the store alone"
    },

    "copies the array but hands out the same token objects": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null, status: "active"
      };
      tokens.push(token);
      return token;
    },
    list(now) { return tokens.slice(); }
  };
}`,
      expect: "editing a token from list() leaves the real one alone"
    },

    "stores the status instead of deriving it": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null, status: "active"
      };
      tokens.push(token);
      return { ...token };
    },
    list(now) { return tokens.map((t) => ({ ...t })); }
  };
}`,
      expect: "status is worked out from now, not stored on the token"
    },

    "exposes the store as a property for convenience": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  const describe = function (t, now) {
    return { ...t, status: (t.expiresAt !== null && now >= t.expiresAt) ? "expired" : "active" };
  };
  return {
    tokens: tokens,
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      return describe(token, now);
    },
    list(now) { return tokens.map((t) => describe(t, now)); }
  };
}`,
      expect: "nothing but functions is exposed"
    },

    "returns null on a bad label instead of throwing": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  const describe = function (t, now) {
    return { ...t, status: (t.expiresAt !== null && now >= t.expiresAt) ? "expired" : "active" };
  };
  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") return null;
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      return describe(token, now);
    },
    list(now) { return tokens.map((t) => describe(t, now)); }
  };
}`,
      expect: "issue throws on a blank label, and stores nothing"
    },

    "throws, but only after the token is in the store": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  const describe = function (t, now) {
    return { ...t, status: (t.expiresAt !== null && now >= t.expiresAt) ? "expired" : "active" };
  };
  return {
    issue(options, now) {
      const label = options && options.label;
      const token = {
        code: newCode(), label: String(label ?? "").trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      return describe(token, now);
    },
    list(now) { return tokens.map((t) => describe(t, now)); }
  };
}`,
      expect: "issue throws on a blank label, and stores nothing"
    },

    "|| instead of ?? for the defaults, so a 0 or empty expiry vanishes": {
      impl: `function createIssuer(newCode) {
  const tokens = [];
  const describe = function (t, now) {
    return { ...t, status: (t.expiresAt !== null && now >= t.expiresAt) ? "expired" : "active" };
  };
  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label, issuedAt: now,
        expiresAt: options.expiresAt || null, maxUses: options.maxUses || null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      return describe(token, now);
    },
    list(now) { return tokens.map((t) => describe(t, now)); }
  };
}`,
      expect: "issue returns the new token"
    }
  }
};

/* ========================================================== stage 3: rules */

const PATTERN =
  "/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}(-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){2}$/";

/** The stage 3 answer, as a template the mistakes below vary one line of.
 *  Written out rather than assembled from fragments so each mistake reads as
 *  a complete, plausible submission. */
const correctRules = (over = {}) => `const DENIED = ${over.denied ?? '"That code can\'t be used."'};
const P = ${PATTERN};
function norm(raw) { return ${over.norm ?? 'String(raw ?? "").trim().toUpperCase()'}; }

function createIssuer(newCode) {
  const tokens = [];
  const log = [];
  const find = (code) => tokens.find((t) => t.code === code);
  const record = (entry) => log.push(entry);

  function statusOf(token, now) {
    if (token.revokedAt !== null) return "revoked";
    if (token.expiresAt !== null && now ${over.expiryOp ?? ">="} token.expiresAt) return "expired";
    ${over.statusExtra ?? 'if (token.maxUses !== null && token.uses >= token.maxUses) return "exhausted";'}
    return "active";
  }

  function describe(token, now) { return { ...token, status: statusOf(token, now) }; }

  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      record({ type: "issued", code: token.code, at: now });
      return describe(token, now);
    },

    list(now) { return tokens.map((t) => describe(t, now)); },

    redeem(rawCode, now) {
      const code = norm(rawCode);

      if (!P.test(code)) {
        record({ type: "denied", code, at: now, reason: "malformed" });
        return ${over.deniedReturn ?? "{ ok: false, message: DENIED }"};
      }

      const token = find(code);
      if (!token) {
        record({ type: "denied", code, at: now, reason: "unknown" });
        return ${over.unknownReturn ?? over.deniedReturn ?? "{ ok: false, message: DENIED }"};
      }

      const status = statusOf(token, now);
      if (status !== "active") {
        record({ type: "denied", code, at: now, reason: status });
        return ${over.blockedReturn ?? over.deniedReturn ?? "{ ok: false, message: DENIED }"};
      }

      token.uses = token.uses + 1;
      record({ type: "redeemed", code, at: now });
      return ${over.okReturn ??
        "{ ok: true, label: token.label, usesLeft: token.maxUses === null ? null : token.maxUses - token.uses }"};
    },

    revoke(rawCode, now) {
      const token = find(norm(rawCode));
      if (!token) return { ok: false, reason: "unknown" };
      if (token.revokedAt !== null) return { ok: false, reason: "already revoked" };
      token.revokedAt = now;
      record({ type: "revoked", code: token.code, at: now });
      return { ok: true };
    },

    events() { return ${over.eventsReturn ?? "log.map((entry) => ({ ...entry }))"}; }
  };
}`;

const rules = {
  alternatives: {
    "a switch on the status, and the checks nested rather than early-returned": `const DENIED = "That code can't be used.";
const P = ${PATTERN};

function createIssuer(newCode) {
  const tokens = [];
  const log = [];

  function statusOf(t, now) {
    if (t.revokedAt !== null) return "revoked";
    if (t.expiresAt !== null && now >= t.expiresAt) return "expired";
    if (t.maxUses !== null && t.uses >= t.maxUses) return "exhausted";
    return "active";
  }

  function describe(t, now) { return { ...t, status: statusOf(t, now) }; }
  function clean(raw) { return String(raw ?? "").trim().toUpperCase(); }

  return {
    issue(options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      log.push({ type: "issued", code: token.code, at: now });
      return describe(token, now);
    },

    list(now) { return tokens.map((t) => describe(t, now)); },

    redeem(rawCode, now) {
      const code = clean(rawCode);
      let reason = null;
      let token = null;

      if (!P.test(code)) {
        reason = "malformed";
      } else {
        token = tokens.find((t) => t.code === code);
        if (!token) {
          reason = "unknown";
        } else {
          switch (statusOf(token, now)) {
            case "active":
              break;
            default:
              reason = statusOf(token, now);
          }
        }
      }

      if (reason !== null) {
        log.push({ type: "denied", code: code, at: now, reason: reason });
        return { ok: false, message: DENIED };
      }

      token.uses = token.uses + 1;
      log.push({ type: "redeemed", code: code, at: now });
      return {
        ok: true,
        label: token.label,
        usesLeft: token.maxUses === null ? null : token.maxUses - token.uses
      };
    },

    revoke(rawCode, now) {
      const token = tokens.find((t) => t.code === clean(rawCode));
      if (!token) return { ok: false, reason: "unknown" };
      if (token.revokedAt !== null) return { ok: false, reason: "already revoked" };
      token.revokedAt = now;
      log.push({ type: "revoked", code: token.code, at: now });
      return { ok: true };
    },

    events() { return log.map((e) => ({ ...e })); }
  };
}`,

    "the denial built by a helper instead of repeated literals": `const DENIED = "No entry.";
const P = ${PATTERN};

function createIssuer(newCode) {
  const tokens = [];
  const log = [];

  function deny(code, at, reason) {
    log.push({ type: "denied", code: code, at: at, reason: reason });
    return { ok: false, message: DENIED };
  }

  function statusOf(t, now) {
    if (t.revokedAt !== null) return "revoked";
    if (t.expiresAt !== null && now >= t.expiresAt) return "expired";
    if (t.maxUses !== null && t.uses >= t.maxUses) return "exhausted";
    return "active";
  }

  return {
    issue: function (options, now) {
      const label = options && options.label;
      if (typeof label !== "string" || label.trim() === "") throw new TypeError("label");
      const token = {
        code: newCode(), label: label.trim(), issuedAt: now,
        expiresAt: options.expiresAt ?? null, maxUses: options.maxUses ?? null,
        uses: 0, revokedAt: null
      };
      tokens.push(token);
      log.push({ type: "issued", code: token.code, at: now });
      return Object.assign({}, token, { status: statusOf(token, now) });
    },
    list: function (now) {
      return tokens.map(function (t) {
        return Object.assign({}, t, { status: statusOf(t, now) });
      });
    },
    redeem: function (rawCode, now) {
      const code = String(rawCode == null ? "" : rawCode).trim().toUpperCase();
      if (!P.test(code)) return deny(code, now, "malformed");
      const token = tokens.filter(function (t) { return t.code === code; })[0];
      if (!token) return deny(code, now, "unknown");
      const status = statusOf(token, now);
      if (status !== "active") return deny(code, now, status);
      token.uses += 1;
      log.push({ type: "redeemed", code: code, at: now });
      return {
        ok: true, label: token.label,
        usesLeft: token.maxUses === null ? null : token.maxUses - token.uses
      };
    },
    revoke: function (rawCode, now) {
      const code = String(rawCode == null ? "" : rawCode).trim().toUpperCase();
      const token = tokens.filter(function (t) { return t.code === code; })[0];
      if (!token) return { ok: false, reason: "unknown" };
      if (token.revokedAt !== null) return { ok: false, reason: "already revoked" };
      token.revokedAt = now;
      log.push({ type: "revoked", code: code, at: now });
      return { ok: true };
    },
    events: function () {
      return log.map(function (e) { return Object.assign({}, e); });
    }
  };
}`,

    "a different denial wording, used consistently": correctRules({
      denied: '"We could not use that code."'
    }),

    "normalising with toUpperCase before trim": correctRules({
      norm: 'String(raw ?? "").toUpperCase().trim()'
    })
  },

  mistakes: {
    // Every rule enforced correctly, and friendlier to read. That is the bug.
    "chatty messages - the wording says which codes are real": {
      impl: correctRules({
        deniedReturn: '{ ok: false, message: "That code is not one of ours." }',
        unknownReturn: '{ ok: false, message: "No token with that code." }',
        blockedReturn: '{ ok: false, message: "That token is no longer usable." }'
      }),
      expect: "every denial gives the holder the identical message"
    },

    "hands the reason back to the holder": {
      impl: correctRules({
        deniedReturn: '{ ok: false, message: DENIED, reason: "malformed" }',
        unknownReturn: '{ ok: false, message: DENIED, reason: "unknown" }',
        blockedReturn: '{ ok: false, message: DENIED, reason: status }'
      }),
      expect: "a denial carries nothing but ok and message"
    },

    "returns the whole token on success": {
      impl: correctRules({ okReturn: "{ ok: true, token: token }" }),
      expect: "the holder is told the label, the uses left, and nothing else"
    },

    // Deny-list thinking: the check knows about revoked and expired only.
    "forgets exhausted, so a used-up token keeps working": {
      impl: correctRules({ statusExtra: "" }),
      expect: "a one-use token works once and then stops"
    },

    "expiry uses > instead of >=, so the last millisecond is alive twice": {
      impl: correctRules({ expiryOp: ">" }),
      expect: "expiry is the first instant the token is dead"
    },

    "does not normalise, so a code typed in lower case is rejected": {
      impl: correctRules({ norm: "String(raw ?? \"\")" }),
      expect: "the code is trimmed and upper-cased on the way in"
    },

    "events returns the log itself": {
      impl: correctRules({ eventsReturn: "log" }),
      expect: "the log cannot be emptied or added to through events()"
    },

    "trims the raw value directly, so null throws": {
      impl: correctRules({ norm: "raw.trim().toUpperCase()" }),
      expect: "redeem never throws, whatever it is handed"
    }
  }
};

export const stages = { gen, store, rules };
