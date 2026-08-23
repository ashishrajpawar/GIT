// Wrong-answer cases for a2/0002 — toUpdatePayload.
//
// Fragment-composed: one correct implementation split into named pieces,
// each mistake overriding exactly one.
//
//   SAME     — rule 6, structural rather than reference comparison
//   PAYLOAD  — rules 1-4, what goes in the body
//   REFUSED  — rules 1 and 5, what is reported instead
//   RETURN   — rule 7
//
// The mistakes here divide by which of the three states of an optional
// field they destroy. Partial<T> gives `maxUses?: number | null` three
// states -- absent, null, and a number -- where the column has two, and
// the extra one is the entire meaning of a PATCH. Merge any two and the
// request still succeeds; what changes is which edits become impossible
// to express, which is why none of these produces an error anywhere.

const FRAGMENTS = {
  SAME: `
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);`,

  PAYLOAD: `
  for (const field of config.editable) {
    const next = after[field];
    if (next === undefined) continue;
    if (!same(before[field], next)) {
      payload[field] = next;
    }
  }`,

  REFUSED: `
  for (const field of Object.keys(after)) {
    if (after[field] === undefined) continue;
    if (config.editable.includes(field)) continue;
    if (same(before[field], after[field])) continue;
    refused.push(field);
  }`,

  RETURN: `
  return { payload, refused, changed: Object.keys(payload).length > 0 };`,
};

function build(overrides = {}) {
  const f = { ...FRAGMENTS, ...overrides };
  return `
function toUpdatePayload(before, after, config) {
  const payload = {};
  const refused = [];
${f.SAME}
${f.PAYLOAD}
${f.REFUSED}
${f.RETURN}
}`;
}

const alternatives = [
  // Builds the payload with reduce and the refusals with filter. Same
  // answers throughout.
  build({
    PAYLOAD: `
  config.editable
    .filter((field) => after[field] !== undefined)
    .filter((field) => !same(before[field], after[field]))
    .forEach((field) => { payload[field] = after[field]; });`,
    REFUSED: `
  Object.keys(after)
    .filter((field) => after[field] !== undefined)
    .filter((field) => !config.editable.includes(field))
    .filter((field) => !same(before[field], after[field]))
    .forEach((field) => refused.push(field));`,
  }),

  // Uses an explicit `in` test for rule 3 rather than an undefined
  // comparison, and a Set for the editable lookup. Equivalent for
  // every input here, since a form never holds an explicit undefined.
  build({
    PAYLOAD: `
  for (const field of config.editable) {
    if (!(field in after) || after[field] === undefined) continue;
    if (!same(before[field], after[field])) payload[field] = after[field];
  }`,
    REFUSED: `
  const editable = new Set(config.editable);
  for (const field of Object.keys(after)) {
    if (after[field] === undefined) continue;
    if (editable.has(field)) continue;
    if (same(before[field], after[field])) continue;
    refused.push(field);
  }`,
  }),
];

const mistakes = [
  {
    // THE bug. Nullish values dropped from the payload, so "remove the
    // limit" cannot be expressed. The user unticks the box, presses
    // Save, the request succeeds, and the limit is still there. Nothing
    // errors -- it is reported months later as "saving doesn't work
    // sometimes", which is unfindable.
    expect: "setting maxUses to null IS sent",
    impl: build({
      PAYLOAD: `
  for (const field of config.editable) {
    const next = after[field];
    if (next == null) continue;
    if (!same(before[field], next)) {
      payload[field] = next;
    }
  }`,
    }),
  },
  {
    // The same merge with a truthiness test, which additionally drops 0
    // -- and 0 on maxUses means "no uses permitted", the one setting a
    // security product most needs to be able to express. Fifth lesson
    // this shape has appeared in.
    expect: "...and 0 is sent too, being a real limit",
    impl: build({
      PAYLOAD: `
  for (const field of config.editable) {
    const next = after[field];
    if (!next) continue;
    if (!same(before[field], next)) {
      payload[field] = next;
    }
  }`,
    }),
  },
  {
    // Rule 3 merged the other way: undefined treated as a value, so a
    // field the form never touched is compared against before, differs,
    // and is sent as an explicit undefined -- which JSON.stringify then
    // DROPS from the body. The payload looks right in the debugger and
    // is missing a key on the wire, or worse, arrives as null.
    expect: "a field the form did not touch is never sent",
    impl: build({
      PAYLOAD: `
  for (const field of config.editable) {
    const next = after[field];
    if (!same(before[field], next)) {
      payload[field] = next;
    }
  }`,
    }),
  },
  {
    // Rule 2 dropped: every editable field sent every time, which is a
    // PUT wearing a PATCH's name. It works perfectly alone and
    // overwrites whatever a second device changed between your read and
    // your write -- with values you read before it did.
    expect: "an untouched form produces an empty payload",
    impl: build({
      PAYLOAD: `
  for (const field of config.editable) {
    const next = after[field];
    if (next === undefined) continue;
    payload[field] = next;
  }`,
    }),
  },
  {
    // Rule 6 by reference. Two arrays with identical contents are never
    // === , so an untouched rules array is "changed" on every save.
    // Needless writes, and each is a chance to clobber a concurrent
    // edit with data you did not touch.
    expect: "an equal-but-not-identical array is not a change",
    impl: build({
      SAME: `
  const same = (a, b) => a === b;`,
    }),
  },
  {
    // Rule 5: non-editable fields silently dropped instead of refused.
    // The screen believes it saved a status change and shows the new
    // value until the next reload, at which point it reverts with no
    // explanation.
    expect: "changing a non-editable field is refused",
    impl: build({ REFUSED: `` }),
  },
  {
    // Rule 5 over-applied: anything not editable is refused whether or
    // not it changed. A form that echoes the whole token back --
    // including id and createdAt, which it must, to render -- now
    // refuses every save.
    expect: "...while sending a non-editable field UNCHANGED is not a refusal",
    impl: build({
      REFUSED: `
  for (const field of Object.keys(after)) {
    if (after[field] === undefined) continue;
    if (config.editable.includes(field)) continue;
    refused.push(field);
  }`,
    }),
  },
  {
    // Rule 1: the payload built by walking after's keys rather than the
    // editable list, so a non-editable field that changed lands in the
    // body AND in refused. The server rejects it, and the refusal the
    // client already computed was never acted on.
    expect: "...and never reaches the payload",
    impl: build({
      PAYLOAD: `
  for (const field of Object.keys(after)) {
    const next = after[field];
    if (next === undefined) continue;
    if (!same(before[field], next)) {
      payload[field] = next;
    }
  }`,
    }),
  },
  {
    // Rule 7: changed reported from the caller's intent rather than the
    // computed payload, so an untouched form still fires a request. An
    // empty PATCH changes nothing and still moves updated_at, which is
    // enough to make a "recently edited" sort meaningless.
    expect: "an untouched form produces an empty payload",
    impl: build({
      RETURN: `
  return { payload, refused, changed: Object.keys(after).length > 0 };`,
    }),
  },
];

export const stages = {
  patch: { alternatives, mistakes },
};
