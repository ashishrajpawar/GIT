/**
 * Wrong-answer cases for C3/0002 — assessSender.
 *
 *   node scripts/verify-lesson.mjs modules/c3-trust-safety/0002-signals-without-content.html \
 *        --wrong scripts/cases/0002-signals-without-content.mjs
 *
 * TWO FIXTURES CARRY THIS WHOLE SUITE, and both exist to make a wrong answer
 * produce a DIFFERENT number rather than the same one:
 *
 *   - "twelve messages across three tokens" — four per token against a
 *     threshold of five. An overall count trips; a per-token count does not.
 *     With four messages on one token and eight spread elsewhere, both
 *     implementations would agree and the distinction would be untested.
 *   - "eight messages to two people" — a total count trips the peer
 *     threshold of three; a distinct count sees two. The commonest wrong
 *     answer here is `messages.length`, and it is right often enough that a
 *     one-message-per-peer fixture cannot catch it.
 *
 * The direction of failure is worth noting too. Almost every mistake below
 * raises a flag that should not exist, and a flag is a place in a queue that
 * a person has to spend attention on. The base-rate arithmetic in the lesson
 * is the reason that direction is the expensive one: the innocent population
 * is enormous, so a slightly loose rule does not add a few cases, it adds
 * thousands.
 */

export const alternatives = {
  "reduce for the per-token tally and an object for the distinct peers": `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = activity.events.filter(function (e) {
    if (e.at > now) { ignored++; return false; }
    return e.at > now - policy.windowMs;
  });

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = messages.reduce(function (acc, m) {
    acc[m.tokenId] = (acc[m.tokenId] || 0) + 1;
    return acc;
  }, {});
  const busiest = Object.values(perToken).reduce(function (a, b) {
    return b > a ? b : a;
  }, 0);

  const peerMap = {};
  for (const m of messages) peerMap[m.peerId] = true;
  const peers = Object.keys(peerMap).length;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({
      signal: "revoked_against",
      observed: revocations.length,
      threshold: policy.maxRevocations
    });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return {
    flags: flags,
    ignored: ignored,
    rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch")
  };
}`,

  "Maps throughout, and a helper that pushes a flag when a threshold is exceeded": `
function assessSender(activity, now, policy) {
  const cutoff = now - policy.windowMs;
  let ignored = 0;
  const inWindow = [];

  for (let i = 0; i < activity.events.length; i++) {
    const e = activity.events[i];
    if (e.at > now) { ignored += 1; continue; }
    if (e.at > cutoff) inWindow.push(e);
  }

  const messages = [];
  let revocations = 0;
  const perToken = new Map();
  const peers = new Set();

  for (const e of inWindow) {
    if (e.kind === "revocation") { revocations += 1; continue; }
    messages.push(e);
    perToken.set(e.tokenId, (perToken.get(e.tokenId) || 0) + 1);
    peers.add(e.peerId);
  }

  let busiest = 0;
  perToken.forEach(function (count) { if (count > busiest) busiest = count; });

  const flags = [];
  const consider = function (signal, observed, threshold) {
    if (observed > threshold) {
      flags.push({ signal: signal, observed: observed, threshold: threshold });
    }
  };

  consider("burst", busiest, policy.maxPerToken);
  consider("broadcast", peers.size, policy.maxDistinctPeers);
  consider("revoked_against", revocations, policy.maxRevocations);

  let rank = "none";
  if (flags.length > 0) {
    rank = (now - activity.accountCreatedAt < policy.newAccountMs) ? "review" : "watch";
  }

  return { flags: flags, ignored: ignored, rank: rank };
}`,

  "one pass, tallying as it goes, with sort instead of max": `
function assessSender(activity, now, policy) {
  const state = { ignored: 0, revocations: 0, perToken: {}, peers: {} };

  for (const e of activity.events) {
    if (e.at > now) { state.ignored++; continue; }
    if (!(e.at > now - policy.windowMs)) continue;
    if (e.kind === "revocation") { state.revocations++; continue; }
    if (state.perToken[e.tokenId] === undefined) state.perToken[e.tokenId] = 0;
    state.perToken[e.tokenId]++;
    state.peers[e.peerId] = true;
  }

  const sorted = Object.keys(state.perToken)
    .map(function (k) { return state.perToken[k]; })
    .sort(function (a, b) { return b - a; });
  const busiest = sorted.length > 0 ? sorted[0] : 0;
  const peerCount = Object.keys(state.peers).length;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peerCount > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peerCount, threshold: policy.maxDistinctPeers });
  }
  if (state.revocations > policy.maxRevocations) {
    flags.push({
      signal: "revoked_against",
      observed: state.revocations,
      threshold: policy.maxRevocations
    });
  }

  if (flags.length === 0) return { flags: flags, ignored: state.ignored, rank: "none" };
  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: state.ignored, rank: isNew ? "review" : "watch" };
}`,
};

