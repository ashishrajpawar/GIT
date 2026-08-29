/**
 * Wrong-answer cases for C7/0003 — summariseWindow.
 *
 *   node scripts/verify-lesson.mjs modules/c7-observability/0003-metrics-that-answer-a-question.html \
 *        --wrong scripts/cases/0003-metrics-that-answer-a-question.mjs
 *
 * THE FIXTURE IS THE EXERCISE. Durations 1..19 plus one 2000 were chosen so
 * that three separate wrong answers each produce a DIFFERENT number:
 *
 *   - a textual sort puts 10, 100, 11 ... before 2 and 9, so p50 comes out as
 *     18 instead of 10. With durations of uniform digit length — 100, 200,
 *     300 — the default sort and a numeric sort agree completely, and the
 *     commonest bug in any hand-written percentile passes unnoticed.
 *   - the mean is 109.5 against a median of 10, so an implementation
 *     reporting a mean for p50 is caught rather than being nearly right.
 *   - the single 2000 makes p95 and p99 different values (19 and 2000), so
 *     an off-by-one in the rank shows up at the tail, which is the only place
 *     it ever shows up.
 *
 * THE MUTATION CHECK TOOK TWO GOES TO WRITE, and both failures are worth
 * recording because they are the standard ones and they were made here
 * anyway. `sort` returns the same array it rearranged, so an implementation
 * sorting `samples` directly produces perfectly correct output and has
 * silently reordered its input — a defect with no symptom in the return
 * value, which is exactly why it needs a check of its own.
 *
 *   1. The snapshot of the "original" order was taken from a window the
 *      summariser had ALREADY been called on, so the sorting had happened
 *      before the baseline was recorded and the check compared a sorted
 *      array with itself. **Snapshot before first use** — the same trap
 *      SESSION.md lists, walked into regardless.
 *   2. The fixture was emitted in ascending order, so sorting it in place
 *      left it identical. It is now descending, and the comment in the
 *      lesson says why so nobody tidies it back.
 *
 * Both are the same underlying error: an assertion whose two sides cannot
 * differ is an assertion that always passes.
 */

export const alternatives = {
  "a reduce for the pass, and a Map of Sets for the labels": `
function summariseWindow(samples, policy) {
  if (samples.length === 0) {
    return {
      count: 0, errors: 0, errorRate: null,
      p50: null, p95: null, p99: null, labels: {}, rejected: []
    };
  }

  const state = samples.reduce(function (acc, s) {
    if (s.ok === false) acc.errors += 1;
    acc.durations.push(s.durationMs);
    if (s.labels) {
      Object.keys(s.labels).forEach(function (name) {
        if (!acc.values.has(name)) acc.values.set(name, new Set());
        acc.values.get(name).add(s.labels[name]);
      });
    }
    return acc;
  }, { errors: 0, durations: [], values: new Map() });

  const sorted = state.durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  state.values.forEach(function (set, name) {
    if (set.size > policy.maxDistinctPerLabel) rejected.push(name);
    else labels[name] = set.size;
  });

  return {
    count: samples.length,
    errors: state.errors,
    errorRate: state.errors / samples.length,
    p50: at(50), p95: at(95), p99: at(99),
    labels: labels, rejected: rejected
  };
}`,

  "separate passes, with slice() before the sort and an array of seen names": `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return {
      count: 0, errors: 0, errorRate: null,
      p50: null, p95: null, p99: null, labels: {}, rejected: []
    };
  }

  const errors = samples.filter(function (s) { return s.ok === false; }).length;

  const durations = samples.map(function (s) { return s.durationMs; });
  const sorted = durations.slice().sort(function (a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  function percentile(p) {
    let rank = Math.ceil((p / 100) * sorted.length);
    if (rank < 1) rank = 1;
    if (rank > sorted.length) rank = sorted.length;
    return sorted[rank - 1];
  }

  const seen = [];
  const distinct = {};
  for (const s of samples) {
    if (!s.labels) continue;
    for (const name of Object.keys(s.labels)) {
      if (distinct[name] === undefined) { distinct[name] = []; seen.push(name); }
      if (distinct[name].indexOf(s.labels[name]) === -1) distinct[name].push(s.labels[name]);
    }
  }

  const labels = {};
  const rejected = [];
  for (const name of seen) {
    if (distinct[name].length > policy.maxDistinctPerLabel) rejected.push(name);
    else labels[name] = distinct[name].length;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: percentile(50), p95: percentile(95), p99: percentile(99),
    labels: labels, rejected: rejected
  };
}`,

  "an index loop, and the percentiles computed once into an object": `
function summariseWindow(samples, policy) {
  if (!samples.length) {
    return {
      count: 0, errors: 0, errorRate: null,
      p50: null, p95: null, p99: null, labels: {}, rejected: []
    };
  }

  let errors = 0;
  const durations = [];
  const values = {};

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    const ls = s.labels;
    if (ls !== undefined && ls !== null) {
      const names = Object.keys(ls);
      for (let j = 0; j < names.length; j++) {
        const n = names[j];
        if (!values[n]) values[n] = new Set();
        values[n].add(ls[n]);
      }
    }
  }

  durations.sort(function (a, b) { return a - b; });

  const pick = function (p) {
    const rank = Math.ceil(durations.length * p / 100);
    return durations[(rank < 1 ? 1 : rank) - 1];
  };
  const ps = { p50: pick(50), p95: pick(95), p99: pick(99) };

  const labels = {};
  const rejected = [];
  for (const name of Object.keys(values)) {
    const n = values[name].size;
    if (n > policy.maxDistinctPerLabel) rejected.push(name);
    else labels[name] = n;
  }

  return {
    count: samples.length, errors: errors, errorRate: errors / samples.length,
    p50: ps.p50, p95: ps.p95, p99: ps.p99,
    labels: labels, rejected: rejected
  };
}`,
};

