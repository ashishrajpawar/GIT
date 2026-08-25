/* Wrong-answer cases for b6/0002 — turnCredentials.
 *
 *   node scripts/verify-lesson.mjs modules/b6-webrtc-signalling/0002-coturn-setup.html \
 *        --wrong scripts/cases/0002-coturn-setup.mjs
 *
 * Staged: `exercise-1` is a coturn config, an Express route and a client
 * module needing a VPS with a public IP, DNS and a certificate, and carries
 * its own per-exercise `unverifiable` reason, so only `turn` has cases.
 *
 * `sign` is supplied to the student rather than written by them, and that is
 * deliberate: HMAC-SHA1 is a library call, and not one of the defects below
 * is in the cryptography. They are all in what surrounds it.
 *
 * The mistakes divide by how long they take to notice:
 *
 *   Never. `ms-not-seconds` mints credentials valid until roughly the year
 *   57000. Every call connects, every test passes, and the expiry -- the
 *   entire reason for using time-limited credentials -- silently does not
 *   exist. There is no failing state to observe.
 *
 *   Only in production, only for some people. A missing turns: entry works
 *   perfectly until a user is on a network that blocks UDP, which you cannot
 *   reproduce and they cannot describe.
 *
 *   Immediately, but as the wrong problem. Signing a different string than
 *   you return makes coturn reject every allocation, which is reported as
 *   "calls don't work" and looks like a TURN outage rather than a one-line
 *   mismatch.
 *
 *   Never, and it is the worst one. Leaking the secret into the response
 *   changes nothing observable at all. Every call works. Anybody who has
 *   opened devtools once can mint their own credentials for as long as the
 *   secret lives.
 *
 * TRIP COUNTS: 8 of 14 trip exactly one check. The rest trip two or three,
 * and the reason is structural rather than a diagnostics problem: THE
 * USERNAME IS A COMPOSITE STRING. It contains the expiry and the identity,
 * so anything that changes either one fails every check that reads it --
 * ms-not-seconds trips three, un-namespaced trips three, and signing the
 * identity instead of the username also changes the credential.
 *
 * That is worth knowing rather than fixing. The checks could be made to
 * assert the two halves separately, but the string coturn parses is the
 * whole thing, so a check that only looked at one half would pass a
 * credential coturn rejects.
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 * Each mistake is { expect, impl } — `impl`, not `code`.
 */

// Each case differs from the right answer in exactly one named place.
function build(overrides = {}) {
  const o = {
    guards: `if (!(config.ttlSeconds > 0)) return null;
  if (typeof config.secret !== "string" || config.secret.length < MIN_SECRET_LENGTH) {
    return null;
  }`,

    identity: `let identity;
  if (caller.kind === "owner") identity = "owner:" + caller.userId;
  else if (caller.kind === "holder") identity = "holder:" + caller.conversationId;
  else return null;`,

    expiry: `const expiresAt = Math.floor(ctx.now / 1000) + config.ttlSeconds;`,

    username: `const username = expiresAt + ":" + identity;`,

    credential: `const credential = sign(config.secret, username);`,

    urls: `const urls = [];
  if (!config.relayOnly) urls.push("stun:" + config.host + ":3478");
  urls.push("turn:" + config.host + ":3478?transport=udp");
  urls.push("turn:" + config.host + ":3478?transport=tcp");
  urls.push("turns:" + config.host + ":5349?transport=tcp");`,

    result: `return {
    username: username,
    credential: credential,
    iceServers: [{ urls: urls, username: username, credential: credential }],
    ttl: config.ttlSeconds,
    expiresAt: expiresAt,
    refreshAfterMs: config.ttlSeconds * 500,
  };`,

    ...overrides,
  };

  return `const MIN_SECRET_LENGTH = 32;

function turnCredentials(ctx, config, sign) {
  const caller = ctx && ctx.caller;
  if (!caller) return null;

  ${o.guards}

  ${o.identity}

  ${o.expiry}
  ${o.username}

  ${o.credential}

  ${o.urls}

  ${o.result}
}`;
}

