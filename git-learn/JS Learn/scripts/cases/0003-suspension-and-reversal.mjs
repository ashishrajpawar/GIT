/**
 * Wrong-answer cases for C3/0003 — decideSuspension.
 *
 *   node scripts/verify-lesson.mjs modules/c3-trust-safety/0003-suspension-and-reversal.html \
 *        --wrong scripts/cases/0003-suspension-and-reversal.mjs
 *
 * THREE FIXTURES DO THE WORK, and each one exists because the obvious
 * fixture cannot tell a right answer from a wrong one:
 *
 *   - five suspensions against five distinct people, NONE reversed. Counting
 *     all suspensions and counting only reversed ones agree on every history
 *     where the two happen to coincide; they part company only here.
 *   - five reversals against ONE person. Counting rows and counting distinct
 *     people agree until the same person appears twice.
 *   - a mixed history — five rows, two reversed, one distinct person among
 *     them. Skipping either the filter or the set gives a different number,
 *     so this one case covers both mistakes at once and neither can hide
 *     behind the other.
 *
 * The direction of failure matters more here than anywhere else in the
 * course. Almost every mistake below suspends somebody who should not have
 * been suspended, or fails to suspend somebody who should have been. The
 * first harms a person who did nothing; the second leaves a threat in place
 * overnight. Neither is a rounding error and the exercise refuses to pretend
 * one of them is the safe default.
 */

