/**
 * Wrong-answer cases for C2/0002 — validateEnv.
 *
 *   node scripts/verify-lesson.mjs modules/c2-cicd-release/0002-secrets-and-environments.html \
 *        --wrong scripts/cases/0002-secrets-and-environments.mjs
 *
 * A FIXTURE COLLISION CAUGHT WHILE WRITING THIS, worth recording because it is
 * the failure mode these files exist to prevent, aimed at the check instead of
 * the answer. The leak assertion originally used `"short"` as one of the secret
 * values — and `"short"` is a substring of the problem name `"too_short"`, so
 * the check failed against a completely correct implementation. A fixture that
 * collides with the thing under test reports a bug that is not there, and the
 * hour you spend on it is spent looking at correct code.
 *
 * The value is now `"tiny-key"`, and the self-check says why so nobody
 * simplifies it back.
 *
 * AND A GAP THESE CASES FOUND, which is the other half of the same job. The
 * "measured untrimmed" check originally used `"  " + <32-char key>`: 34
 * characters untrimmed and 32 trimmed, so BOTH implementations accepted it and
 * the trimming mistake passed everything. The fixture has to straddle the
 * boundary — it is now 32 characters with 30 of them content, so trimming
 * changes the verdict. **Choose fixture values that differ from what the wrong
 * answer would produce**, or the check is decoration.
 */

