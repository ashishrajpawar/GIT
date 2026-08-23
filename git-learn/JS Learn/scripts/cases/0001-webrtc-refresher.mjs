/* Wrong-answer cases for a7/0001 — ingestSignal.
 *
 *   node scripts/verify-lesson.mjs modules/a7-voice-video/0001-webrtc-refresher.html \
 *        --wrong scripts/cases/0001-webrtc-refresher.mjs
 *
 * Staged: `exercise-1` is the react-native-webrtc wrapper class and carries
 * its own per-exercise `unverifiable` reason, so only `ice` has cases.
 *
 * What this function pins down is a RACE, and every mistake below is one that
 * survives testing on a fast network. Two phones on the same Wi-Fi finish
 * negotiating in a few milliseconds and the candidates usually arrive after
 * the offer; on mobile data they usually do not. So the failure is
 * intermittent, and because handleRemoteIce is async and called without
 * await, the InvalidStateError becomes an unhandled rejection that logs
 * nothing. The bug reaches users as "calls sometimes don't connect".
 *
 * The four real failure modes, in the order they are most likely written:
 *
 *   No queue at all — the original line. Applies a candidate to a connection
 *   with no remote description.
 *
 *   Queue, but flushed in the wrong ORDER — candidates ahead of the
 *   description, which throws exactly as if there were no queue.
 *
 *   Queue flushed on 'offer' only — works perfectly for the callee and loses
 *   every candidate on the caller side, so half of each call is broken and
 *   whichever side you happen to debug looks correct.
 *
 *   Unbounded queue — correct for every honest peer, and a memory tap for one
 *   that never sends an offer.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// The correct implementation, with the pieces a mistake needs to override
// named as fragments. Each case then differs from the right answer in exactly
// one place BY CONSTRUCTION rather than by care — the lesson learned writing
// b10/0002's cases.
function build(overrides = {}) {
  const o = {
    cap: 64,
    // How a flush orders the description against the backlog.
    flushOrder: `[{ kind: "remote-description", sdp: msg.sdp },
        ...state.pending.map((candidate) => ({ kind: "ice", candidate }))]`,
    // Which frame types trigger a flush.
    descriptionTypes: `msg.type === "offer" || msg.type === "answer"`,
    // What an ice frame does once the description IS in place.
    readyBranch: `if (state.remoteReady) {
      return { state: state, apply: [{ kind: "ice", candidate: msg.candidate }] };
    }`,
    // What happens to an ice frame before the description arrives.
    bufferBranch: `if (state.pending.length >= MAX_PENDING_ICE) return unchanged;
      return {
        state: { ...state, pending: [...state.pending, msg.candidate] },
        apply: [],
      };`,
    // The two "not ours" guards.
    guards: `if (!msg || msg.callId !== state.callId) return unchanged;
  if (state.ended) return unchanged;`,
    // Whether a repeated description is ignored.
    repeatGuard: `if (state.remoteReady) return unchanged;`,
    ...overrides,
  };

  return `const MAX_PENDING_ICE = ${o.cap};

function ingestSignal(state, msg) {
  const unchanged = { state: state, apply: [] };

  ${o.guards}

  if (msg.type === "hangup") {
    return {
      state: { ...state, ended: true, pending: [] },
      apply: [{ kind: "hangup" }],
    };
  }

  if (${o.descriptionTypes}) {
    ${o.repeatGuard}
    return {
      state: { ...state, remoteReady: true, pending: [] },
      apply: ${o.flushOrder},
    };
  }

  if (msg.type === "ice") {
    ${o.readyBranch}
    ${o.bufferBranch}
  }

  return unchanged;
}`;
}

export const stages = {
  ice: {
    alternatives: [
      // A switch statement and an explicit array build instead of a spread.
      `const MAX_PENDING_ICE = 64;

      function ingestSignal(state, msg) {
        if (!msg || msg.callId !== state.callId) return { state: state, apply: [] };
        if (state.ended) return { state: state, apply: [] };

        switch (msg.type) {
          case "hangup":
            return {
              state: Object.assign({}, state, { ended: true, pending: [] }),
              apply: [{ kind: "hangup" }],
            };

          case "offer":
          case "answer": {
            if (state.remoteReady) return { state: state, apply: [] };
            const out = [{ kind: "remote-description", sdp: msg.sdp }];
            for (let i = 0; i < state.pending.length; i++) {
              out.push({ kind: "ice", candidate: state.pending[i] });
            }
            return {
              state: Object.assign({}, state, { remoteReady: true, pending: [] }),
              apply: out,
            };
          }

          case "ice": {
            if (state.remoteReady) {
              return { state: state, apply: [{ kind: "ice", candidate: msg.candidate }] };
            }
            if (state.pending.length >= MAX_PENDING_ICE) return { state: state, apply: [] };
            return {
              state: Object.assign({}, state, { pending: state.pending.concat([msg.candidate]) }),
              apply: [],
            };
          }

          default:
            return { state: state, apply: [] };
        }
      }`,

      // Builds a fresh state object every time rather than spreading, and
      // uses slice() to bound the queue. Different style, same behaviour.
      `const MAX_PENDING_ICE = 64;

      function ingestSignal(state, msg) {
        const nothing = { state: state, apply: [] };
        if (!msg || msg.callId !== state.callId || state.ended) return nothing;

        const next = function (changes) {
          return {
            callId: state.callId,
            remoteReady: changes.remoteReady !== undefined ? changes.remoteReady : state.remoteReady,
            pending: changes.pending !== undefined ? changes.pending : state.pending,
            ended: changes.ended !== undefined ? changes.ended : state.ended,
          };
        };

        if (msg.type === "hangup") {
          return { state: next({ ended: true, pending: [] }), apply: [{ kind: "hangup" }] };
        }

        if (msg.type === "offer" || msg.type === "answer") {
          if (state.remoteReady) return nothing;
          return {
            state: next({ remoteReady: true, pending: [] }),
            apply: [{ kind: "remote-description", sdp: msg.sdp }].concat(
              state.pending.map(function (c) { return { kind: "ice", candidate: c }; })
            ),
          };
        }

        if (msg.type === "ice") {
          if (state.remoteReady) {
            return { state: state, apply: [{ kind: "ice", candidate: msg.candidate }] };
          }
          const grown = state.pending.concat([msg.candidate]).slice(0, MAX_PENDING_ICE);
          if (grown.length === state.pending.length) return nothing;
          return { state: next({ pending: grown }), apply: [] };
        }

        return nothing;
      }`,
    ],

    mistakes: [
      {
        // The original line from the lesson: no queue at all. This is the
        // one that actually shipped, and it is the one that works on a fast
        // network — which is why it survived being written.
        expect: "a candidate arriving before the description is buffered, not applied",
        impl: build({
          bufferBranch: `return { state: state, apply: [{ kind: "ice", candidate: msg.candidate }] };`,
        }),
      },
      {
        // Queued, then flushed BEFORE the description. Feels tidier — clear
        // the backlog, then apply the new thing — and reproduces the exact
        // InvalidStateError the queue was added to prevent. A queue whose
        // flush order is wrong is not a partial fix; it is no fix.
        expect: "the flush puts the remote description FIRST",
        impl: build({
          flushOrder: `[...state.pending.map((candidate) => ({ kind: "ice", candidate })),
        { kind: "remote-description", sdp: msg.sdp }]`,
        }),
      },
      {
        // Flushes newest-first. Plausible if you build the list by unshifting.
        // Needs THREE buffered candidates to be visible: with two, reversed
        // and in-order lists are told apart only by luck.
        expect: "buffered candidates flush in arrival order",
        impl: build({
          flushOrder: `[{ kind: "remote-description", sdp: msg.sdp },
        ...state.pending.slice().reverse().map((candidate) => ({ kind: "ice", candidate }))]`,
        }),
      },
      {
        // Flushes on 'offer' only. The CALLEE receives an offer, so their side
        // is perfect; the CALLER only ever receives an answer, so every
        // candidate they buffered is silently abandoned. Debug either device
        // alone and it looks correct.
        expect: "the caller flushes on 'answer' exactly as the callee does on 'offer'",
        impl: build({ descriptionTypes: `msg.type === "offer"` }),
      },
      {
        // No cap. Correct for every honest peer, which is the whole problem:
        // nothing in normal use distinguishes it from the right answer.
        expect: "a flood of candidates fills the queue to MAX_PENDING_ICE and stops",
        impl: build({
          bufferBranch: `return {
        state: { ...state, pending: [...state.pending, msg.candidate] },
        apply: [],
      };`,
        }),
      },
      {
        // Bounded, but evicts from the front. Reads as "keep the most recent
        // candidates", which sounds right and means a peer can flush the
        // working relay candidates out of the queue by sending 64 more.
        expect: "the cap keeps the candidates that arrived FIRST",
        impl: build({
          bufferBranch: `const grown = [...state.pending, msg.candidate];
      return {
        state: { ...state, pending: grown.slice(-MAX_PENDING_ICE) },
        apply: [],
      };`,
        }),
      },
      {
        // Mutates the caller's state instead of returning a new one. The
        // apply list is right every time, so this passes every behavioural
        // check and corrupts the object the caller still holds.
        expect: "the state you were given is not mutated",
        impl: build({
          bufferBranch: `if (state.pending.length >= MAX_PENDING_ICE) return unchanged;
      state.pending.push(msg.candidate);
      return { state: state, apply: [] };`,
        }),
      },
      {
        // Drops the callId guard. A stale candidate from a call that has just
        // ended gets buffered into the new one, where it describes a route to
        // a peer that is no longer there — so ICE spends its budget on pairs
        // that cannot succeed.
        expect: "a frame for a different callId is ignored, not buffered",
        impl: build({ guards: `if (!msg) return unchanged;
  if (state.ended) return unchanged;` }),
      },
      {
        // Drops the ended guard only. Everything about a live call is right.
        expect: "a candidate arriving after hangup is dropped, not buffered",
        impl: build({ guards: `if (!msg || msg.callId !== state.callId) return unchanged;` }),
      },
      {
        // Applies a second description. Renegotiation is not a v1 flow, and
        // setRemoteDescription on a connected peer restarts negotiation — so
        // a duplicated signalling frame drops the media on a working call.
        expect: "a second remote description is ignored",
        impl: build({ repeatGuard: `` }),
      },
      {
        // Buffers after the description is set instead of applying at once.
        // The queue is never flushed again, so every candidate that arrives
        // after the offer is held for ever. On a fast network the useful
        // candidates arrive early and the call still connects, which is
        // precisely how this one hides.
        expect: "once the description is set, a candidate applies immediately",
        impl: build({ readyBranch: `` }),
      },
    ],
  },
};
