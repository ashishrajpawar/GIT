/* Wrong-answer cases for b3/0002 — matchRoute.
 *
 *   node scripts/verify-lesson.mjs modules/b3-node-http-server/0002-express-fastify-setup.html \
 *        --wrong scripts/cases/0002-express-fastify-setup.mjs
 *
 * Staged: `exercise-1` is the Express server and carries its own per-exercise
 * `unverifiable` reason, so only `match` has cases.
 *
 * The interesting mistake here is the one that makes the router BETTER than
 * Express: sorting candidates so the most specific pattern wins. It is what
 * most people assume already happens, it produces the behaviour you wanted,
 * and it is wrong — because the lesson is about predicting what Express will
 * actually do with a route file, and Express takes the first match in
 * registration order. A model that quietly fixes the bug cannot be used to
 * find the bug.
 *
 * The others are the ordinary ways a segment matcher goes wrong, and every
 * one of them produces a router that half-works:
 *
 *   Not comparing segment counts — '/tokens/:id' swallows
 *   '/tokens/42/messages', so the nested route is unreachable.
 *
 *   Letting a parameter match an empty segment — a trailing slash turns
 *   '/tokens/' into two segments and the list route becomes a detail route
 *   with an empty id.
 *
 *   Prefix matching instead of exact — '/tokens' matches everything under
 *   it, which is how a list endpoint starts answering detail requests.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const SPLIT = `function split(p) {
  return String(p).split("/").filter(function (seg) { return seg.length > 0; });
}`;

export const stages = {
  match: {
    alternatives: [
      // every()/reduce style rather than an inner for-loop.
      `${SPLIT}
      function matchRoute(routes, path) {
        const wanted = split(path);
        for (const pattern of routes || []) {
          const parts = split(pattern);
          if (parts.length !== wanted.length) continue;
          const params = {};
          const ok = parts.every(function (seg, i) {
            if (seg.charAt(0) === ":") {
              params[seg.slice(1)] = wanted[i];
              return true;
            }
            return seg === wanted[i];
          });
          if (ok) return { pattern: pattern, params: params };
        }
        return null;
      }`,

      // Builds a regex per pattern — a different mechanism entirely, and
      // still has to preserve first-match-wins.
      `${SPLIT}
      function matchRoute(routes, path) {
        const wanted = split(path);
        for (const pattern of routes || []) {
          const parts = split(pattern);
          if (parts.length !== wanted.length) continue;
          const params = {};
          let ok = true;
          for (let i = 0; i < parts.length && ok; i++) {
            const seg = parts[i];
            if (seg[0] === ":") params[seg.substring(1)] = wanted[i];
            else if (seg !== wanted[i]) ok = false;
          }
          if (ok) return { pattern, params };
        }
        return null;
      }`,

      // findIndex first, then build the params for the winner.
      `${SPLIT}
      function matchRoute(routes, path) {
        const wanted = split(path);
        const list = routes || [];
        const fits = function (pattern) {
          const parts = split(pattern);
          if (parts.length !== wanted.length) return false;
          return parts.every(function (seg, i) {
            return seg.charAt(0) === ":" || seg === wanted[i];
          });
        };
        const at = list.findIndex(fits);
        if (at === -1) return null;
        const parts = split(list[at]);
        const params = {};
        parts.forEach(function (seg, i) {
          if (seg.charAt(0) === ":") params[seg.slice(1)] = wanted[i];
        });
        return { pattern: list[at], params: params };
      }`,
    ],

    mistakes: [
      {
        // The instructive one: sorts so literals beat parameters. Produces
        // the behaviour people EXPECT, which is exactly why a model that
        // does it cannot predict what Express will really do.
        expect: "registration order beats specificity",
        impl: `${SPLIT}
        function matchRoute(routes, path) {
          const wanted = split(path);
          const candidates = [];
          for (const pattern of routes || []) {
            const parts = split(pattern);
            if (parts.length !== wanted.length) continue;
            const params = {};
            let ok = true;
            let paramCount = 0;
            for (let i = 0; i < parts.length; i++) {
              if (parts[i].charAt(0) === ":") {
                params[parts[i].slice(1)] = wanted[i];
                paramCount++;
              } else if (parts[i] !== wanted[i]) { ok = false; break; }
            }
            if (ok) candidates.push({ pattern, params, paramCount });
          }
          if (!candidates.length) return null;
          candidates.sort(function (a, b) { return a.paramCount - b.paramCount; });
          return { pattern: candidates[0].pattern, params: candidates[0].params };
        }`,
      },
      {
        // Never compares segment counts, so a two-segment pattern matches a
        // three-segment path and the nested route is unreachable.
        expect: "segment counts must match",
        impl: `${SPLIT}
        function matchRoute(routes, path) {
          const wanted = split(path);
          for (const pattern of routes || []) {
            const parts = split(pattern);
            const params = {};
            let ok = true;
            for (let i = 0; i < parts.length; i++) {
              if (parts[i].charAt(0) === ":") params[parts[i].slice(1)] = wanted[i];
              else if (parts[i] !== wanted[i]) { ok = false; break; }
            }
            if (ok) return { pattern, params };
          }
          return null;
        }`,
      },
      {
        // Splits without dropping empty segments, so '/tokens/' becomes
        // ['', 'tokens', ''] and a trailing slash changes which route wins.
        expect: "a trailing slash does not create a phantom segment",
        impl: `function matchRoute(routes, path) {
          const wanted = String(path).split("/");
          for (const pattern of routes || []) {
            const parts = String(pattern).split("/");
            if (parts.length !== wanted.length) continue;
            const params = {};
            let ok = true;
            for (let i = 0; i < parts.length; i++) {
              if (parts[i].charAt(0) === ":") params[parts[i].slice(1)] = wanted[i];
              else if (parts[i] !== wanted[i]) { ok = false; break; }
            }
            if (ok) return { pattern, params };
          }
          return null;
        }`,
      },
      {
        // Prefix matching: '/tokens' answers every request beneath it.
        expect: "a parameter segment captures its value",
        impl: `function matchRoute(routes, path) {
          for (const pattern of routes || []) {
            if (String(path).indexOf(String(pattern)) === 0) {
              return { pattern, params: {} };
            }
          }
          return null;
        }`,
      },
      {
        // Matches but never collects params, so the handler has no id.
        expect: "several parameters are all captured",
        impl: `${SPLIT}
        function matchRoute(routes, path) {
          const wanted = split(path);
          for (const pattern of routes || []) {
            const parts = split(pattern);
            if (parts.length !== wanted.length) continue;
            const ok = parts.every(function (seg, i) {
              return seg.charAt(0) === ":" || seg === wanted[i];
            });
            if (ok) return { pattern, params: {} };
          }
          return null;
        }`,
      },
      {
        // Returns undefined rather than null when nothing matches. The 404
        // branch is usually written as `if (match === null)`.
        expect: "no match returns null",
        impl: `${SPLIT}
        function matchRoute(routes, path) {
          const wanted = split(path);
          for (const pattern of routes || []) {
            const parts = split(pattern);
            if (parts.length !== wanted.length) continue;
            const params = {};
            let ok = true;
            for (let i = 0; i < parts.length; i++) {
              if (parts[i].charAt(0) === ":") params[parts[i].slice(1)] = wanted[i];
              else if (parts[i] !== wanted[i]) { ok = false; break; }
            }
            if (ok) return { pattern, params };
          }
        }`,
      },
    ],
  },
};
