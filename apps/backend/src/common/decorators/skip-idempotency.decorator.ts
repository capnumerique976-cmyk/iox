import { SetMetadata } from '@nestjs/common';

/**
 * Marqueur pour désactiver l'IdempotencyInterceptor sur un handler donné.
 *
 * Pose-le sur les endpoints qui gèrent leur propre stratégie de
 * déduplication (webhooks signés, jobs internes…) ou sur ceux qui ne
 * doivent jamais répondre depuis un cache (ex. token refresh).
 *
 * Usage :
 *
 *   @Post('webhook/stripe')
 *   @SkipIdempotency()
 *   handleStripeWebhook(...) { ... }
 */
export const SKIP_IDEMPOTENCY_KEY = 'skip_idempotency';
export const SkipIdempotency = () => SetMetadata(SKIP_IDEMPOTENCY_KEY, true);
