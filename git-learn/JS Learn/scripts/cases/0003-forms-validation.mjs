/* Wrong-answer cases for a11/0003 — toCreateTokenPayload.
 *
 *   node scripts/verify-lesson.mjs modules/a11-polish-publish/0003-forms-validation.html \
 *        --wrong scripts/cases/0003-forms-validation.mjs
 *
 * Staged: `exercise-1` is a React Native screen with react-hook-form and a
 * DateTimePicker and carries its own per-exercise `unverifiable` reason, so
 * only `payload` has cases.
 *
 * Why this function. The lesson's own number handler was
 *
 *     const num = parseInt(text, 10);
 *     onChange(isNaN(num) ? undefined : num);
 *
 * which reads as careful defensive coding and hands out the most permissive
 * value the form can produce. `undefined` on an `.optional()` field is not
 * "invalid", it is ABSENT, and absent on `maxUses` means UNLIMITED. A user who
 * types 3 and fumbles a letter issues a token with no limit, and every layer
 * afterwards agrees the request was valid. There is no error to find later —
 * the only trace is a token that still works after the third use.
 *
 * The headline pair:
 *
 *   AN UNREADABLE VALUE BECOMING AN ABSENCE. The substituted default is always
 *   the permissive one, because permissive is what "no opinion" looks like.
 *   Fourth lesson this shape has appeared in; b7/0002's unknown rule type
 *   falling through to `allowed` is the same bug in the backend.
 *
 *   CONVERTING BEFORE CHECKING BLANK. `Number('')` is 0, and 0 means "no uses
 *   at all". So an implementation that converts first turns every untouched
 *   field into a dead token — the exact opposite failure, from one line's
 *   ordering, and just as silent.
 *
 * Then the quieter ones. Measuring a label before trimming it (accepting
 * '  ab  ' as eight characters). Sending '' instead of omitting the key, which
 * passes a required-check and defeats every `??` downstream. Comparing a date
 * before testing it, when every comparison with Invalid Date is false.
 * Filtering an unknown channel out instead of refusing it, which issues a
 * weaker token than the one the user built. Returning on the first error.
 *
 * NOTE on the date case. The tempting wrong version calls `.toISOString()` on
 * an Invalid Date, which THROWS — and a throw inside the function aborts the
 * whole self-check and reports as "could not run", which reads as a verifier
 * fault rather than a caught mistake. The case below passes the raw string
 * through instead, which is what a real implementation does and what the
 * check is actually there to catch.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

/* One correct implementation with named seams, so a case can differ from the
 * right answer in exactly one place. Anything not overridden is correct. */
const PARTS = {
  trim: `const text = (v) => (typeof v === "string" ? v.trim() : "");`,

  label: `
  const label = text(values.label);
  if (label.length < 3) errors.label = "Label must be at least 3 characters";
  else if (label.length > 50) errors.label = "Label must be at most 50 characters";
  else payload.label = label;`,

  issuedTo: `
  const issuedTo = text(values.issuedTo);
  if (issuedTo !== "") {
    if (issuedTo.length > 100) errors.issuedTo = "Name too long";
    else payload.issuedTo = issuedTo;
  }`,

  maxUses: `
  const rawMax = text(values.maxUses);
  if (rawMax !== "") {
    const n = Number(rawMax);
    if (!Number.isInteger(n)) errors.maxUses = "Enter a whole number";
    else if (n < 0) errors.maxUses = "Cannot be negative";
    else if (n > 1000) errors.maxUses = "Maximum 1000 uses";
    else payload.maxUses = n;
  }`,

  expiresAt: `
  const rawExpiry = text(values.expiresAt);
  if (rawExpiry !== "") {
    const when = new Date(rawExpiry);
    if (Number.isNaN(when.getTime())) errors.expiresAt = "Pick a date";
    else if (when <= at) errors.expiresAt = "Expiry must be in the future";
    else payload.expiresAt = when.toISOString();
  }`,

  channels: `
  const ALLOWED = ["chat", "voice", "video"];
  const channels = Array.isArray(values.channels) ? values.channels : [];
  const unknown = channels.filter((c) => !ALLOWED.includes(c));
  if (channels.length === 0) errors.channels = "Select at least one channel";
  else if (unknown.length > 0) errors.channels = "Unknown channel: " + unknown.join(", ");
  else payload.channels = channels.slice();`,

  ret: `
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, payload };`,
};