export const alternatives = {
  "the three checks as a helper returning one problem or null": `
function problemFor(env, entry) {
  const value = env[entry.name];
  if (value === undefined) return { name: entry.name, problem: "missing", detail: null };
  if (value.trim() === "") return { name: entry.name, problem: "empty", detail: null };
  if (entry.minLength !== undefined && value.length < entry.minLength) {
    return {
      name: entry.name,
      problem: "too_short",
      detail: "needs " + entry.minLength + ", got " + value.length
    };
  }
  return null;
}

function validateEnv(env, spec) {
  const problems = spec.map(function (e) { return problemFor(env, e); })
                       .filter(function (p) { return p !== null; });
  return { ok: problems.length === 0, problems: problems };
}`,

  "reduce, with the guards as early returns inside": `
function validateEnv(env, spec) {
  const problems = spec.reduce(function (acc, entry) {
    const value = env[entry.name];
    if (value === undefined) {
      acc.push({ name: entry.name, problem: "missing", detail: null });
    } else if (!value.trim()) {
      acc.push({ name: entry.name, problem: "empty", detail: null });
    } else if (entry.minLength != null && value.length < entry.minLength) {
      acc.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length
      });
    }
    return acc;
  }, []);

  return { ok: !problems.length, problems: problems };
}`,

  "an index loop, and the detail built with a template literal": `
function validateEnv(env, spec) {
  const problems = [];

  for (let i = 0; i < spec.length; i++) {
    const entry = spec[i];
    const value = env[entry.name];

    if (typeof value === "undefined") {
      problems.push({ name: entry.name, problem: "missing", detail: null });
      continue;
    }
    if (value.trim().length === 0) {
      problems.push({ name: entry.name, problem: "empty", detail: null });
      continue;
    }
    if (entry.minLength && value.length < entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: \`needs \${entry.minLength}, got \${value.length}\`
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
};

export const mistakes = {
  /* The falsy test, which is wrong twice: it collapses two diagnoses into
     one, and it is the habit that made max_uses of 0 mean unlimited. */
  "missing and empty collapsed into one falsy check": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];

  for (const entry of spec) {
    const value = env[entry.name];
    if (!value) {
      problems.push({ name: entry.name, problem: "missing", detail: null });
      continue;
    }
    if (entry.minLength !== undefined && value.length < entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "an empty string is empty, not missing",
  },

  /* No presence guard at all, so the function crashes on precisely the case
     it was written to detect. */
  "the length read before checking the variable exists": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];

  for (const entry of spec) {
    const value = env[entry.name];
    if (value.trim() === "") {
      problems.push({ name: entry.name, problem: "empty", detail: null });
      continue;
    }
    if (entry.minLength !== undefined && value.length < entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "Cannot read properties of undefined",
  },

  /* The helpful message. Every startup log that carries it is then pasted
     into a chat by whoever is debugging the failed deploy. */
  "the value included in the detail to make debugging easier": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];

  for (const entry of spec) {
    const value = env[entry.name];
    if (value === undefined) {
      problems.push({ name: entry.name, problem: "missing", detail: null });
      continue;
    }
    if (value.trim() === "") {
      problems.push({ name: entry.name, problem: "empty", detail: null });
      continue;
    }
    if (entry.minLength !== undefined && value.length < entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got \\"" + value + "\\""
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "no problem anywhere contains the secret value",
  },

  /* The compromise that is entirely on the unsafe side of the line. For a
     32-character key, six characters is nearly a fifth of it. */
  "only a prefix of the value included": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];

  for (const entry of spec) {
    const value = env[entry.name];
    if (value === undefined) {
      problems.push({ name: entry.name, problem: "missing", detail: null });
      continue;
    }
    if (value.trim() === "") {
      problems.push({ name: entry.name, problem: "empty", detail: null });
      continue;
    }
    if (entry.minLength !== undefined && value.length < entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length +
                " (starts with " + value.slice(0, 6) + ")"
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "not even a prefix of it",
  },

  /* Trimming the value before measuring it. A pepper with a trailing space
     is a different pepper, and accepting the trimmed one means every hash
     already stored was computed with something else. */
  "the value trimmed before the length check": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];

  for (const entry of spec) {
    const raw = env[entry.name];
    if (raw === undefined) {
      problems.push({ name: entry.name, problem: "missing", detail: null });
      continue;
    }
    const value = raw.trim();
    if (value === "") {
      problems.push({ name: entry.name, problem: "empty", detail: null });
      continue;
    }
    if (entry.minLength !== undefined && value.length < entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "a value with real content is measured untrimmed",
  },

  /* Throwing at the first problem. Four missing variables become four
     deploys, each one revealing a single fact. */
  "throws on the first problem instead of collecting them": {
    impl: `
function validateEnv(env, spec) {
  for (const entry of spec) {
    const value = env[entry.name];
    if (value === undefined) {
      return { ok: false, problems: [{ name: entry.name, problem: "missing", detail: null }] };
    }
    if (value.trim() === "") {
      return { ok: false, problems: [{ name: entry.name, problem: "empty", detail: null }] };
    }
    if (entry.minLength !== undefined && value.length < entry.minLength) {
      return {
        ok: false,
        problems: [{
          name: entry.name,
          problem: "too_short",
          detail: "needs " + entry.minLength + ", got " + value.length
        }]
      };
    }
  }
  return { ok: true, problems: [] };
}`,
    expect: "all three are reported in one pass, in spec order",
  },

  /* Off by one at the boundary, which rejects a correctly generated key of
     exactly the required length and sends someone hunting for a problem
     that does not exist. */
  "<= instead of < at the minimum length": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];

  for (const entry of spec) {
    const value = env[entry.name];
    if (value === undefined) {
      problems.push({ name: entry.name, problem: "missing", detail: null });
      continue;
    }
    if (value.trim() === "") {
      problems.push({ name: entry.name, problem: "empty", detail: null });
      continue;
    }
    if (entry.minLength !== undefined && value.length <= entry.minLength) {
      problems.push({
        name: entry.name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "a value of exactly minLength is accepted",
  },

  /* Validating everything in the environment rather than everything in the
     spec. PATH, HOME and a hundred others now produce a problem each, on
     every boot, which is how people stop reading startup output. */
  "the environment walked instead of the spec": {
    impl: `
function validateEnv(env, spec) {
  const problems = [];
  const byName = {};
  for (const entry of spec) byName[entry.name] = entry;

  for (const name of Object.keys(env)) {
    const entry = byName[name] || { name: name, minLength: 32 };
    const value = env[name];
    if (value.trim() === "") {
      problems.push({ name: name, problem: "empty", detail: null });
      continue;
    }
    if (value.length < entry.minLength) {
      problems.push({
        name: name,
        problem: "too_short",
        detail: "needs " + entry.minLength + ", got " + value.length
      });
    }
  }

  return { ok: problems.length === 0, problems: problems };
}`,
    expect: "every absent variable is reported as missing",
  },
};
