/* Wrong-answer cases for a6/0001 — connectionIntent.
 *
 *   node scripts/verify-lesson.mjs modules/a6-chat-realtime/0001-websocket-client.html \
 *        --wrong scripts/cases/0001-websocket-client.mjs
 *
 * Staged: `exercise-1` is the React Native WebSocket layer and carries its own
 * per-exercise `unverifiable` reason, so only `intent` has cases.
 *
 * This function exists because the lesson shipped the bug it fixes: an
 * AppState listener calling connect() on 'active' without checking whether
 * anyone is signed in, sitting in a different file from the logout effect
 * that closes the socket. Both are correct alone. Together they reopen a
 * socket for a signed-out user.
 *
 * Three ways to get it wrong, and the ordering one is the subtlest:
 *
 *   Precedence — testing appState before hasSession. Reads fine, and fails
 *   only in the one combination nobody tries by hand: signing out while the
 *   app is in the background.
 *
 *   'connecting' treated as 'not open' — opens a second socket while the
 *   first handshake is still in flight, and every message arrives twice.
 *
 *   'not active' treated as 'gone' — tears the socket down for a
 *   notification shade, then pays to rebuild it on a mobile network.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  intent: {
    alternatives: [
      // Positional args destructured in the body, and explicit equality
      // rather than early returns.
      `function connectionIntent(context) {
        const appState = context.appState;
        const hasSession = context.hasSession;
        const socketState = context.socketState;
        if (hasSession === false) {
          if (socketState === "closed") return "idle";
          return "disconnect";
        }
        if (appState === "active" && socketState === "closed") return "connect";
        return "idle";
      }`,

      // A lookup-table style: work out the two booleans first, then map.
      `function connectionIntent({ appState, hasSession, socketState }) {
        const socketLive = socketState === "open" || socketState === "connecting";
        if (!hasSession) return socketLive ? "disconnect" : "idle";
        const inFront = appState === "active";
        return inFront && !socketLive ? "connect" : "idle";
      }`,

      // Nested ternaries — ugly, but behaviourally identical, and the
      // self-check must not care about style.
      `function connectionIntent(ctx) {
        return !ctx.hasSession
          ? (ctx.socketState === "closed" ? "idle" : "disconnect")
          : ctx.appState !== "active"
            ? "idle"
            : (ctx.socketState === "closed" ? "connect" : "idle");
      }`,
    ],

    mistakes: [
      {
        // THE precedence bug. Checking app state first means a logout that
        // happens while backgrounded never closes the socket.
        expect: "signing out in the BACKGROUND still disconnects",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (appState !== "active") return "idle";
          if (!hasSession) return socketState === "closed" ? "idle" : "disconnect";
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
      {
        // The lesson's own shipped bug, reduced: foreground means connect,
        // session or no session.
        expect: "signed out with an open socket -> disconnect",
        impl: `function connectionIntent({ appState, socketState }) {
          if (appState !== "active") return "idle";
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
      {
        // 'connecting' misread as "no socket yet", so a second connect goes
        // out while the first handshake is still in flight.
        expect: "a connect already in flight -> idle",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (!hasSession) return socketState === "closed" ? "idle" : "disconnect";
          if (appState !== "active") return "idle";
          return socketState !== "open" ? "connect" : "idle";
        }`,
      },
      {
        // Same misreading on the signed-out branch: a socket mid-handshake
        // is left to finish connecting for a user who has signed out.
        //
        // This one initially passed every check, which is the reason the
        // suite now has a signed-out-mid-handshake case at all. The
        // self-check only tested 'open' and 'closed' on the signed-out
        // branch, so the gap was invisible until a wrong-case walked into
        // it. Keep this mistake: it is what guards that check.
        expect: "signed out mid-handshake -> disconnect",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (!hasSession) return socketState === "open" ? "disconnect" : "idle";
          if (appState !== "active") return "idle";
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
      {
        // Treats anything that is not 'background' as being in front, so the
        // transient 'inactive' state starts opening sockets.
        expect: "'inactive' does not connect either",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (!hasSession) return socketState === "closed" ? "idle" : "disconnect";
          if (appState === "background") return "idle";
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
      {
        // Tears the socket down whenever the app is not active — including
        // for a notification shade.
        expect: "'inactive' does NOT disconnect",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (!hasSession) return socketState === "closed" ? "idle" : "disconnect";
          if (appState !== "active") {
            return socketState === "closed" ? "idle" : "disconnect";
          }
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
      {
        // Chatty rather than wrong-headed: re-issues 'disconnect' forever on
        // an already-closed socket. Harmless-looking, and it means every
        // AppState tick after logout does work for nothing.
        expect: "signed out and already closed -> idle",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (!hasSession) return "disconnect";
          if (appState !== "active") return "idle";
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
      {
        // Reconnects while backgrounded. Plausible ("stay connected for
        // notifications") and wrong: it fights the OS, which is closing the
        // socket on purpose, and drains the battery losing that fight.
        expect: "backgrounded and closed -> do not reconnect in the background",
        impl: `function connectionIntent({ appState, hasSession, socketState }) {
          if (!hasSession) return socketState === "closed" ? "idle" : "disconnect";
          return socketState === "closed" ? "connect" : "idle";
        }`,
      },
    ],
  },
};
