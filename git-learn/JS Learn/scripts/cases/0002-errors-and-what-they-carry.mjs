/**
 * Wrong-answer cases for C7/0002 — prepareEvent.
 *
 *   node scripts/verify-lesson.mjs modules/c7-observability/0002-errors-and-what-they-carry.html \
 *        --wrong scripts/cases/0002-errors-and-what-they-carry.mjs
 *
 * THE FIXTURE THAT CARRIES THE ORDERING RULE contains a code AND a number in
 * one message: "redeem failed for MERC-8GH2-KP4X after 1274ms". With only a
 * code in it, both orderings agree; with only a number, both agree again.
 * They part company solely where a code's own digits are in reach of the digit
 * pattern — which is every real message, because a code is four fifths digits
 * by construction.
 *
 * THE SECOND ONE IS THE HEADER CASE. The request carries `X-Request-Id`
 * capitalised and `content-type` lowercased, so an exact-match allow-list
 * keeps one and loses the other. A fixture with uniformly lowercased headers
 * cannot tell a case-insensitive implementation from a case-sensitive one, and
 * uniformly lowercased headers are not what arrives over the wire.
 *
 * Note which direction the mistakes fail in. Three of them put the token code
 * into a crash report, which is the exact exposure ADR-0007 exists to prevent
 * and the reason this lesson is in the module at all.
 */

export const alternatives = {
  "a helper per concern, and Object.entries for the header lowering": `
function normalise(message, codePattern) {
  return message.replace(codePattern, "<code>").replace(/[0-9]+/g, "<n>");
}

function pickHeaders(raw, allow) {
  const lowered = {};
  Object.entries(raw || {}).forEach(function (pair) {
    lowered[pair[0].toLowerCase()] = pair[1];
  });
  const out = {};
  allow.forEach(function (name) {
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(lowered, key)) out[key] = lowered[key];
  });
  return out;
}

function prepareEvent(event, config) {
  if (config.expectedErrors.includes(event.error.name)) {
    return { send: false, reason: "expected", event: null };
  }

  const message = normalise(event.error.message, config.codePattern);
  const r = event.request;

  return {
    send: true,
    reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: r ? { method: r.method, url: r.url, headers: pickHeaders(r.headers, config.allowHeaders) } : null,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,

  "a Map for the lowered headers, and an early return for the refusal": `
function prepareEvent(event, config) {
  for (const name of config.expectedErrors) {
    if (name === event.error.name) {
      return { send: false, reason: "expected", event: null };
    }
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request !== undefined && event.request !== null) {
    const lowered = new Map();
    const raw = event.request.headers === undefined ? {} : event.request.headers;
    for (const key of Object.keys(raw)) lowered.set(key.toLowerCase(), raw[key]);

    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (lowered.has(key)) headers[key] = lowered.get(key);
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  const release = typeof event.release === "string" ? event.release : "unknown";

  return {
    send: true,
    reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: release
    }
  };
}`,

  "reduce for the headers, and the fingerprint assembled from an array": `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) >= 0) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(new RegExp("[0-9]+", "g"), "<n>");

  const buildRequest = function (r) {
    if (!r) return null;
    const lowered = Object.keys(r.headers || {}).reduce(function (acc, k) {
      acc[k.toLowerCase()] = r.headers[k];
      return acc;
    }, {});
    const headers = config.allowHeaders.reduce(function (acc, name) {
      const key = name.toLowerCase();
      if (key in lowered) acc[key] = lowered[key];
      return acc;
    }, {});
    return { method: r.method, url: r.url, headers: headers };
  };

  return {
    send: true,
    reason: "reported",
    event: {
      fingerprint: [event.error.name, message].join(": "),
      error: { name: event.error.name, message: message },
      request: buildRequest(event.request),
      release: event.release ? event.release : "unknown"
    }
  };
}`,
};

export const mistakes = {
  /* The ordering. Digits first breaks the code into fragments the code
     pattern can no longer match, so the message groups badly AND still
     carries enough of the code to identify one token. */
  "the digits replaced before the code": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(/\\d+/g, "<n>")
    .replace(config.codePattern, "<code>");

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "the code is replaced before the digits are",
  },

  /* No normalising at all. The message is honest and every distinct pair of
     ids is a separate issue, so one bug arrives forty thousand times, each
     one looking new. */
  "the raw message used for the fingerprint": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + event.error.message,
      error: { name: event.error.name, message: event.error.message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "the code is replaced before the digits are",
  },

  /* The message normalised for grouping but the raw one still sent. The
     dashboard groups correctly and every event body carries the code, which
     is the worst of both -- it looks fixed. */
  "the fingerprint normalised but the raw message still attached": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: event.error.message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "the code is replaced before the digits are",
  },

  /* The request spread and the body deleted. Everything the middleware
     attached is present before anything is removed, and bodies also arrive
     as rawBody, text and parsed copies depending on the stack. */
  "the request spread and the body deleted afterwards": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = Object.assign({}, event.request);
    request.headers = headers;
    delete request.rawBody;
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "the request body never reaches the outgoing event",
  },

  /* Headers matched exactly, so X-Request-Id is silently dropped -- the one
     field that ties the crash to a log line, lost because of a capital
     letter the client chose. */
  "the header allow-list matched case-sensitively": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const raw = event.request.headers || {};
    const headers = {};
    for (const name of config.allowHeaders) {
      if (Object.prototype.hasOwnProperty.call(raw, name)) headers[name] = raw[name];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "an allow-listed header matches whatever case it arrived in",
  },

  /* The request's own headers walked instead of the allow-list. Same
     failure as the previous lesson: Authorization is copied because it was
     there, and the output order is the client's. */
  "the request's headers walked rather than the allow-list": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const raw = event.request.headers || {};
    const headers = {};
    for (const name of Object.keys(raw)) {
      headers[name.toLowerCase()] = raw[name];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "a header nobody allow-listed is gone",
  },

  /* No guard for an event without a request, so every queue worker, nightly
     job and socket handler crash takes the reporter down with it -- and
     those are the failures nobody is already watching for. */
  "no guard for an event that has no request": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  const lowered = {};
  const raw = event.request.headers || {};
  for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
  const headers = {};
  for (const name of config.allowHeaders) {
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: { method: event.request.method, url: event.request.url, headers: headers },
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "Cannot read properties of undefined",
  },

  /* An empty shell instead of null when there was no request. Every
     dashboard then shows a request that did not happen, with undefined
     where the method should be. */
  "an empty request object built when there was no request": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  const r = event.request || {};
  const lowered = {};
  const raw = r.headers || {};
  for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
  const headers = {};
  for (const name of config.allowHeaders) {
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: { method: r.method, url: r.url, headers: headers },
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "with request null rather than an empty shell",
  },

  /* Expected failures sent anyway. Every refused dead code becomes an
     issue, and a dashboard of those is one nobody opens -- which is worse
     than no dashboard, because it occupies the space. */
  "expected failures reported like any other": {
    impl: `
