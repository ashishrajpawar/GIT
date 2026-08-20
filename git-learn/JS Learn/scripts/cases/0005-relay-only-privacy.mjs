/* Wrong-answer cases for a7/0005 — relayAudit.
 *
 *   node scripts/verify-lesson.mjs modules/a7-voice-video/0005-relay-only-privacy.html \
 *        --wrong scripts/cases/0005-relay-only-privacy.mjs
 *
 * Staged: `exercise-1` is the React Native settings screen plus a live
 * RTCPeerConnection and carries its own per-exercise `unverifiable` reason,
 * so only `audit` has cases.
 *
 * What this function is really pinning down is that a privacy check has to be
 * WRONG IN THE SAFE DIRECTION. Every mistake below returns "protected" (or a
 * truthy ipHidden) on a call that is actually leaking, or on a call it knows
 * nothing about. There is no mistake here that over-reports a leak, and that
 * asymmetry is the point: a false "leaking" costs somebody an afternoon, a
 * false "protected" is the guarantee silently not holding.
 *
 * The three real failure modes, all of which look correct while you write them:
 *
 *   Ignoring `state` — reads a failed relay pair sitting next to a succeeded
 *   host pair, which is exactly what a genuine leak looks like in the stats.
 *
 *   Consulting the remote side — reports a leak we do not have (their policy
 *   is not ours to set), and sends the reader into the wrong file.
 *
 *   Failing open on no evidence — the audit reassures you when it learned
 *   nothing, which is worse than not having run it.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  audit: {
    alternatives: [
      // A for-loop instead of .find, and an explicit unknown-first shape.
      `function relayAudit(reports) {
        const list = reports || [];
        let pair = null;
        for (let i = 0; i < list.length; i++) {
          if (list[i].type === "candidate-pair" && list[i].state === "succeeded") {
            pair = list[i];
            break;
          }
        }
        if (pair === null) return { verdict: "unknown", ipHidden: false };
        const hidden = pair.localCandidateType === "relay";
        return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
      }`,

      // filter().shift() rather than find, and a lookup table for the verdict.
      `function relayAudit(reports) {
        const pairs = (reports || []).filter(
          (r) => r.type === "candidate-pair" && r.state === "succeeded"
        );
        const pair = pairs.shift();
        if (!pair) return { verdict: "unknown", ipHidden: false };
        const verdict = pair.localCandidateType === "relay" ? "protected" : "leaking";
        return { verdict: verdict, ipHidden: verdict === "protected" };
      }`,

      // Destructuring, optional chaining, and a single return.
      `function relayAudit(reports = []) {
        const pair = reports.find(
          ({ type, state }) => type === "candidate-pair" && state === "succeeded"
        );
        const local = pair?.localCandidateType;
        return {
          verdict: local === undefined ? "unknown" : local === "relay" ? "protected" : "leaking",
          ipHidden: local === "relay",
        };
      }`,
    ],

    mistakes: [
      {
        // The headline mistake. ICE leaves its failures in the stats, and the
        // fixture puts a FAILED relay pair ahead of a SUCCEEDED host pair —
        // which is the actual shape of a leaking call, not a contrived one.
        expect: "only the SUCCEEDED pair counts",
        impl: `function relayAudit(reports) {
          const pair = (reports || []).find((r) => r.type === "candidate-pair");
          if (!pair) return { verdict: "unknown", ipHidden: false };
          const hidden = pair.localCandidateType === "relay";
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
      {
        // Same defect, reached by a different route: trusting array order.
        expect: "only the SUCCEEDED pair counts",
        impl: `function relayAudit(reports) {
          const pair = (reports || [])[0];
          if (!pair) return { verdict: "unknown", ipHidden: false };
          const hidden = pair.localCandidateType === "relay";
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
      {
        // The thorough-looking mistake: check both ends. It reports a leak on
        // a call where OUR address is hidden and the remote simply runs its
        // own policy — so the fixture's remote is srflx deliberately.
        expect: "a relay candidate on OUR side means we are protected",
        impl: `function relayAudit(reports) {
          const pair = (reports || []).find(
            (r) => r.type === "candidate-pair" && r.state === "succeeded"
          );
          if (!pair) return { verdict: "unknown", ipHidden: false };
          const hidden =
            pair.localCandidateType === "relay" && pair.remoteCandidateType === "relay";
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
      {
        // Reading the remote end INSTEAD of the local one. Passes the happy
        // relay/relay case, and gets the two mixed fixtures exactly backwards.
        expect: "an srflx candidate on our side is a leak",
        impl: `function relayAudit(reports) {
          const pair = (reports || []).find(
            (r) => r.type === "candidate-pair" && r.state === "succeeded"
          );
          if (!pair) return { verdict: "unknown", ipHidden: false };
          const hidden = pair.remoteCandidateType === "relay";
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
      {
        // Fails OPEN: no evidence is treated as good news.
        expect: "no stats at all is 'unknown', never 'protected'",
        impl: `function relayAudit(reports) {
          const pair = (reports || []).find(
            (r) => r.type === "candidate-pair" && r.state === "succeeded"
          );
          if (!pair) return { verdict: "protected", ipHidden: true };
          const hidden = pair.localCandidateType === "relay";
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
      {
        // Right verdict, wrong flag. ipHidden is what calling code branches
        // on, so a correct-looking verdict beside a wrong boolean is worse
        // than an obviously broken function.
        expect: "no stats at all is 'unknown', never 'protected'",
        impl: `function relayAudit(reports) {
          const pair = (reports || []).find(
            (r) => r.type === "candidate-pair" && r.state === "succeeded"
          );
          if (!pair) return { verdict: "unknown", ipHidden: true };
          const hidden = pair.localCandidateType === "relay";
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
      {
        // Searches for ANY relay mention anywhere in the stats. A gathered
        // local-candidate is not a candidate that got used, so this calls a
        // connection protected on the strength of a candidate ICE discarded.
        expect: "a relay entry that is not a candidate-pair proves nothing",
        impl: `function relayAudit(reports) {
          const list = reports || [];
          const anyRelay = list.some(
            (r) => r.candidateType === "relay" || r.localCandidateType === "relay"
          );
          if (anyRelay) return { verdict: "protected", ipHidden: true };
          const pair = list.find(
            (r) => r.type === "candidate-pair" && r.state === "succeeded"
          );
          if (!pair) return { verdict: "unknown", ipHidden: false };
          return { verdict: "leaking", ipHidden: false };
        }`,
      },
      {
        // Truthiness instead of an equality test. "host" and "srflx" are both
        // truthy strings, so every connected call reads as protected.
        expect: "an srflx candidate on our side is a leak",
        impl: `function relayAudit(reports) {
          const pair = (reports || []).find(
            (r) => r.type === "candidate-pair" && r.state === "succeeded"
          );
          if (!pair) return { verdict: "unknown", ipHidden: false };
          const hidden = Boolean(pair.localCandidateType);
          return { verdict: hidden ? "protected" : "leaking", ipHidden: hidden };
        }`,
      },
    ],
  },
};
