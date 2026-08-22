/* Wrong-answer cases for a11/0001 — swipeOutcome.
 *
 *   node scripts/verify-lesson.mjs modules/a11-polish-publish/0001-animations-gestures.html \
 *        --wrong scripts/cases/0001-animations-gestures.mjs
 *
 * Staged: `exercise-1` is a Reanimated + Gesture Handler component and carries
 * its own per-exercise `unverifiable` reason, so only `swipe` has cases.
 *
 * Why this function. The lesson's swipe-to-revoke used one rule — did the card
 * travel 35% of the screen — and then fired a TERMINAL action from the end of
 * a pan, with no confirmation, animating the row away before the request was
 * made. `revoked_at` is "set once, never cleared" (b2/0001) and b7/0003 makes
 * revoked a state nothing leaves. So the two failure directions here are not
 * symmetric: a false snap-back costs a second, and a false commit costs a
 * capability that cannot be recreated and a channel the other party cannot
 * recover.
 *
 * The gesture decision is where that lives, and it is ten lines of arithmetic.
 *
 * The headline pair:
 *
 *   DISTANCE ONLY. It is the rule everyone writes first and it is wrong in
 *   both directions at once: a fast flick that travels 55px is a deliberate
 *   swipe and gets ignored, while a drag that went past the line and was
 *   flicked BACK before release gets committed. The second one revokes a
 *   token the user just decided not to revoke, and there is no undo.
 *
 *   A HARDCODED PIXEL THRESHOLD. 137px is 35% of a phone and 17% of a tablet.
 *   It passes every test on the device it was written on, and the control
 *   quietly becomes hair-trigger on anything wider. Nothing fails; the feature
 *   just gets more dangerous the bigger the screen.
 *
 * Then the quieter ones. Testing |velocityX| rather than its direction, so a
 * hard swipe the WRONG way commits. Letting progress run past 1 or below 0,
 * which drives the opacity of the destructive action behind the card. Folding
 * 'ignore' into 'snapBack', so a thumb resting on a scrolling list fires a
 * spring on every touch. And a veto so eager that any rightward drift at
 * release cancels a swipe the user did finish.
 *
 * NOTE on ordering. Several of these differ from the right answer only in WHERE
 * a test sits, not in whether it exists — the veto has to be asked before the
 * distance rule, not inside its else. That is the kind of bug that survives
 * review because every individual line is defensible.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

/* One correct implementation with named seams, so each case differs from the
 * right answer in exactly one place by construction. */
const PARTS = {
  threshold: `  const thresholdPx = config.width * config.thresholdFraction;`,

  derive: `
  const travel = -gesture.translationX;
  const velocityAway = -gesture.velocityX;`,

  progress: `
  const progress = travel <= 0
    ? 0
    : Math.max(0, Math.min(1, travel / thresholdPx));`,

  ignore: `
  if (Math.abs(gesture.translationX) < config.minTravel) {
    return { action: "ignore", progress };
  }`,

  wrongWay: `
  if (travel <= 0) {
    return { action: "snapBack", progress };
  }`,

  veto: `
  const flickingBack = gesture.velocityX > config.minVelocity;
  if (flickingBack) {
    return { action: "snapBack", progress };
  }`,

  decide: `
  const farEnough = travel >= thresholdPx;
  const fastEnough = velocityAway >= config.minVelocity;
  return {
    action: farEnough || fastEnough ? "commit" : "snapBack",
    progress,
  };`,
};

function build(overrides = {}) {
  const p = { ...PARTS, ...overrides };
  return `function swipeOutcome(gesture, config) {
${p.threshold}
${p.derive}
${p.progress}
${p.ignore}
${p.wrongWay}
${p.veto}
${p.decide}
}`;
}

