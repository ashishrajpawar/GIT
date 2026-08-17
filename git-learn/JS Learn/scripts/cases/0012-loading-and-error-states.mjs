/* Wrong-answer cases for 02/0012-loading-and-error-states.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0012-loading-and-error-states.html \
 *        --wrong scripts/cases/0012-loading-and-error-states.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * Every wrong version below contains the same four checks as the right one.
 * Only the order differs, which is the whole lesson: this function has no
 * clever part, and gets written wrongly anyway.
 */

export const alternatives = {
  "a ternary chain": `const viewState = (state) => {
  const count = Array.isArray(state.items) ? state.items.length : 0;
  return count > 0 ? "list"
       : state.isLoading ? "loading"
       : state.error ? "error"
       : "empty";
};`,

  "destructures with defaults": `function viewState({ isLoading = false, error = null, items = [] }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length !== 0) return "list";
  if (isLoading) return "loading";
  if (error) return "error";
  return "empty";
}`,

  "names the intermediate booleans": `function viewState(state) {
  const items = Array.isArray(state.items) ? state.items : [];
  const hasContent = items.length > 0;
  const isBusy = Boolean(state.isLoading);
  const hasFailed = Boolean(state.error);

  if (hasContent) return "list";
  if (isBusy) return "loading";
  if (hasFailed) return "error";
  return "empty";
}`,
};

export const mistakes = {
  "checks for emptiness first, so the first render says 'No tokens yet'": {
    expect: "a first render with no data yet is NOT empty",
    impl: `function viewState(state) {
  const count = Array.isArray(state.items) ? state.items.length : 0;
  if (count === 0) return "empty";
  if (state.isLoading) return "loading";
  if (state.error) return "error";
  return "list";
}`,
  },

  "checks isLoading first, so a refresh blanks a populated screen": {
    expect: "refreshing a screen that has data keeps the list",
    impl: `function viewState(state) {
  const count = Array.isArray(state.items) ? state.items.length : 0;
  if (state.isLoading) return "loading";
  if (state.error) return "error";
  return count > 0 ? "list" : "empty";
}`,
  },

  "checks error first, so a failed refresh throws away the data on screen": {
    expect: "a failed refresh keeps the data on screen",
    impl: `function viewState(state) {
  const count = Array.isArray(state.items) ? state.items.length : 0;
  if (state.error) return "error";
  if (state.isLoading) return "loading";
  return count > 0 ? "list" : "empty";
}`,
  },

  "prefers a stale error over a retry that is already in flight": {
    expect: "loading wins over a previous error when there is nothing to show",
    impl: `function viewState(state) {
  const count = Array.isArray(state.items) ? state.items.length : 0;
  if (count > 0) return "list";
  if (state.error) return "error";
  if (state.isLoading) return "loading";
  return "empty";
}`,
  },

  "reads items.length without guarding, so a missing array throws": {
    expect: "a missing items array is treated as no items",
    impl: `function viewState(state) {
  if (state.items.length > 0) return "list";
  if (state.isLoading) return "loading";
  if (state.error) return "error";
  return "empty";
}`,
  },

  "treats a single item as not worth showing": {
    expect: "exactly one item is enough to be a list",
    impl: `function viewState(state) {
  const count = Array.isArray(state.items) ? state.items.length : 0;
  if (count > 1) return "list";
  if (state.isLoading) return "loading";
  if (state.error) return "error";
  return "empty";
}`,
  },
};
