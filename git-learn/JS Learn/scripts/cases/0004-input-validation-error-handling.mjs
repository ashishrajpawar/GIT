/* Wrong-answer cases for b3/0004 — toErrorResponse.
 *
 *   node scripts/verify-lesson.mjs modules/b3-node-http-server/0004-input-validation-error-handling.html \
 *        --wrong scripts/cases/0004-input-validation-error-handling.mjs
 *
 * Staged: `exercise-1` is Express middleware plus Zod schemas and carries its
 * own per-exercise `unverifiable` reason, so only `errors` has cases.
 *
 * This is the third layer the same rule has had to be applied at — after
 * b7/0001's redemption endpoint and a8/0002's redemption page — and it is the
 * layer where it is hardest to see, because being helpful in an error is
 * normally the mark of a good API rather than a leak.
 *
 * The mistakes divide cleanly:
 *
 * TOO HELPFUL, and every one of them is what a well-intentioned handler does.
 * Returning Zod's field details to everybody. Letting an ApiError's own status
 * through on a public route, so a revoked token answers 403 and an unknown one
 * 404. Passing err.message from an unknown throw, which is where a driver's
 * "null value in column code_hash" ends up in a JSON response.
 *
 * TOO TRUSTING: taking err.status without checking it. Something shaped like
 * an ApiError with `status: undefined` reaches res.status(undefined), which
 * throws INSIDE the error handler — the one place an exception has nowhere
 * left to go.
 *
 * One fails the other way, refusing to give an authenticated owner their field
 * errors. That is the plausible over-correction once the oracle argument has
 * landed, and it is wrong for the same reason the oracle is: the rule is about
 * who is asking, not about what is being said.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const HEAD = `const DENIAL = { error: "That request could not be completed.", success: false };
const SERVER = { error: "Internal server error", success: false };
function serverError() { return { status: 500, body: Object.assign({}, SERVER) }; }
function publicDenial() { return { status: 404, body: Object.assign({}, DENIAL) }; }
function saneStatus(s) { return typeof s === "number" && s >= 400 && s <= 599; }`;

export const stages = {
  errors: {
    alternatives: [
      // switch on kind, with the guards up front.
      `${HEAD}
      function toErrorResponse(err, ctx) {
        const kind = err && err.kind;
        if (kind !== "validation" && kind !== "api") return serverError();
        if (kind === "api" && !saneStatus(err.status)) return serverError();
        if (!ctx || !ctx.authenticated) return publicDenial();
        switch (kind) {
          case "validation":
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          default:
            return { status: err.status, body: { error: err.message, success: false } };
        }
      }`,

      // Works out a "safe to explain" boolean first.
      `${HEAD}
      function toErrorResponse(err, ctx) {
        const kind = err && err.kind;
        const isBug = (kind !== "validation" && kind !== "api") ||
                      (kind === "api" && !saneStatus(err.status));
        if (isBug) return serverError();

        const mayExplain = Boolean(ctx && ctx.authenticated === true);
        if (!mayExplain) return publicDenial();

        if (kind === "validation") {
          const details = [];
          for (const i of err.issues || []) details.push({ field: i.field, message: i.message });
          return { status: 400, body: { error: "Validation failed", details: details, success: false } };
        }
        return { status: err.status, body: { error: err.message, success: false } };
      }`,
    ],

    mistakes: [
      {
        // Field details for everybody. The format oracle, and the single
        // most natural thing to write.
        expect: "a public endpoint never returns field details",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (kind === "validation") {
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          }
          if (kind === "api" && saneStatus(err.status)) {
            if (!ctx || !ctx.authenticated) return publicDenial();
            return { status: err.status, body: { error: err.message, success: false } };
          }
          return serverError();
        }`,
      },
      {
        // Public callers get the generic BODY but the api error's own
        // STATUS, so revoked answers 403 and unknown answers 404.
        expect: "a public endpoint does not distinguish revoked from unknown",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (kind !== "validation" && kind !== "api") return serverError();
          if (kind === "api" && !saneStatus(err.status)) return serverError();
          if (!ctx || !ctx.authenticated) {
            const status = kind === "api" ? err.status : 400;
            return { status: status, body: Object.assign({}, DENIAL) };
          }
          if (kind === "validation") {
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          }
          return { status: err.status, body: { error: err.message, success: false } };
        }`,
      },
      {
        // Leaks err.message on a 500 for authenticated callers -- which
        // sounds defensible right up until you read what a pg driver puts
        // in that string.
        expect: "err.message never reaches the client, authenticated or not",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (kind !== "validation" && kind !== "api") {
            const authed = Boolean(ctx && ctx.authenticated);
            return {
              status: 500,
              body: { error: authed ? String(err && err.message) : SERVER.error, success: false },
            };
          }
          if (kind === "api" && !saneStatus(err.status)) return serverError();
          if (!ctx || !ctx.authenticated) return publicDenial();
          if (kind === "validation") {
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          }
          return { status: err.status, body: { error: err.message, success: false } };
        }`,
      },
      {
        // Trusts err.status. res.status(undefined) throws inside the error
        // handler, which is the one place there is nothing left to catch it.
        expect: "an api error with no status is treated as a bug",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (kind !== "validation" && kind !== "api") return serverError();
          if (!ctx || !ctx.authenticated) return publicDenial();
          if (kind === "validation") {
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          }
          return { status: err.status, body: { error: err.message, success: false } };
        }`,
      },
      {
        // Checks the status is a number but not that it means failure, so
        // an error path can return 200 and the client sees success.
        expect: "an api error with a success status is treated as a bug",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (kind !== "validation" && kind !== "api") return serverError();
          if (kind === "api" && typeof err.status !== "number") return serverError();
          if (!ctx || !ctx.authenticated) return publicDenial();
          if (kind === "validation") {
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          }
          return { status: err.status, body: { error: err.message, success: false } };
        }`,
      },
      {
        // The over-correction: nobody gets field errors, ever. Wrong for
        // the same reason the oracle is -- the rule is about WHO is asking.
        expect: "an authenticated validation error names the field",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (kind !== "validation" && kind !== "api") return serverError();
          if (kind === "api" && !saneStatus(err.status)) return serverError();
          if (kind === "validation") {
            return { status: 400, body: { error: "Validation failed", success: false } };
          }
          if (!ctx || !ctx.authenticated) return publicDenial();
          return { status: err.status, body: { error: err.message, success: false } };
        }`,
      },
      {
        // Public denial for unknown errors too, so a 500 is reported as a
        // 404 and the outage is invisible in the metrics that matter.
        //
        // This one passed every check when it was written, which is why the
        // self-check now has a public-caller 500 case at all. Keep it: it is
        // what guards that check.
        expect: "an unknown error is 500 even for a public caller",
        impl: `${HEAD}
        function toErrorResponse(err, ctx) {
          const kind = err && err.kind;
          if (!ctx || !ctx.authenticated) return publicDenial();
          if (kind !== "validation" && kind !== "api") return serverError();
          if (kind === "api" && !saneStatus(err.status)) return serverError();
          if (kind === "validation") {
            return {
              status: 400,
              body: {
                error: "Validation failed",
                details: (err.issues || []).map(function (i) {
                  return { field: i.field, message: i.message };
                }),
                success: false,
              },
            };
          }
          return { status: err.status, body: { error: err.message, success: false } };
        }`,
      },
    ],
  },
};
