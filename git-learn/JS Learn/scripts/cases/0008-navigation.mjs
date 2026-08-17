/* Wrong-answer cases for 02/0008-navigation.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0008-navigation.html \
 *        --wrong scripts/cases/0008-navigation.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for treats `navigate` as `push`. They are
 * identical whenever the target screen is not already on the stack, which is
 * every case anybody tests going forwards. The difference only shows when the
 * user loops back to a screen they came from — and then the stack grows without
 * limit and the back button walks through a history that should not exist.
 */

export const alternatives = {
  "a switch instead of a chain of ifs": `function applyNavAction(stack, action) {
  switch (action.type) {
    case "goBack":
      return stack.length <= 1 ? stack : stack.slice(0, -1);
    case "push":
      return stack.concat([action.screen]);
    case "replace":
      return stack.slice(0, -1).concat([action.screen]);
    case "navigate": {
      const at = stack.lastIndexOf(action.screen);
      if (at === -1) return stack.concat([action.screen]);
      if (at === stack.length - 1) return stack;
      return stack.slice(0, at + 1);
    }
    default:
      return stack;
  }
}`,

  "handlers in a lookup object": `const NAV = {
  goBack: (stack) => (stack.length <= 1 ? stack : stack.slice(0, -1)),
  push: (stack, screen) => [...stack, screen],
  replace: (stack, screen) => [...stack.slice(0, -1), screen],
  navigate: (stack, screen) => {
    if (stack[stack.length - 1] === screen) return stack;
    const at = stack.indexOf(screen);
    return at === -1 ? [...stack, screen] : stack.slice(0, at + 1);
  },
};

function applyNavAction(stack, action) {
  const fn = NAV[action.type];
  return fn ? fn(stack, action.screen) : stack;
}`,

  "builds the result with loops rather than slice": `function applyNavAction(stack, action) {
  if (action.type === "goBack") {
    if (stack.length <= 1) return stack;
    const out = [];
    for (let i = 0; i < stack.length - 1; i++) out.push(stack[i]);
    return out;
  }

  if (action.type === "push") {
    const out = [];
    for (const s of stack) out.push(s);
    out.push(action.screen);
    return out;
  }

  if (action.type === "replace") {
    const out = [];
    for (let i = 0; i < stack.length - 1; i++) out.push(stack[i]);
    out.push(action.screen);
    return out;
  }

  if (action.type === "navigate") {
    let at = -1;
    for (let i = 0; i < stack.length; i++) if (stack[i] === action.screen) at = i;
    if (at === -1) {
      const out = [];
      for (const s of stack) out.push(s);
      out.push(action.screen);
      return out;
    }
    if (at === stack.length - 1) return stack;
    const out = [];
    for (let i = 0; i <= at; i++) out.push(stack[i]);
    return out;
  }

  return stack;
}`,
};

export const mistakes = {
  "treats navigate as push, so returning to a screen stacks another copy": {
    expect: "navigate to a screen already in the stack pops back to it",
    impl: `function applyNavAction(stack, action) {
  if (action.type === "goBack") return stack.length <= 1 ? stack : stack.slice(0, -1);
  if (action.type === "push" || action.type === "navigate") return [...stack, action.screen];
  if (action.type === "replace") return [...stack.slice(0, -1), action.screen];
  return stack;
}`,
  },

  "lets goBack empty the stack": {
    expect: "goBack from the only screen leaves it there",
    impl: `function applyNavAction(stack, action) {
  if (action.type === "goBack") return stack.slice(0, -1);
  if (action.type === "push") return [...stack, action.screen];
  if (action.type === "replace") return [...stack.slice(0, -1), action.screen];
  if (action.type === "navigate") {
    const at = stack.indexOf(action.screen);
    if (at === -1) return [...stack, action.screen];
    if (at === stack.length - 1) return stack;
    return stack.slice(0, at + 1);
  }
  return stack;
}`,
  },

  "replace pushes instead of swapping, so the old screen stays underneath": {
    expect: "replace swaps the top without growing the stack",
    impl: `function applyNavAction(stack, action) {
  if (action.type === "goBack") return stack.length <= 1 ? stack : stack.slice(0, -1);
  if (action.type === "push") return [...stack, action.screen];
  if (action.type === "replace") return [...stack, action.screen];
  if (action.type === "navigate") {
    const at = stack.indexOf(action.screen);
    if (at === -1) return [...stack, action.screen];
    if (at === stack.length - 1) return stack;
    return stack.slice(0, at + 1);
  }
  return stack;
}`,
  },

  "navigate clears the whole stack instead of popping back": {
    expect: "navigate to a screen already in the stack pops back to it",
    impl: `function applyNavAction(stack, action) {
  if (action.type === "goBack") return stack.length <= 1 ? stack : stack.slice(0, -1);
  if (action.type === "push") return [...stack, action.screen];
  if (action.type === "replace") return [...stack.slice(0, -1), action.screen];
  if (action.type === "navigate") return [action.screen];
  return stack;
}`,
  },

  "returns a fresh array for every no-op": {
    expect: "goBack from the only screen returns the SAME array",
    impl: `function applyNavAction(stack, action) {
  if (action.type === "goBack") return stack.length <= 1 ? [...stack] : stack.slice(0, -1);
  if (action.type === "push") return [...stack, action.screen];
  if (action.type === "replace") return [...stack.slice(0, -1), action.screen];
  if (action.type === "navigate") {
    const at = stack.indexOf(action.screen);
    if (at === -1) return [...stack, action.screen];
    return stack.slice(0, at + 1);
  }
  return [...stack];
}`,
  },

  "mutates the stack with push and pop": {
    expect: "the original stack is never mutated",
    impl: `function applyNavAction(stack, action) {
  if (action.type === "goBack") {
    if (stack.length <= 1) return stack;
    stack.pop();
    return stack;
  }
  if (action.type === "push") {
    stack.push(action.screen);
    return stack;
  }
  if (action.type === "replace") {
    stack[stack.length - 1] = action.screen;
    return stack;
  }
  if (action.type === "navigate") {
    const at = stack.indexOf(action.screen);
    if (at === -1) { stack.push(action.screen); return stack; }
    stack.length = at + 1;
    return stack;
  }
  return stack;
}`,
  },
};
