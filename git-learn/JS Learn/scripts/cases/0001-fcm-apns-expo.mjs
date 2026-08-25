/* Wrong-answer cases for b8/0001 — buildPushPayload.
 *
 *   node scripts/verify-lesson.mjs modules/b8-push-notifications/0001-fcm-apns-expo.html \
 *        --wrong scripts/cases/0001-fcm-apns-expo.mjs
 *
 * Staged: `exercise-1` is an Expo dispatcher plus a SQL migration needing
 * FCM/APNs credentials, a device and a running Postgres, and carries its own
 * per-exercise `unverifiable` reason, so only `payload` has cases.
 *
 * This payload crosses the trust boundary twice — it is routed by Google or
 * Apple, and it is displayed on a lock screen to whoever is standing there.
 * So the mistakes divide by which of those two they hand something to:
 *
 *   Sending more than the server is entitled to send. The sealed bytes going
 *   out under a setting that did not ask for them, the whole event spread
 *   into `data`, the code surviving. These are silent and permanent: nothing
 *   errors, the notification looks perfect, and the disclosure has already
 *   happened by the time anybody could notice.
 *
 *   Rendering on the server what only the device may render. The 'full'
 *   setting is the trap. It reads like an instruction to show more, and the
 *   server has nothing more to show — so any implementation that makes
 *   'full' look different on the wire has invented content it does not have.
 *
 *   Getting the fallback wrong. An empty body "because the extension will
 *   fill it in" is the one that fails on exactly the devices where the
 *   extension did not run, which is the population you never tested on.
 *
 *   Badge arithmetic. null and 0 are opposite instructions and only one is
 *   falsy — max_uses again, arriving as a number on a home screen.
 *
 * The one to look at hardest is `spread-then-delete`. It produces a payload
 * with no `code` in it, so the obvious assertion passes, and it ships every
 * other field on the event including the sealed bytes under 'none'. An
 * allow-list is only an allow-list if you can name what came out.
 *
 * That case is also why the self-check gained "data holds ONLY the keys the
 * rules name". Asserting the ABSENCE of one dangerous field is exactly the
 * deny-list thinking the rule exists to prevent, and it was the only
 * assertion here until the case was written.
 *
 * TRIP COUNTS: 12 of 15 trip exactly one check. The three that trip more
 * were run individually and are inherent — one wrong rule, several
 * assertions that depend on it:
 *
 *   spread-no-delete      breaks all three allow-list checks.
 *   sealed-always-sent    breaks the withhold check and the key-set check.
 *   no-mutable-content    breaks both checks about that one field.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    prelude: ``,

    names: `const name = typeof event.holderName === "string" ? event.holderName.trim() : "";
  const label = typeof event.tokenLabel === "string" ? event.tokenLabel.trim() : "";`,

    dataInit: `const data = { type: event.kind };`,

    messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (preview === "full" && event.sealed) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    if (event.unreadCount != null) payload.badge = event.unreadCount;

    return payload;`,

    callBranch: `const named = preview !== "none" && name !== "";
    const via = label || "a token";

    data.callId = event.callId;
    data.conversationId = event.conversationId;

    return {
      title: "Incoming call",
      body: named ? name + " is calling via " + via : "Someone is calling via " + via,
      data: data,
      channelId: "calls",
      priority: "high",
      sound: "ringtone.wav",
    };`,

    redeemBranch: `data.tokenId = event.tokenId;
    return {
      title: "Token redeemed",
      body: label || "One of your tokens was used",
      data: data,
      channelId: "default",
      priority: "default",
      sound: "default",
    };`,

    fallthrough: `return null;`,

    ...overrides,
  };

  return `function buildPushPayload(event, settings) {
  const preview = (settings && settings.preview) || "none";
  ${o.prelude}
  ${o.names}

  ${o.dataInit}

  if (event.kind === "message") {
    ${o.messageBranch}
  }

  if (event.kind === "call") {
    ${o.callBranch}
  }

  if (event.kind === "token_redeemed") {
    ${o.redeemBranch}
  }

  ${o.fallthrough}
}`;
}

export const stages = {
  payload: {
    alternatives: [
      // A table of per-kind builders, looked up by kind, with the shared
      // rules applied around it.
      `function buildPushPayload(event, settings) {
        const preview = (settings && settings.preview) || "none";
        const clean = (v) => (typeof v === "string" ? v.trim() : "");
        const name = clean(event.holderName);
        const label = clean(event.tokenLabel);
        const named = preview !== "none" && name !== "";

        const BUILDERS = {
          message() {
            const data = { type: "message", conversationId: event.conversationId };
            const out = {
              title: named ? "Message from " + name : "New message",
              body: "Tap to read",
              data,
              channelId: "default",
              priority: "high",
              sound: "default",
            };
            if (preview === "full" && event.sealed) {
              out.mutableContent = true;
              Object.assign(data, {
                ciphertext: event.sealed.ciphertext,
                nonce: event.sealed.nonce,
                keyVersion: event.sealed.keyVersion,
              });
            }
            if (event.unreadCount !== null && event.unreadCount !== undefined) {
              out.badge = event.unreadCount;
            }
            return out;
          },
          call() {
            const via = label || "a token";
            return {
              title: "Incoming call",
              body: (named ? name + " is calling via " : "Someone is calling via ") + via,
              data: { type: "call", callId: event.callId, conversationId: event.conversationId },
              channelId: "calls",
              priority: "high",
              sound: "ringtone.wav",
            };
          },
          token_redeemed() {
            return {
              title: "Token redeemed",
              body: label || "One of your tokens was used",
              data: { type: "token_redeemed", tokenId: event.tokenId },
              channelId: "default",
              priority: "default",
              sound: "default",
            };
          },
        };

        const builder = BUILDERS[event.kind];
        return builder ? builder() : null;
      }`,

      // A switch, plain var declarations, and the badge decided last.
      `function buildPushPayload(event, settings) {
        var preview = (settings && settings.preview) || "none";
        var name = "", label = "";
        if (typeof event.holderName === "string") name = event.holderName.replace(/^\\s+|\\s+$/g, "");
        if (typeof event.tokenLabel === "string") label = event.tokenLabel.replace(/^\\s+|\\s+$/g, "");
        var mayName = preview !== "none" && name.length > 0;
        var result = null;
        var data;

        switch (event.kind) {
          case "message":
            data = { type: "message", conversationId: event.conversationId };
            result = {
              title: mayName ? "Message from " + name : "New message",
              body: "Tap to read",
              data: data,
              channelId: "default",
              priority: "high",
              sound: "default",
            };
            if (preview === "full" && event.sealed) {
              result.mutableContent = true;
              data.ciphertext = event.sealed.ciphertext;
              data.nonce = event.sealed.nonce;
              data.keyVersion = event.sealed.keyVersion;
            }
            break;
          case "call":
            data = { type: "call", callId: event.callId, conversationId: event.conversationId };
            result = {
              title: "Incoming call",
              body: mayName
                ? name + " is calling via " + (label || "a token")
                : "Someone is calling via " + (label || "a token"),
              data: data,
              channelId: "calls",
              priority: "high",
              sound: "ringtone.wav",
            };
            break;
          case "token_redeemed":
            result = {
              title: "Token redeemed",
              body: label || "One of your tokens was used",
              data: { type: "token_redeemed", tokenId: event.tokenId },
              channelId: "default",
              priority: "default",
              sound: "default",
            };
            break;
          default:
            return null;
        }

        // Only a message carries a badge, and only when the count is known.
        if (event.kind === "message" && typeof event.unreadCount === "number") {
          result.badge = event.unreadCount;
        }
        return result;
      }`,

      // The message branch with the sealed-bytes decision hoisted into its
      // own predicate, which is where people put it once they notice rules
      // 4 and 5 are separate questions.
      build({
        messageBranch: `const mayName = preview !== "none" && name !== "";
    const mayDecrypt = preview === "full" && Boolean(event.sealed);

    const payload = {
      title: mayName ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };
    data.conversationId = event.conversationId;

    if (mayDecrypt) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }
    if (event.unreadCount !== null && event.unreadCount !== undefined) {
      payload.badge = event.unreadCount;
    }
    return payload;`,
      }),
    ],

    mistakes: [
      {
        // THE ONE TO STUDY. Spread the event, delete the field you know is
        // dangerous. There is no `code` in the output, so the obvious
        // assertion passes -- and holderName, tokenLabel and the sealed
        // bytes all go out under every setting including 'none'.
        expect: "data holds ONLY the keys the rules name",
        impl: build({
          dataInit: `const data = Object.assign({}, event, { type: event.kind });
  delete data.code;`,
        }),
      },
      {
        // The same shape without even the delete. This is what the first
        // draft of a payload builder always looks like.
        expect: "the token code appears NOWHERE in any payload",
        impl: build({
          dataInit: `const data = Object.assign({}, event, { type: event.kind });`,
        }),
      },
      {
        // 'full' renders a richer title on the SERVER. It reads like the
        // obvious meaning of the setting, and the server has nothing extra
        // to render -- so this is a server deciding it may compose text
        // about a conversation it cannot read.
        expect: "preview 'full' sends the SAME title as 'sender'",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: preview === "full" && named
        ? name + " \\u2022 " + (label || "a token")
        : named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (preview === "full" && event.sealed) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    if (event.unreadCount != null) payload.badge = event.unreadCount;

    return payload;`,
        }),
      },
      {
        // Ships the sealed bytes whatever the setting, on the reasoning that
        // the extension checks the setting before rendering. It might. The
        // bytes are on Apple's servers either way, and a setting the client
        // enforces is a request, not a setting.
        expect: "preview 'sender' WITHHOLDS the sealed bytes",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (event.sealed) {
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
      if (preview === "full") payload.mutableContent = true;
    }

    if (event.unreadCount != null) payload.badge = event.unreadCount;

    return payload;`,
        }),
      },
      {
        // Sends the bytes and never asks for the rewrite. iOS shows the
        // server's fallback text for ever, the extension is never invoked,
        // and the ciphertext rides along achieving nothing at all.
        expect: "preview 'full' asks the DEVICE to rewrite it",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (preview === "full" && event.sealed) {
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    if (event.unreadCount != null) payload.badge = event.unreadCount;

    return payload;`,
        }),
      },
      {
        // Leaves the body empty under 'full' "because the extension fills it
        // in". It fails on precisely the devices where the extension did not
        // run -- an old build, a timeout, low memory -- and what those users
        // get is a notification with no body at all.
        expect: "the body is never message content, at any setting",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: preview === "full" ? "" : "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (preview === "full" && event.sealed) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    if (event.unreadCount != null) payload.badge = event.unreadCount;

    return payload;`,
        }),
      },
      {
        // Truthiness on the raw name, no trim. A holder who typed spaces
        // gets "Message from    " on the lock screen, which reads as a bug
        // in the app rather than as a name nobody entered.
        expect: "a blank holderName falls back rather than rendering nothing",
        impl: build({
          names: `const name = event.holderName || "";
  const label = typeof event.tokenLabel === "string" ? event.tokenLabel.trim() : "";`,
        }),
      },
      {
        // Hangs the whole 'full' behaviour off having a name, so a message
        // from a holder who never set one loses the device rewrite too --
        // the one thing that would have supplied the missing name.
        expect: "a blank name does not cancel the device rewrite",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (named && preview === "full" && event.sealed) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    if (event.unreadCount != null) payload.badge = event.unreadCount;

    return payload;`,
        }),
      },
      {
        // Truthiness on the count. Zero is the instruction that CLEARS the
        // badge, so the one thing this drops is the only way to make the
        // red dot go away from the server.
        expect: "zero is sent, because zero is the instruction that CLEARS the badge",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (preview === "full" && event.sealed) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    if (event.unreadCount) payload.badge = event.unreadCount;

    return payload;`,
        }),
      },
      {
        // Defaults an unknown count to 1, which is what the lesson shipped.
        // Nine waiting messages read as one, and the number is wrong in the
        // direction that makes the user think they have caught up.
        expect: "an unknown unread count omits the badge key entirely",
        impl: build({
          messageBranch: `const named = preview !== "none" && name !== "";

    const payload = {
      title: named ? "Message from " + name : "New message",
      body: "Tap to read",
      data: data,
      channelId: "default",
      priority: "high",
      sound: "default",
    };

    data.conversationId = event.conversationId;

    if (preview === "full" && event.sealed) {
      payload.mutableContent = true;
      data.ciphertext = event.sealed.ciphertext;
      data.nonce = event.sealed.nonce;
      data.keyVersion = event.sealed.keyVersion;
    }

    payload.badge = event.unreadCount != null ? event.unreadCount : 1;

    return payload;`,
        }),
      },
      {
        // Sets the badge on calls as well, so an incoming call overwrites
        // the unread count with whatever number happened to be on the call
        // event -- a value that means nothing here.
        expect: "a call never carries a badge",
        impl: build({
          callBranch: `const named = preview !== "none" && name !== "";
    const via = label || "a token";

    data.callId = event.callId;
    data.conversationId = event.conversationId;

    const payload = {
      title: "Incoming call",
      body: named ? name + " is calling via " + via : "Someone is calling via " + via,
      data: data,
      channelId: "calls",
      priority: "high",
      sound: "ringtone.wav",
    };
    if (event.unreadCount != null) payload.badge = event.unreadCount;
    return payload;`,
        }),
      },
      {
        // Names the caller regardless of the setting, on the reasoning that
        // you have to know who is ringing. You do -- once you have unlocked
        // the phone. The setting exists for the moment before that.
        expect: "a call under 'none' does not name the caller",
        impl: build({
          callBranch: `const via = label || "a token";

    data.callId = event.callId;
    data.conversationId = event.conversationId;

    return {
      title: "Incoming call",
      body: (name || "Someone") + " is calling via " + via,
      data: data,
      channelId: "calls",
      priority: "high",
      sound: "ringtone.wav",
    };`,
        }),
      },
      {
        // A call on the default channel at default priority. On Android the
        // channel decides whether it can bypass Do Not Disturb and make a
        // sound; the call arrives silently and is missed.
        expect: "a call rings on its own channel at high priority",
        impl: build({
          callBranch: `const named = preview !== "none" && name !== "";
    const via = label || "a token";

    data.callId = event.callId;
    data.conversationId = event.conversationId;

    return {
      title: "Incoming call",
      body: named ? name + " is calling via " + via : "Someone is calling via " + via,
      data: data,
      channelId: "default",
      priority: "default",
      sound: "default",
    };`,
        }),
      },
      {
        // An unknown kind gets a generic notification instead of a refusal.
        // b7/0002 shipped this exact defect with rule types, and the
        // consequence is the same: a deny-by-default product with a default
        // that says yes.
        expect: "an unrecognised kind is refused, not given a generic notification",
        impl: build({
          fallthrough: `return {
    title: "Token",
    body: "You have a new notification",
    data: data,
    channelId: "default",
    priority: "default",
    sound: "default",
  };`,
        }),
      },
      {
        // Removes the code from the caller's event rather than declining to
        // copy it. The caller still needs that object -- to write an audit
        // row, to retry, to hand to the next handler -- and this is not
        // redaction, it is data loss at a distance.
        expect: "the event is not mutated",
        impl: build({ prelude: `delete event.code;` }),
      },
    ],
  },
};
