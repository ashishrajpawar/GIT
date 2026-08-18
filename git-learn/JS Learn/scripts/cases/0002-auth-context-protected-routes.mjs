/* Wrong-answer cases for a4/0002 — screensFor.
 *
 *   node scripts/verify-lesson.mjs modules/a4-auth-client/0002-auth-context-protected-routes.html \
 *        --wrong scripts/cases/0002-auth-context-protected-routes.mjs
 *
 * Staged: `exercise-1` is the context and navigator wiring and carries its own
 * per-exercise `unverifiable` reason, so only `screens` has cases.
 *
 * The first mistake is the one the lesson's own quiz asks about: keeping Login
 * in the stack and adding Main on top of it. It looks right on screen and is
 * wrong the moment anyone presses back.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

export const stages = {
  screens: {
    alternatives: {
      "ternary chain": `function screensFor(auth) {
  return auth.isLoading ? ['Splash']
       : auth.user      ? ['Main']
       :                  ['Login', 'Register'];
}`,

      "builds into a local array": `function screensFor(auth) {
  const screens = [];
  if (auth.isLoading) {
    screens.push('Splash');
  } else if (auth.user) {
    screens.push('Main');
  } else {
    screens.push('Login', 'Register');
  }
  return screens;
}`,

      "a lookup keyed by the state name": `function screensFor(auth) {
  const state = auth.isLoading ? 'loading' : auth.user ? 'in' : 'out';
  const table = {
    loading: () => ['Splash'],
    in:      () => ['Main'],
    out:     () => ['Login', 'Register'],
  };
  return table[state]();
}`,
    },

    mistakes: {
      "keeps Login in the stack and adds Main on top": {
        expect: "Login does not exist while logged in",
        impl: `function screensFor(auth) {
  if (auth.isLoading) return ['Splash'];
  const screens = ['Login', 'Register'];
  if (auth.user) screens.push('Main');
  return screens;
}`,
      },

      "checks the user before isLoading, so a stale user skips the splash": {
        expect: "loading wins even when a user is present",
        impl: `function screensFor(auth) {
  if (auth.user) return ['Main'];
  if (auth.isLoading) return ['Splash'];
  return ['Login', 'Register'];
}`,
      },

      "forgets Register entirely": {
        expect: "logged out offers Login and Register",
        impl: `function screensFor(auth) {
  if (auth.isLoading) return ['Splash'];
  if (!auth.user) return ['Login'];
  return ['Main'];
}`,
      },

      "puts Register first, so logged-out users land on a signup form": {
        expect: "Login is the landing screen when logged out",
        impl: `function screensFor(auth) {
  if (auth.isLoading) return ['Splash'];
  if (!auth.user) return ['Register', 'Login'];
  return ['Main'];
}`,
      },

      "returns one shared array that callers can mutate": {
        expect: "each call returns its own array",
        impl: `const LOGGED_OUT = ['Login', 'Register'];
function screensFor(auth) {
  if (auth.isLoading) return ['Splash'];
  if (!auth.user) return LOGGED_OUT;
  return ['Main'];
}`,
      },

      "shows Login while loading instead of a splash": {
        expect: "loading shows only Splash",
        impl: `function screensFor(auth) {
  if (auth.user) return ['Main'];
  return ['Login', 'Register'];
}`,
      },
    },
  },
};
