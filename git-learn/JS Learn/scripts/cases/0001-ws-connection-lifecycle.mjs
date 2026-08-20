/* Wrong-answer cases for b5/0001 — sweepSockets.
 *
 *   node scripts/verify-lesson.mjs modules/b5-websocket-server/0001-ws-connection-lifecycle.html \
 *        --wrong scripts/cases/0001-ws-connection-lifecycle.mjs
 *
 * Staged: `exercise-1` is the Node WebSocket server and carries its own
 * per-exercise `unverifiable` reason, so only `sweep` has cases.
 *
 * The heartbeat is a two-tick protocol and every mistake here collapses it
 * into one tick:
 *
 *   Resetting isAlive inside the sweep — the flag is the caller's, and the
 *   evidence of death is *surviving a tick with it still false*. Reset it
 *   here and every healthy socket looks dead on the next pass. This one is
 *   catastrophic and quiet: it disconnects the entire server every 30
 *   seconds, and each client reconnects, so it presents as "flaky network".
 *
 *   Using !isAlive rather than === false — undefined is falsy, so a socket
 *   that connected a moment ago and has not been asked anything yet gets
 *   terminated. Absence of an answer is not a failure to answer.
 *
 *   Building the two lists with independent filters — a socket can end up
 *   in both, and you ping a connection you just terminated.
 *
 * The fixture puts the dead socket in the MIDDLE of the array, so anything
 * that depends on position rather than on the flag is visible.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  sweep: {
    alternatives: [
      // Two filters, but both keyed off the same explicit test, so a socket
      // cannot land in both.
      `function sweepSockets(sockets) {
        const all = sockets || [];
        return {
          terminate: all.filter((s) => s.isAlive === false).map((s) => s.id),
          ping: all.filter((s) => s.isAlive !== false).map((s) => s.id),
        };
      }`,

      // reduce() into an accumulator.
      `function sweepSockets(sockets) {
        return (sockets || []).reduce(
          (acc, s) => {
            if (s.isAlive === false) acc.terminate.push(s.id);
            else acc.ping.push(s.id);
            return acc;
          },
          { terminate: [], ping: [] }
        );
      }`,

      // Index loop, ternary picking the target array.
      `function sweepSockets(sockets) {
        const out = { terminate: [], ping: [] };
        const all = sockets || [];
        for (let i = 0; i < all.length; i++) {
          const bucket = all[i].isAlive === false ? out.terminate : out.ping;
          bucket.push(all[i].id);
        }
        return out;
      }`,
    ],

    mistakes: [
      {
        // THE bug. Resets the flag it was supposed to read, so the second
        // tick sees every socket as dead and closes the whole server.
        expect: "sweeping twice does not kill healthy sockets",
        impl: `function sweepSockets(sockets) {
          const terminate = [];
          const ping = [];
          for (const s of sockets || []) {
            if (s.isAlive === false) {
              terminate.push(s.id);
            } else {
              s.isAlive = false;
              ping.push(s.id);
            }
          }
          return { terminate, ping };
        }`,
      },
      {
        // Mutates the caller's sockets without the two-tick consequence
        // being the first thing that fires — caught by the mutation check.
        expect: "the input sockets are not mutated",
        impl: `function sweepSockets(sockets) {
          const terminate = [];
          const ping = [];
          for (const s of sockets || []) {
            if (s.isAlive === false) {
              s.isAlive = null;
              terminate.push(s.id);
            } else {
              ping.push(s.id);
            }
          }
          return { terminate, ping };
        }`,
      },
      {
        // Truthiness instead of an explicit false. A socket that connected
        // between two ticks has undefined and is killed before it is asked.
        expect: "a brand new socket is pinged, not terminated",
        impl: `function sweepSockets(sockets) {
          const terminate = [];
          const ping = [];
          for (const s of sockets || []) {
            if (!s.isAlive) terminate.push(s.id);
            else ping.push(s.id);
          }
          return { terminate, ping };
        }`,
      },
      {
        // Independent filters with mismatched predicates: the dead socket is
        // terminated and then also pinged.
        expect: "no socket is both terminated and pinged",
        impl: `function sweepSockets(sockets) {
          const all = sockets || [];
          return {
            terminate: all.filter((s) => s.isAlive === false).map((s) => s.id),
            ping: all.map((s) => s.id),
          };
        }`,
      },
      {
        // Never terminates anything — "we will catch it next time", forever.
        // Dead sockets accumulate and the presence key keeps being refreshed
        // for a client that is not there.
        expect: "a socket that missed its pong is terminated",
        impl: `function sweepSockets(sockets) {
          return { terminate: [], ping: (sockets || []).map((s) => s.id) };
        }`,
      },
      {
        // Inverts the flag: pings the dead ones and terminates the healthy.
        expect: "the live sockets are pinged",
        impl: `function sweepSockets(sockets) {
          const terminate = [];
          const ping = [];
          for (const s of sockets || []) {
            if (s.isAlive === true) terminate.push(s.id);
            else ping.push(s.id);
          }
          return { terminate, ping };
        }`,
      },
    ],
  },
};
