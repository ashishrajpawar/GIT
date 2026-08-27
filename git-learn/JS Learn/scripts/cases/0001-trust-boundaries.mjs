// Wrong-answer cases for c0/0001 — crossBoundary.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   POLICY   — the table itself
//   UNKNOWN  — rule 1, deny by default. The only guard that can produce
//              'unclassified', and the one every mistake here attacks
//   DEST     — rule 2, a classified field with no rule for this place
//   OK       — rules 3 and 5
//
// What most of these have in common: they widen the set of (field,
// destination) pairs that come back allowed. The self-check counts the
// set allowed at a log directly — it must be empty — so several cases
// trip that as well as their own check. That extra failure is inherent
// and is the point of counting rather than asserting field by field.

const FRAGMENTS = {
  POLICY: `
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain" },
  ice_candidate: { device: "plain" }
};`,

  UNKNOWN: `
  const rules = POLICY[field];
  if (!rules) {
    return { allowed: false, form: null, reason: "unclassified" };
  }`,

  DEST: `
  const form = rules[destination];
  if (!form) {
    return { allowed: false, form: null, reason: "not_permitted" };
  }`,

  OK: `
  return { allowed: true, form: form, reason: "ok" };`,
};

const build = (overrides = {}) => {
  const f = { ...FRAGMENTS, ...overrides };
  return `${f.POLICY}
function crossBoundary(field, destination) {${f.UNKNOWN}${f.DEST}${f.OK}
}`;
};

// Styles that must all pass. A correct answer written differently is
// still a correct answer.
//
// NOTE THE SHAPE: verify-lesson.mjs does Object.entries(alternatives)
// and concatenates the VALUE onto the self-check, so this must be a
// map of name -> source string. An array of { label, impl } objects
// stringifies to "[object Object]" and every alternative fails with a
// SyntaxError that looks like a broken verifier. `mistakes` is the
// other shape on purpose — there the value is { expect, impl }.
const alternatives = {
  // Object lookup replaced by a Map. Same semantics, no prototype
  // surprises, and the self-check must not care which was used.
  "a Map instead of an object literal": `
const POLICY = new Map([
  ["message_body",  new Map([["device","plain"],["server","sealed"],["export","plain"]])],
  ["phone_number",  new Map([["device","plain"],["server","derived"],["vendor","plain"]])],
  ["token_code",    new Map([["device","plain"],["server","derived"]])],
  ["holder_ip",     new Map([["server","plain"]])],
  ["ice_candidate", new Map([["device","plain"]])]
]);
function crossBoundary(field, destination) {
  const rules = POLICY.get(field);
  if (rules === undefined) return { allowed: false, form: null, reason: "unclassified" };
  const form = rules.get(destination);
  if (form === undefined) return { allowed: false, form: null, reason: "not_permitted" };
  return { allowed: true, form, reason: "ok" };
}`,

  // A flat table keyed on "field:destination". Different data shape,
  // and it still has to distinguish the two refusals — which it can
  // only do by keeping the field list separately.
  "a flat pair-keyed table": `
const KNOWN = ["message_body","phone_number","token_code","holder_ip","ice_candidate"];
const RULES = {
  "message_body:device": "plain",
  "message_body:server": "sealed",
  "message_body:export": "plain",
  "phone_number:device": "plain",
  "phone_number:server": "derived",
  "phone_number:vendor": "plain",
  "token_code:device": "plain",
  "token_code:server": "derived",
  "holder_ip:server": "plain",
  "ice_candidate:device": "plain"
};
function crossBoundary(field, destination) {
  if (!KNOWN.includes(field)) {
    return { allowed: false, form: null, reason: "unclassified" };
  }
  const form = RULES[field + ":" + destination];
  if (form === undefined) {
    return { allowed: false, form: null, reason: "not_permitted" };
  }
  return { allowed: true, form: form, reason: "ok" };
}`,

  // Arrow function, ternaries, no early returns. Terse and correct.
  "arrow function with ternaries": `
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain" },
  ice_candidate: { device: "plain" }
};
const crossBoundary = (field, destination) => {
  const rules = POLICY[field];
  const form = rules ? rules[destination] : undefined;
  return !rules  ? { allowed: false, form: null, reason: "unclassified" }
       : !form   ? { allowed: false, form: null, reason: "not_permitted" }
       :           { allowed: true,  form: form, reason: "ok" };
};`,

  // Properties in a different order, and reason computed first.
  // Object key order must not matter to any check.
  "properties built in a different order": `
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain" },
  ice_candidate: { device: "plain" }
};
function crossBoundary(field, destination) {
  const rules = POLICY[field];
  const form = rules && rules[destination] ? rules[destination] : null;
  const reason = !rules ? "unclassified" : (form ? "ok" : "not_permitted");
  return { reason: reason, form: form, allowed: reason === "ok" };
}`,
};

