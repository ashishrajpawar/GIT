/* Turn TypeScript lesson code into something `new Function` can run.
 *
 * WHY THIS EXISTS
 * ---------------
 * verify-lesson.mjs executes JavaScript, so a2/0001, a2/0003 and a3/0002 --
 * the TypeScript lessons -- were the only ones in the course whose code had
 * never been run. Not `unverifiable` with a reason: absent from the
 * verification log entirely, unattempted. Executing the 188 runnable
 * predict-output answers found 8 wrong keys; there was no reason to think TS
 * lessons were any cleaner, only that nothing had looked.
 *
 * NO NEW DEPENDENCY. Node 22.6+ can strip types itself, and this project has
 * no package.json and no build step on purpose. `stripTypeScriptTypes` is
 * flagged experimental, which is a real risk and a small one: the fallback
 * below means the worst case is the behaviour we already had.
 *
 * THE CONTRACT, and it is deliberately narrow: this does NOT type-check.
 * It erases types so the runtime behaviour can be tested. A lesson whose
 * types are wrong and whose values are right will pass here -- checking the
 * types is `tsc`'s job and is not what this tool is for.
 */
import { stripTypeScriptTypes } from "node:module";

/* Node prints an ExperimentalWarning to stderr on first use. It is true and
   it is noise in a verifier whose whole value is that a clean run means
   something -- and it would print once per lesson, training everyone to skim
   the output. Filtered by exact feature name so any OTHER experimental
   warning still gets through. */
const realEmit = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const text = typeof warning === "string" ? warning : warning && warning.message;
  if (typeof text === "string" && text.includes("stripTypeScriptTypes")) return;
  return realEmit.call(this, warning, ...rest);
};

/**
 * @param {string} src
 * @returns {{ code: string, mode: 'strip'|'transform'|'failed', error: string|null }}
 *
 * `strip` replaces type syntax with whitespace, so **line numbers are
 * preserved exactly** and a stack trace still points at the line the student
 * is looking at. That is why it is tried first rather than going straight to
 * `transform`, which rewrites and can move lines.
 *
 * `transform` is needed for the three constructs that are not erasable,
 * because they emit runtime code: `enum`, `namespace`, and constructor
 * parameter properties.
 *
 * `failed` is almost always JSX -- neither mode parses it, because a `.tsx`
 * file needs a different parser entry point. Callers must treat `failed` as
 * "leave the source alone" rather than as an error, so a lesson containing a
 * React Native component behaves exactly as it did before this file existed.
 */
export function stripTypes(src) {
  for (const mode of ["strip", "transform"]) {
    try {
      return { code: stripTypeScriptTypes(src, { mode }), mode, error: null };
    } catch (e) {
      var last = e && e.message ? e.message.split("\n")[0] : String(e);
    }
  }
  return { code: src, mode: "failed", error: last || "could not parse as TypeScript" };
}

/** Does this source parse as plain JavaScript in the same position the
 *  playground runs it? Used to decide whether stripping is needed AT ALL.
 *
 *  Stripping is a FALLBACK, never the default, and that is the whole safety
 *  argument: ~90 lessons verify today, and anything that parses as JavaScript
 *  is handed to `new Function` exactly as it always was. Only code that
 *  cannot parse gets a second chance as TypeScript, so there is no path by
 *  which this change alters a passing lesson. */
export function parsesAsJs(body, paramNames = []) {
  try {
    new Function(...paramNames, body);
    return true;
  } catch (e) {
    if (e instanceof SyntaxError) return false;
    throw e;
  }
}
