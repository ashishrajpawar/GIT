/* Wrong-answer cases for b3/0003 — buildPage.
 *
 *   node scripts/verify-lesson.mjs modules/b3-node-http-server/0003-rest-api-design.html \
 *        --wrong scripts/cases/0003-rest-api-design.mjs
 *
 * Staged: `exercise-1` is an Express API needing Postgres and carries its own
 * per-exercise `unverifiable` reason, so only `page` has cases.
 *
 * Cursor pagination is four lines and three of them can be wrong in a way that
 * only shows up at a page boundary — which is to say, never on the first
 * screen, and only for users who scroll.
 *
 * The two that matter:
 *
 *   hasMore computed AFTER trimming. Always false, so the client stops at one
 *   page and every list in the product silently truncates at 20 items. Looks
 *   completely fine until someone has 21 of something.
 *
 *   The cursor taken from `rows` rather than `items`. They differ by exactly
 *   one row whenever there IS a next page, so the next query starts one row
 *   too far and that row is never shown to anyone. One invisible row per page
 *   boundary, and no error anywhere.
 *
 * `slice(0, -1)` is the interesting near-miss: it is correct whenever exactly
 * one extra row came back, which is every time the query is written properly.
 * It is included because it teaches the wrong reason for the right answer —
 * the row count is not guaranteed, and a caller that fetched limit + 5 gets
 * four rows too many.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  page: {
    alternatives: [
      // Early return for the last page rather than a ternary.
      `function buildPage(rows, limit) {
        const all = rows || [];
        if (all.length <= limit) {
          return { items: all, cursor: null, hasMore: false };
        }
        const items = all.slice(0, limit);
        const last = items[items.length - 1];
        return {
          items: items,
          cursor: { id: last.id, createdAt: last.created_at },
          hasMore: true,
        };
      }`,

      // Destructures and uses at() for the last element.
      `function buildPage(rows = [], limit) {
        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows.slice();
        const last = items.at(-1);
        const cursor = hasMore && last
          ? { id: last.id, createdAt: last.created_at }
          : null;
        return { items, cursor, hasMore };
      }`,

      // Builds the result object then fills in the cursor.
      `function buildPage(rows, limit) {
        const all = rows || [];
        const out = { items: [], cursor: null, hasMore: all.length > limit };
        out.items = out.hasMore ? all.filter(function (_, i) { return i < limit; }) : all;
        if (out.hasMore && out.items.length > 0) {
          const last = out.items[out.items.length - 1];
          out.cursor = { id: last.id, createdAt: last.created_at };
        }
        return out;
      }`,
    ],

    mistakes: [
      {
        // hasMore computed after trimming: always false. Every list in the
        // product stops at one page and nothing reports a problem.
        expect: "the extra row means hasMore",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const items = all.slice(0, limit);
          const hasMore = items.length > limit;
          const last = items[items.length - 1];
          return {
            items: items,
            cursor: hasMore && last ? { id: last.id, createdAt: last.created_at } : null,
            hasMore: hasMore,
          };
        }`,
      },
      {
        // THE off-by-one. Cursor from the probe row, so the next page starts
        // one row late and that row is never shown to anybody.
        expect: "the cursor points at the last ITEM, not the extra row",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const hasMore = all.length > limit;
          const items = hasMore ? all.slice(0, limit) : all;
          const last = all[all.length - 1];
          return {
            items: items,
            cursor: hasMore && last ? { id: last.id, createdAt: last.created_at } : null,
            hasMore: hasMore,
          };
        }`,
      },
      {
        // Returns the probe row as content, so some pages have limit + 1
        // items and the next page starts one row late as well.
        expect: "the extra row is not returned to the client",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const hasMore = all.length > limit;
          const last = all[all.length - 1];
          return {
            items: all,
            cursor: hasMore && last ? { id: last.id, createdAt: last.created_at } : null,
            hasMore: hasMore,
          };
        }`,
      },
      {
        // Emits a cursor on the last page. A client that loops while cursor
        // is non-null now asks for a page that will always come back empty,
        // forever.
        expect: "the last page has no cursor",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const hasMore = all.length > limit;
          const items = hasMore ? all.slice(0, limit) : all;
          const last = items[items.length - 1];
          return {
            items: items,
            cursor: last ? { id: last.id, createdAt: last.created_at } : null,
            hasMore: hasMore,
          };
        }`,
      },
      {
        // Cursor carries only the id. Works until two rows share a
        // created_at and the ORDER BY tie-break disagrees between pages.
        expect: "the cursor carries created_at as well as id",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const hasMore = all.length > limit;
          const items = hasMore ? all.slice(0, limit) : all;
          const last = items[items.length - 1];
          return {
            items: items,
            cursor: hasMore && last ? { id: last.id } : null,
            hasMore: hasMore,
          };
        }`,
      },
      {
        // Uses >= rather than >, so a full page with no extra row reports
        // hasMore and the client fetches one empty page every time.
        expect: "exactly limit rows is the last page",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const hasMore = all.length >= limit;
          const items = hasMore ? all.slice(0, limit) : all;
          const last = items[items.length - 1];
          return {
            items: items,
            cursor: hasMore && last ? { id: last.id, createdAt: last.created_at } : null,
            hasMore: hasMore,
          };
        }`,
      },
      {
        // Crashes on an empty result: reads .id off undefined. The empty
        // case is the one nobody clicks through to in testing.
        expect: "no rows is an empty page, not a crash",
        impl: `function buildPage(rows, limit) {
          const all = rows || [];
          const hasMore = all.length > limit;
          const items = hasMore ? all.slice(0, limit) : all;
          const last = items[items.length - 1];
          return {
            items: items,
            cursor: hasMore ? { id: last.id, createdAt: last.created_at } : { id: last.id },
            hasMore: hasMore,
          };
        }`,
      },
    ],
  },
};
