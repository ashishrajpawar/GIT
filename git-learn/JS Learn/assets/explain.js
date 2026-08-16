/* explain.js — "explain it in your own words", per lesson.
 *
 *   createExplain("explain-0006", {
 *     prompt: "Explain how a variable inside createIssuer() is still alive…"
 *   });
 *
 * WHY THIS EXISTS
 *
 * Every other component in the course checks recognition: a quiz offers four
 * answers, a self-check runs code the student already wrote. Recognition is
 * the easy half. Writing the idea out in a sentence is where you find out
 * whether it landed — and the sentence you cannot finish names the section to
 * re-read.
 *
 * So the answer is saved rather than thrown away. Coming back to a lesson and
 * reading what you wrote the first time is the point; it is also the only
 * record in this course of what the student actually understood, as opposed to
 * what they clicked.
 *
 * Storage matches progress.js: one key holding one JSON object, so a future
 * "you have written 7 of 13" needs no migration.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "jslearn-explain";

  /* Every read and write goes through these two. localStorage throws rather
     than returning null when a browser has storage disabled or the page is
     opened from a file:// URL under a strict profile — and a lesson that
     refuses to render because a note could not be saved is a worse lesson. */
  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Identifies this box: the lesson file plus the container, so two prompts
   *  on one page never overwrite each other. */
  function keyFor(containerId, config) {
    var lesson = config.lesson;
    if (!lesson) {
      var path = (global.location && global.location.pathname) || "";
      lesson = path.split("/").pop() || "lesson";
    }
    return lesson + "::" + containerId;
  }

  function formatSaved(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "saved";
    return "saved " + d.toLocaleDateString() + " at " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function createExplain(containerId, config) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createExplain: No element with id '" + containerId + "'");
      return;
    }
    config = config || {};

    var key = keyFor(containerId, config);

    container.innerHTML = "";
    container.className = "explain-block";

    var title = document.createElement("div");
    title.className = "explain-title";
    title.textContent = "Explain it in your own words";
    container.appendChild(title);

    var prompt = document.createElement("p");
    prompt.className = "explain-prompt";
    prompt.innerHTML = config.prompt || "";
    container.appendChild(prompt);

    var label = document.createElement("label");
    label.className = "explain-label";
    label.setAttribute("for", containerId + "-input");
    label.textContent = "Your answer — no marking, no right wording.";
    container.appendChild(label);

    var input = document.createElement("textarea");
    input.className = "explain-input";
    input.id = containerId + "-input";
    input.rows = 4;
    input.placeholder = "Write it as if the person listening has not read the lesson…";
    container.appendChild(input);

    var row = document.createElement("div");
    row.className = "explain-row";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "explain-save-btn";
    saveBtn.textContent = "Save";
    row.appendChild(saveBtn);

    var status = document.createElement("span");
    status.className = "explain-status";
    row.appendChild(status);

    container.appendChild(row);

    var note = document.createElement("p");
    note.className = "explain-note";
    note.textContent =
      "Stuck halfway through a sentence? That is the part to re-read — it is " +
      "the most useful thing this box does.";
    container.appendChild(note);

    /* Restore whatever was written last time. */
    var saved = readAll()[key];
    if (saved && saved.text) {
      input.value = saved.text;
      status.textContent = formatSaved(saved.savedAt);
    }

    saveBtn.addEventListener("click", function () {
      var text = String(input.value || "").trim();
      var all = readAll();

      if (text === "") {
        /* The box was deliberately emptied — honour it rather than leaving a
           stale answer behind the scenes. */
        delete all[key];
        status.textContent = writeAll(all) ? "Cleared." : "Could not save — storage is unavailable.";
        return;
      }

      all[key] = { text: text, savedAt: new Date().toISOString() };
      status.textContent = writeAll(all)
        ? "Saved. It will be here when you come back."
        : "Could not save — storage is unavailable in this browser.";
    });
  }

  /** How many prompts have been answered. Nothing in the course reads this
   *  yet; it exists so the count can be shown without changing the format. */
  createExplain.count = function () {
    return Object.keys(readAll()).length;
  };

  global.createExplain = createExplain;

})(typeof window !== "undefined" ? window : this);
