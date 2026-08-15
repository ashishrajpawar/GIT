#!/usr/bin/env node
/* test-dom-sandbox.mjs — prove assets/dom-sandbox.js behaves like a DOM.
 *
 *   node scripts/test-dom-sandbox.mjs
 *
 * Run this after touching dom-sandbox.js. Every assertion here is something a
 * student can type into an 01/0007 or 01/0008 playground, so a failure means a
 * lesson is about to teach something the sandbox gets wrong.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "assets", "dom-sandbox.js"), "utf8");
const createDomSandbox = new Function(src + "\nreturn createDomSandbox;")();

let pass = 0, fail = 0;
const eq = (label, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log(`FAIL ${label}\n     got      ${a}\n     expected ${e}`); }
};
const throws = (label, fn, needle) => {
  try { fn(); fail++; console.log(`FAIL ${label}: did not throw`); }
  catch (e) {
    if (needle && !e.message.includes(needle)) { fail++; console.log(`FAIL ${label}: message was "${e.message}"`); }
    else pass++;
  }
};

const HTML = `
<div id="chat">
  <div id="message-list">
    <div class="message-bubble received">Hey! Are you free tonight?</div>
    <div class="message-bubble sent unread">On my way!</div>
  </div>
  <input id="message-input" type="text" value="draft">
  <button id="send-btn">Send</button>
</div>`;

const s = createDomSandbox(HTML);
const d = s.document;

// --- selecting
eq("getElementById", d.getElementById("send-btn").textContent, "Send");
eq("getElementById miss", d.getElementById("nope"), null);
eq("querySelector #id", d.querySelector("#send-btn").tagName, "BUTTON");
eq("querySelector .class", d.querySelector(".message-bubble").textContent, "Hey! Are you free tonight?");
eq("querySelector tag", d.querySelector("input").id, "message-input");
eq("querySelector attr", d.querySelector("input[type='text']").id, "message-input");
eq("querySelector null", d.querySelector("#typo-in-id"), null);
eq("querySelectorAll count", d.querySelectorAll(".message-bubble").length, 2);
eq("querySelectorAll compound", d.querySelectorAll(".message-bubble.unread").length, 1);
eq("descendant selector", d.querySelectorAll("#message-list .message-bubble").length, 2);
eq("comma group", d.querySelectorAll("input, button").length, 2);
eq("no match", d.querySelectorAll(".ghost").length, 0);

let texts = [];
d.querySelectorAll(".message-bubble").forEach((el) => texts.push(el.textContent));
eq("nodelist forEach", texts, ["Hey! Are you free tonight?", "On my way!"]);
throws("nodelist.map rejected", () => d.querySelectorAll("div").map((x) => x), "not an array");
eq("Array.from works", Array.from(d.querySelectorAll(".message-bubble")).map((e) => e.className).length, 2);
throws("bad selector", () => d.querySelector("div > p"), "not a selector this playground understands");

// --- content
const status = d.createElement("span");
status.textContent = "Online";
eq("textContent get", status.textContent, "Online");
status.textContent = "Last seen today at 10:35 AM";
eq("textContent overwrite", status.textContent, "Last seen today at 10:35 AM");

const list = d.getElementById("message-list");
list.innerHTML = "<strong>Priya:</strong> On my way!";
eq("innerHTML set+get", list.innerHTML, "<strong>Priya:</strong> On my way!");
eq("innerHTML text flattens", list.textContent, "Priya: On my way!");
eq("children after innerHTML", list.children.length, 1);

// --- .value
const input = d.getElementById("message-input");
eq("value from attribute", input.value, "draft");
input.value = "";
eq("value cleared", input.value, "");
eq("value not serialised as attr", input.toString(), '<input id="message-input" type="text" value="draft">');

// --- style + classList
const bubble = d.createElement("div");
bubble.classList.add("message-bubble");
bubble.classList.add("received");
eq("classList add", bubble.className, "message-bubble received");
bubble.classList.remove("received");
eq("classList remove", bubble.className, "message-bubble");
eq("classList toggle on", bubble.classList.toggle("selected"), true);
eq("classList toggle off", bubble.classList.toggle("selected"), false);
eq("classList contains", bubble.classList.contains("message-bubble"), true);
bubble.style.backgroundColor = "#DCF8C6";
bubble.style.opacity = "0.6";
eq("style serialises kebab", bubble.toString(),
   '<div class="message-bubble" style="background-color: #DCF8C6; opacity: 0.6"></div>');

// --- create / append / remove
const holder = d.createElement("div");
holder.id = "holder";
const kid = d.createElement("p");
kid.textContent = "hi";
holder.appendChild(kid);
eq("appendChild", holder.innerHTML, "<p>hi</p>");
eq("parentNode", kid.parentNode === holder, true);
kid.remove();
eq("remove", holder.innerHTML, "");
eq("parentNode after remove", kid.parentNode, null);
throws("appendChild wrong type", () => holder.appendChild("text"), "did you mean to create it");
throws("void child", () => d.createElement("br").appendChild(d.createElement("i")), "cannot have children");
eq("scrollIntoView is a no-op", holder.scrollIntoView({ behavior: "smooth" }), undefined);

// --- escaping / XSS point of the lesson
const safe = d.createElement("div");
safe.textContent = "<script>steal()<\/script>";
eq("textContent escapes", safe.innerHTML, "&lt;script&gt;steal()&lt;/script&gt;");
eq("textContent round-trips", safe.textContent, "<script>steal()<\/script>");

// --- events
const btn = d.getElementById("send-btn");
let clicks = 0;
btn.addEventListener("click", () => clicks++);
btn.click();
eq("click listener", clicks, 1);

// Delegation: the ancestor hears the click, but `target` stays the button it
// actually happened on while `currentTarget` is the listening ancestor.
let bubbled = null;
d.getElementById("chat").addEventListener("click", (e) => {
  bubbled = e.target.id + " -> " + e.currentTarget.id;
});
btn.click();
eq("event bubbles, target stays the button", bubbled, "send-btn -> chat");

let stopped = 0;
const inner = d.createElement("div"), outer = d.createElement("div");
outer.appendChild(inner);
outer.addEventListener("click", () => stopped++);
inner.addEventListener("click", (e) => e.stopPropagation());
inner.click();
eq("stopPropagation", stopped, 0);

let key = null;
input.addEventListener("keydown", (e) => { if (e.key === "Enter") key = "Enter"; });
input.dispatchEvent(new s.Event("keydown", { key: "Enter" }));
eq("keydown event.key", key, "Enter");

let prevented = btn.dispatchEvent(new s.Event("click", {}));
eq("dispatchEvent returns true", prevented, true);
btn.addEventListener("click", (e) => e.preventDefault());
eq("dispatchEvent returns false after preventDefault",
   btn.dispatchEvent(new s.Event("click", {})), false);

// --- localStorage
eq("storage empty", s.localStorage.getItem("x"), null);
s.localStorage.setItem("draft", "hello");
eq("storage get", s.localStorage.getItem("draft"), "hello");
eq("storage length", s.localStorage.length, 1);
s.localStorage.setItem("n", 42);
eq("storage stringifies", s.localStorage.getItem("n"), "42");
s.localStorage.removeItem("n");
s.localStorage.clear();
eq("storage clear", s.localStorage.length, 0);

// --- isolation: the sandbox must not be the real page
eq("sandbox document is not global", d === globalThis.document, true === false);
eq("window.document is the sandbox", s.window.document === d, true);

// --- malformed HTML
throws("unclosed tag", () => { d.createElement("div").innerHTML = "<div><p>x</div>"; }, "Unexpected closing tag");
throws("stray close", () => { d.createElement("div").innerHTML = "</p>"; }, "Nothing was open");

// --- serialize for the preview pane
const s2 = createDomSandbox("<p>one</p>");
s2.document.body.appendChild(Object.assign(s2.document.createElement("p"), { textContent: "two" }));
eq("serialize", s2.serialize(), "<p>one</p><p>two</p>");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