export const mistakes = {
  /* Total messages instead of the busiest token. A shop running three
     ordinary conversations is reported as a spam burst -- and per the base
     rate, that description fits nearly everybody. */
  "the burst counted across all tokens rather than per token": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at > now - policy.windowMs) inWindow.push(e);
  }

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (messages.length > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: messages.length, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "twelve messages across three tokens is not a burst",
  },

  /* Message count instead of distinct peers. A long conversation with one
     courier is reported as a broadcast to forty strangers. */
  "the broadcast counted from message volume rather than distinct peers": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at > now - policy.windowMs) inWindow.push(e);
  }

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (messages.length > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: messages.length, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "eight messages to two people is not a broadcast",
  },

  /* Revocations counted as messages, so six people revoking on a sender is
     reported as a burst that never happened -- and the signal that DID
     occur is described as something else entirely. */
  "every in-window event treated as a message": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at > now - policy.windowMs) inWindow.push(e);
  }

  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of inWindow) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(inWindow.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "revocations do not count as a burst",
  },

  /* Future events dropped rather than set aside, so ignored is always zero
     and a sender submitting hundreds of them looks perfectly ordinary. */
  "future events filtered out without being counted": {
    impl: `
function assessSender(activity, now, policy) {
  const inWindow = activity.events.filter(function (e) {
    return e.at <= now && e.at > now - policy.windowMs;
  });

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: 0, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "and are reported in the ignored count",
  },

  /* No future check at all, so a client with a wrong or dishonest clock
     writes whatever counter value it likes. */
  "future events counted like any other": {
    impl: `
function assessSender(activity, now, policy) {
  const inWindow = activity.events.filter(function (e) {
    return e.at > now - policy.windowMs;
  });

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: 0, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "future-dated events are ignored rather than counted",
  },

  /* The window closed on the wrong side, so an event exactly on the
     boundary belongs to two adjacent windows at once. */
  ">= at the window boundary instead of >": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at >= now - policy.windowMs) inWindow.push(e);
  }

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "an event exactly on the window boundary is outside it",
  },

  /* >= against the threshold, so the value you declared acceptable is the
     value that gets flagged. Every sender sitting exactly on the limit --
     which is where a limit puts people -- lands in the queue. */
  ">= against the thresholds instead of >": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at > now - policy.windowMs) inWindow.push(e);
  }

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (busiest >= policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers >= policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length >= policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;
  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "exactly maxPerToken is not a burst",
  },

  /* Newness treated as a finding rather than a multiplier. Every legitimate
     user is new once, so this flags the entire top of the funnel. */
  "a new account raised as a flag in its own right": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at > now - policy.windowMs) inWindow.push(e);
  }

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;
  const isNew = now - activity.accountCreatedAt < policy.newAccountMs;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }
  if (isNew) {
    flags.push({
      signal: "new_account",
      observed: now - activity.accountCreatedAt,
      threshold: policy.newAccountMs
    });
  }

  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : (isNew ? "review" : "watch") };
}`,
    expect: "a brand-new account doing nothing unusual ranks none",
  },

  /* Account age ignored entirely, so the multiplier that makes the rank
     useful never applies and everything flagged looks the same. */
  "the account age never consulted": {
    impl: `
function assessSender(activity, now, policy) {
  let ignored = 0;
  const inWindow = [];
  for (const e of activity.events) {
    if (e.at > now) { ignored++; continue; }
    if (e.at > now - policy.windowMs) inWindow.push(e);
  }

  const messages = inWindow.filter(function (e) { return e.kind === "message"; });
  const revocations = inWindow.filter(function (e) { return e.kind === "revocation"; });

  const perToken = {};
  for (const m of messages) perToken[m.tokenId] = (perToken[m.tokenId] || 0) + 1;
  const values = Object.keys(perToken).map(function (k) { return perToken[k]; });
  const busiest = values.length === 0 ? 0 : Math.max.apply(null, values);
  const peers = new Set(messages.map(function (m) { return m.peerId; })).size;

  const flags = [];
  if (busiest > policy.maxPerToken) {
    flags.push({ signal: "burst", observed: busiest, threshold: policy.maxPerToken });
  }
  if (peers > policy.maxDistinctPeers) {
    flags.push({ signal: "broadcast", observed: peers, threshold: policy.maxDistinctPeers });
  }
  if (revocations.length > policy.maxRevocations) {
    flags.push({ signal: "revoked_against", observed: revocations.length, threshold: policy.maxRevocations });
  }

  return { flags: flags, ignored: ignored, rank: flags.length === 0 ? "none" : "watch" };
}`,
    expect: "the same behaviour ranks review on a new account and watch on an old one",
  },

};

/**
 * A DELIBERATE BLIND SPOT, recorded rather than papered over.
 *
 * `Math.max.apply(null, [])` is -Infinity, not 0, so an implementation that
 * omits the empty-array guard produces a nonsense value for the busiest
 * token when a sender has no messages at all. That was written here as a
 * mistake and it PASSED EVERYTHING, because -Infinity is never greater than
 * a positive threshold and `observed` is only ever reported when the flag
 * fired — which requires a real count.
 *
 * The honest conclusion is that it is not a mistake under this
 * specification, and the first instinct — contrive an assertion until it
 * fails — was the wrong one. It was tried: making the rank depend on
 * `busiest > 0` did not discriminate either, because every case with a flag
 * has messages in it.
 *
 * Two things follow, and the second is the reason this note exists:
 *
 *   - The guard is still worth writing. It costs one comparison and it stops
 *     a value that means "no data" from being an arithmetic result that
 *     happens to compare favourably. Change the spec so that `observed` is
 *     reported for a signal that did not fire, and it becomes a live bug the
 *     same afternoon.
 *   - Adding an assertion purely to fail a case you have decided is wrong is
 *     how a self-check stops testing behaviour and starts testing
 *     resemblance. Leaving the gap visible here is the cheaper honesty.
 */
