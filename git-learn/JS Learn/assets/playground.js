(function (global) {
  "use strict";

  /**
   * createPlayground(containerId, starterCode, options)
   *
   * options.dom   — run the code against a sandboxed in-memory document
   *                 instead of the real page, and show the resulting markup
   *                 in a preview pane. Requires assets/dom-sandbox.js.
   * options.html  — starting contents of the sandbox's <body>.
   */
  function createPlayground(containerId, starterCode, options) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createPlayground: No element with id '" + containerId + "'");
      return;
    }

    starterCode = starterCode || "";
    options = options || {};

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
    runBtn.addEventListener("click", function () {
      runCode(textarea, output, options, preview);
    });

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "playground-reset";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", function () {
      cancelPendingRenders(output);
      textarea.value = starterCode;
      output.textContent = "";
      output.className = "playground-output";
      if (preview) preview.body.textContent = formatHTML(options.html || "");
    });

    toolbar.appendChild(runBtn);
    toolbar.appendChild(resetBtn);
    container.appendChild(toolbar);

    /* The DOM preview sits above the console output, because in a DOM lesson
       the page is the result and the logs are the commentary. */
    var preview = null;
    if (options.dom) {
      preview = buildPreview(options.html || "");
      container.appendChild(preview.wrap);
    }

    var output = document.createElement("pre");
    output.className = "playground-output";
    container.appendChild(output);
  }

  /* The preview shows the sandbox's markup as TEXT. It must never be assigned
     with innerHTML — that would build real elements out of student code and
     reintroduce exactly the problem the sandbox exists to prevent. */
  function buildPreview(initialHTML) {
    var wrap = document.createElement("div");
    wrap.className = "playground-preview";

    var label = document.createElement("div");
    label.className = "playground-preview-label";
    label.textContent = "document.body";
    wrap.appendChild(label);

    var body = document.createElement("pre");
    body.className = "playground-preview-body";
    body.textContent = formatHTML(initialHTML);
    wrap.appendChild(body);

    return { wrap: wrap, body: body };
  }

  /* Indent one tag per line so the tree is readable. Text nodes stay on the
     line of the tag that contains them when they are the only child. */
  function formatHTML(html) {
    if (!html) return "(empty)";
    var parts = String(html).split(/(<[^>]+>)/).filter(function (p) {
      return p !== "" && !/^\s+$/.test(p);
    });
    var out = [];
    var depth = 0;
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      var isClose = /^<\//.test(part);
      var isOpen = /^<[^/!]/.test(part) && !/\/>$/.test(part) &&
                   !/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(part);
      if (isClose) depth = Math.max(0, depth - 1);

      /* <p>text</p> reads better on one line than spread over three. */
      if (isOpen && parts[i + 1] && !/^</.test(parts[i + 1].trim()) &&
          parts[i + 2] && /^<\//.test(parts[i + 2].trim())) {
        out.push(new Array(depth + 1).join("  ") + part + parts[i + 1].trim() + parts[i + 2].trim());
        i += 2;
        continue;
      }
      out.push(new Array(depth + 1).join("  ") + part);
      if (isOpen) depth++;
    }
    return out.join("\n") || "(empty)";
  }

  /* Time budget for a single Run, in milliseconds. A runaway loop is stopped
     rather than hanging the tab — students meet `while (true)` in lesson
     01/0005, and a frozen browser teaches nothing. */
  var TIME_BUDGET_MS = 2000;

  /* A runaway loop that logs on every pass produces millions of lines long
     before the clock runs out. Rendering those would freeze the tab even
     though execution was stopped — so output is capped too, and hitting the
     cap ends the run. Measured: an unguarded logging loop reached 17.6M
     iterations in 5.5s. */
  var MAX_OUTPUT_LINES = 1000;

  function TooMuchOutput() {}

  /* Wall-clock guard, called once per loop iteration by instrumented code. */
  function makeTicker() {
    var deadline = Date.now() + TIME_BUDGET_MS;
    var n = 0;
    return function () {
      /* Check every 256 iterations. Date.now() in a hot loop costs enough to
         matter, but checking too rarely lets a slow body overshoot badly. */
      if ((++n & 255) === 0 && Date.now() > deadline) {
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

  /* Renders from a previous Run are still queued when the student presses Run
     again. Left alone they fire against the new run's output element and
     redraw the old logs over the new ones. */
  function cancelPendingRenders(output) {
    if (!output.__renderTimers) return;
    output.__renderTimers.forEach(function (id) { global.clearTimeout(id); });
    output.__renderTimers = null;
  }

  function runCode(textarea, output, options, preview) {
    options = options || {};
    cancelPendingRenders(output);
    output.textContent = "";
    output.className = "playground-output";

    var logs = [];
    var truncated = false;
    function push() {
      if (logs.length >= MAX_OUTPUT_LINES) {
        if (!truncated) {
          truncated = true;
          logs.push(
            "... stopped after " + MAX_OUTPUT_LINES + " lines. A loop is " +
            "printing far more than you meant it to — check its exit condition."
          );
        }
        throw new TooMuchOutput();
      }
      var args = Array.prototype.slice.call(arguments);
      logs.push(args.map(function (a) {
        /* Sandbox nodes print as their markup, the way a browser console shows
           an element. JSON.stringify would either throw on the parentNode
           cycle or dump the internals of a detached one. */
        if (a && a.__isDomNode) return String(a);
        if (typeof a === "object" && a !== null) {
          try { return JSON.stringify(a, null, 2); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(" "));
    }
    var fakeConsole = { log: push, warn: push, info: push, error: push, debug: push };

    /* Sticky: a later re-render must not clear the red from an error that
       already happened, and async failures arrive after the first render. */
    var hasFailed = false;

    function render(failed) {
      if (failed) hasFailed = true;
      output.textContent = logs.join("\n") || "(no output)";
      output.className = "playground-output" + (hasFailed ? " playground-error" : "");
    }

    /* Async code resolves in a microtask or a timer, so reading `logs`
       immediately after the call reports "(no output)" — .then() and await
       both looked broken.
       Rendering once after ~30ms fixed the immediate case but not a promise
       that resolves on a timer: `await wait(300)` still printed nothing, while
       verify-lesson.mjs drained its whole timer queue and saw the output. The
       verifier and the browser disagreeing about a lesson is the failure mode
       all of this is built to avoid, so the browser now keeps re-rendering
       across the same budget the loop guard uses. */
    var RENDER_AT_MS = [0, 30, 100, 250, 500, 1000, 1500, TIME_BUDGET_MS];

    function settle() {
      cancelPendingRenders(output);
      output.__renderTimers = RENDER_AT_MS.map(function (delay) {
        return global.setTimeout(function () {
          /* A timer callback can also touch the DOM — a "sending…" row
             flipping to "sent" — so the preview refreshes here too. */
          updatePreview();
          render(false);
        }, delay);
      });
    }

    var onRejection = function (e) {
      push("Uncaught (in promise): " + (e.reason && e.reason.message ? e.reason.message : e.reason));
      render(true);
    };
    global.addEventListener("unhandledrejection", onRejection);
    global.setTimeout(function () {
      global.removeEventListener("unhandledrejection", onRejection);
    }, 1500);

    /* A DOM playground gets a fresh sandbox on every Run, so a student can
       press Run twice without the second run inheriting the first's leftovers.
       `document`, `window` and `localStorage` are passed as parameters, which
       shadows the real ones inside the function body — that is what keeps
       `document.body.innerHTML = ""` and `localStorage.clear()` from reaching
       the lesson page and the student's saved progress. */
    var sandbox = null;
    if (options.dom) {
      if (typeof global.createDomSandbox !== "function") {
        logs.push(
          "This playground needs the DOM sandbox, which has not loaded. " +
          "The lesson must include <script src=\"../../assets/dom-sandbox.js\"><\/script> " +
          "before playground.js."
        );
        render(true);
        return;
      }
      sandbox = global.createDomSandbox(options.html || "");
    }

    function updatePreview() {
      if (preview && sandbox) preview.body.textContent = formatHTML(sandbox.serialize());
    }

    try {
      var body = instrument(textarea.value);
      var fn = sandbox
        ? new Function("console", "__tick", "document", "window", "localStorage", "Event", body)
        : new Function("console", "__tick", body);

      if (sandbox) {
        fn(fakeConsole, makeTicker(), sandbox.document, sandbox.window,
           sandbox.localStorage, sandbox.Event);
      } else {
        fn(fakeConsole, makeTicker());
      }

      updatePreview();
      render(false);
      settle();
    } catch (err) {
      /* Show the DOM as far as it got. Half-built markup is the most useful
         thing on screen when an exception lands mid-way through building it. */
      updatePreview();
      /* The output cap unwinds via a sentinel — the message is already in
         logs, so it must not be reported as a crash on top of that. */
      if (!(err instanceof TooMuchOutput)) logs.push(err.name + ": " + err.message);
      render(true);
    }
  }

  global.createPlayground = createPlayground;

})(typeof window !== "undefined" ? window : this);
