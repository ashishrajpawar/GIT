(function (global) {
  "use strict";

  function createPlayground(containerId, starterCode) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createPlayground: No element with id '" + containerId + "'");
      return;
    }

    starterCode = starterCode || "";

    container.innerHTML = "";
    container.className = "playground";

    var label = document.createElement("div");
    label.className = "playground-label";
    label.textContent = "JavaScript Playground";
    container.appendChild(label);

    var textarea = document.createElement("textarea");
    textarea.className = "playground-editor";
    textarea.value = starterCode;
    textarea.spellcheck = false;
    textarea.setAttribute("autocorrect", "off");
    textarea.setAttribute("autocapitalize", "off");
    container.appendChild(textarea);

    var toolbar = document.createElement("div");
    toolbar.className = "playground-toolbar";

    var runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "playground-run";
    runBtn.textContent = "Run";
    runBtn.addEventListener("click", function () { runCode(textarea, output); });

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "playground-reset";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", function () {
      textarea.value = starterCode;
      output.textContent = "";
      output.className = "playground-output";
    });

    toolbar.appendChild(runBtn);
    toolbar.appendChild(resetBtn);
    container.appendChild(toolbar);

    var output = document.createElement("pre");
    output.className = "playground-output";
    container.appendChild(output);
  }

  /* Time budget for a single Run, in milliseconds. A runaway loop is stopped
     rather than hanging the tab — students meet `while (true)` in lesson
     01/0005, and a frozen browser teaches nothing. */
  var TIME_BUDGET_MS = 2000;

  /* Wall-clock guard, called once per loop iteration by instrumented code. */
  function makeTicker() {
    var deadline = Date.now() + TIME_BUDGET_MS;
    var n = 0;
    return function () {
      /* Check the clock every 2000 iterations — Date.now() in a hot loop is
         itself slow enough to matter. */
      if ((++n & 2047) === 0 && Date.now() > deadline) {
        throw new RangeError(
          "Your code ran for more than " + (TIME_BUDGET_MS / 1000) +
          " seconds and was stopped. This usually means a loop never ends — " +
          "check that its condition can eventually become false."
        );
      }
    };
  }

  /* Insert a guard call at the top of every loop body.
     Brace-counting rather than a regex, so headers containing parentheses
     (`for (let i = 0; i < items.length; i++)`) are handled correctly.
     Known limit: a braceless body (`while (x) step();`) is left unguarded. */
  function instrument(code) {
    var out = "";
    var i = 0;
    while (i < code.length) {
      var m = /\b(for|while)\s*\(/.exec(code.slice(i));
      var d = /\bdo\s*\{/.exec(code.slice(i));
      if (d && (!m || d.index < m.index)) {
        out += code.slice(i, i + d.index + d[0].length) + "__tick();";
        i += d.index + d[0].length;
        continue;
      }
      if (!m) { out += code.slice(i); break; }
      var start = i + m.index;
      var p = start + m[0].length;      /* just past the opening "(" */
      var depth = 1;
      while (p < code.length && depth > 0) {
        if (code[p] === "(") depth++;
        else if (code[p] === ")") depth--;
        p++;
      }
      while (p < code.length && /\s/.test(code[p])) p++;
      if (code[p] === "{") {
        out += code.slice(i, p + 1) + "__tick();";
        i = p + 1;
      } else {
        out += code.slice(i, p);        /* braceless body — leave it alone */
        i = p;
      }
    }
    return out;
  }

  function runCode(textarea, output) {
    output.textContent = "";
    output.className = "playground-output";

    var logs = [];
    function push() {
      var args = Array.prototype.slice.call(arguments);
      logs.push(args.map(function (a) {
        if (typeof a === "object" && a !== null) {
          try { return JSON.stringify(a, null, 2); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(" "));
    }
    var fakeConsole = { log: push, warn: push, info: push, error: push, debug: push };

    function render(failed) {
      output.textContent = logs.join("\n") || "(no output)";
      output.className = "playground-output" + (failed ? " playground-error" : "");
    }

    /* Async code resolves in a microtask, so reading `logs` immediately after
       the call reports "(no output)" for correct answers — .then() and await
       both looked broken. Render once synchronously, then again after the
       queue drains so late output appears. */
    function settle() {
      global.setTimeout(function () {
        global.setTimeout(function () { render(false); }, 30);
      }, 0);
    }

    var onRejection = function (e) {
      push("Uncaught (in promise): " + (e.reason && e.reason.message ? e.reason.message : e.reason));
      render(true);
    };
    global.addEventListener("unhandledrejection", onRejection);
    global.setTimeout(function () {
      global.removeEventListener("unhandledrejection", onRejection);
    }, 1500);

    try {
      var fn = new Function("console", "__tick", instrument(textarea.value));
      fn(fakeConsole, makeTicker());
      render(false);
      settle();
    } catch (err) {
      logs.push(err.name + ": " + err.message);
      render(true);
    }
  }

  global.createPlayground = createPlayground;

})(typeof window !== "undefined" ? window : this);
