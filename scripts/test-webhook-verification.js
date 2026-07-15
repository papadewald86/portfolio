// Tests the webhook-verification code sample in
// docs/how-to/verified-users-manage.mdx by extracting the function from the
// doc at runtime (so the doc is the single source of truth), simulating a
// Prove webhook delivery exactly as the doc describes it (HS256 JWT with
// iss/jti/body_hash claims over the raw body bytes), and asserting the
// documented code accepts a valid delivery and rejects tampered ones.
//
// Run by Doc Detective (see the inline test in the doc). Requires
// jsonwebtoken installed at .doc-detective/tmp-webhook-test (the preceding
// test step installs it).

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const DOC = path.resolve(__dirname, '../docs/how-to/verified-users-manage.mdx');
const PREFIX = path.resolve(__dirname, '../.doc-detective/tmp-webhook-test');

async function main() {
  // 1. Extract the documented function from the code fence.
  const doc = fs.readFileSync(DOC, 'utf8');
  const fence = doc.match(/```javascript title="Node\.js \(verify before parsing JSON\)"\r?\n([\s\S]*?)```/);
  if (!fence) throw new Error('Could not find the verification code sample in the doc');
  const snippet = fence[1];
  if (!snippet.includes('function verifyProveWebhook')) {
    throw new Error('Doc sample no longer defines verifyProveWebhook — update this harness');
  }

  // 2. Write it as a module next to the installed jsonwebtoken so imports resolve.
  fs.mkdirSync(PREFIX, { recursive: true });
  const modulePath = path.join(PREFIX, 'doc-snippet.mjs');
  fs.writeFileSync(modulePath, snippet + '\nexport { verifyProveWebhook };\n');
  const { verifyProveWebhook } = await import(pathToFileURL(modulePath).href);

  // 3. Simulate a Prove delivery per the doc: HS256 JWT carrying iss, jti,
  //    and body_hash (SHA-256 hex over the raw body bytes).
  const jwt = require(path.join(PREFIX, 'node_modules', 'jsonwebtoken'));
  const secret = 'test-shared-secret-from-portal';
  const rawBody = Buffer.from(JSON.stringify({
    notifications: [{
      eventId: 'c3702333-ddd0-4aad-8f8f-c2813c1dd253',
      event: 'phone number change detected',
      eventType: 'PHONE_NUMBER_CHANGE',
      eventTimestamp: '2025-01-23T10:11:12Z',
      clientCustomerId: 'c3702333-ddd0-4aad-8f8f-c2813c1dd253',
      proveId: '81d3829a-7207-4fd7-9a78-2dbf33fd54ad',
    }],
  }));
  const makeToken = (body, signingSecret) => jwt.sign(
    {
      iss: 'Prove Identity',
      jti: crypto.randomUUID(),
      body_hash: crypto.createHash('sha256').update(body).digest('hex'),
    },
    signingSecret,
    { algorithm: 'HS256', expiresIn: '5m' },
  );

  let passed = 0;
  const expect = (name, fn, shouldThrow) => {
    let threw = false;
    let result;
    try { result = fn(); } catch { threw = true; }
    if (threw !== shouldThrow) {
      console.error(`FAIL: ${name} — expected ${shouldThrow ? 'rejection' : 'acceptance'}`);
      process.exit(1);
    }
    console.log(`PASS: ${name}`);
    passed++;
    return result;
  };

  // 4. The documented claims, tested.
  const body = expect('accepts a valid signed delivery',
    () => verifyProveWebhook(rawBody, `Bearer ${makeToken(rawBody, secret)}`, secret), false);
  if (body.notifications[0].eventType !== 'PHONE_NUMBER_CHANGE') {
    console.error('FAIL: parsed body does not round-trip');
    process.exit(1);
  }
  expect('rejects a tampered body (body_hash mismatch)',
    () => verifyProveWebhook(Buffer.concat([rawBody, Buffer.from(' ')]), `Bearer ${makeToken(rawBody, secret)}`, secret), true);
  expect('rejects a token signed with the wrong secret',
    () => verifyProveWebhook(rawBody, `Bearer ${makeToken(rawBody, 'attacker-secret')}`, secret), true);
  expect('rejects a token from the wrong issuer',
    () => verifyProveWebhook(rawBody, `Bearer ${jwt.sign({ iss: 'Not Prove', jti: crypto.randomUUID(), body_hash: crypto.createHash('sha256').update(rawBody).digest('hex') }, secret, { algorithm: 'HS256', expiresIn: '5m' })}`, secret), true);

  console.log(`\n${passed}/4 checks passed — the documented verification code works as described.`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
