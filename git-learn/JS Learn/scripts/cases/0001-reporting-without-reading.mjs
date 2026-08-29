/**
 * Wrong-answer cases for C3/0001 — screenReport.
 *
 *   node scripts/verify-lesson.mjs modules/c3-trust-safety/0001-reporting-without-reading.html \
 *        --wrong scripts/cases/0001-reporting-without-reading.mjs
 *
 * WHAT MAKES THIS EXERCISE TESTABLE AT ALL is that config.verify records what
 * it was asked. Two of the rules — "never call verify without a key" and
 * "check each signature against its own author's key" — are statements about
 * a call that did or did not happen, and neither is visible in the return
 * value. A fake that only answers true or false cannot see either of them,
 * and both are the rules with real consequences: verifying against the wrong
 * key rejects honest context, and verifying against no key at all is a
 * question whose answer is whatever undefined happens to produce.
 *
 * Two of the mistakes below fail in the direction of ADMITTING something they
 * should not, and those are the expensive ones — the output of this function
 * is what a human acts on when suspending somebody.
 */

export const alternatives = {
  "the gates as a helper returning a reason or null": `
function exclusionFor(item, report, directory, config) {
  const keys = directory[item.authorId];
  const publicKey = keys ? keys[item.keyVersion] : undefined;
  if (publicKey === undefined) return "unknown_key";
  if (config.verify(item.plaintext, item.signature, publicKey) !== true) return "bad_signature";
  if (item.authorId !== report.reportedUserId && item.authorId !== report.reporterId) {
    return "third_party";
  }
  return null;
}

function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  report.items.forEach(function (item) {
    const reason = exclusionFor(item, report, directory, config);
    if (reason !== null) {
      excluded.push({ messageId: item.messageId, reason: reason });
      return;
    }
    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: item.authorId === report.reportedUserId ? "evidence" : "context",
      plaintext: item.plaintext
    });
  });

  let actionable = false;
  for (const i of items) if (i.role === "evidence") actionable = true;

  return { actionable: actionable, items: items, excluded: excluded };
}`,

  "an index loop with Object.prototype.hasOwnProperty for the lookups": `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];
  const has = function (obj, key) {
    return obj !== undefined && Object.prototype.hasOwnProperty.call(obj, String(key));
  };

  for (let n = 0; n < report.items.length; n++) {
    const item = report.items[n];

    if (!has(directory, item.authorId) || !has(directory[item.authorId], item.keyVersion)) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }

    const publicKey = directory[item.authorId][item.keyVersion];
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const role =
      item.authorId === report.reportedUserId ? "evidence" :
      item.authorId === report.reporterId ? "context" : null;

    if (role === null) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: role,
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.filter(function (i) { return i.role === "evidence"; }).length > 0,
    items: items,
    excluded: excluded
  };
}`,

  "reduce, with the two output arrays carried in the accumulator": `
function screenReport(report, directory, config) {
  const out = report.items.reduce(function (acc, item) {
    const keys = directory[item.authorId];
    const publicKey = keys == null ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      acc.excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      return acc;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      acc.excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      return acc;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      acc.excluded.push({ messageId: item.messageId, reason: "third_party" });
      return acc;
    }

    acc.items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
    return acc;
  }, { items: [], excluded: [] });

  return {
    actionable: out.items.some(function (i) { return i.role === "evidence"; }),
    items: out.items,
    excluded: out.excluded
  };
}`,
};

