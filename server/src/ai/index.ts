/**
 * Provider factory: selects the AIProvider from `AI_PROVIDER`.
 * Defaults to pollinations (free, keyless).
 */
import { GeminiProvider } from './gemini';
import { MockAIProvider } from './mock';
import { PollinationsProvider } from './pollinations';
import { ReplicateProvider } from './replicate';
import { AIProvider, ProviderError } from './types';

export * from './types';
export { buildPersonPrompt, buildTryOnPrompt, isSafePrompt } from './prompts';

export function getProvider(): AIProvider {
  const name = (process.env.AI_PROVIDER ?? 'pollinations').toLowerCase();
  switch (name) {
    case 'pollinations':
      return new PollinationsProvider();
    case 'mock':
      return new MockAIProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'replicate':
      return new ReplicateProvider();
    default:
      throw new ProviderError(
        `Unknown AI_PROVIDER "${name}" (expected pollinations|mock|gemini|replicate)`,
        'UNKNOWN_PROVIDER',
        500,
      );
  }
}

/** Provider name without instantiating (safe for /health). */
export function getProviderName(): string {
  return (process.env.AI_PROVIDER ?? 'pollinations').toLowerCase();
}
