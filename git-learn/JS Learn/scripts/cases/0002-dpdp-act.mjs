/* Wrong-answer cases for b10/0002 — planErasure.
 *
 *   node scripts/verify-lesson.mjs modules/b10-security-compliance/0002-dpdp-act.html \
 *        --wrong scripts/cases/0002-dpdp-act.mjs
 *
 * Staged: `exercise-1` is Express routes plus a SQL migration and carries its
 * own per-exercise `unverifiable` reason, so only `erase` has cases.
 *
 * Why this function and not the endpoint. The erasure order in this lesson was
 * written by reading the schema by hand, and it was wrong from the day
 * `b2/0002` added `conversations` — it deleted `tokens` while two tables still
 * referenced it with ON DELETE RESTRICT, so the transaction would have thrown
 * for every user who had ever been messaged. Nothing caught it because nothing
 * ran it. The order is a property of the foreign keys; a function can read
 * them, a person re-reading their own list cannot.
 *
 * The headline pair:
 *
 *   TRUSTING THE ORDER YOU WERE HANDED. The store list is a description of a
 *   schema, not a plan. An implementation that maps over its input looks
 *   completely reasonable and reproduces the exact defect this lesson shipped.
 *
 *   A ONE-HOP PIN. A retained store obviously keeps its own parent alive; that
 *   much is easy to see and easy to write. That the parent's parent is also
 *   pinned is the part that needs a loop, and it is the part that decides
 *   whether the `users` row survives — which is the whole question a regulator
 *   would ask.
 *
 * Then the quieter ones. Treating sealed data as untouchable because we cannot
 * read it (the rows are still personal data; only the BACKUP tail differs).
 * Deleting the other party's rows along with the requester's. Summing the
 * waits instead of taking the longest. Counting a backup tail on ciphertext,
 * which turns a truthful "erased" into a needless seven-day caveat. And a
 * falsy test on `untilDays`, which is the `max_uses: 0` mistake wearing
 * different clothes: a retention expiring today is a retention.
 *
 * NOTE on the cycle case. The tempting wrong implementation does not hang —
 * a plain `seen` set terminates perfectly happily and returns a confident,
 * wrong order. That is worse than a hang, because a hang gets noticed.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Shared preamble: the retention scan and the action table are not what any
// of these cases is about, so they are written once and correctly.
const PRELUDE = `
function classify(stores) {
  const refused = [];
  const retained = new Set();
  for (const s of stores) {
    if (!s.retention) continue;
    const r = s.retention;
    const okReason = typeof r.reason === "string" && r.reason.trim() !== "";
    const okUntil = typeof r.untilDays === "number" && r.untilDays >= 0;
    if (okReason && okUntil) retained.add(s.name);
    else refused.push(s.name + ": a retention needs both a reason and an end date");
  }
  return { refused, retained };
}
function baseAction(store, retained, pinned) {
  if (retained.has(store.name)) return "retain";
  if (store.holds === "none") return "skip";
  if (store.holds === "other-party") return "anonymise";
  return pinned.has(store.name) ? "anonymise" : "delete";
}
function tailOf(stores, action, retained, backupTailDays) {
  let tail = 0;
  for (const s of stores) {
    const a = action(s);
    if (a === "retain") tail = Math.max(tail, s.retention.untilDays);
    else if (s.holds === "clear" && (a === "delete" || a === "anonymise"))
      tail = Math.max(tail, backupTailDays);
  }
  return tail;
}
// A correct topological sort, so that a case about (say) the backup tail
// differs from the right answer in exactly one place. A mistake that trips
// two checks does not tell you which distinction it was written to test.
function topo(stores, byName) {
  const order = [];
  const open = new Set();
  const done = new Set();
  let cycle = null;
  const visit = (name, trail) => {
    if (done.has(name)) return;
    if (open.has(name)) { cycle = trail.concat(name).join(" -> "); return; }
    const store = byName.get(name);
    if (!store) return;
    open.add(name);
    for (const ref of store.references || []) {
      visit(ref, trail.concat(name));
      if (cycle) return;
    }
    open.delete(name);
    done.add(name);
    order.push(name);
  };
  for (const s of stores) { visit(s.name, []); if (cycle) break; }
  order.reverse();
  return { order, cycle };
}
function pinFrom(byName, retained) {
  const pinned = new Set();
  const stack = [...retained];
  while (stack.length) {
    const s = byName.get(stack.pop());
    for (const ref of (s && s.references) || []) {
      if (!pinned.has(ref)) { pinned.add(ref); stack.push(ref); }
    }
  }
  return pinned;
}
`;

export const stages = {
  erase: {
    alternatives: [
      // Kahn's algorithm instead of depth-first. Produces a DIFFERENT but
      // equally valid order, which is the point of asserting the ordering as
      // pairwise constraints rather than as one blessed array.
      `${PRELUDE}
      function planErasure(stores, options) {
        const backupTailDays = (options && options.backupTailDays) || 0;
        const byName = new Map(stores.map(s => [s.name, s]));
        const { refused, retained } = classify(stores);

        // Count, for each store, how many others reference it. A store with
        // none left pointing at it is safe to handle.
        const inbound = new Map(stores.map(s => [s.name, 0]));
        for (const s of stores)
          for (const ref of s.references || [])
            if (inbound.has(ref)) inbound.set(ref, inbound.get(ref) + 1);

        const ready = stores.filter(s => inbound.get(s.name) === 0).map(s => s.name);
        const order = [];
        while (ready.length) {
          const name = ready.shift();
          order.push(name);
          for (const ref of (byName.get(name).references) || []) {
            if (!inbound.has(ref)) continue;
            inbound.set(ref, inbound.get(ref) - 1);
            if (inbound.get(ref) === 0) ready.push(ref);
          }
        }

        if (order.length !== stores.length) {
          refused.push("cycle: some stores reference each other — refusing to guess an order");
          return { steps: [], refused, tailDays: 0 };
        }

        const pinned = pinFrom(byName, retained);
        const act = (s) => baseAction(s, retained, pinned);
        return {
          steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
          refused,
          tailDays: tailOf(stores, act, retained, backupTailDays),
        };
      }`,

      // Recursive pin instead of an explicit stack, and the tail computed by
      // reducing over the finished steps rather than over the input.
      `${PRELUDE}
      function planErasure(stores, options) {
        const backupTailDays = (options && options.backupTailDays) || 0;
        const byName = new Map(stores.map(s => [s.name, s]));
        const { refused, retained } = classify(stores);

        const order = [];
        const open = new Set();
        const done = new Set();
        let cycle = null;
        const visit = (name, trail) => {
          if (done.has(name)) return;
          if (open.has(name)) { cycle = trail.concat(name).join(" -> "); return; }
          const store = byName.get(name);
          if (!store) return;
          open.add(name);
          for (const ref of store.references || []) {
            visit(ref, trail.concat(name));
            if (cycle) return;
          }
          open.delete(name);
          done.add(name);
          order.unshift(name);
        };
        for (const s of stores) { visit(s.name, []); if (cycle) break; }

        if (cycle) {
          refused.push("cycle: " + cycle + " — refusing to guess an order");
          return { steps: [], refused, tailDays: 0 };
        }

        const pinned = new Set();
        const pin = (name) => {
          const store = byName.get(name);
          for (const ref of (store && store.references) || []) {
            if (pinned.has(ref)) continue;
            pinned.add(ref);
            pin(ref);
          }
        };
        retained.forEach(pin);

        const act = (s) => baseAction(s, retained, pinned);
        const steps = order.map(n => ({ store: n, action: act(byName.get(n)) }));

        const tailDays = steps.reduce((worst, step) => {
          const store = byName.get(step.store);
          if (step.action === "retain")
            return Math.max(worst, store.retention.untilDays);
          if (store.holds === "clear" &&
              (step.action === "delete" || step.action === "anonymise"))
            return Math.max(worst, backupTailDays);
          return worst;
        }, 0);

        return { steps, refused, tailDays };
      }`,
    ],

    mistakes: [
      {
        // The defect this lesson actually shipped. The input is a description
        // of a schema; treating it as a plan is how a hand-written DELETE
        // order survives a migration that adds a table above it.
        expect: "conversations before tokens",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const pinned = pinFrom(byName, retained);
          const act = (s) => baseAction(s, retained, pinned);
          return {
            steps: stores.map(s => ({ store: s.name, action: act(s) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // Topological sort, correct in every respect except that it emits
        // parents first. Deletes users before tokens — the same RESTRICT
        // violation, reached by doing the hard part right.
        expect: "tokens before users",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const order = [];
          const done = new Set();
          const open = new Set();
          const visit = (name) => {
            if (done.has(name) || open.has(name)) return;
            const store = byName.get(name);
            if (!store) return;
            open.add(name);
            for (const ref of store.references || []) visit(ref);
            open.delete(name);
            done.add(name);
            order.push(name);          // no reverse
          };
          for (const s of stores) visit(s.name);
          const pinned = pinFrom(byName, retained);
          const act = (s) => baseAction(s, retained, pinned);
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // A plain `seen` set cannot tell "finished" from "on the stack", so a
        // loop is silently accepted and a confident order is returned. It does
        // not hang, which is exactly what makes it dangerous.
        expect: "a cycle produces no steps",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const order = [];
          const seen = new Set();
          const visit = (name) => {
            if (seen.has(name)) return;
            const store = byName.get(name);
            if (!store) return;
            seen.add(name);
            for (const ref of store.references || []) visit(ref);
            order.push(name);
          };
          for (const s of stores) visit(s.name);
          order.reverse();
          const pinned = pinFrom(byName, retained);
          const act = (s) => baseAction(s, retained, pinned);
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // The pin stops after one hop. tokens is saved, users is not — so the
        // plan emits DELETE FROM users while a retained redemption_events row
        // still reaches it through tokens. Passes any two-table schema.
        expect: "the pin carries all the way to users",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);

          const pinned = new Set();
          for (const name of retained)
            for (const ref of (byName.get(name).references) || []) pinned.add(ref);

          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          const act = (s) => baseAction(s, retained, pinned);
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // Over-broad pin: anything sharing a parent with a retained store is
        // spared too. Safe-looking, and it silently converts a lawful deletion
        // into indefinite retention — the failure mode nobody complains about.
        expect: "a store the retention does NOT reach is still deleted",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);

          const pinned = pinFrom(byName, retained);
          // "if it points at anything we are keeping, keep it too"
          for (const s of stores)
            for (const ref of s.references || [])
              if (pinned.has(ref) || retained.has(ref)) pinned.add(s.name);

          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          const act = (s) => baseAction(s, retained, pinned);
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // "We cannot read it, so it is not ours to erase." Sealed rows are
        // still personal data and still go. What sealing changes is the
        // BACKUP tail, not the deletion.
        expect: "sealed data is still deleted",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const pinned = pinFrom(byName, retained);
          const act = (s) => {
            if (s.holds === "sealed") return "skip";
            return baseAction(s, retained, pinned);
          };
          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // Deletes the other party's rows along with the requester's. One
        // person's erasure request destroying another person's record is the
        // export bug in reverse.
        expect: "the other party's rows are anonymised, not deleted",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const pinned = pinFrom(byName, retained);
          const act = (s) => {
            if (retained.has(s.name)) return "retain";
            if (s.holds === "none") return "skip";
            return pinned.has(s.name) ? "anonymise" : "delete";
          };
          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
      {
        // Adds the waits together. Every one of them is running at the same
        // time, so the answer is the longest, not the total — and the total
        // is a promise you break by being early.
        expect: "tailDays is the largest wait, not the backup window",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const pinned = pinFrom(byName, retained);
          const act = (s) => baseAction(s, retained, pinned);
          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          let tailDays = 0;
          for (const s of stores) {
            const a = act(s);
            if (a === "retain") tailDays += s.retention.untilDays;
            else if (s.holds === "clear" && (a === "delete" || a === "anonymise"))
              tailDays += backupTailDays;
          }
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays,
          };
        }`,
      },
      {
        // Counts a backup tail on sealed data. Harmless-looking, and it costs
        // the product the one honest thing E2EE bought it: the ability to say
        // the message bodies are already beyond reach.
        expect: "sealed data leaves no backup tail",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const { refused, retained } = classify(stores);
          const pinned = pinFrom(byName, retained);
          const act = (s) => baseAction(s, retained, pinned);
          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          let tailDays = 0;
          for (const s of stores) {
            const a = act(s);
            if (a === "retain") tailDays = Math.max(tailDays, s.retention.untilDays);
            else if (a === "delete" || a === "anonymise")
              tailDays = Math.max(tailDays, backupTailDays);   // no holds check
          }
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays,
          };
        }`,
      },
      {
        // A truthy test on the retention object. Accepts anything with a
        // reason and no end date, which is how "we might need this" becomes
        // permanent.
        expect: "a retention with no end date is refused",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const refused = [];
          const retained = new Set();
          for (const s of stores) if (s.retention) retained.add(s.name);

          const pinned = new Set();
          const stack = [...retained];
          while (stack.length) {
            const store = byName.get(stack.pop());
            for (const ref of (store && store.references) || []) {
              if (!pinned.has(ref)) { pinned.add(ref); stack.push(ref); }
            }
          }
          const act = (s) => {
            if (retained.has(s.name)) return "retain";
            if (s.holds === "none") return "skip";
            if (s.holds === "other-party") return "anonymise";
            return pinned.has(s.name) ? "anonymise" : "delete";
          };
          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          let tailDays = 0;
          for (const s of stores) {
            const a = act(s);
            if (a === "retain") tailDays = Math.max(tailDays, s.retention.untilDays || 0);
            else if (s.holds === "clear" && (a === "delete" || a === "anonymise"))
              tailDays = Math.max(tailDays, backupTailDays);
          }
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays,
          };
        }`,
      },
      {
        // `if (r.untilDays)` instead of a numeric test. Rejects a retention
        // that expires today as though it had no end date at all — the
        // `max_uses: 0` mistake in a different table. 0 is a duration.
        expect: "untilDays: 0 is a retention, not a missing one",
        impl: `${PRELUDE}
        function planErasure(stores, options) {
          const backupTailDays = (options && options.backupTailDays) || 0;
          const byName = new Map(stores.map(s => [s.name, s]));
          const refused = [];
          const retained = new Set();
          for (const s of stores) {
            if (!s.retention) continue;
            const r = s.retention;
            if (r.reason && r.untilDays) retained.add(s.name);
            else refused.push(s.name + ": a retention needs both a reason and an end date");
          }
          const pinned = pinFrom(byName, retained);
          const act = (s) => baseAction(s, retained, pinned);
          const { order, cycle } = topo(stores, byName);
          if (cycle) {
            refused.push("cycle: " + cycle + " — refusing to guess an order");
            return { steps: [], refused, tailDays: 0 };
          }
          return {
            steps: order.map(n => ({ store: n, action: act(byName.get(n)) })),
            refused,
            tailDays: tailOf(stores, act, retained, backupTailDays),
          };
        }`,
      },
    ],
  },
};
