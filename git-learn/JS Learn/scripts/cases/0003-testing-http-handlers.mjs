/**
 * Wrong-answer cases for C1/0003 — handleRedeem.
 *
 *   node scripts/verify-lesson.mjs modules/c1-testing-quality/0003-testing-http-handlers.html \
 *        --wrong scripts/cases/0003-testing-http-handlers.mjs
 *
 * The self-check here is 24 assertions, which is large for this course, and the
 * reason is that most of them are about things that DID NOT happen: no lookup
 * on a malformed code, no conversation on a denial, no token id in a denial
 * log, no code in any log at all. A handler returning the right status while
 * doing the wrong thing on the way is the normal shape of these bugs.
 *
 * The fixture that earns its place: `deaths` runs all five denial paths through
 * a FRESH set of dependencies each and then counts distinct JSON responses. Any
 * one of the five checked alone passes against a handler that answers each
 * cause differently — the requirement only exists across the set.
 */

export const alternatives = {
  "early returns instead of one dead flag": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const malformed = { status: 400, body: { error: "malformed_code" } };
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return malformed;

  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return malformed;

  const token = deps.findByCode(code);
  const deny = function () {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  };

  if (!token) return deny();
  if (token.status === "revoked") return deny();
  if (token.ownerDeleted === true) return deny();
  if (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) return deny();
  if (token.maxUses !== null && token.useCount >= token.maxUses) return deny();

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,

  "the liveness decision pulled into its own function": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function isLive(token, now) {
  if (!token) return false;
  if (token.status === "revoked") return false;
  if (token.ownerDeleted === true) return false;
  if (token.expiresAt !== null && new Date(token.expiresAt) <= now) return false;
  if (token.maxUses !== null && token.useCount >= token.maxUses) return false;
  return true;
}

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };

  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  if (!isLive(token, deps.now)) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: deps.createConversation(token.id) } };
}`,

  "the shape checked group by group instead of with one regex": `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function wellFormed(code) {
  const groups = code.split("-");
  if (groups.length !== 3) return false;
  return groups.every(function (g) {
    return g.length === 4 && g.split("").every(function (c) { return ALPHABET.indexOf(c) !== -1; });
  });
}

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };

  const code = raw.toUpperCase().trim();
  if (!wellFormed(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt != null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses != null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { tokenId: token.id, requestId: req.requestId });
  return { status: 200, body: { conversationId: conversationId } };
}`,
};

export const mistakes = {
  /* The helpful version. Every response is individually reasonable and the
     set of them is a search engine over other people's tokens. */
  "a different answer for each way of being dead": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const deny = function (error, status) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: status, body: { error: error } };
  };

  if (!token) return deny("no_such_code", 404);
  if (token.status === "revoked") return deny("revoked", 410);
  if (token.ownerDeleted === true) return deny("account_closed", 404);
  if (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) return deny("expired", 410);
  if (token.maxUses !== null && token.useCount >= token.maxUses) return deny("use_limit_reached", 429);

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "all five denials are byte-identical",
  },

  /* Responses identical, logs not. The oracle survives in the place that is
     read by more people and kept longer than the database. */
  "the denial log carries the token id when there is one": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    const fields = { requestId: req.requestId };
    if (token) fields.tokenId = token.id;
    deps.log("redeem_denied", fields);
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "a denial log says nothing about the token, even when there is one",
  },

  /* The code written into the log, which undoes the reason it was moved out
     of the URL in the first place. */
  "the code logged so the denial can be investigated": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId, code: code });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "no log line anywhere contains the token code",
  },

  /* Validating the raw string. Everything works for anyone who types in
     capitals, which includes everyone who wrote the tests. */
  "the shape checked before normalising": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  if (!SHAPE.test(raw)) return { status: 400, body: { error: "malformed_code" } };

  const code = raw.trim().toUpperCase();
  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "a lower-case code with spaces still redeems",
  },

  /* maxUses read for truthiness. A token issued to permit no uses at all
     permits unlimited ones, and 0 is the value someone picks deliberately. */
  "the use limit tested for truthiness": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "maxUses 0 permits nothing, even though 0 is falsy",
  },

  /* The expiry parsed without the null guard. Every token that never expires
     expired in 1970 — met for the third time in this module, now inside a
     compound condition where it is much harder to see. */
  "no null guard on the expiry": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    new Date(token.expiresAt) <= deps.now ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "expiresAt null means never expires",
  },

  /* Acting before deciding. The status is right and a conversation row now
     exists for a revoked token — the kind of bug that is invisible in the
     response and visible in the database a month later. */
  "the conversation created before the token is judged": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  if (!token) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);

  const dead = token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "a denied redemption creates no conversation",
  },

  /* Looking up first and validating after. The answer is right and an
     attacker-controlled string of any shape has been put on the database
     path to get it. */
  "the lookup done before the shape check": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const raw = req.body && req.body.code;
  if (typeof raw !== "string") return { status: 400, body: { error: "malformed_code" } };
  const code = raw.trim().toUpperCase();

  const token = deps.findByCode(code);
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "a malformed code is never looked up",
  },

  /* No guard on the body at all. A request with no code crashes the handler,
     which in production is a 500 for input a stranger controls. */
  "the code assumed to be a string": {
    impl: `
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHAPE = new RegExp("^[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}-[" + ALPHABET + "]{4}$");

function handleRedeem(req, deps) {
  const code = req.body.code.trim().toUpperCase();
  if (!SHAPE.test(code)) return { status: 400, body: { error: "malformed_code" } };

  const token = deps.findByCode(code);
  const dead = !token || token.status === "revoked" || token.ownerDeleted === true ||
    (token.expiresAt !== null && new Date(token.expiresAt) <= deps.now) ||
    (token.maxUses !== null && token.useCount >= token.maxUses);

  if (dead) {
    deps.log("redeem_denied", { requestId: req.requestId });
    return { status: 404, body: { error: "invalid_or_expired" } };
  }

  const conversationId = deps.createConversation(token.id);
  deps.log("redeem_ok", { requestId: req.requestId, tokenId: token.id });
  return { status: 200, body: { conversationId: conversationId } };
}`,
    expect: "Cannot read properties of undefined",
  },
};
