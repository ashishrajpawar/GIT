/**
 * Wrong-answer cases for 01/0006 — createTokenGuard.
 *
 * `alternatives` are genuinely correct in a different style. All must pass, or
 * the self-check is testing resemblance instead of behaviour.
 *
 * `mistakes` are the errors a beginner actually makes here. Each must fail, and
 * `expect` names the check it should trip — a mistake that trips everything is
 * a self-check with poor diagnostics.
 */

export const alternatives = {
  "counts down instead of up": `
function createTokenGuard(maxUses) {
  let remaining = maxUses;
  return function () {
    if (remaining <= 0) return "denied";
    remaining = remaining - 1;
    return "allowed";
  };
}`,

  "arrow function returned": `
const createTokenGuard = (maxUses) => {
  let used = 0;
  return () => (used >= maxUses ? "denied" : (used++, "allowed"));
};`,

  "comparison written the other way round": `
function createTokenGuard(maxUses) {
  let used = 0;
  return function () {
    if (maxUses > used) {
      used += 1;
      return "allowed";
    }
    return "denied";
  };
}`,
};

export const mistakes = {
  "off by one: > instead of >=": {
    impl: `
function createTokenGuard(maxUses) {
  let used = 0;
  return function () {
    if (used > maxUses) return "denied";
    used = used + 1;
    return "allowed";
  };
}`,
    expect: "the fourth use is denied",
  },

  "counter declared outside the factory (shared state)": {
    impl: `
let used = 0;
function createTokenGuard(maxUses) {
  return function () {
    if (used >= maxUses) return "denied";
    used = used + 1;
    return "allowed";
  };
}`,
    expect: "two guards are independent",
  },

  "counts the use before checking the limit": {
    impl: `
function createTokenGuard(maxUses) {
  let used = 0;
  return function () {
    used = used + 1;
    if (used >= maxUses) return "denied";
    return "allowed";
  };
}`,
    expect: "",
  },

  "exposes the counter on the returned function": {
    impl: `
function createTokenGuard(maxUses) {
  let used = 0;
  const guard = function () {
    if (used >= maxUses) return "denied";
    used = used + 1;
    guard.used = used;
    return "allowed";
  };
  guard.used = 0;
  return guard;
}`,
    expect: "the count is NOT reachable from outside",
  },

  "returns a value instead of a function": {
    impl: `
function createTokenGuard(maxUses) {
  let used = 0;
  return used >= maxUses ? "denied" : "allowed";
}`,
    expect: "createTokenGuard returns a function",
  },
};
