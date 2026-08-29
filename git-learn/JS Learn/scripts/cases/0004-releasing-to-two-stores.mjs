/**
 * Wrong-answer cases for C2/0004 — releaseVerdict.
 *
 *   node scripts/verify-lesson.mjs modules/c2-cicd-release/0004-releasing-to-two-stores.html \
 *        --wrong scripts/cases/0004-releasing-to-two-stores.mjs
 *
 * THE FIXTURE CHOICE THAT MAKES THIS SUITE WORK AT ALL. A string comparison
 * of versions and a numeric one agree on every version up to 1.9 — they only
 * part company once a component reaches 10. A policy written with latest at
 * "1.7.2" therefore cannot tell a correct implementation from the commonest
 * wrong one, and the whole exercise would grade a broken answer as right. The
 * self-check's POLICY uses 1.10.0 and 1.11.0 deliberately, and says so in a
 * comment so nobody tidies the numbers back down.
 *
 * The other recurring theme below: three of the mistakes fail in the direction
 * of telling a working app to update to something older or blocking it
 * outright. On a client you cannot take back, a wrongly strict answer is more
 * expensive than a wrongly lenient one.
 */

export const alternatives = {
  "a compare helper returning -1, 0 or 1, and an early-return chain": `
function compareVersions(a, b) {
  const left = String(a).split(".");
  const right = String(b).split(".");
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const l = parseInt(left[i] || "0", 10);
    const r = parseInt(right[i] || "0", 10);
    if (l < r) return -1;
    if (l > r) return 1;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (!rules) return { status: "unknown_platform", target: null, storeUrl: null };

  const storeUrl = rules.storeUrl || null;

  if (compareVersions(client.version, rules.minSupported) === -1) {
    if (storeUrl === null) {
      return { status: "optional_update", target: rules.latest, storeUrl: null };
    }
    return { status: "forced_update", target: rules.latest, storeUrl: storeUrl };
  }
  if (compareVersions(client.version, rules.latest) === -1) {
    return { status: "optional_update", target: rules.latest, storeUrl: storeUrl };
  }
  return { status: "ok", target: null, storeUrl: storeUrl };
}`,

  "both versions padded to the same length before a plain array walk": `
function pad(version, length) {
  const parts = String(version).split(".").map(Number);
  while (parts.length < length) parts.push(0);
  return parts;
}

function isOlder(a, b) {
  const length = Math.max(String(a).split(".").length, String(b).split(".").length);
  const left = pad(a, length);
  const right = pad(b, length);
  for (let i = 0; i < length; i++) {
    if (left[i] !== right[i]) return left[i] < right[i];
  }
  return false;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = "storeUrl" in rules && rules.storeUrl ? rules.storeUrl : null;
  let status = "ok";

  if (isOlder(client.version, rules.minSupported)) {
    status = storeUrl ? "forced_update" : "optional_update";
  } else if (isOlder(client.version, rules.latest)) {
    status = "optional_update";
  }

  return {
    status: status,
    target: status === "ok" ? null : rules.latest,
    storeUrl: storeUrl
  };
}`,

  "findIndex on the first differing component": `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  const at = (arr, i) => (arr[i] === undefined || isNaN(arr[i]) ? 0 : arr[i]);

  const differs = Array.from({ length: length }).findIndex(function (_, i) {
    return at(left, i) !== at(right, i);
  });

  if (differs === -1) return 0;
  return at(left, differs) - at(right, differs);
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules == null) return { status: "unknown_platform", target: null, storeUrl: null };

  const storeUrl = rules.storeUrl == null ? null : rules.storeUrl;
  const belowMinimum = compareVersions(client.version, rules.minSupported) < 0;
  const behindLatest = compareVersions(client.version, rules.latest) < 0;

  let status = "ok";
  if (belowMinimum) status = storeUrl === null ? "optional_update" : "forced_update";
  else if (behindLatest) status = "optional_update";

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
};

export const mistakes = {
  /* The bug this whole lesson is arranged around. It is correct for every
     version anyone tests with, right up until a component reaches 10, and
     then it tells the newest build in the wild to downgrade. */
  "versions compared as strings": {
    impl: `
function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (client.version < rules.minSupported) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (client.version < rules.latest) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "1.10.0 is newer than 1.9.0",
  },

  /* localeCompare with numeric:true, which is the near-miss: it gets 1.10
     versus 1.9 right, so it survives the obvious test, and then reads "1.9"
     as older than "1.9.0" because it is comparing text with a numeric
     tie-breaker rather than comparing versions. */
  "localeCompare with numeric collation instead of a component walk": {
    impl: `
function compareVersions(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "1.10 and 1.10.0 are the same version",
  },

  /* parseFloat over the whole string, which reads "1.10.0" as 1.1 and
     therefore as older than 1.9. Same failure as the string compare, from a
     completely different-looking piece of code. */
  "the version read with parseFloat": {
    impl: `
function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  const version = parseFloat(client.version);
  let status;

  if (version < parseFloat(rules.minSupported)) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (version < parseFloat(rules.latest)) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "1.10.0 is newer than 1.9.0",
  },

  /* Missing components left as undefined, so every comparison against them
     is false and "1.10" is judged equal to "1.10.0" only by accident --
     until the shorter version is the one that should win. */
  "a missing component left undefined instead of read as zero": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.min(left.length, right.length);

  for (let i = 0; i < length; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "1.10 and 1.10.0 are the same version",
  },

  /* Not-equal instead of a comparison, so a tester on an internal build is
     told to update to a version older than the one they are running. The
     failure is in the strict direction, which is the expensive one here. */
  "anything that is not exactly latest treated as out of date": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (client.version !== rules.latest) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "a client newer than latest is ok, not asked to update",
  },

  /* Off by one at the minimum, forcing an update on the exact version you
     had just declared supported -- which is where a whole cohort sits. */
  "<= instead of < at minSupported": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) <= 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "a client on exactly minSupported is not forced",
  },

  /* Forcing with nowhere to go. The configuration is what is wrong, and the
     user who had nothing to do with it is the one who gets a screen with no
     button. */
  "forced even when the platform has no store link": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "a forced update with no store link is downgraded to optional",
  },

  /* One store link for the whole policy. The two review queues are never in
     step, so this is not a tidy-up -- it sends iOS users to Play. */
  "a single store link taken from the first platform in the policy": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const first = policy[Object.keys(policy)[0]];
  const storeUrl = first.storeUrl === undefined ? null : first.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    /* Caught on the Android row before the iOS one, because ios is first in
       the policy object -- so an Android user is sent to the App Store. */
    expect: "with the platform's own store link",
  },

  /* No guard for a platform the policy does not describe, so the function
     throws on the redemption page, on a typo, and on every platform added
     after this code was written. */
  "no guard for a platform the policy does not describe": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: status === "ok" ? null : rules.latest, storeUrl: storeUrl };
}`,
    expect: "Cannot read properties of undefined",
  },

  /* A target handed to a client that is already current. Harmless-looking,
     and it is what an update prompt keys off -- so the prompt appears on
     every launch of an up-to-date app. */
  "target set to latest even when the client is already ok": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  const storeUrl = rules.storeUrl === undefined ? null : rules.storeUrl;
  let status;

  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = storeUrl === null ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return { status: status, target: rules.latest, storeUrl: storeUrl };
}`,
    expect: "and is given no target",
  },

  /* storeUrl left as undefined rather than null, so callers face two
     shapes for one meaning -- the absent-versus-null distinction from the
     previous lesson, used where the two states mean the same thing. */
  "storeUrl passed through as undefined when the policy omits it": {
    impl: `
function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function releaseVerdict(client, policy) {
  const rules = policy[client.platform];
  if (rules === undefined) {
    return { status: "unknown_platform", target: null, storeUrl: null };
  }

  let status;
  if (compareVersions(client.version, rules.minSupported) < 0) {
    status = rules.storeUrl === undefined ? "optional_update" : "forced_update";
  } else if (compareVersions(client.version, rules.latest) < 0) {
    status = "optional_update";
  } else {
    status = "ok";
  }

  return {
    status: status,
    target: status === "ok" ? null : rules.latest,
    storeUrl: rules.storeUrl
  };
}`,
    expect: "still pointed at latest, with storeUrl null rather than undefined",
  },
};
