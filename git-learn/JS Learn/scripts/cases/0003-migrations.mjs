/* Wrong-answer cases for b2/0003 — planMigrations.
 *
 *   node scripts/verify-lesson.mjs modules/b2-schema-design/0003-migrations.html \
 *        --wrong scripts/cases/0003-migrations.mjs
 *
 * Staged: `exercise-1` is a Node migration runner needing Postgres and carries
 * its own per-exercise `unverifiable` reason, so only `plan` has cases.
 *
 * Every mistake here is a migration runner that WORKS. It applies pending
 * files, skips applied ones, and is a no-op on a clean tree — which is the
 * only behaviour anyone exercises day to day. What each one loses is a
 * refusal, and the refusals only matter on the day something has already gone
 * wrong somewhere else: a file edited after it ran, a branch merged in an
 * order nobody chose, a migration deleted from the repo.
 *
 * That is why the naive four-line runner survives for months. It is not
 * wrong about the common case. It has nothing to say about the rare one, and
 * the rare one is silent.
 *
 * The most damaging omission is `modified`, and it is the only one that
 * produces no error at all without a checksum: the runner sees a filename it
 * has already applied and skips it forever. This environment keeps the old
 * shape, a fresh database gets the new one, and nothing anywhere reports a
 * problem — the two schemas simply are not the same any more.
 *
 * One mistake fails in the other direction (refusing a legitimate later
 * migration because its number is not consecutive) because over-refusing is
 * the plausible over-correction once someone has been bitten by out-of-order.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  plan: {
    alternatives: [
      // find() over arrays rather than a Map, and early returns.
      `function planMigrations(applied, available) {
        const app = applied || [];
        const avail = available || [];
        for (const done of app) {
          const onDisk = avail.find(function (m) { return m.name === done.name; });
          if (!onDisk) return { toRun: [], error: { kind: "missing", name: done.name } };
          if (onDisk.checksum !== done.checksum) {
            return { toRun: [], error: { kind: "modified", name: done.name } };
          }
        }
        const doneNames = app.map(function (m) { return m.name; });
        const pending = avail.filter(function (m) { return doneNames.indexOf(m.name) === -1; });
        const high = app.length ? app[app.length - 1].name : "";
        const bad = pending.find(function (m) { return m.name < high; });
        if (bad) return { toRun: [], error: { kind: "out_of_order", name: bad.name } };
        return { toRun: pending, error: null };
      }`,

      // Collects the error first, then shapes the result once.
      `function planMigrations(applied, available) {
        const app = applied || [];
        const avail = available || [];
        const byName = new Map(avail.map(function (m) { return [m.name, m]; }));

        let error = null;
        for (const done of app) {
          const onDisk = byName.get(done.name);
          if (!onDisk) { error = { kind: "missing", name: done.name }; break; }
          if (onDisk.checksum !== done.checksum) {
            error = { kind: "modified", name: done.name }; break;
          }
        }

        const appliedNames = new Set(app.map(function (m) { return m.name; }));
        const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });

        if (!error) {
          const high = app.length ? app[app.length - 1].name : "";
          for (const m of pending) {
            if (m.name < high) { error = { kind: "out_of_order", name: m.name }; break; }
          }
        }

        return error ? { toRun: [], error: error } : { toRun: pending, error: null };
      }`,

      // Computes the high-water mark with reduce rather than trusting order.
      `function planMigrations(applied, available) {
        const app = applied || [];
        const avail = available || [];
        const byName = {};
        avail.forEach(function (m) { byName[m.name] = m; });

        for (let i = 0; i < app.length; i++) {
          const done = app[i];
          if (!byName[done.name]) return { toRun: [], error: { kind: "missing", name: done.name } };
          if (byName[done.name].checksum !== done.checksum) {
            return { toRun: [], error: { kind: "modified", name: done.name } };
          }
        }

        const high = app.reduce(function (acc, m) { return m.name > acc ? m.name : acc; }, "");
        const isApplied = function (n) { return app.some(function (m) { return m.name === n; }); };
        const pending = avail.filter(function (m) { return !isApplied(m.name); });

        for (let i = 0; i < pending.length; i++) {
          if (pending[i].name < high) {
            return { toRun: [], error: { kind: "out_of_order", name: pending[i].name } };
          }
        }
        return { toRun: pending, error: null };
      }`,
    ],

    mistakes: [
      {
        // No checksum comparison. The runner works perfectly and an edited
        // migration is skipped forever, silently.
        expect: "an edited migration is refused as 'modified'",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          for (const done of app) {
            if (!byName.has(done.name)) return { toRun: [], error: { kind: "missing", name: done.name } };
          }
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });
          const high = app.length ? app[app.length - 1].name : "";
          for (const m of pending) {
            if (m.name < high) return { toRun: [], error: { kind: "out_of_order", name: m.name } };
          }
          return { toRun: pending, error: null };
        }`,
      },
      {
        // No out-of-order check. The schema ends up depending on merge order.
        expect: "a migration inserted below the high-water mark is refused",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          for (const done of app) {
            const onDisk = byName.get(done.name);
            if (!onDisk) return { toRun: [], error: { kind: "missing", name: done.name } };
            if (onDisk.checksum !== done.checksum) {
              return { toRun: [], error: { kind: "modified", name: done.name } };
            }
          }
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          return { toRun: avail.filter(function (m) { return !appliedNames.has(m.name); }), error: null };
        }`,
      },
      {
        // No missing check -- a deleted applied migration passes silently,
        // and the repo can no longer reproduce the database.
        expect: "a deleted applied migration is refused as 'missing'",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          for (const done of app) {
            const onDisk = byName.get(done.name);
            if (onDisk && onDisk.checksum !== done.checksum) {
              return { toRun: [], error: { kind: "modified", name: done.name } };
            }
          }
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });
          const high = app.length ? app[app.length - 1].name : "";
          for (const m of pending) {
            if (m.name < high) return { toRun: [], error: { kind: "out_of_order", name: m.name } };
          }
          return { toRun: pending, error: null };
        }`,
      },
      {
        // Reports the error AND a plan. The runner would then apply part of
        // it and stop, leaving a state no file describes.
        expect: "an error means an EMPTY plan",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });
          for (const done of app) {
            const onDisk = byName.get(done.name);
            if (!onDisk) return { toRun: pending, error: { kind: "missing", name: done.name } };
            if (onDisk.checksum !== done.checksum) {
              return { toRun: pending, error: { kind: "modified", name: done.name } };
            }
          }
          const high = app.length ? app[app.length - 1].name : "";
          for (const m of pending) {
            if (m.name < high) return { toRun: pending, error: { kind: "out_of_order", name: m.name } };
          }
          return { toRun: pending, error: null };
        }`,
      },
      {
        // Over-corrects: demands consecutive numbering, so a legitimate
        // later migration with a gap in the sequence is refused.
        expect: "a gap in the numbering is fine as long as it sorts after",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          for (const done of app) {
            const onDisk = byName.get(done.name);
            if (!onDisk) return { toRun: [], error: { kind: "missing", name: done.name } };
            if (onDisk.checksum !== done.checksum) {
              return { toRun: [], error: { kind: "modified", name: done.name } };
            }
          }
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });
          const num = function (n) { return parseInt(n, 10); };
          let expected = app.length ? num(app[app.length - 1].name) + 1 : 1;
          for (const m of pending) {
            if (num(m.name) !== expected) {
              return { toRun: [], error: { kind: "out_of_order", name: m.name } };
            }
            expected += 1;
          }
          return { toRun: pending, error: null };
        }`,
      },
      {
        // Checks out-of-order BEFORE the applied-history checks, so a
        // merge that also edited an old migration reports the lesser
        // problem and hides the serious one.
        expect: "problems with already-applied migrations are reported first",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });
          const high = app.length ? app[app.length - 1].name : "";
          for (const m of pending) {
            if (m.name < high) return { toRun: [], error: { kind: "out_of_order", name: m.name } };
          }
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          for (const done of app) {
            const onDisk = byName.get(done.name);
            if (!onDisk) return { toRun: [], error: { kind: "missing", name: done.name } };
            if (onDisk.checksum !== done.checksum) {
              return { toRun: [], error: { kind: "modified", name: done.name } };
            }
          }
          return { toRun: pending, error: null };
        }`,
      },
      {
        // Treats "nothing to do" as an error, so every ordinary deploy on a
        // clean tree fails the migration step.
        expect: "nothing pending is an empty plan, not an error",
        impl: `function planMigrations(applied, available) {
          const app = applied || [];
          const avail = available || [];
          const byName = new Map(avail.map(function (m) { return [m.name, m]; }));
          for (const done of app) {
            const onDisk = byName.get(done.name);
            if (!onDisk) return { toRun: [], error: { kind: "missing", name: done.name } };
            if (onDisk.checksum !== done.checksum) {
              return { toRun: [], error: { kind: "modified", name: done.name } };
            }
          }
          const appliedNames = new Set(app.map(function (m) { return m.name; }));
          const pending = avail.filter(function (m) { return !appliedNames.has(m.name); });
          if (pending.length === 0) {
            return { toRun: [], error: { kind: "nothing_to_do", name: null } };
          }
          const high = app.length ? app[app.length - 1].name : "";
          for (const m of pending) {
            if (m.name < high) return { toRun: [], error: { kind: "out_of_order", name: m.name } };
          }
          return { toRun: pending, error: null };
        }`,
      },
    ],
  },
};
