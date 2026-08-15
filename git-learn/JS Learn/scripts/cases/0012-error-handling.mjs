/* Wrong-answer cases for 01/0012-error-handling.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0012-error-handling.html \
 *        --wrong scripts/cases/0012-error-handling.mjs
 *
 * `alternatives` are other correct styles — all must PASS. Both instanceof and
 * error.name are legitimate ways to identify the failure, so both appear here.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake this lesson exists for is "chatty messages": it handles every
 * error type correctly, returns the right shape, never throws, and is more
 * helpful to read. It fails exactly one check — the one comparing the
 * not-found and revoked messages — because being helpful is the bug.
 */

const PATTERN =
  "/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}(-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){2}$/";

export const alternatives = {
  "instanceof instead of error.name": `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "That code doesn't look right.", retryable: false };
  }
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    if (error instanceof NetworkError) {
      return { ok: false, message: "Couldn't reach the server.", retryable: true };
    }
    if (error instanceof NotFoundError || error instanceof RevokedError) {
      return { ok: false, message: "That code can't be used.", retryable: false };
    }
    return { ok: false, message: "Something went wrong on our side.", retryable: false };
  }
}`,

  "a switch on error.name": `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "Check the code for typos.", retryable: false };
  }
  const REJECTED = "This code is not usable.";
  try {
    const session = await api.redeem(code);
    return { ok: true, session };
  } catch (error) {
    switch (error && error.name) {
      case "NetworkError":
        return { ok: false, message: "Network unavailable.", retryable: true };
      case "NotFoundError":
      case "RevokedError":
        return { ok: false, message: REJECTED, retryable: false };
      default:
        return { ok: false, message: "Unexpected failure.", retryable: false };
    }
  }
}`,

  "a lookup table for the messages": `const P = ${PATTERN};
const MESSAGES = {
  NetworkError: { message: "Connection problem.", retryable: true },
  NotFoundError: { message: "We can't use that code.", retryable: false },
  RevokedError: { message: "We can't use that code.", retryable: false }
};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "That code looks wrong.", retryable: false };
  }
  try {
    const session = await api.redeem(code);
    return { ok: true, session: session };
  } catch (error) {
    const hit = MESSAGES[error && error.name];
    if (hit) return { ok: false, message: hit.message, retryable: hit.retryable };
    return { ok: false, message: "An unexpected error occurred.", retryable: false };
  }
}`,

  "promise chain rather than async/await": `const P = ${PATTERN};
function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return Promise.resolve({
      ok: false, message: "Bad code format.", retryable: false
    });
  }
  return api.redeem(code)
    .then(function (session) { return { ok: true, session: session }; })
    .catch(function (error) {
      const name = error && error.name;
      if (name === "NetworkError") {
        return { ok: false, message: "Server unreachable.", retryable: true };
      }
      if (name === "NotFoundError" || name === "RevokedError") {
        return { ok: false, message: "That code can't be used.", retryable: false };
      }
      return { ok: false, message: "Internal problem.", retryable: false };
    });
}`
};

export const mistakes = {
  // Correct in every other way, and MORE helpful to read. That is the bug.
  "chatty messages - tells a stranger which codes are real": {
    impl: `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "That code doesn't look right.", retryable: false };
  }
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    const name = error && error.name;
    if (name === "NetworkError") {
      return { ok: false, message: "Couldn't reach the server.", retryable: true };
    }
    if (name === "NotFoundError") {
      return { ok: false, message: "No token with that code.", retryable: false };
    }
    if (name === "RevokedError") {
      return { ok: false, message: "That token has been revoked.", retryable: false };
    }
    return { ok: false, message: "Something went wrong.", retryable: false };
  }
}`,
    expect: "a missing and a revoked token give the SAME message"
  },

  "catches everything as a network problem": {
    impl: `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "Bad format.", retryable: false };
  }
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    return { ok: false, message: "Couldn't reach the server.", retryable: true };
  }
}`,
    expect: "an unexpected error does not become a network message"
  },

  "no validation, so a malformed code still hits the api": {
    impl: `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    const name = error && error.name;
    if (name === "NetworkError") {
      return { ok: false, message: "Couldn't reach the server.", retryable: true };
    }
    if (name === "NotFoundError" || name === "RevokedError") {
      return { ok: false, message: "That code can't be used.", retryable: false };
    }
    return { ok: false, message: "Something went wrong.", retryable: false };
  }
}`,
    expect: "a malformed code fails without calling the api"
  },

  "forgets to trim and upper-case": {
    impl: `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "");
  if (!P.test(code)) {
    return { ok: false, message: "That code doesn't look right.", retryable: false };
  }
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    const name = error && error.name;
    if (name === "NetworkError") {
      return { ok: false, message: "Couldn't reach the server.", retryable: true };
    }
    if (name === "NotFoundError" || name === "RevokedError") {
      return { ok: false, message: "That code can't be used.", retryable: false };
    }
    return { ok: false, message: "Something went wrong.", retryable: false };
  }
}`,
    expect: "the code is trimmed and upper-cased before use"
  },

  "lets the error escape instead of returning a result": {
    impl: `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "That code doesn't look right.", retryable: false };
  }
  const session = await api.redeem(code);
  return { ok: true, session: session };
}`,
    expect: "a network failure is retryable"
  },

  "marks a revoked token retryable": {
    impl: `const P = ${PATTERN};
async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!P.test(code)) {
    return { ok: false, message: "That code doesn't look right.", retryable: false };
  }
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    return { ok: false, message: "That code can't be used.", retryable: true };
  }
}`,
    expect: "a revoked token is reported as a failure"
  },

  "accepts any 14-character string, ignoring the alphabet": {
    impl: `async function redeem(rawCode, api) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (code.length !== 14) {
    return { ok: false, message: "That code doesn't look right.", retryable: false };
  }
  try {
    return { ok: true, session: await api.redeem(code) };
  } catch (error) {
    const name = error && error.name;
    if (name === "NetworkError") {
      return { ok: false, message: "Couldn't reach the server.", retryable: true };
    }
    if (name === "NotFoundError" || name === "RevokedError") {
      return { ok: false, message: "That code can't be used.", retryable: false };
    }
    return { ok: false, message: "Something went wrong.", retryable: false };
  }
}`,
    expect: "a code using an excluded letter is rejected too"
  }
};