export const alternatives = {
  "each branch returning its own complete object": `
function decideSuspension(report, context, now, policy) {
  const deadline = now + policy.reviewWithinMs;
  const recent = context.reporterRecent || [];

  if (!report.actionable) {
    return { action: "queue", scope: null, reason: "no_evidence",
             notify: ["reporter"], reviewBy: deadline };
  }
  if (context.alreadySuspended) {
    return { action: "none", scope: null, reason: "already_suspended",
             notify: ["reporter"], reviewBy: null };
  }
  if (!policy.seriousCategories.includes(report.category)) {
    return { action: "queue", scope: null, reason: "not_serious",
             notify: ["reporter"], reviewBy: deadline };
  }

  const people = {};
  for (const r of recent) if (r.reversed) people[r.reportedUserId] = true;
  if (Object.keys(people).length > policy.maxReversedAgainst) {
    return { action: "queue", scope: null, reason: "reporter_pattern",
             notify: ["reporter"], reviewBy: deadline };
  }

  return { action: "suspend", scope: "conversation", reason: "serious_category",
           notify: ["reporter", "reported"], reviewBy: deadline };
}`,

  "a helper for the reporter history, and a lookup table for the derived fields": `
function reversedAgainstDistinct(context) {
  const recent = Array.isArray(context.reporterRecent) ? context.reporterRecent : [];
  const seen = new Set();
  recent.forEach(function (r) { if (r.reversed) seen.add(r.reportedUserId); });
  return seen.size;
}

const SHAPE = {
  suspend: { scope: "conversation", notify: ["reporter", "reported"], clock: true },
  queue:   { scope: null, notify: ["reporter"], clock: true },
  none:    { scope: null, notify: ["reporter"], clock: false }
};

function decideSuspension(report, context, now, policy) {
  let action = "suspend";
  let reason = "serious_category";

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) < 0) {
    action = "queue"; reason = "not_serious";
  } else if (reversedAgainstDistinct(context) > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  }

  const shape = SHAPE[action];
  return {
    action: action,
    scope: shape.scope,
    reason: reason,
    notify: shape.notify.slice(),
    reviewBy: shape.clock ? now + policy.reviewWithinMs : null
  };
}`,

  "reduce for the distinct count, and a switch for the derived fields": `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = recent.reduce(function (acc, r) {
    if (r.reversed && acc.indexOf(r.reportedUserId) === -1) acc.push(r.reportedUserId);
    return acc;
  }, []).length;

  let action;
  let reason;

  if (report.actionable !== true) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended === true) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.filter(function (c) {
      return c === report.category;
    }).length === 0) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  let scope = null;
  let notify = ["reporter"];
  switch (action) {
    case "suspend":
      scope = "conversation";
      notify = ["reporter", "reported"];
      break;
    default:
      break;
  }

  return {
    action: action,
    scope: scope,
    reason: reason,
    notify: notify,
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
};

export const mistakes = {
  /* The category trusted ahead of the evidence. A grave-sounding label
     does work that only evidence should do, and the report with nothing in
     it is exactly the shape a malicious one has. */
  "the serious category checked before whether anything survived screening": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) !== -1 &&
             distinct <= policy.maxReversedAgainst) {
    action = "suspend"; reason = "serious_category";
  } else if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "queue"; reason = "not_serious";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "a report with no surviving evidence never suspends",
  },

  /* No exactly-once guard, so every duplicate report re-suspends: a second
     notification about a state that has not changed, and a review deadline
     that whoever keeps filing can push forward indefinitely. */
  "no check for an already-suspended conversation": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: now + policy.reviewWithinMs
  };
}`,
    expect: "a second report about an already-suspended conversation does nothing",
  },

  /* Every past suspension counted, not only the reversed ones. Somebody who
     has correctly reported five abusers is treated as the problem, which is
     the one thing a report-driven system cannot afford. */
  "the reporter's whole history counted rather than only the reversals": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "upheld suspensions are not held against a reporter",
  },

  /* Rows counted instead of people, so somebody who will not let go of one
     dispute is treated as somebody using the report button against
     strangers. Different problems, different responses. */
  "the reversals counted as rows rather than distinct people": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const reversed = recent.filter(function (r) { return r.reversed; }).length;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (reversed > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "five reversals against one person is not a pattern",
  },

  /* >= instead of >, so the threshold you set silences a reporter you had
     decided was still within tolerance -- one whole cohort out by one. */
  ">= against maxReversedAgainst instead of >": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct >= policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "exactly maxReversedAgainst distinct people still suspends",
  },

  /* The scope derived from "not none" rather than from "suspend", so every
     queued report comes back carrying a conversation scope -- a field that
     should be empty when nothing happened. */
  "the scope attached to anything that is not none": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "none" ? null : "conversation",
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "only a suspension carries a scope",
  },

  /* Account scope on the gravest categories. It is the convenient thing to
     do in the incident that prompts it, and it is exactly the drift the
     function is shaped to make impossible. */
  "the gravest categories widened to an account-level scope": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;
  const gravest = report.category === "threat" || report.category === "child_safety";

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action !== "suspend" ? null : (gravest ? "account" : "conversation"),
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "no outcome is ever scoped to the account",
  },

  /* The reported party told about every report. It discloses that the other
     party complained -- a fact about the reporter -- and invites
     retaliation before anybody has looked at anything. */
  "the reported party notified on every outcome": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: ["reporter", "reported"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "the reported party is told only when something happened to them",
  },

  /* Nobody told that their access is gone. The app simply stops working in
     one conversation, which reads as a bug and generates a support ticket
     instead of an appeal. */
  "the suspended party not notified": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: ["reporter"],
    reviewBy: action === "none" ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "notifying both parties",
  },

  /* A review deadline on the duplicate too, so the clock restarts every
     time anyone files again about the same conversation. Whoever keeps
     reporting decides when the review is due. */
  "a fresh review deadline started by every duplicate report": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: now + policy.reviewWithinMs
  };
}`,
    expect: "starts no second clock",
  },

  /* A no-evidence report given no deadline, which quietly turns "queued"
     into "forgotten" -- and the pattern of empty reports was the reason to
     keep it in the first place. */
  "a report with no evidence left without a review deadline": {
    impl: `
function decideSuspension(report, context, now, policy) {
  const recent = context.reporterRecent || [];
  const distinct = new Set(
    recent.filter(function (r) { return r.reversed; })
          .map(function (r) { return r.reportedUserId; })
  ).size;

  let action;
  let reason;

  if (!report.actionable) {
    action = "queue"; reason = "no_evidence";
  } else if (context.alreadySuspended) {
    action = "none"; reason = "already_suspended";
  } else if (policy.seriousCategories.indexOf(report.category) === -1) {
    action = "queue"; reason = "not_serious";
  } else if (distinct > policy.maxReversedAgainst) {
    action = "queue"; reason = "reporter_pattern";
  } else {
    action = "suspend"; reason = "serious_category";
  }

  const forgettable = action === "none" || reason === "no_evidence";
  return {
    action: action,
    scope: action === "suspend" ? "conversation" : null,
    reason: reason,
    notify: action === "suspend" ? ["reporter", "reported"] : ["reporter"],
    reviewBy: forgettable ? null : now + policy.reviewWithinMs
  };
}`,
    expect: "and is still queued rather than dropped",
  },
};
