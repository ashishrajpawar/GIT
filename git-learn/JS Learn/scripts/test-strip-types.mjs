/* Does the TypeScript fallback erase types without touching JavaScript?
 *
 * The whole safety argument for this feature is one sentence: stripping is a
 * FALLBACK, so anything that parses as JavaScript is run exactly as it always
 * was. ~90 lessons depend on that sentence being true, and it is not visible
 * from the outside — a runner that quietly reparses everything as TypeScript
 * and a runner that only falls back look identical until one of them changes
 * an answer. These assertions are the difference.
 *
 *   node scripts/test-strip-types.mjs
 */
import { stripTypes, parsesAsJs } from "./strip-types.mjs";

let passed = 0, failed = 0;
const check = (label, ok, detail) => {
  if (ok) { passed++; console.log("  ok    " + label); }
  else { failed++; console.log("  FAIL  " + label + (detail ? "  --  " + detail : "")); }
};
const run = (src) => {
  const out = [];
  const code = parsesAsJs(src, ["console"]) ? src : stripTypes(src).code;
  new Function("console", code)({ log: (...a) => out.push(a.join(" ")) });
  return out.join("\n");
};

console.log("\n1. JavaScript is recognised as JavaScript and never rewritten");

for (const [label, src] of [
  ["plain", `const a = 1; console.log(a);`],
  ["regex with a slash", "const r = /a\\/b/g; console.log(r.source);"],
  ["template literal", "console.log(`x${1 + 1}y`);"],
  ["optional chain / nullish", `const o = {}; console.log(o?.a?.b ?? "none");`],
  ["private class field", `class C { #x = 1; v(){ return this.#x; } } console.log(new C().v());`],
  ["generator + labelled break", `function* g(){ yield 7; } outer: for (const v of g()) { console.log(v); break outer; }`],
  ["getter and computed key", `const k = "z"; const o = { get a(){ return 1; }, [k]: 2 }; console.log(o.a, o.z);`],
]) {
  check(`${label} parses as JS`, parsesAsJs(src, ["console"]),
    "if this is false the runner will reparse it as TypeScript");
}

/* The sharp edge. Any JS the probe misjudges would be silently handed to a
   TypeScript parser, and the failure mode is not an error — it is a lesson
   whose verified answer quietly changed. So assert the OUTPUT is identical
   both ways, not merely that both run. */
const jsSamples = [
  `let s = ""; for (let i = 0; i < 3; i++) s += i; console.log(s);`,
  `const xs = [3,1,2].sort((a,b) => a-b); console.log(JSON.stringify(xs));`,
  `console.log([1,2,3].reduce((a,b) => a + b, 0));`,
];
for (const [i, src] of jsSamples.entries()) {
  const direct = (() => { const o = []; new Function("console", src)({ log: (...a) => o.push(a.join(" ")) }); return o.join("\n"); })();
  const viaStrip = (() => { const o = []; new Function("console", stripTypes(src).code)({ log: (...a) => o.push(a.join(" ")) }); return o.join("\n"); })();
  check(`JS sample ${i} produces the same output stripped or not`, direct === viaStrip,
    `direct ${JSON.stringify(direct)} vs stripped ${JSON.stringify(viaStrip)}`);
}

console.log("\n2. TypeScript does not parse as JS, and runs once stripped");

for (const [label, src, expected] of [
  ["annotations", `const a: number = 2; function f(x: string): string { return x + "!"; } console.log(f("hi"), a);`, "hi! 2"],
  ["interface and type alias", `interface T { a: number } type U = T | null; const t: U = { a: 3 }; console.log(t!.a);`, "3"],
  ["generics and as", `function id<T>(x: T): T { return x; } console.log(id<number>(5), ("6" as unknown as string));`, "5 6"],
  ["import type is erased", `import type { Foo } from "./nowhere"; const n: number = 9; console.log(n);`, "9"],
  ["satisfies and non-null", `const o = { a: 1 } satisfies { a: number }; const b: number | null = 4; console.log(o.a, b!);`, "1 4"],
]) {
  check(`${label} is not valid JS`, !parsesAsJs(src, ["console"]));
  check(`...and runs to ${JSON.stringify(expected)} once stripped`, run(src) === expected,
    "got " + JSON.stringify(run(src)));
}

console.log("\n3. strip mode preserves line numbers; transform is the fallback");

const multiline = `const a: number = 1;\ntype X = { b: string };\nconst c: X = { b: "z" };\nconsole.log(a, c.b);`;
const strippedML = stripTypes(multiline);
check("annotations are erased in 'strip' mode", strippedML.mode === "strip",
  "got " + strippedML.mode);
check("...and the line count is unchanged, so stack traces still point at the lesson",
  strippedML.code.split("\n").length === multiline.split("\n").length,
  `${multiline.split("\n").length} lines in, ${strippedML.code.split("\n").length} out`);

/* enum, namespace and parameter properties emit runtime code, so they cannot
   be erased — they are the reason 'transform' exists at all. */
for (const [label, src, expected] of [
  ["enum", `enum E { A = 1, B } console.log(E.A, E[1]);`, "1 A"],
  ["namespace", `namespace N { export const x = 5; } console.log(N.x);`, "5"],
  ["parameter property", `class C { constructor(private x: number) {} v(){ return this.x; } } console.log(new C(8).v());`, "8"],
]) {
  const r = stripTypes(src);
  check(`${label} needs transform mode`, r.mode === "transform", "got " + r.mode);
  check(`...and runs to ${JSON.stringify(expected)}`, run(src) === expected,
    "got " + JSON.stringify(run(src)));
}

console.log("\n4. JSX fails, and failing returns the source untouched");

/* This is the deliberate limit, and the assertion that keeps it honest. A
   .tsx file needs a different parser entry point, so neither mode reads it.
   The contract is that `failed` hands BACK the original source, so a lesson
   with a React Native component behaves exactly as it did before any of this
   existed and its error message is its own. */
const jsx = `const el = <View style={{flex:1}}><Text>hi</Text></View>; console.log(el);`;
const jsxResult = stripTypes(jsx);
check("JSX cannot be stripped", jsxResult.mode === "failed", "got " + jsxResult.mode);
check("...and the source comes back byte-identical", jsxResult.code === jsx);
check("...with a reason recorded", typeof jsxResult.error === "string" && jsxResult.error.length > 0,
  "a silent failure here looks exactly like a successful strip");

console.log("\n5. type errors are NOT caught, and that is the contract");

/* Worth pinning so nobody later reports it as a bug: this erases types, it
   does not check them. Checking is tsc's job. A lesson whose types are wrong
   and whose values are right passes here, and the verifier's promise is only
   ever about runtime behaviour. */
const typeError = `const n: number = "not a number" as unknown as number; console.log(typeof n);`;
check("a value contradicting its annotation still runs", run(typeError) === "string",
  "got " + JSON.stringify(run(typeError)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
