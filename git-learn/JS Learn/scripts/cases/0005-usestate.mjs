/* Wrong-answer cases for 02/0005-usestate.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0005-usestate.html \
 *        --wrong scripts/cases/0005-usestate.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * Two mistakes here produce a completely correct status every time and are
 * still bugs: mutating the token the caller handed over, and returning a fresh
 * copy when nothing changed. Neither shows up in the data. The first makes the
 * screen stale, the second makes it re-draw forever.
 */

export const alternatives = {
  "a switch on the action": `function applyTokenAction(token, action) {
  if (token.status === "revoked") return token;

  let next;
  switch (action) {
    case "pause":  next = token.status === "active" ? "paused" : token.status; break;
    case "resume": next = token.status === "paused" ? "active" : token.status; break;
    case "revoke": next = "revoked"; break;
    default:       next = token.status;
  }

  return next === token.status ? token : { ...token, status: next };
}`,

  "a transition table keyed by status then action": `const TRANSITIONS = {
  active: { pause: "paused", revoke: "revoked" },
  paused: { resume: "active", revoke: "revoked" },
  revoked: {},
};

function applyTokenAction(token, action) {
  const next = (TRANSITIONS[token.status] || {})[action];
  if (!next || next === token.status) return token;
  return Object.assign({}, token, { status: next });
}`,

  "guard clauses that each return early": `function applyTokenAction(token, action) {
  if (token.status === "revoked") return token;
  if (action === "revoke") return { ...token, status: "revoked" };
  if (action === "pause" && token.status === "active") return { ...token, status: "paused" };
  if (action === "resume" && token.status === "paused") return { ...token, status: "active" };
  return token;
}`,
};

export const mistakes = {
  "mutates the token it was given instead of copying it": {
    expect: "the original token is never mutated",
    impl: `function applyTokenAction(token, action) {
  if (token.status === "revoked") return token;

  if (action === "pause" && token.status === "active") token.status = "paused";
  else if (action === "resume" && token.status === "paused") token.status = "active";
  else if (action === "revoke") token.status = "revoked";

  return token;
}`,
  },

  "returns a fresh copy even when nothing changed": {
    expect: "a no-op returns the SAME object",
    impl: `function applyTokenAction(token, action) {
  if (token.status === "revoked") return { ...token };

  let next = token.status;
  if (action === "pause" && token.status === "active") next = "paused";
  else if (action === "resume" && token.status === "paused") next = "active";
  else if (action === "revoke") next = "revoked";

  return { ...token, status: next };
}`,
  },

  "lets a revoked token be resumed": {
    expect: "revoked + resume stays revoked",
    impl: `function applyTokenAction(token, action) {
  let next = token.status;
  if (action === "pause" && token.status !== "paused") next = "paused";
  else if (action === "resume" && token.status !== "active") next = "active";
  else if (action === "revoke") next = "revoked";

  return next === token.status ? token : { ...token, status: next };
}`,
  },

  "builds the result from scratch, dropping label and code": {
    expect: "other fields survive the change",
    impl: `function applyTokenAction(token, action) {
  if (token.status === "revoked") return token;

  let next = token.status;
  if (action === "pause" && token.status === "active") next = "paused";
  else if (action === "resume" && token.status === "paused") next = "active";
  else if (action === "revoke") next = "revoked";

  if (next === token.status) return token;
  return { status: next };
}`,
  },

  "pauses a token that is already paused, and resumes one already active": {
    expect: "a no-op returns the SAME object",
    impl: `function applyTokenAction(token, action) {
  if (token.status === "revoked") return token;

  const next =
    action === "pause" ? "paused" :
    action === "resume" ? "active" :
    action === "revoke" ? "revoked" : token.status;

  return { ...token, status: next };
}`,
  },

  "treats an unknown action as a revoke": {
    expect: "an unrecognised action changes nothing",
    impl: `function applyTokenAction(token, action) {
  if (token.status === "revoked") return token;

  let next;
  if (action === "pause" && token.status === "active") next = "paused";
  else if (action === "resume" && token.status === "paused") next = "active";
  else next = "revoked";

  return next === token.status ? token : { ...token, status: next };
}`,
  },
};
