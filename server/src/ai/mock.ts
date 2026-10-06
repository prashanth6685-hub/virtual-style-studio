/**
 * MockAIProvider (`AI_PROVIDER=mock`): deterministic placeholder results for
 * local development. EVERY result is clearly labeled "Preview" so it can
 * never be mistaken for a real generation.
 */
import { buildPersonPrompt, isSafePrompt } from './prompts';
import { AIProvider, GeneratedPerson, PersonDetection, PersonFilters, ProviderError, TryOnInput, TryOnOutput } from './types';

export const PREVIEW_LABEL = 'Preview';

function placeholder(text: string): string {
  return `https://placehold.co/768x1024/E2E8F0/475569?text=${encodeURIComponent(text)}`;
}

export class MockAIProvider implements AIProvider {
  name(): string {
    return 'mock';
  }

  async generatePerson(filters: PersonFilters): Promise<GeneratedPerson> {
    const prompt = buildPersonPrompt(filters);
    if (!isSafePrompt(prompt)) {
      throw new ProviderError('Generated prompt failed the safety check', 'UNSAFE_PROMPT', 500);
    }
    return {
      url: placeholder(`Preview person (${filters.personType})`),
      label: `${PREVIEW_LABEL} — mock provider, not a real photo`,
    };
  }

  async tryOn(_input: TryOnInput): Promise<TryOnOutput> {
    return {
      url: placeholder('Preview try-on'),
      label: `${PREVIEW_LABEL} — mock provider, not a real try-on`,
    };
  }

  async detectPerson(_imageUrl: string): Promise<PersonDetection> {
    // Fixed centered box; geometry only, no attribute inference.
    return { bbox: [0.2, 0.1, 0.6, 0.8] };
  }
}