const mistakes = [
  {
    // THE defect this lesson exists for. An unknown field falls through
    // to a default classification, so deny-by-default is gone and the
    // 'unclassified' reason can never be produced at all.
    expect: "an unclassified field is REFUSED",
    impl: build({
      UNKNOWN: `
  const rules = POLICY[field] || { device: "plain" };`,
    }),
  },
  {
    // The permissive shape from the lesson's broken playground: no
    // destination guard. Every known field is allowed everywhere and
    // form is undefined. Leaks rather than crashes.
    expect: "a token code is refused at a log",
    impl: build({
      DEST: `
  const form = rules[destination];`,
    }),
  },
  {
    // One refusal reason for both paths. Passes every allowed/refused
    // assertion and loses the difference between a gap in the policy
    // and the policy working — which need different human responses.
    expect: "unclassified and not_permitted are different reasons",
    impl: build({
      UNKNOWN: `
  const rules = POLICY[field];
  if (!rules) {
    return { allowed: false, form: null, reason: "denied" };
  }`,
      DEST: `
  const form = rules[destination];
  if (!form) {
    return { allowed: false, form: null, reason: "denied" };
  }`,
    }),
  },
  {
    // form left as undefined rather than null on refusal. Survives a
    // truthiness check and vanishes under JSON.stringify, so an API
    // caller sees no field at all — a third state nobody designed.
    expect: "form is null on a not_permitted refusal",
    impl: build({
      DEST: `
  const form = rules[destination];
  if (!form) {
    return { allowed: false, form: undefined, reason: "not_permitted" };
  }`,
    }),
  },
  {
    // Keyed on the field alone: one verdict per field, ignoring where
    // it is going. Gets holder_ip -> server right and holder_ip ->
    // export wrong, which is exactly the direction case.
    expect: "a holder IP is REFUSED in the user's export",
    impl: `
const SENSITIVE = ["message_body", "token_code", "ice_candidate"];
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain" },
  ice_candidate: { device: "plain" }
};
function crossBoundary(field, destination) {
  const rules = POLICY[field];
  if (!rules) return { allowed: false, form: null, reason: "unclassified" };
  if (SENSITIVE.includes(field) && destination !== "device") {
    return { allowed: false, form: null, reason: "not_permitted" };
  }
  const form = rules[destination] || "plain";
  return { allowed: true, form: form, reason: "ok" };
}`,
  },
  {
    // The flattened boolean. Allowed/refused is right everywhere; the
    // form is thrown away, so a caller sends a message body to the
    // server in plaintext with a clear conscience.
    expect: "a message body reaches the server SEALED, not plain",
    impl: build({
      OK: `
  return { allowed: true, form: "plain", reason: "ok" };`,
    }),
  },
  {
    // Debug-friendly and wrong: ICE candidates permitted at the server
    // because they are useful when a call fails. The rule most likely
    // to be relaxed on purpose by someone who has not read ADR-0008.
    expect: "an ICE candidate is refused at the server",
    impl: build({
      POLICY: `
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain" },
  ice_candidate: { device: "plain", server: "plain" }
};`,
    }),
  },
  {
    // A log rule added for one field only. Every per-field assertion
    // still passes; only the count of what is allowed at a log catches
    // it, which is the argument for counting the set.
    expect: "nothing at all is allowed at a log",
    impl: build({
      POLICY: `
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain", log: "plain" },
  ice_candidate: { device: "plain" }
};`,
    }),
  },
  {
    // Destination checked before the field exists. This THROWS rather
    // than returning, which is why the self-check wraps the block: an
    // uncaught throw would abort every check below it and read as a
    // broken verifier rather than a caught mistake.
    expect: "an unclassified field is REFUSED",
    impl: `
const POLICY = {
  message_body:  { device: "plain", server: "sealed", export: "plain" },
  phone_number:  { device: "plain", server: "derived", vendor: "plain" },
  token_code:    { device: "plain", server: "derived" },
  holder_ip:     { server: "plain" },
  ice_candidate: { device: "plain" }
};
function crossBoundary(field, destination) {
  const form = POLICY[field][destination];
  if (!form) return { allowed: false, form: null, reason: "not_permitted" };
  return { allowed: true, form: form, reason: "ok" };
}`,
  },
  {
    // reason left as the form name on success. Callers logging .reason
    // then record 'sealed' where they expected 'ok', and any code
    // branching on reason === 'ok' silently stops matching.
    expect: "reason is 'ok' when allowed",
    impl: build({
      OK: `
  return { allowed: true, form: form, reason: form };`,
    }),
  },
];

export { alternatives, mistakes };
