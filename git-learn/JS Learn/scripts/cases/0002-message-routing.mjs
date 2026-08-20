/* Wrong-answer cases for b5/0002 — deliveryPlan.
 *
 *   node scripts/verify-lesson.mjs modules/b5-websocket-server/0002-message-routing.html \
 *        --wrong scripts/cases/0002-message-routing.mjs
 *
 * Staged: `exercise-1` is the Node router and carries its own per-exercise
 * `unverifiable` reason, so only `plan` has cases.
 *
 * The lesson shipped the first mistake below as its actual implementation,
 * with the comment "If no sockets — user is offline". That is the ADR-0003
 * violation this whole exercise exists to correct: the local map answers
 * "which sockets do I write to" and NOTHING else. Whether a user is reachable
 * is a Redis presence key.
 *
 * Every mistake here is invisible on one box. That is the point of the module
 * and the reason these are worth writing down:
 *
 *   Treating a local miss as offline — messages to users on another replica
 *   are silently dropped, and a push notification is sent to someone who is
 *   sitting there with the app open.
 *
 *   Republishing a pub/sub message — an infinite loop across the cluster,
 *   which needs two nodes to exist before it can happen at all.
 *
 *   Not ignoring your own echo — every message delivered twice to every
 *   socket on the originating node, because you are subscribed to the
 *   channel you published on.
 *
 *   Publishing only when you hold no sockets — treats local delivery and
 *   publishing as alternatives. They are not: holding ONE of a user's
 *   sockets says nothing about the other three.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  plan: {
    alternatives: [
      // A lookup table keyed by origin.
      `function deliveryPlan(ctx) {
        const holds = ctx.localSockets > 0;
        const byOrigin = {
          echo:   { writeLocal: false, publish: false, queuePush: false },
          pubsub: { writeLocal: holds, publish: false, queuePush: false },
          client: { writeLocal: holds, publish: true,  queuePush: !ctx.presentAnywhere },
        };
        return byOrigin[ctx.origin];
      }`,

      // Builds the result then narrows it, rather than branching early.
      `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
        const out = { writeLocal: false, publish: false, queuePush: false };
        if (origin === "echo") return out;
        out.writeLocal = localSockets > 0;
        if (origin === "client") {
          out.publish = true;
          out.queuePush = presentAnywhere !== true;
        }
        return out;
      }`,

      // Explicit if/else chain with no destructuring.
      `function deliveryPlan(ctx) {
        if (ctx.origin === "echo") {
          return { writeLocal: false, publish: false, queuePush: false };
        }
        if (ctx.origin === "pubsub") {
          return { writeLocal: ctx.localSockets >= 1, publish: false, queuePush: false };
        }
        return {
          writeLocal: ctx.localSockets >= 1,
          publish: true,
          queuePush: ctx.presentAnywhere === false,
        };
      }`,
    ],

    mistakes: [
      {
        // The lesson's shipped implementation. No publish at all, and a
        // local miss is reported as offline.
        expect: "no socket here but present elsewhere -> still publish, no push",
        impl: `function deliveryPlan({ origin, localSockets }) {
          if (origin === "echo") return { writeLocal: false, publish: false, queuePush: false };
          const holds = localSockets > 0;
          return { writeLocal: holds, publish: false, queuePush: !holds };
        }`,
      },
      {
        // Publishes correctly but still decides "offline" from the local
        // map, so a user on another replica gets a spurious push.
        expect: "no socket here but present elsewhere -> still publish, no push",
        impl: `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
          if (origin === "echo") return { writeLocal: false, publish: false, queuePush: false };
          if (origin === "pubsub") return { writeLocal: localSockets > 0, publish: false, queuePush: false };
          return { writeLocal: localSockets > 0, publish: true, queuePush: localSockets === 0 };
        }`,
      },
      {
        // Treats local delivery and publishing as alternatives. A user with
        // a socket here AND a socket elsewhere only gets it on one device.
        expect: "holding one socket does not excuse us from publishing",
        impl: `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
          if (origin === "echo") return { writeLocal: false, publish: false, queuePush: false };
          const holds = localSockets > 0;
          if (origin === "pubsub") return { writeLocal: holds, publish: false, queuePush: false };
          if (holds) return { writeLocal: true, publish: false, queuePush: false };
          return { writeLocal: false, publish: true, queuePush: !presentAnywhere };
        }`,
      },
      {
        // Republishes what it received. Two nodes and this never stops.
        expect: "a pubsub message is delivered locally but never republished",
        impl: `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
          if (origin === "echo") return { writeLocal: false, publish: false, queuePush: false };
          return {
            writeLocal: localSockets > 0,
            publish: true,
            queuePush: origin === "client" && !presentAnywhere,
          };
        }`,
      },
      {
        // Every node that sees the message decides about the push, so the
        // recipient collects one notification per replica.
        expect: "a pubsub message never queues its own push",
        impl: `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
          if (origin === "echo") return { writeLocal: false, publish: false, queuePush: false };
          if (origin === "pubsub") {
            return { writeLocal: localSockets > 0, publish: false, queuePush: !presentAnywhere };
          }
          return { writeLocal: localSockets > 0, publish: true, queuePush: !presentAnywhere };
        }`,
      },
      {
        // Does not recognise its own echo, so everything on the originating
        // node is delivered twice. Looks completely reasonable.
        expect: "our own echo is ignored entirely",
        impl: `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
          const holds = localSockets > 0;
          if (origin === "client") {
            return { writeLocal: holds, publish: true, queuePush: !presentAnywhere };
          }
          return { writeLocal: holds, publish: false, queuePush: false };
        }`,
      },
      {
        // Never writes locally on a pub/sub message — assumes the channel
        // is only for "other" nodes. The node holding the socket is exactly
        // the one that must write, so nothing is ever delivered cross-node.
        expect: "a pubsub message is delivered locally but never republished",
        impl: `function deliveryPlan({ origin, localSockets, presentAnywhere }) {
          if (origin !== "client") return { writeLocal: false, publish: false, queuePush: false };
          return { writeLocal: localSockets > 0, publish: true, queuePush: !presentAnywhere };
        }`,
      },
    ],
  },
};
