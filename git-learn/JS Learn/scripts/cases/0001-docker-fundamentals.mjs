/* Wrong-answer cases for b9/0001 — planShutdown.
 *
 *   node scripts/verify-lesson.mjs modules/b9-docker-deployment/0001-docker-fundamentals.html \
 *        --wrong scripts/cases/0001-docker-fundamentals.mjs
 *
 * Staged: `exercise-1` is Dockerfiles and compose files needing Docker
 * installed, and carries its own per-exercise `unverifiable` reason, so only
 * `shutdown` has cases.
 *
 * Every mistake here produces a container that still deploys. The new image
 * comes up, the health check goes green, and the only outward sign is that
 * deploys take a fraction over ten seconds — which nobody reads as a bug
 * report. What actually happened in those ten seconds is sockets severed
 * without a close frame and a database pool dropped rather than returned.
 *
 * The four ideas being tested:
 *
 *   A sequence with no total is not a plan. SIGKILL arrives at a fixed time
 *   whether or not step four has started.
 *
 *   The margin. Finishing AT the deadline is finishing after it.
 *
 *   Which phases may be compressed is a design decision, not an average. The
 *   readiness wait is an optimisation; closing the pool is the entire point.
 *
 *   Slack belongs to the drain. Extra seconds finishing real requests are
 *   worth more than extra seconds standing still.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const CONSTS = `const IDEAL_READINESS = 2000;
const MIN_SOCKETS = 250;
const MIN_DRAIN = 500;
const MIN_DEPS = 500;
`;

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    margin: `500`,
    graceGuard: `typeof graceMs === "number" && Number.isFinite(graceMs) && graceMs > 0
      ? graceMs
      : 0`,
    // Which phase the leftover time is added to.
    slackTo: `drain`,
    // How readiness is sized.
    readiness: `Math.min(IDEAL_READINESS, spare)`,
    // How the doomed verdict is reached.
    killed: `total > available`,
    ...overrides,
  };

  const slackDrain = o.slackTo === "drain" ? `MIN_DRAIN + spare` : `MIN_DRAIN`;
  const slackReadiness =
    o.slackTo === "readiness" ? `readinessMs + spare` : `readinessMs`;

  return (
    CONSTS +
    `const SAFETY_MARGIN = ${o.margin};

function planShutdown(graceMs) {
  const grace = ${o.graceGuard};

  const available = grace - SAFETY_MARGIN;
  const reserved = MIN_SOCKETS + MIN_DRAIN + MIN_DEPS;

  if (available < reserved) {
    const total = reserved;
    return {
      readinessMs: 0,
      socketsMs: MIN_SOCKETS,
      drainMs: MIN_DRAIN,
      depsMs: MIN_DEPS,
      total: total,
      willBeKilled: ${o.killed},
    };
  }

  let spare = available - reserved;

  const readinessMs = ${o.readiness};
  spare -= readinessMs;

  const drainMs = ${slackDrain};
  const finalReadiness = ${slackReadiness};

  const total = finalReadiness + MIN_SOCKETS + drainMs + MIN_DEPS;

  return {
    readinessMs: finalReadiness,
    socketsMs: MIN_SOCKETS,
    drainMs: drainMs,
    depsMs: MIN_DEPS,
    total: total,
    willBeKilled: ${o.killed},
  };
}`
  );
}

export const stages = {
  shutdown: {
    alternatives: [
      // Builds the phases into an object and sums with reduce, deriving the
      // verdict at the end. Same allocation, assembled differently.
      CONSTS +
        `const SAFETY_MARGIN = 500;

      function planShutdown(graceMs) {
        const ok = typeof graceMs === "number" && isFinite(graceMs) && graceMs > 0;
        const available = (ok ? graceMs : 0) - SAFETY_MARGIN;
        const floors = { readinessMs: 0, socketsMs: MIN_SOCKETS, drainMs: MIN_DRAIN, depsMs: MIN_DEPS };
        const reserved = MIN_SOCKETS + MIN_DRAIN + MIN_DEPS;

        const phases = Object.assign({}, floors);

        if (available >= reserved) {
          const room = available - reserved;
          phases.readinessMs = room > IDEAL_READINESS ? IDEAL_READINESS : room;
          phases.drainMs = MIN_DRAIN + (room - phases.readinessMs);
        }

        const total = Object.keys(phases).reduce(function (sum, k) {
          return sum + phases[k];
        }, 0);

        return Object.assign({}, phases, { total: total, willBeKilled: total > available });
      }`,

      // Allocates by subtracting from a running remainder rather than by
      // computing a spare up front.
      CONSTS +
        `const SAFETY_MARGIN = 500;

      function planShutdown(graceMs) {
        let remaining =
          (Number.isFinite(graceMs) && typeof graceMs === "number" && graceMs > 0 ? graceMs : 0) -
          SAFETY_MARGIN;

        const sockets = MIN_SOCKETS;
        const deps = MIN_DEPS;
        let drain = MIN_DRAIN;
        let readiness = 0;

        remaining -= sockets + drain + deps;

        if (remaining >= 0) {
          readiness = Math.max(0, Math.min(IDEAL_READINESS, remaining));
          remaining -= readiness;
          drain += remaining;
        }

        const total = readiness + sockets + drain + deps;
        const available =
          (Number.isFinite(graceMs) && typeof graceMs === "number" && graceMs > 0 ? graceMs : 0) -
          SAFETY_MARGIN;

        return {
          readinessMs: readiness,
          socketsMs: sockets,
          drainMs: drain,
          depsMs: deps,
          total: total,
          willBeKilled: total > available,
        };
      }`,
    ],

    mistakes: [
      {
        // No safety margin. The plan finishes at exactly the moment SIGKILL
        // is sent, which is a coin toss the process loses about half the
        // time — and loses non-deterministically, so it is never reproduced.
        expect: "the safety margin is real -- the plan ends before SIGKILL",
        impl: build({ margin: `0` }),
      },
      {
        // Slack goes to the readiness wait instead of the drain. The plan
        // still fits, still exits cleanly, and spends six and a half seconds
        // standing still while in-flight requests get the bare minimum.
        expect: "every leftover millisecond goes to the drain",
        impl: build({ slackTo: `readiness` }),
      },
      {
        // Readiness is uncapped, so it eats every spare millisecond and the
        // drain is left at its floor. Same failure as above, reached by
        // forgetting the cap rather than by misdirecting the slack.
        expect: "readiness is capped at its ideal even when there is room to spare",
        impl: build({ readiness: `spare` }),
      },
      {
        // Divides the available time evenly between the four phases. Sounds
        // fair, and gives the readiness wait as much as the drain while
        // cutting deps below the minimum it needs to close cleanly.
        expect: "deps keep their full minimum even when the budget is generous",
        impl: build().replace(
          `  let spare = available - reserved;`,
          `  let spare = available - reserved;
  const even = available / 4;`
        ).replace(
          `    depsMs: MIN_DEPS,
    total: total,
    willBeKilled: ${"total > available"},
  };
}`,
          `    depsMs: even,
    total: finalReadiness + MIN_SOCKETS + drainMs + even,
    willBeKilled: finalReadiness + MIN_SOCKETS + drainMs + even > available,
  };
}`
        ),
      },
      {
        // willBeKilled is decided by a separate branch rather than from the
        // total actually produced. The doomed path returns the minimums and
        // then reports that everything is fine.
        expect: "one millisecond short is reported as doomed",
        impl: build({ killed: `false` }),
      },
      {
        // Accepts a string. An env var is ALWAYS a string, so STOP_GRACE_MS
        // set to "10000" produces "10000" - 500 = 9500 by coercion and looks
        // right -- until someone sets it to "10s" and every phase is NaN.
        expect: "an unusable graceMs is treated as zero and reported as doomed",
        impl: build({ graceGuard: `graceMs || 0` }),
      },
      {
        // No floor on the doomed path: subtracts anyway and hands back
        // negative phase durations. A negative sleep resolves instantly, so
        // the shutdown races through every step and looks like it worked.
        expect: "a budget far too small never produces a negative phase",
        impl: build().replace(
          `  if (available < reserved) {
    const total = reserved;
    return {
      readinessMs: 0,
      socketsMs: MIN_SOCKETS,
      drainMs: MIN_DRAIN,
      depsMs: MIN_DEPS,
      total: total,
      willBeKilled: total > available,
    };
  }
`,
          ``
        ),
      },
    ],
  },
};