export const stages = {
  turn: {
    alternatives: [
      // Built as a table of pieces and assembled at the end, with the url
      // list produced by filter rather than conditional pushes.
      `function turnCredentials(ctx, config, sign) {
        const caller = ctx && ctx.caller;
        if (!caller) return null;
        if (!(config.ttlSeconds > 0)) return null;
        if (typeof config.secret !== "string" || config.secret.length < 32) return null;

        const IDENTITY = {
          owner: (c) => "owner:" + c.userId,
          holder: (c) => "holder:" + c.conversationId,
        };
        const make = IDENTITY[caller.kind];
        if (!make) return null;

        const expiresAt = Math.floor(ctx.now / 1000) + config.ttlSeconds;
        const username = \`\${expiresAt}:\${make(caller)}\`;
        const credential = sign(config.secret, username);

        const urls = [
          config.relayOnly ? null : \`stun:\${config.host}:3478\`,
          \`turn:\${config.host}:3478?transport=udp\`,
          \`turn:\${config.host}:3478?transport=tcp\`,
          \`turns:\${config.host}:5349?transport=tcp\`,
        ].filter(Boolean);

        return {
          username,
          credential,
          iceServers: [{ urls, username, credential }],
          ttl: config.ttlSeconds,
          expiresAt,
          refreshAfterMs: Math.floor((config.ttlSeconds * 1000) / 2),
        };
      }`,

      // Plain var declarations, an early-return guard chain, and the
      // milliseconds arithmetic written the long way round.
      `function turnCredentials(ctx, config, sign) {
        if (!ctx || !ctx.caller) return null;
        var caller = ctx.caller;
        var secret = config.secret;

        if (typeof secret !== "string") return null;
        if (secret.length < 32) return null;
        if (typeof config.ttlSeconds !== "number") return null;
        if (config.ttlSeconds <= 0) return null;

        var identity = null;
        if (caller.kind === "owner") identity = "owner:" + caller.userId;
        if (caller.kind === "holder") identity = "holder:" + caller.conversationId;
        if (identity === null) return null;

        var nowSeconds = Math.floor(ctx.now / 1000);
        var expiresAt = nowSeconds + config.ttlSeconds;
        var username = String(expiresAt) + ":" + identity;
        var credential = sign(secret, username);

        var urls = [];
        if (config.relayOnly !== true) {
          urls[urls.length] = "stun:" + config.host + ":3478";
        }
        urls[urls.length] = "turn:" + config.host + ":3478?transport=udp";
        urls[urls.length] = "turn:" + config.host + ":3478?transport=tcp";
        urls[urls.length] = "turns:" + config.host + ":5349?transport=tcp";

        var ttlMs = config.ttlSeconds * 1000;

        return {
          username: username,
          credential: credential,
          iceServers: [{ urls: urls, username: username, credential: credential }],
          ttl: config.ttlSeconds,
          expiresAt: expiresAt,
          refreshAfterMs: ttlMs / 2,
        };
      }`,

      // The identity decided by a switch, which is where the missing
      // default case usually turns up.
      build({
        identity: `let identity;
  switch (caller.kind) {
    case "owner":
      identity = "owner:" + caller.userId;
      break;
    case "holder":
      identity = "holder:" + caller.conversationId;
      break;
    default:
      return null;
  }`,
      }),
    ],

    mistakes: [
      {
        // THE ONE TO STUDY. Date.now() straight into the username. coturn
        // parses it as seconds, so the credential expires in roughly the
        // year 57000. Nothing fails, nothing logs, and time-limited
        // credentials are simply not a feature any more.
        expect: "the expiry is in SECONDS, not milliseconds",
        impl: build({ expiry: `const expiresAt = ctx.now + config.ttlSeconds * 1000;` }),
      },
      {
        // The holder branch missing, because req.user.id was the only
        // identity the route ever had. Half of every call is made by
        // somebody who is not a user.
        expect: "a holder gets a credential, identified by conversation",
        impl: build({
          identity: `if (caller.kind !== "owner") return null;
  const identity = "owner:" + caller.userId;`,
        }),
      },
      {
        // The identity un-namespaced, so owner 42 and conversation 42 mint
        // the same TURN username. coturn's allocation log then cannot say
        // which of them relayed anything.
        expect: "the username is expiry:identity, namespaced by caller kind",
        impl: build({
          identity: `let identity;
  if (caller.kind === "owner") identity = String(caller.userId);
  else if (caller.kind === "holder") identity = String(caller.conversationId);
  else return null;`,
        }),
      },
      {
        // Signs the identity instead of the full username. coturn signs
        // what it receives as the username, computes a different HMAC, and
        // refuses every allocation -- which is reported as "calls don't
        // work" and looks like a TURN outage.
        expect: "the string that is signed is the string that is returned",
        impl: build({ credential: `const credential = sign(config.secret, identity);` }),
      },
      {
        // THE WORST ONE, because nothing observable changes. The secret is
        // returned "so the client can refresh without another round trip".
        // Every call still works. Anybody who opens devtools can mint their
        // own credentials until the secret is rotated.
        expect: "the secret reaches sign and NOTHING else",
        impl: build({
          result: `return {
    username: username,
    credential: credential,
    iceServers: [{ urls: urls, username: username, credential: credential }],
    ttl: config.ttlSeconds,
    expiresAt: expiresAt,
    refreshAfterMs: config.ttlSeconds * 500,
    secret: config.secret,
  };`,
        }),
      },
      {
        // A stun: entry regardless of relayOnly. Harmless-looking, and it
        // asks a server for your public address in a configuration whose
        // whole purpose is not to have one offered.
        expect: "relay-only means no stun: URL at all",
        impl: build({
          urls: `const urls = [];
  urls.push("stun:" + config.host + ":3478");
  urls.push("turn:" + config.host + ":3478?transport=udp");
  urls.push("turn:" + config.host + ":3478?transport=tcp");
  urls.push("turns:" + config.host + ":5349?transport=tcp");`,
        }),
      },
      {
        // Google's public STUN as a "free fallback", which is what this
        // lesson actually shipped. Free of money; the thing being spent is
        // the thing the product sells.
        //
        // Gated on relayOnly here so that it isolates the third-party rule
        // rather than also tripping the no-stun one. The shipped version was
        // worse -- unconditional, so it added a STUN server even under
        // relay-only -- and that shape is covered by the case above.
        expect: "no third-party host appears in any URL, under any setting",
        impl: build({
          urls: `const urls = [];
  if (!config.relayOnly) {
    urls.push("stun:" + config.host + ":3478");
    urls.push("stun:stun.l.google.com:19302");
  }
  urls.push("turn:" + config.host + ":3478?transport=udp");
  urls.push("turn:" + config.host + ":3478?transport=tcp");
  urls.push("turns:" + config.host + ":5349?transport=tcp");`,
        }),
      },
      {
        // No turns: entry. Works everywhere you tested and fails for every
        // user on a network that blocks UDP -- which you cannot reproduce
        // and they cannot describe.
        expect: "there is always a turns: entry on 5349",
        impl: build({
          urls: `const urls = [];
  if (!config.relayOnly) urls.push("stun:" + config.host + ":3478");
  urls.push("turn:" + config.host + ":3478?transport=udp");
  urls.push("turn:" + config.host + ":3478?transport=tcp");`,
        }),
      },
      {
        // refreshAfterMs given in seconds. The client treats it as ms and
        // refreshes 1800 milliseconds after it started -- so it hammers the
        // credentials endpoint roughly every two seconds, for ever.
        expect: "refreshAfterMs is half the ttl, in milliseconds",
        impl: build({
          result: `return {
    username: username,
    credential: credential,
    iceServers: [{ urls: urls, username: username, credential: credential }],
    ttl: config.ttlSeconds,
    expiresAt: expiresAt,
    refreshAfterMs: config.ttlSeconds / 2,
  };`,
        }),
      },
      {
        // Refreshes at the full TTL rather than half. There is no margin at
        // all, so a client whose request is slow presents a credential that
        // expired while it was in flight. Trips the arithmetic check first
        // and the margin check second -- they are one rule seen twice, kept
        // separate because they read as different mistakes.
        expect: "refreshAfterMs is half the ttl, in milliseconds",
        impl: build({
          result: `return {
    username: username,
    credential: credential,
    iceServers: [{ urls: urls, username: username, credential: credential }],
    ttl: config.ttlSeconds,
    expiresAt: expiresAt,
    refreshAfterMs: config.ttlSeconds * 1000,
  };`,
        }),
      },
      {
        // Truthiness on the ttl, which lets a negative one through -- a
        // credential that was already expired when it was issued, and a
        // call that fails at the TURN allocation with no useful message.
        expect: "a ttl of zero or less is refused, not minted",
        impl: build({
          guards: `if (!config.ttlSeconds) return null;
  if (typeof config.secret !== "string" || config.secret.length < MIN_SECRET_LENGTH) {
    return null;
  }`,
        }),
      },
      {
        // Checks the secret is present and never how long it is. Present
        // is not usable -- the same finding as b9/0002's checkEnv, and a
        // short shared secret is brute-forceable offline by anyone who has
        // seen one username and its HMAC.
        expect: "a secret that is too short is refused, and never signed with",
        impl: build({
          guards: `if (!(config.ttlSeconds > 0)) return null;
  if (!config.secret) return null;`,
        }),
      },
      {
        // An unrecognised caller kind falls through to the owner branch,
        // so anything with a userId gets a credential. b7/0002's unknown
        // rule type reaching 'allowed', in a different file.
        expect: "a caller kind that is neither owner nor holder is refused",
        impl: build({
          identity: `const identity = caller.kind === "holder"
    ? "holder:" + caller.conversationId
    : "owner:" + caller.userId;`,
        }),
      },
      {
        // Writes the computed identity back onto the caller, to save
        // recomputing it later in the request. The same ctx is not reused,
        // but the same config object serves every caller on the server and
        // this is the habit that eventually reaches it.
        expect: "ctx and config are not mutated",
        impl: build({
          identity: `let identity;
  if (caller.kind === "owner") identity = "owner:" + caller.userId;
  else if (caller.kind === "holder") identity = "holder:" + caller.conversationId;
  else return null;
  caller.turnIdentity = identity;`,
        }),
      },
    ],
  },
};
