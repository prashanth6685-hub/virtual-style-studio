/**
 * StorageProvider abstraction for uploaded files.
 * Local disk is the default; swap in an S3 implementation later
 * without touching the routes.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface StoredFile {
  filename: string;
  size: number;
}

export interface StorageProvider {
  /** Persist a buffer; returns the stored filename and size. */
  save(buffer: Buffer, originalName: string, mime: string): Promise<StoredFile>;
  /** Delete a stored file; resolves even if the file is already gone. */
  remove(filename: string): Promise<void>;
  /** Absolute path of a stored file. */
  resolvePath(filename: string): string;
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');
}

/** Guard against path traversal in user-supplied filenames. */
export function safeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '');
}

export class LocalDiskStorage implements StorageProvider {
  constructor(private dir: string = uploadDir()) {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(buffer: Buffer, originalName: string, mime: string): Promise<StoredFile> {
    const ext =
      (MIME_EXT[mime] ?? path.extname(safeFilename(originalName)).toLowerCase()) || '.bin';
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    await fs.promises.writeFile(path.join(this.dir, filename), buffer);
    return { filename, size: buffer.length };
  }

  async remove(filename: string): Promise<void> {
    try {
      await fs.promises.unlink(path.join(this.dir, safeFilename(filename)));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  resolvePath(filename: string): string {
    return path.join(this.dir, safeFilename(filename));
  }
}
