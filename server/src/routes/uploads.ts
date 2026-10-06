import { Router } from 'express';
import crypto from 'crypto';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { requireDb } from '../db';
import { assertOwner, requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { LocalDiskStorage, uploadDir } from '../storage';

const router = Router();
const storage = new LocalDiskStorage();

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const HEIC_MIME = new Set(['image/heic', 'image/heif']);
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Multer file filter — exported for unit tests. */
export function uploadFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_MIME.has(mime)) {
    cb(null, true);
    return;
  }
  if (HEIC_MIME.has(mime)) {
    cb(
      new AppError(
        'UNSUPPORTED_MEDIA_TYPE',
        'HEIC photos are not supported — please export the photo as JPEG or PNG and try again',
        415,
      ),
    );
    return;
  }
  cb(
    new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      `Unsupported image type "${file.mimetype}". Supported types: JPEG, PNG, WebP (max 10MB)`,
      415,
    ),
  );
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir()),
    filename: (_req, file, cb) => {
      const ext = MIME_EXT[(file.mimetype || '').toLowerCase()] ?? '.bin';
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  }),
  fileFilter: uploadFileFilter,
  limits: { fileSize: MAX_BYTES },
});

const PURPOSES = new Set(['tryon', 'avatar', 'other']);

/**
 * POST /api/uploads/photo — multipart upload (field: `photo`).
 * Returns {id, url, mime, size}. Files get random unguessable names and are
 * served at /uploads/:name. 415 for HEIC/unsupported types, 413 over 10MB.
 */
router.post(
  '/photo',
  requireAuth,
  (req, res, next) => {
    upload.single('photo')(req, res, (err: unknown) => {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      if (err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
        next(new AppError('UPLOAD_TOO_LARGE', 'Photo must be 10MB or smaller', 413));
        return;
      }
      if (err) {
        next(new AppError('UPLOAD_FAILED', err instanceof Error ? err.message : 'Upload failed', 400));
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('VALIDATION', 'No photo attached (multipart field "photo" is required)', 400);
    }
    const purpose =
      typeof req.body?.purpose === 'string' && PURPOSES.has(req.body.purpose)
        ? req.body.purpose
        : 'tryon';
    const db = requireDb();
    const row = await db.uploadedImage.create({
      data: {
        userId: req.user!.id,
        filename: req.file.filename,
        mime: req.file.mimetype,
        size: req.file.size,
        purpose,
      },
    });
    res.status(201).json({
      id: row.id,
      url: `/uploads/${row.filename}`,
      mime: row.mime,
      size: row.size,
    });
  }),
);

/** DELETE /api/uploads/:id — owner only; deletes the file and the row. */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const row = await db.uploadedImage.findUnique({ where: { id: req.params.id } });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Upload not found', 404);
    }
    assertOwner(req.user!, row.userId);
    await storage.remove(row.filename);
    await db.uploadedImage.delete({ where: { id: row.id } });
    res.json({ ok: true });
  }),
);

export default router;
