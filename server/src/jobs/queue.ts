/**
 * JobQueue interface + InMemoryJobQueue.
 *
 * All AI work is async: POST returns `{jobId}`, GET /api/ai/jobs/:id returns
 * `{status, progress, result?, error?}`.
 *
 * Swap path to BullMQ/Redis (documented in server/API.md): implement the
 * JobQueue interface with a Bull-backed class and inject it where the
 * InMemoryJobQueue is constructed — routes only depend on the interface.
 */
import crypto from 'crypto';
import type { JobStatus } from '@vss/shared';

export interface JobRecord<T = unknown> {
  id: string;
  status: JobStatus;
  /** 0–100 */
  progress: number;
  result?: T;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export type ProgressUpdater = (progress: number) => void;
export type JobTask<T> = (update: ProgressUpdater) => Promise<T>;
export type JobListener = (job: JobRecord) => void;

export interface JobQueue {
  enqueue<T>(task: JobTask<T>): string;
  get<T>(id: string): JobRecord<T> | undefined;
  onUpdate(id: string, listener: JobListener): () => void;
}

export interface InMemoryQueueOptions {
  /** Max concurrent running tasks. Default 2. */
  concurrency?: number;
  /** Base backoff between retries in ms; doubles each attempt. Default 1000. */
  baseBackoffMs?: number;
  /** Total attempts including the first. Default 3. */
  maxAttempts?: number;
}

export class InMemoryJobQueue implements JobQueue {
  private jobs = new Map<string, JobRecord>();
  private pending: string[] = [];
  private tasks = new Map<string, JobTask<unknown>>();
  private listeners = new Map<string, Set<JobListener>>();
  private running = 0;
  private readonly concurrency: number;
  private readonly baseBackoffMs: number;
  private readonly maxAttempts: number;

  constructor(opts: InMemoryQueueOptions = {}) {
    this.concurrency = opts.concurrency ?? 2;
    this.baseBackoffMs = opts.baseBackoffMs ?? 1000;
    this.maxAttempts = opts.maxAttempts ?? 3;
  }

  enqueue<T>(task: JobTask<T>): string {
    const id = crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();
    const record: JobRecord<T> = {
      id,
      status: 'queued',
      progress: 0,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, record as JobRecord);
    this.tasks.set(id, task as JobTask<unknown>);
    this.pending.push(id);
    void this.pump();
    return id;
  }

  get<T>(id: string): JobRecord<T> | undefined {
    return this.jobs.get(id) as JobRecord<T> | undefined;
  }

  onUpdate(id: string, listener: JobListener): () => void {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
    };
  }

  private emit(record: JobRecord): void {
    record.updatedAt = new Date().toISOString();
    const set = this.listeners.get(record.id);
    if (set) {
      for (const l of set) {
        try {
          l(record);
        } catch {
          // listener errors must not break the queue
        }
      }
    }
  }

  private async pump(): Promise<void> {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const id = this.pending.shift()!;
      const record = this.jobs.get(id)!;
      const task = this.tasks.get(id)!;
      this.running += 1;
      void this.run(id, record, task).finally(() => {
        this.running -= 1;
        void this.pump();
      });
    }
  }

  private async run(id: string, record: JobRecord, task: JobTask<unknown>): Promise<void> {
    record.status = 'processing';
    record.attempts += 1;
    this.emit(record);
    const update: ProgressUpdater = (progress) => {
      record.progress = Math.min(100, Math.max(0, Math.round(progress)));
      this.emit(record);
    };
    try {
      const result = await task(update);
      record.status = 'done';
      record.progress = 100;
      record.result = result;
      this.tasks.delete(id);
      this.emit(record);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (record.attempts < this.maxAttempts) {
        // Retry with exponential backoff: base * 2^(attempts-1).
        const delay = this.baseBackoffMs * 2 ** (record.attempts - 1);
        record.status = 'queued';
        record.error = `Attempt ${record.attempts} failed: ${message} — retrying`;
        this.emit(record);
        await new Promise((resolve) => setTimeout(resolve, delay));
        // Re-queue at the front so retries don't starve behind new work.
        this.pending.unshift(id);
      } else {
        record.status = 'failed';
        record.error = message;
        this.tasks.delete(id);
        this.emit(record);
      }
    }
  }
}

/** Process-wide queue used by the AI and try-on routes. */
export const jobQueue = new InMemoryJobQueue({ concurrency: 2 });
