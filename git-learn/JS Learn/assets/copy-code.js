(function () {
  "use strict";

  function addCopyButtons() {
    var blocks = document.querySelectorAll("pre");
    blocks.forEach(function (pre) {
      var wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Copy";
      btn.className = "copy-btn";
      btn.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = (code || pre).textContent;
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "✓";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 1500);
        });
      });
      wrapper.appendChild(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addCopyButtons);
  } else {
    addCopyButtons();
  }
})();
