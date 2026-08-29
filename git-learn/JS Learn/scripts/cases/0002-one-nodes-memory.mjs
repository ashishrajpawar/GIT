// Wrong-answer cases for C6/0002 — planDelivery().
//
// Six of the thirteen below are correct on a single-replica deployment. That
// is the lesson: the fixtures have to contain a second node and a bus, because
// nothing a one-box test can do will tell these apart from the right answer.

const SCOPE_SRC = `function conversationScopeOf(principal) {
  if (typeof principal !== "string") return null;
  const marker = principal.indexOf(":");
  if (marker === -1) return null;
  const kind = principal.slice(0, marker);
  return kind === "holder" ? principal.slice(marker + 1) : null;
}
`;

const CORRECT_BODY = `function planDelivery(envelope, sockets, self) {
  if (envelope.code !== undefined) {
    return { deliver: [], publish: false, dropped: [], reason: "code_in_envelope" };
  }
  if (envelope.source !== "client" && envelope.source !== "bus") {
    return { deliver: [], publish: false, dropped: [], reason: "unknown_source" };
  }
  if (envelope.source === "bus" && envelope.origin === self.nodeId) {
    return { deliver: [], publish: false, dropped: [], reason: "own_echo" };
  }

  const deliver = [];
  const dropped = [];
  const seen = new Set();

  for (const socket of sockets) {
    if (socket.conversationId !== envelope.conversationId) continue;
    if (socket.socketId === envelope.senderSocketId) continue;
    if (!socket.open) { dropped.push(socket.socketId); continue; }
    const scope = conversationScopeOf(socket.principal);
    if (scope !== null && scope !== socket.conversationId) { dropped.push(socket.socketId); continue; }
    if (seen.has(socket.socketId)) { dropped.push(socket.socketId); continue; }
    seen.add(socket.socketId);
    deliver.push(socket.socketId);
  }

  return {
    deliver: deliver,
    dropped: dropped,
    publish: envelope.source === "client",
    reason: "ok"
  };
}`;

export const alternatives = {
  // A refuse() helper instead of three hand-written literals.
  "refuse helper": SCOPE_SRC + `
function planDelivery(envelope, sockets, self) {
  const refuse = reason => ({ deliver: [], dropped: [], publish: false, reason });

  if ("code" in envelope && envelope.code !== undefined) return refuse("code_in_envelope");
  if (!["client", "bus"].includes(envelope.source)) return refuse("unknown_source");
  if (envelope.source === "bus" && envelope.origin === self.nodeId) return refuse("own_echo");

  const deliver = [];
  const dropped = [];
  const seen = new Set();

  sockets.forEach(s => {
    if (s.conversationId !== envelope.conversationId) return;
    if (s.socketId === envelope.senderSocketId) return;

    const scope = conversationScopeOf(s.principal);
    const refused = !s.open
      || (scope !== null && scope !== s.conversationId)
      || seen.has(s.socketId);

    if (refused) {
      dropped.push(s.socketId);
      return;
    }
    seen.add(s.socketId);
    deliver.push(s.socketId);
  });

  return { deliver, dropped, publish: envelope.source === "client", reason: "ok" };
}`,

  // Classify every socket first, then partition. Different shape entirely,
  // but the dedup still has to happen during the classification pass.
  "classify then partition": SCOPE_SRC + `
function planDelivery(envelope, sockets, self) {
  const empty = reason => ({ deliver: [], dropped: [], publish: false, reason: reason });

  if (envelope.code !== undefined) return empty("code_in_envelope");
  if (envelope.source !== "client" && envelope.source !== "bus") return empty("unknown_source");
  if (envelope.source === "bus" && envelope.origin === self.nodeId) return empty("own_echo");

  const seen = Object.create(null);
  const verdicts = [];

  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    if (s.conversationId !== envelope.conversationId) continue;
    if (s.socketId === envelope.senderSocketId) continue;

    const scope = conversationScopeOf(s.principal);
    let ok = true;
    if (!s.open) ok = false;
    else if (scope !== null && scope !== s.conversationId) ok = false;
    else if (seen[s.socketId]) ok = false;

    if (ok) seen[s.socketId] = true;
    verdicts.push({ id: s.socketId, ok: ok });
  }

  return {
    deliver: verdicts.filter(v => v.ok).map(v => v.id),
    dropped: verdicts.filter(v => !v.ok).map(v => v.id),
    publish: envelope.source === "client",
    reason: "ok"
  };
}`,

  // Destructuring, a switch for the refusals, and startsWith for the scope.
  "switch and destructuring": `
function planDelivery(envelope, sockets, self) {
  const { code, source, origin, conversationId, senderSocketId } = envelope;
  const blank = { deliver: [], dropped: [], publish: false };

  if (code !== undefined) return { ...blank, reason: "code_in_envelope" };

  switch (source) {
    case "client":
    case "bus":
      break;
    default:
      return { ...blank, reason: "unknown_source" };
  }

  if (source === "bus" && origin === self.nodeId) return { ...blank, reason: "own_echo" };

  const deliver = [];
  const dropped = [];
  const seen = [];

  for (const s of sockets) {
    if (s.conversationId !== conversationId || s.socketId === senderSocketId) continue;

    const scoped = typeof s.principal === "string" && s.principal.startsWith("holder:");
    const scope = scoped ? s.principal.slice("holder:".length) : null;

    if (!s.open || (scoped && scope !== s.conversationId) || seen.indexOf(s.socketId) !== -1) {
      dropped.push(s.socketId);
      continue;
    }
    seen.push(s.socketId);
    deliver.push(s.socketId);
  }

  return { deliver, dropped, publish: source === "client", reason: "ok" };
}`
};

