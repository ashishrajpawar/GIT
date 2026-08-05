/**
 * quiz.js — Reusable interactive quiz widget
 * JS Learn workspace
 *
 * Usage:
 *   createQuiz("my-container-id", [
 *     {
 *       question: "What does `let` do?",
 *       options: ["Declares a constant", "Declares a variable that can change", "Runs a function", "Prints output"],
 *       correct: 1,
 *       explanation: "`let` declares a variable whose value you are allowed to change later."
 *     },
 *     ...
 *   ]);
 *
 * The container element must exist in the DOM before calling createQuiz().
 * Load this file with: <script src="../assets/quiz.js"></script>
 */

(function (global) {
  "use strict";

  /**
   * createQuiz
   * @param {string} containerId - The id of the element to render into
   * @param {Array}  questions   - Array of question objects
   */
  function createQuiz(containerId, questions) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createQuiz: No element found with id '" + containerId + "'");
      return;
    }

    // State
    var answered = new Array(questions.length).fill(false);
    var correct  = new Array(questions.length).fill(false);

    // Render skeleton
    container.innerHTML = "";
    container.className = "quiz";

    var heading = document.createElement("h2");
    heading.textContent = "Quick Check";
    container.appendChild(heading);

    var intro = document.createElement("p");
    intro.style.cssText = "font-size:0.9rem;color:var(--gray-500);margin-bottom:1.5rem;margin-top:-0.25rem;";
    intro.textContent = "Answer each question — you'll get instant feedback.";
    container.appendChild(intro);

    // Build each question
    questions.forEach(function (q, index) {
      var block = document.createElement("div");
      block.className = "quiz-question-block";
      block.id = containerId + "-q-" + index;

      // Question number + text
      var qText = document.createElement("p");
      qText.className = "quiz-question-text";
      qText.innerHTML =
        "<span style='color:var(--color-primary);font-size:0.8rem;font-weight:700;" +
        "text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:0.3rem;'>" +
        "Question " + (index + 1) + " of " + questions.length +
        "</span>" + escapeHtml(q.question);
      block.appendChild(qText);

      // Options container
      var optionsDiv = document.createElement("div");
      optionsDiv.className = "quiz-options";

      q.options.forEach(function (optionText, optIndex) {
        var btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.type = "button";
        btn.textContent = optionText;
        btn.dataset.questionIndex = index;
        btn.dataset.optionIndex   = optIndex;

        btn.addEventListener("click", function () {
          handleAnswer(index, optIndex, q, optionsDiv, feedbackDiv, scoreDiv, answered, correct, questions);
        });

        optionsDiv.appendChild(btn);
      });

      block.appendChild(optionsDiv);

      // Feedback area
      var feedbackDiv = document.createElement("div");
      feedbackDiv.className = "feedback";
      feedbackDiv.style.display = "none";
      block.appendChild(feedbackDiv);

      container.appendChild(block);
    });

    // Score area
    var scoreDiv = document.createElement("div");
    scoreDiv.className = "quiz-score";
    scoreDiv.id = containerId + "-score";
    container.appendChild(scoreDiv);

    // Expose scoreDiv on container for the handler
    container._scoreDiv  = scoreDiv;
    container._answered  = answered;
    container._correct   = correct;
    container._total     = questions.length;
  }

  /* ---- Internal helpers ---- */

  function handleAnswer(qIndex, chosenIndex, q, optionsDiv, feedbackDiv, scoreDiv, answered, correct, questions) {
    // Prevent re-answering
    if (answered[qIndex]) return;
    answered[qIndex] = true;

    var isCorrect = (chosenIndex === q.correct);
    correct[qIndex] = isCorrect;

    // Disable all buttons in this question
    var buttons = optionsDiv.querySelectorAll(".quiz-option");
    buttons.forEach(function (btn, idx) {
      btn.disabled = true;
      if (idx === q.correct) {
        btn.classList.add("reveal-correct");
      }
    });

    // Mark chosen button
    var chosenBtn = buttons[chosenIndex];
    if (isCorrect) {
      chosenBtn.classList.add("correct");
    } else {
      chosenBtn.classList.add("incorrect");
    }

    // Show feedback
    feedbackDiv.style.display = "block";
    if (isCorrect) {
      feedbackDiv.className = "feedback correct";
      feedbackDiv.innerHTML = "<strong>Correct!</strong> " + escapeHtml(q.explanation);
    } else {
      feedbackDiv.className = "feedback incorrect";
      feedbackDiv.innerHTML =
        "<strong>Not quite.</strong> The correct answer is: <strong>" +
        escapeHtml(q.options[q.correct]) + "</strong>. " +
        escapeHtml(q.explanation);
    }

    // Check if all answered
    var allAnswered = answered.every(function (a) { return a; });
    if (allAnswered) {
      showScore(scoreDiv, correct, questions.length);
    }
  }

  function showScore(scoreDiv, correct, total) {
    var score = correct.filter(function (c) { return c; }).length;
    var pct   = Math.round((score / total) * 100);

    var emoji = pct === 100 ? "Perfect!" :
                pct >= 80  ? "Great work!" :
                pct >= 60  ? "Good effort!" :
                             "Keep going — you'll get there!";

    scoreDiv.style.display = "block";
    scoreDiv.innerHTML =
      "Your score: <strong>" + score + " / " + total + "</strong>" +
      " (" + pct + "%) &mdash; " + emoji;

    // Scroll the score into view
    scoreDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;")
      .replace(/'/g,  "&#39;");
  }

  // Expose globally
  global.createQuiz = createQuiz;

})(typeof window !== "undefined" ? window : this);
