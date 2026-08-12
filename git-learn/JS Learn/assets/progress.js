(function (global) {
  "use strict";

  var STORAGE_KEY = "jslearn-progress";

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function markComplete(lessonPath) {
    var data = getProgress();
    data[lessonPath] = { completed: true, date: new Date().toISOString() };
    saveProgress(data);
  }

  function isComplete(lessonPath) {
    var data = getProgress();
    return !!(data[lessonPath] && data[lessonPath].completed);
  }

  function clearProgress() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getCompletedPaths() {
    var data = getProgress();
    return Object.keys(data).filter(function (k) { return data[k].completed; });
  }

  // Render a "Mark complete" button at bottom of lesson pages
  function renderLessonButton() {
    var path = getCurrentLessonPath();
    if (!path) return;

    var existing = document.querySelector(".progress-mark-btn");
    if (existing) return;

    var wrap = document.querySelector(".page-wrap");
    if (!wrap) return;

    var div = document.createElement("div");
    div.style.cssText = "margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--gray-200);text-align:center;";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "progress-mark-btn";

    if (isComplete(path)) {
      btn.textContent = "✓ Completed";
      btn.classList.add("completed");
      btn.disabled = true;
    } else {
      btn.textContent = "Mark as Complete";
      btn.addEventListener("click", function () {
        markComplete(path);
        btn.textContent = "✓ Completed";
        btn.classList.add("completed");
        btn.disabled = true;
      });
    }

    div.appendChild(btn);
    wrap.appendChild(div);
  }

  // Render progress bar on README.html pages
  function renderModuleProgress() {
    var path = window.location.pathname.replace(/\\/g, "/");
    if (!path.match(/README\.html$/i)) return;

    var links = document.querySelectorAll("a[href]");
    var lessonLinks = [];
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      if (href && href.match(/^\.\/(00\d+.*\.html)$/)) {
        lessonLinks.push(href.replace("./", ""));
      }
    });

    if (lessonLinks.length === 0) return;

    var modulePath = path.replace(/README\.html$/i, "").replace(/.*modules\//, "modules/");
    var completed = 0;
    lessonLinks.forEach(function (lesson) {
      var full = modulePath + lesson;
      if (isComplete(full) || isComplete(lesson)) completed++;
    });

    var pct = Math.round((completed / lessonLinks.length) * 100);

    var bar = document.createElement("div");
    bar.className = "progress-bar-wrap";
    bar.innerHTML =
      '<div class="progress-bar-label">' + completed + ' / ' + lessonLinks.length + ' lessons complete (' + pct + '%)</div>' +
      '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>';

    var wrap = document.querySelector(".page-wrap");
    if (wrap && wrap.firstElementChild) {
      wrap.insertBefore(bar, wrap.children[2] || null);
    }
  }

  // Render overall progress on index.html
  function renderOverallProgress() {
    var el = document.getElementById("overall-progress");
    if (!el) return;

    fetch("./assets/search-index.json")
      .then(function (r) { return r.json(); })
      .then(function (index) { renderProgressWithTotal(el, index.length); })
      .catch(function () { renderProgressWithTotal(el, 140); });
  }

  function renderProgressWithTotal(el, total) {
    var completed = getCompletedPaths();

    var pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    var lastPath = "";
    var data = getProgress();
    var latestDate = "";
    Object.keys(data).forEach(function (k) {
      if (data[k].completed && data[k].date > latestDate) {
        latestDate = data[k].date;
        lastPath = k;
      }
    });

    var html =
      '<div class="progress-bar-wrap">' +
        '<div class="progress-bar-label">Overall: ' + completed.length + ' / ' + total + ' lessons (' + pct + '%)</div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';

    if (lastPath) {
      html += '<p style="font-size:0.88rem;margin-top:0.5rem;"><a href="./' + lastPath + '">Resume where you left off →</a></p>';
    }

    html += '<p style="margin-top:0.75rem;"><button type="button" class="progress-export-btn" id="progress-export">Export Progress</button> ' +
            '<button type="button" class="progress-clear-btn" id="progress-clear">Clear Progress</button></p>';

    el.innerHTML = html;

    document.getElementById("progress-export").addEventListener("click", function () {
      var json = JSON.stringify(getProgress(), null, 2);
      navigator.clipboard.writeText(json).then(function () {
        alert("Progress JSON copied to clipboard.");
      });
    });

    document.getElementById("progress-clear").addEventListener("click", function () {
      if (confirm("Clear all progress? This cannot be undone.")) {
        clearProgress();
        location.reload();
      }
    });
  }

  function getCurrentLessonPath() {
    var path = window.location.pathname.replace(/\\/g, "/");
    var match = path.match(/(modules\/[^/]+\/\d{4}[^/]*\.html)$/i);
    return match ? match[1] : null;
  }

  // Auto-run on DOMContentLoaded
  function init() {
    renderLessonButton();
    renderModuleProgress();
    renderOverallProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose API
  global.markComplete = markComplete;
  global.isComplete = isComplete;
  global.clearProgress = clearProgress;

})(typeof window !== "undefined" ? window : this);
