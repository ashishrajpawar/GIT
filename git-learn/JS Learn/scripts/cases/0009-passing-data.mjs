/* Wrong-answer cases for 02/0009-passing-data.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0009-passing-data.html \
 *        --wrong scripts/cases/0009-passing-data.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for spreads the token and deletes the two
 * sensitive fields. It passes every test written against today's API shape.
 * It fails the month the server returns one more field, and nobody has to make
 * a new mistake for that to happen — which is why the check for it uses a field
 * that does not exist yet.
 */

export const alternatives = {
  "a helper for the label, arrow style": `const displayLabel = (raw) => {
  const trimmed = String(raw ?? "").trim();
  return trimmed.length ? trimmed : "Untitled token";
};

const toRouteParams = (token) => ({
  tokenId: String(token.id),
  label: displayLabel(token.label),
});`,

  "explicit if statements and a mutable result": `function toRouteParams(token) {
  const params = {};
  params.tokenId = "" + token.id;

  let label = token.label;
  if (label === null || label === undefined) label = "";
  label = String(label).trim();
  if (label.length === 0) label = "Untitled token";
  params.label = label;

  return params;
}`,

  "trims with a regex rather than String.trim": `function toRouteParams(token) {
  const raw = String(token.label == null ? "" : token.label).replace(/^\\s+|\\s+$/g, "");
  return {
    tokenId: String(token.id),
    label: raw === "" ? "Untitled token" : raw,
  };
}`,
};

export const mistakes = {
  "spreads the token and deletes the fields it knows about": {
    expect: "a field the API adds later is not carried along",
    impl: `function toRouteParams(token) {
  const params = { ...token, tokenId: String(token.id) };
  delete params.id;
  delete params.code;
  delete params.codeEnc;
  if (!String(params.label ?? "").trim()) params.label = "Untitled token";
  else params.label = String(params.label).trim();
  return params;
}`,
  },

  "passes the whole token through untouched": {
    expect: "the code is NOT passed",
    impl: `function toRouteParams(token) {
  return { ...token, tokenId: String(token.id), label: token.label || "Untitled token" };
}`,
  },

  "leaves a numeric id as a number": {
    expect: "a numeric id is converted to a string",
    impl: `function toRouteParams(token) {
  const label = String(token.label ?? "").trim();
  return {
    tokenId: token.id,
    label: label === "" ? "Untitled token" : label,
  };
}`,
  },

  "checks the label for emptiness without trimming it first": {
    expect: "a whitespace-only label falls back too",
    impl: `function toRouteParams(token) {
  const label = token.label ?? "";
  return {
    tokenId: String(token.id),
    label: label === "" ? "Untitled token" : label,
  };
}`,
  },

  "keeps the label's surrounding whitespace": {
    expect: "a label with padding is trimmed",
    impl: `function toRouteParams(token) {
  const raw = String(token.label ?? "");
  return {
    tokenId: String(token.id),
    label: raw.trim() === "" ? "Untitled token" : raw,
  };
}`,
  },

  "adds status as a third param because the header might want it": {
    expect: "exactly two keys are returned",
    impl: `function toRouteParams(token) {
  const label = String(token.label ?? "").trim();
  return {
    tokenId: String(token.id),
    label: label === "" ? "Untitled token" : label,
    status: token.status,
  };
}`,
  },

  "normalises the label by writing it back onto the token": {
    expect: "the token is never mutated",
    impl: `function toRouteParams(token) {
  const trimmed = String(token.label ?? "").trim();
  token.label = trimmed === "" ? "Untitled token" : trimmed;   // mutates the caller's object
  return {
    tokenId: String(token.id),
    label: token.label,
  };
}`,
  },
};
