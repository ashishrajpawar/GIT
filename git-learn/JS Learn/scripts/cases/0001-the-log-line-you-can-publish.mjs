/**
 * Wrong-answer cases for C7/0001 — buildLogLine.
 *
 *   node scripts/verify-lesson.mjs modules/c7-observability/0001-the-log-line-you-can-publish.html \
 *        --wrong scripts/cases/0001-the-log-line-you-can-publish.mjs
 *
 * THE TWO FIXTURES THAT DO THE DISCRIMINATING, both of which exist because
 * the obvious test passes against the wrong answer:
 *
 *   - the SAME fields with the allow-list in two different orders. Filtering
 *     the caller's object and walking the allow-list produce identical KEYS,
 *     so only the ordering separates them — and the ordering is the visible
 *     shadow of the property that actually matters, which is whether an
 *     unlisted field has any path into the output at all.
 *   - a code in a DROPPED field. Scanning the input and scanning the output
 *     agree on every payload where the code is somewhere that survives; they
 *     part company only here, and the input-scanner throws away a line that
 *     was already safe.
 *
 * `config.looksLikeCode` records every value it is handed, because two of the
 * rules are statements about calls rather than about the return value and a
 * predicate that only answers true or false cannot express either. Same
 * technique as the recording verifier in C3/0001.
 *
 * AND THAT ASSERTION HAD TO BE SHARPENED. It first read "every recorded value
 * is a string", which the `String(value)` mistake below passes trivially — it
 * hands the predicate a string every single time and has still asked it about
 * 42, true and null. The check now names the two strings that should have been
 * seen and requires exactly those. **An assertion about a type is much weaker
 * than an assertion about a value**, and the difference is invisible until a
 * wrong answer walks straight through it.
 */

