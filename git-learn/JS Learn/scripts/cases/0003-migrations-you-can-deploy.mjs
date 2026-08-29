/**
 * Wrong-answer cases for C2/0003 — reviewPlan.
 *
 *   node scripts/verify-lesson.mjs modules/c2-cicd-release/0003-migrations-you-can-deploy.html \
 *        --wrong scripts/cases/0003-migrations-you-can-deploy.mjs
 *
 * A GAP THESE CASES FOUND, recorded because it is the reason the file exists.
 * The "two subjects at once" fixture originally ran expand, expand, code,
 * code, contract, contract — which is globally in phase order, so an
 * implementation tracking ONE highest-phase variable for the whole plan passed
 * it. The fixture now starts the second subject's expand *after* the first
 * subject's code step, which is what two migrations written in the same
 * release actually look like, and it is the only arrangement that can tell a
 * per-subject tracker from a global one.
 *
 * The same failure direction runs through most of the mistakes below: a
 * reviewer that shares state between subjects wrongly says YES. It approves a
 * drop, and the drop is the step that cannot be undone.
 */

export const alternatives = {
  "Maps instead of plain objects, and a rank lookup by indexOf": `
const PHASES = ["expand", "backfill", "code", "contract"];

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = new Map();
  const lastCode = new Map();
  let highestRelease = -Infinity;

  for (const s of steps) {
    const rank = PHASES.indexOf(s.kind);
    if (s.kind === "contract") irreversible.push(s.name);

    if (s.release < highestRelease) {
      violations.push({ step: s.name, problem: "releases_go_backwards" });
    } else if (highestPhase.has(s.subject) && rank < highestPhase.get(s.subject)) {
      violations.push({ step: s.name, problem: "wrong_phase_order" });
    } else if (s.kind === "contract" && !lastCode.has(s.subject)) {
      violations.push({ step: s.name, problem: "contract_without_code" });
    } else if (s.kind === "contract" && s.release <= lastCode.get(s.subject)) {
      violations.push({ step: s.name, problem: "contract_not_deferred" });
    }

    highestRelease = Math.max(highestRelease, s.release);
    highestPhase.set(s.subject, Math.max(rank, highestPhase.has(s.subject) ? highestPhase.get(s.subject) : rank));
    if (s.kind === "code") lastCode.set(s.subject, s.release);
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,

  "an index loop, with the problem chosen by a helper returning a string or null": `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function problemFor(step, state) {
  if (step.release < state.highestRelease) return "releases_go_backwards";
  const seen = state.highestPhase[step.subject];
  if (seen !== undefined && RANK[step.kind] < seen) return "wrong_phase_order";
  if (step.kind !== "contract") return null;
  if (!(step.subject in state.lastCode)) return "contract_without_code";
  if (step.release <= state.lastCode[step.subject]) return "contract_not_deferred";
  return null;
}

function reviewPlan(steps) {
  const state = { highestRelease: -Infinity, highestPhase: {}, lastCode: {} };
  const violations = [];
  const irreversible = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind === "contract") irreversible.push(step.name);

    const problem = problemFor(step, state);
    if (problem !== null) violations.push({ step: step.name, problem: problem });

    if (step.release > state.highestRelease) state.highestRelease = step.release;
    const seen = state.highestPhase[step.subject];
    if (seen === undefined || RANK[step.kind] > seen) state.highestPhase[step.subject] = RANK[step.kind];
    if (step.kind === "code") state.lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,

  "reduce, carrying the running values in the accumulator": `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const out = steps.reduce(function (acc, s) {
    const rank = RANK[s.kind];
    if (s.kind === "contract") acc.irreversible.push(s.name);

    if (s.release < acc.highestRelease) {
      acc.violations.push({ step: s.name, problem: "releases_go_backwards" });
    } else if (acc.phase[s.subject] != null && rank < acc.phase[s.subject]) {
      acc.violations.push({ step: s.name, problem: "wrong_phase_order" });
    } else if (s.kind === "contract" && acc.code[s.subject] == null) {
      acc.violations.push({ step: s.name, problem: "contract_without_code" });
    } else if (s.kind === "contract" && s.release <= acc.code[s.subject]) {
      acc.violations.push({ step: s.name, problem: "contract_not_deferred" });
    }

    if (s.release > acc.highestRelease) acc.highestRelease = s.release;
    if (acc.phase[s.subject] == null || rank > acc.phase[s.subject]) acc.phase[s.subject] = rank;
    if (s.kind === "code") acc.code[s.subject] = s.release;
    return acc;
  }, { violations: [], irreversible: [], phase: {}, code: {}, highestRelease: -Infinity });

  return { ok: out.violations.length === 0, violations: out.violations, irreversible: out.irreversible };
}`,

  "the per-subject state looked up from the steps already walked, rather than carried": `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const before = steps.slice(0, i);
    const sameSubject = before.filter(function (s) { return s.subject === step.subject; });
    const codes = sameSubject.filter(function (s) { return s.kind === "code"; });

    if (step.kind === "contract") irreversible.push(step.name);

    const highestRelease = before.length === 0
      ? -Infinity
      : Math.max.apply(null, before.map(function (s) { return s.release; }));
    const highestPhase = sameSubject.length === 0
      ? null
      : Math.max.apply(null, sameSubject.map(function (s) { return RANK[s.kind]; }));

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase !== null && RANK[step.kind] < highestPhase) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && codes.length === 0) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= codes[codes.length - 1].release) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
};

export const mistakes = {
  /* One running variable for the whole plan. A code step for the label
     column then authorises a drop of the rules column -- and note the
     direction: it wrongly says YES, about the step that cannot be undone. */
  "the last code release tracked globally instead of per subject": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  let highestRelease = -Infinity;
  let lastCode;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && lastCode === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= lastCode) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "one subject's code step does not authorise another's drop",
  },

  /* The same sharing, one layer up: phases tracked for the whole plan, so a
     second migration starting at expand inside the same release is called
     out of order. This one is wrongly NO rather than wrongly yes, which is
     how it survives review -- it looks strict. */
  "the phase tracked globally instead of per subject": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const lastCode = {};
  let highestRelease = -Infinity;
  let highestPhase;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase !== undefined && rank < highestPhase) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= lastCode[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase === undefined || rank > highestPhase) highestPhase = rank;
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "one subject's phase does not constrain another's",
  },

  /* The absence folded into the comparison by giving it a starting number.
     Any release is greater than -Infinity, so a drop that nothing ever
     stopped using sails through. */
  "contract_without_code folded into the release comparison": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    const seenCode = lastCode[step.subject] === undefined ? -Infinity : lastCode[step.subject];

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && step.release <= seenCode) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "a drop with nothing having switched over is contract_without_code",
  },

  /* Strictly-less instead of less-or-equal, which permits the exact case the
     rule exists for: the drop in the same release as the switchover. */
  "< instead of <= on the deferred-release check": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release < lastCode[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "a drop in the same release as the code is a violation",
  },

  /* Assigning this step's own values at the top of the loop, so every
     comparison below is a value against itself and can never fire. A check
     that is always green is the worst kind there is.

     Note what the first draft of this case got wrong, because it is a real
     trap: updating the running values before the checks is harmless AS LONG
     AS the update is a maximum, since max(a, x) < a and x < a agree. Only a
     plain assignment breaks it. "Update after" is good advice; "updating
     before is a bug" is not true on its own. */
  "the running values assigned at the top of the loop instead of the bottom": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    highestRelease = step.release;
    highestPhase[step.subject] = rank;

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= lastCode[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "a release going backwards outranks the contract rules",
  },

  /* The contract rules checked first. Both problems are true of that step;
     the precedence decides which one is reported, and the one to report is
     the one whose fix changes what the other says. */
  "the contract rules checked before the release ordering": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= lastCode[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    } else if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "a release going backwards outranks the contract rules",
  },

  /* Every applicable rule reported, so one step produces two rows. The
     second is a consequence of the first and disappears when it is fixed,
     which is the definition of noise in a report someone has to act on. */
  "every applicable problem pushed rather than the first": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    }
    if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    }
    if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    }
    if (step.kind === "contract" && step.release <= lastCode[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "a release going backwards outranks the contract rules",
  },

  /* Safety and reversibility collapsed into one answer. A plan whose only
     property is that it destroys something is reported as not ok, so the
     word stops meaning "safe to run" and starts meaning nothing in
     particular. */
  "ok computed from the irreversible list instead of the violations": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= lastCode[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return {
    ok: violations.length === 0 && irreversible.length === 0,
    violations: violations,
    irreversible: irreversible
  };
}`,
    expect: "a correct expand/contract plan has no violations",
  },

  /* The irreversible list built only from steps that passed. Running an
     unsafe drop destroys the column exactly as thoroughly as running a safe
     one, so the person holding the release still needs to be told. */
  "only valid contract steps recorded as irreversible": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  const lastCode = {};
  let highestRelease = -Infinity;

  for (const step of steps) {
    const rank = RANK[step.kind];
    let problem = null;

    if (step.release < highestRelease) {
      problem = "releases_go_backwards";
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      problem = "wrong_phase_order";
    } else if (step.kind === "contract" && lastCode[step.subject] === undefined) {
      problem = "contract_without_code";
    } else if (step.kind === "contract" && step.release <= lastCode[step.subject]) {
      problem = "contract_not_deferred";
    }

    if (problem !== null) violations.push({ step: step.name, problem: problem });
    else if (step.kind === "contract") irreversible.push(step.name);

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
    if (step.kind === "code") lastCode[step.subject] = step.release;
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "an unsafe drop is still reported as irreversible",
  },

  /* The last code step for a subject taken from the whole plan rather than
     from the steps before this one. A code step written after the drop --
     which is itself the phase-order bug -- then defends it. */
  "the code release looked up across the whole plan, not the part already walked": {
    impl: `
const RANK = { expand: 0, backfill: 1, code: 2, contract: 3 };

function reviewPlan(steps) {
  const violations = [];
  const irreversible = [];
  const highestPhase = {};
  let highestRelease = -Infinity;

  const codes = {};
  for (const s of steps) if (s.kind === "code") codes[s.subject] = s.release;

  for (const step of steps) {
    const rank = RANK[step.kind];
    if (step.kind === "contract") irreversible.push(step.name);

    if (step.release < highestRelease) {
      violations.push({ step: step.name, problem: "releases_go_backwards" });
    } else if (highestPhase[step.subject] !== undefined && rank < highestPhase[step.subject]) {
      violations.push({ step: step.name, problem: "wrong_phase_order" });
    } else if (step.kind === "contract" && codes[step.subject] === undefined) {
      violations.push({ step: step.name, problem: "contract_without_code" });
    } else if (step.kind === "contract" && step.release <= codes[step.subject]) {
      violations.push({ step: step.name, problem: "contract_not_deferred" });
    }

    if (step.release > highestRelease) highestRelease = step.release;
    if (highestPhase[step.subject] === undefined || rank > highestPhase[step.subject]) {
      highestPhase[step.subject] = rank;
    }
  }

  return { ok: violations.length === 0, violations: violations, irreversible: irreversible };
}`,
    expect: "each offending step is reported once, in step order",
  },
};
