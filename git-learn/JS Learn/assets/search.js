(function () {
  "use strict";

  function initSearch() {
    var container = document.getElementById("search-box");
    if (!container) return;

    container.innerHTML = "";
    container.className = "search-widget";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "search-input";
    input.placeholder = "Search lessons…";

    var results = document.createElement("div");
    results.className = "search-results";
    results.style.display = "none";

    container.appendChild(input);
    container.appendChild(results);

    var index = null;

    fetch("./assets/search-index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { index = data; })
      .catch(function () { index = []; });

    input.addEventListener("input", function () {
      if (!index) { results.style.display = "none"; return; }

      var query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        results.style.display = "none";
        return;
      }

      var matches = index.filter(function (entry) {
        var haystack = (entry.title + " " + entry.module + " " + (entry.keywords || "")).toLowerCase();
        return query.split(/\s+/).every(function (word) {
          return haystack.indexOf(word) !== -1;
        });
      });

      if (matches.length === 0) {
        results.innerHTML = '<div class="search-no-results">No results found.</div>';
      } else {
        results.innerHTML = matches.map(function (m) {
          return '<a class="search-result-item" href="' + m.path + '">' +
            '<span class="search-result-title">' + escapeHtml(m.title) + '</span>' +
            '<span class="search-result-module">' + escapeHtml(m.module) + '</span>' +
          '</a>';
        }).join("");
      }
      results.style.display = "block";
    });

    input.addEventListener("blur", function () {
      setTimeout(function () { results.style.display = "none"; }, 200);
    });
    input.addEventListener("focus", function () {
      if (input.value.trim().length >= 2) results.style.display = "block";
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSearch);
  } else {
    initSearch();
  }
})();