function build(overrides = {}) {
  const p = { ...PARTS, ...overrides };
  return `function toCreateTokenPayload(values, now) {
  const errors = {};
  const payload = {};
  const at = now instanceof Date ? now : new Date();
  ${p.trim}
${p.label}
${p.issuedTo}
${p.maxUses}
${p.expiresAt}
${p.channels}
${p.ret}
}`;
}

export const stages = {
  payload: {
    alternatives: [
      // Table-driven: the same rules expressed as a list of field handlers
      // rather than as straight-line code. Different shape, same behaviour.
      `function toCreateTokenPayload(values, now) {
        const at = now instanceof Date ? now : new Date();
        const trim = (v) => (typeof v === "string" ? v.trim() : "");
        const errors = {};
        const payload = {};

        const put = (key, result) => {
          if (result === undefined) return;              // absent
          if (typeof result === "string") errors[key] = result;
          else payload[key] = result.value;
        };

        const raw = {
          label: trim(values.label),
          issuedTo: trim(values.issuedTo),
          maxUses: trim(values.maxUses),
          expiresAt: trim(values.expiresAt),
        };

        put("label",
          raw.label.length < 3 ? "Label must be at least 3 characters"
          : raw.label.length > 50 ? "Label must be at most 50 characters"
          : { value: raw.label });

        put("issuedTo",
          raw.issuedTo === "" ? undefined
          : raw.issuedTo.length > 100 ? "Name too long"
          : { value: raw.issuedTo });

        if (raw.maxUses !== "") {
          const n = Number(raw.maxUses);
          put("maxUses",
            !Number.isInteger(n) ? "Enter a whole number"
            : n < 0 ? "Cannot be negative"
            : n > 1000 ? "Maximum 1000 uses"
            : { value: n });
        }

        if (raw.expiresAt !== "") {
          const when = new Date(raw.expiresAt);
          put("expiresAt",
            Number.isNaN(when.getTime()) ? "Pick a date"
            : when <= at ? "Expiry must be in the future"
            : { value: when.toISOString() });
        }

        const ALLOWED = ["chat", "voice", "video"];
        const chans = Array.isArray(values.channels) ? values.channels : [];
        const bad = chans.filter((c) => ALLOWED.indexOf(c) === -1);
        put("channels",
          chans.length === 0 ? "Select at least one channel"
          : bad.length > 0 ? "Unknown channel: " + bad.join(", ")
          : { value: chans.concat() });

        return Object.keys(errors).length
          ? { ok: false, errors }
          : { ok: true, payload };
      }`,

      // Collects errors as a list of [field, message] pairs and builds the
      // object at the end; uses a regex to decide whether maxUses is a whole
      // number instead of Number.isInteger.
      `function toCreateTokenPayload(values, now) {
        const at = now instanceof Date ? now : new Date();
        const clean = (v) => String(v ?? "").trim();
        const problems = [];
        const out = {};

        const label = clean(values.label);
        if (label.length < 3 || label.length > 50)
          problems.push(["label", "Label must be 3-50 characters"]);
        else out.label = label;

        const who = clean(values.issuedTo);
        if (who.length > 100) problems.push(["issuedTo", "Name too long"]);
        else if (who.length > 0) out.issuedTo = who;

        const max = clean(values.maxUses);
        if (max.length > 0) {
          const n = Number(max);
          if (!/^-?\\d+$/.test(max) && !Number.isInteger(n))
            problems.push(["maxUses", "Enter a whole number"]);
          else if (!Number.isInteger(n))
            problems.push(["maxUses", "Enter a whole number"]);
          else if (n < 0 || n > 1000)
            problems.push(["maxUses", "Must be between 0 and 1000"]);
          else out.maxUses = n;
        }

        const until = clean(values.expiresAt);
        if (until.length > 0) {
          const d = new Date(until);
          if (isNaN(d.getTime())) problems.push(["expiresAt", "Pick a date"]);
          else if (d.getTime() <= at.getTime())
            problems.push(["expiresAt", "Expiry must be in the future"]);
          else out.expiresAt = d.toISOString();
        }

        const list = Array.isArray(values.channels) ? [...values.channels] : [];
        const ok = new Set(["chat", "voice", "video"]);
        if (!list.length) problems.push(["channels", "Select at least one channel"]);
        else if (list.some((c) => !ok.has(c)))
          problems.push(["channels", "Unknown channel: " + list.filter((c) => !ok.has(c)).join(", ")]);
        else out.channels = list;

        if (!problems.length) return { ok: true, payload: out };
        const errors = {};
        for (const [field, message] of problems) errors[field] = message;
        return { ok: false, errors };
      }`,
    ],

    mistakes: [
      {
        // The handler the lesson shipped. An unreadable entry becomes an
        // absence, and absent means unlimited.
        expect: "an unreadable maxUses is refused, never silently unlimited",
        impl: build({
          maxUses: `
  const rawMax = text(values.maxUses);
  if (rawMax !== "") {
    const n = parseInt(rawMax, 10);
    if (isNaN(n)) {
      // "not a number, so leave it out" -- leaving it out means unlimited
    } else if (n < 0) errors.maxUses = "Cannot be negative";
    else if (n > 1000) errors.maxUses = "Maximum 1000 uses";
    else payload.maxUses = n;
  }`,
        }),
      },
      {
        // parseInt reads a prefix. '1e3' becomes 1 rather than 1000, so the
        // user asks for a thousand uses and gets one. No error anywhere.
        expect: "'1e3' is 1000, not 1",
        impl: build({
          maxUses: `
  const rawMax = text(values.maxUses);
  if (rawMax !== "") {
    const n = parseInt(rawMax, 10);
    if (!Number.isInteger(n)) errors.maxUses = "Enter a whole number";
    else if (n < 0) errors.maxUses = "Cannot be negative";
    else if (n > 1000) errors.maxUses = "Maximum 1000 uses";
    else payload.maxUses = n;
  }`,
        }),
      },
      {
        // Converts before checking blank. Number('') is 0, so every field the
        // user never touched becomes a token that permits nothing.
        expect: "a blank maxUses is omitted, not turned into 0 by Number('')",
        impl: build({
          maxUses: `
  const rawMax = text(values.maxUses);
  const n = Number(rawMax);
  if (!Number.isInteger(n)) errors.maxUses = "Enter a whole number";
  else if (n < 0) errors.maxUses = "Cannot be negative";
  else if (n > 1000) errors.maxUses = "Maximum 1000 uses";
  else payload.maxUses = n;`,
        }),
      },
      {
        // A falsy guard before writing the value. Drops 0, which is the one
        // number on this field that means the opposite of leaving it out.
        expect: "and survives as the number 0, not as an absence",
        impl: build({
          maxUses: `
  const rawMax = text(values.maxUses);
  if (rawMax !== "") {
    const n = Number(rawMax);
    if (!Number.isInteger(n)) errors.maxUses = "Enter a whole number";
    else if (n < 0) errors.maxUses = "Cannot be negative";
    else if (n > 1000) errors.maxUses = "Maximum 1000 uses";
    else if (n) payload.maxUses = n;   // "skip empty values"
  }`,
        }),
      },
      {
        // Accepts 2.5 because Number() is happy with it. The column is an
        // INTEGER, so this is a 500 at insert time rather than a form error.
        expect: "a fractional maxUses is refused",
        impl: build({
          maxUses: `
  const rawMax = text(values.maxUses);
  if (rawMax !== "") {
    const n = Number(rawMax);
    if (Number.isNaN(n)) errors.maxUses = "Enter a whole number";
    else if (n < 0) errors.maxUses = "Cannot be negative";
    else if (n > 1000) errors.maxUses = "Maximum 1000 uses";
    else payload.maxUses = n;
  }`,
        }),
      },
      {
        // Measures the raw string and trims only what it stores. '  ab  ' is
        // six characters, so a two-character label is accepted.
        expect: "label length is measured after trimming",
        impl: build({
          label: `
  const rawLabel = typeof values.label === "string" ? values.label : "";
  if (rawLabel.length < 3) errors.label = "Label must be at least 3 characters";
  else if (rawLabel.length > 50) errors.label = "Label must be at most 50 characters";
  else payload.label = rawLabel.trim();`,
        }),
      },
      {
        // Sends '' rather than omitting the key. It passes a required-check,
        // reaches the column, and defeats every ?? fallback downstream.
        expect: "a whitespace-only field is an absence, not an empty string",
        impl: build({
          issuedTo: `
  const issuedTo = text(values.issuedTo);
  if (issuedTo.length > 100) errors.issuedTo = "Name too long";
  else payload.issuedTo = issuedTo;`,
        }),
      },
      {
        // Compares before testing. Every comparison with Invalid Date is
        // false, so 'next tuesday' is not in the past and sails through.
        // Passes the raw string on rather than calling toISOString(), which
        // would throw and abort the whole self-check.
        expect: "an unparseable expiry is refused, not sent as Invalid Date",
        impl: build({
          expiresAt: `
  const rawExpiry = text(values.expiresAt);
  if (rawExpiry !== "") {
    const when = new Date(rawExpiry);
    if (when <= at) errors.expiresAt = "Expiry must be in the future";
    else payload.expiresAt = rawExpiry;
  }`,
        }),
      },
      {
        // Filters the unknown channel out. The form submits happily and the
        // user gets a token that does less than the one they built.
        expect: "an unknown channel is refused, not filtered out",
        impl: build({
          channels: `
  const ALLOWED = ["chat", "voice", "video"];
  const channels = Array.isArray(values.channels) ? values.channels : [];
  const kept = channels.filter((c) => ALLOWED.includes(c));
  if (kept.length === 0) errors.channels = "Select at least one channel";
  else payload.channels = kept;`,
        }),
      },
      {
        // Returns on the first problem. One mistake per submit, and the user
        // fixes the label only to be told about the channels.
        expect: "every error is reported at once",
        impl: build({
          ret: `
  return { ok: true, payload };`,
          label: `
  const label = text(values.label);
  if (label.length < 3) return { ok: false, errors: { label: "Label must be at least 3 characters" } };
  if (label.length > 50) return { ok: false, errors: { label: "Label must be at most 50 characters" } };
  payload.label = label;`,
          maxUses: `
  const rawMax = text(values.maxUses);
  if (rawMax !== "") {
    const n = Number(rawMax);
    if (!Number.isInteger(n)) return { ok: false, errors: { maxUses: "Enter a whole number" } };
    if (n < 0) return { ok: false, errors: { maxUses: "Cannot be negative" } };
    if (n > 1000) return { ok: false, errors: { maxUses: "Maximum 1000 uses" } };
    payload.maxUses = n;
  }`,
          channels: `
  const ALLOWED = ["chat", "voice", "video"];
  const channels = Array.isArray(values.channels) ? values.channels : [];
  const unknown = channels.filter((c) => !ALLOWED.includes(c));
  if (channels.length === 0) return { ok: false, errors: { channels: "Select at least one channel" } };
  if (unknown.length > 0) return { ok: false, errors: { channels: "Unknown channel: " + unknown.join(", ") } };
  payload.channels = channels.slice();`,
        }),
      },
      {
        // Trims in place "to keep the form tidy". react-hook-form is still
        // holding this object and will render from it.
        expect: "values is not mutated",
        impl: build({
          trim: `const text = (v) => (typeof v === "string" ? v.trim() : "");
  for (const key of ["label", "issuedTo", "maxUses", "expiresAt"]) {
    if (typeof values[key] === "string") values[key] = values[key].trim();
  }`,
        }),
      },
    ],
  },
};
