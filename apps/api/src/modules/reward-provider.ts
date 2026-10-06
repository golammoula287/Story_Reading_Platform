import type { IncomingHttpHeaders } from 'node:http';
// A provider adapter must verify the raw callback using its documented signature protocol
// before returning these normalized fields. No browser completion event may produce them.
export type VerifiedReward = {
  transactionId: string;
  sessionId: string;
  nonce: string;
  completedAt: Date;
};
export interface RewardProvider {
  id: string;
  prepare(input: { sessionId: string; nonce: string; expiresAt: Date }): Promise<{ url: string }>;
  verify(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<VerifiedReward>;
}
// Deliberately disabled until the client supplies a browser-compatible S2S provider.
export const configuredRewardProvider: RewardProvider | null = null;
