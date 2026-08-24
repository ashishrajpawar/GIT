/* Wrong-answer cases for x1/0001 — isIgnored.
 *
 *   node scripts/verify-lesson.mjs modules/x1-git-dev-environment/0001-git-fundamentals.html \
 *        --wrong scripts/cases/0001-git-fundamentals.mjs
 *
 * Staged: `exercise-1` is git and shell commands against a real filesystem
 * and carries its own per-exercise `unverifiable` reason, so only `ignore`
 * has cases.
 *
 * This lesson was marked `unverifiable` on the grounds that it is "git and
 * shell setup rather than runnable code". `.gitignore` is not configuration.
 * It is a pattern language with a precedence order and a tree walk, and every
 * mistake below is one somebody has shipped.
 *
 * What they have in common is the direction of failure. A .gitignore bug that
 * ignores too much is loud — the file you wanted is missing from the repo and
 * you notice within the hour. A bug that ignores too LITTLE is silent, and
 * what it commits is the file you were trying to keep out. Six of the eight
 * below fail in that direction.
 *
 * The four ideas being tested:
 *
 *   A bare name matches at any depth; a slash anywhere anchors to the root.
 *   These are opposites and the difference is one character.
 *
 *   A trailing slash is directories only.
 *
 *   The last matching line wins — patterns are a sequence, not a set.
 *
 *   And the tree walk: a negation inside an excluded DIRECTORY is never
 *   evaluated, because git does not descend into it. That one is not a
 *   precedence rule at all, which is why implementing precedence correctly
 *   does not produce it.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const HELPERS = `function toRegExp(glob) {
  const body = glob
    .replace(/[.+^\${}()|[\\]\\\\]/g, "\\\\$&")
    .replace(/\\*/g, "[^/]*")
    .replace(/\\?/g, "[^/]");
  return new RegExp("^" + body + "$");
}
`;

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // How a line becomes a rule.
    dirOnlyParse: `const dirOnly = body.endsWith("/");
    if (dirOnly) body = body.slice(0, -1);`,
    anchoredParse: `const anchored = body.includes("/");`,
    // Whether a dirOnly rule may match a file.
    dirGuard: `if (rule.dirOnly && !isDir) continue;`,
    // What a rule is matched against.
    subject: `rule.anchored ? path : path.slice(path.lastIndexOf("/") + 1)`,
    // How a match updates the verdict.
    accumulate: `if (rule.re.test(subject)) ignored = !rule.negated;`,
    // Whether ancestors are consulted at all.
    ancestorWalk: `for (let i = 1; i < segments.length; i++) {
    if (verdict(segments.slice(0, i).join("/"), rules, true)) return true;
  }`,
    ...overrides,
  };

  return (
    HELPERS +
    `
function parseRules(lines) {
  const rules = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;

    const negated = line.startsWith("!");
    let body = negated ? line.slice(1) : line;

    ${o.dirOnlyParse}
    ${o.anchoredParse}
    if (body.startsWith("/")) body = body.slice(1);

    rules.push({ negated, dirOnly, anchored, re: toRegExp(body) });
  }
  return rules;
}

function verdict(path, rules, isDir) {
  let ignored = false;
  for (const rule of rules) {
    ${o.dirGuard}
    const subject = ${o.subject};
    ${o.accumulate}
  }
  return ignored;
}