export const stages = {
  swipe: {
    alternatives: [
      // Everything computed into one descriptor first, then a single
      // decision expression. No early returns at all.
      `function swipeOutcome(gesture, config) {
        const thresholdPx = config.width * config.thresholdFraction;
        const travel = -gesture.translationX;
        const movedAtAll = Math.abs(gesture.translationX) >= config.minTravel;
        const wentTheRightWay = travel > 0;
        const farEnough = travel >= thresholdPx;
        const flungAway = -gesture.velocityX >= config.minVelocity;
        const flungBack = gesture.velocityX > config.minVelocity;

        const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
        const progress = wentTheRightWay ? clamp(travel / thresholdPx) : 0;

        if (!movedAtAll) return { action: "ignore", progress };

        const committed =
          wentTheRightWay && !flungBack && (farEnough || flungAway);

        return { action: committed ? "commit" : "snapBack", progress };
      }`,

      // A small rules pipeline: each rule may claim the gesture, and the
      // first one that does wins. Progress computed separately.
      `function swipeOutcome(gesture, config) {
        const px = config.width * config.thresholdFraction;
        const travel = 0 - gesture.translationX;
        const away = 0 - gesture.velocityX;

        let progress = 0;
        if (travel > 0) {
          progress = travel / px;
          if (progress > 1) progress = 1;
        }

        const rules = [
          function () {
            if (Math.abs(gesture.translationX) < config.minTravel) return "ignore";
          },
          function () {
            if (travel <= 0) return "snapBack";
          },
          function () {
            if (gesture.velocityX > config.minVelocity) return "snapBack";
          },
          function () {
            if (travel >= px) return "commit";
          },
          function () {
            if (away >= config.minVelocity) return "commit";
          },
        ];

        for (const rule of rules) {
          const verdict = rule();
          if (verdict) return { action: verdict, progress: progress };
        }
        return { action: "snapBack", progress: progress };
      }`,
    ],

    mistakes: [
      {
        // The rule the lesson shipped. A deliberate flick that travelled
        // 55px is treated as an accident.
        expect: "a fast flick commits even though it barely moved",
        impl: build({
          decide: `
  return {
    action: travel >= thresholdPx ? "commit" : "snapBack",
    progress,
  };`,
        }),
      },
      {
        // No veto. Dragged past the line, changed their mind, flicked back,
        // released -- and the token is revoked. Nothing to undo.
        expect: "dragged past the threshold but flicked back snaps back",
        impl: build({ veto: `  // (no veto)` }),
      },
      {
        // The veto exists but is asked inside the else, so it only rescues
        // gestures that were going to snap back anyway. Every line is
        // defensible; the ordering is the bug.
        expect: "dragged past the threshold but flicked back snaps back",
        impl: build({
          veto: `  // (moved into the decision below)`,
          decide: `
  const farEnough = travel >= thresholdPx;
  const fastEnough = velocityAway >= config.minVelocity;
  if (farEnough) return { action: "commit", progress };
  if (gesture.velocityX > config.minVelocity) return { action: "snapBack", progress };
  return { action: fastEnough ? "commit" : "snapBack", progress };`,
        }),
      },
      {
        // A veto so eager that releasing with any rightward drift cancels a
        // swipe the user did finish. Over-correcting the previous bug.
        expect: "a gentle drift back does NOT veto a committed distance",
        impl: build({
          veto: `
  if (gesture.velocityX > 0) {
    return { action: "snapBack", progress };
  }`,
        }),
      },
      {
        // Threshold frozen as pixels. Correct on the phone it was written
        // on, hair-trigger on a tablet, and nothing ever reports it.
        expect: "and the identical gesture snaps back on an 800-wide tablet",
        impl: build({ threshold: `  const thresholdPx = 137;` }),
      },
      {
        // Tests the MAGNITUDE of the velocity rather than its direction, so
        // a fast thumb is read as enthusiasm whichever way the card went.
        // Note the plain right-swipe does NOT expose this -- the veto
        // catches that one by accident -- which is why the self-check needs
        // the mirror gesture: displaced right, moving left at release.
        expect: "net movement the wrong way is not rescued by a fast flick toward the action",
        impl: build({
          wrongWay: `  // (no direction check)`,
          decide: `
  const farEnough = travel >= thresholdPx;
  const fastEnough = Math.abs(gesture.velocityX) >= config.minVelocity;
  return {
    action: farEnough || fastEnough ? "commit" : "snapBack",
    progress,
  };`,
        }),
      },
      {
        // minTravel measured against the SIGNED travel, so a big wrong-way
        // swipe reports 'ignore'. The card moved; it has to spring back.
        expect: "a hard swipe the wrong way never commits",
        impl: build({
          ignore: `
  if (travel < config.minTravel) {
    return { action: "ignore", progress };
  }`,
        }),
      },
      {
        // No clamp. progress feeds an opacity, so a long swipe drives it
        // past 1 -- which is exactly what Extrapolation.CLAMP exists for.
        expect: "progress is clamped at 1, not 2.2",
        impl: build({
          progress: `
  const progress = travel <= 0 ? 0 : travel / thresholdPx;`,
        }),
      },
      {
        // Progress goes negative when the card is dragged the wrong way.
        expect: "progress is 0 for movement the wrong way, never negative",
        impl: build({
          progress: `
  const progress = Math.min(1, travel / thresholdPx);`,
        }),
      },
      {
        // Progress measured against the screen width instead of the
        // threshold, so the reveal is still nearly invisible at the moment
        // the swipe commits.
        expect: "progress is 0.5 at half the threshold",
        impl: build({
          progress: `
  const progress = travel <= 0
    ? 0
    : Math.max(0, Math.min(1, travel / config.width));`,
        }),
      },
      {
        // 'ignore' folded into 'snapBack'. A thumb resting on a scrolling
        // list now fires a spring animation on every single touch.
        expect: "a thumb resting with no movement is ignored",
        impl: build({ ignore: `  // (no ignore state)` }),
      },
    ],
  },
};