export const mistakes = {
  /* The default comparator. It never throws, the output is plausible, and
     every percentile is wrong -- which is why the fixture uses durations of
     mixed digit length. */
  "the durations sorted with the default comparator": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.sort();
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "p50 is the middle by numeric order",
  },

  /* The caller's samples sorted in place. The returned numbers are entirely
     correct and the input has been rearranged -- a defect with no symptom
     in the return value at all. */
  "the caller's samples sorted directly": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  samples.sort(function (a, b) { return a.durationMs - b.durationMs; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * samples.length);
    return samples[Math.max(1, Math.min(rank, samples.length)) - 1].durationMs;
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "the caller's samples are not reordered",
  },

  /* The empty window given a zero error rate. Plausible, and it means a
     service receiving nothing at all reports perfect health -- the alert
     watching that number can never fire. */
  "an empty window reported as a zero error rate": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: 0, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "an empty window has a null error rate, not zero",
  },

  /* floor instead of ceil on the rank. Invisible on smooth data and wrong
     at the tail, which is the only place a percentile is ever read. */
  "floor instead of ceil on the rank": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.floor((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "p95 and p99 reach the tail",
  },

  /* The rank used as an index without converting from one-based to
     zero-based, so every percentile is one position too high and p99 walks
     off the end of the array. */
  "the one-based rank used directly as an array index": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.min(rank, sorted.length - 1)];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "p50 is the middle by numeric order",
  },

  /* The mean reported as p50. Nineteen fast requests and one lock wait give
     109.5 against a median of 10, so the number is real and describes
     nobody. */
  "the mean reported as the median": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.slice().sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };
  const mean = durations.reduce(function (a, b) { return a + b; }, 0) / count;

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: mean, p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "p50 is the middle by numeric order",
  },

  /* Occurrences counted rather than distinct values, so a bounded label on
     a busy route is rejected for being popular. The series count follows
     the distinct values and nothing else. */
  "label occurrences counted rather than distinct values": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        values[n] = (values[n] || 0) + 1;
      }
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n] > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n];
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "a label is counted by its distinct values, not its occurrences",
  },

  /* >= at the budget, so a status-class label with exactly three values is
     thrown out -- the number you chose and the behaviour you get differ by
     one whole label. */
  ">= against the cardinality budget instead of >": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size >= policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "exactly maxDistinctPerLabel is allowed",
  },

  /* A rejected label reported AND kept. The per-user label is flagged and
     still emitted, which is the one outcome worse than either alone --
     it looks handled. */
  "a rejected label listed but still emitted": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    if (s.labels) {
      for (const n of Object.keys(s.labels)) {
        if (!values[n]) values[n] = new Set();
        values[n].add(s.labels[n]);
      }
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    labels[n] = values[n].size;
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "and does not appear among the accepted labels",
  },

  /* No guard for a sample without labels, so one handler written before the
     label convention existed takes out the summary for every other path
     too. */
  "no guard for a sample that carries no labels": {
    impl: `
function summariseWindow(samples, policy) {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, errors: 0, errorRate: null, p50: null, p95: null, p99: null, labels: {}, rejected: [] };
  }

  let errors = 0;
  const durations = [];
  const values = {};
  for (const s of samples) {
    if (s.ok === false) errors++;
    durations.push(s.durationMs);
    for (const n of Object.keys(s.labels)) {
      if (!values[n]) values[n] = new Set();
      values[n].add(s.labels[n]);
    }
  }

  const sorted = durations.sort(function (a, b) { return a - b; });
  const at = function (p) {
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(1, Math.min(rank, sorted.length)) - 1];
  };

  const labels = {};
  const rejected = [];
  for (const n of Object.keys(values)) {
    if (values[n].size > policy.maxDistinctPerLabel) rejected.push(n);
    else labels[n] = values[n].size;
  }

  return {
    count: count, errors: errors, errorRate: errors / count,
    p50: at(50), p95: at(95), p99: at(99), labels: labels, rejected: rejected
  };
}`,
    expect: "Cannot convert undefined or null to object",
  },
};
