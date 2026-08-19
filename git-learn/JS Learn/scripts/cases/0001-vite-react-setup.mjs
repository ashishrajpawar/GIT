/* Wrong-answer cases for a8/0001 — checkWebEnv.
 *
 *   node scripts/verify-lesson.mjs modules/a8-redemption-web/0001-vite-react-setup.html \
 *        --wrong scripts/cases/0001-vite-react-setup.mjs
 *
 * Staged: `exercise-1` is a Vite project, a Dockerfile and an nginx config and
 * carries its own per-exercise `unverifiable` reason, so only `env` has cases.
 *
 * Two mistakes here are mirror images and both matter. Scanning EVERY key for
 * secret-looking names fires on TOKEN_CODE_PEPPER — a variable that is being
 * handled correctly, since it has no VITE_ prefix and Vite never exposes it.
 * A check that cries wolf on correct configuration gets switched off, and then
 * it is not there for VITE_API_KEY either. Scanning nothing, of course, ships
 * the key.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const WORDS = `['SECRET', 'KEY', 'PASSWORD', 'PEPPER', 'PRIVATE', 'CREDENTIAL']`;

export const stages = {
  env: {
    alternatives: {
      "collects errors with filter and flatMap": `const SECRET_WORDS = ${WORDS};
const isBlank = (v) => typeof v !== 'string' || v.trim() === '';

function checkWebEnv(env, mode) {
  const source = env || {};

  const missing = ['VITE_API_URL', 'VITE_WS_URL']
    .filter((name) => isBlank(source[name]))
    .map((name) => name + ' is required');

  const leaked = Object.keys(source)
    .filter((k) => k.startsWith('VITE_'))
    .filter((k) => SECRET_WORDS.some((w) => k.toUpperCase().includes(w)))
    .map((k) => k + ' would be inlined into the bundle');

  const insecure = [];
  if (mode === 'production') {
    if (!isBlank(source.VITE_API_URL) && !source.VITE_API_URL.startsWith('https://')) {
      insecure.push('VITE_API_URL must be https:// in production');
    }
    if (!isBlank(source.VITE_WS_URL) && !source.VITE_WS_URL.startsWith('wss://')) {
      insecure.push('VITE_WS_URL must be wss:// in production');
    }
  }

  const errors = [...missing, ...leaked, ...insecure];
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,

      "uses a regex for the secret words and a table for the schemes": `const SECRET_RE = /SECRET|KEY|PASSWORD|PEPPER|PRIVATE|CREDENTIAL/;
const SCHEME = { VITE_API_URL: 'https://', VITE_WS_URL: 'wss://' };

function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];

  for (const name of Object.keys(SCHEME)) {
    const value = source[name];
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(name + ' is required');
    } else if (mode === 'production' && !value.startsWith(SCHEME[name])) {
      errors.push(name + ' must start ' + SCHEME[name] + ' in production');
    }
  }

  for (const key of Object.keys(source)) {
    // The prefix decides whether the value reaches the browser at all.
    if (key.startsWith('VITE_') && SECRET_RE.test(key.toUpperCase())) {
      errors.push(key + ' looks like a secret');
    }
  }

  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,

      "builds the result once at the end from a list of problems": `const SECRET_WORDS = ${WORDS};

function problemsWith(source, mode) {
  const out = [];
  const need = (n) => {
    const v = source[n];
    return typeof v === 'string' && v.trim() !== '';
  };

  if (!need('VITE_API_URL')) out.push('VITE_API_URL missing');
  if (!need('VITE_WS_URL')) out.push('VITE_WS_URL missing');

  Object.keys(source).forEach((k) => {
    if (k.slice(0, 5) !== 'VITE_') return;
    const u = k.toUpperCase();
    if (SECRET_WORDS.filter((w) => u.indexOf(w) !== -1).length) {
      out.push(k + ' is a secret in a public bundle');
    }
  });

  if (mode === 'production') {
    if (need('VITE_API_URL') && source.VITE_API_URL.slice(0, 8) !== 'https://') {
      out.push('VITE_API_URL not https');
    }
    if (need('VITE_WS_URL') && source.VITE_WS_URL.slice(0, 6) !== 'wss://') {
      out.push('VITE_WS_URL not wss');
    }
  }
  return out;
}

function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = problemsWith(source, mode);
  if (errors.length) return { ok: false, config: null, errors };
  return {
    ok: true,
    errors: [],
    config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL },
  };
}`,
    },

    mistakes: {
      "scans every variable for secret names, so the server-side pepper fails the build": {
        expect: "server-side secrets WITHOUT the VITE_ prefix are ignored",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') errors.push(name + ' is required');
  }
  // No prefix test. TOKEN_CODE_PEPPER and DATABASE_PASSWORD are correct
  // configuration and this fails the build on both.
  for (const key of Object.keys(source)) {
    if (SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      errors.push(key + ' looks like a secret');
    }
  }
  if (mode === 'production') {
    if (typeof source.VITE_API_URL === 'string' && source.VITE_API_URL.trim() &&
        !source.VITE_API_URL.startsWith('https://')) errors.push('api not https');
    if (typeof source.VITE_WS_URL === 'string' && source.VITE_WS_URL.trim() &&
        !source.VITE_WS_URL.startsWith('wss://')) errors.push('ws not wss');
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "never checks for exposed secrets at all": {
        expect: "a VITE_ variable that looks like a secret fails the build",
        impl: `function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') errors.push(name + ' is required');
  }
  if (mode === 'production') {
    if (typeof source.VITE_API_URL === 'string' && source.VITE_API_URL.trim() &&
        !source.VITE_API_URL.startsWith('https://')) errors.push('api not https');
    if (typeof source.VITE_WS_URL === 'string' && source.VITE_WS_URL.trim() &&
        !source.VITE_WS_URL.startsWith('wss://')) errors.push('ws not wss');
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "matches secret names case-sensitively, so VITE_api_key slips through": {
        expect: "the secret-name check ignores case",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') errors.push(name + ' is required');
  }
  for (const key of Object.keys(source)) {
    if (!key.startsWith('VITE_')) continue;
    if (SECRET_WORDS.some((w) => key.includes(w))) errors.push(key + ' looks like a secret');
  }
  if (mode === 'production') {
    if (typeof source.VITE_API_URL === 'string' && source.VITE_API_URL.trim() &&
        !source.VITE_API_URL.startsWith('https://')) errors.push('api not https');
    if (typeof source.VITE_WS_URL === 'string' && source.VITE_WS_URL.trim() &&
        !source.VITE_WS_URL.startsWith('wss://')) errors.push('ws not wss');
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "returns on the first problem, so a broken env takes several builds to fix": {
        expect: "BOTH missing variables are reported, not just the first",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') {
      return { ok: false, config: null, errors: [name + ' is required'] };
    }
  }
  for (const key of Object.keys(source)) {
    if (key.startsWith('VITE_') && SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      return { ok: false, config: null, errors: [key + ' looks like a secret'] };
    }
  }
  if (mode === 'production') {
    if (!source.VITE_API_URL.startsWith('https://')) {
      return { ok: false, config: null, errors: ['api not https'] };
    }
    if (!source.VITE_WS_URL.startsWith('wss://')) {
      return { ok: false, config: null, errors: ['ws not wss'] };
    }
  }
  return { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "keeps the || '' default, so a missing variable passes as empty": {
        expect: "a missing required variable fails",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  // The bug this exercise replaces, moved one layer up.
  const apiUrl = source.VITE_API_URL || '';
  const wsUrl = source.VITE_WS_URL || '';
  for (const key of Object.keys(source)) {
    if (key.startsWith('VITE_') && SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      errors.push(key + ' looks like a secret');
    }
  }
  if (mode === 'production') {
    if (apiUrl && !apiUrl.startsWith('https://')) errors.push('api not https');
    if (wsUrl && !wsUrl.startsWith('wss://')) errors.push('ws not wss');
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl, wsUrl }, errors: [] };
}`,
      },

      "accepts a whitespace-only value as present": {
        expect: "a whitespace-only value counts as missing",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    if (!(name in source)) errors.push(name + ' is required');
  }
  for (const key of Object.keys(source)) {
    if (key.startsWith('VITE_') && SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      errors.push(key + ' looks like a secret');
    }
  }
  if (mode === 'production') {
    if (typeof source.VITE_API_URL === 'string' && source.VITE_API_URL.trim() &&
        !source.VITE_API_URL.startsWith('https://')) errors.push('api not https');
    if (typeof source.VITE_WS_URL === 'string' && source.VITE_WS_URL.trim() &&
        !source.VITE_WS_URL.startsWith('wss://')) errors.push('ws not wss');
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "enforces https in development too, so nobody can run the thing locally": {
        expect: "http and ws are fine in development",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') errors.push(name + ' is required');
  }
  for (const key of Object.keys(source)) {
    if (key.startsWith('VITE_') && SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      errors.push(key + ' looks like a secret');
    }
  }
  // No mode check -- localhost has no certificate, so this never passes.
  if (typeof source.VITE_API_URL === 'string' && !source.VITE_API_URL.startsWith('https://')) {
    errors.push('api not https');
  }
  if (typeof source.VITE_WS_URL === 'string' && !source.VITE_WS_URL.startsWith('wss://')) {
    errors.push('ws not wss');
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "skips the production scheme check entirely": {
        expect: "plain http fails in production",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') errors.push(name + ' is required');
  }
  for (const key of Object.keys(source)) {
    if (key.startsWith('VITE_') && SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      errors.push(key + ' looks like a secret');
    }
  }
  return errors.length
    ? { ok: false, config: null, errors }
    : { ok: true, config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL }, errors: [] };
}`,
      },

      "returns a config alongside the errors, so a caller can use a broken one": {
        expect: "a failing env returns no config",
        impl: `const SECRET_WORDS = ${WORDS};
function checkWebEnv(env, mode) {
  const source = env || {};
  const errors = [];
  for (const name of ['VITE_API_URL', 'VITE_WS_URL']) {
    const v = source[name];
    if (typeof v !== 'string' || v.trim() === '') errors.push(name + ' is required');
  }
  for (const key of Object.keys(source)) {
    if (key.startsWith('VITE_') && SECRET_WORDS.some((w) => key.toUpperCase().includes(w))) {
      errors.push(key + ' looks like a secret');
    }
  }
  if (mode === 'production') {
    if (typeof source.VITE_API_URL === 'string' && source.VITE_API_URL.trim() &&
        !source.VITE_API_URL.startsWith('https://')) errors.push('api not https');
    if (typeof source.VITE_WS_URL === 'string' && source.VITE_WS_URL.trim() &&
        !source.VITE_WS_URL.startsWith('wss://')) errors.push('ws not wss');
  }
  return {
    ok: errors.length === 0,
    config: { apiUrl: source.VITE_API_URL, wsUrl: source.VITE_WS_URL },
    errors,
  };
}`,
      },
    },
  },
};
