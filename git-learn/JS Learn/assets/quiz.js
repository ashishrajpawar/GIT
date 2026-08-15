/**
 * quiz.js — Reusable interactive quiz widget
 * JS Learn workspace
 *
 * Supports question types:
 *   - (default) multiple-choice: { question, options, correct, explanation }
 *   - predict-output: { type:"predict-output", code, answer, explanation }
 *   - spot-the-bug:  { type:"spot-the-bug", code, bugLine, options, correct, explanation }
 *   - fill-blank:    { type:"fill-blank", code, answer, explanation }
 *   - which-breaks:  { type:"which-breaks", variants, correct, explanation }
 *   - order-steps:   { type:"order-steps", steps, correctOrder, explanation }
 */

(function (global) {
  "use strict";

  function createQuiz(containerId, questions) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createQuiz: No element found with id '" + containerId + "'");
      return;
    }

    var answered = new Array(questions.length).fill(false);
    var correct  = new Array(questions.length).fill(false);

    container.innerHTML = "";
    container.className = "quiz";

    var heading = document.createElement("h2");
    heading.textContent = "Quick Check";
    container.appendChild(heading);

    var intro = document.createElement("p");
    intro.style.cssText = "font-size:0.9rem;color:var(--gray-500);margin-bottom:1.5rem;margin-top:-0.25rem;";
    intro.textContent = "Answer each question — you'll get instant feedback.";
    container.appendChild(intro);

    questions.forEach(function (q, index) {
      var block = document.createElement("div");
      block.className = "quiz-question-block";
      block.id = containerId + "-q-" + index;

      var qText = document.createElement("p");
      qText.className = "quiz-question-text";

      var type = q.type || "multiple-choice";

      qText.innerHTML =
        "<span style='color:var(--color-primary);font-size:0.8rem;font-weight:700;" +
        "text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:0.3rem;'>" +
        "Question " + (index + 1) + " of " + questions.length +
        "</span>" + escapeHtml(q.question || typeLabel(type));
      block.appendChild(qText);

      var feedbackDiv = document.createElement("div");
      feedbackDiv.className = "feedback";
      feedbackDiv.style.display = "none";

      switch (type) {
        case "predict-output":
          renderPredictOutput(block, q, index, feedbackDiv, answered, correct, questions, containerId);
          break;
        case "spot-the-bug":
          renderSpotTheBug(block, q, index, feedbackDiv, answered, correct, questions, containerId);
          break;
        case "fill-blank":
          renderFillBlank(block, q, index, feedbackDiv, answered, correct, questions, containerId);
          break;
        case "which-breaks":
          renderWhichBreaks(block, q, index, feedbackDiv, answered, correct, questions, containerId);
          break;
        case "order-steps":
          renderOrderSteps(block, q, index, feedbackDiv, answered, correct, questions, containerId);
          break;
        default:
          renderMultipleChoice(block, q, index, feedbackDiv, answered, correct, questions, containerId);
      }

      block.appendChild(feedbackDiv);
      container.appendChild(block);
    });

    var scoreDiv = document.createElement("div");
    scoreDiv.className = "quiz-score";
    scoreDiv.id = containerId + "-score";
    container.appendChild(scoreDiv);

    container._scoreDiv = scoreDiv;
    container._answered = answered;
    container._correct  = correct;
    container._total    = questions.length;
  }

  /* ---- Multiple choice (original) ---- */

  function renderMultipleChoice(block, q, index, feedbackDiv, answered, correct, questions, containerId) {
    var optionsDiv = document.createElement("div");
    optionsDiv.className = "quiz-options";

    var __order = optionDisplayOrder(q, q.options);
    __order.forEach(function (optIndex, __display) {
      var optionText = q.options[optIndex];
      var btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.type = "button";
      btn.textContent = optionText;

      btn.addEventListener("click", function () {
        if (answered[index]) return;
        answered[index] = true;

        var isCorrect = (optIndex === q.correct);
        correct[index] = isCorrect;

        var buttons = optionsDiv.querySelectorAll(".quiz-option");
        buttons.forEach(function (b, idx) {
          b.disabled = true;
          if (__order[idx] === q.correct) b.classList.add("reveal-correct");
        });

        if (isCorrect) {
          btn.classList.add("correct");
        } else {
          btn.classList.add("incorrect");
        }

        showFeedback(feedbackDiv, isCorrect, q.explanation, isCorrect ? null : q.options[q.correct]);
        checkAllAnswered(answered, correct, questions, containerId);
      });

      optionsDiv.appendChild(btn);
    });

    block.appendChild(optionsDiv);
  }

  /* ---- Predict Output ---- */

  function renderPredictOutput(block, q, index, feedbackDiv, answered, correct, questions, containerId) {
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.textContent = q.code;
    pre.appendChild(code);
    block.appendChild(pre);

    var label = document.createElement("p");
    label.style.cssText = "font-size:0.9rem;color:var(--gray-700);margin:0.5rem 0 0.3rem;";
    label.textContent = "What does this print?";
    block.appendChild(label);

    var inputRow = document.createElement("div");
    inputRow.className = "quiz-input-row";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "quiz-text-input";
    input.placeholder = "Type your answer…";

    var submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "quiz-submit-btn";
    submitBtn.textContent = "Check";

    submitBtn.addEventListener("click", function () {
      if (answered[index]) return;
      answered[index] = true;

      var userAnswer = input.value.trim();
      var isCorrect = userAnswer === String(q.answer).trim();
      correct[index] = isCorrect;

      input.disabled = true;
      submitBtn.disabled = true;
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");

      showFeedback(feedbackDiv, isCorrect, q.explanation, isCorrect ? null : "Expected: " + q.answer);
      checkAllAnswered(answered, correct, questions, containerId);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitBtn.click();
    });

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    block.appendChild(inputRow);
  }

  /* ---- Spot the Bug ---- */

  function renderSpotTheBug(block, q, index, feedbackDiv, answered, correct, questions, containerId) {
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.textContent = q.code;
    pre.appendChild(code);
    block.appendChild(pre);

    var label = document.createElement("p");
    label.style.cssText = "font-size:0.9rem;color:var(--gray-700);margin:0.5rem 0 0.3rem;";
    label.textContent = "Where is the bug?";
    block.appendChild(label);

    var optionsDiv = document.createElement("div");
    optionsDiv.className = "quiz-options";

    var __order = optionDisplayOrder(q, q.options);
    __order.forEach(function (optIndex, __display) {
      var optionText = q.options[optIndex];
      var btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.type = "button";
      btn.textContent = optionText;

      btn.addEventListener("click", function () {
        if (answered[index]) return;
        answered[index] = true;

        var isCorrect = (optIndex === q.correct);
        correct[index] = isCorrect;

        var buttons = optionsDiv.querySelectorAll(".quiz-option");
        buttons.forEach(function (b, idx) {
          b.disabled = true;
          if (__order[idx] === q.correct) b.classList.add("reveal-correct");
        });

        if (isCorrect) {
          btn.classList.add("correct");
        } else {
          btn.classList.add("incorrect");
        }

        showFeedback(feedbackDiv, isCorrect, q.explanation, isCorrect ? null : q.options[q.correct]);
        checkAllAnswered(answered, correct, questions, containerId);
      });

      optionsDiv.appendChild(btn);
    });

    block.appendChild(optionsDiv);
  }

  /* ---- Fill in the Blank ---- */

  function renderFillBlank(block, q, index, feedbackDiv, answered, correct, questions, containerId) {
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.textContent = q.code;
    pre.appendChild(code);
    block.appendChild(pre);

    var label = document.createElement("p");
    label.style.cssText = "font-size:0.9rem;color:var(--gray-700);margin:0.5rem 0 0.3rem;";
    label.textContent = "Replace ___ with the correct code:";
    block.appendChild(label);

    var inputRow = document.createElement("div");
    inputRow.className = "quiz-input-row";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "quiz-text-input";
    input.placeholder = "Fill in the blank…";

    var submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "quiz-submit-btn";
    submitBtn.textContent = "Check";

    submitBtn.addEventListener("click", function () {
      if (answered[index]) return;
      answered[index] = true;

      var userAnswer = input.value.trim();
      var expected = String(q.answer).trim();
      var isCorrect = userAnswer === expected || userAnswer.replace(/[;\s]/g, "") === expected.replace(/[;\s]/g, "");
      correct[index] = isCorrect;

      input.disabled = true;
      submitBtn.disabled = true;
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");

      showFeedback(feedbackDiv, isCorrect, q.explanation, isCorrect ? null : "Answer: " + q.answer);
      checkAllAnswered(answered, correct, questions, containerId);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitBtn.click();
    });

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    block.appendChild(inputRow);
  }

  /* ---- Which Breaks ---- */

  function renderWhichBreaks(block, q, index, feedbackDiv, answered, correct, questions, containerId) {
    var optionsDiv = document.createElement("div");
    optionsDiv.className = "quiz-options";

    var __order = optionDisplayOrder(q, q.variants);
    __order.forEach(function (optIndex, __display) {
      var variant = q.variants[optIndex];
      var btn = document.createElement("button");
      btn.className = "quiz-option quiz-option-code";
      btn.type = "button";

      var codeEl = document.createElement("code");
      codeEl.textContent = variant;
      btn.appendChild(codeEl);

      btn.addEventListener("click", function () {
        if (answered[index]) return;
        answered[index] = true;

        var isCorrect = (optIndex === q.correct);
        correct[index] = isCorrect;

        var buttons = optionsDiv.querySelectorAll(".quiz-option");
        buttons.forEach(function (b, idx) {
          b.disabled = true;
          if (__order[idx] === q.correct) b.classList.add("reveal-correct");
        });

        if (isCorrect) {
          btn.classList.add("correct");
        } else {
          btn.classList.add("incorrect");
        }

        showFeedback(feedbackDiv, isCorrect, q.explanation, null);
        checkAllAnswered(answered, correct, questions, containerId);
      });

      optionsDiv.appendChild(btn);
    });

    block.appendChild(optionsDiv);
  }

  /* ---- Order Steps ---- */

  function renderOrderSteps(block, q, index, feedbackDiv, answered, correct, questions, containerId) {
    var selected = [];
    var stepsDiv = document.createElement("div");
    stepsDiv.className = "quiz-order-steps";

    var orderDisplay = document.createElement("div");
    orderDisplay.className = "quiz-order-display";
    orderDisplay.innerHTML = '<span class="quiz-order-placeholder">Click steps in the correct order…</span>';

    // Buttons are shown in a shuffled order. Almost every lesson authors
    // `steps` already in the correct sequence with correctOrder [0,1,2,…],
    // so rendering in array order gave the answer away. The button keeps its
    // ORIGINAL index in dataset.stepIndex, so correctOrder still means the
    // same thing whichever way the lesson authored it.
    shuffledIndexes(q.steps.length, q.correctOrder).forEach(function (stepIndex) {
      var step = q.steps[stepIndex];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option quiz-step-btn";
      btn.textContent = step;
      btn.dataset.stepIndex = stepIndex;

      btn.addEventListener("click", function () {
        if (answered[index]) return;
        if (btn.disabled) return;

        selected.push(stepIndex);
        btn.disabled = true;
        btn.classList.add("step-selected");

        updateOrderDisplay(orderDisplay, selected, q.steps);

        if (selected.length === q.steps.length) {
          answered[index] = true;
          var isCorrect = arraysEqual(selected, q.correctOrder);
          correct[index] = isCorrect;

          showFeedback(feedbackDiv, isCorrect, q.explanation,
            isCorrect ? null : "Correct order: " + q.correctOrder.map(function (i) { return q.steps[i]; }).join(" → "));
          checkAllAnswered(answered, correct, questions, containerId);
        }
      });

      stepsDiv.appendChild(btn);
    });

    block.appendChild(orderDisplay);
    block.appendChild(stepsDiv);
  }

  /* Fisher-Yates over [0..n-1]. `avoid` is the sequence that must NOT come
     out — pass correctOrder, so the displayed order is never itself the
     answer. Retries are bounded; with n < 2 there is nothing to shuffle. */
  /* ---- Option ordering ----
     Correct answers were clustered hard: 63.6% sat at index 1, so always
     picking the second option scored ~64% without reading the question.
     Options are shuffled at render time and each button remembers its original
     index, so scoring against q.correct is unchanged and no lesson data moves.

     Two things must NOT be shuffled:
       - Options whose meaning depends on position ("All of the above",
         "Both A and B", "Neither") — these are pinned last.
       - Whole questions whose explanation names an option by letter
         ("Option A creates a label statement"). ~49 questions do this, almost
         always to explain why the WRONG options are wrong. Shuffling those
         would make the explanation contradict the screen, so they render in
         their authored order. Removing those references is follow-up work for
         the deepening pass, when the explanations are being rewritten anyway. */

  function explanationNamesAPosition(text) {
    return /\b(?:option|answer|choice)\s+[A-D]\b/i.test(text) ||
           /\bthe\s+(?:first|second|third|fourth|last)\s+(?:option|answer|choice|one)\b/i.test(text);
  }

  function isPositionPinned(text) {
    return /^(all of the above|none of the above|both\b|neither\b|any of the above|either\b)/i
      .test(String(text).trim());
  }

  function optionDisplayOrder(q, list) {
    var order = [];
    for (var i = 0; i < list.length; i++) order.push(i);
    if (list.length < 2) return order;
    if (explanationNamesAPosition(q.explanation || "")) return order;

    var pinned = [];
    var free = [];
    order.forEach(function (i) {
      (isPositionPinned(list[i]) ? pinned : free).push(i);
    });
    for (var j = free.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = free[j];
      free[j] = free[k];
      free[k] = tmp;
    }
    return free.concat(pinned);
  }

  function shuffledIndexes(n, avoid) {
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    if (n < 2) return order;

    for (var attempt = 0; attempt < 20; attempt++) {
      for (var j = n - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = order[j];
        order[j] = order[k];
        order[k] = tmp;
      }
      if (!avoid || !arraysEqual(order, avoid)) return order;
    }
    // Fell through 20 identical draws (vanishingly unlikely): swap the
    // first two so we never hand back the answer sequence.
    var first = order[0];
    order[0] = order[1];
    order[1] = first;
    return order;
  }

  function updateOrderDisplay(display, selected, steps) {
    display.innerHTML = selected.map(function (i, pos) {
      return '<span class="quiz-order-item">' + (pos + 1) + ". " + escapeHtml(steps[i]) + '</span>';
    }).join("");
  }

  /* ---- Shared helpers ---- */

  function showFeedback(feedbackDiv, isCorrect, explanation, wrongNote) {
    feedbackDiv.style.display = "block";
    if (isCorrect) {
      feedbackDiv.className = "feedback correct";
      feedbackDiv.innerHTML = "<strong>Correct!</strong> " + escapeHtml(explanation);
    } else {
      feedbackDiv.className = "feedback incorrect";
      var msg = "<strong>Not quite.</strong> ";
      if (wrongNote) msg += escapeHtml(wrongNote) + ". ";
      msg += escapeHtml(explanation);
      feedbackDiv.innerHTML = msg;
    }
  }

  function checkAllAnswered(answered, correct, questions, containerId) {
    var allDone = answered.every(function (a) { return a; });
    if (!allDone) return;

    var scoreDiv = document.getElementById(containerId + "-score");
    if (!scoreDiv) return;

    var score = correct.filter(function (c) { return c; }).length;
    var total = questions.length;
    var pct   = Math.round((score / total) * 100);

    var msg = pct === 100 ? "Perfect!" :
              pct >= 80  ? "Great work!" :
              pct >= 60  ? "Good effort!" :
                           "Keep going — you'll get there!";

    scoreDiv.style.display = "block";
    scoreDiv.innerHTML =
      "Your score: <strong>" + score + " / " + total + "</strong>" +
      " (" + pct + "%) &mdash; " + msg;
    scoreDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function typeLabel(type) {
    switch (type) {
      case "predict-output": return "What does this code print?";
      case "spot-the-bug":   return "Find the bug in this code:";
      case "fill-blank":     return "Fill in the blank:";
      case "which-breaks":   return "Which of these will fail?";
      case "order-steps":    return "Put these steps in the correct order:";
      default: return "";
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;")
      .replace(/'/g,  "&#39;");
  }

  global.createQuiz = createQuiz;

})(typeof window !== "undefined" ? window : this);
