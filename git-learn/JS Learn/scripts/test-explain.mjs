#!/usr/bin/env node
/**
 * test-explain.mjs — assets/explain.js behaves, run against the real sandbox.
 *
 *   node scripts/test-explain.mjs
 *
 * The component's whole job is to still have your answer next time, so the
 * things worth testing are the ones that lose it: two boxes sharing a key,
 * a save that overwrites the wrong lesson, a browser with storage turned off
 * taking the lesson down with it.
 *
 * It runs against assets/dom-sandbox.js — the same in-memory document the
 * playgrounds use — rather than a hand-rolled stub, so a change to the sandbox
 * that would break the component in a browser breaks this suite too.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domSrc = fs.readFileSync(path.join(ROOT, "assets", "dom-sandbox.js"), "utf8");
const explainSrc = fs.readFileSync(path.join(ROOT, "assets", "explain.js"), "utf8");
const createDomSandbox = new Function(domSrc + "\nreturn createDomSandbox;")();

let passed = 0;
let failed = 0;
const check = (label, ok, detail) => {
  if (ok) { passed++; console.log("PASS  " + label); return; }
  failed++;
  console.log("FAIL  " + label);
  if (detail) console.log("      " + detail);
};

/** A page with `n` explain containers, plus the component loaded into it. */
function mount(html, opts = {}) {
  const sandbox = createDomSandbox(html);
  const globalObj = {
    document: sandbox.document,
    localStorage: opts.localStorage || sandbox.localStorage,
    location: opts.location || { pathname: "/modules/01/0006-scope-and-closures.html" },
    console: { error() {}, log() {} },
    Date,
    Object,
    String,
    JSON,
    isNaN,
  };
  globalObj.window = globalObj;
  new Function("global", "document", "localStorage", "location", "console",
    explainSrc.replace("})(typeof window !== \"undefined\" ? window : this);",
                       "})(global);"))
    (globalObj, sandbox.document, globalObj.localStorage, globalObj.location, globalObj.console);
  return { sandbox, createExplain: globalObj.createExplain, storage: globalObj.localStorage };
}

const q = (sandbox, sel) => sandbox.document.querySelector(sel);

/** Read a stored answer without assuming it is there. A broken key scheme
 *  makes these lookups miss, and a suite that throws on the first miss hides
 *  every test after it — which is how the cross-lesson check, the one that
 *  matters most, went unreported the first time this was proved. */
const entryOf = (storage, key) => {
  try {
    return JSON.parse(storage.getItem("jslearn-explain"))[key] || null;
  } catch (e) {
    return null;
  }
};
const textOf = (storage, key) => (entryOf(storage, key) || {}).text ?? null;

/* ------------------------------------------------------------- rendering */

{
  const { sandbox, createExplain } = mount('<div id="explain-1"></div>');
  createExplain("explain-1", { prompt: "Why is <code>248</code> the cut-off?" });

  check("it renders a prompt, a textarea and a save button",
        !!q(sandbox, ".explain-prompt") && !!q(sandbox, "textarea") && !!q(sandbox, ".explain-save-btn"),
        sandbox.serialize().slice(0, 200));

  check("the prompt keeps its inline markup",
        q(sandbox, ".explain-prompt").innerHTML.includes("<code>248</code>"),
        "got " + q(sandbox, ".explain-prompt").innerHTML);

  check("the label points at the textarea",
        q(sandbox, "label").getAttribute("for") === q(sandbox, "textarea").getAttribute("id"),
        "a label that does not reference its field is decoration");

  check("nothing is shown as saved before anything is saved",
        q(sandbox, ".explain-status").textContent === "",
        "got " + JSON.stringify(q(sandbox, ".explain-status").textContent));
}

/* --------------------------------------------------------------- saving */

{
  const { sandbox, createExplain, storage } = mount('<div id="explain-1"></div>');
  createExplain("explain-1", { prompt: "Why?" });

  q(sandbox, "textarea").value = "  Because 256 / 31 leaves 8 over.  ";
  q(sandbox, ".explain-save-btn").click();

  const stored = JSON.parse(storage.getItem("jslearn-explain"));
  const entry = entryOf(storage, "0006-scope-and-closures.html::explain-1");

  check("saving writes the answer under the lesson and container",
        !!entry, "keys were " + JSON.stringify(Object.keys(stored)));

  check("the answer is trimmed",
        !!entry && entry.text === "Because 256 / 31 leaves 8 over.",
        "got " + JSON.stringify(entry && entry.text));

  check("a timestamp is recorded",
        !!entry && !isNaN(new Date(entry.savedAt).getTime()),
        "got " + JSON.stringify(entry && entry.savedAt));

  check("the status line confirms it",
        /saved/i.test(q(sandbox, ".explain-status").textContent),
        "got " + JSON.stringify(q(sandbox, ".explain-status").textContent));
}

/* ------------------------------------------------------------ restoring */

