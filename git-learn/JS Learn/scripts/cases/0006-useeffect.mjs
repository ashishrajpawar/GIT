/* Wrong-answer cases for 02/0006-useeffect.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0006-useeffect.html \
 *        --wrong scripts/cases/0006-useeffect.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The two mistakes worth the lesson both work perfectly with one screen open.
 * Passing a fresh arrow function to off() unsubscribes nothing, because off()
 * matches on function identity. And holding the handler in module-level state
 * means a second subscriber overwrites the first, so closing one thread
 * silently deafens another.
 *
 * An earlier draft claimed an unguarded double-unsubscribe would remove
 * somebody else's handler. It does not — off() matches on identity, so the
 * second call finds nothing and is a harmless no-op. The lesson text was
 * corrected rather than the fake socket being rigged to make the claim true.
 */

export const alternatives = {
  "nulls the handler out instead of keeping a boolean": `function subscribeToToken(socket, tokenId, onMessage) {
  const topic = "token:" + tokenId;
  let handler = (message) => onMessage(message);
  socket.on(topic, handler);

  return function unsubscribe() {
    if (!handler) return;
    socket.off(topic, handler);
    handler = null;
  };
}`,

  "a named function declaration and a counter": `function subscribeToToken(socket, tokenId, onMessage) {
  const topic = "token:" + tokenId;

  function handler(message) {
    onMessage(message);
  }

  socket.on(topic, handler);

  let calls = 0;
  return function () {
    calls = calls + 1;
    if (calls > 1) return;
    socket.off(topic, handler);
  };
}`,

  "passes onMessage straight through as the handler": `function subscribeToToken(socket, tokenId, onMessage) {
  const topic = "token:" + tokenId;
  socket.on(topic, onMessage);

  let live = true;
  return () => {
    if (!live) return;
    live = false;
    socket.off(topic, onMessage);
  };
}`,
};

export const mistakes = {
  "passes a fresh function to off(), so nothing is ever removed": {
    expect: "unsubscribing removes the handler",
    impl: `function subscribeToToken(socket, tokenId, onMessage) {
  const topic = "token:" + tokenId;
  socket.on(topic, (message) => onMessage(message));

  return function unsubscribe() {
    // A new arrow function every time — off() cannot match it.
    socket.off(topic, (message) => onMessage(message));
  };
}`,
  },

  /* The count check cannot catch this one: exactly one handler is removed, so
     socket.live() is right. Only delivery shows that it was the WRONG one. */
  "keeps the handler in shared state, so a second subscriber overwrites the first": {
    expect: "the remaining subscriber still receives messages",
    impl: `let currentHandler = null;
let currentTopic = null;

function subscribeToToken(socket, tokenId, onMessage) {
  currentTopic = "token:" + tokenId;
  currentHandler = (message) => onMessage(message);
  socket.on(currentTopic, currentHandler);

  // Reads the module-level variables at cleanup time, not at subscribe time,
  // so whichever screen subscribed LAST is the one that gets removed.
  return function unsubscribe() {
    socket.off(currentTopic, currentHandler);
  };
}`,
  },

  "subscribes to the bare tokenId, missing the topic prefix": {
    expect: "a message on that token reaches onMessage",
    impl: `function subscribeToToken(socket, tokenId, onMessage) {
  const handler = (message) => onMessage(message);
  socket.on(tokenId, handler);

  let done = false;
  return function () {
    if (done) return;
    done = true;
    socket.off(tokenId, handler);
  };
}`,
  },

  "listens to every token instead of one": {
    expect: "messages for other tokens do not arrive",
    impl: `function subscribeToToken(socket, tokenId, onMessage) {
  const topics = ["token:" + tokenId, "token:tok-999"];
  const handler = (message) => onMessage(message);
  for (const t of topics) socket.on(t, handler);

  let done = false;
  return function () {
    if (done) return;
    done = true;
    for (const t of topics) socket.off(t, handler);
  };
}`,
  },

  "subscribes but returns nothing at all": {
    expect: "it returns a function to unsubscribe with",
    impl: `function subscribeToToken(socket, tokenId, onMessage) {
  const topic = "token:" + tokenId;
  socket.on(topic, (message) => onMessage(message));
}`,
  },

  "unsubscribes immediately, so no message ever arrives": {
    expect: "a message on that token reaches onMessage",
    impl: `function subscribeToToken(socket, tokenId, onMessage) {
  const topic = "token:" + tokenId;
  const handler = (message) => onMessage(message);
  socket.on(topic, handler);
  socket.off(topic, handler);

  return function () {};
}`,
  },
};
