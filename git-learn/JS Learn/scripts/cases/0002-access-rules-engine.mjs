/* Wrong-answer cases for b7/0002 — evaluateRuleSet.
 *
 *   node scripts/verify-lesson.mjs modules/b7-token-engine/0002-access-rules-engine.html \
 *        --wrong scripts/cases/0002-access-rules-engine.mjs
 *
 * Staged: `exercise-1` is the Express/Postgres engine and carries its own
 * per-exercise `unverifiable` reason, so only `rules` has cases.
 *
 * Almost everything here is a deny-by-default failure, and they share a
 * shape: the wrong answer is not a wrong ANSWER, it is a missing REFUSAL.
 * Each one falls through to allowed on input it did not understand.
 *
 *   Ignoring an unknown rule type. The worst of them, and the one that looks
 *   most like tolerance: an older server meets a rule a newer client wrote,
 *   shrugs, and grants an action the owner had restricted. Every rule it DOES
 *   understand passes, so nothing looks wrong from inside.
 *
 *   Testing typeof without Array.isArray. typeof [] === "object", so a
 *   malformed rules column arrives as an empty-looking object and every
 *   restriction silently disappears.
 *
 *   Truthiness on a channel flag. undefined is not permission, and a rules
 *   object written before video existed has no allow_video key at all.
 *
 * The exception is the "any rule passing is enough" mistake, which fails in
 * the other direction and is included because it is what you get by reaching
 * for .some() when you meant .every().
 *
 * Fixtures are chosen so no mistake passes by luck: the usedToday counts sit
 * at the message limit but nowhere near the call limit, so crossing the two
 * counters is visible; and the unknown-rule fixture pairs geo_fence with a
 * channel_restrict that would otherwise allow the action.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const HEAD = `const KNOWN_RULES = ["channel_restrict", "time_window", "contact_limit"];
const CHANNEL_FLAG = { message: "allow_text", voice_call: "allow_voice", video_call: "allow_video" };
function deny(reason) { return { allowed: false, reason: reason }; }`;

export const stages = {
  rules: {
    alternatives: [
      // every() over a list of checks rather than sequential ifs.
      `${HEAD}
      function evaluateRuleSet(rules, action, ctx) {
        if (rules == null) return { allowed: true };
        if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");

        const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
        if (bad) return deny("unsupported rule: " + bad);

        const checks = [
          function () {
            if (!rules.channel_restrict) return null;
            return rules.channel_restrict[CHANNEL_FLAG[action]] === true ? null : "channel not allowed";
          },
          function () {
            if (!rules.time_window) return null;
            return ctx.withinWindow === true ? null : "outside allowed hours";
          },
          function () {
            if (!rules.contact_limit) return null;
            const l = rules.contact_limit;
            const used = action === "message" ? ctx.usedToday.messages : ctx.usedToday.calls;
            const cap = action === "message" ? l.max_messages_per_day : l.max_calls_per_day;
            if (cap == null) return null;
            return used >= cap ? "daily limit reached" : null;
          },
        ];
        for (const c of checks) {
          const failure = c();
          if (failure) return deny(failure);
        }
        return { allowed: true };
      }`,

      // Collects the reason first, then shapes the result once.
      `${HEAD}
      function evaluateRuleSet(rules, action, ctx) {
        const reason = (function () {
          if (rules === null || rules === undefined) return null;
          if (typeof rules !== "object") return "unreadable rules";
          if (Array.isArray(rules)) return "unreadable rules";
          for (const k of Object.keys(rules)) {
            if (KNOWN_RULES.indexOf(k) === -1) return "unsupported rule: " + k;
          }
          if (rules.channel_restrict &&
              rules.channel_restrict[CHANNEL_FLAG[action]] !== true) return "channel not allowed";
          if (rules.time_window && ctx.withinWindow !== true) return "outside allowed hours";
          if (rules.contact_limit) {
            const l = rules.contact_limit;
            if (action === "message") {
              if (l.max_messages_per_day != null && ctx.usedToday.messages >= l.max_messages_per_day) {
                return "daily limit reached";
              }
            } else if (l.max_calls_per_day != null && ctx.usedToday.calls >= l.max_calls_per_day) {
              return "daily limit reached";
            }
          }
          return null;
        })();
        return reason === null ? { allowed: true } : deny(reason);
      }`,
    ],

    mistakes: [
      {
        // THE one. Unknown rules ignored rather than refused. Reads as
        // forward-compatibility and is a silent grant.
        expect: "an unknown rule type is REFUSED, not ignored",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");
          if (rules.channel_restrict && rules.channel_restrict[CHANNEL_FLAG[action]] !== true) {
            return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          if (rules.contact_limit) {
            const l = rules.contact_limit;
            if (action === "message") {
              if (l.max_messages_per_day != null && ctx.usedToday.messages >= l.max_messages_per_day) {
                return deny("daily limit reached");
              }
            } else if (l.max_calls_per_day != null && ctx.usedToday.calls >= l.max_calls_per_day) {
              return deny("daily limit reached");
            }
          }
          return { allowed: true };
        }`,
      },
      {
        // typeof without Array.isArray. A malformed array column looks like
        // an object with no keys, so every restriction vanishes.
        expect: "an ARRAY is unreadable, not an empty rules object",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object") return deny("unreadable rules");
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);
          if (rules.channel_restrict && rules.channel_restrict[CHANNEL_FLAG[action]] !== true) {
            return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          return { allowed: true };
        }`,
      },
      {
        // Truthiness on the channel flag. A rules object written before
        // video calls existed has no allow_video key, and undefined passes.
        expect: "a missing channel flag refuses",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);
          if (rules.channel_restrict) {
            const flag = rules.channel_restrict[CHANNEL_FLAG[action]];
            if (flag === false) return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          return { allowed: true };
        }`,
      },
      {
        // Treats an empty rules object as malformed. Fails CLOSED, and is
        // the plausible over-correction once the array case has bitten.
        expect: "an EMPTY rules object is allowed",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");
          if (Object.keys(rules).length === 0) return deny("unreadable rules");
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);
          if (rules.channel_restrict && rules.channel_restrict[CHANNEL_FLAG[action]] !== true) {
            return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          return { allowed: true };
        }`,
      },
      {
        // .some() where .every() was meant: one passing rule carries the
        // whole set, so adding a rule can WEAKEN a token.
        expect: "ALL rules must pass, not any",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);

          const results = [];
          if (rules.channel_restrict) {
            results.push(rules.channel_restrict[CHANNEL_FLAG[action]] === true ? null : "channel not allowed");
          }
          if (rules.time_window) {
            results.push(ctx.withinWindow === true ? null : "outside allowed hours");
          }
          if (results.length === 0) return { allowed: true };
          if (results.some(function (r) { return r === null; })) return { allowed: true };
          return deny(results[0]);
        }`,
      },
      {
        // Crosses the two counters: uses the message count for calls.
        expect: "the message limit does not block a call",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);
          if (rules.channel_restrict && rules.channel_restrict[CHANNEL_FLAG[action]] !== true) {
            return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          if (rules.contact_limit) {
            const l = rules.contact_limit;
            if (l.max_messages_per_day != null && ctx.usedToday.messages >= l.max_messages_per_day) {
              return deny("daily limit reached");
            }
          }
          return { allowed: true };
        }`,
      },
      {
        // Off-by-one on the limit: > instead of >=, so the cap permits one
        // more than it says.
        expect: "reaching the daily message limit refuses",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (rules == null) return { allowed: true };
          if (typeof rules !== "object" || Array.isArray(rules)) return deny("unreadable rules");
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);
          if (rules.channel_restrict && rules.channel_restrict[CHANNEL_FLAG[action]] !== true) {
            return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          if (rules.contact_limit) {
            const l = rules.contact_limit;
            const used = action === "message" ? ctx.usedToday.messages : ctx.usedToday.calls;
            const cap = action === "message" ? l.max_messages_per_day : l.max_calls_per_day;
            if (cap != null && used > cap) return deny("daily limit reached");
          }
          return { allowed: true };
        }`,
      },
      {
        // Treats a null rules column as malformed rather than as "no
        // restrictions". Fails closed: every unrestricted token stops working.
        expect: "no rules at all is allowed",
        impl: `${HEAD}
        function evaluateRuleSet(rules, action, ctx) {
          if (typeof rules !== "object" || rules === null || Array.isArray(rules)) {
            return deny("unreadable rules");
          }
          const bad = Object.keys(rules).find(function (k) { return KNOWN_RULES.indexOf(k) === -1; });
          if (bad) return deny("unsupported rule: " + bad);
          if (rules.channel_restrict && rules.channel_restrict[CHANNEL_FLAG[action]] !== true) {
            return deny("channel not allowed");
          }
          if (rules.time_window && ctx.withinWindow !== true) return deny("outside allowed hours");
          return { allowed: true };
        }`,
      },
    ],
  },
};
