/* Wrong-answer cases for a7/0004 — decideIncoming.
 *
 *   node scripts/verify-lesson.mjs modules/a7-voice-video/0004-incoming-calls.html \
 *        --wrong scripts/cases/0004-incoming-calls.mjs
 *
 * Staged: `exercise-1` is CallKit, VoIP push and an Android foreground
 * service, and carries its own per-exercise `unverifiable` reason, so only
 * `incoming` has cases.
 *
 * The invariant under test is a RESOURCE BALANCE, not a display rule: a call
 * reported to CallKit must be ended exactly once. Miss it and iOS keeps
 * showing a system call screen for a call that is over — sometimes until the
 * phone is restarted. Do it twice and you are calling endCall against a UUID
 * CallKit has already forgotten.
 *
 * Both failures come from the same instinct, which is why "always end" and
 * "never end" are each half right:
 *
 *   Declining IN-APP owes CallKit an endCall, because nothing else will
 *   send one.
 *
 *   Declining NATIVELY owes it nothing, because CallKit ended the call
 *   itself before telling you.
 *
 * One line apart, identical from the user's side, opposite correct answers.
 *
 * Note what several of these cases have in common: they are only visible
 * across a SEQUENCE. A handler that double-ends looks perfect on its own and
 * fails when the second event arrives 40ms later — which is why the self-check
 * has a `run()` helper and asks about totals rather than single returns.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    terminalGuard: `if (call.status === "ended") return nothing;`,
    notifyGuard: `if (call.reported) return nothing;`,
    acceptGuard: `if (call.status === "accepted") return nothing;`,
    // What an in-app accept tells the native layer.
    acceptInAppNative: `...(call.reported ? ["answer-native"] : []),`,
    // What an in-app decline tells the native layer.
    declineInAppNative: `...(call.reported ? ["end-native"] : []),`,
    // What a native decline tells the native layer.
    declineNativeNative: ``,
    // Whether a cancelled/timed-out call sends a reject back.
    cancelSends: ``,
    ...overrides,
  };

  return `function decideIncoming(call, event) {
  const nothing = { call: call, actions: [] };

  ${o.terminalGuard}

  const screen = call.type === "video" ? "VideoCall" : "VoiceCall";

  switch (event.kind) {
    case "notify":
      ${o.notifyGuard}
      return {
        call: { ...call, reported: true },
        actions: ["report-native"],
      };

    case "accept-in-app":
      ${o.acceptGuard}
      return {
        call: { ...call, status: "accepted" },
        actions: [
          "stop-ringtone",
          ${o.acceptInAppNative}
          "send:call:accept",
          "navigate:" + screen,
        ],
      };

    case "accept-native":
      ${o.acceptGuard}
      return {
        call: { ...call, status: "accepted" },
        actions: ["stop-ringtone", "send:call:accept", "navigate:" + screen],
      };

    case "decline-in-app":
      return {
        call: { ...call, status: "ended" },
        actions: [
          "stop-ringtone",
          ${o.declineInAppNative}
          "send:call:reject",
          "dismiss",
        ],
      };

    case "decline-native":
      return {
        call: { ...call, status: "ended" },
        actions: [
          "stop-ringtone",
          ${o.declineNativeNative}
          "send:call:reject",
          "dismiss",
        ],
      };

    case "caller-cancelled":
    case "timeout":
      return {
        call: { ...call, status: "ended" },
        actions: [
          "stop-ringtone",
          ...(call.reported ? ["end-native"] : []),
          ${o.cancelSends}
          "dismiss",
        ],
      };

    default:
      return nothing;
  }
}`;
}

export const stages = {
  incoming: {
    alternatives: [
      // A lookup table of what each event owes CallKit and owes the caller,
      // assembled at the end. Deliberately expresses the same rules as data,
      // to prove the answer is the behaviour and not the switch statement.
      `function decideIncoming(call, event) {
        if (call.status === "ended") return { call: call, actions: [] };

        const PLAN = {
          "accept-in-app":    { next: "accepted", native: "answer", tell: "accept", go: true },
          "accept-native":    { next: "accepted", native: null,     tell: "accept", go: true },
          "decline-in-app":   { next: "ended",    native: "end",    tell: "reject", go: false },
          "decline-native":   { next: "ended",    native: null,     tell: "reject", go: false },
          "caller-cancelled": { next: "ended",    native: "end",    tell: null,     go: false },
          "timeout":          { next: "ended",    native: "end",    tell: null,     go: false },
        };

        if (event.kind === "notify") {
          if (call.reported) return { call: call, actions: [] };
          return {
            call: Object.assign({}, call, { reported: true }),
            actions: ["report-native"],
          };
        }

        const plan = PLAN[event.kind];
        if (!plan) return { call: call, actions: [] };
        if (plan.next === "accepted" && call.status === "accepted") {
          return { call: call, actions: [] };
        }

        const actions = ["stop-ringtone"];
        if (plan.native === "answer" && call.reported) actions.push("answer-native");
        if (plan.native === "end" && call.reported) actions.push("end-native");
        if (plan.tell) actions.push("send:call:" + plan.tell);
        if (plan.go) {
          actions.push("navigate:" + (call.type === "video" ? "VideoCall" : "VoiceCall"));
        } else {
          actions.push("dismiss");
        }

        return { call: Object.assign({}, call, { status: plan.next }), actions: actions };
      }`,

      // If/else chain, pushing into an array, with the guards expressed as
      // early returns on a separate "live" check.
      `function decideIncoming(call, event) {
        const none = { call: call, actions: [] };
        const live = call.status !== "ended";
        if (!live) return none;

        const kind = event.kind;
        const screen = call.type === "video" ? "VideoCall" : "VoiceCall";
        const out = [];

        if (kind === "notify") {
          if (call.reported === true) return none;
          return { call: Object.assign({}, call, { reported: true }), actions: ["report-native"] };
        }

        if (kind === "accept-in-app" || kind === "accept-native") {
          if (call.status === "accepted") return none;
          out.push("stop-ringtone");
          if (kind === "accept-in-app" && call.reported) out.push("answer-native");
          out.push("send:call:accept");
          out.push("navigate:" + screen);
          return { call: Object.assign({}, call, { status: "accepted" }), actions: out };
        }

        if (kind === "decline-in-app" || kind === "decline-native") {
          out.push("stop-ringtone");
          if (kind === "decline-in-app" && call.reported) out.push("end-native");
          out.push("send:call:reject");
          out.push("dismiss");
          return { call: Object.assign({}, call, { status: "ended" }), actions: out };
        }

        if (kind === "caller-cancelled" || kind === "timeout") {
          out.push("stop-ringtone");
          if (call.reported) out.push("end-native");
          out.push("dismiss");
          return { call: Object.assign({}, call, { status: "ended" }), actions: out };
        }

        return none;
      }`,
    ],

    mistakes: [
      {
        // The phantom call. Declining in-app never tells CallKit, so iOS goes
        // on showing a call that ended — the single most visible bug in this
        // whole module, and invisible in any simulator test that only ever
        // declines from the native screen.
        expect: "declining in-app ends the native call exactly once",
        impl: build({ declineInAppNative: `` }),
      },
      {
        // "Always end" — the obvious fix for the above, and the opposite
        // error. CallKit already ended the call before it told you.
        expect: "declining on the native screen must NOT end it again",
        impl: build({ declineNativeNative: `...(call.reported ? ["end-native"] : []),` }),
      },
      {
        // No terminal guard. Every rule is right and the double-end arrives
        // anyway, because a decline and CallKit's own endCall event both
        // land within a frame of each other.
        expect: "after CallKit ends a call itself, a later in-app decline sends nothing",
        impl: build({ terminalGuard: `` }),
      },
      {
        // Ends the call instead of answering it, on an in-app accept. The
        // call is taken and immediately hung up by your own code.
        expect: "accepting in-app must not END the native call",
        impl: build({ acceptInAppNative: `...(call.reported ? ["end-native"] : []),` }),
      },
      {
        // Tells CallKit nothing on an in-app accept, so the system call
        // screen keeps ringing over the top of the call you just answered.
        expect: "accepting in-app ANSWERS the native call",
        impl: build({ acceptInAppNative: `` }),
      },
      {
        // Ends natively on an accept-native too. CallKit is moving that call
        // to active, and this hangs it up.
        expect: "accepting on the native screen needs no native action back",
        impl: build({
          acceptGuard: `if (call.status === "accepted") return nothing;`,
        }).replace(
          `      return {
        call: { ...call, status: "accepted" },
        actions: ["stop-ringtone", "send:call:accept", "navigate:" + screen],
      };`,
          `      return {
        call: { ...call, status: "accepted" },
        actions: ["stop-ringtone", "answer-native", "send:call:accept", "navigate:" + screen],
      };`
        ),
      },
      {
        // No dedup on notify. VoIP push reports it, then the socket delivers
        // the same call when the app foregrounds, and two call screens appear.
        expect: "the same call arriving twice is reported once",
        impl: build({ notifyGuard: `` }),
      },
      {
        // No accept guard. A double tap, or an in-app accept racing the
        // native one, pushes two call screens and sends two accepts.
        expect: "accepting twice navigates once",
        impl: build({ acceptGuard: `` }),
      },
      {
        // Sends a reject when the CALLER hung up. They are already gone; the
        // server sees a reject for a call it has torn down, and on a slower
        // path it can arrive as a reject for the caller's NEXT call.
        expect: "a cancelled call ends natively but sends no reject",
        impl: build({ cancelSends: `"send:call:reject",` }),
      },
      {
        // Ends natively whether or not the call was ever reported — endCall
        // against a UUID CallKit never received. Harmless on Android and an
        // exception on iOS, so it survives whichever platform you test on.
        expect: "a call never reported is never ended",
        impl: build({ declineInAppNative: `"end-native",` }),
      },
    ],
  },
};
