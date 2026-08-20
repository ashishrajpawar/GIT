/* Wrong-answer cases for a6/0002 — applyMessage.
 *
 *   node scripts/verify-lesson.mjs modules/a6-chat-realtime/0002-message-thread-ui.html \
 *        --wrong scripts/cases/0002-message-thread-ui.mjs
 *
 * Staged: `exercise-1` is the React Native thread screen and carries its own
 * per-exercise `unverifiable` reason, so only `apply` has cases.
 *
 * The lesson shipped all three of these bugs in three separate handlers, each
 * individually reasonable. They share a shape: every one is a rule about how a
 * new event merges into a list you already hold, and none of them is visible
 * until the network is slow or messages overlap.
 *
 *   Appending without a dedupe check — REST history and the socket overlap
 *   constantly, and a reconnect replays. The thread shows doubles.
 *
 *   filter() + push() to apply an acknowledgement — correct contents, wrong
 *   position. Only reorders when someone else's message arrived while yours
 *   was in flight, i.e. only on a slow connection, i.e. never in testing.
 *
 *   Overwriting status — receipts race, so a late delivery receipt un-reads
 *   a read message. The UI flickers backwards and nobody can reproduce it.
 *
 * The fixture is built so none of these can pass by luck: the optimistic
 * message sits at index 1 rather than last (so re-appending is visible), and
 * the message used for the status test is already 'read' with 'delivered'
 * arriving after (so an overwrite moves it backwards rather than sideways).
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const RANK = `const RANK = { sending: 0, sent: 1, delivered: 2, read: 3 };
function rank(s) { return RANK[s] === undefined ? -1 : RANK[s]; }`;

export const stages = {
  apply: {
    alternatives: [
      // map() over the list rather than slice-and-assign.
      `${RANK}
      function applyMessage(list, incoming) {
        const ackAt = incoming.localId == null
          ? -1
          : list.findIndex((m) => m.id === incoming.localId);
        if (ackAt !== -1) {
          return list.map((m, i) => i !== ackAt ? m : {
            ...m,
            id: incoming.id,
            sentAt: incoming.sentAt,
            status: rank(incoming.status) > rank(m.status) ? incoming.status : m.status,
          });
        }
        if (list.some((m) => m.id === incoming.id)) {
          return list.map((m) => m.id !== incoming.id ? m : {
            ...m,
            status: rank(incoming.status) > rank(m.status) ? incoming.status : m.status,
          });
        }
        return list.concat([incoming]);
      }`,

      // A single pass that decides up front what kind of event this is.
      `${RANK}
      function applyMessage(list, incoming) {
        let at = -1;
        if (incoming.localId != null) {
          at = list.findIndex((m) => m.id === incoming.localId);
        }
        const isAck = at !== -1;
        if (!isAck) at = list.findIndex((m) => m.id === incoming.id);
        if (at === -1) return [...list, incoming];

        const prev = list[at];
        const merged = {
          ...prev,
          status: rank(incoming.status) > rank(prev.status) ? incoming.status : prev.status,
        };
        if (isAck) {
          merged.id = incoming.id;
          merged.sentAt = incoming.sentAt;
        }
        const out = [...list];
        out[at] = merged;
        return out;
      }`,
    ],

    mistakes: [
      {
        // The lesson's chat:receive handler, reduced. No dedupe at all.
        expect: "a message we already have is not appended twice",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          if (incoming.localId != null) {
            const at = list.findIndex((m) => m.id === incoming.localId);
            if (at !== -1) {
              const out = list.slice();
              out[at] = { ...list[at], id: incoming.id, sentAt: incoming.sentAt, status: incoming.status };
              return out;
            }
          }
          return [...list, incoming];
        }`,
      },
      {
        // Correct contents, wrong position. Passes trivially if the
        // optimistic message happens to be last, which is why it is not.
        expect: "an ack replaces the optimistic message IN PLACE",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          if (incoming.localId != null && list.some((m) => m.id === incoming.localId)) {
            const without = list.filter((m) => m.id !== incoming.localId);
            const old = list.find((m) => m.id === incoming.localId);
            without.push({ ...old, id: incoming.id, sentAt: incoming.sentAt, status: incoming.status });
            return without;
          }
          if (list.some((m) => m.id === incoming.id)) {
            return list.map((m) => m.id === incoming.id
              ? { ...m, status: rank(incoming.status) > rank(m.status) ? incoming.status : m.status }
              : m);
          }
          return [...list, incoming];
        }`,
      },
      {
        // The lesson's delivery-receipt handler: status assigned, not merged.
        expect: "status never goes backwards",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          if (incoming.localId != null) {
            const at = list.findIndex((m) => m.id === incoming.localId);
            if (at !== -1) {
              const out = list.slice();
              out[at] = { ...list[at], id: incoming.id, sentAt: incoming.sentAt, status: incoming.status };
              return out;
            }
          }
          const at = list.findIndex((m) => m.id === incoming.id);
          if (at !== -1) {
            const out = list.slice();
            out[at] = { ...list[at], status: incoming.status };
            return out;
          }
          return [...list, incoming];
        }`,
      },
      {
        // Over-corrects the previous fix into never advancing status at all.
        // A message would stay 'sent' forever and the ticks never update.
        expect: "status does go forwards",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          if (incoming.localId != null) {
            const at = list.findIndex((m) => m.id === incoming.localId);
            if (at !== -1) {
              const out = list.slice();
              out[at] = { ...list[at], id: incoming.id, sentAt: incoming.sentAt, status: incoming.status };
              return out;
            }
          }
          const at = list.findIndex((m) => m.id === incoming.id);
          if (at !== -1) return list.slice();
          return [...list, incoming];
        }`,
      },
      {
        // Drops an ack whose localId we do not hold. Looks like tidy
        // defensiveness; loses a message the server has already stored.
        expect: "an ack for an unknown localId is still appended",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          if (incoming.localId != null) {
            const at = list.findIndex((m) => m.id === incoming.localId);
            if (at === -1) return list.slice();
            const out = list.slice();
            out[at] = {
              ...list[at], id: incoming.id, sentAt: incoming.sentAt,
              status: rank(incoming.status) > rank(list[at].status) ? incoming.status : list[at].status,
            };
            return out;
          }
          const at = list.findIndex((m) => m.id === incoming.id);
          if (at !== -1) {
            const out = list.slice();
            out[at] = {
              ...list[at],
              status: rank(incoming.status) > rank(list[at].status) ? incoming.status : list[at].status,
            };
            return out;
          }
          return [...list, incoming];
        }`,
      },
      {
        // Mutates in place and returns the same array. Every check on
        // contents passes; React sees an unchanged reference and the thread
        // does not re-render, which is the worst kind of "it works".
        expect: "the original list is never mutated",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          if (incoming.localId != null) {
            const at = list.findIndex((m) => m.id === incoming.localId);
            if (at !== -1) {
              list[at].id = incoming.id;
              list[at].sentAt = incoming.sentAt;
              if (rank(incoming.status) > rank(list[at].status)) list[at].status = incoming.status;
              return list;
            }
          }
          const at = list.findIndex((m) => m.id === incoming.id);
          if (at !== -1) {
            if (rank(incoming.status) > rank(list[at].status)) list[at].status = incoming.status;
            return list;
          }
          list.push(incoming);
          return list;
        }`,
      },
      {
        // Dedupes on the ack path but matches by the WRONG id: it looks for
        // the server id in a list that still holds the local one.
        expect: "an ack replaces the optimistic message IN PLACE",
        impl: `${RANK}
        function applyMessage(list, incoming) {
          const at = list.findIndex((m) => m.id === incoming.id);
          if (at !== -1) {
            const out = list.slice();
            out[at] = {
              ...list[at],
              status: rank(incoming.status) > rank(list[at].status) ? incoming.status : list[at].status,
            };
            return out;
          }
          return [...list, incoming];
        }`,
      },
    ],
  },
};
