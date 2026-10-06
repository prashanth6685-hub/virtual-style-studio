/**
 * ReplicateProvider: stub. Throws until REPLICATE_API_TOKEN is configured.
 * Interface only — no keys in the repo.
 */
import { AIProvider, GeneratedPerson, PersonDetection, PersonFilters, ProviderError, TryOnInput, TryOnOutput } from './types';

export class ReplicateProvider implements AIProvider {
  name(): string {
    return 'replicate';
  }

  private notConfigured(): ProviderError {
    return new ProviderError(
      'Replicate provider not configured — set REPLICATE_API_TOKEN',
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