export const mistakes = [
  {
    // THE bug of the lesson. Correct on one node, drops half the traffic on two.
    expect: "a node with no local recipients still publishes",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "publish: envelope.source === \"client\",",
      "publish: envelope.source === \"client\" && deliver.length > 0,"
    )
  },
  {
    // Publishing unconditionally: the bus envelope goes straight back onto the bus.
    expect: "an envelope from the bus is delivered locally and never re-published",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "publish: envelope.source === \"client\",",
      "publish: true,"
    )
  },
  {
    // No echo guard: the publisher delivers its own message a second time.
    expect: "a node ignores the echo of its own publish rather than delivering it twice",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      `  if (envelope.source === "bus" && envelope.origin === self.nodeId) {
    return { deliver: [], publish: false, dropped: [], reason: "own_echo" };
  }
`,
      ""
    )
  },
  {
    // The echo guard without the source half. On the client path origin IS this
    // node by construction, so every message a node accepts is refused as its
    // own echo — a total outage that a bus-less test cannot produce.
    expect: "the sender, the other conversation, the closed, the duplicate and the mismatched are all excluded",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "if (envelope.source === \"bus\" && envelope.origin === self.nodeId) {",
      "if (envelope.origin === self.nodeId) {"
    )
  },
  {
    // The code refusal demoted to third place, where it holds only as long as
    // the two checks above it stay right.
    expect: "the code refusal is reached before the echo check, not after it",
    impl: SCOPE_SRC + `function planDelivery(envelope, sockets, self) {
  if (envelope.source !== "client" && envelope.source !== "bus") {
    return { deliver: [], publish: false, dropped: [], reason: "unknown_source" };
  }
  if (envelope.source === "bus" && envelope.origin === self.nodeId) {
    return { deliver: [], publish: false, dropped: [], reason: "own_echo" };
  }
  if (envelope.code !== undefined) {
    return { deliver: [], publish: false, dropped: [], reason: "code_in_envelope" };
  }

  const deliver = [];
  const dropped = [];
  const seen = new Set();

  for (const socket of sockets) {
    if (socket.conversationId !== envelope.conversationId) continue;
    if (socket.socketId === envelope.senderSocketId) continue;
    if (!socket.open) { dropped.push(socket.socketId); continue; }
    const scope = conversationScopeOf(socket.principal);
    if (scope !== null && scope !== socket.conversationId) { dropped.push(socket.socketId); continue; }
    if (seen.has(socket.socketId)) { dropped.push(socket.socketId); continue; }
    seen.add(socket.socketId);
    deliver.push(socket.socketId);
  }

  return { deliver, dropped, publish: envelope.source === "client", reason: "ok" };
}`
  },
  {
    // No source validation at all: anything that is not the bus is treated as
    // a client, so an unrecognised source is published to every node.
    expect: "an unrecognised source is denied rather than treated as a client",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      `  if (envelope.source !== "client" && envelope.source !== "bus") {
    return { deliver: [], publish: false, dropped: [], reason: "unknown_source" };
  }
`,
      ""
    )
  },
  {
    // No deduplication: the reconnected client receives the message twice.
    expect: "the sender, the other conversation, the closed, the duplicate and the mismatched are all excluded",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "    if (seen.has(socket.socketId)) { dropped.push(socket.socketId); continue; }\n    seen.add(socket.socketId);\n",
      ""
    )
  },
  {
    // Deduplicated, but the duplicate vanishes from the report rather than
    // being recorded — so the registry looks clean while it is not.
    expect: "dropped names the three in this conversation that were refused, in registry order",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "if (seen.has(socket.socketId)) { dropped.push(socket.socketId); continue; }",
      "if (seen.has(socket.socketId)) { continue; }"
    )
  },
  {
    // The scope taken from every principal, so owner:u-3 gets a scope of "u-3",
    // which never matches a conversation id and drops every owner in the system.
    expect: "an owner principal is not scoped to a conversation and is never dropped for disagreeing",
    impl: `function conversationScopeOf(principal) {
  return String(principal).split(":")[1];
}
` + CORRECT_BODY
  },
  {
    // Writing to a socket that is on its way out. This one at least throws in
    // production, which makes it the least dangerous mistake in the list.
    expect: "the sender, the other conversation, the closed, the duplicate and the mismatched are all excluded",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "    if (!socket.open) { dropped.push(socket.socketId); continue; }\n",
      ""
    )
  },
  {
    // The principal disagreement resolved by trusting one of the two values
    // instead of refusing. A message into the wrong conversation, on a product
    // whose promise is that the wrong person cannot reach you.
    expect: "the sender, the other conversation, the closed, the duplicate and the mismatched are all excluded",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "    const scope = conversationScopeOf(socket.principal);\n    if (scope !== null && scope !== socket.conversationId) { dropped.push(socket.socketId); continue; }\n",
      ""
    )
  },
  {
    // The author recorded as a refused recipient, which turns a diagnostic list
    // into one with a permanent false entry.
    expect: "the sender is neither delivered to nor listed as dropped",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "if (socket.socketId === envelope.senderSocketId) continue;",
      "if (socket.socketId === envelope.senderSocketId) { dropped.push(socket.socketId); continue; }"
    )
  },
  {
    // Stamping the envelope on the way through. Chosen because it changes
    // nothing else in the result, so only the mutation check can see it —
    // which is exactly why that check has to exist.
    expect: "neither the envelope nor the registry is modified",
    impl: SCOPE_SRC + CORRECT_BODY.replace(
      "  const deliver = [];\n  const dropped = [];\n  const seen = new Set();",
      "  envelope.plannedBy = self.nodeId;\n\n  const deliver = [];\n  const dropped = [];\n  const seen = new Set();"
    )
  }
];
