/* Wrong-answer cases for a5/0004 — isWithinWindow.
 *
 *   node scripts/verify-lesson.mjs modules/a5-core-token-features/0004-access-rules-ui.html \
 *        --wrong scripts/cases/0004-access-rules-ui.mjs
 *
 * Staged: `exercise-1` is the React Native rule editors and carries its own
 * per-exercise `unverifiable` reason, so only `window` has cases.
 *
 * The first mistake is the one this lesson documents under "When this breaks":
 * validating end > start makes 22:00-06:00 impossible to express, so the
 * engine supports a rule no user can create. The second is the one that ships
 * instead, once someone notices the first: handling the wrap, but forgetting
 * that the morning half belongs to the day the window OPENED on.
 *
 * The DND fixtures list a single day for exactly that reason. With Mon-Fri
 * listed, an implementation that never shifts the day still passes every
 * check, because the neighbouring day is in the list anyway.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const TO_MINUTES = `function toMinutes(hhmm) {
  const parts = hhmm.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}`;

export const stages = {
  window: {
    alternatives: {
      "unrolls the week into absolute minutes and compares ranges": `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  const DAY = 1440;
  const WEEK = 7 * DAY;
  const nowInWeek = at.day * DAY + at.minutes;
  // How long the window runs for, wrapping past midnight when it needs to.
  const span = ((end - start) + DAY) % DAY;

  for (const d of days) {
    const opens = d * DAY + start;
    const closes = opens + span;
    // A window opening on Saturday can close on Sunday, i.e. past the end of
    // the week -- so try the instant shifted a week either way as well.
    for (const shift of [0, WEEK, -WEEK]) {
      const t = nowInWeek + shift;
      if (t >= opens && t < closes) return true;
    }
  }
  return false;
}`,

      "asks the two halves as named questions": `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (!days.length) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  const yesterday = (at.day + 6) % 7;
  const overnight = start > end;

  const openedToday = days.indexOf(at.day) !== -1;
  const openedYesterday = days.indexOf(yesterday) !== -1;

  if (!overnight) {
    return openedToday && at.minutes >= start && at.minutes < end;
  }
  const eveningHalf = openedToday && at.minutes >= start;
  const morningHalf = openedYesterday && at.minutes < end;
  return eveningHalf || morningHalf;
}`,

      "normalises to minutes-since-the-window-opened": `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  const span = ((end - start) + 1440) % 1440;

  for (const d of days) {
    // How far into a window that opened on day d at start_time are we?
    const elapsed = (((at.day - d) * 1440) + (at.minutes - start) + 7 * 1440) % (7 * 1440);
    if (elapsed < span) return true;
  }
  return false;
}`,

      "uses a Set for the day lookup and a ternary for the split": `${TO_MINUTES}
const has = (days, d) => new Set(days).has(d);
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  return start < end
    ? has(days, at.day) && at.minutes >= start && at.minutes < end
    : (has(days, at.day) && at.minutes >= start) ||
      (has(days, (at.day + 6) % 7) && at.minutes < end);
}`,
    },

    mistakes: {
      "refuses to handle a wrap at all — the validation this lesson warns about": {
        expect: "an overnight window works at all in the evening",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  // "end must be after start" -- the obvious validation, and the reason a
  // do-not-disturb inverse cannot be expressed.
  if (end <= start) return false;
  return days.includes(at.day) && at.minutes >= start && at.minutes < end;
}`,
      },

      "handles the wrap but never shifts the day, so this morning counts as tonight": {
        expect: "the morning belongs to YESTERDAY's window, not today's",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;
  if (!days.includes(at.day)) return false;

  return start < end
    ? at.minutes >= start && at.minutes < end
    : at.minutes >= start || at.minutes < end;   // wraps, but on the wrong day
}`,
      },

      "spells yesterday as day - 1, which is -1 on a Sunday": {
        expect: "an overnight window that runs into SUNDAY still works",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  if (start < end) {
    return days.includes(at.day) && at.minutes >= start && at.minutes < end;
  }
  if (days.includes(at.day) && at.minutes >= start) return true;
  return days.includes(at.day - 1) && at.minutes < end;
}`,
      },

      "closes the window inclusively, so adjacent windows overlap by a minute": {
        expect: "the window is CLOSED at end_time",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  if (start < end) {
    return days.includes(at.day) && at.minutes >= start && at.minutes <= end;
  }
  if (days.includes(at.day) && at.minutes >= start) return true;
  return days.includes((at.day + 6) % 7) && at.minutes <= end;
}`,
      },

      "opens the window a minute late by using > instead of >=": {
        expect: "the window opens AT start_time",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;

  if (start < end) {
    return days.includes(at.day) && at.minutes > start && at.minutes < end;
  }
  if (days.includes(at.day) && at.minutes > start) return true;
  return days.includes((at.day + 6) % 7) && at.minutes < end;
}`,
      },

      "reads a zero-length window as all day, turning a narrowing rule into a granting one": {
        expect: "a zero-length window permits nothing",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return days.includes(at.day);   // "same time = all day"

  if (start < end) {
    return days.includes(at.day) && at.minutes >= start && at.minutes < end;
  }
  if (days.includes(at.day) && at.minutes >= start) return true;
  return days.includes((at.day + 6) % 7) && at.minutes < end;
}`,
      },

      "ignores the day list entirely and matches on the clock alone": {
        expect: "an unlisted day is not permitted, whatever the time",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;
  return start < end
    ? at.minutes >= start && at.minutes < end
    : at.minutes >= start || at.minutes < end;
}`,
      },

      "lets an empty day list mean every day": {
        expect: "no days selected permits nothing",
        impl: `${TO_MINUTES}
function isWithinWindow(payload, at) {
  const days = payload.days || [];
  const start = toMinutes(payload.start_time);
  const end = toMinutes(payload.end_time);
  if (start === end) return false;
  // "nothing ticked, so do not filter by day" -- the opposite of narrowing.
  const dayOk = days.length === 0 || days.includes(at.day);
  const openedYesterday = days.length === 0 || days.includes((at.day + 6) % 7);

  if (start < end) return dayOk && at.minutes >= start && at.minutes < end;
  if (dayOk && at.minutes >= start) return true;
  return openedYesterday && at.minutes < end;
}`,
      },

      "compares the HH:MM strings without parsing them to minutes": {
        expect: "an overnight window works at all in the evening",
        impl: `function isWithinWindow(payload, at) {
  const days = payload.days || [];
  if (days.length === 0) return false;
  // Rebuilding "HH:MM" from at.minutes and comparing text happens to order
  // correctly, but the wrap is invisible: start > end just looks like an
  // empty range and every overnight window matches nothing.
  const hh = String(Math.floor(at.minutes / 60)).padStart(2, '0');
  const mm = String(at.minutes % 60).padStart(2, '0');
  const nowText = hh + ':' + mm;
  return days.includes(at.day)
    && nowText >= payload.start_time
    && nowText < payload.end_time;
}`,
      },
    },
  },
};
