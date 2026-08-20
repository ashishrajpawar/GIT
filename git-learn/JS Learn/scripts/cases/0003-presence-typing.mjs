/* Wrong-answer cases for b5/0003 — canSeePresence.
 *
 *   node scripts/verify-lesson.mjs modules/b5-websocket-server/0003-presence-typing.html \
 *        --wrong scripts/cases/0003-presence-typing.mjs
 *
 * Staged: `exercise-1` is the Node server with Redis fan-out and carries its
 * own per-exercise `unverifiable` reason, so only `presence` has cases.
 *
 * The lesson used to decide this the other way round — "by default, presence
 * is shown; the issuer can add a rule to hide it". That is the a7/0005 shape:
 * a privacy default that leaks, with an opt-out the exposed party has to go
 * and find. CLAUDE.md's governing product rule is the opposite, and it is
 * what settles this: nobody gets anything from the user that the user did not
 * issue them. A courier holding a delivery token was granted a way to ask
 * about a parcel, not a fortnight of the issuer's movements.
 *
 * Almost every mistake below fails OPEN, which is the direction that matters:
 *
 *   Truthiness instead of === true — a rules payload is JSON from a client,
 *   so the string "false" is truthy and grants access.
 *
 *   Checking role before status — a revoked token keeps broadcasting. The
 *   issuer has switched it off and believes the channel is closed, which
 *   makes this worse than the live-token case, not better.
 *
 *   Treating both directions the same — the asymmetry IS the product. The
 *   holder entered the relationship knowingly; the issuer declined to give
 *   them a phone number.
 *
 * The one that fails CLOSED is included on purpose: breaking your own
 * multi-device sync is a real bug, and a rule ordering that produces it is a
 * plausible over-correction once someone has been bitten by the others.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  presence: {
    alternatives: [
      // Positional access, no destructuring.
      `function canSeePresence(ctx) {
        if (ctx.viewerId === ctx.subjectId) return true;
        if (ctx.tokenStatus !== "active") return false;
        if (ctx.viewerRole === "issuer") return true;
        return ctx.sharePresence === true;
      }`,

      // Single boolean expression.
      `function canSeePresence({ viewerId, subjectId, viewerRole, tokenStatus, sharePresence }) {
        return (
          viewerId === subjectId ||
          (tokenStatus === "active" &&
            (viewerRole === "issuer" || sharePresence === true))
        );
      }`,

      // Explicit allow-list on status rather than a not-equal test.
      `function canSeePresence(ctx) {
        if (ctx.viewerId === ctx.subjectId) return true;
        const live = ctx.tokenStatus === "active";
        if (!live) return false;
        if (ctx.viewerRole !== "holder") return true;
        return ctx.sharePresence === true;
      }`,
    ],

    mistakes: [
      {
        // The lesson's original decision: shown unless explicitly hidden.
        expect: "a holder cannot see the issuer's presence by default",
        impl: `function canSeePresence({ viewerId, subjectId, tokenStatus, sharePresence }) {
          if (viewerId === subjectId) return true;
          if (tokenStatus !== "active") return false;
          return sharePresence !== false;
        }`,
      },
      {
        // Truthiness. A rules payload is client JSON: "false", "0" and {}
        // are all truthy, and any of them opens the channel.
        expect: "a truthy non-true value is still a refusal",
        impl: `function canSeePresence({ viewerId, subjectId, viewerRole, tokenStatus, sharePresence }) {
          if (viewerId === subjectId) return true;
          if (tokenStatus !== "active") return false;
          if (viewerRole === "issuer") return true;
          return Boolean(sharePresence);
        }`,
      },
      {
        // Role before status: a revoked token still tells the issuer about
        // the holder, and the issuer thinks they closed it.
        expect: "a revoked token leaks nothing, even to the issuer",
        impl: `function canSeePresence({ viewerId, subjectId, viewerRole, tokenStatus, sharePresence }) {
          if (viewerId === subjectId) return true;
          if (viewerRole === "issuer") return true;
          if (tokenStatus !== "active") return false;
          return sharePresence === true;
        }`,
      },
      {
        // Honours the opt-in but forgets that pausing should suspend it.
        expect: "pausing a token suspends a granted opt-in too",
        impl: `function canSeePresence({ viewerId, subjectId, viewerRole, tokenStatus, sharePresence }) {
          if (viewerId === subjectId) return true;
          if (sharePresence === true) return true;
          if (tokenStatus !== "active") return false;
          return viewerRole === "issuer";
        }`,
      },
      {
        // Symmetric: whatever the issuer gets, the holder gets. Tidy, and it
        // discards the asymmetry the product is built on.
        expect: "a holder cannot see the issuer's presence by default",
        impl: `function canSeePresence({ viewerId, subjectId, tokenStatus }) {
          if (viewerId === subjectId) return true;
          return tokenStatus === "active";
        }`,
      },
      {
        // Over-correction, and the one that fails closed: the identity check
        // is placed after the status check, so your own second device stops
        // seeing your presence the moment a token is revoked.
        expect: "your own presence reaches your own devices regardless",
        impl: `function canSeePresence({ viewerId, subjectId, viewerRole, tokenStatus, sharePresence }) {
          if (tokenStatus !== "active") return false;
          if (viewerId === subjectId) return true;
          if (viewerRole === "issuer") return true;
          return sharePresence === true;
        }`,
      },
      {
        // Reads the rule for the wrong direction: applies the issuer's
        // opt-in as though it governed what the ISSUER may see.
        expect: "the issuer sees the holder's presence",
        impl: `function canSeePresence({ viewerId, subjectId, tokenStatus, sharePresence }) {
          if (viewerId === subjectId) return true;
          if (tokenStatus !== "active") return false;
          return sharePresence === true;
        }`,
      },
    ],
  },
};
