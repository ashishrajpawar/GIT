/* Wrong-answer cases for 02/0003-styling-and-flexbox.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0003-styling-and-flexbox.html \
 *        --wrong scripts/cases/0003-styling-and-flexbox.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for divides the leftover space by the COUNT of
 * flexible children instead of the SUM of their flex values. It is correct
 * whenever every flex is 1, which is almost every real layout — so it passes
 * casual testing and fails the first time somebody writes flex: 2.
 */

export const alternatives = {
  "two explicit loops instead of reduce": `function layoutRow(total, children) {
  let fixed = 0;
  let totalFlex = 0;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.width !== undefined) fixed = fixed + c.width;
    else if (c.flex !== undefined) totalFlex = totalFlex + c.flex;
  }

  const leftOver = total - fixed > 0 ? total - fixed : 0;

  const out = [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.width !== undefined) out.push(c.width);
    else if (totalFlex === 0) out.push(0);
    else out.push(leftOver * c.flex / totalFlex);
  }
  return out;
}`,

  "reduce for both totals, arrow map for the result": `const layoutRow = (total, children) => {
  const fixed = children.reduce((t, c) => t + (c.width ?? 0), 0);
  const totalFlex = children.reduce((t, c) => t + (c.width === undefined ? c.flex ?? 0 : 0), 0);
  const leftOver = Math.max(0, total - fixed);
  const perFlexUnit = totalFlex === 0 ? 0 : leftOver / totalFlex;

  return children.map((c) => (c.width !== undefined ? c.width : perFlexUnit * c.flex));
};`,

  "computes a unit price first, which is how the spec reads out loud": `function layoutRow(total, children) {
  const fixedChildren = children.filter((c) => c.width !== undefined);
  const flexChildren = children.filter((c) => c.width === undefined);

  const used = fixedChildren.reduce((t, c) => t + c.width, 0);
  const flexUnits = flexChildren.reduce((t, c) => t + c.flex, 0);
  const spare = Math.max(0, total - used);
  const pricePerUnit = flexUnits === 0 ? 0 : spare / flexUnits;

  return children.map((c) => (c.width !== undefined ? c.width : c.flex * pricePerUnit));
}`,
};

export const mistakes = {
  "divides the leftover by the count of flex children, not the sum of their flex": {
    expect: "flex 1 and flex 3 split it one-to-three",
    impl: `function layoutRow(total, children) {
  const fixed = children.reduce((t, c) => t + (c.width !== undefined ? c.width : 0), 0);
  const flexible = children.filter((c) => c.width === undefined);
  const leftOver = Math.max(0, total - fixed);

  return children.map((c) => {
    if (c.width !== undefined) return c.width;
    if (flexible.length === 0) return 0;
    return (leftOver / flexible.length) * c.flex;
  });
}`,
  },

  "lets an overflowing row produce negative widths": {
    expect: "an overflowing row gives flex children 0",
    impl: `function layoutRow(total, children) {
  let fixed = 0, totalFlex = 0;
  for (const c of children) {
    if (c.width !== undefined) fixed += c.width;
    else totalFlex += c.flex;
  }
  const leftOver = total - fixed;

  return children.map((c) =>
    c.width !== undefined ? c.width : totalFlex === 0 ? 0 : leftOver * (c.flex / totalFlex));
}`,
  },

  "hands leftover space to fixed children when nothing flexes": {
    expect: "leftover space is unused when nothing flexes",
    impl: `function layoutRow(total, children) {
  let fixed = 0, totalFlex = 0;
  for (const c of children) {
    if (c.width !== undefined) fixed += c.width;
    else totalFlex += c.flex;
  }
  const leftOver = Math.max(0, total - fixed);

  if (totalFlex === 0) {
    // "nothing else wants it, so stretch the fixed children"
    return children.map((c) => c.width + leftOver / children.length);
  }
  return children.map((c) =>
    c.width !== undefined ? c.width : leftOver * (c.flex / totalFlex));
}`,
  },

  "ignores flex values entirely and splits the leftover evenly": {
    expect: "flex 1 and flex 3 split it one-to-three",
    impl: `function layoutRow(total, children) {
  const fixed = children.reduce((t, c) => t + (c.width !== undefined ? c.width : 0), 0);
  const flexCount = children.filter((c) => c.width === undefined).length;
  const leftOver = Math.max(0, total - fixed);

  return children.map((c) =>
    c.width !== undefined ? c.width : flexCount === 0 ? 0 : leftOver / flexCount);
}`,
  },

  "sorts fixed children ahead of flexible ones, losing the given order": {
    expect: "results come back in the order the children were given",
    impl: `function layoutRow(total, children) {
  let fixed = 0, totalFlex = 0;
  for (const c of children) {
    if (c.width !== undefined) fixed += c.width;
    else totalFlex += c.flex;
  }
  const leftOver = Math.max(0, total - fixed);

  const ordered = [...children].sort((a, b) => {
    const aFixed = a.width !== undefined ? 0 : 1;
    const bFixed = b.width !== undefined ? 0 : 1;
    return aFixed - bFixed;
  });

  return ordered.map((c) =>
    c.width !== undefined ? c.width : totalFlex === 0 ? 0 : leftOver * (c.flex / totalFlex));
}`,
  },

  "treats flex as a pixel width rather than a share": {
    expect: "one flex child takes all the leftover",
    impl: `function layoutRow(total, children) {
  return children.map((c) => (c.width !== undefined ? c.width : c.flex));
}`,
  },
};