function isIgnored(filePath, patterns) {
  const rules = parseRules(patterns);
  const segments = filePath.split("/");

  ${o.ancestorWalk}

  return verdict(filePath, rules, false);
}`
  );
}

export const stages = {
  ignore: {
    alternatives: [
      // Compiles every rule to a single predicate function up front, so the
      // matching loop has no branching in it at all.
      HELPERS +
        `
      function compile(raw) {
        const line = raw.trim();
        if (line === "" || line[0] === "#") return null;

        const negated = line[0] === "!";
        let body = negated ? line.slice(1) : line;

        let dirOnly = false;
        if (body[body.length - 1] === "/") {
          dirOnly = true;
          body = body.slice(0, body.length - 1);
        }

        const anchored = body.indexOf("/") !== -1;
        if (body[0] === "/") body = body.slice(1);

        const re = toRegExp(body);

        return {
          negated: negated,
          test: function (path, isDir) {
            if (dirOnly && !isDir) return false;
            const parts = path.split("/");
            return re.test(anchored ? path : parts[parts.length - 1]);
          },
        };
      }

      function isIgnored(filePath, patterns) {
        const rules = patterns.map(compile).filter(Boolean);

        function decide(path, isDir) {
          return rules.reduce(function (acc, r) {
            return r.test(path, isDir) ? !r.negated : acc;
          }, false);
        }

        const parts = filePath.split("/");
        for (let i = 1; i < parts.length; i++) {
          if (decide(parts.slice(0, i).join("/"), true)) return true;
        }
        return decide(filePath, false);
      }`,

      // Walks the rules backwards and stops at the first match, which is the
      // same thing as "last match wins" read from the other end.
      HELPERS +
        `
      function isIgnored(filePath, patterns) {
        const rules = [];
        for (let i = 0; i < patterns.length; i++) {
          const line = patterns[i].trim();
          if (!line || line.charAt(0) === "#") continue;
          const negated = line.charAt(0) === "!";
          let body = negated ? line.substring(1) : line;
          const dirOnly = /\\/$/.test(body);
          if (dirOnly) body = body.replace(/\\/$/, "");
          const anchored = body.indexOf("/") >= 0;
          if (body.charAt(0) === "/") body = body.substring(1);
          rules.push({ negated: negated, dirOnly: dirOnly, anchored: anchored, re: toRegExp(body) });
        }

        function decide(path, isDir) {
          // Backwards, first hit wins -- the mirror of last-match-wins.
          for (let i = rules.length - 1; i >= 0; i--) {
            const r = rules[i];
            if (r.dirOnly && !isDir) continue;
            const base = path.split("/").pop();
            if (r.re.test(r.anchored ? path : base)) return !r.negated;
          }
          return false;
        }

        const parts = filePath.split("/");
        for (let i = 1; i < parts.length; i++) {
          if (decide(parts.slice(0, i).join("/"), true)) return true;
        }
        return decide(filePath, false);
      }`,
    ],

    mistakes: [
      {
        // No ancestor walk. Precedence is implemented perfectly and the tree
        // walk is missing, so the negation inside an excluded directory is
        // evaluated and "wins" — which real git never does.
        //
        // This is the interesting one: it is not a precedence bug, so getting
        // precedence right does not fix it. It also takes out every check
        // about a directory pattern ignoring its CONTENTS, which is the same
        // missing walk seen from the other side.
        expect: "a negation cannot rescue a file inside an excluded DIRECTORY",
        impl: build({ ancestorWalk: `` }),
      },
      {
        // Only a LEADING slash anchors. A pattern like 'api/dist' is then
        // matched against the basename, so it can never match anything —
        // 'dist' is the basename and 'api/dist' is not.
        expect: "a slash in the middle also anchors",
        impl: build({ anchoredParse: `const anchored = body.startsWith("/");` }),
      },
      {
        // Everything is anchored. A bare '.env' then only ever matches a file
        // called '.env' in the root, and api/.env is committed — which is
        // exactly the mistake the lesson's callout is about.
        expect: "a bare name matches at any depth",
        impl: build({ anchoredParse: `const anchored = true;` }),
      },
      {
        // Nothing is anchored: every pattern is matched against the basename,
        // so '/dist' ignores api/dist too. Fails LOUDLY, unlike most of
        // these — the file you wanted goes missing.
        expect: "a leading slash anchors to the root",
        impl: build({ anchoredParse: `const anchored = false;` }),
      },
      {
        // The trailing slash is stripped and then forgotten, so 'dist/'
        // matches a FILE called dist as well as the directory.
        expect: "a trailing slash does not match a file of the same name",
        impl: build({ dirGuard: `` }),
      },
      {
        // Stops at the FIRST match instead of the last, so a negation after
        // an exclusion never gets a turn and !.env.example does nothing.
        expect: "a later negation re-includes",
        impl: build({
          accumulate: `if (rule.re.test(subject)) return !rule.negated;`,
        }),
      },
      {
        // Treats a match as "ignored" regardless of polarity, so '!' is read
        // as part of the decision but not applied. Every negation becomes an
        // exclusion — the opposite of what it says.
        expect: "a later negation re-includes",
        impl: build({ accumulate: `if (rule.re.test(subject)) ignored = true;` }),
      },
      {
        // Does not escape regex metacharacters before compiling the glob, so
        // '.' becomes "any character" and '.env' also ignores 'aenv'. Silent,
        // and it ignores MORE than intended rather than less.
        expect: "a dot in a pattern is literal",
        impl: build().replace(
          `    .replace(/[.+^\${}()|[\\]\\\\]/g, "\\\\$&")\n`,
          ``
        ),
      },
      {
        // Compiles * to .* rather than [^/]*, so 'api/*.env' reaches into
        // subdirectories. Ignores more than intended.
        expect: "* does not cross a slash",
        impl: build().replace(`.replace(/\\*/g, "[^/]*")`, `.replace(/\\*/g, ".*")`),
      },
      {
        // Forgets to anchor the compiled regex, so 'test' matches 'latest'
        // and '.env' matches 'aenv.bak'. The single commonest glob bug.
        expect: "a pattern matches a whole name, not part of one",
        impl: build().replace(
          `  return new RegExp("^" + body + "$");`,
          `  return new RegExp(body);`
        ),
      },
    ],
  },
};
