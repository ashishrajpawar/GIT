/* Wrong-answer cases for a5/0005 — shareAdvice.
 *
 *   node scripts/verify-lesson.mjs modules/a5-core-token-features/0005-share-path-warnings.html \
 *        --wrong scripts/cases/0005-share-path-warnings.mjs
 *
 * Staged: `exercise-1` is the React Native modal and onboarding screens and
 * carries its own per-exercise `unverifiable` reason, so only `advice` has
 * cases.
 *
 * The first mistake is the one that matters and the one that looks most
 * reasonable on the page: check the target against a list of dangerous apps,
 * and if it is not there, do not warn. It passes every test written with a
 * known app in it. It fails the moment the share sheet declines to say which
 * app was chosen — which is most of the time — and it fails silently, by
 * doing nothing, on the single flow the product exists to protect.
 *
 * The opposite failure has its own case: warning on copy and on the QR screen.
 * That one is not a security bug, it is a warning-fatigue bug, and it ends in
 * the same place — a user who dismisses the modal without reading it.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

const IDENTIFYING = `['com.whatsapp', 'com.apple.mobilemail', 'com.google.android.gm',
   'com.google.android.apps.messaging', 'com.apple.messages',
   'com.instagram.android', 'com.facebook.orca', 'org.telegram.messenger',
   'airdrop', 'nearby_share']`;

export const stages = {
  advice: {
    alternatives: {
      "a Set for each list and a normalising helper": `const IDENTIFYING = new Set(${IDENTIFYING});
const SAFE_TARGETS = new Set(['com.apple.print', 'save_to_files']);
const norm = (t) => String(t == null ? '' : t).trim().toLowerCase();

function shareAdvice(action, target) {
  if (action === 'qr' || action === 'print' || action === 'request_flow' || action === 'copy') {
    return { level: 'safe', warn: false };
  }
  if (action !== 'share_sheet') return { level: 'unknown', warn: true };

  const id = norm(target);
  if (SAFE_TARGETS.has(id)) return { level: 'safe', warn: false };
  if (IDENTIFYING.has(id)) return { level: 'identifying', warn: true };
  return { level: 'unknown', warn: true };
}`,

      "derives warn from level instead of writing it out each time": `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];

function levelFor(action, target) {
  if (['qr', 'print', 'request_flow', 'copy'].indexOf(action) !== -1) return 'safe';
  if (action !== 'share_sheet') return 'unknown';

  const id = String(target == null ? '' : target).trim().toLowerCase();
  if (SAFE_TARGETS.indexOf(id) !== -1) return 'safe';
  if (IDENTIFYING.indexOf(id) !== -1) return 'identifying';
  return 'unknown';
}

function shareAdvice(action, target) {
  const level = levelFor(action, target);
  // Only 'safe' is quiet. Writing it this way makes it impossible to add a
  // level later and forget to decide whether it warns.
  return { level: level, warn: level !== 'safe' };
}`,

      "a lookup object keyed by action": `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
const SAFE = { level: 'safe', warn: false };

const BY_ACTION = {
  qr: () => SAFE,
  print: () => SAFE,
  request_flow: () => SAFE,
  copy: () => SAFE,
  share_sheet: (target) => {
    const id = String(target == null ? '' : target).trim().toLowerCase();
    if (SAFE_TARGETS.includes(id)) return SAFE;
    if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
    return { level: 'unknown', warn: true };
  },
};

function shareAdvice(action, target) {
  const handler = BY_ACTION[action];
  // An action with no handler is not an action we have reasoned about.
  if (!handler) return { level: 'unknown', warn: true };
  return handler(target);
}`,

      "switch on the action with the unknown default written first": `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];

function shareAdvice(action, target) {
  switch (action) {
    case 'qr':
    case 'print':
    case 'request_flow':
    case 'copy':
      return { level: 'safe', warn: false };
    case 'share_sheet': {
      const id = String(target == null ? '' : target).trim().toLowerCase();
      if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
      if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
      return { level: 'unknown', warn: true };
    }
    default:
      return { level: 'unknown', warn: true };
  }
}`,
    },

    mistakes: {
      "treats an unrecognised share target as safe — the blocklist default": {
        expect: "an UNKNOWN share target warns",
        impl: `const IDENTIFYING = ${IDENTIFYING};
function shareAdvice(action, target) {
  if (action !== 'share_sheet') return { level: 'safe', warn: false };
  const id = String(target == null ? '' : target).trim().toLowerCase();
  // "Is it on the dangerous list? No? Then it is fine." The share sheet
  // usually reports no target at all, so this is quiet exactly when it matters.
  if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
  return { level: 'safe', warn: false };
}`,
      },

      "warns only on apps it knows, so a new app ships unwarned": {
        expect: "an app not on any list warns",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  if (action !== 'share_sheet') return { level: 'safe', warn: false };
  const id = String(target == null ? '' : target).trim().toLowerCase();
  if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
  if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
  if (!id) return { level: 'unknown', warn: true };
  // A named app that is not on the dangerous list "must be" fine.
  return { level: 'safe', warn: false };
}`,
      },

      "never normalises, so a mixed-case id misses the list": {
        expect: "target matching ignores case and whitespace",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  if (['qr', 'print', 'request_flow', 'copy'].includes(action)) {
    return { level: 'safe', warn: false };
  }
  if (action !== 'share_sheet') return { level: 'unknown', warn: true };
  // It still warns -- but as 'unknown', so the modal cannot say what leaks.
  if (SAFE_TARGETS.includes(target)) return { level: 'safe', warn: false };
  if (IDENTIFYING.includes(target)) return { level: 'identifying', warn: true };
  return { level: 'unknown', warn: true };
}`,
      },

      "warns on copy as well, training the user to dismiss the modal": {
        expect: "copying does not warn",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  // "The clipboard could go anywhere, so warn about that too." It could also
  // go into the form field that is the whole point of the product.
  if (['qr', 'print', 'request_flow'].includes(action)) {
    return { level: 'safe', warn: false };
  }
  if (action === 'copy') return { level: 'unknown', warn: true };
  if (action !== 'share_sheet') return { level: 'unknown', warn: true };
  const id = String(target == null ? '' : target).trim().toLowerCase();
  if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
  if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
  return { level: 'unknown', warn: true };
}`,
      },

      "consults the target on every action, so a stale id makes the QR screen warn": {
        expect: "a safe action ignores any target passed with it",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  const id = String(target == null ? '' : target).trim().toLowerCase();
  // The target check runs first, before anyone asks what the action was.
  if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
  if (['qr', 'print', 'request_flow', 'copy'].includes(action)) {
    return { level: 'safe', warn: false };
  }
  if (action !== 'share_sheet') return { level: 'unknown', warn: true };
  if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
  return { level: 'unknown', warn: true };
}`,
      },

      "lets an unrecognised action fall through to safe": {
        expect: "an unrecognised action warns",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  if (action === 'share_sheet') {
    const id = String(target == null ? '' : target).trim().toLowerCase();
    if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
    if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
    return { level: 'unknown', warn: true };
  }
  // Everything that is not the share sheet "must be" one of the safe actions.
  return { level: 'safe', warn: false };
}`,
      },

      "assumes action is a string and throws when it is undefined": {
        expect: "no action at all warns rather than throwing",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  if (action.startsWith('share')) {
    const id = String(target == null ? '' : target).trim().toLowerCase();
    if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
    if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
    return { level: 'unknown', warn: true };
  }
  if (['qr', 'print', 'request_flow', 'copy'].includes(action)) {
    return { level: 'safe', warn: false };
  }
  return { level: 'unknown', warn: true };
}`,
      },

      "forgets AirDrop, which leaks the device name rather than an account": {
        expect: "AirDrop is identifying — the device name carries a real name",
        impl: `// AirDrop "is not a messaging app", so it never made the list.
const IDENTIFYING = ['com.whatsapp', 'com.apple.mobilemail', 'com.google.android.gm',
  'com.google.android.apps.messaging', 'com.apple.messages',
  'com.instagram.android', 'com.facebook.orca', 'org.telegram.messenger'];
const SAFE_TARGETS = ['com.apple.print', 'save_to_files', 'airdrop', 'nearby_share'];
function shareAdvice(action, target) {
  if (['qr', 'print', 'request_flow', 'copy'].includes(action)) {
    return { level: 'safe', warn: false };
  }
  if (action !== 'share_sheet') return { level: 'unknown', warn: true };
  const id = String(target == null ? '' : target).trim().toLowerCase();
  if (SAFE_TARGETS.includes(id)) return { level: 'safe', warn: false };
  if (IDENTIFYING.includes(id)) return { level: 'identifying', warn: true };
  return { level: 'unknown', warn: true };
}`,
      },

      "returns a bare boolean, so the modal cannot say what would leak": {
        expect: "sharing to WhatsApp is identifying and warns",
        impl: `const IDENTIFYING = ${IDENTIFYING};
const SAFE_TARGETS = ['com.apple.print', 'save_to_files'];
function shareAdvice(action, target) {
  if (['qr', 'print', 'request_flow', 'copy'].includes(action)) return false;
  if (action !== 'share_sheet') return true;
  const id = String(target == null ? '' : target).trim().toLowerCase();
  if (SAFE_TARGETS.includes(id)) return false;
  return true;
}`,
      },
    },
  },
};
