/* Wrong-answer cases for 01/0009-promises-and-async-await.
 *
 *   node scripts/verify-lesson.mjs modules/01-javascript-fundamentals/0009-promises-and-async-await.html \
 *        --wrong scripts/cases/0009-promises-and-async-await.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake this lesson exists to catch is "sequential awaits": it returns
 * the right answer, never throws, and is simply twice as slow. Nothing but the
 * start/finish ordering check can see it.
 */

export const alternatives = {
  "destructuring the Promise.all result": `async function loadTokenScreen(code, api) {
  try {
    const [detail, redemptions] = await Promise.all([
      api.fetchDetail(code),
      api.fetchRedemptions(code)
    ]);
    return { status: "ok", detail: detail, redemptions: redemptions };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}`,

  "starts both by hand, then awaits each": `async function loadTokenScreen(code, api) {
  // Both calls made before either await - equivalent to Promise.all here
  const detailPromise = api.fetchDetail(code);
  const redemptionsPromise = api.fetchRedemptions(code);
  try {
    const detail = await detailPromise;
    const redemptions = await redemptionsPromise;
    return { status: "ok", detail: detail, redemptions: redemptions };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}`,

  "promise chain instead of async/await": `function loadTokenScreen(code, api) {
  return Promise.all([api.fetchDetail(code), api.fetchRedemptions(code)])
    .then(function (results) {
      return { status: "ok", detail: results[0], redemptions: results[1] };
    })
    .catch(function (error) {
      return { status: "error", message: error.message };
    });
}`,

  "arrow function with an explicit result object built up": `const loadTokenScreen = async (code, api) => {
  const result = {};
  try {
    const both = await Promise.all([
      api.fetchDetail(code),
      api.fetchRedemptions(code)
    ]);
    result.status = "ok";
    result.detail = both[0];
    result.redemptions = both[1];
  } catch (e) {
    result.status = "error";
    result.message = e.message;
  }
  return result;
}`
};

export const mistakes = {
  // Correct output, no error, just twice as slow. The whole point of the
  // exercise, and only the ordering check can see it.
  "sequential awaits - correct but twice as slow": {
    impl: `async function loadTokenScreen(code, api) {
  try {
    const detail = await api.fetchDetail(code);
    const redemptions = await api.fetchRedemptions(code);
    return { status: "ok", detail: detail, redemptions: redemptions };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}`,
    expect: "both requests start before either finishes"
  },

  "no try/catch, so a failure rejects instead of returning": {
    impl: `async function loadTokenScreen(code, api) {
  const results = await Promise.all([
    api.fetchDetail(code),
    api.fetchRedemptions(code)
  ]);
  return { status: "ok", detail: results[0], redemptions: results[1] };
}`,
    expect: "a failing detail request gives status error"
  },

  "rethrows instead of returning an error object": {
    impl: `async function loadTokenScreen(code, api) {
  try {
    const results = await Promise.all([
      api.fetchDetail(code),
      api.fetchRedemptions(code)
    ]);
    return { status: "ok", detail: results[0], redemptions: results[1] };
  } catch (error) {
    throw error;
  }
}`,
    expect: "a failing detail request gives status error"
  },

  "forgets to await, so it returns a promise": {
    impl: `function loadTokenScreen(code, api) {
  const results = Promise.all([
    api.fetchDetail(code),
    api.fetchRedemptions(code)
  ]);
  return { status: "ok", detail: results[0], redemptions: results[1] };
}`,
    expect: "the detail is passed through"
  },

  "swallows the error message": {
    impl: `async function loadTokenScreen(code, api) {
  try {
    const results = await Promise.all([
      api.fetchDetail(code),
      api.fetchRedemptions(code)
    ]);
    return { status: "ok", detail: results[0], redemptions: results[1] };
  } catch (error) {
    return { status: "error", message: "Something went wrong" };
  }
}`,
    expect: "the error message is passed through"
  },

  "results in the wrong order": {
    impl: `async function loadTokenScreen(code, api) {
  try {
    const results = await Promise.all([
      api.fetchDetail(code),
      api.fetchRedemptions(code)
    ]);
    return { status: "ok", detail: results[1], redemptions: results[0] };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}`,
    expect: "the detail is passed through"
  },

  "calls each request twice": {
    impl: `async function loadTokenScreen(code, api) {
  try {
    await Promise.all([api.fetchDetail(code), api.fetchRedemptions(code)]);
    const detail = await api.fetchDetail(code);
    const redemptions = await api.fetchRedemptions(code);
    return { status: "ok", detail: detail, redemptions: redemptions };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}`,
    expect: "each request is made exactly once"
  }
};
