/* Wrong-answer cases for 02/0014-message-thread-screen.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0014-message-thread-screen.html \
 *        --wrong scripts/cases/0014-message-thread-screen.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for asks "less than 24 hours ago?" instead of
 * "same calendar day?". It is right for most of the day and wrong for the two
 * hours either side of midnight — which is exactly when a thread is most likely
 * to contain messages from two different days.
 */

const DAY_KEY = `function dayKey(ms) {
  const d = new Date(ms);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return d.getUTCFullYear() + "-" + month + "-" + day;
}`;

export const alternatives = {
  "reduce instead of a loop": `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(now - 86400000);

  return messages.reduce((items, message) => {
    const key = dayKey(message.sentAt);
    const last = items.filter((i) => i.type === "day").pop();
    if (!last || last.id !== "day:" + key) {
      items.push({
        type: "day",
        id: "day:" + key,
        label: key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : key,
      });
    }
    items.push({ type: "message", id: message.id, message });
    return items;
  }, []);
}`,

  "uses toISOString().slice(0, 10) for the key": `function buildThreadItems(messages, now) {
  const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  const todayKey = keyOf(now);
  const yesterdayKey = keyOf(now - 24 * 60 * 60 * 1000);

  const items = [];
  let previous = null;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const key = keyOf(message.sentAt);
    if (key !== previous) {
      let label = key;
      if (key === todayKey) label = "Today";
      else if (key === yesterdayKey) label = "Yesterday";
      items.push({ type: "day", id: "day:" + key, label: label });
      previous = key;
    }
    items.push({ type: "message", id: message.id, message: message });
  }

  return items;
}`,

  "builds the label in a separate helper": `${DAY_KEY}

function labelFor(key, now) {
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(now - 86400000)) return "Yesterday";
  return key;
}

const buildThreadItems = (messages, now) => {
  const items = [];
  let seen = "";
  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== seen) {
      seen = key;
      items.push({ type: "day", id: \`day:\${key}\`, label: labelFor(key, now) });
    }
    items.push({ type: "message", id: message.id, message });
  }
  return items;
};`,
};

export const mistakes = {
  "asks 'less than 24 hours ago' instead of 'same calendar day'": {
    expect: "11pm yesterday is Yesterday, even at 1am",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const items = [];
  let previous = null;

  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== previous) {
      const age = now - message.sentAt;
      const label =
        age < 86400000 ? "Today" :
        age < 172800000 ? "Yesterday" :
        key;
      items.push({ type: "day", id: "day:" + key, label });
      previous = key;
    }
    items.push({ type: "message", id: message.id, message });
  }

  return items;
}`,
  },

  "gets yesterday by subtracting one from the day number": {
    expect: "yesterday works across a month boundary",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const d = new Date(now);
  // "the 1st minus 1" is day 0, not the last day of the previous month.
  const yesterdayKey =
    d.getUTCFullYear() + "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(d.getUTCDate() - 1).padStart(2, "0");

  const items = [];
  let previous = null;
  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== previous) {
      const label = key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : key;
      items.push({ type: "day", id: "day:" + key, label });
      previous = key;
    }
    items.push({ type: "message", id: message.id, message });
  }
  return items;
}`,
  },

  "emits a separator before every message, not just the first of a day": {
    expect: "one separator for a single day",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(now - 86400000);
  const items = [];

  for (const message of messages) {
    const key = dayKey(message.sentAt);
    const label = key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : key;
    items.push({ type: "day", id: "day:" + key, label });
    items.push({ type: "message", id: message.id, message });
  }

  return items;
}`,
  },

  "gives every separator the same id": {
    expect: "every item has a unique id",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(now - 86400000);
  const items = [];
  let previous = null;

  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== previous) {
      const label = key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : key;
      items.push({ type: "day", id: "separator", label });
      previous = key;
    }
    items.push({ type: "message", id: message.id, message });
  }
  return items;
}`,
  },

  "rebuilds the message instead of carrying it through": {
    expect: "message items carry the original object through",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(now - 86400000);
  const items = [];
  let previous = null;

  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== previous) {
      const label = key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : key;
      items.push({ type: "day", id: "day:" + key, label });
      previous = key;
    }
    items.push({
      type: "message",
      id: message.id,
      message: { id: message.id, text: message.text, sentAt: message.sentAt, from: message.from },
    });
  }
  return items;
}`,
  },

  "splices the separators into the messages array itself": {
    expect: "the messages array is not modified",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(now - 86400000);
  let previous = null;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.type === "day") { previous = message.id.slice(4); continue; }
    const key = dayKey(message.sentAt);
    if (key !== previous) {
      const label = key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : key;
      messages.splice(i, 0, { type: "day", id: "day:" + key, label });
      previous = key;
      i++;
    }
  }

  return messages.map((item) =>
    item.type === "day" ? item : { type: "message", id: item.id, message: item });
}`,
  },

  "labels an older day 'Yesterday' because it only compares to today": {
    expect: "older days use the ISO date",
    impl: `${DAY_KEY}

function buildThreadItems(messages, now) {
  const todayKey = dayKey(now);
  const items = [];
  let previous = null;

  for (const message of messages) {
    const key = dayKey(message.sentAt);
    if (key !== previous) {
      const label = key === todayKey ? "Today" : "Yesterday";
      items.push({ type: "day", id: "day:" + key, label });
      previous = key;
    }
    items.push({ type: "message", id: message.id, message });
  }
  return items;
}`,
  },
};
