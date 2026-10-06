// Local test harness only. This adapter is never imported by production startup.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createApp } from '../../apps/api/src/app.js';
import { connect } from '../../apps/api/src/db.js';
import type { RewardProvider } from '../../apps/api/src/modules/reward-provider.js';
const uri = process.env.MONGODB_URI ?? '';
const secret = process.env.TEST_REWARD_SECRET ?? '';
if (
  !['localhost', '127.0.0.1'].includes(new URL(uri).hostname) ||
  !new URL(uri).pathname.endsWith('_test') ||
  secret.length < 32
)
  throw Error('Local reward harness requires a local test database and ephemeral signing key.');
const provider: RewardProvider = {
  id: 'browser-fixture',
  async prepare(input) {
    return {
      url: `https://example.invalid/reward?sessionId=${input.sessionId}&nonce=${input.nonce}`,
    };
  },
  async verify(raw, headers) {
    const expected = createHmac('sha256', secret).update(raw).digest();
    const actual = Buffer.from(String(headers['x-fixture-signature'] ?? ''), 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw Error('Invalid signature');
    const value = JSON.parse(raw.toString());
    return { ...value, completedAt: new Date(value.completedAt) };
  },
};
await connect(uri);
createApp({ rewardProvider: provider }).listen(4102, '127.0.0.1', () =>
  console.log('Local reward fixture API ready.'),
);
