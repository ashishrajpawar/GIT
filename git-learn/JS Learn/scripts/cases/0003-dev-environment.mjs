/* Wrong-answer cases for x1/0003 — resolveAlias.
 *
 *   node scripts/verify-lesson.mjs modules/x1-git-dev-environment/0003-dev-environment.html \
 *        --wrong scripts/cases/0003-dev-environment.mjs
 *
 * Staged: `exercise-1` is nvm, VS Code extensions and npm-installed tooling on
 * a real machine, and carries its own per-exercise `unverifiable` reason, so
 * only `alias` has cases.
 *
 * The failure mode that makes this worth an exercise: in a monorepo, the WRONG
 * answer is usually a file that exists. Resolve `@token/shared/types` against
 * the wrong pattern and you do not get "cannot find module" — you get a type
 * error about a symbol you have never heard of, in a file you did not mean to
 * open. Three of the cases below produce exactly that.
 *
 * The rule almost everyone gets wrong is precedence. `paths` looks like a
 * dictionary and behaves like a longest-prefix router:
 *
 *   An exact pattern beats every wildcard.
 *   Among wildcards, the longest PREFIX wins.
 *   The order the patterns are written in is irrelevant.
 *
 * Note the pair of checks that enforces the third point — the same two
 * patterns, written in both orders. First-match-wins passes whichever fixture
 * happens to list the specific pattern first, so ONE fixture cannot tell it
 * from the correct answer. It takes both, and the same would go for any
 * order-sensitive mistake.
 *
 * And note what those two fixtures had to be fixed to say. In the first draft
 * both patterns mapped to targets that produced the SAME string, so
 * first-match, last-match and longest-prefix were indistinguishable and three
 * mistakes passed. `CLAUDE.md` states the rule that was broken: choose fixture
 * values that differ from what a wrong answer would produce.
 *
 * TWO cases were written and then removed, and the reasons are worth keeping
 * because both are limits on what this exercise can honestly test:
 *
 *   `>=` instead of `>` when comparing prefix lengths. It differs from the
 *   correct answer ONLY when two prefixes are the same length, and what
 *   TypeScript does on that tie is not something this lesson is confident
 *   enough to teach. A wrong-case has to encode a rule you are sure of.
 *
 *   Dropping the two-star guard. With a prefix/suffix split, a key like
 *   "@token/*\/*" leaves a literal `*` in the suffix, so no ordinary
 *   specifier can match it and the guard is unreachable. It stays in the
 *   solution as belt-and-braces, but it is NOT a behaviour the self-check
 *   can observe — and a rule you cannot test is worth knowing you cannot
 *   test.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // Whether exact patterns get their own pass, ahead of the wildcards.
    exactPass: `for (const key of keys) {
    if (!key.includes("*") && key === specifier) {
      return paths[key].slice();
    }
  }`,
    // Whether a pattern with two stars is skipped.
    twoStarGuard: `if (key.indexOf("*", star + 1) !== -1) continue;`,
    // How the specifier is tested against the pattern.
    prefixTest: `if (!specifier.startsWith(prefix)) continue;`,
    suffixTest: `if (!specifier.endsWith(suffix)) continue;`,
    lengthGuard: `if (specifier.length < prefix.length + suffix.length) continue;`,
    // Which of several matching wildcards wins.
    better: `best === null || prefix.length > best.prefix.length`,
    // How the winning targets are produced.
    expand: `return best.targets.map(function (target) {
    return target.includes("*") ? target.replace("*", best.capture) : target;
  });`,
    ...overrides,
  };

  return `function resolveAlias(specifier, paths) {
  const keys = Object.keys(paths || {});

  ${o.exactPass}

  let best = null;

  for (const key of keys) {
    const star = key.indexOf("*");
    if (star === -1) continue;
    ${o.twoStarGuard}

    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);

    ${o.prefixTest}
    ${o.suffixTest}
    ${o.lengthGuard}

    if (${o.better}) {
      best = {
        prefix: prefix,
        capture: specifier.slice(prefix.length, specifier.length - suffix.length),
        targets: paths[key],
      };
    }
  }

  if (best === null) return [];

  ${o.expand}
}`;
}

export const stages = {
  alias: {
    alternatives: [
      // Scores every candidate first and sorts, rather than tracking a
      // running best. Same precedence, arrived at from the other end.
      `function resolveAlias(specifier, paths) {
        const entries = Object.entries(paths || {});

        const exact = entries.find(function (e) {
          return e[0].indexOf("*") === -1 && e[0] === specifier;
        });
        if (exact) return exact[1].slice();

        const candidates = [];

        for (const [key, targets] of entries) {
          const parts = key.split("*");
          if (parts.length !== 2) continue;      // 0 or 2+ stars

          const [prefix, suffix] = parts;
          if (specifier.indexOf(prefix) !== 0) continue;
          if (suffix !== "" && specifier.lastIndexOf(suffix) !== specifier.length - suffix.length) continue;
          if (specifier.length - suffix.length < prefix.length) continue;

          candidates.push({
            score: prefix.length,
            capture: specifier.substring(prefix.length, specifier.length - suffix.length),
            targets: targets,
          });
        }

        if (candidates.length === 0) return [];

        // Stable descending sort by prefix length.
        candidates.sort(function (a, b) { return b.score - a.score; });
        const win = candidates[0];

        return win.targets.map(function (t) {
          return t.indexOf("*") === -1 ? t : t.split("*").join(win.capture);
        });
      }`,

      // A regex per pattern, built once, with the capture read from the
      // match. The prefix length is still what decides the winner.
      `function escapeRe(s) {
        return s.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
      }

      function resolveAlias(specifier, paths) {
        const keys = Object.keys(paths || {});
        let winner = null;

        for (const key of keys) {
          if (key.indexOf("*") === -1) {
            if (key === specifier) return paths[key].slice();
            continue;
          }
        }

        for (const key of keys) {
          const bits = key.split("*");
          if (bits.length !== 2) continue;

          const re = new RegExp("^" + escapeRe(bits[0]) + "(.*)" + escapeRe(bits[1]) + "$");
          const m = re.exec(specifier);
          if (m === null) continue;

          if (winner === null || bits[0].length > winner.plen) {
            winner = { plen: bits[0].length, capture: m[1], targets: paths[key] };
          }
        }

        if (winner === null) return [];
        return winner.targets.map(function (t) {
          return t.indexOf("*") === -1 ? t : t.replace("*", winner.capture);
        });
      }`,
    ],

    mistakes: [
      {
        // First match wins. The broad "@token/*" is listed first in one of
        // the two order fixtures, so it claims the specifier and the specific
        // pattern never gets a turn. It passes the other fixture, which is
        // exactly why both orders are checked.
        expect: "the longest prefix wins",
        impl: build({ better: `best === null` }),
      },
      {
        // Longest PATTERN rather than longest prefix. The two metrics agree
        // on almost every real config, so the fixture for this needs a short
        // prefix with a long suffix competing against a longer prefix.
        expect: "longest prefix, not longest pattern overall",
        impl: build({
          better: `best === null || (prefix.length + suffix.length) > (best.prefix.length + best.suffix.length)`,
        }).replace(
          `        prefix: prefix,`,
          `        prefix: prefix,
        suffix: suffix,`
        ),
      },
      {
        // No exact pass, so an exact pattern competes as though it were a
        // wildcard with an empty prefix — and loses to everything.
        expect: "an exact pattern beats a wildcard",
        impl: build({ exactPass: `` }),
      },
      {
        // includes() instead of startsWith(). The prefix can appear anywhere,
        // so a specifier that merely CONTAINS the alias resolves through it.
        expect: "the prefix has to be at the START",
        impl: build({ prefixTest: `if (!specifier.includes(prefix)) continue;` }),
      },
      {
        // Suffix ignored entirely, so '@token/*.css' also claims
        // '@token/theme' — and the capture then keeps a '.css' it should
        // have consumed, or drops characters it should have kept.
        expect: "the suffix has to match too",
        impl: build({ suffixTest: `` }),
      },
      {
        // No length guard. prefix and suffix overlap, the slice runs
        // backwards, and a specifier far too short reports a confident match.
        expect: "a specifier too short for prefix and suffix does not match",
        impl: build({ lengthGuard: `` }),
      },
      {
        // Returns only the first target. The array is how you shadow a
        // generated file with a hand-written one, and this silently makes
        // that impossible.
        expect: "every target is returned, in order",
        impl: build({
          expand: `return [best.targets[0]].map(function (target) {
    return target.includes("*") ? target.replace("*", best.capture) : target;
  });`,
        }),
      },
      {
        // Returns the targets array by reference without substituting. The
        // caller then holds the config's own array, and any later edit to a
        // resolved path rewrites the tsconfig in memory.
        expect: "a single wildcard substitutes the captured text",
        impl: build({ expand: `return best.targets;` }),
      },
    ],
  },
};
