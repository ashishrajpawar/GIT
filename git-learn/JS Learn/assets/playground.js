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

  function runCode(textarea, output) {
    output.textContent = "";
    output.className = "playground-output";

    var logs = [];
    var fakeConsole = {
      log: function () {
        var args = Array.prototype.slice.call(arguments);
        logs.push(args.map(function (a) {
          if (typeof a === "object") {
            try { return JSON.stringify(a, null, 2); } catch (e) { return String(a); }
          }
          return String(a);
        }).join(" "));
      }
    };
    fakeConsole.warn = fakeConsole.log;
    fakeConsole.info = fakeConsole.log;
    fakeConsole.error = fakeConsole.log;

    try {
      var fn = new Function("console", textarea.value);
      fn(fakeConsole);
      output.textContent = logs.join("\n") || "(no output)";
    } catch (err) {
      output.textContent = err.name + ": " + err.message;
      output.classList.add("playground-error");
    }
  }

  global.createPlayground = createPlayground;

})(typeof window !== "undefined" ? window : this);
