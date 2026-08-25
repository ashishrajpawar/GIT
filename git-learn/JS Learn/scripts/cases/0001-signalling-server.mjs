/* Wrong-answer cases for b6/0001 — callRecord.
 *
 *   node scripts/verify-lesson.mjs modules/b6-webrtc-signalling/0001-signalling-server.html \
 *        --wrong scripts/cases/0001-signalling-server.mjs
 *
 * Staged: `exercise-1` is a WebSocket signalling server needing Redis and two
 * live clients, and carries its own per-exercise `unverifiable` reason, so
 * only `record` has cases.
 *
 * A signalling stream is the messiest input in this course: events arrive
 * twice, arrive late, arrive for a call that already ended, and stop
 * halfway when a phone loses signal. The row is one line that outlives all
 * of it. So the mistakes divide by what the mess does to that line:
 *
 *   Writing a field more than once. The second answer, the second ending.
 *   Both are ordinary traffic rather than edge cases -- two sides can each
 *   send a hangup, and a revoke can arrive for a call that ended an hour
 *   ago. An implementation that just assigns produces a row describing a
 *   call that did not happen that way.
 *
 *   Making the row look tidier than the truth. Filling in answeredAt for a
 *   missed call is the one to watch: it removes the single most useful fact
 *   the table holds, and it does it by making the data look MORE complete.
 *
 *   Keeping what was only ever passing through. SDP and ICE candidates are
 *   relayed. An ICE candidate is an IP address, and relay-only ICE exists
 *   specifically so that neither party learns the other's -- so persisting
 *   one defeats the policy from the far side, silently, in a table nobody
 *   thinks of as sensitive.
 *
 * The one to look at hardest is `severity-wins`. It is not lazy: it is a
 * deliberate, plausible-sounding rule -- surely a revoked token is a more
 * important reason than a hangup -- and it writes a false record of a call
 * that was already over. b7/0003's `AND ended_at IS NULL` is the same
 * decision expressed as SQL.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    guards: `if (start.initiatedBy !== "owner" && start.initiatedBy !== "holder") return null;
  if (start.media !== "voice" && start.media !== "video") return null;`,

    findStart: `const start = list.find(function (e) { return e && e.kind === "initiate"; });
  if (!start) return null;`,

    answerBranch: `if (row.answeredAt === null) row.answeredAt = event.at;
      continue;`,

    relayBranch: `if (event.kind === "offer" || event.kind === "ice") continue;`,

    endingBranch: `if (row.endedAt !== null) continue;
      row.endedAt = event.at;
      row.endReason = ending(event);
      continue;`,

    beforeInitiate: `if (event === start) { seenInitiate = true; continue; }
    if (!seenInitiate) continue;`,

    unknownBranch: ``,

    extraFields: ``,

    ...overrides,
  };

  return `function callRecord(events) {
  const list = Array.isArray(events) ? events : [];

  ${o.findStart}
  ${o.guards}

  const row = {
    conversationId: start.conversationId,
    tokenId: start.tokenId,
    initiatedBy: start.initiatedBy,
    media: start.media,
    createdAt: start.at,
    answeredAt: null,
    endedAt: null,
    endReason: null,
  };

  const ENDINGS = {
    reject: function () { return "rejected"; },
    hangup: function (e) { return e.by === "holder" ? "hangup_holder" : "hangup_owner"; },
    timeout: function () { return "timeout"; },
    disconnect: function () { return "disconnected"; },
    token_revoked: function () { return "token_revoked"; },
    token_paused: function () { return "token_paused"; },
  };
  const SEVERITY = {
    rejected: 1, timeout: 1, hangup_owner: 2, hangup_holder: 2,
    disconnected: 3, token_paused: 4, token_revoked: 5,
  };

  let seenInitiate = false;

  for (const event of list) {
    if (!event) continue;

    ${o.beforeInitiate}

    if (event.kind === "answer") {
      ${o.answerBranch}
    }

    ${o.relayBranch}

    const ending = ENDINGS[event.kind];
    if (ending) {
      ${o.endingBranch}
    }
    ${o.unknownBranch}
  }

  ${o.extraFields}

  return row;
}`;
}

export const stages = {
  record: {
    alternatives: [
      // A reduce over the events, with the row rebuilt each step. Same
      // rules, expressed as a fold rather than a mutation loop.
      `function callRecord(events) {
        const list = Array.isArray(events) ? events : [];
        const startIndex = list.findIndex((e) => e && e.kind === "initiate");
        if (startIndex === -1) return null;

        const start = list[startIndex];
        if (["owner", "holder"].indexOf(start.initiatedBy) === -1) return null;
        if (["voice", "video"].indexOf(start.media) === -1) return null;

        const reasonFor = (e) => ({
          reject: "rejected",
          hangup: e.by === "holder" ? "hangup_holder" : "hangup_owner",
          timeout: "timeout",
          disconnect: "disconnected",
          token_revoked: "token_revoked",
          token_paused: "token_paused",
        })[e.kind];

        return list.slice(startIndex + 1).reduce((row, e) => {
          if (!e) return row;
          if (e.kind === "answer") {
            return row.answeredAt === null ? Object.assign({}, row, { answeredAt: e.at }) : row;
          }
          const reason = reasonFor(e);
          if (reason === undefined) return row;
          if (row.endedAt !== null) return row;
          return Object.assign({}, row, { endedAt: e.at, endReason: reason });
        }, {
          conversationId: start.conversationId,
          tokenId: start.tokenId,
          initiatedBy: start.initiatedBy,
          media: start.media,
          createdAt: start.at,
          answeredAt: null,
          endedAt: null,
          endReason: null,
        });
      }`,

      // Find the first of each interesting event up front, then assemble.
      // No loop over the stream at all.
      `function callRecord(events) {
        var list = Array.isArray(events) ? events : [];
        var i, start = null, startAt = -1;
        for (i = 0; i < list.length; i++) {
          if (list[i] && list[i].kind === "initiate") { start = list[i]; startAt = i; break; }
        }
        if (!start) return null;
        if (start.initiatedBy !== "owner" && start.initiatedBy !== "holder") return null;
        if (start.media !== "voice" && start.media !== "video") return null;

        var after = list.slice(startAt + 1).filter(Boolean);

        var ENDING_KINDS = ["reject", "hangup", "timeout", "disconnect",
                            "token_revoked", "token_paused"];

        var firstAnswer = after.filter(function (e) { return e.kind === "answer"; })[0];
        var firstEnding = after.filter(function (e) {
          return ENDING_KINDS.indexOf(e.kind) !== -1;
        })[0];

        function reasonOf(e) {
          if (!e) return null;
          if (e.kind === "reject") return "rejected";
          if (e.kind === "hangup") return e.by === "holder" ? "hangup_holder" : "hangup_owner";
          if (e.kind === "timeout") return "timeout";
          if (e.kind === "disconnect") return "disconnected";
          return e.kind;
        }

        return {
          conversationId: start.conversationId,
          tokenId: start.tokenId,
          initiatedBy: start.initiatedBy,
          media: start.media,
          createdAt: start.at,
          answeredAt: firstAnswer ? firstAnswer.at : null,
          endedAt: firstEnding ? firstEnding.at : null,
          endReason: reasonOf(firstEnding),
        };
      }`,

      // The ending branch written as "only write into an empty field",
      // which is the shape people reach for once they have been bitten by
      // a duplicate event.
      build({
        endingBranch: `if (row.endedAt === null) {
        row.endedAt = event.at;
        row.endReason = ending(event);
      }
      continue;`,
      }),
    ],

    mistakes: [
      {
        // THE ONE TO STUDY. A deliberate, plausible rule: the most serious
        // reason wins. It writes token_revoked onto a call that ended by
        // hangup half an hour earlier -- a false record, arrived at by
        // trying to be more informative.
        expect: "the FIRST ending wins, even when a later one sounds more serious",
        impl: build({
          endingBranch: `const reason = ending(event);
      if (row.endedAt === null || SEVERITY[reason] > SEVERITY[row.endReason]) {
        row.endedAt = event.at;
        row.endReason = reason;
      }
      continue;`,
        }),
      },
      {
        // Last write wins: no guard at all. Two hangups, or a revoke after
        // the fact, and the row records whichever arrived last.
        expect: "the FIRST ending wins, even when a later one sounds more serious",
        impl: build({
          endingBranch: `row.endedAt = event.at;
      row.endReason = ending(event);
      continue;`,
        }),
      },
      {
        // The answer written every time. Both sides can send one, and a
        // reconnect sends another -- so the time the call connected drifts
        // forwards by however long the negotiation took.
        expect: "a second answer does not move the moment it connected",
        impl: build({ answerBranch: `row.answeredAt = event.at;
      continue;` }),
      },
      {
        // Fills answeredAt in from endedAt so the row is not "missing"
        // data. It is not missing: nobody picked up, and that is the fact
        // this table exists to record. The tidier row is the false one.
        expect: "a call nobody answered is a missed call, and answeredAt stays null",
        impl: build({
          extraFields: `if (row.endedAt !== null && row.answeredAt === null) {
    row.answeredAt = row.endedAt;
  }`,
        }),
      },
      {
        // Keeps the ICE candidate "for debugging connection failures",
        // which is a real thing people want and the exact thing relay-only
        // ICE exists to prevent. The address ends up in a table, in a
        // backup, and in whatever reads either.
        expect: "an ICE candidate reaches the row NOWHERE",
        impl: build({
          relayBranch: `if (event.kind === "ice") {
      row.lastCandidate = event.candidate;
      continue;
    }
    if (event.kind === "offer") continue;`,
        }),
      },
      {
        // Keeps the SDP for the same reason, and SDP carries addresses and
        // codec fingerprints as well.
        expect: "SDP reaches the row nowhere either",
        impl: build({
          relayBranch: `if (event.kind === "offer") {
      row.offerSdp = event.sdp;
      continue;
    }
    if (event.kind === "ice") continue;`,
        }),
      },
      {
        // The answer branch also records the SDP, which is the same leak
        // arriving through the one event that DOES legitimately update the
        // row -- so it survives a reviewer checking that offer and ice are
        // ignored.
        expect: "SDP reaches the row nowhere either",
        impl: build({
          answerBranch: `if (row.answeredAt === null) {
        row.answeredAt = event.at;
        row.answerSdp = event.sdp;
      }
      continue;`,
        }),
      },
      {
        // Folds every event, including those before the initiate. A hangup
        // from the previous call then ends this one before it starts.
        expect: "events before the initiate are about nothing and are dropped",
        impl: build({ beforeInitiate: `if (event === start) continue;` }),
      },
      {
        // The `if (!start) return null` guard forgotten. Every property
        // access below then throws, so a stream with no initiate takes the
        // socket handler down instead of producing nothing.
        //
        // Worth recording what was here first: `list.find(...) || {}`,
        // which is NOT a mistake once rule 2's guards exist -- an empty
        // object has no initiatedBy, so it is refused a line later. It
        // passed every check because it was correct, the same way b1/0004's
        // hasOwnProperty case was. A case that passes everything is either
        // a hole in the self-check or not a mistake, and the only way to
        // tell is to look.
        expect: "a stream with no initiate produces no row at all",
        impl: build({
          findStart: `const start = list.find(function (e) { return e && e.kind === "initiate"; });`,
        }),
      },
      {
        // Accepts any initiatedBy and media. The row then fails the CHECK
        // constraint at INSERT time, which surfaces as a database error in
        // a socket handler rather than as a decision anybody made.
        expect: "a value the CHECK constraint would refuse is refused here instead",
        impl: build({ guards: `` }),
      },
      {
        // Refuses on an unknown event kind, borrowing b7/0002's rule from
        // a place it does not apply. An unknown RULE type grants something
        // if you let it through; an unknown signalling event grants
        // nothing, and refusing means one new client message breaks every
        // call record on an older server.
        expect: "an unknown event kind is ignored rather than fatal",
        impl: build({ unknownBranch: `return null;` }),
      },
      {
        // Stores the duration as well, "so the query is simpler". It is a
        // second copy of endedAt minus createdAt, and the copy is the one
        // that goes wrong -- same reasoning that removed use_count.
        expect: "there is no duration field, because it is a subtraction",
        impl: build({
          extraFields: `if (row.endedAt !== null) {
    row.durationSeconds = Math.round((row.endedAt - row.createdAt) / 1000);
  }`,
        }),
      },
      {
        // A hangup by the holder recorded as the owner's, because `by` is
        // read with a truthiness test that treats every value it does not
        // recognise as the owner.
        expect: "a hangup records which side hung up",
        impl: build({
          endingBranch: `if (row.endedAt !== null) continue;
      row.endedAt = event.at;
      row.endReason = event.kind === "hangup" ? "hangup_owner" : ending(event);
      continue;`,
        }),
      },
      {
        // Passes the event kind straight through as the reason, so
        // 'reject' and 'disconnect' land in the column instead of
        // 'rejected' and 'disconnected' -- values the CHECK list does not
        // contain, so every one of those calls fails to record.
        expect: "every ending maps to a value the CHECK constraint permits",
        impl: build({
          endingBranch: `if (row.endedAt !== null) continue;
      row.endedAt = event.at;
      row.endReason = event.kind;
      continue;`,
        }),
      },
      {
        // Sorts the caller's event list to be sure it is in order. It may
        // be replayed, audited or handed on, and "first" was already
        // arrival order by definition.
        expect: "the event list is not mutated",
        impl: build({
          findStart: `list.sort(function (a, b) { return (a && a.at) - (b && b.at); });
  const start = list.find(function (e) { return e && e.kind === "initiate"; });
  if (!start) return null;`,
        }),
      },
    ],
  },
};
