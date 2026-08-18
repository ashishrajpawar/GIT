/* Wrong-answer cases for a3/0001 — buildUrl.
 *
 *   node scripts/verify-lesson.mjs modules/a3-api-consumption/0001-fetch-http-fundamentals.html \
 *        --wrong scripts/cases/0001-fetch-http-fundamentals.mjs
 *
 * Staged: `exercise-1` runs against a live API and carries its own
 * per-exercise `unverifiable` reason, so only `url` has cases.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  url: {
    alternatives: {
      "URLSearchParams instead of manual encoding": `function buildUrl(baseUrl, path, params) {
  const url = String(baseUrl).replace(/\\/+$/, '') + '/' + String(path).replace(/^\\/+/, '');
  if (!params) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) sp.append(k, v);
  const q = sp.toString();
  return q ? url + '?' + q : url;
}`,

      "filter + map + join": `function buildUrl(baseUrl, path, params) {
  const url = baseUrl.replace(/\\/$/, '') + '/' + path.replace(/^\\//, '');
  const q = Object.entries(params || {})
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
  return q.length > 0 ? url + '?' + q : url;
}`,

      "splits and rejoins on slashes": `function buildUrl(baseUrl, path, params) {
  const parts = (baseUrl + '/' + path).split('/');
  const scheme = parts.shift() + '//';
  const url = scheme + parts.filter(Boolean).join('/');
  const pairs = [];
  for (const key in params || {}) {
    if (params[key] == null) continue;
    pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
  }
  return pairs.length ? url + '?' + pairs.join('&') : url;
}`,
    },

    mistakes: {
      "just concatenates, so two slashes meet": {
        expect: "base with slash + path with slash",
        impl: `function buildUrl(baseUrl, path, params) {
  const url = baseUrl + path;
  const pairs = [];
  for (const k of Object.keys(params || {})) if (params[k] != null) pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  return pairs.length ? url + '?' + pairs.join('&') : url;
}`,
      },

      "strips the base but assumes the path always has a leading slash": {
        expect: "base without slash + path without slash",
        impl: `function buildUrl(baseUrl, path, params) {
  const url = baseUrl.replace(/\\/+$/, '') + path;
  const pairs = [];
  for (const k of Object.keys(params || {})) if (params[k] != null) pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  return pairs.length ? url + '?' + pairs.join('&') : url;
}`,
      },

      "filters params on truthiness, dropping 0 and false": {
        expect: "a param of 0 survives",
        impl: `function buildUrl(baseUrl, path, params) {
  const url = baseUrl.replace(/\\/+$/, '') + '/' + path.replace(/^\\/+/, '');
  const pairs = [];
  for (const k of Object.keys(params || {})) if (params[k]) pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  return pairs.length ? url + '?' + pairs.join('&') : url;
}`,
      },

      "keeps null params, sending the string 'null' to the server": {
        expect: "a param of null is dropped",
        impl: `function buildUrl(baseUrl, path, params) {
  const url = baseUrl.replace(/\\/+$/, '') + '/' + path.replace(/^\\/+/, '');
  const pairs = Object.keys(params || {}).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  return pairs.length ? url + '?' + pairs.join('&') : url;
}`,
      },

      "appends the question mark whenever a params object was passed": {
        expect: "an empty params object also means no question mark",
        impl: `function buildUrl(baseUrl, path, params) {
  const url = baseUrl.replace(/\\/+$/, '') + '/' + path.replace(/^\\/+/, '');
  if (!params) return url;
  const pairs = [];
  for (const k of Object.keys(params)) if (params[k] != null) pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  return url + '?' + pairs.join('&');
}`,
      },

      "does not encode, so an & in a label starts a new parameter": {
        expect: "values are percent-encoded",
        impl: `function buildUrl(baseUrl, path, params) {
  const url = baseUrl.replace(/\\/+$/, '') + '/' + path.replace(/^\\/+/, '');
  const pairs = [];
  for (const k of Object.keys(params || {})) if (params[k] != null) pairs.push(k + '=' + params[k]);
  return pairs.length ? url + '?' + pairs.join('&') : url;
}`,
      },
    },
  },
};
