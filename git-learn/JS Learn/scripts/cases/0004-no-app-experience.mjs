/* Wrong-answer cases for a8/0004 — headersFor.
 *
 *   node scripts/verify-lesson.mjs modules/a8-redemption-web/0004-no-app-experience.html \
 *        --wrong scripts/cases/0004-no-app-experience.mjs
 *
 * Staged: `exercise-1` is the React chat/call UI plus an nginx config and
 * carries its own per-exercise `unverifiable` reason, so only `headers` has
 * cases.
 *
 * This function fails in two opposite directions and both are represented,
 * because the instinct after seeing one is to over-correct into the other.
 *
 *   Too loose — a query string slips past the route test, and a decorated
 *   redemption link gets indexed. That publishes a capability.
 *
 *   Too tight — `startsWith('/t')` also matches /terms, and `includes('/t/')`
 *   matches /assets/t/... . That deletes your own pages from search results.
 *
 * The specified behaviour is deliberately asymmetric: unknown input fails
 * CLOSED, because over-blocking one asset is recoverable and publishing one
 * code is not. But that asymmetry is not a licence to over-block the paths we
 * DO recognise, which is what the /terms case exists to prove.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const REDEMPTION = `{
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
}`;

const PUBLIC = `{
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'public, max-age=3600',
}`;

export const stages = {
  headers: {
    alternatives: {
      "matches the route with an anchored regex": `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};
// ^/t followed by end-of-string or a slash. The alternation is what stops
// /terms matching.
const IS_REDEMPTION = /^\\/t(\\/|$)/;

function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  const route = path.split('#')[0].split('?')[0];
  return IS_REDEMPTION.test(route) ? { ...REDEMPTION } : { ...PUBLIC };
}`,

      "uses URL to parse the path rather than splitting by hand": `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};

function headersFor(path) {
  if (typeof path !== 'string' || path === '') return Object.assign({}, REDEMPTION);

  let pathname;
  try {
    // A base is required because the input is a path, not an absolute URL.
    pathname = new URL(path, 'https://tokn.app').pathname;
  } catch (e) {
    return Object.assign({}, REDEMPTION);
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 't' || pathname === '/t'
    ? Object.assign({}, REDEMPTION)
    : Object.assign({}, PUBLIC);
}`,

      "decides with a named predicate and builds the headers after": `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};

function isRedemptionRoute(path) {
  if (typeof path !== 'string' || path === '') return true;   // fail closed
  const route = path.split('#')[0].split('?')[0];
  const segments = route.split('/');
  return segments[1] === 't';
}

function headersFor(path) {
  return isRedemptionRoute(path)
    ? Object.assign({}, REDEMPTION)
    : Object.assign({}, PUBLIC);
}`,
    },

    mistakes: {
      "tests startsWith('/t'), which also deindexes /terms": {
        expect: "/terms is a PUBLIC page, not a redemption path",
        impl: `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  const route = path.split('#')[0].split('?')[0];
  // Safer-looking, and it removes your own terms page from search results.
  return route.startsWith('/t') ? { ...REDEMPTION } : { ...PUBLIC };
}`,
      },

      "never strips the query, so a decorated link is treated as public": {
        expect: "a query string does not turn it into a public page",
        impl: `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  // '/t/MERC8GH2KP4X?utm_source=poster'.split('/')[1] is 't', but an exact
  // whole-path comparison like this one misses it entirely.
  const segments = path.split('/');
  const isRedemption = segments.length === 3 && segments[1] === 't' && !segments[2].includes('?')
    ? true
    : path === '/t';
  return isRedemption ? { ...REDEMPTION } : { ...PUBLIC };
}`,
      },

      "only matches the exact /t/CODE route, so the chat page is public": {
        expect: "a path BELOW the code is still a redemption path",
        impl: `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  const route = path.split('#')[0].split('?')[0];
  const segments = route.split('/');
  // Exactly two segments and no more -- /t/CODE/chat falls through to public.
  return segments.length === 3 && segments[1] === 't' ? { ...REDEMPTION } : { ...PUBLIC };
}`,
      },

      "sets noindex but leaves the page cacheable on disk": {
        expect: "a redemption path is not stored",
        impl: `const PUBLIC = ${PUBLIC};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') {
    return { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'public, max-age=3600' };
  }
  const route = path.split('#')[0].split('?')[0];
  return route.split('/')[1] === 't' || route === '/t'
    ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'public, max-age=3600' }
    : { ...PUBLIC };
}`,
      },

      "forgets Referrer-Policy, so the code travels in Referer": {
        expect: "a redemption path sends no referrer",
        impl: `const PUBLIC = ${PUBLIC};
const REDEMPTION = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  const route = path.split('#')[0].split('?')[0];
  return route.split('/')[1] === 't' || route === '/t' ? { ...REDEMPTION } : { ...PUBLIC };
}`,
      },

      "applies noindex to everything, hiding the marketing pages too": {
        expect: "the home and about pages are indexable",
        impl: `const REDEMPTION = ${REDEMPTION};
function headersFor(path) {
  // The meta-tag bug, faithfully reproduced one layer down.
  return { ...REDEMPTION };
}`,
      },

      "makes every response no-store, so the bundle is re-downloaded each load": {
        expect: "static assets stay cacheable",
        impl: `const REDEMPTION = ${REDEMPTION};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  const route = path.split('#')[0].split('?')[0];
  if (route.split('/')[1] === 't' || route === '/t') return { ...REDEMPTION };
  return { 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' };
}`,
      },

      "fails OPEN on an unrecognisable path": {
        expect: "an unrecognisable path fails CLOSED, not open",
        impl: `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};
function headersFor(path) {
  // An empty or missing path "cannot be a token page", so it is served
  // indexable and cacheable. It is the one case nobody has thought about,
  // which is exactly why it should not be the permissive one.
  if (typeof path !== 'string' || path === '') return { ...PUBLIC };
  const route = path.split('#')[0].split('?')[0];
  return route.split('/')[1] === 't' || route === '/t' ? { ...REDEMPTION } : { ...PUBLIC };
}`,
      },

      "treats the bare /t as public because it carries no code": {
        expect: "the bare /t is treated as a redemption path",
        impl: `const REDEMPTION = ${REDEMPTION};
const PUBLIC = ${PUBLIC};
function headersFor(path) {
  if (typeof path !== 'string' || path === '') return { ...REDEMPTION };
  const route = path.split('#')[0].split('?')[0];
  const segments = route.split('/');
  return segments[1] === 't' && segments[2] ? { ...REDEMPTION } : { ...PUBLIC };
}`,
      },
    },
  },
};
