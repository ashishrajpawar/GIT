/* Wrong-answer cases for a7/0002 — callDisplay.
 *
 *   node scripts/verify-lesson.mjs modules/a7-voice-video/0002-voice-call.html \
 *        --wrong scripts/cases/0002-voice-call.mjs
 *
 * Staged: `exercise-1` is the React Native call screen and carries its own
 * per-exercise `unverifiable` reason, so only `clock` has cases.
 *
 * The defect this function replaces could not be caught by testing, which is
 * the reason it survived: the screen counted setInterval ticks, and a tick
 * count equals elapsed time right up until something stops the ticks. On a
 * desk, nothing does. On a phone, iOS suspends JS timers for a backgrounded
 * app — and a voice call is *specifically* the screen the user leaves, to
 * put the phone to their ear or read out an address from Maps.
 *
 * So the fixtures carry a `ticks` field that is deliberately SHORT (12 against
 * a real 187). Any implementation that reads it gets a plausible number and
 * fails, which is precisely what the user sees.
 *
 * The four failure modes, in the order they get written:
 *
 *   Reading an accumulated count instead of subtracting timestamps.
 *
 *   `if (call.connectedAt)` — the falsy-check habit, here turning a real
 *   timestamp of 0 into "never connected". Same shape as `max_uses: 0`.
 *
 *   Folding 'disconnected' into the not-connected branch, which is what the
 *   original ternary did: a four-minute call displaying "Connecting...".
 *
 *   Letting an ended call keep ticking, because `now` is right there.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place, by
// construction rather than by care.
function build(overrides = {}) {
  const o = {
    // How the total number of seconds is arrived at.
    elapsed: `Math.max(0, Math.floor((stopAt - call.connectedAt) / 1000))`,
    // How "there is no clock yet" is recognised.
    noClockTest: `call.connectedAt == null`,
    // Which timestamp an ended call subtracts from.
    stopAt: `ended ? (call.endedAt == null ? now : call.endedAt) : now`,
    // How 'disconnected' after connecting is classified.
    blipPhase: `"reconnecting"`,
    // The hours branch of the formatter.
    hoursBranch: `if (h > 0) {
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }`,
    // How minutes are derived — modulo the hour, or the whole total.
    minutes: `Math.floor((total % 3600) / 60)`,
    // Clamping and truncation in the formatter.
    formatTotal: `Math.max(0, Math.floor(totalSeconds))`,
    ...overrides,
  };

  return `function formatDuration(totalSeconds) {
  const total = ${o.formatTotal};

  const h = Math.floor(total / 3600);
  const m = ${o.minutes};
  const s = total % 60;

  ${o.hoursBranch}
  return m + ":" + String(s).padStart(2, "0");
}

function callDisplay(call, now) {
  const ended = call.state === "failed" || call.state === "closed";

  if (${o.noClockTest}) {
    return { phase: ended ? "ended" : "connecting", seconds: null, text: null };
  }

  const stopAt = ${o.stopAt};
  const seconds = ${o.elapsed};

  let phase;
  if (ended) {
    phase = "ended";
  } else if (call.state === "disconnected") {
    phase = ${o.blipPhase};
  } else {
    phase = "live";
  }

  return { phase: phase, seconds: seconds, text: formatDuration(seconds) };
}`;
}

export const stages = {
  clock: {
    alternatives: [
      // Derives the format from a padded array join, and uses a lookup object
      // for the phase instead of a chain of conditionals.
      `function formatDuration(totalSeconds) {
        const total = totalSeconds < 0 ? 0 : Math.trunc(totalSeconds);
        const parts = [
          Math.floor(total / 3600),
          Math.floor((total % 3600) / 60),
          total % 60,
        ];
        const shown = parts[0] === 0 ? parts.slice(1) : parts;
        return shown
          .map(function (n, i) { return i === 0 ? String(n) : String(n).padStart(2, "0"); })
          .join(":");
      }

      function callDisplay(call, now) {
        const PHASES = {
          connected: "live",
          disconnected: "reconnecting",
          failed: "ended",
          closed: "ended",
        };
        const phase = PHASES[call.state] || "connecting";

        if (call.connectedAt === null || call.connectedAt === undefined) {
          return {
            phase: phase === "ended" ? "ended" : "connecting",
            seconds: null,
            text: null,
          };
        }

        const stop = phase === "ended"
          ? (call.endedAt === null || call.endedAt === undefined ? now : call.endedAt)
          : now;

        let seconds = Math.trunc((stop - call.connectedAt) / 1000);
        if (seconds < 0) seconds = 0;

        return { phase: phase, seconds: seconds, text: formatDuration(seconds) };
      }`,

      // Computes the duration in a helper and builds the string with explicit
      // concatenation rather than padStart.
      `function pad2(n) {
        return n < 10 ? "0" + n : String(n);
      }

      function formatDuration(totalSeconds) {
        let total = Math.floor(totalSeconds);
        if (total < 0) total = 0;
        const h = Math.floor(total / 3600);
        const rest = total - h * 3600;
        const m = Math.floor(rest / 60);
        const s = rest - m * 60;
        if (h > 0) return h + ":" + pad2(m) + ":" + pad2(s);
        return m + ":" + pad2(s);
      }

      function elapsedSeconds(from, to) {
        const diff = Math.floor((to - from) / 1000);
        return diff > 0 ? diff : 0;
      }

      function callDisplay(call, now) {
        const isOver = call.state === "failed" || call.state === "closed";
        const started = call.connectedAt !== null && call.connectedAt !== undefined;

        if (!started) {
          return { phase: isOver ? "ended" : "connecting", seconds: null, text: null };
        }

        const until = isOver && call.endedAt !== null && call.endedAt !== undefined
          ? call.endedAt
          : now;
        const seconds = elapsedSeconds(call.connectedAt, until);

        let phase = "live";
        if (isOver) phase = "ended";
        else if (call.state === "disconnected") phase = "reconnecting";

        return { phase: phase, seconds: seconds, text: formatDuration(seconds) };
      }`,
    ],

    mistakes: [
      {
        // The original: read the accumulated tick count. It agrees with the
        // wall clock exactly as long as nothing stops the ticks, which on a
        // desk is always. The fixture's `ticks` is short by design.
        //
        // This one trips 12 of the 16 checks, and that IS inherent rather than
        // a diagnostics problem: the duration is read from the wrong source,
        // so every assertion about a duration fails. It is one behavioural
        // change with twelve visible consequences. The four it does not trip
        // are the ones that assert a phase and no clock.
        expect: "a live call reads the wall clock, not a tick count",
        impl: build({ elapsed: `Math.max(0, call.ticks || 0)` }),
      },
      {
        // Truthiness on a timestamp. connectedAt of 0 is 1 Jan 1970 and a
        // perfectly real value; the same habit that makes max_uses: 0 read
        // as unlimited.
        expect: "connectedAt of 0 is a timestamp, not 'never connected'",
        impl: build({ noClockTest: `!call.connectedAt` }),
      },
      {
        // What the shipped ternary did: 'disconnected' falls into the
        // not-connected branch, so a four-minute call reads "Connecting...".
        expect: "a blip is 'reconnecting', not 'connecting'",
        impl: build({ blipPhase: `"connecting"` }),
      },
      {
        // Keeps the phase right and hides the clock during a blip — the other
        // half of the same mistake, and the one that looks like caution.
        expect: "the clock keeps running through a blip",
        impl: build({
          elapsed: `call.state === "disconnected"
    ? null
    : Math.max(0, Math.floor((stopAt - call.connectedAt) / 1000))`,
          hoursBranch: `if (totalSeconds === null) return null;
  if (h > 0) {
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }`,
        }),
      },
      {
        // Always subtracts from `now`, so a finished call goes on ticking on
        // the summary screen. `now` is the variable in scope, which is why
        // this is the easy one to write.
        expect: "an ended call freezes its clock at endedAt",
        impl: build({ stopAt: `now` }),
      },
      {
        // Exactly what the screen shipped: minutes over the whole total and
        // no hours branch — while the playground in the same lesson had the
        // correct formatter. A 1h15m call reads 75:30.
        expect: "an hour-long call shows hours",
        impl: build({ hoursBranch: ``, minutes: `Math.floor(total / 60)` }),
      },
      {
        // Hours are shown but minutes are not padded, so 1:01:05 renders as
        // 1:1:05. Two single-digit fields in the fixture make this visible.
        expect: "minutes are padded once hours are shown",
        impl: build({
          hoursBranch: `if (h > 0) {
    return h + ":" + m + ":" + String(s).padStart(2, "0");
  }`,
        }),
      },
      {
        // Rounds instead of truncating, so the clock reads 2 before two
        // seconds have passed — and shows 1:00 for a 59.6-second call.
        expect: "a part-second is truncated, not rounded",
        impl: build({
          elapsed: `Math.max(0, Math.round((stopAt - call.connectedAt) / 1000))`,
        }),
      },
      {
        // No clamp. An NTP correction mid-call sends the clock backwards and
        // the screen renders something like -7:-40.
        expect: "a backwards clock reads 0:00, never a negative duration",
        impl: build({
          elapsed: `Math.floor((stopAt - call.connectedAt) / 1000)`,
          formatTotal: `Math.floor(totalSeconds)`,
        }),
      },
      {
        // Treats any 'disconnected' as a blip, including one that happened
        // before the call ever connected — so a call that never got through
        // claims to be reconnecting to something.
        expect: "'disconnected' before ever connecting is still 'connecting'",
        impl: build({
          noClockTest: `call.connectedAt == null && call.state !== "disconnected"`,
        }),
      },
    ],
  },
};
