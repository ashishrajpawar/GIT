/* Wrong-answer cases for b9/0003 — planPrune.
 *
 *   node scripts/verify-lesson.mjs modules/b9-docker-deployment/0003-logs-backups-monitoring.html \
 *        --wrong scripts/cases/0003-logs-backups-monitoring.mjs
 *
 * Staged: `exercise-1` is the ops stack — pino, a bash script and an Express
 * route needing a VPS — and carries its own per-exercise `unverifiable`
 * reason, so only `prune` has cases.
 *
 * This is the only decision in the lesson that is wrong in BOTH directions,
 * and the mistakes divide accordingly:
 *
 *   Keeping too much. Every one of these breaks a sentence b10/0002 publishes
 *   to users — "copies in our encrypted backups are overwritten within 7
 *   days" — and none of them errors. The prune runs nightly, reports success,
 *   and the data it promised to destroy is somewhere else. The shipped
 *   version of this bug is the first case below.
 *
 *   Deleting too much. Rarer and far louder, except for the one shape that
 *   matters: an age-based prune with no floor destroys every copy you have at
 *   precisely the moment your dumps have been failing, which is the moment you
 *   are about to need one.
 *
 *   Reporting wrongly. A breach rounded down reads as compliance, and a
 *   breach reported for a dump that is inside its retention trains whoever
 *   reads the list to ignore it — which is the same failure `check-pre-blocks`
 *   had on its first run, arriving as a compliance document instead of a
 *   build log.
 *
 * The one to look at hardest is `prunes-local-only`. It is what the lesson
 * shipped, it is what `rclone copy` and `rsync -az` do by default, and it
 * passes every fixture where the backups live in one place. It only fails
 * once there is a second copy — which is the whole reason the second copy
 * exists.
 *
 * TRIP COUNTS: 8 of the 11 trip exactly one check. The three that trip two
 * were each run on their own and the second trip is inherent, not a
 * diagnostics problem — recorded here so nobody "fixes" it later:
 *
 *   floor-over-expired-only     keeps d20 AND files it as a breach. One wrong
 *                               floor, and the breach list is derived from it.
 *   first-copy-wins             dx is not verified, so BOTH its copies go —
 *                               which is two assertions about one fixture.
 *   daysOver-is-the-age         wrong on the whole-day fixture and wrong on
 *                               the half-day one. Same field, same mistake.
 *
 * Two fixtures had to be sharpened before any of that was true, and both
 * failures were the same kind — a fixture that could not express the rule:
 *
 *   The boundary and the breach guard were entangled. d7 was verified, so it
 *   was also in the floor, so a >= mistake still KEPT it — as a rescue rather
 *   than as something inside its retention. Making d7 unchecked puts it
 *   outside the floor and leaves the boundary observable on its own.
 *
 *   The mutation check used baseSet(), which is already newest-first, so
 *   sorting it in place changed nothing and an implementation that mutates
 *   passed. It now uses a deliberately scrambled list.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // Anything that runs before the work. Used by the mutation case.
    prelude: ``,

    // Rule 4: fold files into the dumps they are copies of.
    group: `const seen = dumps.get(file.id);
    if (seen) {
      if (file.status === "verified") seen.verified = true;
    } else {
      dumps.set(file.id, {
        id: file.id,
        takenAt: file.takenAt,
        verified: file.status === "verified",
      });
    }`,

    // Rule 1: strictly older than the promise.
    expired: `return ageOf(dump) > retentionDays;`,

    // Rule 3: the N most recent verified DUMPS, over all of them.
    floor: `const floor = new Set(
    Array.from(dumps.values())
      .filter(function (d) { return d.verified; })
      .sort(function (a, b) {
        return b.takenAt - a.takenAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      })
      .slice(0, minVerified)
      .map(function (d) { return d.id; })
  );`,

    // Rule 5: expired AND rescued by the floor, overshoot rounded up.
    breach: `for (const dump of dumps.values()) {
    if (!isExpired(dump) || !floor.has(dump.id)) continue;
    breaches.push({
      id: dump.id,
      daysOver: Math.ceil(ageOf(dump) - retentionDays),
    });
  }`,

    // Rule 2 + 7: every copy shares its dump's fate.
    partition: `for (const file of backups) {
    const dump = dumps.get(file.id);
    if (!isExpired(dump) || floor.has(dump.id)) keep.push(file);
    else remove.push(file);
  }`,

    ...overrides,
  };

  return `function planPrune(backups, options) {
  const DAY = 24 * 60 * 60 * 1000;
  const now = options.now;
  const retentionDays = options.retentionDays;
  const minVerified = options.minVerified || 0;
  ${o.prelude}

  const dumps = new Map();
  for (const file of backups) {
    ${o.group}
  }

  function ageOf(dump) {
    return (now - dump.takenAt) / DAY;
  }
  function isExpired(dump) {
    ${o.expired}
  }

  ${o.floor}

  const breaches = [];
  ${o.breach}

  const keep = [];
  const remove = [];
  ${o.partition}

  function newestFirst(a, b) {
    if (b.takenAt !== a.takenAt) return b.takenAt - a.takenAt;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    if (a.location !== b.location) return a.location < b.location ? -1 : 1;
    return 0;
  }
  keep.sort(newestFirst);
  remove.sort(newestFirst);
  breaches.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });

  return { keep: keep, remove: remove, breaches: breaches };
}`;
}

export const stages = {
  prune: {
    alternatives: [
      // Decide once per dump, then map the files. Same rules, expressed as a
      // table of decisions rather than a pair of loops that each re-derive
      // expiry.
      `function planPrune(backups, options) {
        const DAY = 86400000;
        const { now, retentionDays } = options;
        const minVerified = options.minVerified || 0;

        const byId = new Map();
        backups.forEach(function (file) {
          const d = byId.get(file.id) || { id: file.id, takenAt: file.takenAt, verified: false };
          d.verified = d.verified || file.status === "verified";
          byId.set(file.id, d);
        });

        const dumps = Array.from(byId.values()).map(function (d) {
          return Object.assign({}, d, { age: (now - d.takenAt) / DAY });
        });
        dumps.forEach(function (d) { d.expired = d.age > retentionDays; });

        const rescued = dumps
          .filter(function (d) { return d.verified; })
          .sort(function (a, b) { return b.takenAt - a.takenAt || a.id.localeCompare(b.id); })
          .slice(0, minVerified);
        const rescuedIds = new Set(rescued.map(function (d) { return d.id; }));

        const decision = new Map();
        dumps.forEach(function (d) {
          decision.set(d.id, !d.expired || rescuedIds.has(d.id) ? "keep" : "remove");
        });

        const cmp = function (a, b) {
          return (b.takenAt - a.takenAt) ||
                 a.id.localeCompare(b.id) ||
                 a.location.localeCompare(b.location);
        };

        return {
          keep: backups.filter(function (x) { return decision.get(x.id) === "keep"; }).sort(cmp),
          remove: backups.filter(function (x) { return decision.get(x.id) === "remove"; }).sort(cmp),
          breaches: dumps
            .filter(function (d) { return d.expired && rescuedIds.has(d.id); })
            .map(function (d) { return { id: d.id, daysOver: Math.ceil(d.age - retentionDays) }; })
            .sort(function (a, b) { return a.id.localeCompare(b.id); }),
        };
      }`,

      // Plain objects instead of Map/Set, and reduce for the grouping. Reads
      // differently and agrees on every rule.
      `function planPrune(backups, options) {
        var DAY = 24 * 60 * 60 * 1000;
        var now = options.now;
        var keepDays = options.retentionDays;
        var floorSize = options.minVerified || 0;

        var dumps = backups.reduce(function (acc, file) {
          if (!acc[file.id]) {
            acc[file.id] = { id: file.id, takenAt: file.takenAt, verified: false };
          }
          if (file.status === "verified") acc[file.id].verified = true;
          return acc;
        }, {});

        var all = Object.keys(dumps).map(function (k) { return dumps[k]; });
        var age = function (d) { return (now - d.takenAt) / DAY; };
        var expired = function (d) { return age(d) > keepDays; };

        var floorList = all
          .filter(function (d) { return d.verified; })
          .sort(function (a, b) {
            if (b.takenAt !== a.takenAt) return b.takenAt - a.takenAt;
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
          })
          .slice(0, floorSize)
          .map(function (d) { return d.id; });
        var inFloor = function (id) { return floorList.indexOf(id) !== -1; };

        var survives = function (file) {
          var d = dumps[file.id];
          return !expired(d) || inFloor(d.id);
        };

        var order = function (a, b) {
          if (b.takenAt !== a.takenAt) return b.takenAt - a.takenAt;
          if (a.id !== b.id) return a.id < b.id ? -1 : 1;
          if (a.location !== b.location) return a.location < b.location ? -1 : 1;
          return 0;
        };

        return {
          keep: backups.filter(survives).sort(order),
          remove: backups.filter(function (x) { return !survives(x); }).sort(order),
          breaches: all
            .filter(function (d) { return expired(d) && inFloor(d.id); })
            .map(function (d) { return { id: d.id, daysOver: Math.ceil(age(d) - keepDays) }; })
            .sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }),
        };
      }`,

      // The floor derived by taking a slice of ALL dumps sorted newest-first
      // after filtering, expressed with a counter rather than slice. Included
      // because an off-by-one here is the natural mistake and this style is
      // where people write it.
      build({
        floor: `const verifiedNewestFirst = Array.from(dumps.values())
    .filter(function (d) { return d.verified; })
    .sort(function (a, b) {
      if (b.takenAt !== a.takenAt) return b.takenAt - a.takenAt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  const floor = new Set();
  for (let i = 0; i < verifiedNewestFirst.length && floor.size < minVerified; i++) {
    floor.add(verifiedNewestFirst[i].id);
  }`,
      }),
    ],

    mistakes: [
      {
        // THE SHIPPED BUG. The prune only reaches the directory it can see,
        // which is exactly what `rclone copy` and `rsync -az` leave you with:
        // a server that is tidy and a bucket that is a permanent archive of
        // everything you told users you had destroyed.
        expect: "the OFF-SITE copy of an expired dump is removed too",
        impl: build({
          partition: `for (const file of backups) {
    const dump = dumps.get(file.id);
    // Only the local directory is pruned -- everywhere else is "a backup of
    // the backups" and nobody gave it a clock.
    if (file.location !== "local" || !isExpired(dump) || floor.has(dump.id)) keep.push(file);
    else remove.push(file);
  }`,
        }),
      },
      {
        // >= instead of >. A dump that is exactly at the promise is inside it,
        // and this destroys it a day early. Harmless-looking, and the same
        // one-character difference that a10/0002's lock timeout turned on.
        expect: "exactly retentionDays old is still inside the promise",
        impl: build({ expired: `return ageOf(dump) >= retentionDays;` }),
      },
      {
        // The floor computed over the EXPIRED dumps only. Reads as "rescue
        // the best of what I was about to delete", which sounds careful and
        // means an ancient dump is kept for ever while three recent verified
        // ones already cover you.
        expect: "the floor is measured over ALL verified dumps, not only expired ones",
        impl: build({
          floor: `const floor = new Set(
    Array.from(dumps.values())
      .filter(function (d) { return d.verified && ageOf(d) > retentionDays; })
      .sort(function (a, b) {
        return b.takenAt - a.takenAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      })
      .slice(0, minVerified)
      .map(function (d) { return d.id; })
  );`,
        }),
      },
      {
        // The floor counted in FILES. "Keep two backups" is satisfied by one
        // dump uploaded to two places -- so you have two files, one point in
        // time, and no answer at all if that point in time is the one the bad
        // migration ran just before.
        expect: "the floor counts distinct dumps, not files",
        impl: build({
          floor: `const floor = new Set(
    backups
      .filter(function (b) { return b.status === "verified"; })
      .sort(function (a, b) {
        return b.takenAt - a.takenAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      })
      .slice(0, minVerified)
      .map(function (b) { return b.id; })
  );`,
        }),
      },
      {
        // "Not corrupt" treated as good. This is the three-state collapse:
        // unchecked and verified are different facts, and only one of them is
        // about whether the file can be restored. The lesson's own line --
        // a backup you have never restored from is not a backup -- is exactly
        // the sentence this ignores.
        expect: "an unchecked dump never counts toward the floor",
        impl: build({
          group: `const seen = dumps.get(file.id);
    if (seen) {
      if (file.status !== "corrupt") seen.verified = true;
    } else {
      dumps.set(file.id, {
        id: file.id,
        takenAt: file.takenAt,
        verified: file.status !== "corrupt",
      });
    }`,
        }),
      },
      {
        // First copy wins. The grouping never merges status, so whether a
        // dump counts as restorable depends on the order the files happened
        // to be listed in -- which is directory order, i.e. nothing.
        expect: "a dump is verified if ANY copy of it is",
        impl: build({
          group: `if (!dumps.has(file.id)) {
      dumps.set(file.id, {
        id: file.id,
        takenAt: file.takenAt,
        verified: file.status === "verified",
      });
    }`,
        }),
      },
      {
        // Reports the age instead of the overshoot. Not a rounding error --
        // a 30-day-old dump under a 7-day promise is 23 days in breach, and
        // saying 30 misstates by more than the promise itself.
        expect: "daysOver is the overshoot past retention, not the age",
        impl: build({
          breach: `for (const dump of dumps.values()) {
    if (!isExpired(dump) || !floor.has(dump.id)) continue;
    breaches.push({ id: dump.id, daysOver: Math.ceil(ageOf(dump)) });
  }`,
        }),
      },
      {
        // Rounded down. Every breach under a day reports as zero, which reads
        // as compliance in the one document where reading it wrongly is the
        // whole risk.
        expect: "daysOver rounds a breach UP, never in your own favour",
        impl: build({
          breach: `for (const dump of dumps.values()) {
    if (!isExpired(dump) || !floor.has(dump.id)) continue;
    breaches.push({ id: dump.id, daysOver: Math.floor(ageOf(dump) - retentionDays) });
  }`,
        }),
      },
      {
        // The isExpired guard dropped, so floor membership alone is a breach.
        // Every healthy nightly run now files two breaches, and the list stops
        // being read within a week -- which is when the real one arrives.
        expect: "floor membership is not a breach; being past the promise is",
        impl: build({
          breach: `for (const dump of dumps.values()) {
    if (!floor.has(dump.id)) continue;
    breaches.push({
      id: dump.id,
      daysOver: Math.ceil(ageOf(dump) - retentionDays),
    });
  }`,
        }),
      },
      {
        // A corrupt file is skipped entirely: "it is not a backup, so it is
        // not mine to delete". It holds the identical rows. Being unreadable
        // by you says nothing about who else can read it, and nothing at all
        // about the promise.
        expect: "a corrupt dump past retention is removed, and never fills the floor",
        impl: build({
          partition: `for (const file of backups) {
    if (file.status === "corrupt") { keep.push(file); continue; }
    const dump = dumps.get(file.id);
    if (!isExpired(dump) || floor.has(dump.id)) keep.push(file);
    else remove.push(file);
  }`,
        }),
      },
      {
        // Sorts the caller's array in place to get the newest first. The
        // cheapest possible way to break rule 7, and the one nobody notices
        // until a second caller reads the list afterwards.
        expect: "the input array is not mutated",
        impl: build({
          prelude: `backups.sort(function (a, b) { return b.takenAt - a.takenAt; });`,
        }),
      },
    ],
  },
};