function prepareEvent(event, config) {
  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "an expected failure is not sent",
  },

  /* The fingerprint built from the message alone, so two unrelated bugs
     that normalise to the same text merge into one issue. Over-grouping
     hides a bug as effectively as under-grouping floods the dashboard. */
  "the fingerprint built from the message without the error name": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release == null ? "unknown" : event.release
    }
  };
}`,
    expect: "and a different error name does not",
  },

  /* A missing release left undefined. The field is blank on the dashboard,
     which is a gap nobody notices, rather than a word somebody eventually
     asks about. */
  "a missing release left undefined rather than marked unknown": {
    impl: `
function prepareEvent(event, config) {
  if (config.expectedErrors.indexOf(event.error.name) !== -1) {
    return { send: false, reason: "expected", event: null };
  }

  const message = event.error.message
    .replace(config.codePattern, "<code>")
    .replace(/\\d+/g, "<n>");

  let request = null;
  if (event.request) {
    const lowered = {};
    const raw = event.request.headers || {};
    for (const name of Object.keys(raw)) lowered[name.toLowerCase()] = raw[name];
    const headers = {};
    for (const name of config.allowHeaders) {
      const key = name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(lowered, key)) headers[key] = lowered[key];
    }
    request = { method: event.request.method, url: event.request.url, headers: headers };
  }

  return {
    send: true, reason: "reported",
    event: {
      fingerprint: event.error.name + ": " + message,
      error: { name: event.error.name, message: message },
      request: request,
      release: event.release
    }
  };
}`,
    expect: "a missing release becomes the string unknown",
  },
};
