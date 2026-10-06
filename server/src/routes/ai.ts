import { Router } from 'express';
import { getDb, toJson } from '../db';
import { getProvider } from '../ai';
import { jobQueue } from '../jobs/queue';
import { requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { peopleSchema, validate } from '../schemas';
import type { GeneratedPerson, PersonFilters } from '../ai';

const router = Router();

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
    const provider = getProvider();
    const db = getDb();

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
            userId: req.user!.id,
            type: 'people',
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
