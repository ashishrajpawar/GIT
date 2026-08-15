/* Wrong-answer cases for 01/0008-events.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0008-events.html \
 *        --wrong scripts/cases/0008-events.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The two mistakes worth the most here are "loops over the buttons" and
 * "matches instead of closest": both look completely fine against the rows
 * already on the page, and only break on the cases the exercise is about.
 */

export const alternatives = {
  "arrow handler, row looked up first": `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", (event) => {
    const row = event.target.closest(".token-row");
    if (!row) return;
    const button = event.target.closest(".revoke-btn");
    if (!button) return;
    row.classList.add("revoked");
    button.querySelector(".label").textContent = "Revoked";
    onRevoke(row.dataset.tokenCode);
  });
}`,

  "replaces the button text outright instead of the label span": `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    const button = event.target.closest(".revoke-btn");
    if (button === null) return;
    const row = button.closest(".token-row");
    row.classList.add("revoked");
    button.textContent = "Revoked";
    onRevoke(row.dataset.tokenCode);
  });
}`,

  "uses getAttribute instead of dataset": `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    if (!event.target.closest(".revoke-btn")) {
      return;
    }
    const row = event.target.closest(".token-row");
    row.className = row.className + " revoked";
    event.target.closest(".revoke-btn").querySelector(".label").textContent = "Revoked";
    onRevoke(row.getAttribute("data-token-code"));
  });
}`,

  "named handler declared separately": `function setupTokenActions(listEl, onRevoke) {
  function handleListClick(event) {
    const button = event.target.closest(".revoke-btn");
    if (button === null) { return; }
    const row = button.closest(".token-row");
    if (row === null) { return; }
    row.classList.add("revoked");
    const label = button.querySelector(".label");
    label.textContent = "Revoked";
    onRevoke(row.dataset.tokenCode);
  }
  listEl.addEventListener("click", handleListClick);
}`
};

export const mistakes = {
  // The whole point of the lesson. Passes every check except the late row.
  "loops over the buttons instead of delegating": {
    impl: `function setupTokenActions(listEl, onRevoke) {
  const buttons = listEl.querySelectorAll(".revoke-btn");
  buttons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      const row = button.closest(".token-row");
      row.classList.add("revoked");
      button.querySelector(".label").textContent = "Revoked";
      onRevoke(row.dataset.tokenCode);
    });
  });
}`,
    expect: "a row added AFTER setup works with no extra wiring"
  },

  // Looks right until the click lands on the span inside the button.
  "uses matches instead of closest, so a click on the label misses": {
    impl: `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    if (!event.target.matches(".revoke-btn")) return;
    const row = event.target.closest(".token-row");
    row.classList.add("revoked");
    event.target.querySelector(".label").textContent = "Revoked";
    onRevoke(row.dataset.tokenCode);
  });
}`,
    expect: "clicking the label inside the button counts as a revoke"
  },

  "no guard, so any click in the row revokes it": {
    impl: `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    const row = event.target.closest(".token-row");
    if (row === null) return;
    row.classList.add("revoked");
    const label = row.querySelector(".label");
    if (label) label.textContent = "Revoked";
    onRevoke(row.dataset.tokenCode);
  });
}`,
    expect: "clicking elsewhere in the row does nothing"
  },

  "reads the code from the row's text instead of the data- attribute": {
    impl: `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    const button = event.target.closest(".revoke-btn");
    if (button === null) return;
    const row = button.closest(".token-row");
    row.classList.add("revoked");
    button.querySelector(".label").textContent = "Revoked";
    onRevoke(row.textContent);
  });
}`,
    expect: "onRevoke receives the code from the data- attribute"
  },

  "marks the whole list revoked instead of the row": {
    impl: `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    const button = event.target.closest(".revoke-btn");
    if (button === null) return;
    const row = button.closest(".token-row");
    event.currentTarget.classList.add("revoked");
    button.querySelector(".label").textContent = "Revoked";
    onRevoke(row.dataset.tokenCode);
  });
}`,
    expect: "the clicked row gains the revoked class"
  },

  "forgets to call onRevoke": {
    impl: `function setupTokenActions(listEl, onRevoke) {
  listEl.addEventListener("click", function (event) {
    const button = event.target.closest(".revoke-btn");
    if (button === null) return;
    const row = button.closest(".token-row");
    row.classList.add("revoked");
    button.querySelector(".label").textContent = "Revoked";
  });
}`,
    expect: "clicking the label inside the button counts as a revoke"
  }
};
