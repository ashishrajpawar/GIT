/**
 * Wrong-answer cases for C7/0004 — evaluateAlert.
 *
 *   node scripts/verify-lesson.mjs modules/c7-observability/0004-alerts-and-the-page-nobody-answers.html \
 *        --wrong scripts/cases/0004-alerts-and-the-page-nobody-answers.mjs
 *
 * THE FIXTURE THAT CATCHES THE WORST MISTAKE is the one where the clock is
 * ALREADY RUNNING and the value is still above the threshold: pendingSince is
 * two minutes into a five-minute wait. An implementation that writes `now`
 * into pendingSince on every evaluation returns a perfectly reasonable
 * "pending" here — the status, the action and the reason are all correct, and
 * the alert can never fire for as long as the process lives. The only visible
 * difference is the timestamp it asks you to store, so that is what the check
 * compares.
 *
 * A note on direction, because it is unusually lopsided here. Six of the
 * mistakes below make an alert QUIETER than it should be: a null read as
 * healthy, a clock that restarts, a page that never arrives. Those are the
 * expensive ones — a spurious page costs somebody's sleep, and a missing one
 * costs the outage. The two that fail loudly are still worth catching,
 * because a channel that cries wolf is how the quiet failures become
 * survivable.
 */

export const alternatives = {
  "guard clauses throughout, and the page decision as a small helper": `
function canPage(rule) {
  if (rule.severity !== "page") return false;
  return typeof rule.runbook === "string" && rule.runbook.length > 0;
}

function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (value <= rule.threshold) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  if (canPage(rule)) {
    return { status: "firing", action: "page", reason: "fired", pendingSince: since, firing: true };
  }
  return {
    status: "firing", action: "ticket",
    reason: rule.severity === "page" ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,

  "one exit, with status, action and reason assigned along the way": `
function evaluateAlert(rule, value, state, now) {
  const previous = state === undefined || state === null ? {} : state;
  const stored = "pendingSince" in previous && previous.pendingSince !== undefined
    ? previous.pendingSince
    : null;

  let status;
  let action = "none";
  let reason;
  let pendingSince = null;

  if (value === null) {
    status = "unknown"; action = "ticket"; reason = "no_data";
  } else if (!(value > rule.threshold)) {
    status = "ok"; reason = "under_threshold";
  } else if (stored === null) {
    status = "pending"; reason = "pending"; pendingSince = now;
  } else if (now - stored < rule.forMs) {
    status = "pending"; reason = "pending"; pendingSince = stored;
  } else if (previous.firing === true) {
    status = "firing"; reason = "already_firing"; pendingSince = stored;
  } else {
    status = "firing";
    pendingSince = stored;
    const hasRunbook = Boolean(rule.runbook);
    if (rule.severity === "page" && hasRunbook) { action = "page"; reason = "fired"; }
    else if (rule.severity === "page") { action = "ticket"; reason = "no_runbook"; }
    else { action = "ticket"; reason = "fired"; }
  }

  return {
    status: status, action: action, reason: reason,
    pendingSince: pendingSince, firing: status === "firing"
  };
}`,

  "the elapsed time computed once, and destructuring for the stored state": `
function evaluateAlert(rule, value, state, now) {
  const { pendingSince = null, firing = false } = state || {};

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }

  const over = value > rule.threshold;
  if (!over) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }

  const startedAt = pendingSince === null ? now : pendingSince;
  const heldFor = now - startedAt;

  if (heldFor < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: startedAt, firing: false };
  }
  if (firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: startedAt, firing: true };
  }

  const wantsPage = rule.severity === "page";
  const hasRunbook = rule.runbook !== undefined && rule.runbook !== null && rule.runbook !== "";

  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: startedAt,
    firing: true
  };
}`,
};

export const mistakes = {
  /* The quiet failure the previous lesson exists to prevent. A window with
     no traffic reports a null, this reads it as under the threshold, and
     the alert stays silent through the outage it was written for. */
  "a null value treated as under the threshold": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "a null value is unknown, never ok",
  },

  /* Missing data paging. The other way of collapsing three outcomes into
     two, and it wakes somebody every time an exporter restarts -- which is
     how the channel gets muted before the real one arrives. */
  "missing data paging instead of raising a ticket": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return {
      status: "unknown",
      action: rule.severity === "page" ? "page" : "ticket",
      reason: "no_data", pendingSince: null, firing: false
    };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "a null value is unknown, never ok",
  },

  /* The clock restarted on every evaluation. Status, action and reason are
     all correct and the alert can never fire -- the only visible difference
     is the timestamp it asks you to store. */
  "the pending clock reset to now on every evaluation": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null || now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "and the clock is NOT restarted",
  },

  /* The clock carried through a recovery, so the next brief excursion
     inherits however long ago the value was last over and fires
     immediately for a problem that never lasted a minute. */
  "the clock left running when the value recovers": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: since, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "and clears a clock that was already running",
  },

  /* >= at the threshold, so a value sitting exactly on the line you chose
     as acceptable begins a countdown to waking somebody. */
  ">= against the threshold instead of >": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (value < rule.threshold) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "exactly at the threshold is not above it",
  },

  /* Strictly greater on the duration, so "for five minutes" quietly means
     "for more than five minutes" and every alert is one scrape late. */
  "the duration compared with > rather than >=": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since <= rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "held for exactly forMs fires",
  },

  /* Paging again on every evaluation while the incident continues. One
     incident, one page -- repeated pages for an unchanged state are how a
     channel gets muted. */
  "an already-firing alert paging again on every evaluation": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "an alert already firing does not page again",
  },

  /* A page with no runbook. It is real and it is a mystery, and a mystery
     at 3am is how somebody learns to reach for the mute rather than the
     laptop. */
  "a pageable rule paging without a runbook": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  return {
    status: "firing",
    action: rule.severity === "page" ? "page" : "ticket",
    reason: "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "a pageable rule with no runbook is downgraded to a ticket",
  },

  /* The downgrade taken too far: no runbook, so it does not fire at all.
     The problem is real and now nothing records it, which is the one
     outcome worse than a ticket. */
  "a rule with no runbook suppressed entirely rather than downgraded": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  if (wantsPage && !hasRunbook) {
    return { status: "ok", action: "none", reason: "no_runbook", pendingSince: null, firing: false };
  }
  return {
    status: "firing",
    action: wantsPage ? "page" : "ticket",
    reason: "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "and still counts as firing",
  },

  /* Severity ignored, so a disk-usage ticket wakes somebody at 3am for
     something that could not have been acted on before morning anyway. */
  "the severity ignored, so everything that fires pages": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const previous = state || {};
  const since = previous.pendingSince == null ? null : previous.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (previous.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  return {
    status: "firing",
    action: rule.runbook ? "page" : "ticket",
    reason: rule.runbook ? "fired" : "no_runbook",
    pendingSince: since, firing: true
  };
}`,
    expect: "a ticket-severity rule raises a ticket, not a page",
  },

  /* No guard for a rule that has never been evaluated, so every rule added
     in a deploy crashes the evaluator on its first run -- taking every
     other rule in the same pass with it. */
  "no guard for a rule with no stored state": {
    impl: `
function evaluateAlert(rule, value, state, now) {
  const since = state.pendingSince == null ? null : state.pendingSince;

  if (value === null) {
    return { status: "unknown", action: "ticket", reason: "no_data", pendingSince: null, firing: false };
  }
  if (!(value > rule.threshold)) {
    return { status: "ok", action: "none", reason: "under_threshold", pendingSince: null, firing: false };
  }
  if (since === null) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: now, firing: false };
  }
  if (now - since < rule.forMs) {
    return { status: "pending", action: "none", reason: "pending", pendingSince: since, firing: false };
  }
  if (state.firing) {
    return { status: "firing", action: "none", reason: "already_firing", pendingSince: since, firing: true };
  }
  const wantsPage = rule.severity === "page";
  const hasRunbook = Boolean(rule.runbook);
  return {
    status: "firing",
    action: wantsPage && hasRunbook ? "page" : "ticket",
    reason: wantsPage && !hasRunbook ? "no_runbook" : "fired",
    pendingSince: since, firing: true
  };
}`,
    expect: "Cannot read properties of undefined",
  },
};
