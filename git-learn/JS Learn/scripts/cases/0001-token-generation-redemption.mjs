/* Wrong-answer cases for b7/0001 — canRedeem.
 *
 *   node scripts/verify-lesson.mjs modules/b7-token-engine/0001-token-generation-redemption.html \
 *        --wrong scripts/cases/0001-token-generation-redemption.mjs
 *
 * Staged: `exercise-1` is the Express route needing Postgres and carries its
 * own per-exercise `unverifiable` reason, so only `redeem` has cases.
 *
 * Two families of mistake, and they fail in opposite directions.
 *
 * The NULL/ZERO family is the one CLAUDE.md keeps warning about, because
 * `max_uses` uses null and 0 for opposite meanings and only one of them is
 * falsy:
 *
 *   `if (token.max_uses)` — treats 0 as unlimited, so a token issued
 *   permitting no uses at all admits everybody.
 *
 *   `new Date(token.expires_at)` before the null check — new Date(null) is
 *   1 January 1970, comfortably in the past, so every token that never
 *   expires reads as expired. This one fails CLOSED and is therefore the
 *   more likely to survive: it looks like tokens "just stopped working".
 *
 * The ORACLE family is subtler and is the reason this exercise exists at
 * all. The lesson computes a 25,000-year keyspace on one screen and then
 * gave four distinguishable error replies on the next. Every mistake here
 * still refuses correctly — `allow` is right in all of them — and leaks
 * anyway, through the response the holder can see:
 *
 *   Different messages per reason: one bit per guess.
 *
 *   404 for a missing code and 403 for a real-but-dead one: turns "guess a
 *   code that works" into "guess a code that EXISTS", which is a much
 *   cheaper problem, and dead tokens get un-paused.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const DENIED = `const DENIED = { status: 404, body: { error: "This link is not valid." } };
function deny(reason) {
  return { allow: false, reason: reason, response: { status: DENIED.status, body: { error: DENIED.body.error } } };
}`;

export const stages = {
  redeem: {
    alternatives: [
      // Explicit null/undefined tests rather than != null.
      `${DENIED}
      function canRedeem(token, ctx) {
        if (token === null || token === undefined) return deny("not_found");
        if (token.status === "revoked") return deny("revoked");
        const exp = token.expires_at;
        if (exp !== null && exp !== undefined && Date.parse(exp) <= ctx.now) return deny("expired");
        const max = token.max_uses;
        if (max !== null && max !== undefined && ctx.useCount >= max) return deny("exhausted");
        if (token.status === "paused") return deny("paused");
        return { allow: true, reason: "ok", response: null };
      }`,

      // Works out the reason first, then builds the result once.
      `${DENIED}
      function canRedeem(token, ctx) {
        const reason = (function () {
          if (!token) return "not_found";
          if (token.status === "revoked") return "revoked";
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return "expired";
          if (token.max_uses != null && ctx.useCount >= token.max_uses) return "exhausted";
          if (token.status === "paused") return "paused";
          return "ok";
        })();
        if (reason === "ok") return { allow: true, reason: "ok", response: null };
        return deny(reason);
      }`,

      // A table of predicates, evaluated in order.
      `${DENIED}
      function canRedeem(token, ctx) {
        if (!token) return deny("not_found");
        const checks = [
          ["revoked",   function (t) { return t.status === "revoked"; }],
          ["expired",   function (t) { return t.expires_at != null && new Date(t.expires_at).getTime() <= ctx.now; }],
          ["exhausted", function (t) { return t.max_uses != null && ctx.useCount >= t.max_uses; }],
          ["paused",    function (t) { return t.status === "paused"; }],
        ];
        for (const pair of checks) {
          if (pair[1](token)) return deny(pair[0]);
        }
        return { allow: true, reason: "ok", response: null };
      }`,
    ],

    mistakes: [
      {
        // Truthiness on max_uses. A token permitting NO uses admits everyone,
        // which is the failure that hands out access rather than withholding it.
        expect: "max_uses 0 permits NO uses at all",
        impl: `${DENIED}
        function canRedeem(token, ctx) {
          if (!token) return deny("not_found");
          if (token.status === "revoked") return deny("revoked");
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return deny("expired");
          if (token.max_uses && ctx.useCount >= token.max_uses) return deny("exhausted");
          if (token.status === "paused") return deny("paused");
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // Parses expires_at before checking null. new Date(null) is 1970,
        // so every never-expiring token reads as expired. Fails closed, so
        // it presents as "tokens stopped working" rather than as a breach.
        expect: "expires_at null means NEVER expires",
        impl: `${DENIED}
        function canRedeem(token, ctx) {
          if (!token) return deny("not_found");
          if (token.status === "revoked") return deny("revoked");
          if (new Date(token.expires_at).getTime() <= ctx.now) return deny("expired");
          if (token.max_uses != null && ctx.useCount >= token.max_uses) return deny("exhausted");
          if (token.status === "paused") return deny("paused");
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // Off-by-one: > instead of >=, so a max_uses of 3 allows a 4th.
        expect: "reaching the limit exhausts it",
        impl: `${DENIED}
        function canRedeem(token, ctx) {
          if (!token) return deny("not_found");
          if (token.status === "revoked") return deny("revoked");
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return deny("expired");
          if (token.max_uses != null && ctx.useCount > token.max_uses) return deny("exhausted");
          if (token.status === "paused") return deny("paused");
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // Precedence: paused tested before expired, so a paused AND expired
        // token logs 'paused' and disagrees with the badge a5/0003 shows.
        expect: "expired outranks paused",
        impl: `${DENIED}
        function canRedeem(token, ctx) {
          if (!token) return deny("not_found");
          if (token.status !== "active") return deny(token.status);
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return deny("expired");
          if (token.max_uses != null && ctx.useCount >= token.max_uses) return deny("exhausted");
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // THE oracle. Refuses correctly every time and explains itself.
        // Note allow/reason are all correct — only `response` leaks.
        expect: "every refusal looks identical from outside",
        impl: `function canRedeem(token, ctx) {
          const out = function (reason, status, message) {
            return { allow: false, reason: reason, response: { status: status, body: { error: message } } };
          };
          if (!token) return out("not_found", 404, "Token not found");
          if (token.status === "revoked") return out("revoked", 403, "This token was revoked");
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) {
            return out("expired", 403, "This token has expired");
          }
          if (token.max_uses != null && ctx.useCount >= token.max_uses) {
            return out("exhausted", 403, "This token has reached its maximum uses");
          }
          if (token.status === "paused") return out("paused", 403, "This token is paused");
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // The same leak, one message but two status codes. Feels safe --
        // the wording gives nothing away -- and 404-vs-403 is the single
        // most useful bit an attacker can have: does this code exist?
        expect: "every refusal looks identical from outside",
        impl: `function canRedeem(token, ctx) {
          const msg = "This link is not valid.";
          const out = function (reason, status) {
            return { allow: false, reason: reason, response: { status: status, body: { error: msg } } };
          };
          if (!token) return out("not_found", 404);
          if (token.status === "revoked") return out("revoked", 403);
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return out("expired", 403);
          if (token.max_uses != null && ctx.useCount >= token.max_uses) return out("exhausted", 403);
          if (token.status === "paused") return out("paused", 403);
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // Over-correction: collapses the INTERNAL reason too, so the
        // response is safe and your own logs can no longer tell a revoked
        // token from a code that was never issued.
        expect: "but the internal reasons stay distinct",
        impl: `${DENIED}
        function canRedeem(token, ctx) {
          if (!token) return deny("denied");
          if (token.status === "revoked") return deny("denied");
          if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return deny("denied");
          if (token.max_uses != null && ctx.useCount >= token.max_uses) return deny("denied");
          if (token.status === "paused") return deny("denied");
          return { allow: true, reason: "ok", response: null };
        }`,
      },
      {
        // Treats a missing row as an allow. The single worst outcome here,
        // and it comes from a plausible "no row means nothing blocks us".
        expect: "a missing token row is not_found",
        impl: `${DENIED}
        function canRedeem(token, ctx) {
          if (token) {
            if (token.status === "revoked") return deny("revoked");
            if (token.expires_at != null && new Date(token.expires_at).getTime() <= ctx.now) return deny("expired");
            if (token.max_uses != null && ctx.useCount >= token.max_uses) return deny("exhausted");
            if (token.status === "paused") return deny("paused");
          }
          return { allow: true, reason: "ok", response: null };
        }`,
      },
    ],
  },
};
