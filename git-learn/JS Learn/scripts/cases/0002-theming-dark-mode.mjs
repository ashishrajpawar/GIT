/* Wrong-answer cases for a11/0002 — auditContrast.
 *
 *   node scripts/verify-lesson.mjs modules/a11-polish-publish/0002-theming-dark-mode.html \
 *        --wrong scripts/cases/0002-theming-dark-mode.mjs
 *
 * Staged: `exercise-1` is a React Native component with themed styles and
 * carries its own per-exercise `unverifiable` reason, so only `contrast` has
 * cases.
 *
 * Why this function. The palette in this lesson was chosen by eye, and in
 * light mode `warning` was 2.19:1, `textMuted` 2.07, `success` 2.87, `accent`
 * 3.15 and `danger` 3.82 — every one below the 4.5 a body-text pair needs. The
 * exercise then told the student to build the status badge out of exactly
 * those three semantic colours, so "is this token still live?" — the most
 * important question the app answers — was being answered at 2.19:1 in
 * daylight. The dark palette passed almost everything, which is the reverse of
 * the usual worry and has a reason: choosing a colour to sit on near-black IS
 * choosing for contrast, whether you mean to or not.
 *
 * Nobody notices this by looking, because the person looking picked the
 * colours. It takes twenty lines of arithmetic, and this is those lines.
 *
 * The headline pair:
 *
 *   SKIPPING THE GAMMA STEP. sRGB is gamma-encoded, so a channel's stored
 *   value is not its light output. Leaving out the 0.03928/2.4 transform is
 *   the classic error and it is dangerous precisely because the numbers stay
 *   in roughly the right range — mid-grey on white comes out ~3.7 instead of
 *   4.48, which reads as a plausible near-miss rather than as a broken tool.
 *   Both anchors (black-on-white = 21, self = 1) still come out exactly right,
 *   so the two tests everyone writes are the two that cannot catch it.
 *
 *   SCORING A COLOUR THAT HAS NO SCORE. `rgba(0, 0, 0, 0.5)` is transparent;
 *   its effective colour depends on what is painted behind it. An
 *   implementation that parses what it can and treats the rest as black
 *   returns a confident number for it, in a report someone signs off
 *   accessibility with.
 *
 * Then the quieter ones. Assuming fg is the lighter of the two, which works in
 * dark mode and inverts in light. One threshold for every size, wrong in both
 * directions. Defaulting an unrecognised size instead of refusing it — the
 * same "refuse, do not default" rule as a11/0003, and here the default that
 * feels safe (3.0) is the permissive one. Reporting failures unsorted, which
 * turns a work queue back into a list.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

/* One correct implementation with named seams, so each case differs from the
 * right answer in exactly one place by construction. */
const PARTS = {
  thresholds: `const THRESHOLDS = { body: 4.5, large: 3, ui: 3 };`,

  parse: `
function parseHex(value) {
  if (typeof value !== "string") return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16));
}`,

  lum: `
function luminance(rgb) {
  const v = rgb.map((n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}`,

  ratio: `
function contrastRatio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}`,

  sizeGuard: `
    const required = THRESHOLDS[pair.size];
    if (required === undefined) {
      skipped.push({ name: pair.name, reason: "unknown size: " + pair.size });
      continue;
    }`,

  colourGuard: `
    const fg = parseHex(pair.fg);
    const bg = parseHex(pair.bg);
    if (!fg || !bg) {
      skipped.push({
        name: pair.name,
        reason: "not an opaque hex colour: " + (!fg ? pair.fg : pair.bg),
      });
      continue;
    }`,

  sort: `  fail.sort((a, b) => a.ratio - b.ratio);`,
};

function build(overrides = {}) {
  const p = { ...PARTS, ...overrides };
  return `${p.thresholds}
${p.parse}
${p.lum}
${p.ratio}

function auditContrast(pairs) {
  const pass = [];
  const fail = [];
  const skipped = [];

  for (const pair of pairs || []) {
${p.sizeGuard}
${p.colourGuard}

    const ratio = contrastRatio(fg, bg);
    const entry = { name: pair.name, ratio, required };
    if (ratio >= required) pass.push(entry);
    else fail.push(entry);
  }

${p.sort}

  return { pass, fail, skipped };
}`;
}

