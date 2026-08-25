/* Wrong-answer cases for a9/0001 — claimsUrl.
 *
 *   node scripts/verify-lesson.mjs modules/a9-deep-linking/0001-universal-links-app-links.html \
 *        --wrong scripts/cases/0001-universal-links-app-links.mjs
 *
 * Staged: `exercise-1` is an AASA file, an assetlinks.json and an Expo
 * app.config.js, and carries its own per-exercise `unverifiable` reason, so
 * only `claims` has cases.
 *
 * What makes this function worth writing rather than reasoning about: every
 * mistake below produces the SAME symptom on a device — a link opens the
 * browser when it should open the app, or the app when it should open the
 * browser — with no error anywhere, on ONE platform only, and behind an
 * Apple cache that can take days to clear. You cannot bisect it, because
 * each build you install re-fetches the AASA at install time and the answer
 * changes underneath you.
 *
 * The mistakes divide by which half of the asymmetry they break:
 *
 *   Ordering. `first-match-wins` is the rule, and the habit everybody brings
 *   is .gitignore's, which is the opposite. Both directions are represented:
 *   evaluating last-match-wins, and "helpfully" hoisting the exclusions so
 *   the author's order stops meaning anything.
 *
 *   Matching. The wildcards, the escaping, the case sensitivity and the
 *   omitted-part rule. These fail narrowly and are the ones a single hand
 *   test would miss, because the URL you test with is the one you designed
 *   the pattern for.
 *
 *   Android. autoVerify, exact-vs-prefix, and the data entry with no path
 *   rule at all — which claims the entire domain and looks like a tidier
 *   config, not a mistake.
 *
 * Two of them name the same check ("an iOS exclusion has no Android
 * equivalent"), deliberately: it is the assertion that catches getting the
 * ordering wrong AND ignoring `exclude` outright. Different bugs, one rule.
 *
 * TRIP COUNTS: 13 of 16 trip exactly one check. The three that trip more
 * were run individually and are inherent — each is one wrong rule observed
 * on every fixture that depends on it:
 *
 *   last-match-wins        breaks all three ordering/exclusion checks.
 *   ignores `exclude`      breaks both exclusion checks.
 *   no-"?" means no query  breaks all three query checks.
 *
 * Two fixtures had to be sharpened first, and both were the same failure —
 * a fixture that could not express the rule it was written for:
 *
 *   The exclusion check used the bare `/t/demo` against the pattern
 *   `/t/demo*`, so it needed the `*` to match ZERO characters. That is a
 *   different rule with its own check, and a one-or-more `*` therefore
 *   tripped the exclusion check instead of the wildcard one. It is now
 *   `/t/demo-page`, where the `*` has something to match.
 *
 *   The Android exact-vs-prefix check used `path: '/t/one'` against the URL
 *   `/t/two`, which exact and prefix BOTH reject — so it proved nothing. It
 *   is now `/t/one-more`, which only a prefix test accepts.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    prelude: ``,

    parse: `let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return { ios: false, android: false, agree: true };
  }`,

    glob: `let source = "^";
    for (const ch of String(pattern)) {
      if (ch === "*") source += "[\\\\s\\\\S]*";
      else if (ch === "?") source += "[\\\\s\\\\S]";
      else source += ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
    }
    return new RegExp(source + "$").test(String(value));`,

    iosGuard: `if (parsed.protocol !== "https:") return false;
    if (!(ios.domains || []).includes(parsed.hostname)) return false;`,

    componentLoop: `for (const component of ios.components || []) {
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("#" in component && !globMatches(component["#"], fragment)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams) || !globMatches(wanted[key], queryParams[key])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      return !component.exclude;
    }
    return false;`,

    androidLoop: `for (const filter of android.intentFilters || []) {
      if (!filter.autoVerify) continue;
      for (const entry of filter.data || []) {
        if (entry.scheme !== undefined && entry.scheme + ":" !== parsed.protocol) continue;
        if (entry.host !== undefined && entry.host !== parsed.hostname) continue;
        if (entry.path !== undefined) {
          if (entry.path !== path) continue;
        } else if (entry.pathPrefix !== undefined) {
          if (!path.startsWith(entry.pathPrefix)) continue;
        }
        return true;
      }
    }
    return false;`,

    agree: `return { ios: ios, android: android, agree: ios === android };`,

    ...overrides,
  };

  return `function claimsUrl(url, config) {
  ${o.parse}
  ${o.prelude}

  const path = parsed.pathname;
  const fragment = parsed.hash.replace(/^#/, "");
  const queryParams = {};
  parsed.searchParams.forEach(function (value, key) {
    if (!(key in queryParams)) queryParams[key] = value;
  });

  function globMatches(pattern, value) {
    ${o.glob}
  }

  function iosClaims() {
    const ios = config.ios || {};
    ${o.iosGuard}
    ${o.componentLoop}
  }

  function androidClaims() {
    const android = config.android || {};
    ${o.androidLoop}
  }

  const ios = iosClaims();
  const android = androidClaims();
  ${o.agree}
}`;
}

export const stages = {
  claims: {
    alternatives: [
      // The component walk expressed as a find() over a predicate, with the
      // decision read off whichever entry find() stopped on.
      `function claimsUrl(url, config) {
        let parsed;
        try { parsed = new URL(url); }
        catch (e) { return { ios: false, android: false, agree: true }; }

        const path = parsed.pathname;
        const frag = parsed.hash.slice(1);
        const query = {};
        for (const [k, v] of parsed.searchParams) if (!(k in query)) query[k] = v;

        const toRe = (p) => new RegExp("^" + [...String(p)].map((c) =>
          c === "*" ? "[\\\\s\\\\S]*" :
          c === "?" ? "[\\\\s\\\\S]" :
          c.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&")).join("") + "$");

        const hit = (p, v) => toRe(p).test(String(v));

        const partsMatch = (c) =>
          (!("/" in c) || hit(c["/"], path)) &&
          (!("#" in c) || hit(c["#"], frag)) &&
          (!("?" in c) || Object.entries(c["?"]).every(
            ([k, pat]) => k in query && hit(pat, query[k])));

        const iosCfg = config.ios || {};
        const iosOk = parsed.protocol === "https:" &&
          (iosCfg.domains || []).indexOf(parsed.hostname) !== -1;
        const first = iosOk ? (iosCfg.components || []).find(partsMatch) : undefined;
        const ios = first !== undefined && !first.exclude;

        const android = (((config.android || {}).intentFilters) || []).some((f) =>
          f.autoVerify && (f.data || []).some((d) =>
            (d.scheme === undefined || d.scheme + ":" === parsed.protocol) &&
            (d.host === undefined || d.host === parsed.hostname) &&
            (d.path !== undefined ? d.path === path
              : d.pathPrefix !== undefined ? path.startsWith(d.pathPrefix)
              : true)));

        return { ios, android, agree: ios === android };
      }`,

      // Indexed while-loops and a manually built character class, which is
      // where the escaping usually goes wrong.
      `function claimsUrl(url, config) {
        var parsed = null;
        try { parsed = new URL(url); } catch (e) { parsed = null; }
        if (!parsed) return { ios: false, android: false, agree: true };

        var path = parsed.pathname;
        var frag = parsed.hash.indexOf("#") === 0 ? parsed.hash.substring(1) : parsed.hash;
        var query = {};
        parsed.searchParams.forEach(function (v, k) {
          if (!Object.prototype.hasOwnProperty.call(query, k)) query[k] = v;
        });

        var SPECIAL = ".^\$+|()[]{}\\\\";
        function compile(pattern) {
          var s = "^", p = String(pattern), i = 0;
          while (i < p.length) {
            var c = p.charAt(i);
            if (c === "*") s += "[\\\\s\\\\S]*";
            else if (c === "?") s += "[\\\\s\\\\S]";
            else if (SPECIAL.indexOf(c) !== -1) s += "\\\\" + c;
            else s += c;
            i++;
          }
          return new RegExp(s + "$");
        }
        function m(pattern, value) { return compile(pattern).test(String(value)); }

        var iosCfg = config.ios || {};
        var ios = false;
        if (parsed.protocol === "https:" && (iosCfg.domains || []).indexOf(parsed.hostname) !== -1) {
          var comps = iosCfg.components || [];
          for (var i = 0; i < comps.length; i++) {
            var c = comps[i];
            if (Object.prototype.hasOwnProperty.call(c, "/") && !m(c["/"], path)) continue;
            if (Object.prototype.hasOwnProperty.call(c, "#") && !m(c["#"], frag)) continue;
            if (Object.prototype.hasOwnProperty.call(c, "?")) {
              var keys = Object.keys(c["?"]), bad = false;
              for (var j = 0; j < keys.length; j++) {
                var k = keys[j];
                if (!Object.prototype.hasOwnProperty.call(query, k) || !m(c["?"][k], query[k])) {
                  bad = true; break;
                }
              }
              if (bad) continue;
            }
            ios = c.exclude ? false : true;
            break;
          }
        }

        var android = false;
        var filters = (config.android || {}).intentFilters || [];
        for (var f = 0; f < filters.length && !android; f++) {
          if (!filters[f].autoVerify) continue;
          var data = filters[f].data || [];
          for (var d = 0; d < data.length; d++) {
            var e = data[d];
            if (e.scheme !== undefined && e.scheme + ":" !== parsed.protocol) continue;
            if (e.host !== undefined && e.host !== parsed.hostname) continue;
            if (e.path !== undefined && e.path !== path) continue;
            if (e.path === undefined && e.pathPrefix !== undefined &&
                path.indexOf(e.pathPrefix) !== 0) continue;
            android = true; break;
          }
        }

        return { ios: ios, android: android, agree: ios === android };
      }`,

      // The component walk written with an explicit index and an early
      // return, which is the shape people reach for once they know the
      // first match decides.
      build({
        componentLoop: `const comps = ios.components || [];
    for (let i = 0; i < comps.length; i++) {
      const component = comps[i];
      let matched = true;
      if ("/" in component) matched = matched && globMatches(component["/"], path);
      if (matched && "#" in component) matched = globMatches(component["#"], fragment);
      if (matched && "?" in component) {
        for (const key of Object.keys(component["?"])) {
          if (!(key in queryParams) || !globMatches(component["?"][key], queryParams[key])) {
            matched = false;
            break;
          }
        }
      }
      if (matched) return component.exclude !== true;
    }
    return false;`,
      }),
    ],

    mistakes: [
      {
        // LAST-match-wins: the .gitignore habit, applied to a file that
        // resolves the other way. The exclusions are written at the top,
        // exactly where they belong, and are overruled by the general claim
        // underneath them -- so the config LOOKS right in review.
        expect: "an iOS exclusion has no Android equivalent, so the platforms disagree",
        impl: build({
          componentLoop: `let decision = false;
    let found = false;
    for (const component of ios.components || []) {
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("#" in component && !globMatches(component["#"], fragment)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams) || !globMatches(wanted[key], queryParams[key])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      decision = !component.exclude;
      found = true;
    }
    return found ? decision : false;`,
        }),
      },
      {
        // Ignores `exclude` entirely -- any match is a claim. The word is
        // right there in the file and the code never reads it, which is the
        // easiest of these to write and the hardest to see in review.
        expect: "an iOS exclusion has no Android equivalent, so the platforms disagree",
        impl: build({
          componentLoop: `for (const component of ios.components || []) {
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("#" in component && !globMatches(component["#"], fragment)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams) || !globMatches(wanted[key], queryParams[key])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      return true;
    }
    return false;`,
        }),
      },
      {
        // Sorts the exclusions to the front "so they always win". Helpful,
        // and it destroys the only mechanism the format has for saying
        // "claim this narrow thing even though a broader exclusion covers
        // it". The author's ordering stops meaning anything.
        expect: "first match wins: an exclusion below the claim is dead",
        impl: build({
          prelude: `const ordered = (config.ios && config.ios.components || [])
    .slice()
    .sort(function (a, b) { return (b.exclude ? 1 : 0) - (a.exclude ? 1 : 0); });
  config = Object.assign({}, config, {
    ios: Object.assign({}, config.ios, { components: ordered }),
  });`,
        }),
      },
      {
        // A component with no "?" is read as requiring an empty query. The
        // omitted part is a statement of indifference, not a demand for
        // absence -- and every real link carries ?utm_source or ?ref.
        expect: "a query exclusion fires only when its parameter is actually there",
        impl: build({
          componentLoop: `for (const component of ios.components || []) {
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("#" in component && !globMatches(component["#"], fragment)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams) || !globMatches(wanted[key], queryParams[key])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      } else if (Object.keys(queryParams).length > 0) {
        continue;
      }
      return !component.exclude;
    }
    return false;`,
        }),
      },
      {
        // Checks that the query parameter is PRESENT and never looks at what
        // it says. ?web=0 then excludes just as hard as ?web=1, so the
        // escape hatch fires on the value that means "do not".
        expect: "a query exclusion checks the VALUE, not just that the key exists",
        impl: build({
          componentLoop: `for (const component of ios.components || []) {
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("#" in component && !globMatches(component["#"], fragment)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams)) { ok = false; break; }
        }
        if (!ok) continue;
      }
      return !component.exclude;
    }
    return false;`,
        }),
      },
      {
        // Case-insensitive matching, which feels forgiving and is not what
        // the platform does -- so the function says "claimed" for a URL the
        // device will hand to the browser.
        expect: "path matching is case-sensitive",
        impl: build({
          glob: `let source = "^";
    for (const ch of String(pattern)) {
      if (ch === "*") source += "[\\\\s\\\\S]*";
      else if (ch === "?") source += "[\\\\s\\\\S]";
      else source += ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
    }
    return new RegExp(source + "$", "i").test(String(value));`,
        }),
      },
      {
        // * as one-or-more. Reads as "there must be a code there", which is
        // even a reasonable thing to want -- and it is not what * means, so
        // the bare /t/ landing page silently stops opening the app.
        expect: "* matches zero characters, so /t/ matches /t/*",
        impl: build({
          glob: `let source = "^";
    for (const ch of String(pattern)) {
      if (ch === "*") source += "[\\\\s\\\\S]+";
      else if (ch === "?") source += "[\\\\s\\\\S]";
      else source += ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
    }
    return new RegExp(source + "$").test(String(value));`,
        }),
      },
      {
        // ? as zero-or-one, borrowed from regex, where ? means optional.
        // In a glob it means exactly one character.
        expect: "? matches exactly one character, never zero and never two",
        impl: build({
          glob: `let source = "^";
    for (const ch of String(pattern)) {
      if (ch === "*") source += "[\\\\s\\\\S]*";
      else if (ch === "?") source += "[\\\\s\\\\S]?";
      else source += ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
    }
    return new RegExp(source + "$").test(String(value));`,
        }),
      },
      {
        // The literal parts dropped straight into a RegExp unescaped. Paths
        // are full of dots, and an unescaped dot claims a URL you never
        // meant to claim rather than failing to claim one you did.
        expect: "a dot in a pattern is a dot, not a wildcard",
        impl: build({
          glob: `const source = String(pattern).replace(/\\*/g, "[\\\\s\\\\S]*").replace(/\\?/g, "[\\\\s\\\\S]");
    return new RegExp("^" + source + "$").test(String(value));`,
        }),
      },
      {
        // The fragment component ignored. Harmless-looking, and it means a
        // component that was written to narrow the claim does not narrow it.
        expect: "a fragment component is matched against the fragment",
        impl: build({
          componentLoop: `for (const component of ios.components || []) {
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams) || !globMatches(wanted[key], queryParams[key])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      return !component.exclude;
    }
    return false;`,
        }),
      },
      {
        // autoVerify ignored. Without it Android shows a disambiguation
        // dialog, and "the user picks your app from a list" is a different
        // product experience from "the link opens your app".
        expect: "without autoVerify Android offers a chooser, which is not the app opening",
        impl: build({
          androidLoop: `for (const filter of android.intentFilters || []) {
      for (const entry of filter.data || []) {
        if (entry.scheme !== undefined && entry.scheme + ":" !== parsed.protocol) continue;
        if (entry.host !== undefined && entry.host !== parsed.hostname) continue;
        if (entry.path !== undefined) {
          if (entry.path !== path) continue;
        } else if (entry.pathPrefix !== undefined) {
          if (!path.startsWith(entry.pathPrefix)) continue;
        }
        return true;
      }
    }
    return false;`,
        }),
      },
      {
        // `path` treated as a prefix. The two keys exist precisely because
        // one is exact and the other is not; collapsing them turns the
        // narrowest rule Android has into the broadest.
        expect: "path is exact, not a prefix",
        impl: build({
          androidLoop: `for (const filter of android.intentFilters || []) {
      if (!filter.autoVerify) continue;
      for (const entry of filter.data || []) {
        if (entry.scheme !== undefined && entry.scheme + ":" !== parsed.protocol) continue;
        if (entry.host !== undefined && entry.host !== parsed.hostname) continue;
        const prefix = entry.path !== undefined ? entry.path : entry.pathPrefix;
        if (prefix !== undefined && !path.startsWith(prefix)) continue;
        return true;
      }
    }
    return false;`,
        }),
      },
      {
        // Requires a path rule, so the entry that claims the whole domain
        // reads as claiming nothing. This one fails SAFE on the function's
        // answer and unsafe in reality: the config it tells you is harmless
        // is the config that swallows every page on tokn.app.
        expect: "a data entry with no path rule claims every path on the host",
        impl: build({
          androidLoop: `for (const filter of android.intentFilters || []) {
      if (!filter.autoVerify) continue;
      for (const entry of filter.data || []) {
        if (entry.scheme !== undefined && entry.scheme + ":" !== parsed.protocol) continue;
        if (entry.host !== undefined && entry.host !== parsed.hostname) continue;
        if (entry.path !== undefined) {
          if (entry.path !== path) continue;
        } else if (entry.pathPrefix !== undefined) {
          if (!path.startsWith(entry.pathPrefix)) continue;
        } else {
          continue;
        }
        return true;
      }
    }
    return false;`,
        }),
      },
      {
        // agree computed as "both claim it". Two platforms agreeing to
        // ignore a URL is agreement, and this reports every unclaimed path
        // on the domain as a disagreement -- which is most of them, so the
        // real disagreements are lost in the noise.
        expect: "a path outside /t/ is claimed by neither, and that is agreement",
        impl: build({ agree: `return { ios: ios, android: android, agree: ios && android };` }),
      },
      {
        // No guard around new URL. A pre-release check runs this over every
        // link in the repo, and one malformed entry ends the run with a
        // stack trace that looks like a bug in the checker.
        expect: "an unparseable URL is claimed by neither, and does not throw",
        impl: build({ parse: `const parsed = new URL(url);` }),
      },
      {
        // Memoises the compiled pattern onto the component object. A sound
        // optimisation everywhere except that the caller passes the same
        // config for every URL in the list and may well serialise it
        // afterwards to report what was checked.
        expect: "the config is not mutated",
        impl: build({
          glob: `if (typeof pattern === "object" && pattern !== null) return false;
    let source = "^";
    for (const ch of String(pattern)) {
      if (ch === "*") source += "[\\\\s\\\\S]*";
      else if (ch === "?") source += "[\\\\s\\\\S]";
      else source += ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
    }
    return new RegExp(source + "$").test(String(value));`,
          componentLoop: `for (const component of ios.components || []) {
      if (!component.__compiled) {
        component.__compiled = true;
      }
      if ("/" in component && !globMatches(component["/"], path)) continue;
      if ("#" in component && !globMatches(component["#"], fragment)) continue;
      if ("?" in component) {
        const wanted = component["?"];
        let ok = true;
        for (const key of Object.keys(wanted)) {
          if (!(key in queryParams) || !globMatches(wanted[key], queryParams[key])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      return !component.exclude;
    }
    return false;`,
        }),
      },
    ],
  },
};
