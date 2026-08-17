/* Wrong-answer cases for 02/0002-core-components.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0002-core-components.html \
 *        --wrong scripts/cases/0002-core-components.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for is `badge: 0`. It is not a crash, not a
 * wrong number, and not visible in any row that has unread messages — it is
 * only wrong on the rows with nothing to show, which are the rows least likely
 * to be in anyone's test data. In React Native it renders a bare 0 and throws.
 */

export const alternatives = {
  "one function, no helpers": `function toRowModel(token, now) {
  let lastUsed;
  if (token.lastUsedAt == null) {
    lastUsed = "never";
  } else {
    const ms = now - token.lastUsedAt;
    if (ms < 60000) lastUsed = "just now";
    else if (ms < 3600000) lastUsed = Math.floor(ms / 60000) + "m ago";
    else if (ms < 86400000) lastUsed = Math.floor(ms / 3600000) + "h ago";
    else lastUsed = Math.floor(ms / 86400000) + "d ago";
  }

  let badge = null;
  if (token.unread >= 1) badge = token.unread > 9 ? "9+" : token.unread + "";

  return { label: token.label, code: token.code, lastUsed, badge };
}`,

  "arrow functions and a lookup table": `const toRowModel = (token, now) => ({
  label: token.label,
  code: token.code,
  lastUsed: describeAge(token.lastUsedAt, now),
  badge: describeBadge(token.unread),
});

const describeAge = (at, now) => {
  if (at === null || at === undefined) return "never";
  const ms = now - at;
  const units = [
    [86400000, "d ago"],
    [3600000, "h ago"],
    [60000, "m ago"],
  ];
  for (const [size, suffix] of units) {
    const n = Math.floor(ms / size);
    if (n >= 1) return n + suffix;
  }
  return "just now";
};

const describeBadge = (n) => (!n || n < 1 ? null : n > 9 ? "9+" : String(n));`,

  "spreads the token and overwrites the two derived fields": `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  const out = { ...token };
  delete out.lastUsedAt;
  delete out.unread;

  if (token.lastUsedAt == null) out.lastUsed = "never";
  else if (ms < 60000) out.lastUsed = "just now";
  else if (ms < 3600000) out.lastUsed = Math.trunc(ms / 60000) + "m ago";
  else if (ms < 86400000) out.lastUsed = Math.trunc(ms / 3600000) + "h ago";
  else out.lastUsed = Math.trunc(ms / 86400000) + "d ago";

  out.badge = token.unread >= 1 ? (token.unread > 9 ? "9+" : "" + token.unread) : null;
  return out;
}`,
};

export const mistakes = {
  "returns 0 for an empty badge instead of null": {
    expect: "zero unread gives null",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed = "never";
  if (token.lastUsedAt != null) {
    if (ms < 60000) lastUsed = "just now";
    else if (ms < 3600000) lastUsed = Math.floor(ms / 60000) + "m ago";
    else if (ms < 86400000) lastUsed = Math.floor(ms / 3600000) + "h ago";
    else lastUsed = Math.floor(ms / 86400000) + "d ago";
  }
  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: token.unread > 9 ? "9+" : token.unread,
  };
}`,
  },

  "uses truthiness so unread 0 falls through to false": {
    expect: "zero unread gives null",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed = "never";
  if (token.lastUsedAt != null) {
    if (ms < 60000) lastUsed = "just now";
    else if (ms < 3600000) lastUsed = Math.floor(ms / 60000) + "m ago";
    else if (ms < 86400000) lastUsed = Math.floor(ms / 3600000) + "h ago";
    else lastUsed = Math.floor(ms / 86400000) + "d ago";
  }
  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: token.unread && (token.unread > 9 ? "9+" : String(token.unread)),
  };
}`,
  },

  "rounds to nearest instead of down, so 59m59s becomes an hour": {
    expect: "times round down",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed = "never";
  if (token.lastUsedAt != null) {
    if (ms < 60000) lastUsed = "just now";
    else if (ms < 3600000) lastUsed = Math.round(ms / 60000) + "m ago";
    else if (ms < 86400000) lastUsed = Math.round(ms / 3600000) + "h ago";
    else lastUsed = Math.round(ms / 86400000) + "d ago";
  }
  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: !token.unread ? null : token.unread > 9 ? "9+" : String(token.unread),
  };
}`,
  },

  "treats a never-used token as brand new instead of 'never'": {
    expect: "never used reads",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed;
  if (ms < 60000) lastUsed = "just now";
  else if (ms < 3600000) lastUsed = Math.floor(ms / 60000) + "m ago";
  else if (ms < 86400000) lastUsed = Math.floor(ms / 3600000) + "h ago";
  else lastUsed = Math.floor(ms / 86400000) + "d ago";

  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: !token.unread ? null : token.unread > 9 ? "9+" : String(token.unread),
  };
}`,
  },

  "cuts the badge over at 9 instead of above it": {
    expect: "exactly 9 still shows",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed = "never";
  if (token.lastUsedAt != null) {
    if (ms < 60000) lastUsed = "just now";
    else if (ms < 3600000) lastUsed = Math.floor(ms / 60000) + "m ago";
    else if (ms < 86400000) lastUsed = Math.floor(ms / 3600000) + "h ago";
    else lastUsed = Math.floor(ms / 86400000) + "d ago";
  }
  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: !token.unread ? null : token.unread >= 9 ? "9+" : String(token.unread),
  };
}`,
  },

  "returns the badge as a number rather than a string": {
    expect: "a count of 2 shows as",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed = "never";
  if (token.lastUsedAt != null) {
    if (ms < 60000) lastUsed = "just now";
    else if (ms < 3600000) lastUsed = Math.floor(ms / 60000) + "m ago";
    else if (ms < 86400000) lastUsed = Math.floor(ms / 3600000) + "h ago";
    else lastUsed = Math.floor(ms / 86400000) + "d ago";
  }
  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: !token.unread ? null : token.unread > 9 ? "9+" : token.unread,
  };
}`,
  },

  "measures hours against minutes, so 3 hours reads as 180m": {
    expect: "hours read like",
    impl: `function toRowModel(token, now) {
  const ms = now - token.lastUsedAt;
  let lastUsed = "never";
  if (token.lastUsedAt != null) {
    if (ms < 60000) lastUsed = "just now";
    else lastUsed = Math.floor(ms / 60000) + "m ago";
  }
  return {
    label: token.label,
    code: token.code,
    lastUsed,
    badge: !token.unread ? null : token.unread > 9 ? "9+" : String(token.unread),
  };
}`,
  },
};
