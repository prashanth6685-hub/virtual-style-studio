import { Router } from 'express';
import { getDb, toJson } from '../db';
import { getProvider } from '../ai';
import type { AIProvider, GeneratedPerson, PersonFilters } from '../ai';
import { avatarConfigToPersonPrefs } from '@vss/shared';
import type { AvatarConfig } from '@vss/shared';
import { jobQueue } from '../jobs/queue';
import { requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { avatarRealisticSchema, peopleSchema, validate } from '../schemas';

const router = Router();

type Db = ReturnType<typeof getDb>;

/**
 * Shared generation pipeline: enqueue N person generations with progress
 * updates, and best-effort mirror the job into the AIJob table.
 * Used by both /people and /avatar — do not duplicate.
 */
async function enqueueGeneration(
  provider: AIProvider,
  db: Db,
  userId: string,
  type: string,
  filters: PersonFilters,
  count: number,
): Promise<string> {
  const jobId = jobQueue.enqueue<GeneratedPerson[]>(async (update) => {
    const results: GeneratedPerson[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await provider.generatePerson(filters));
      update(((i + 1) / count) * 100);
    }
    return results;
  });

  // Best-effort DB log (skipped when DATABASE_URL is unset).
  if (db) {
    try {
      const row = await db.aIJob.create({
        data: {
          userId,
          type,
          status: 'queued',
          progress: 0,
          input: toJson({ filters, count, queueId: jobId }),
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

  return jobId;
}

/**
 * POST /api/ai/people — enqueue generation of N AI people.
 * Body: {filters: {personType, ageGroup?, skinTone?, ...}, count}
 * Returns {jobId}; poll GET /api/ai/jobs/:id for progress/results.
 */
router.post(
  '/people',
  requireAuth,
  validate(peopleSchema),
  asyncHandler(async (req, res) => {
    const { filters, count } = req.body as {
      filters: PersonFilters;
      count: number;
    };
    const jobId = await enqueueGeneration(getProvider(), getDb(), req.user!.id, 'people', filters, count);
    res.status(202).json({ jobId });
  }),
);

/**
 * POST /api/ai/avatar — generate ONE photorealistic person from a parametric
 * avatar config. Body: {config: AvatarConfig}. The config is mapped to neutral
 * PersonFilters via avatarConfigToPersonPrefs, then runs the same pipeline as
 * /people with count=1 (same provider, same prompt guardrails — kids get
 * modest everyday children's clothing). Returns {jobId}; poll
 * GET /api/ai/jobs/:id — result is GeneratedPerson[] with a single entry.
 */
router.post(
  '/avatar',
  requireAuth,
  validate(avatarRealisticSchema),
  asyncHandler(async (req, res) => {
    const { config } = req.body as { config: AvatarConfig };
    const filters = avatarConfigToPersonPrefs(config);
    const jobId = await enqueueGeneration(getProvider(), getDb(), req.user!.id, 'avatar', filters, 1);
    res.status(202).json({ jobId });
  }),
);

/** GET /api/ai/jobs/:id — {status, progress, result?, error?}. */
router.get(
  '/jobs/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = jobQueue.get(req.params.id);
    if (!job) {
      throw new AppError('NOT_FOUND', 'Job not found', 404);
    }
    const { status, progress, result, error } = job;
    res.json({ status, progress, ...(result !== undefined ? { result } : {}), ...(error ? { error } : {}) });
  }),
);

export default router;
