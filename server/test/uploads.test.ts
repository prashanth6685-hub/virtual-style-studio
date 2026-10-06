import { describe, expect, it } from 'vitest';
import { uploadFileFilter } from '../src/routes/uploads';
import { AppError } from '../src/middleware/errors';

function runFilter(mimetype: string): Promise<{ accepted: boolean; err?: unknown }> {
  return new Promise((resolve) => {
    uploadFileFilter({} as never, { mimetype } as never, ((err: unknown, accepted?: boolean) => {
      resolve({ accepted: !!accepted, err: err ?? undefined });
    }) as never);
  });
}

describe('uploadFileFilter', () => {
  it('accepts the allowlisted image types', async () => {
    for (const mime of ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/JPEG']) {
      const { accepted, err } = await runFilter(mime);
      expect(err, mime).toBeUndefined();
      expect(accepted, mime).toBe(true);
    }
  });

  it('rejects HEIC with 415 and a clear message', async () => {
    for (const mime of ['image/heic', 'image/heif']) {
      const { accepted, err } = await runFilter(mime);
      expect(accepted, mime).toBe(false);
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(415);
      expect(appErr.code).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(appErr.message).toMatch(/HEIC/i);
      expect(appErr.message).toMatch(/JPEG or PNG/i);
    }
  });

  it('rejects other types with 415 listing supported types', async () => {
    const { accepted, err } = await runFilter('image/gif');
    expect(accepted).toBe(false);
    const appErr = err as AppError;
    expect(appErr.status).toBe(415);
    expect(appErr.message).toMatch(/JPEG, PNG, WebP/);
  });
});
