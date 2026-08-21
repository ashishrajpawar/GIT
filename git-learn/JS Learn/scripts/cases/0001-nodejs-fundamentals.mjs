/* Wrong-answer cases for b3/0001 — checkEnv.
 *
 *   node scripts/verify-lesson.mjs modules/b3-node-http-server/0001-nodejs-fundamentals.html \
 *        --wrong scripts/cases/0001-nodejs-fundamentals.mjs
 *
 * Staged: `exercise-1` is a Node HTTP server and carries its own per-exercise
 * `unverifiable` reason, so only `env` has cases.
 *
 * Every mistake here produces a server that starts. That is the whole
 * category: a startup check exists to refuse, and a check that is slightly
 * too permissive does not fail, it lets the process come up in a state nobody
 * intended and stay there.
 *
 * The three permissive ones are all truthiness in disguise:
 *
 *   `if (!value)` for absence — an empty string is reported as 'missing', so
 *   someone goes looking for a key that is right there in the file.
 *
 *   No trim — '   ' is a nine-character secret to every test in JavaScript.
 *
 *   No placeholder check — 'undefined' is a real string that a template wrote
 *   when it had nothing to interpolate, and 'dev-secret-change-in-production'
 *   is the value from the example .env three code blocks up the page.
 *
 * Then two structural ones. Returning after the first problem turns one
 * failed deploy into three. And putting the VALUE in the result is the worst
 * outcome available here — the array goes straight into a startup log, so a
 * check written to protect secrets is the thing that publishes them.
 *
 * One is not about permissiveness at all: sorting the output "so the log is
 * tidy". A stable order is what makes two deploys' logs diffable, and
 * alphabetical is not the order anyone reads.
 *
 * Note the '0' case in the self-check, which no mistake here trips. It is
 * there as a guard rather than as a trap: "0" is a truthy string in
 * JavaScript, so the obvious falsy bug does NOT reject it, and the check
 * exists to stop someone "fixing" that with a Number() conversion later.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  env: {
    alternatives: [
      // map + filter rather than a loop with continues.
      `function checkEnv(env, required) {
        const source = env || {};
        return (required || [])
          .map(function (name) {
            const raw = source[name];
            if (raw === undefined || raw === null) return { name: name, reason: "missing" };
            const v = String(raw).trim();
            if (v === "") return { name: name, reason: "empty" };
            if (v === "undefined" || v === "null" || v.indexOf("change-in-production") !== -1) {
              return { name: name, reason: "placeholder" };
            }
            return null;
          })
          .filter(Boolean);
      }`,

      // A table of predicates, evaluated in order.
      `function checkEnv(env, required) {
        const source = env || {};
        const tests = [
          ["missing", function (raw) { return raw === undefined || raw === null; }],
          ["empty", function (raw) { return String(raw).trim() === ""; }],
          ["placeholder", function (raw) {
            const v = String(raw).trim();
            return v === "undefined" || v === "null" || v.includes("change-in-production");
          }],
        ];
        const out = [];
        for (const name of required || []) {
          const raw = source[name];
          for (const pair of tests) {
            if (pair[1](raw)) { out.push({ name: name, reason: pair[0] }); break; }
          }
        }
        return out;
      }`,
    ],

    mistakes: [
      {
        // Truthiness for absence: an empty string reads as 'missing', and
        // whoever is on call goes looking for a key that is right there.
        expect: "an empty string is 'empty', not 'missing'",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          const out = [];
          for (const name of required || []) {
            const raw = source[name];
            if (!raw) { out.push({ name: name, reason: "missing" }); continue; }
            const v = String(raw).trim();
            if (v === "undefined" || v === "null" || v.includes("change-in-production")) {
              out.push({ name: name, reason: "placeholder" });
            }
          }
          return out;
        }`,
      },
      {
        // No trim. '   ' is a secret as far as this is concerned.
        expect: "whitespace only is empty",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          const out = [];
          for (const name of required || []) {
            const raw = source[name];
            if (raw === undefined || raw === null) { out.push({ name: name, reason: "missing" }); continue; }
            if (raw === "") { out.push({ name: name, reason: "empty" }); continue; }
            if (raw === "undefined" || raw === "null" || String(raw).includes("change-in-production")) {
              out.push({ name: name, reason: "placeholder" });
            }
          }
          return out;
        }`,
      },
      {
        // No placeholder check at all. The example .env value ships.
        expect: "the example .env value is a placeholder",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          const out = [];
          for (const name of required || []) {
            const raw = source[name];
            if (raw === undefined || raw === null) { out.push({ name: name, reason: "missing" }); continue; }
            if (String(raw).trim() === "") out.push({ name: name, reason: "empty" });
          }
          return out;
        }`,
      },
      {
        // Catches 'change-in-production' but not the literal word written by
        // a template with nothing to interpolate.
        expect: "the literal string 'undefined' is a placeholder",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          const out = [];
          for (const name of required || []) {
            const raw = source[name];
            if (raw === undefined || raw === null) { out.push({ name: name, reason: "missing" }); continue; }
            const v = String(raw).trim();
            if (v === "") { out.push({ name: name, reason: "empty" }); continue; }
            if (v.includes("change-in-production")) out.push({ name: name, reason: "placeholder" });
          }
          return out;
        }`,
      },
      {
        // Stops at the first problem. One failed deploy becomes three.
        expect: "every problem is reported, not just the first",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          for (const name of required || []) {
            const raw = source[name];
            if (raw === undefined || raw === null) return [{ name: name, reason: "missing" }];
            const v = String(raw).trim();
            if (v === "") return [{ name: name, reason: "empty" }];
            if (v === "undefined" || v === "null" || v.includes("change-in-production")) {
              return [{ name: name, reason: "placeholder" }];
            }
          }
          return [];
        }`,
      },
      {
        // Helpfully includes the value so the log shows what was wrong.
        // The log is the one place these must never appear.
        expect: "a reported problem carries only name and reason",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          const out = [];
          for (const name of required || []) {
            const raw = source[name];
            if (raw === undefined || raw === null) { out.push({ name: name, reason: "missing", value: raw }); continue; }
            const v = String(raw).trim();
            if (v === "") { out.push({ name: name, reason: "empty", value: raw }); continue; }
            if (v === "undefined" || v === "null" || v.includes("change-in-production")) {
              out.push({ name: name, reason: "placeholder", value: raw });
              continue;
            }
          }
          return out;
        }`,
      },
      {
        // Sorts the output "so the log is tidy", which throws away the order
        // the caller asked for. A stable order is what makes two deploys'
        // logs diffable, and alphabetical is not the order anyone reads.
        expect: "problems come back in the order they were asked for",
        impl: `function checkEnv(env, required) {
          const source = env || {};
          const out = [];
          for (const name of required || []) {
            const raw = source[name];
            if (raw === undefined || raw === null) { out.push({ name: name, reason: "missing" }); continue; }
            const v = String(raw).trim();
            if (v === "") { out.push({ name: name, reason: "empty" }); continue; }
            if (v === "undefined" || v === "null" || v.includes("change-in-production")) {
              out.push({ name: name, reason: "placeholder" });
            }
          }
          return out.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        }`,
      },
    ],
  },
};
