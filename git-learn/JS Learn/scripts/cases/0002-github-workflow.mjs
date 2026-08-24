/* Wrong-answer cases for x1/0002 — findConflicts.
 *
 *   node scripts/verify-lesson.mjs modules/x1-git-dev-environment/0002-github-workflow.html \
 *        --wrong scripts/cases/0002-github-workflow.mjs
 *
 * Staged: `exercise-1` is a GitHub repository, SSH keys and a pull request,
 * and carries its own per-exercise `unverifiable` reason, so only `conflicts`
 * has cases.
 *
 * Unusually for this course, the mistakes here split evenly in BOTH
 * directions, and that is the point of the exercise:
 *
 *   Too eager — fires on a Markdown heading underline, a comment banner, an
 *   ASCII table. A check that cries wolf gets switched off, and then the real
 *   conflict goes unread. `scripts/check-pre-blocks.mjs` fired 71 times on
 *   its first run in this very repository and every one was wrong.
 *
 *   Too quiet — misses the diff3 base section, misses markers behind a
 *   trailing \r, misses a conflict left open at EOF. These are the ones that
 *   let `<<<<<<<` reach main.
 *
 * A detector is only useful if it is wrong in neither direction, which is why
 * the self-check has fixtures for both and why two of the cases below fail by
 * finding something that is not there.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    // How a raw line is normalised before anything looks at it.
    strip: `l.endsWith("\\r") ? l.slice(0, -1) : l`,
    // Whether a marker must be exactly seven characters.
    markerTest: `if (line.slice(0, 7) !== ch.repeat(7)) return false;
  if (line.length === 7) return true;
  return line[7] === " " && line[8] !== ch;`,
    // What may open a conflict.
    openTest: `isMarker(line, "<")`,
    // What is recognised while a conflict is open.
    baseTest: `isMarker(line, "|")`,
    // Whether an unclosed conflict is reported.
    reportUnclosed: `if (open !== null) conflicts.push(open);`,
    ...overrides,
  };

  return `function isMarker(line, ch) {
  ${o.markerTest}
}

function findConflicts(text) {
  const lines = String(text).split("\\n").map(function (l) {
    return ${o.strip};
  });

  const conflicts = [];
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (open === null) {
      if (${o.openTest}) {
        open = { start: lineNo, end: null, hasBase: false };
      }
      continue;
    }

    if (${o.baseTest}) {
      open.hasBase = true;
    } else if (isMarker(line, ">")) {
      open.end = lineNo;
      conflicts.push(open);
      open = null;
    }
  }

  ${o.reportUnclosed}

  return conflicts;
}`;
}

export const stages = {
  conflicts: {
    alternatives: [
      // A regex per marker, and a reduce over the lines instead of a for
      // loop. The anchors and the {7} quantifier do the same job as the
      // slice-and-compare version.
      `function findConflicts(text) {
        const OPEN = /^<{7}(?: .*)?$/;
        const BASE = /^\\|{7}(?: .*)?$/;
        const CLOSE = /^>{7}(?: .*)?$/;

        const acc = String(text)
          .split("\\n")
          .map(function (l) { return l.replace(/\\r$/, ""); })
          .reduce(function (state, line, i) {
            const lineNo = i + 1;
            if (state.open === null) {
              if (OPEN.test(line)) state.open = { start: lineNo, end: null, hasBase: false };
              return state;
            }
            if (BASE.test(line)) {
              state.open.hasBase = true;
            } else if (CLOSE.test(line)) {
              state.open.end = lineNo;
              state.out.push(state.open);
              state.open = null;
            }
            return state;
          }, { out: [], open: null });

        // Reduce has no natural place for this, which is exactly why the
        // first draft of this alternative dropped it and the self-check
        // caught it. An unclosed conflict still has to be reported.
        if (acc.open !== null) acc.out.push(acc.open);
        return acc.out;
      }`,

      // Same idea expressed with an explicit state name rather than a
      // nullable object, and the unclosed case handled at the end.
      `function markerAt(line, ch) {
        let n = 0;
        while (n < line.length && line.charAt(n) === ch) n++;
        if (n !== 7) return false;
        return line.length === 7 || line.charAt(7) === " ";
      }

      function findConflicts(text) {
        const raw = String(text).split("\\n");
        const out = [];
        let state = "outside";
        let current = null;

        for (let i = 0; i < raw.length; i++) {
          let line = raw[i];
          if (line.charAt(line.length - 1) === "\\r") line = line.slice(0, -1);

          if (state === "outside") {
            if (markerAt(line, "<")) {
              current = { start: i + 1, end: null, hasBase: false };
              state = "inside";
            }
            continue;
          }

          if (markerAt(line, "|")) {
            current.hasBase = true;
          } else if (markerAt(line, ">")) {
            current.end = i + 1;
            out.push(current);
            current = null;
            state = "outside";
          }
        }

        if (current !== null) out.push(current);
        return out;
      }`,
    ],

    mistakes: [
      {
        // TOO EAGER. Treats a divider as an opener, so every Markdown setext
        // heading in the repository is reported as a conflict. This is the
        // version that gets the check switched off within a week.
        expect: "a Markdown heading underline is not a conflict",
        impl: build({ openTest: `isMarker(line, "<") || line === "=".repeat(7)` }),
      },
      {
        // TOO EAGER, the other way: a closer with nothing open starts
        // counting. Any file containing a >>>>>>> in prose reports a
        // conflict running to the end of the file.
        expect: "closers and dividers with nothing open are ordinary text",
        impl: build({ openTest: `isMarker(line, "<") || isMarker(line, ">")` }),
      },
      {
        // TOO QUIET. Knows only the three classic markers, so the base
        // section of a diff3 conflict is invisible — and newer git defaults
        // to zdiff3, which writes one.
        expect: "a diff3 conflict is found and reports hasBase",
        impl: build({ baseTest: `false` }),
      },
      {
        // TOO QUIET. Never strips the carriage return, so on a file with
        // Windows line endings every marker is followed by \r and matches
        // nothing at all. Finds zero conflicts, confidently.
        expect: "CRLF line endings do not hide the markers",
        impl: build({ strip: `l` }),
      },
      {
        // TOO QUIET. Drops a conflict that is still open at the end of the
        // file — precisely the half-resolved case worth hearing about.
        expect: "a conflict left open at EOF is reported with end null",
        impl: build({ reportUnclosed: `` }),
      },
      {
        // startsWith instead of an exact count, so eight or more of the
        // character also matches. A line of ASCII art made of < is now a
        // conflict opener, and everything after it is swallowed.
        expect: "exactly seven characters, not six and not eight",
        impl: build({
          markerTest: `return line.startsWith(ch.repeat(7));`,
        }),
      },
      {
        // Searches anywhere in the line rather than requiring the marker to
        // start it, so a string literal containing the characters opens a
        // conflict. The single most tempting one-line implementation.
        expect: "markers inside a line are not markers",
        impl: build({
          markerTest: `return line.includes(ch.repeat(7));`,
        }),
      },
      {
        // Trims the line before testing, so an indented marker counts. Reads
        // as robustness and is not: git writes markers flush left, and
        // accepting indented ones means matching commented-out examples and
        // documentation like the code block on this very page.
        expect: "an indented marker is not a marker",
        impl: build({ strip: `(l.endsWith("\\r") ? l.slice(0, -1) : l).trim()` }),
      },
    ],
  },
};
