/* Wrong-answer cases for b2/0002 — partitionsToCreate.
 *
 *   node scripts/verify-lesson.mjs modules/b2-schema-design/0002-messaging-schema.html \
 *        --wrong scripts/cases/0002-messaging-schema.mjs
 *
 * Staged: `exercise-1` is a Postgres migration and carries its own
 * per-exercise `unverifiable` reason, so only `partitions` has cases.
 *
 * What makes this function worth testing is not its difficulty — it is date
 * arithmetic and a Set — but the shape of its failure. A range-partitioned
 * table has no default partition, so a row that falls outside every range is
 * REFUSED. Get this wrong and nothing breaks on the day you deploy it. It
 * breaks at midnight on the first of some future month, completely, for
 * everyone, with no message able to be sent at all.
 *
 * Every mistake below is therefore a time bomb rather than a bug, and they
 * are all invisible when the job runs successfully for months:
 *
 *   Off by one on monthsAhead — the runway is one month shorter than
 *   intended. Discovered on the first of a month, which is exactly the
 *   moment nobody wants to discover it.
 *
 *   Skipping the current month — assumes yesterday's job created it. True
 *   every day except the first one, and on a fresh database.
 *
 *   Not zero-padding — 'messages_2026_9' is a different string from
 *   'messages_2026_09', so the job cheerfully re-creates September every
 *   night and the CREATE fails, which looks like a broken job rather than a
 *   naming bug.
 *
 *   Naive month arithmetic — month 11 + 1 = 12 works until December, when
 *   it produces a thirteenth month or the wrong year.
 *
 * The fixtures use August (two digits) for the ordinary cases and December
 * for the rollover, so a padding bug cannot hide behind a month that happens
 * to be two digits already.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const STAMP = `function stamp(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return y + "-" + m + "-01";
}`;

export const stages = {
  partitions: {
    alternatives: [
      // Builds the name from parts rather than slicing the stamp.
      `${STAMP}
      function partitionsToCreate(existing, now, monthsAhead) {
        const have = new Set(existing || []);
        const out = [];
        for (let i = 0; i <= monthsAhead; i++) {
          const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
          const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
          const y = start.getUTCFullYear();
          const m = String(start.getUTCMonth() + 1).padStart(2, "0");
          const name = "messages_" + y + "_" + m;
          if (!have.has(name)) out.push({ name, from: stamp(start), to: stamp(end) });
        }
        return out;
      }`,

      // Generates all candidates, then filters.
      `${STAMP}
      function partitionsToCreate(existing, now, monthsAhead) {
        const have = new Set(existing || []);
        const months = [];
        for (let i = 0; i <= monthsAhead; i++) months.push(i);
        return months
          .map(function (i) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
            return {
              name: "messages_" + stamp(start).slice(0, 7).replace("-", "_"),
              from: stamp(start),
              to: stamp(end),
            };
          })
          .filter(function (p) { return !have.has(p.name); });
      }`,

      // Carries year/month as numbers but normalises through Date.UTC.
      `${STAMP}
      function partitionsToCreate(existing, now, monthsAhead) {
        const have = existing || [];
        const out = [];
        let y = now.getUTCFullYear();
        let m = now.getUTCMonth();
        for (let i = 0; i <= monthsAhead; i++) {
          const start = new Date(Date.UTC(y, m + i, 1));
          const end = new Date(Date.UTC(y, m + i + 1, 1));
          const name = "messages_" + stamp(start).slice(0, 4) + "_" + stamp(start).slice(5, 7);
          if (have.indexOf(name) === -1) {
            out.push({ name: name, from: stamp(start), to: stamp(end) });
          }
        }
        return out;
      }`,
    ],

    mistakes: [
      {
        // Off by one: i < monthsAhead, so the runway is a month short.
        expect: "an empty database gets the current month plus the runway",
        impl: `${STAMP}
        function partitionsToCreate(existing, now, monthsAhead) {
          const have = new Set(existing || []);
          const out = [];
          for (let i = 0; i < monthsAhead; i++) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
            const name = "messages_" + stamp(start).slice(0, 7).replace("-", "_");
            if (!have.has(name)) out.push({ name, from: stamp(start), to: stamp(end) });
          }
          return out;
        }`,
      },
      {
        // Starts at next month, assuming the current one already exists.
        // True every day except on a fresh database or the 1st.
        expect: "monthsAhead 0 still creates the current month",
        impl: `${STAMP}
        function partitionsToCreate(existing, now, monthsAhead) {
          const have = new Set(existing || []);
          const out = [];
          for (let i = 1; i <= monthsAhead; i++) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
            const name = "messages_" + stamp(start).slice(0, 7).replace("-", "_");
            if (!have.has(name)) out.push({ name, from: stamp(start), to: stamp(end) });
          }
          return out;
        }`,
      },
      {
        // No zero-padding. Invisible for months 10-12, wrong for 1-9.
        expect: "single-digit months are zero-padded",
        impl: `function partitionsToCreate(existing, now, monthsAhead) {
          const have = new Set(existing || []);
          const out = [];
          for (let i = 0; i <= monthsAhead; i++) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
            const y = start.getUTCFullYear();
            const m = start.getUTCMonth() + 1;
            const name = "messages_" + y + "_" + m;
            if (!have.has(name)) {
              out.push({ name: name, from: y + "-" + m + "-01", to: "", });
            }
          }
          return out;
        }`,
      },
      {
        // Naive month arithmetic: does not roll the year over.
        expect: "December rolls into the next year",
        impl: `function partitionsToCreate(existing, now, monthsAhead) {
          const have = new Set(existing || []);
          const out = [];
          const y = now.getUTCFullYear();
          for (let i = 0; i <= monthsAhead; i++) {
            const m = now.getUTCMonth() + 1 + i;          // 1-based, unwrapped
            const mm = String(m).padStart(2, "0");
            const nm = String(m + 1).padStart(2, "0");
            const name = "messages_" + y + "_" + mm;
            if (!have.has(name)) {
              out.push({ name: name, from: y + "-" + mm + "-01", to: y + "-" + nm + "-01" });
            }
          }
          return out;
        }`,
      },
      {
        // 'to' is the last day of the month rather than the first of the
        // next. Postgres bounds are [from, to), so the final day of every
        // month belongs to no partition -- an outage one day in thirty.
        expect: "bounds are the first of this month to the first of the next",
        impl: `${STAMP}
        function partitionsToCreate(existing, now, monthsAhead) {
          const have = new Set(existing || []);
          const out = [];
          for (let i = 0; i <= monthsAhead; i++) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 0));
            const name = "messages_" + stamp(start).slice(0, 7).replace("-", "_");
            const to = lastDay.getUTCFullYear() + "-" +
              String(lastDay.getUTCMonth() + 1).padStart(2, "0") + "-" +
              String(lastDay.getUTCDate()).padStart(2, "0");
            if (!have.has(name)) out.push({ name: name, from: stamp(start), to: to });
          }
          return out;
        }`,
      },
      {
        // Ignores `existing` entirely, so the job tries to re-create every
        // partition on every run and errors after the first night.
        expect: "nothing missing returns an empty array",
        impl: `${STAMP}
        function partitionsToCreate(existing, now, monthsAhead) {
          const out = [];
          for (let i = 0; i <= monthsAhead; i++) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
            const name = "messages_" + stamp(start).slice(0, 7).replace("-", "_");
            out.push({ name: name, from: stamp(start), to: stamp(end) });
          }
          return out;
        }`,
      },
      {
        // Stops at the first month it already has, instead of skipping it,
        // so a gap earlier in the window is never filled.
        expect: "a gap in the middle is filled, in order",
        impl: `${STAMP}
        function partitionsToCreate(existing, now, monthsAhead) {
          const have = new Set(existing || []);
          const out = [];
          for (let i = 0; i <= monthsAhead; i++) {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
            const name = "messages_" + stamp(start).slice(0, 7).replace("-", "_");
            if (have.has(name)) break;
            out.push({ name: name, from: stamp(start), to: stamp(end) });
          }
          return out;
        }`,
      },
    ],
  },
};