{
  const first = mount('<div id="explain-1"></div>');
  first.createExplain("explain-1", { prompt: "Why?" });
  q(first.sandbox, "textarea").value = "A closure keeps it alive.";
  q(first.sandbox, ".explain-save-btn").click();

  // Same storage, fresh page — the student came back to the lesson.
  const second = mount('<div id="explain-1"></div>', { localStorage: first.storage });
  second.createExplain("explain-1", { prompt: "Why?" });

  check("the answer comes back on the next visit",
        q(second.sandbox, "textarea").value === "A closure keeps it alive.",
        "got " + JSON.stringify(q(second.sandbox, "textarea").value));

  check("and it says when it was written",
        /saved/i.test(q(second.sandbox, ".explain-status").textContent),
        "got " + JSON.stringify(q(second.sandbox, ".explain-status").textContent));
}

/* ------------------------------------------------------ keys stay apart */

{
  const { sandbox, createExplain, storage } =
    mount('<div id="explain-a"></div><div id="explain-b"></div>');
  createExplain("explain-a", { prompt: "First" });
  createExplain("explain-b", { prompt: "Second" });

  sandbox.document.querySelectorAll("textarea")[0].value = "answer A";
  sandbox.document.querySelectorAll(".explain-save-btn")[0].click();
  sandbox.document.querySelectorAll("textarea")[1].value = "answer B";
  sandbox.document.querySelectorAll(".explain-save-btn")[1].click();

  const stored = JSON.parse(storage.getItem("jslearn-explain"));
  check("two boxes on one page do not overwrite each other",
        Object.keys(stored).length === 2 &&
        textOf(storage, "0006-scope-and-closures.html::explain-a") === "answer A" &&
        textOf(storage, "0006-scope-and-closures.html::explain-b") === "answer B",
        JSON.stringify(stored));
}

{
  const one = mount('<div id="explain-1"></div>',
                    { location: { pathname: "/modules/01/0005-loops.html" } });
  one.createExplain("explain-1", { prompt: "Loops" });
  q(one.sandbox, "textarea").value = "loops answer";
  q(one.sandbox, ".explain-save-btn").click();

  const two = mount('<div id="explain-1"></div>', {
    localStorage: one.storage,
    location: { pathname: "/modules/01/0006-scope-and-closures.html" },
  });
  two.createExplain("explain-1", { prompt: "Closures" });

  check("the same container id in two lessons stays separate",
        q(two.sandbox, "textarea").value === "",
        "the closures lesson opened showing the loops answer: " +
        JSON.stringify(q(two.sandbox, "textarea").value));

  check("and the first lesson's answer survives",
        textOf(two.storage, "0005-loops.html::explain-1") === "loops answer",
        "stored keys: " +
        JSON.stringify(Object.keys(JSON.parse(two.storage.getItem("jslearn-explain")) || {})));
}

/* -------------------------------------------------------------- erasing */

{
  const { sandbox, createExplain, storage } = mount('<div id="explain-1"></div>');
  createExplain("explain-1", { prompt: "Why?" });
  q(sandbox, "textarea").value = "first attempt";
  q(sandbox, ".explain-save-btn").click();

  q(sandbox, "textarea").value = "   ";
  q(sandbox, ".explain-save-btn").click();

  const stored = JSON.parse(storage.getItem("jslearn-explain"));
  check("emptying the box and saving clears the entry rather than storing blanks",
        !stored["0006-scope-and-closures.html::explain-1"],
        JSON.stringify(stored));

  check("and it says so",
        q(sandbox, ".explain-status").textContent === "Cleared.",
        "got " + JSON.stringify(q(sandbox, ".explain-status").textContent));
}

/* ------------------------------------------- storage refusing to co-operate */

{
  const hostile = {
    getItem() { throw new Error("storage disabled"); },
    setItem() { throw new Error("storage disabled"); },
    removeItem() { throw new Error("storage disabled"); },
  };

  let threw = null;
  let sandbox;
  try {
    const m = mount('<div id="explain-1"></div>', { localStorage: hostile });
    sandbox = m.sandbox;
    m.createExplain("explain-1", { prompt: "Why?" });
    q(sandbox, "textarea").value = "an answer";
    q(sandbox, ".explain-save-btn").click();
  } catch (e) {
    threw = e;
  }

  check("a browser with storage disabled does not take the lesson down",
        threw === null,
        threw && threw.message);

  check("and the student is told the save did not stick",
        /could not save/i.test(q(sandbox, ".explain-status").textContent),
        "got " + JSON.stringify(sandbox && q(sandbox, ".explain-status").textContent));
}

/* ------------------------------------------------------- missing container */

{
  const { createExplain } = mount("<div></div>");
  let threw = null;
  try { createExplain("does-not-exist", { prompt: "Why?" }); } catch (e) { threw = e; }
  check("a mistyped container id logs rather than throws",
        threw === null,
        threw && threw.message);
}

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