export const mistakes = {
  /* The gate order swapped. Both exclusions are true of a forged item
     attributed to a stranger, and reporting the wrong one turns an attempt
     to fabricate evidence into what reads like a filing mistake. */
  "the third-party check placed before the signature check": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "a forged item attributed to an outsider is bad_signature",
  },

  /* Verifying with whatever the lookup produced, including undefined. The
     fake here returns false so it merely mislabels; a real verifier might
     throw, and a badly written one might not. Either way the question was
     asked without anything to ask it against. */
  "verify called even when the directory has no key": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({
        messageId: item.messageId,
        reason: publicKey === undefined ? "unknown_key" : "bad_signature"
      });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "verify is never called for an item with no key",
  },

  /* The directory read for the reported user rather than the item's author,
     so every context message is checked against somebody else's key and
     honest reports lose the lines that make them readable. */
  "every signature checked against the reported user's key": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];
  const keys = directory[report.reportedUserId];

  for (const item of report.items) {
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "each signature is checked against its own author's key",
  },

  /* Copy-with-deletions. It looks more careful than an allow-list and keeps
     every field nobody thought of -- here a token code, on its way to a
     review queue, an export and an email. */
  "the admitted item built by copying and deleting": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    const admitted = Object.assign({}, item);
    delete admitted.signature;
    delete admitted.keyVersion;
    admitted.role = isReported ? "evidence" : "context";
    items.push(admitted);
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "the token code never reaches the output",
  },

  /* The role written onto the caller's object. It happens to produce the
     right output and it has edited the submitted report, which is the one
     record of what was actually sent. */
  "the role assigned onto the incoming item": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    item.role = isReported ? "evidence" : "context";
    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: item.role,
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "the submitted report is not modified",
  },

  /* actionable computed from the admitted count, so a report containing
     nothing but the reporter's own words is presented to a human as
     something to act on. */
  "actionable computed from the number of admitted items": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
  }

  return { actionable: items.length > 0, items: items, excluded: excluded };
}`,
    expect: "a report of only the reporter's own messages is not actionable",
  },

  /* The reporter's own messages thrown out as third_party. Every report
     arrives stripped of the lines that make the complaint legible, and the
     reviewer sees one sentence with no conversation around it. */
  "the reporter's own messages excluded as third_party": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }
    if (item.authorId !== report.reportedUserId) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: "evidence",
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "a message from the reported user is evidence",
  },

  /* Everything admitted as evidence, so the reporter's own lines are
     presented to a reviewer as things the reported party said. This is the
     failure that ends with the wrong person suspended for their accuser's
     words. */
  "every admitted item marked as evidence": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: "evidence",
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "a message from the reported user is evidence",
  },

  /* A report with nothing usable thrown away entirely. It cannot be acted
     on, which is not the same as it never having happened -- and who files
     empty reports against whom is one of the few things a system that
     cannot read content can see. */
  "an unactionable report returned empty": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    const keys = directory[item.authorId];
    const publicKey = keys === undefined ? undefined : keys[item.keyVersion];

    if (publicKey === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
  }

  const actionable = items.some(function (i) { return i.role === "evidence"; });
  if (!actionable) return { actionable: false, items: [], excluded: [] };

  return { actionable: actionable, items: items, excluded: excluded };
}`,
    expect: "and is still returned rather than discarded",
  },

  /* The lookup guarded only at the first level, so a user the directory
     knows -- at some OTHER version -- reaches the verifier with an
     undefined key. The two failures share a gate for a reason.

     Note how this one fails, because it is the worst outcome in the file:
     the fake verifier answers from the signature and ignores the key, so
     the item is ADMITTED AS EVIDENCE with nothing having been verified at
     all. A real verifier would presumably throw or return false -- but
     "presumably" is the whole problem. The rule is not to ask the question
     without a key, rather than to hope the answer is safe. */
  "only the first level of the key lookup guarded": {
    impl: `
function screenReport(report, directory, config) {
  const items = [];
  const excluded = [];

  for (const item of report.items) {
    if (directory[item.authorId] === undefined) {
      excluded.push({ messageId: item.messageId, reason: "unknown_key" });
      continue;
    }

    const publicKey = directory[item.authorId][item.keyVersion];
    if (!config.verify(item.plaintext, item.signature, publicKey)) {
      excluded.push({ messageId: item.messageId, reason: "bad_signature" });
      continue;
    }

    const isReported = item.authorId === report.reportedUserId;
    const isReporter = item.authorId === report.reporterId;
    if (!isReported && !isReporter) {
      excluded.push({ messageId: item.messageId, reason: "third_party" });
      continue;
    }

    items.push({
      messageId: item.messageId,
      authorId: item.authorId,
      role: isReported ? "evidence" : "context",
      plaintext: item.plaintext
    });
  }

  return {
    actionable: items.some(function (i) { return i.role === "evidence"; }),
    items: items,
    excluded: excluded
  };
}`,
    expect: "an unknown key version and an unknown user are both unknown_key",
  },
};
