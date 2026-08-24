/* Wrong-answer cases for a10/0002 — applyAppState.
 *
 *   node scripts/verify-lesson.mjs modules/a10-device-security/0002-biometric-app-lock.html \
 *        --wrong scripts/cases/0002-biometric-app-lock.mjs
 *
 * Staged: `exercise-1` is a React Native provider using expo-local-
 * authentication and AppState, and carries its own per-exercise
 * `unverifiable` reason, so only `lock` has cases.
 *
 * This is a security control, so every mistake below fails in the SAME
 * direction: the lock does not engage when it should. None of them throws,
 * none of them logs, and the app looks completely normal — the only symptom
 * is that a stolen phone opens straight into the token list.
 *
 * Three of them are also invisible unless you drive a SEQUENCE of events,
 * which is the argument for making this a pure reducer instead of leaving it
 * inside the AppState handler. You cannot see the `inactive` bug by reading
 * the branch that causes it; you can only see it by replaying
 * background -> inactive -> active.
 *
 * The four failure modes:
 *
 *   Treating `inactive` as leaving. It fires on the way BACK IN, so the away
 *   clock is reset to ~now one step before it is read.
 *
 *   Letting an unreadable timeout skip the check. `elapsed >= NaN` is false,
 *   so a corrupted preference switches the control off.
 *
 *   A falsy test on the timeout, which reads a real 0 as "not set".
 *
 *   Discarding the away clock when a call is in progress, so a call that ends
 *   while the app is backgrounded leaves it unlocked.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // Which states are treated as "the user left".
    leavingTest: `event.appState === "background"`,
    // Whether a second background keeps the earlier stamp.
    rebackgroundGuard: `if (lock.awaySince !== null && lock.awaySince !== undefined) return lock;`,
    // How a raw setting becomes a number of seconds.
    usable: `typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : 0`,
    // How the lock decision is reached at 'active'.
    shouldLock: `!event.inCall && elapsed >= timeout`,
    // How the new locked flag is produced.
    lockedOut: `lock.locked || shouldLock`,
    // Anything the in-call case does before the normal flow.
    callGuard: ``,
    ...overrides,
  };

  return `function usableTimeout(raw) {
  return ${o.usable};
}

function applyAppState(lock, event) {
  ${o.callGuard}

  if (event.appState === "inactive" && !(${o.leavingTest})) return lock;

  if (${o.leavingTest}) {
    ${o.rebackgroundGuard}
    return { locked: lock.locked, awaySince: event.now };
  }

  if (event.appState === "active") {
    if (lock.awaySince === null || lock.awaySince === undefined) return lock;

    const elapsed = (event.now - lock.awaySince) / 1000;
    const timeout = usableTimeout(event.timeoutSeconds);
    const shouldLock = ${o.shouldLock};

    return { locked: ${o.lockedOut}, awaySince: null };
  }

  return lock;
}`;
}

export const stages = {
  lock: {
    alternatives: [
      // A switch, with the timeout normalisation inlined and the guards
      // written as positive conditions rather than early returns.
      `function applyAppState(lock, event) {
        const raw = event.timeoutSeconds;
        const timeout =
          typeof raw === "number" && isFinite(raw) && raw >= 0 ? raw : 0;

        switch (event.appState) {
          case "background":
            return lock.awaySince == null
              ? { locked: lock.locked, awaySince: event.now }
              : lock;

          case "active": {
            if (lock.awaySince == null) return lock;
            const seconds = (event.now - lock.awaySince) / 1000;
            const hit = event.inCall !== true && seconds >= timeout;
            return {
              locked: lock.locked === true || hit,
              awaySince: null,
            };
          }

          default:
            // 'inactive' and anything unrecognised land here untouched.
            return lock;
        }
      }`,

      // Builds the result with Object.assign and separates the "did we
      // leave" question from the "how long" question entirely.
      `function secondsOrZero(raw) {
        if (typeof raw !== "number") return 0;
        if (Number.isNaN(raw)) return 0;
        if (raw === Infinity || raw === -Infinity) return 0;
        if (raw < 0) return 0;
        return raw;
      }

      function applyAppState(lock, event) {
        const left = event.appState === "background";
        const returned = event.appState === "active";

        if (left) {
          if (lock.awaySince !== null && lock.awaySince !== undefined) return lock;
          return Object.assign({}, lock, { awaySince: event.now });
        }

        if (!returned) return lock;
        if (lock.awaySince === null || lock.awaySince === undefined) return lock;

        const away = (event.now - lock.awaySince) / 1000;
        const limit = secondsOrZero(event.timeoutSeconds);
        const nowLocked = lock.locked || (!event.inCall && away >= limit);

        return Object.assign({}, lock, { locked: nowLocked, awaySince: null });
      }`,
    ],

    mistakes: [
      {
        // The shipped bug. 'inactive' treated as leaving, so the stamp is
        // overwritten with ~now on the way back and elapsed comes out at a
        // few milliseconds. Note it does NOT fail the timeout-0 checks,
        // because elapsed >= 0 is still true — which is exactly why it
        // survives on a default install.
        expect: "two minutes away still locks, despite the 'inactive' on the way back",
        impl: build({
          leavingTest: `event.appState === "background" || event.appState === "inactive"`,
          rebackgroundGuard: ``,
        }),
      },
      {
        // The over-correction: having heard that 'inactive' is the one that
        // matters, watch ONLY that and ignore 'background'. The clock is
        // then never started at all on the way out, so nothing ever locks.
        //
        // This one trips 12 checks, and that is inherent rather than a
        // diagnostics problem: an app lock that never starts its clock fails
        // every assertion about locking. One change, total failure.
        expect: "'background' starts the clock",
        impl: build({ leavingTest: `event.appState === "inactive"` }),
      },
      {
        // parseInt's failure, preserved. NaN propagates into the comparison
        // and every comparison against NaN is false, so the control quietly
        // switches itself off.
        expect: "an unreadable timeout locks rather than being skipped",
        impl: build({ usable: `raw` }),
      },
      {
        // A falsy test on the timeout. Reads a real 0 — "lock immediately",
        // and the DEFAULT setting — as "not configured", and substitutes a
        // permissive 300 seconds. The substituted default is always the
        // permissive one, because permissive is what "no opinion" looks like.
        expect: "a timeout of 0 locks immediately",
        impl: build({ usable: `raw ? raw : 300` }),
      },
      {
        // The in-call early return from the lesson: it throws the away clock
        // away. A call that ends while the app is backgrounded then has no
        // clock to judge, so the app opens unlocked.
        expect: "a call that ends while backgrounded still locks on return",
        impl: build({
          callGuard: `if (event.inCall) {
    return { locked: lock.locked, awaySince: null };
  }`,
        }),
      },
      {
        // Assigns the decision instead of OR-ing it, so returning to an
        // already-locked app after a short trip UNLOCKS it — the lock screen
        // disappears without anyone authenticating.
        expect: "a short trip away does not UNLOCK a locked app",
        impl: build({ lockedOut: `shouldLock` }),
      },
      {
        // A second 'background' restarts the clock. Android fires this more
        // than you would expect, and each one shortens the measured absence.
        expect: "a second 'background' keeps the earlier timestamp",
        impl: build({ rebackgroundGuard: `` }),
      },
      {
        // Strictly greater rather than >=, so a timeout of 0 never fires:
        // elapsed > 0 is true for any real gap, but the boundary case that
        // matters — and the default — is exactly 0.
        expect: "exactly the timeout locks -- the boundary is inclusive",
        impl: build({ shouldLock: `!event.inCall && elapsed > timeout` }),
      },
      {
        // Ignores inCall entirely, locking the user out mid-call when they
        // step across to Maps to read an address. Fails in the SAFE
        // direction, unlike everything else here — included because a
        // self-check that only tests one direction stops being a
        // specification.
        expect: "returning during a call does not lock",
        impl: build({ shouldLock: `elapsed >= timeout` }),
      },
    ],
  },
};