export const alternatives = {
  "a reduce over the allow-list, and a recursive scan written as a switch on type": `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    switch (true) {
      case typeof value === "string": return config.looksLikeCode(value);
      case value === null: return false;
      case Array.isArray(value): return value.some(scan);
      case typeof value === "object":
        return Object.keys(value).some(function (k) { return scan(value[k]); });
      default: return false;
    }
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;

  const line = allow.reduce(function (acc, name) {
    if (name !== "requestId" && has(fields, name)) acc[name] = fields[name];
    return acc;
  }, { requestId: requestId });

  const dropped = [];
  Object.keys(fields).forEach(function (name) {
    if (name !== "requestId" && !allow.includes(name)) dropped.push(name);
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,

  "an explicit stack instead of recursion, and a Set for the allow-list": `
function buildLogLine(fields, allow, config) {
  const permitted = new Set(allow);
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  const requestId = has(fields, "requestId") ? fields.requestId : null;

  const line = { requestId: requestId };
  for (let i = 0; i < allow.length; i++) {
    const name = allow[i];
    if (name === "requestId") continue;
    if (has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && !permitted.has(name);
  });

  let blocked = false;
  const stack = [line];
  while (stack.length > 0 && !blocked) {
    const value = stack.pop();
    if (typeof value === "string") {
      if (config.looksLikeCode(value)) blocked = true;
    } else if (value !== null && typeof value === "object") {
      const inner = Array.isArray(value) ? value : Object.keys(value).map(function (k) {
        return value[k];
      });
      for (const v of inner) stack.push(v);
    }
  }

  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,

  "the scan as a standalone helper taking the predicate, and entries() for the line": `
function reachesACode(value, looksLikeCode) {
  if (typeof value === "string") return looksLikeCode(value);
  if (value === null || typeof value !== "object") return false;
  const inner = Array.isArray(value) ? value : Object.values(value);
  for (const v of inner) {
    if (reachesACode(v, looksLikeCode)) return true;
  }
  return false;
}

function buildLogLine(fields, allow, config) {
  const entries = Object.entries(fields);
  const requestId = entries.some(function (e) { return e[0] === "requestId"; })
    ? fields.requestId
    : null;

  const line = { requestId: requestId };
  for (const name of allow) {
    if (name === "requestId") continue;
    const found = entries.find(function (e) { return e[0] === name; });
    if (found !== undefined) line[name] = found[1];
  }

  const dropped = entries
    .filter(function (e) { return e[0] !== "requestId" && allow.indexOf(e[0]) === -1; })
    .map(function (e) { return e[0]; });

  const blocked = reachesACode(line, config.looksLikeCode);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
};

export const mistakes = {
  /* The whole point of the lesson. A shallow scan sees the container, calls
     it an object, and stops -- so a code sitting one level down inside an
     allow-listed row is emitted with every field technically permitted. */
  "the scan looking only at the top level of the line": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  const requestId = has(fields, "requestId") ? fields.requestId : null;

  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = Object.keys(line).some(function (k) {
    return typeof line[k] === "string" && config.looksLikeCode(line[k]);
  });

  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "a code inside an allowed object blocks the line",
  },

  /* Objects walked but arrays treated as leaves, so a batch of rows -- the
     commonest shape in any bulk log line -- passes untouched. */
  "arrays not walked, only plain objects": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return false;
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "a code inside an array inside an object still blocks",
  },

  /* Scanning what was handed in rather than what is about to go out. It
     blocks on a code the allow-list had already removed, which discards a
     safe line -- and a logger that eats good lines is a logger people route
     around. */
  "the scan run over the incoming fields instead of the assembled line": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(fields);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "a code in a dropped field does not block the line",
  },

  /* The caller's object filtered rather than the allow-list walked. Same
     keys, different order -- and the ordering is the visible shadow of the
     property that matters, which is that nothing unlisted is ever copied. */
  "the caller's fields filtered rather than the allow-list walked": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of Object.keys(fields)) {
    if (name !== "requestId" && allow.indexOf(name) !== -1) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "the line's field order follows the allow-list",
  },

  /* Copy first, remove afterwards. Everything is present before anything is
     taken away, so any bug in the removal leaks -- and the ordering is the
     caller's too. */
  "the line spread from the fields and then narrowed": {
    impl: `
function buildLogLine(fields, allow, config) {
  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = Object.prototype.hasOwnProperty.call(fields, "requestId")
    ? fields.requestId
    : null;

  const line = Object.assign({}, fields);
  for (const name of Object.keys(line)) {
    if (name !== "requestId" && allow.indexOf(name) === -1) delete line[name];
  }
  line.requestId = requestId;

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "the line's field order follows the allow-list",
  },

  /* requestId honoured only when the allow-list happens to mention it, so
     the one field that ties a line to a request disappears at exactly the
     log points whose allow-list is shortest. */
  "requestId included only when the allow-list names it": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = {};
  for (const name of allow) {
    if (has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "requestId survives an empty allow-list",
  },

  /* The blocked line keeps its other fields. It is the reasonable-looking
     compromise -- redact the offending value, keep the useful ones -- and it
     cannot work, because the scan knows a code is in there and not where. */
  "the blocked line keeping its remaining fields": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  if (blocked) line.blocked = "token_code";

  return { line: line, dropped: dropped, blocked: blocked };
}`,
    expect: "and the blocked line carries only requestId and the reason",
  },

  /* The predicate handed every value, not only strings. A real
     implementation would be a regex test, and String(null) or
     String({}) is a question nobody meant to ask. */
  "looksLikeCode called with every value rather than only strings": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (value !== null && typeof value === "object") {
      const inner = Array.isArray(value) ? value : Object.keys(value).map(function (k) {
        return value[k];
      });
      return inner.some(scan);
    }
    return config.looksLikeCode(String(value));
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "looksLikeCode sees the two real strings and nothing else",
  },

  /* An allowed name the caller did not supply written in as undefined. It
     is noise in every query that filters on that field, and log pipelines
     disagree about how to serialise it. */
  "every allow-listed name written in, present or not": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId") line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "an allowed field the caller omitted does not appear as undefined",
  },

  /* requestId reported as dropped whenever the allow-list does not name it.
     Harmless-looking, and it means the field that is ALWAYS kept shows up
     in the list of things that were thrown away. */
  "requestId counted as dropped when it is not in the allow-list": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const dropped = Object.keys(fields).filter(function (name) {
    return allow.indexOf(name) === -1;
  });

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "and requestId is not reported as dropped",
  },

  /* The caller's object edited on the way past. It produces the right
     output and it has changed a structure the caller is still using -- and
     a logger with a side effect is a bug that only appears under load. */
  "the fields object edited while assembling the line": {
    impl: `
function buildLogLine(fields, allow, config) {
  const has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function scan(value) {
    if (typeof value === "string") return config.looksLikeCode(value);
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(scan);
    return Object.keys(value).some(function (k) { return scan(value[k]); });
  }

  const requestId = has(fields, "requestId") ? fields.requestId : null;
  const dropped = Object.keys(fields).filter(function (name) {
    return name !== "requestId" && allow.indexOf(name) === -1;
  });

  for (const name of dropped) delete fields[name];

  const line = { requestId: requestId };
  for (const name of allow) {
    if (name !== "requestId" && has(fields, name)) line[name] = fields[name];
  }

  const blocked = scan(line);
  return {
    line: blocked ? { requestId: requestId, blocked: "token_code" } : line,
    dropped: dropped,
    blocked: blocked
  };
}`,
    expect: "the caller's fields and allow-list are not modified",
  },
};
