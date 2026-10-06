import { Router } from 'express';
import type { ModelRef, Outfit } from '@vss/shared';
import { getDb, toJson } from '../db';
import { getProvider } from '../ai';
import { resolvePublicImageUrl } from '../ai/pollinations';
import { jobQueue } from '../jobs/queue';
import { requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { tryOnSchema, validate } from '../schemas';

const router = Router();

/**
 * Resolve the model's source image to a URL the provider can fetch:
 * - explicit `imageUrl` wins;
 * - otherwise look up `id` in UploadedImage / GeneratedImage rows.
 */
async function resolveModelImageUrl(model: ModelRef): Promise<string> {
  if (model.imageUrl) return model.imageUrl;
  const db = getDb();
  if (!model.id || !db) {
    throw new AppError(
      'VALIDATION',
      'model.imageUrl is required when the model has no id (or DATABASE_URL is unset)',
      400,
    );
  }
  const [upload, generated] = await Promise.all([
    db.uploadedImage.findUnique({ where: { id: model.id } }),
    db.generatedImage.findUnique({ where: { id: model.id } }),
  ]);
  if (upload) return `/uploads/${upload.filename}`;
  if (generated) return generated.url;
  throw new AppError('NOT_FOUND', 'Model image not found', 404);
}

/**
 * POST /api/tryon — {model, outfit}.
 *
 * - `model.kind === 'avatar'`: returns 200 immediately with
 *   `{render:'client', spec:{model,outfit}}`. The CLIENT renders the SVG
 *   avatar locally (see server/API.md — avatar rendering decision); no AI
 *   job, no provider call, works fully offline.
 * - `upload` / `aiPerson`: enqueues a provider tryOn job, returns {jobId}.
 */
router.post(
  '/',
  requireAuth,
  validate(tryOnSchema),
  asyncHandler(async (req, res) => {
    const { model, outfit } = req.body as { model: ModelRef; outfit: Outfit };

    if (model.kind === 'avatar') {
      if (!model.config) {
        throw new AppError('VALIDATION', 'model.config is required for avatar try-on', 400);
      }
      res.json({ render: 'client', spec: { model, outfit } });
      return;
    }

    const rawUrl = await resolveModelImageUrl(model);
    // Fail fast with a clear message instead of enqueueing a doomed job.
    // PUBLIC_BASE_URL wins when set; otherwise fall back to this request's own
    // public host (correct behind proxies thanks to `trust proxy`), so photo
    // try-on works on hosted deploys with zero extra config.
    const baseUrl =
      process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host')}`;
    const modelImageUrl = rawUrl.startsWith('/uploads/') ? `${baseUrl}${rawUrl}` : rawUrl;
    resolvePublicImageUrl(modelImageUrl);

    const provider = getProvider();
    const db = getDb();
    const jobId = jobQueue.enqueue(async () => provider.tryOn({ model, outfit, modelImageUrl }));

    if (db) {
      try {
        const row = await db.aIJob.create({
          data: {
            userId: req.user!.id,
            type: 'tryon',
            status: 'queued',
            progress: 0,
            input: toJson({ model, outfit, queueId: jobId }),
          },
        });
        const off = jobQueue.onUpdate(jobId, (job) => {
          void db.aIJob
            .update({
              where: { id: row.id },
              data: {
                status: job.status,
                progress: job.progress,
                result: job.result === undefined ? undefined : toJson(job.result),
                error: job.error ?? null,
              },
            })
            .catch(() => undefined)
            .finally(() => {
              if (job.status === 'done' || job.status === 'failed') off();
            });
        });
      } catch {
        // logging must never break job creation
      }
    }

    res.status(202).json({ jobId });
  }),
);

export default router;
