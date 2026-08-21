/* Wrong-answer cases for a11/0004 — placeConfig.
 *
 *   node scripts/verify-lesson.mjs modules/a11-polish-publish/0004-environment-config.html \
 *        --wrong scripts/cases/0004-environment-config.mjs
 *
 * Staged: `exercise-1` is an Expo app config plus eas.json profiles and
 * carries its own per-exercise `unverifiable` reason, so only `place` has
 * cases.
 *
 * This function exists because the lesson used to state the wrong rule
 * outright: "if it's a credential, it goes in EAS Secrets". The first mistake
 * below is that rule, faithfully implemented — and it is the one that would
 * have put a TURN password in the app bundle.
 *
 * What makes it hard to see is that EAS Secrets genuinely works. The value is
 * encrypted at rest, never in git, injected only at build time. All true, and
 * none of it helps: anything the running app reads was baked into the bundle
 * to get there, and the bundle is on a stranger's phone.
 *
 * So the mistakes here split by which half of the question they get wrong:
 *
 *   "Is it sensitive?" — the wrong question, and the one the old rule asked.
 *   Every credential looks the same under it.
 *
 *   "Who needs it, and when?" — the right one. A sourcemap upload token and a
 *   TURN password are both credentials and belong in completely different
 *   places, because one is used by the pipeline and the other by the app.
 *
 * The remaining mistakes fail towards shipping: defaulting an unclassifiable
 * value to eas-env, or treating a credential with no stated neededAt as a
 * build credential. Both put something in the bundle because a field was
 * missing, which is the worst reason to ship a secret.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  place: {
    alternatives: [
      // A lookup table for the simple kinds, with credential handled apart.
      `const SIMPLE = { structural: "app.config.js", url: "eas-env", flag: "eas-env" };
      function placeConfig(entry) {
        const kind = entry && entry.kind;
        if (kind === "credential") {
          return entry.neededAt === "build" ? "eas-secret" : "server-only";
        }
        return SIMPLE[kind] || "server-only";
      }`,

      // switch, with the safe answer as the default arm.
      `function placeConfig(entry) {
        const kind = entry && entry.kind;
        switch (kind) {
          case "structural":
            return "app.config.js";
          case "url":
          case "flag":
            return "eas-env";
          case "credential":
            return entry.neededAt === "build" ? "eas-secret" : "server-only";
          default:
            return "server-only";
        }
      }`,

      // Computes the answer into a variable, single return.
      `function placeConfig(entry) {
        const kind = entry ? entry.kind : undefined;
        const at = entry ? entry.neededAt : undefined;
        let where = "server-only";
        if (kind === "structural") where = "app.config.js";
        else if (kind === "url" || kind === "flag") where = "eas-env";
        else if (kind === "credential" && at === "build") where = "eas-secret";
        return where;
      }`,
    ],

    mistakes: [
      {
        // The lesson's old rule, implemented exactly. Every credential goes
        // to EAS Secrets, including the ones the app reads at runtime --
        // which is how a TURN password ends up in the bundle.
        expect: "a credential the running app needs is server-only",
        impl: `function placeConfig(entry) {
          const kind = entry && entry.kind;
          if (kind === "credential") return "eas-secret";
          if (kind === "structural") return "app.config.js";
          if (kind === "url" || kind === "flag") return "eas-env";
          return "server-only";
        }`,
      },
      {
        // Over-corrects: no credential may ever be an EAS secret. Now the
        // sourcemap upload token has nowhere to live, and the build breaks
        // -- which is how a correct rule gets reverted wholesale.
        expect: "a credential only the build uses is an EAS secret",
        impl: `function placeConfig(entry) {
          const kind = entry && entry.kind;
          if (kind === "credential") return "server-only";
          if (kind === "structural") return "app.config.js";
          if (kind === "url" || kind === "flag") return "eas-env";
          return "server-only";
        }`,
      },
      {
        // Unknown kinds fall through to eas-env "because that is where most
        // things go". Ships an unclassified value into every build.
        expect: "an unknown kind is server-only, not eas-env",
        impl: `function placeConfig(entry) {
          const kind = entry && entry.kind;
          if (kind === "structural") return "app.config.js";
          if (kind === "credential") {
            return entry.neededAt === "build" ? "eas-secret" : "server-only";
          }
          return "eas-env";
        }`,
      },
      {
        // A credential with no neededAt is treated as build-time. The
        // absent case falls to the convenient side rather than the safe one.
        expect: "a credential with no neededAt is server-only",
        impl: `function placeConfig(entry) {
          const kind = entry && entry.kind;
          if (kind === "structural") return "app.config.js";
          if (kind === "url" || kind === "flag") return "eas-env";
          if (kind === "credential") {
            return entry.neededAt === "runtime" ? "server-only" : "eas-secret";
          }
          return "server-only";
        }`,
      },
      {
        // Uses neededAt for everything, so structural config needed at
        // runtime is misrouted -- the rule is credential-specific.
        expect: "structural config is app.config.js whenever it is needed",
        impl: `function placeConfig(entry) {
          const kind = entry && entry.kind;
          const at = entry && entry.neededAt;
          if (at === "runtime" && kind !== "url" && kind !== "flag") return "server-only";
          if (kind === "structural") return "app.config.js";
          if (kind === "url" || kind === "flag") return "eas-env";
          if (kind === "credential") return "eas-secret";
          return "server-only";
        }`,
      },
      {
        // Throws on a missing entry. This runs in a config lint, and one
        // half-written entry stops the whole check rather than flagging it.
        expect: "a missing kind is server-only, not a crash",
        impl: `function placeConfig(entry) {
          if (entry.kind === "structural") return "app.config.js";
          if (entry.kind === "url" || entry.kind === "flag") return "eas-env";
          if (entry.kind === "credential") {
            return entry.neededAt === "build" ? "eas-secret" : "server-only";
          }
          throw new Error("unknown kind: " + entry.kind.toUpperCase());
        }`,
      },
    ],
  },
};