export const stages = {
  contrast: {
    alternatives: [
      // Everything folded into one function, luminance computed with a
      // reduce, and the failure sort written as a comparator on the
      // difference from the requirement rather than on the ratio. Both
      // orderings agree here because every failure shares a threshold —
      // which is worth knowing, not worth pretending otherwise.
      `function auditContrast(pairs) {
        const need = { body: 4.5, large: 3, ui: 3 };
        const toRgb = (s) => {
          if (typeof s !== "string") return null;
          const t = s.trim();
          if (!/^#([\\da-f]{3}|[\\da-f]{6})$/i.test(t)) return null;
          const h = t.slice(1);
          const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
          return [full.slice(0, 2), full.slice(2, 4), full.slice(4, 6)]
            .map((p) => parseInt(p, 16));
        };
        const L = (rgb) =>
          rgb.reduce((acc, n, i) => {
            const c = n / 255;
            const lin = c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            return acc + [0.2126, 0.7152, 0.0722][i] * lin;
          }, 0);

        const out = { pass: [], fail: [], skipped: [] };
        for (const p of pairs || []) {
          const required = need[p.size];
          if (!required) {
            out.skipped.push({ name: p.name, reason: "size not recognised: " + p.size });
            continue;
          }
          const a = toRgb(p.fg), b = toRgb(p.bg);
          if (a === null || b === null) {
            out.skipped.push({
              name: p.name,
              reason: "cannot measure a non-hex colour: " + (a === null ? p.fg : p.bg),
            });
            continue;
          }
          const la = L(a), lb = L(b);
          const hi = la > lb ? la : lb;
          const lo = la > lb ? lb : la;
          const ratio = (hi + 0.05) / (lo + 0.05);
          out[ratio >= required ? "pass" : "fail"].push({ name: p.name, ratio, required });
        }
        out.fail.sort((x, y) => (x.ratio - x.required) - (y.ratio - y.required));
        return out;
      }`,

      // Validates everything up front into a separate list, then measures.
      // Uses a lookup table for the 256 possible channel values.
      `const LINEAR = Array.from({ length: 256 }, (_, n) => {
        const c = n / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      const WEIGHTS = [0.2126, 0.7152, 0.0722];
      const REQUIRED = { body: 4.5, large: 3, ui: 3 };

      function hexToRgb(value) {
        if (typeof value !== "string") return null;
        const m = value.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
        if (!m) return null;
        const h = m[1].length === 3
          ? m[1][0] + m[1][0] + m[1][1] + m[1][1] + m[1][2] + m[1][2]
          : m[1];
        return [
          parseInt(h.substring(0, 2), 16),
          parseInt(h.substring(2, 4), 16),
          parseInt(h.substring(4, 6), 16),
        ];
      }

      function auditContrast(pairs) {
        const list = Array.isArray(pairs) ? pairs : [];
        const skipped = [];
        const measurable = [];

        for (const pair of list) {
          if (!(pair.size in REQUIRED)) {
            skipped.push({ name: pair.name, reason: "unsupported size " + pair.size });
          } else if (hexToRgb(pair.fg) === null) {
            skipped.push({ name: pair.name, reason: "unmeasurable foreground " + pair.fg });
          } else if (hexToRgb(pair.bg) === null) {
            skipped.push({ name: pair.name, reason: "unmeasurable background " + pair.bg });
          } else {
            measurable.push(pair);
          }
        }

        const lum = (rgb) => rgb.reduce((a, n, i) => a + WEIGHTS[i] * LINEAR[n], 0);
        const scored = measurable.map((pair) => {
          const a = lum(hexToRgb(pair.fg));
          const b = lum(hexToRgb(pair.bg));
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          return { name: pair.name, ratio, required: REQUIRED[pair.size] };
        });

        return {
          pass: scored.filter((s) => s.ratio >= s.required),
          fail: scored.filter((s) => s.ratio < s.required)
                      .sort((x, y) => x.ratio - y.ratio),
          skipped,
        };
      }`,
    ],

    mistakes: [
      {
        // No gamma decode. Both anchors still come out exactly right, so the
        // two tests everyone writes are the two that cannot see it.
        expect: "mid-grey on white is 4.48, not the linear answer",
        impl: build({
          lum: `
function luminance(rgb) {
  const v = rgb.map((n) => n / 255);
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}`,
        }),
      },
      {
        // Averages the channels instead of weighting them. Green carries 72%
        // of perceived brightness and blue only 7%, so treating the three
        // equally is wrong for every colour that is not a grey -- and most
        // wrong exactly where a palette is most colourful.
        expect: "pure blue on white is 8.59, not the unweighted answer",
        impl: build({
          lum: `
function luminance(rgb) {
  const v = rgb.map((n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return (v[0] + v[1] + v[2]) / 3;
}`,
        }),
      },
      {
        // Assumes fg is the lighter one. Correct in dark mode, inverted in
        // light — which is the mode that was broken in the first place.
        expect: "argument order does not change the ratio",
        impl: build({
          ratio: `
function contrastRatio(fg, bg) {
  return (luminance(fg) + 0.05) / (luminance(bg) + 0.05);
}`,
        }),
      },
      {
        // One threshold everywhere. Over-reports large text and UI
        // boundaries, and the noise is what teaches a team to ignore the
        // report.
        expect: "and passes as large text",
        impl: build({
          thresholds: `const THRESHOLDS = { body: 4.5, large: 4.5, ui: 4.5 };`,
        }),
      },
      {
        // Defaults an unrecognised size to the lenient threshold. The pair
        // is scored against a rule nobody chose, and it passes.
        expect: "an unrecognised size is skipped, not given a default threshold",
        impl: build({
          sizeGuard: `
    const required = THRESHOLDS[pair.size] || 3;`,
        }),
      },
      {
        // Parses what it can and treats the rest as black. rgba(0,0,0,0.5)
        // gets a confident number, in a document used to sign off access.
        expect: "a colour with alpha is skipped, not scored",
        impl: build({
          parse: `
function parseHex(value) {
  const digits = String(value).replace(/[^0-9a-f]/gi, "").slice(0, 6).padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(digits.substr(i, 2), 16));
}`,
          colourGuard: `
    const fg = parseHex(pair.fg);
    const bg = parseHex(pair.bg);`,
        }),
      },
      {
        // Skips the pair but forgets to say why. A report of names with no
        // reasons is a list of things to ignore.
        expect: "every skip says why",
        impl: build({
          colourGuard: `
    const fg = parseHex(pair.fg);
    const bg = parseHex(pair.bg);
    if (!fg || !bg) {
      skipped.push({ name: pair.name });
      continue;
    }`,
        }),
      },
      {
        // Only expands six-digit hex. '#fff' silently becomes NaN, and
        // NaN >= required is false, so it is reported as a FAILURE rather
        // than as something that could not be read.
        expect: "#000 and #fff parse the same as #000000 and #FFFFFF",
        impl: build({
          parse: `
function parseHex(value) {
  if (typeof value !== "string") return null;
  const m = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  return [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16));
}`,
        }),
      },
      {
        // Case-sensitive hex. '#fff' and '#ffffff' are perfectly ordinary
        // CSS, and half a palette is usually written lowercase.
        expect: "#000 and #fff parse the same as #000000 and #FFFFFF",
        impl: build({
          parse: `
function parseHex(value) {
  if (typeof value !== "string") return null;
  const m = /^#([0-9A-F]{3}|[0-9A-F]{6})$/.exec(value.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16));
}`,
        }),
      },
      {
        // Reports failures in the order they were declared. The report is a
        // work queue and this hands it back as a list.
        expect: "failures are sorted worst first",
        impl: build({ sort: `  // (left in declaration order)` }),
      },
      {
        // Sorts worst LAST. Reads as a sorted report, buries the 2.19 under
        // the near-misses.
        expect: "failures are sorted worst first",
        impl: build({ sort: `  fail.sort((a, b) => b.ratio - a.ratio);` }),
      },
    ],
  },
};
