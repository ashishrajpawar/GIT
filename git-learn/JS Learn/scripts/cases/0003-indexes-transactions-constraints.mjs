/* Wrong-answer cases for b1/0003 — chooseIndex.
 *
 *   node scripts/verify-lesson.mjs modules/b1-sql-fundamentals/0003-indexes-transactions-constraints.html \
 *        --wrong scripts/cases/0003-indexes-transactions-constraints.mjs
 *
 * Staged: `exercise-1` is a SQL transaction and CREATE INDEX statements
 * needing a running Postgres, and carries its own per-exercise
 * `unverifiable` reason, so only `index` has cases.
 *
 * Every mistake here fails in the SAME direction, which is what makes this
 * function worth writing down at all: it says an index will be used when it
 * will not. Nothing errors, the query returns the right rows, and the only
 * symptom is a table scan that gets slower every month. The wrong answer is
 * indistinguishable from the right one until the table is too big to fix
 * quietly.
 *
 * The ones to look at hardest are the first two. `no-leftmost-prefix` is what
 * you get if you think of an index as "the columns it covers" rather than as
 * one sorted list, and it is the single most common index misconception
 * there is. `keeps-zero-usable` gets the prefix arithmetic exactly right and
 * then hands back an index that cannot be entered — the belief that a
 * partially-matching index is a slow index rather than no index.
 *
 * Both trip the same check, and deliberately so: "an index cannot be entered
 * from its second column" is the one assertion that catches getting the
 * prefix wrong AND getting right what to do with a prefix of zero. Two
 * different bugs, one rule, and the rule is the point.
 *
 * TRIP COUNTS: 8 of 13 trip exactly one check; the rest trip two or three
 * and every one was run individually and is inherent:
 *
 *   The three leftmost-prefix mistakes each trip several of "entered from
 *   the second column", "a gap ends the prefix" and "no usable prefix is a
 *   sequential scan". Those three checks are ONE rule observed at three
 *   positions -- a gap at column 0, a gap later, and what to do when the
 *   answer is zero -- so an implementation that gets the rule wrong gets all
 *   three wrong. They are kept separate because they read as three different
 *   surprises to someone learning it, not because a mistake can isolate one.
 *
 *   `partial-always-true` trips both partial checks, which is one rule.
 *   `sort-must-start-at-zero` trips both ORDER BY checks that depend on
 *   knowing where the equality prefix ends, which is also one rule.
 *
 * One case was narrowed rather than kept: counting every filtered column
 * wherever it appeared tripped four checks and simply subsumed
 * `no-leftmost-prefix`. It is now `continue` where the rule needs `break` --
 * the same bug, one keyword wide, and the keyword you actually reach for
 * when the loop reads as "count what we have filters for".
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // Anything before the work. Used by the mutation case.
    prelude: ``,

    // Rule 4: prove the query stays inside a partial index.
    predicateProven: `if (!index.partial) return true;
    const f = filterFor(index.partial.column);
    return !!f && f.op === "eq" && f.value === index.partial.value;`,

    // Rules 1 and 2: walk from the left, stop at a gap, stop after a range.
    usablePrefix: `let n = 0;
    for (const column of index.columns) {
      const f = filterFor(column);
      if (!f) break;
      n++;
      if (f.op === "range") break;
    }
    return n;`,

    // Rule 5's shorter walk: leading EQUALITY columns only.
    equalityPrefix: `let n = 0;
    for (const column of index.columns) {
      const f = filterFor(column);
      if (!f || f.op !== "eq") break;
      n++;
    }
    return n;`,

    avoidsSort: `if (orderBy.length === 0) return true;
    const directions = new Set(orderBy.map(function (o) { return o.direction || "asc"; }));
    if (directions.size > 1) return false;
    const start = equalityPrefix(index);
    for (let i = 0; i < orderBy.length; i++) {
      if (index.columns[start + i] !== orderBy[i].column) return false;
    }
    return true;`,

    // Rule 3 lives here: a prefix of zero is not a candidate at all.
    collect: `for (const index of indexes) {
    if (!predicateProven(index)) continue;
    const usable = usablePrefix(index);
    if (usable === 0) continue;
    candidates.push({
      index: index,
      usableColumns: usable,
      avoidsSort: avoidsSort(index),
      isPartial: !!index.partial,
    });
  }`,

    // Rule 6, in order.
    rank: `candidates.sort(function (a, b) {
    if (a.usableColumns !== b.usableColumns) return b.usableColumns - a.usableColumns;
    if (a.avoidsSort !== b.avoidsSort) return a.avoidsSort ? -1 : 1;
    if (a.isPartial !== b.isPartial) return a.isPartial ? -1 : 1;
    const width = a.index.columns.length - b.index.columns.length;
    if (width !== 0) return width;
    return a.index.name < b.index.name ? -1 : a.index.name > b.index.name ? 1 : 0;
  });`,

    ...overrides,
  };

  return `function chooseIndex(indexes, query) {
  const filters = query.filters || [];
  const orderBy = query.orderBy || [];
  ${o.prelude}

  function filterFor(column) {
    for (const f of filters) if (f.column === column) return f;
    return null;
  }

  function predicateProven(index) {
    ${o.predicateProven}
  }

  function usablePrefix(index) {
    ${o.usablePrefix}
  }

  function equalityPrefix(index) {
    ${o.equalityPrefix}
  }

  function avoidsSort(index) {
    ${o.avoidsSort}
  }

  const candidates = [];
  ${o.collect}

  if (candidates.length === 0) {
    return { name: null, usableColumns: 0, avoidsSort: false };
  }

  ${o.rank}

  const best = candidates[0];
  return {
    name: best.index.name,
    usableColumns: best.usableColumns,
    avoidsSort: best.avoidsSort,
  };
}`;
}

export const stages = {
  index: {
    alternatives: [
      // Score each index into a comparable tuple, then pick the maximum in
      // one pass. Same rules, no sort.
      `function chooseIndex(indexes, query) {
        const filters = query.filters || [];
        const orderBy = query.orderBy || [];
        const find = function (col) {
          return filters.filter(function (f) { return f.column === col; })[0] || null;
        };

        const proven = function (ix) {
          if (!ix.partial) return true;
          const f = find(ix.partial.column);
          return Boolean(f) && f.op === "eq" && f.value === ix.partial.value;
        };

        const walk = function (ix, stopAtRange) {
          let n = 0;
          for (let i = 0; i < ix.columns.length; i++) {
            const f = find(ix.columns[i]);
            if (!f) break;
            if (!stopAtRange && f.op !== "eq") break;
            n++;
            if (stopAtRange && f.op === "range") break;
          }
          return n;
        };

        const sorted = function (ix) {
          if (orderBy.length === 0) return true;
          const dirs = orderBy.map(function (o) { return o.direction || "asc"; });
          if (dirs.some(function (d) { return d !== dirs[0]; })) return false;
          const from = walk(ix, false);
          return orderBy.every(function (o, i) { return ix.columns[from + i] === o.column; });
        };

        let best = null;
        let bestKey = null;
        indexes.forEach(function (ix) {
          if (!proven(ix)) return;
          const usable = walk(ix, true);
          if (usable === 0) return;
          const key = [usable, sorted(ix) ? 1 : 0, ix.partial ? 1 : 0, -ix.columns.length];
          const better = bestKey === null || key.some(function (v, i) {
            return v !== bestKey[i] && key.slice(0, i).every(function (w, j) { return w === bestKey[j]; })
                   ? v > bestKey[i] : false;
          }) || (key.every(function (v, i) { return v === bestKey[i]; }) && ix.name < best.name);
          if (better) { best = ix; bestKey = key; }
        });

        if (!best) return { name: null, usableColumns: 0, avoidsSort: false };
        return { name: best.name, usableColumns: walk(best, true), avoidsSort: sorted(best) };
      }`,

      // A Map of column -> filter built once, and the ranking expressed as a
      // chain of comparator functions rather than a single body.
      `function chooseIndex(indexes, query) {
        var filters = query.filters || [];
        var orderBy = query.orderBy || [];

        var byColumn = new Map();
        filters.forEach(function (f) { if (!byColumn.has(f.column)) byColumn.set(f.column, f); });

        function prefix(ix, allowRange) {
          var n = 0;
          for (var i = 0; i < ix.columns.length; i++) {
            var f = byColumn.get(ix.columns[i]);
            if (!f) return n;
            if (f.op === "range") return allowRange ? n + 1 : n;
            n++;
          }
          return n;
        }

        function ordered(ix) {
          if (!orderBy.length) return true;
          var first = orderBy[0].direction || "asc";
          for (var i = 0; i < orderBy.length; i++) {
            if ((orderBy[i].direction || "asc") !== first) return false;
          }
          var base = prefix(ix, false);
          for (var j = 0; j < orderBy.length; j++) {
            if (ix.columns[base + j] !== orderBy[j].column) return false;
          }
          return true;
        }

        function allowed(ix) {
          if (!ix.partial) return true;
          var f = byColumn.get(ix.partial.column);
          return !!f && f.op === "eq" && f.value === ix.partial.value;
        }

        var pool = indexes
          .filter(allowed)
          .map(function (ix) {
            return { ix: ix, u: prefix(ix, true), s: ordered(ix), p: !!ix.partial };
          })
          .filter(function (c) { return c.u > 0; });

        if (!pool.length) return { name: null, usableColumns: 0, avoidsSort: false };

        var rules = [
          function (a, b) { return b.u - a.u; },
          function (a, b) { return (b.s ? 1 : 0) - (a.s ? 1 : 0); },
          function (a, b) { return (b.p ? 1 : 0) - (a.p ? 1 : 0); },
          function (a, b) { return a.ix.columns.length - b.ix.columns.length; },
          function (a, b) { return a.ix.name.localeCompare(b.ix.name); },
        ];

        var winner = pool.slice().sort(function (a, b) {
          for (var i = 0; i < rules.length; i++) {
            var r = rules[i](a, b);
            if (r !== 0) return r;
          }
          return 0;
        })[0];

        return { name: winner.ix.name, usableColumns: winner.u, avoidsSort: winner.s };
      }`,

      // The prefix walks written with a while loop and an explicit index,
      // which is where an off-by-one on the range column usually appears.
      build({
        usablePrefix: `let n = 0;
    while (n < index.columns.length) {
      const f = filterFor(index.columns[n]);
      if (!f) return n;
      if (f.op === "range") return n + 1;
      n++;
    }
    return n;`,
      }),
    ],

    mistakes: [
      {
        // Thinks of an index as "the columns it covers". Finds the first
        // column that IS filtered and walks from there, so (user_id, status)
        // looks helpful to a query on status alone. It is not: the active
        // rows sit a few under every user, scattered the length of the index.
        expect: "an index cannot be entered from its second column",
        impl: build({
          usablePrefix: `let start = -1;
    for (let i = 0; i < index.columns.length; i++) {
      if (filterFor(index.columns[i])) { start = i; break; }
    }
    if (start === -1) return 0;
    let n = 0;
    for (let i = start; i < index.columns.length; i++) {
      const f = filterFor(index.columns[i]);
      if (!f) break;
      n++;
      if (f.op === "range") break;
    }
    return n;`,
        }),
      },
      {
        // Gets the prefix arithmetic exactly right and then keeps the
        // candidate anyway -- the belief that an index you cannot enter is a
        // slow index rather than no index. Trips the same check, from the
        // other side.
        expect: "an index cannot be entered from its second column",
        impl: build({
          collect: `for (const index of indexes) {
    if (!predicateProven(index)) continue;
    candidates.push({
      index: index,
      usableColumns: usablePrefix(index),
      avoidsSort: avoidsSort(index),
      isPartial: !!index.partial,
    });
  }`,
        }),
      },
      {
        // Walks past the range. Within a RANGE of b, the c values start over
        // for every b -- so the index can narrow to the b range and not one
        // step further. This is the rule that decides composite column ORDER,
        // and getting it wrong makes a three-column index behave like a two.
        expect: "the first range ends the prefix; nothing after it counts",
        impl: build({
          usablePrefix: `let n = 0;
    for (const column of index.columns) {
      const f = filterFor(column);
      if (!f) break;
      n++;
    }
    return n;`,
        }),
      },
      {
        // `continue` where the rule needs `break`. One keyword, and it is the
        // keyword you reach for when the loop reads as "count the columns we
        // have a filter for" rather than "walk while the trail holds".
        expect: "a gap ends the prefix; a later filtered column does not rejoin",
        impl: build({
          usablePrefix: `let n = 0;
    for (const column of index.columns) {
      const f = filterFor(column);
      if (!f) continue;
      n++;
      if (f.op === "range") break;
    }
    return n;`,
        }),
      },
      {
        // Uses a partial index because its columns fit, without checking that
        // the query stays inside it. This one does not merely mis-plan: the
        // index holds only active rows, so the query silently returns a
        // SUBSET of the correct answer.
        expect: "a partial index is unusable when nothing proves its predicate",
        impl: build({ predicateProven: `return true;` }),
      },
      {
        // Matches the predicate column and ignores its value. An index of
        // active tokens contains no paused ones at all, so a query for paused
        // tokens against it returns nothing and looks like an empty result.
        expect: "the right predicate column with the wrong value proves nothing",
        impl: build({
          predicateProven: `if (!index.partial) return true;
    return !!filterFor(index.partial.column);`,
        }),
      },
      {
        // Starts the ORDER BY match at the USABLE prefix rather than the
        // EQUALITY prefix. Those are the same number until a range is
        // involved, which is exactly when the answer changes: rows come back
        // grouped by the range column, not by what was asked for.
        expect: "a RANGE before the sort column brings the sort back",
        impl: build({
          avoidsSort: `if (orderBy.length === 0) return true;
    const directions = new Set(orderBy.map(function (o) { return o.direction || "asc"; }));
    if (directions.size > 1) return false;
    const start = usablePrefix(index);
    for (let i = 0; i < orderBy.length; i++) {
      if (index.columns[start + i] !== orderBy[i].column) return false;
    }
    return true;`,
        }),
      },
      {
        // Requires the sort to start at column zero, forgetting that an
        // equality-filtered leading column is pinned to one value and the
        // rest of the index is still in order underneath it. Reports a sort
        // for the commonest well-designed query there is.
        expect: "the sort disappears when it follows the equality columns",
        impl: build({
          avoidsSort: `if (orderBy.length === 0) return true;
    const directions = new Set(orderBy.map(function (o) { return o.direction || "asc"; }));
    if (directions.size > 1) return false;
    for (let i = 0; i < orderBy.length; i++) {
      if (index.columns[i] !== orderBy[i].column) return false;
    }
    return true;`,
        }),
      },
      {
        // Ignores direction entirely. A backwards scan is free, so uniform
        // DESC is genuinely fine -- which is why this passes every test you
        // would think to write, until someone sorts two columns opposite ways
        // and the sort node comes back without warning.
        expect: "mixed directions cannot come from one pass over one sorted list",
        impl: build({
          avoidsSort: `if (orderBy.length === 0) return true;
    const start = equalityPrefix(index);
    for (let i = 0; i < orderBy.length; i++) {
      if (index.columns[start + i] !== orderBy[i].column) return false;
    }
    return true;`,
        }),
      },
      {
        // Ranks a free sort above a narrower scan. Sorting is the cheap half:
        // 10 rows sort instantly, and the alternative is reading 10 million
        // to find them.
        expect: "filtering beats sorting: 2 usable columns outrank a free sort",
        impl: build({
          rank: `candidates.sort(function (a, b) {
    if (a.avoidsSort !== b.avoidsSort) return a.avoidsSort ? -1 : 1;
    if (a.usableColumns !== b.usableColumns) return b.usableColumns - a.usableColumns;
    if (a.isPartial !== b.isPartial) return a.isPartial ? -1 : 1;
    const width = a.index.columns.length - b.index.columns.length;
    if (width !== 0) return width;
    return a.index.name < b.index.name ? -1 : a.index.name > b.index.name ? 1 : 0;
  });`,
        }),
      },
      {
        // Drops the width tie-break, so which of three equally usable indexes
        // wins comes down to alphabetical order -- a wider index costs more to
        // maintain on every INSERT and buys nothing here.
        expect: "among equals the narrower index wins",
        impl: build({
          rank: `candidates.sort(function (a, b) {
    if (a.usableColumns !== b.usableColumns) return b.usableColumns - a.usableColumns;
    if (a.avoidsSort !== b.avoidsSort) return a.avoidsSort ? -1 : 1;
    if (a.isPartial !== b.isPartial) return a.isPartial ? -1 : 1;
    return a.index.name < b.index.name ? -1 : a.index.name > b.index.name ? 1 : 0;
  });`,
        }),
      },
      {
        // Drops the partial tie-break. Both indexes work; the partial one
        // holds a fraction of the rows, which is the entire reason to build a
        // partial index and the reason it should win a tie.
        expect: "a proven partial index beats the equivalent full one",
        impl: build({
          rank: `candidates.sort(function (a, b) {
    if (a.usableColumns !== b.usableColumns) return b.usableColumns - a.usableColumns;
    if (a.avoidsSort !== b.avoidsSort) return a.avoidsSort ? -1 : 1;
    const width = a.index.columns.length - b.index.columns.length;
    if (width !== 0) return width;
    return a.index.name < b.index.name ? -1 : a.index.name > b.index.name ? 1 : 0;
  });`,
        }),
      },
      {
        // Sorts the caller's index list in place to save an allocation.
        expect: "the caller's index list is not reordered",
        impl: build({
          prelude: `indexes.sort(function (a, b) { return b.columns.length - a.columns.length; });`,
        }),
      },
    ],
  },
};
