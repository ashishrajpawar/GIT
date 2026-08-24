/* Wrong-answer cases for b9/0002 — checkEnv.
 *
 *   node scripts/verify-lesson.mjs modules/b9-docker-deployment/0002-coolify-setup.html \
 *        --wrong scripts/cases/0002-coolify-setup.mjs
 *
 * Staged: `exercise-1` is a VPS running Coolify with DNS and a domain, and
 * carries its own per-exercise `unverifiable` reason, so only `env` has cases.
 *
 * This is a startup check, so the mistakes divide by WHEN they hurt:
 *
 *   Letting something through. The container starts, the health check goes
 *   green, the deploy is declared a success, and createCipheriv throws on the
 *   first token anybody creates. That is the incident the check exists to
 *   prevent, arrived at through the check.
 *
 *   Reporting badly. Stopping at the first fault costs a deploy cycle per
 *   variable, and there are seven of them. Quoting the value puts a
 *   production secret in a log that more people can read than can read the
 *   database — the same rule ADR-0007 states about token codes.
 *
 *   Crashing while reporting. `atob` and `new URL` both throw on bad input,
 *   which is exactly the input a config check receives. A check that dies
 *   while diagnosing has diagnosed nothing, and the stack trace it leaves
 *   looks like an application bug rather than a config one.
 *
 * The one to look at hardest is the first: presence-only. It is what the
 * lesson shipped, it is what everybody writes, and it passes every fixture
 * where the config is merely incomplete. It only fails where the config is
 * WRONG, which is the likelier mistake, because you have to be thinking
 * about a variable to set it at all.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const HELPERS = `function byteLength(base64) {
  try { return atob(base64).length; } catch { return -1; }
}
`;

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // How a value is read and emptiness decided.
    read: `const raw = env[name];
    const value = typeof raw === "string" ? raw.trim() : "";`,
    emptyBranch: `if (value === "") {
      if (rule.required) problems.push({ name: name, problem: "missing" });
      continue;
    }`,
    hexBranch: `if (rule.kind === "hex") {
      const expected = rule.bytes * 2;
      if (value.length !== expected || !/^[0-9a-fA-F]+$/.test(value)) {
        problems.push({ name: name, problem: "expected " + rule.bytes + " bytes of hex" });
      }
      continue;
    }`,
    base64Branch: `if (rule.kind === "base64") {
      const got = byteLength(value);
      if (got !== rule.bytes) {
        problems.push({
          name: name,
          problem: "expected " + rule.bytes + " bytes of base64, got " +
                   (got < 0 ? "invalid base64" : got),
        });
      }
      continue;
    }`,
    urlBranch: `if (rule.kind === "url") {
      let scheme = null;
      try { scheme = new URL(value).protocol; } catch { scheme = null; }
      if (scheme === null || rule.schemes.indexOf(scheme) === -1) {
        problems.push({
          name: name,
          problem: "expected a URL with scheme " + rule.schemes.join(" or "),
        });
      }
      continue;
    }`,
    // Whether the loop keeps going after the first fault. Checked at the TOP
    // of the body -- every branch below continues, so a check at the bottom
    // is unreachable.
    loopTop: ``,
    ...overrides,
  };

  return (
    HELPERS +
    `
function checkEnv(env, spec) {
  const problems = [];

  for (const name of Object.keys(spec)) {
    ${o.loopTop}
    const rule = spec[name];
    ${o.read}

    ${o.emptyBranch}

    ${o.hexBranch}

    ${o.base64Branch}

    ${o.urlBranch}
  }

  return { ok: problems.length === 0, problems: problems };
}`
  );
}

export const stages = {
  env: {
    alternatives: [
      // A validator function per kind, looked up in a table, with the loop
      // reduced to "find the rule, run it, collect what it says".
      HELPERS +
        `
      const KINDS = {
        hex: function (value, rule) {
          const ok = value.length === rule.bytes * 2 && /^[0-9a-f]+$/i.test(value);
          return ok ? null : "expected " + rule.bytes + " bytes of hex";
        },
        base64: function (value, rule) {
          const got = byteLength(value);
          if (got === rule.bytes) return null;
          return "expected " + rule.bytes + " bytes of base64, got " +
                 (got === -1 ? "invalid base64" : got);
        },
        url: function (value, rule) {
          let proto;
          try { proto = new URL(value).protocol; } catch (e) { proto = undefined; }
          if (proto !== undefined && rule.schemes.includes(proto)) return null;
          return "expected a URL with scheme " + rule.schemes.join(" or ");
        },
        text: function () { return null; },
      };

      function checkEnv(env, spec) {
        const problems = Object.keys(spec).flatMap(function (name) {
          const rule = spec[name];
          const value = String(env[name] === undefined || env[name] === null ? "" : env[name]).trim();

          if (value.length === 0) {
            return rule.required ? [{ name: name, problem: "missing" }] : [];
          }

          const validate = KINDS[rule.kind] || KINDS.text;
          const problem = validate(value, rule);
          return problem === null ? [] : [{ name: name, problem: problem }];
        });

        return { ok: problems.length === 0, problems: problems };
      }`,

      // A plain accumulating loop with the checks written as if/else if and
      // the emptiness test spelled out rather than trimmed into one compare.
      HELPERS +
        `
      function checkEnv(env, spec) {
        const out = [];
        const names = Object.keys(spec);

        for (let i = 0; i < names.length; i++) {
          const name = names[i];
          const rule = spec[name];
          let v = env[name];
          if (typeof v !== "string") v = "";
          v = v.replace(/^\\s+|\\s+$/g, "");

          if (!v) {
            if (rule.required === true) out.push({ name: name, problem: "missing" });
          } else if (rule.kind === "hex") {
            const need = rule.bytes * 2;
            let allHex = v.length === need;
            for (let c = 0; allHex && c < v.length; c++) {
              if ("0123456789abcdefABCDEF".indexOf(v[c]) === -1) allHex = false;
            }
            if (!allHex) out.push({ name: name, problem: "expected " + rule.bytes + " bytes of hex" });
          } else if (rule.kind === "base64") {
            const n = byteLength(v);
            if (n !== rule.bytes) {
              out.push({
                name: name,
                problem: "expected " + rule.bytes + " bytes of base64, got " + (n < 0 ? "invalid base64" : n),
              });
            }
          } else if (rule.kind === "url") {
            let p = null;
            try { p = new URL(v).protocol; } catch (err) { p = null; }
            if (!p || rule.schemes.indexOf(p) < 0) {
              out.push({ name: name, problem: "expected a URL with scheme " + rule.schemes.join(" or ") });
            }
          }
        }

        return { ok: out.length === 0, problems: out };
      }`,
    ],

    mistakes: [
      {
        // What the lesson shipped: presence only. Passes every fixture where
        // the config is merely incomplete, and lets every malformed value
        // straight through to production.
        expect: "64 hex characters in the base64 field decode to 48 bytes and are rejected",
        impl: build({
          hexBranch: `if (rule.kind === "hex") continue;`,
          base64Branch: `if (rule.kind === "base64") continue;`,
          urlBranch: `if (rule.kind === "url") continue;`,
        }),
      },
      {
        // Checks the base64 LENGTH rather than the decoded byte count. 44
        // characters is right for 32 bytes, so the good case passes and the
        // 64-character hex string is caught by accident — but a 43-character
        // string that decodes to 32 bytes would be rejected wrongly, and the
        // message reports characters as if they were bytes.
        expect: "something that is not base64 at all is rejected without throwing",
        impl: build({
          base64Branch: `if (rule.kind === "base64") {
      if (value.length !== 44) {
        problems.push({
          name: name,
          problem: "expected " + rule.bytes + " bytes of base64, got " + value.length,
        });
      }
      continue;
    }`,
        }),
      },
      {
        // Truthiness on the raw value without trimming, so a variable set to
        // a single space is "present" and then fails its shape check with a
        // confusing message instead of the honest one.
        expect: "whitespace only is missing too",
        impl: build({
          read: `const raw = env[name];
    const value = typeof raw === "string" ? raw : "";`,
        }),
      },
      {
        // Returns at the first fault. The config has seven variables and
        // somebody has got three of them wrong; this is three deploys.
        expect: "every problem is reported, not just the first",
        impl: build({ loopTop: `if (problems.length > 0) break;` }),
      },
      {
        // Helpfully quotes the value. Every message is now correct, precise,
        // actionable, and prints a production secret into the deploy log.
        expect: "no problem message contains the value",
        impl: build({
          base64Branch: `if (rule.kind === "base64") {
      const got = byteLength(value);
      if (got !== rule.bytes) {
        problems.push({
          name: name,
          problem: "expected " + rule.bytes + " bytes of base64, got " +
                   (got < 0 ? "invalid base64" : got) + " (" + value + ")",
        });
      }
      continue;
    }`,
        }),
      },
      {
        // No try/catch around new URL. A config check that throws while
        // reporting a bad config leaves a stack trace that reads like an
        // application bug, and reports none of the other faults.
        expect: "something that is not a URL is rejected without throwing",
        impl: build({
          urlBranch: `if (rule.kind === "url") {
      const scheme = new URL(value).protocol;
      if (rule.schemes.indexOf(scheme) === -1) {
        problems.push({
          name: name,
          problem: "expected a URL with scheme " + rule.schemes.join(" or "),
        });
      }
      continue;
    }`,
        }),
      },
      {
        // Skips every optional variable outright rather than only when it is
        // absent. "Optional" means it may be missing, not that it may be
        // wrong — a malformed Sentry DSN then fails silently at runtime.
        expect: "an optional variable that IS set is still checked",
        impl: build({
          emptyBranch: `if (!rule.required) continue;
    if (value === "") {
      problems.push({ name: name, problem: "missing" });
      continue;
    }`,
        }),
      },
      {
        // Hex checked by length alone. 64 characters of anything passes, so a
        // placeholder like "replace-me-with-a-real-secret-..." sails through.
        expect: "the right length of the wrong alphabet is rejected",
        impl: build({
          hexBranch: `if (rule.kind === "hex") {
      if (value.length !== rule.bytes * 2) {
        problems.push({ name: name, problem: "expected " + rule.bytes + " bytes of hex" });
      }
      continue;
    }`,
        }),
      },
    ],
  },
};
