#!/usr/bin/env node
/* test-playground-dom.mjs — drive the real browser playground under Node.
 *
 *   node scripts/test-playground-dom.mjs
 *
 * scripts/verify-lesson.mjs checks that lesson *code* runs, but it reimplements
 * the execution call, so it cannot catch a mistake in playground.js's own
 * wiring — a preview that never refreshes, a Reset that does nothing, a second
 * Run inheriting the first one's DOM.
 *
 * The trick that makes this testable without a browser: the host page that
 * playground.js builds its widget into is itself a dom-sandbox document. So the
 * sandbox is both the thing under test and the harness running it.
 *
 * The last three assertions are the ones that matter most — they are the whole
 * reason the sandbox exists. A student typing `document.body.innerHTML = ""` or
 * `localStorage.clear()` must not destroy the lesson page or the progress that
 * progress.js keeps in localStorage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domSrc = fs.readFileSync(path.join(ROOT, "assets", "dom-sandbox.js"), "utf8");
const pgSrc = fs.readFileSync(path.join(ROOT, "assets", "playground.js"), "utf8");
const createDomSandbox = new Function(domSrc + "\nreturn createDomSandbox;")();

// The host page that playground.js builds its widget into is itself a sandbox.
const host = createDomSandbox('<div id="slot"></div>');
const timers = [];
const win = host.window;
win.createDomSandbox = createDomSandbox;
win.document = host.document;
win.setTimeout = (fn, ms) => { timers.push([fn, ms || 0]); return timers.length; };
win.addEventListener = () => {};
win.removeEventListener = () => {};
// playground.js is an IIFE that assigns onto `window`, so passing `win` in as
// a parameter is enough — it sets win.createPlayground itself.
new Function("window", "document", pgSrc)(win, host.document);

win.createPlayground("slot", `const list = document.getElementById("message-list");
const b = document.createElement("div");
b.textContent = "On my way!";
b.classList.add("message-bubble");
list.appendChild(b);
console.log("bubbles:", list.children.length);
localStorage.setItem("draft", "hi");
console.log("draft:", localStorage.getItem("draft"));`,
  { dom: true, html: '<div id="message-list"><div class="message-bubble">Hi</div></div>' });

const slot = host.document.getElementById("slot");
const preview = slot.querySelector(".playground-preview-body");
const output = slot.querySelector(".playground-output");
const runBtn = slot.querySelector(".playground-run");
const resetBtn = slot.querySelector(".playground-reset");

let pass = 0, fail = 0;
const eq = (label, a, e) => {
  if (a === e) pass++;
  else { fail++; console.log(`FAIL ${label}\n  got:\n${a}\n  expected:\n${e}`); }
};

eq("preview renders before Run",
   preview.textContent,
   '<div id="message-list">\n  <div class="message-bubble">Hi</div>\n</div>');

runBtn.click();
const drain = () => { while (timers.length) { timers.sort((a,b)=>a[1]-b[1]); timers.shift()[0](); } };
drain();

eq("console output after Run", output.textContent, "bubbles: 2\ndraft: hi");
eq("preview shows the appended bubble",
   preview.textContent,
   '<div id="message-list">\n  <div class="message-bubble">Hi</div>\n  <div class="message-bubble">On my way!</div>\n</div>');

// Run twice: the second run must start from a fresh sandbox, not inherit run 1.
runBtn.click();
drain();
eq("second Run does not accumulate", output.textContent, "bubbles: 2\ndraft: hi");

// Reset restores the starting markup.
resetBtn.click();
eq("Reset restores preview",
   preview.textContent,
   '<div id="message-list">\n  <div class="message-bubble">Hi</div>\n</div>');

// The real page must survive a destructive playground. The host body's exact
// markup does change on every Run — the output pane is part of it — so assert
// what actually matters: the page and its widget are still standing, and the
// student's saved progress is still in the host's localStorage.
host.localStorage.setItem("token-course-progress", '["01/0001"]');
const textarea = slot.querySelector("textarea");
textarea.value = 'document.body.innerHTML = "";\nlocalStorage.clear();\nconsole.log("wiped");';
runBtn.click();
drain();
eq("host page still has its content", host.document.getElementById("slot") !== null, true);
eq("the widget itself survived", host.document.querySelectorAll(".playground-editor").length, 1);
eq("student progress in host localStorage survived",
   host.localStorage.getItem("token-course-progress"), '["01/0001"]');
eq("destructive code reported normally", output.textContent, "wiped");
eq("preview shows the emptied sandbox body", preview.textContent, "(empty)");

// Missing sandbox is reported, not silently ignored.
delete win.createDomSandbox;
textarea.value = 'console.log(document.body)';
runBtn.click();
eq("missing sandbox is explained",
   output.textContent.includes("dom-sandbox.js") && output.className.includes("playground-error"), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
