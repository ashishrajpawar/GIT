/* Wrong-answer cases for a8/0002 — redeemState.
 *
 *   node scripts/verify-lesson.mjs modules/a8-redemption-web/0002-token-redemption-flow.html \
 *        --wrong scripts/cases/0002-token-redemption-flow.mjs
 *
 * Staged: `exercise-1` is the React page and carries its own per-exercise
 * `unverifiable` reason, so only `state` has cases.
 *
 * The first mistake is what this page actually shipped: `status: data.reason`.
 * It is one assignment, it reads as obviously correct, and it is wrong for two
 * of the five reasons because the server's vocabulary is not the UI's —
 * 'max_uses' is not 'maxed' and 'not_found' is not 'not-found'. Neither
 * matches a branch, so the holder gets a blank screen.
 *
 * The second is the same shape one layer out: passing an UNKNOWN reason
 * through. It cannot be caught by a test that only uses reasons the author
 * already thought of, which is why the fixture invents one ('quarantined').
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const TABLE = `{
  expired: 'expired',
  revoked: 'revoked',
  paused: 'paused',
  max_uses: 'maxed',
  not_found: 'not-found',
}`;

export const stages = {
  state: {
    alternatives: {
      "a switch with an explicit default": `function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    return result.httpStatus === 404
      ? { status: 'not-found' }
      : { status: 'error', message: 'server ' + result.httpStatus };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };

  switch (body.reason) {
    case 'expired':   return { status: 'expired' };
    case 'revoked':   return { status: 'revoked' };
    case 'paused':    return { status: 'paused' };
    case 'max_uses':  return { status: 'maxed' };
    case 'not_found': return { status: 'not-found' };
    default:          return { status: 'error', message: 'unrecognised' };
  }
}`,

      "a Map, with has() guarding the lookup": `const REASONS = new Map(Object.entries(${TABLE}));
function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  if (REASONS.has(body.reason)) return { status: REASONS.get(body.reason) };
  return { status: 'error', message: 'unrecognised reason' };
}`,

      "computes the status first, then builds the object once": `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  let status;
  let extra = {};

  if (!result || result.networkError) {
    status = 'error';
    extra = { message: 'Could not reach the server' };
  } else if (!result.ok) {
    status = result.httpStatus === 404 ? 'not-found' : 'error';
    if (status === 'error') extra = { message: 'Server error' };
  } else if (result.body && result.body.valid === true) {
    status = 'valid';
    extra = { label: result.body.label };
  } else {
    const reason = result.body ? result.body.reason : undefined;
    status = Object.prototype.hasOwnProperty.call(REASON_TO_STATUS, reason)
      ? REASON_TO_STATUS[reason]
      : 'error';
    if (status === 'error') extra = { message: 'Unrecognised response' };
  }

  return Object.assign({ status: status }, extra);
}`,

      "guards with optional chaining and a nullish fallback": `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  if (result?.networkError || !result) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    return result.httpStatus === 404
      ? { status: 'not-found' }
      : { status: 'error', message: 'server' };
  }
  if (result.body?.valid === true) {
    return { status: 'valid', label: result.body.label };
  }
  const mapped = REASON_TO_STATUS[result.body?.reason] ?? null;
  return mapped ? { status: mapped } : { status: 'error', message: 'unrecognised' };
}`,
    },

    mistakes: {
      "assigns the server's reason straight into status — what this page shipped": {
        expect: "max_uses becomes maxed",
        impl: `function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  // One line, reads as obviously right, wrong for two of the five reasons.
  return { status: body.reason || 'error' };
}`,
      },

      "translates max_uses but forgets not_found": {
        expect: "not_found becomes not-found",
        impl: `function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  if (body.reason === 'max_uses') return { status: 'maxed' };
  return { status: body.reason || 'error' };
}`,
      },

      "lets an unknown reason through as its own status": {
        expect: "an unrecognised reason becomes error, not itself",
        impl: `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  // The lookup is there, but a miss falls back to the raw reason instead of
  // to error -- so a reason invented by a newer server reaches the renderer.
  return { status: REASON_TO_STATUS[body.reason] || body.reason || 'error' };
}`,
      },

      "has no branch for paused, so a working token reads as broken": {
        expect: "a paused token has its own state, not error",
        impl: `function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  const table = { expired: 'expired', revoked: 'revoked', max_uses: 'maxed', not_found: 'not-found' };
  const status = table[body.reason];
  return status ? { status: status } : { status: 'error', message: 'unrecognised' };
}`,
      },

      "treats any truthy valid as valid, so a label alone lets it through": {
        expect: "a label on an invalid token does not make it valid",
        impl: `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  // "It has a label, so there must be a token." There is -- a revoked one.
  if (body.valid || body.label) return { status: 'valid', label: body.label };
  const status = REASON_TO_STATUS[body.reason];
  return status ? { status: status } : { status: 'error', message: 'unrecognised' };
}`,
      },

      "maps every non-OK response to not-found": {
        expect: "a 500 is an error, not not-found",
        impl: `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  // "The request failed, so the token is not there." A 500 says nothing at
  // all about whether the token exists.
  if (!result.ok) return { status: 'not-found' };
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  const status = REASON_TO_STATUS[body.reason];
  return status ? { status: status } : { status: 'error', message: 'unrecognised' };
}`,
      },

      "reads result.body before checking there is a result": {
        expect: "no result at all is an error rather than a throw",
        impl: `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  const body = result.body || {};
  if (result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  if (body.valid === true) return { status: 'valid', label: body.label };
  const status = REASON_TO_STATUS[body.reason];
  return status ? { status: status } : { status: 'error', message: 'unrecognised' };
}`,
      },

      "drops the label, so the holder cannot confirm which token they scanned": {
        expect: "a redeemable token is valid and carries its label",
        impl: `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid' };
  const status = REASON_TO_STATUS[body.reason];
  return status ? { status: status } : { status: 'error', message: 'unrecognised' };
}`,
      },

      "returns error when valid is false and no reason came back, but names it not-found": {
        expect: "invalid with no reason is an error",
        impl: `const REASON_TO_STATUS = ${TABLE};
function redeemState(result) {
  if (!result || result.networkError) return { status: 'error', message: 'offline' };
  if (!result.ok) {
    if (result.httpStatus === 404) return { status: 'not-found' };
    return { status: 'error', message: 'server error' };
  }
  const body = result.body || {};
  if (body.valid === true) return { status: 'valid', label: body.label };
  const status = REASON_TO_STATUS[body.reason];
  // A missing reason is guessed at rather than reported.
  return status ? { status: status } : { status: 'not-found' };
}`,
      },
    },
  },
};
