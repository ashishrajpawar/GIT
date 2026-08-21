/* Wrong-answer cases for b10/0001 — pickForLog.
 *
 *   node scripts/verify-lesson.mjs modules/b10-security-compliance/0001-security-hardening.html \
 *        --wrong scripts/cases/0001-security-hardening.mjs
 *
 * Staged: `exercise-1` is Express middleware plus a deployment checklist and
 * carries its own per-exercise `unverifiable` reason, so only `log` has cases.
 *
 * The lesson's own framing is the right one: a token code is kept out of URLs,
 * out of the database and out of backups, and then one line of ordinary
 * logging middleware undoes all of it. This function is what that middleware
 * should have been built on, so every mistake here re-opens the hole the rest
 * of the lesson spent its length closing.
 *
 * The headline pair:
 *
 *   A DENY-LIST wearing an allow-list's name — copy the object, delete the
 *   keys you know are bad. It is correct on the day it is written and wrong
 *   the day someone adds a field. Nothing fails; the new field is simply
 *   logged, forever, and the person who added it never saw this file.
 *
 *   A SHALLOW copy — top-level keys filtered, nested objects passed through
 *   whole. `body.code` is exactly one level down, which is where it lives in
 *   every real request.
 *
 * Then the quieter ones. Admitting an object because its path was allowed
 * (which grants everything added to that object in future). Writing
 * `undefined` for an absent path, which still tells a reader the field
 * exists. Dropping falsy values, which loses `retries: 0` — the fact you
 * actually wanted at 3am.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const READER = `const MISSING = Symbol("missing");
function readPath(obj, path) {
  let current = obj;
  for (const key of String(path).split(".")) {
    if (current === null || typeof current !== "object") return MISSING;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return MISSING;
    current = current[key];
  }
  return current === undefined ? MISSING : current;
}`;

export const stages = {
  log: {
    alternatives: [
      // reduce() instead of a loop.
      `${READER}
      function pickForLog(source, allowed) {
        return (allowed || []).reduce(function (out, path) {
          const v = readPath(source, path);
          if (v === MISSING) return out;
          if (typeof v === "object" && v !== null) return out;
          out[path] = v;
          return out;
        }, {});
      }`,

      // Uses a sentinel object rather than a Symbol, and Object.entries.
      `const ABSENT = {};
      function pickForLog(source, allowed) {
        const out = {};
        for (const path of allowed || []) {
          let current = source;
          let found = true;
          for (const key of String(path).split(".")) {
            if (current === null || typeof current !== "object" ||
                !Object.prototype.hasOwnProperty.call(current, key)) {
              found = false;
              break;
            }
            current = current[key];
          }
          if (!found || current === undefined) continue;
          if (current !== null && typeof current === "object") continue;
          out[path] = current;
        }
        return out;
      }`,
    ],

    mistakes: [
      {
        // THE one: a deny-list. Correct today, wrong the day a field is
        // added -- and nothing fails, it just starts logging it.
        expect: "nothing outside the allow-list survives, at any depth",
        impl: `function pickForLog(source, allowed) {
          const BANNED = ["code", "password", "token", "secret"];
          const clone = JSON.parse(JSON.stringify(source || {}));
          const strip = function (obj) {
            if (!obj || typeof obj !== "object") return;
            for (const key of Object.keys(obj)) {
              if (BANNED.includes(key)) delete obj[key];
              else strip(obj[key]);
            }
          };
          strip(clone);
          return clone;
        }`,
      },
      {
        // Shallow: top-level filtered, nested objects passed through whole.
        // body.code is exactly one level down.
        expect: "nothing outside the allow-list survives, at any depth",
        impl: `function pickForLog(source, allowed) {
          const out = {};
          const src = source || {};
          for (const key of Object.keys(src)) {
            if ((allowed || []).indexOf(key) !== -1) out[key] = src[key];
          }
          // "and keep the body, it is useful for debugging"
          if (src.body) out.body = src.body;
          return out;
        }`,
      },
      {
        // Admits a whole object because its path was allowed. Grants
        // user.email today and whatever joins that object next year.
        expect: "an allowed path pointing at an OBJECT is omitted",
        impl: `${READER}
        function pickForLog(source, allowed) {
          const out = {};
          for (const path of allowed || []) {
            const v = readPath(source, path);
            if (v === MISSING) continue;
            out[path] = v;
          }
          return out;
        }`,
      },
      {
        // Writes undefined for an absent path. The key's presence is itself
        // information about what the request shape contains.
        expect: "an absent path is omitted, not set to undefined",
        impl: `${READER}
        function pickForLog(source, allowed) {
          const out = {};
          for (const path of allowed || []) {
            const v = readPath(source, path);
            const value = v === MISSING ? undefined : v;
            if (value !== null && typeof value === "object") continue;
            out[path] = value;
          }
          return out;
        }`,
      },
      {
        // Truthiness filter. Drops retries: 0 and trace: null -- the facts
        // you most want when reading a log after an incident.
        expect: "null and 0 are values and are kept",
        impl: `${READER}
        function pickForLog(source, allowed) {
          const out = {};
          for (const path of allowed || []) {
            const v = readPath(source, path);
            if (v === MISSING || !v) continue;
            if (typeof v === "object") continue;
            out[path] = v;
          }
          return out;
        }`,
      },
      {
        // Throws on a missing intermediate, so one absent field takes the
        // whole request down -- inside logging middleware, which runs on
        // every request.
        expect: "a missing intermediate does not throw",
        impl: `function pickForLog(source, allowed) {
          const out = {};
          for (const path of allowed || []) {
            let current = source;
            for (const key of String(path).split(".")) current = current[key];
            if (current === undefined) continue;
            if (current !== null && typeof current === "object") continue;
            out[path] = current;
          }
          return out;
        }`,
      },
      {
        // Case-insensitive matching, "to be forgiving". Loosening the match
        // is how a near-miss key gets admitted to an allow-list.
        expect: "the allow-list is exact, not case-insensitive",
        impl: `function pickForLog(source, allowed) {
          const out = {};
          const lower = (allowed || []).map(function (a) { return String(a).toLowerCase(); });
          const walk = function (obj, prefix) {
            if (!obj || typeof obj !== "object") return;
            for (const key of Object.keys(obj)) {
              const path = prefix ? prefix + "." + key : key;
              const v = obj[key];
              if (v !== null && typeof v === "object") { walk(v, path); continue; }
              if (lower.indexOf(path.toLowerCase()) !== -1) out[path] = v;
            }
          };
          walk(source, "");
          return out;
        }`,
      },
      {
        // Mutates source while filtering. The request object is about to be
        // handled by the rest of the application.
        expect: "source is not mutated",
        impl: `${READER}
        function pickForLog(source, allowed) {
          const src = source || {};
          // "tidy up before logging"
          if (src.body) delete src.body.code;
          const out = {};
          for (const path of allowed || []) {
            const v = readPath(src, path);
            if (v === MISSING) continue;
            if (v !== null && typeof v === "object") continue;
            out[path] = v;
          }
          return out;
        }`,
      },
    ],
  },
};
