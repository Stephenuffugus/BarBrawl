// Anti-cheat / security surface. All exports are pure & portable
// (browser, Node 20+, Deno via WebCrypto).

export {
  signRequest,
  verifyRequest,
  constantTimeEqual,
  sha256Hex,
  InMemoryNonceStore,
  DEFAULT_TIMESTAMP_SKEW_MS,
  type SignedEnvelope,
  type SignInput,
  type VerifyInput,
  type VerifyOptions,
  type VerifyResult,
  type NonceStore,
} from './hmac';

export {
  tryConsume,
  tryConsumeRoute,
  InMemoryBucketStore,
  DEFAULT_LIMITS,
  type RateLimitConfig,
  type BucketState,
  type BucketStore,
  type RateLimitResult,
  type TryConsumeOptions,
} from './rate-limit';

export {
  scoreFix,
  scoreWindow,
  DEFAULT_GPS_THRESHOLDS,
  type GpsFix,
  type GpsThresholds,
  type GpsFlag,
  type GpsScore,
  type ScoreOptions,
} from './gps';

export {
  validateBattleLog,
  replayBattle,
  MAX_ACTIONS,
  type ValidateInput,
  type ValidateReason,
  type ValidateResult,
} from './battle-validator';

export { seededRng } from './seeded-rng';
