/* Wrong-answer cases for 01/0007-dom-and-browser-apis.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0007-dom-and-browser-apis.html \
 *        --wrong scripts/cases/0007-dom-and-browser-apis.mjs
 *
 * `alternatives` are other correct styles — all must PASS, because the
 * self-check is supposed to test behaviour rather than resemblance.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 */

export const alternatives = {
  "clears by removing children in a loop": `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  while (listEl.firstElementChild) {
    listEl.firstElementChild.remove();
  }
  for (const token of tokens) {
    const card = document.createElement("li");
    card.classList.add("token-card");
    if (token.revoked) card.classList.add("revoked");
    const codeEl = document.createElement("span");
    codeEl.classList.add("token-code");
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.classList.add("token-issued-to");
    whoEl.textContent = token.issuedTo;
    card.appendChild(codeEl);
    card.appendChild(whoEl);
    listEl.appendChild(card);
  }
}`,

  "arrow function and forEach instead of for...of": `const renderTokenList = (tokens) => {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  tokens.forEach((token) => {
    const card = document.createElement("li");
    const codeEl = document.createElement("span");
    codeEl.classList.add("token-code");
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.classList.add("token-issued-to");
    whoEl.textContent = token.issuedTo;
    card.appendChild(codeEl);
    card.appendChild(whoEl);
    card.classList.add("token-card");
    card.classList.add(token.revoked ? "revoked" : "active");
    listEl.appendChild(card);
  });
}`,

  "className strings instead of classList": `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const card = document.createElement("li");
    card.className = token.revoked ? "token-card revoked" : "token-card";
    const codeEl = document.createElement("span");
    codeEl.className = "token-code";
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.className = "token-issued-to";
    whoEl.textContent = token.issuedTo;
    card.appendChild(whoEl);
    card.appendChild(codeEl);   // spans in the other order - still correct
    listEl.appendChild(card);
  }
}`,

  "querySelector instead of getElementById": `function renderTokenList(tokens) {
  const listEl = document.querySelector("#token-list");
  listEl.innerHTML = "";
  for (const t of tokens) {
    const li = document.createElement("li");
    li.classList.add("token-card");
    if (t.revoked === true) { li.classList.add("revoked"); }
    const c = document.createElement("span");
    c.classList.add("token-code");
    c.textContent = t.code;
    li.appendChild(c);
    const w = document.createElement("span");
    w.classList.add("token-issued-to");
    w.textContent = t.issuedTo;
    li.appendChild(w);
    listEl.appendChild(li);
  }
}`
};

export const mistakes = {
  "forgets to clear, so a second call doubles the rows": {
    impl: `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  for (const token of tokens) {
    const card = document.createElement("li");
    card.classList.add("token-card");
    if (token.revoked) card.classList.add("revoked");
    const codeEl = document.createElement("span");
    codeEl.classList.add("token-code");
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.classList.add("token-issued-to");
    whoEl.textContent = token.issuedTo;
    card.appendChild(codeEl);
    card.appendChild(whoEl);
    listEl.appendChild(card);
  }
}`,
    expect: "calling it twice does not duplicate the rows"
  },

  "uses innerHTML for the label - the XSS bug": {
    impl: `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  for (const token of tokens) {
    const card = document.createElement("li");
    card.classList.add("token-card");
    if (token.revoked) card.classList.add("revoked");
    const codeEl = document.createElement("span");
    codeEl.classList.add("token-code");
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.classList.add("token-issued-to");
    whoEl.innerHTML = token.issuedTo;      // the bug
    card.appendChild(codeEl);
    card.appendChild(whoEl);
    listEl.appendChild(card);
  }
}`,
    expect: "a label containing HTML stays text"
  },

  "marks every row revoked": {
    impl: `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  for (const token of tokens) {
    const card = document.createElement("li");
    card.classList.add("token-card");
    card.classList.add("revoked");          // the bug: unconditional
    const codeEl = document.createElement("span");
    codeEl.classList.add("token-code");
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.classList.add("token-issued-to");
    whoEl.textContent = token.issuedTo;
    card.appendChild(codeEl);
    card.appendChild(whoEl);
    listEl.appendChild(card);
  }
}`,
    expect: "the active token does NOT get the revoked class"
  },

  "never adds the revoked class": {
    impl: `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  for (const token of tokens) {
    const card = document.createElement("li");
    card.classList.add("token-card");
    const codeEl = document.createElement("span");
    codeEl.classList.add("token-code");
    codeEl.textContent = token.code;
    const whoEl = document.createElement("span");
    whoEl.classList.add("token-issued-to");
    whoEl.textContent = token.issuedTo;
    card.appendChild(codeEl);
    card.appendChild(whoEl);
    listEl.appendChild(card);
  }
}`,
    expect: "the revoked token gets the revoked class"
  },

  "renders only the first token": {
    impl: `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  const token = tokens[0];
  if (!token) return;
  const card = document.createElement("li");
  card.classList.add("token-card");
  if (token.revoked) card.classList.add("revoked");
  const codeEl = document.createElement("span");
  codeEl.classList.add("token-code");
  codeEl.textContent = token.code;
  const whoEl = document.createElement("span");
  whoEl.classList.add("token-issued-to");
  whoEl.textContent = token.issuedTo;
  card.appendChild(codeEl);
  card.appendChild(whoEl);
  listEl.appendChild(card);
}`,
    expect: "one .token-card per token"
  },

  "puts both values in one span, so the spans are missing": {
    impl: `function renderTokenList(tokens) {
  const listEl = document.getElementById("token-list");
  listEl.innerHTML = "";
  for (const token of tokens) {
    const card = document.createElement("li");
    card.classList.add("token-card");
    if (token.revoked) card.classList.add("revoked");
    card.textContent = token.code + " - " + token.issuedTo;
    listEl.appendChild(card);
  }
}`,
    expect: "the code appears, in a .token-code span"
  }
};
