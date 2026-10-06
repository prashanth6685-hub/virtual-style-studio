/**
 * GeminiProvider: stub. Throws until GEMINI_API_KEY is configured.
 * Interface only — no keys in the repo.
 */
import { AIProvider, GeneratedPerson, PersonDetection, PersonFilters, ProviderError, TryOnInput, TryOnOutput } from './types';

export class GeminiProvider implements AIProvider {
  name(): string {
    return 'gemini';
  }

  private notConfigured(): ProviderError {
    return new ProviderError(
      'Gemini provider not configured — set GEMINI_API_KEY',
      'NOT_CONFIGURED',
      501,
    );
  }

  async generatePerson(_filters: PersonFilters): Promise<GeneratedPerson> {
    throw this.notConfigured();
  }

  async tryOn(_input: TryOnInput): Promise<TryOnOutput> {
    throw this.notConfigured();
  }

  async detectPerson(_imageUrl: string): Promise<PersonDetection> {
    throw this.notConfigured();
  }
}
