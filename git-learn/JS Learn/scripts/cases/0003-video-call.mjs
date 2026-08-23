/* Wrong-answer cases for a7/0003 — videoStage.
 *
 *   node scripts/verify-lesson.mjs modules/a7-voice-video/0003-video-call.html \
 *        --wrong scripts/cases/0003-video-call.mjs
 *
 * Staged: `exercise-1` is the React Native video screen and carries its own
 * per-exercise `unverifiable` reason, so only `stage` has cases.
 *
 * This function is almost entirely PRECEDENCE, which is why most of the
 * mistakes below get every individual rule right and still produce the wrong
 * screen. Several conditions are true at once — the call has ended AND their
 * camera was off AND there is no stream — and the exercise is deciding which
 * true statement is the useful one.
 *
 * The four failure modes:
 *
 *   Collapsing null into false. `if (!peerVideoEnabled)` treats "they have
 *   not told us" as "they told us it is off", so an older client that never
 *   sends call:media has its perfectly good video replaced by a notice for
 *   the whole call. Same three-state trap as `a2/0002`'s Partial<T> and
 *   `c5/0004`'s gone-vs-not-fetched.
 *
 *   Using callState === 'connected' where everConnected is meant. During a
 *   blip the first is false, so a four-minute call falls back to
 *   "Connecting..." — the exact defect this lesson shipped, and the same one
 *   `0002` had in its clock.
 *
 *   Blanking the screen during a blip instead of holding the last frame.
 *
 *   Getting the precedence order wrong, which is invisible until two
 *   conditions coincide.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    fallbackName: `view.holderName || "They"`,
    endedTest: `view.callState === "failed" || view.callState === "closed"`,
    connectingTest: `!view.everConnected`,
    blipTest: `view.callState === "disconnected"`,
    blipReturn: `{ video: view.hasRemoteStream, notice: "Reconnecting..." }`,
    cameraOffTest: `view.peerVideoEnabled === false`,
    // The rule order itself, so a case can reorder without retyping the rules.
    order: ["ended", "connecting", "blip", "cameraOff", "waiting"],
    ...overrides,
  };

  const rules = {
    ended: `  if (${o.endedTest}) {
    return { video: false, notice: "Call ended" };
  }`,
    connecting: `  if (${o.connectingTest}) {
    return { video: false, notice: "Connecting..." };
  }`,
    blip: `  if (${o.blipTest}) {
    return ${o.blipReturn};
  }`,
    cameraOff: `  if (${o.cameraOffTest}) {
    return { video: false, notice: holder + " turned their camera off" };
  }`,
    waiting: `  if (!view.hasRemoteStream) {
    return { video: false, notice: "Waiting for video..." };
  }`,
  };

  return `function videoStage(view) {
  const holder = ${o.fallbackName};

${o.order.map((k) => rules[k]).join("\n\n")}

  return { video: true, notice: null };
}`;
}

export const stages = {
  stage: {
    alternatives: [
      // A table of [test, result] pairs walked in order. Same precedence,
      // expressed as data rather than as control flow.
      `function videoStage(view) {
        const holder = view.holderName ? view.holderName : "They";
        const ended = view.callState === "failed" || view.callState === "closed";

        const rules = [
          [ended, function () { return { video: false, notice: "Call ended" }; }],
          [!view.everConnected, function () { return { video: false, notice: "Connecting..." }; }],
          [view.callState === "disconnected", function () {
            return { video: view.hasRemoteStream === true, notice: "Reconnecting..." };
          }],
          [view.peerVideoEnabled === false, function () {
            return { video: false, notice: holder + " turned their camera off" };
          }],
          [view.hasRemoteStream !== true, function () {
            return { video: false, notice: "Waiting for video..." };
          }],
        ];

        for (let i = 0; i < rules.length; i++) {
          if (rules[i][0]) return rules[i][1]();
        }
        return { video: true, notice: null };
      }`,

      // A switch on a derived phase name, then one mapping to the output.
      // Deliberately computes the phase first and the strings second.
      `function videoStage(view) {
        const holder = (view.holderName === undefined || view.holderName === null || view.holderName === "")
          ? "They"
          : view.holderName;

        let phase;
        if (view.callState === "failed" || view.callState === "closed") {
          phase = "ended";
        } else if (view.everConnected !== true) {
          phase = "connecting";
        } else if (view.callState === "disconnected") {
          phase = "blip";
        } else if (view.peerVideoEnabled === false) {
          phase = "cameraOff";
        } else if (!view.hasRemoteStream) {
          phase = "waiting";
        } else {
          phase = "live";
        }

        switch (phase) {
          case "ended":      return { video: false, notice: "Call ended" };
          case "connecting": return { video: false, notice: "Connecting..." };
          case "blip":       return { video: !!view.hasRemoteStream, notice: "Reconnecting..." };
          case "cameraOff":  return { video: false, notice: holder + " turned their camera off" };
          case "waiting":    return { video: false, notice: "Waiting for video..." };
          default:           return { video: true, notice: null };
        }
      }`,
    ],

    mistakes: [
      {
        // The three-state collapse. Every rule is otherwise right, and every
        // client that does not send call:media loses its video permanently.
        expect: "'not told' shows the video, it is not 'camera off'",
        impl: build({ cameraOffTest: `!view.peerVideoEnabled` }),
      },
      {
        // The defect the lesson shipped, in its new home: asking whether the
        // call is connected RIGHT NOW rather than whether it ever was. During
        // an eight-second blip a live call reads "Connecting...".
        expect: "a blip keeps the last frame and labels it",
        impl: build({ connectingTest: `view.callState !== "connected"` }),
      },
      {
        // Blanks the viewport during a blip instead of holding the frame.
        // Looks tidier and reads to the user as a dropped call.
        expect: "a blip keeps the last frame and labels it",
        impl: build({ blipReturn: `{ video: false, notice: "Reconnecting..." }` }),
      },
      {
        // Camera-off checked before the ended case. Both statements are true
        // for a call that ended while their camera was off, and this one
        // reports the useless half — so the screen never says the call is over.
        expect: "'Call ended' outranks a camera-off notice that is also true",
        impl: build({ order: ["cameraOff", "ended", "connecting", "blip", "waiting"] }),
      },
      {
        // Connecting checked before ended, so a call that FAILED before ever
        // connecting shows a spinner that waits for ever.
        expect: "a call that failed before connecting is 'Call ended', not 'Connecting...'",
        impl: build({ order: ["connecting", "ended", "blip", "cameraOff", "waiting"] }),
      },
      {
        // Camera-off ahead of the blip. During a reconnection we no longer
        // know whether that camera state is current, and the user is told
        // about a camera when their problem is the network.
        expect: "'Reconnecting...' outranks a camera-off we may no longer be sure of",
        impl: build({ order: ["ended", "connecting", "cameraOff", "blip", "waiting"] }),
      },
      {
        // Treats any 'disconnected' as a blip, including one before the call
        // ever connected — claiming to reconnect to something never reached.
        expect: "'disconnected' before ever connecting is still 'Connecting...'",
        impl: build({ order: ["ended", "blip", "connecting", "cameraOff", "waiting"] }),
      },
      {
        // No 'waiting' rule: falls through to showing video that is not
        // there. RTCView with a null stream renders nothing, so the user gets
        // a blank screen with no text at all.
        expect: "connected with no stream yet is 'Waiting for video...'",
        impl: build({ order: ["ended", "connecting", "blip", "cameraOff"] }),
      },
      {
        // ?? instead of ||. Empty string is not null, so it survives, and the
        // notice reads " turned their camera off" with a leading space.
        // Exactly a11/0003's finding: '' passed validation and rendered as
        // nothing, because ?? catches null and not ''.
        expect: "an empty holderName falls back to 'They'",
        impl: build({ fallbackName: `view.holderName ?? "They"` }),
      },
      {
        // No camera-off rule at all — the shape the lesson shipped, where
        // the viewport is decided by whether a stream object exists. The
        // stream IS there when they disable their camera, so RTCView renders
        // black and the screen says nothing about why.
        expect: "an explicit camera-off names the person instead of showing black",
        impl: build({ order: ["ended", "connecting", "blip", "waiting"] }),
      },
    ],
  },
};
