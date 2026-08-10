(function (global) {
  "use strict";

  function createSolution(containerId, config) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createSolution: No element with id '" + containerId + "'");
      return;
    }

    container.innerHTML = "";
    container.className = "solution-block";

    // Exercise prompt
    var exerciseDiv = document.createElement("div");
    exerciseDiv.className = "solution-exercise";
    var exerciseTitle = document.createElement("div");
    exerciseTitle.className = "solution-exercise-title";
    exerciseTitle.textContent = "Exercise";
    exerciseDiv.appendChild(exerciseTitle);
    var exerciseText = document.createElement("p");
    exerciseText.innerHTML = config.exercise;
    exerciseDiv.appendChild(exerciseText);
    container.appendChild(exerciseDiv);

    // Hints (optional)
    if (config.hints && config.hints.length > 0) {
      var hintsWrapper = document.createElement("div");
      hintsWrapper.className = "solution-hints-wrapper";

      config.hints.forEach(function (hint, i) {
        var hintBtn = document.createElement("button");
        hintBtn.type = "button";
        hintBtn.className = "solution-hint-btn";
        hintBtn.textContent = "Hint " + (i + 1);
        hintBtn.addEventListener("click", function () {
          var content = this.nextElementSibling;
          var isVisible = content.style.display === "block";
          content.style.display = isVisible ? "none" : "block";
          this.classList.toggle("active", !isVisible);
        });
        hintsWrapper.appendChild(hintBtn);

        var hintContent = document.createElement("div");
        hintContent.className = "solution-hint-content";
        hintContent.style.display = "none";
        hintContent.innerHTML = "<p>" + hint + "</p>";
        hintsWrapper.appendChild(hintContent);
      });

      container.appendChild(hintsWrapper);
    }

    // Solution reveal
    var revealBtn = document.createElement("button");
    revealBtn.type = "button";
    revealBtn.className = "solution-reveal-btn";
    revealBtn.textContent = "Show Solution";
    revealBtn.addEventListener("click", function () {
      var isVisible = solutionDiv.style.display === "block";
      solutionDiv.style.display = isVisible ? "none" : "block";
      revealBtn.textContent = isVisible ? "Show Solution" : "Hide Solution";
      revealBtn.classList.toggle("active", !isVisible);
    });
    container.appendChild(revealBtn);

    var solutionDiv = document.createElement("div");
    solutionDiv.className = "solution-code";
    solutionDiv.style.display = "none";
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.textContent = config.solution;
    pre.appendChild(code);
    solutionDiv.appendChild(pre);
    container.appendChild(solutionDiv);
  }

  global.createSolution = createSolution;

})(typeof window !== "undefined" ? window : this);
