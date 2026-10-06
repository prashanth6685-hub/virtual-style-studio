import { describe, expect, it } from 'vitest';
import { InMemoryJobQueue } from '../src/jobs/queue';

function waitFor(cond: () => boolean, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (cond()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('waitFor timed out'));
      }
    }, 10);
  });
}

describe('InMemoryJobQueue', () => {
  it('runs a task and reports progress via callbacks', async () => {
    const queue = new InMemoryJobQueue({ baseBackoffMs: 10 });
    const seen: number[] = [];
    const id = queue.enqueue<string>(async (update) => {
      // let the listener attach before the first progress update
      await new Promise((r) => setTimeout(r, 20));
      update(25);
      update(50);
      return 'done-result';
    });
    const off = queue.onUpdate(id, (job) => seen.push(job.progress));

    await waitFor(() => queue.get(id)?.status === 'done');
    off();
    const job = queue.get<string>(id)!;
    expect(job.status).toBe('done');
    expect(job.progress).toBe(100);
    expect(job.result).toBe('done-result');
    expect(job.attempts).toBe(1);
    expect(seen).toContain(25);
    expect(seen).toContain(50);
  });

  it('retries with exponential backoff then succeeds', async () => {
    const queue = new InMemoryJobQueue({ baseBackoffMs: 20, maxAttempts: 3 });
    let calls = 0;
    const id = queue.enqueue<string>(async () => {
      calls += 1;
      if (calls < 3) throw new Error(`boom ${calls}`);
      return 'recovered';
    });

    const t0 = Date.now();
    await waitFor(() => queue.get(id)?.status === 'done');
    const elapsed = Date.now() - t0;

    const job = queue.get<string>(id)!;
    expect(job.attempts).toBe(3);
    expect(job.result).toBe('recovered');
    // backoff: 20ms + 40ms = ~60ms minimum before the 3rd attempt
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  it('marks failed after exhausting attempts, keeping the last error', async () => {
    const queue = new InMemoryJobQueue({ baseBackoffMs: 10, maxAttempts: 2 });
    const id = queue.enqueue<string>(async () => {
      throw new Error('always fails');
    });

    await waitFor(() => queue.get(id)?.status === 'failed');
    const job = queue.get<string>(id)!;
    expect(job.attempts).toBe(2);
    expect(job.error).toContain('always fails');
    expect(job.result).toBeUndefined();
  });

  it('returns undefined for unknown job ids', () => {
    const queue = new InMemoryJobQueue();
    expect(queue.get('nope')).toBeUndefined();
  });

  it('unsubscribe stops progress callbacks', async () => {
    const queue = new InMemoryJobQueue({ baseBackoffMs: 10 });
    let calls = 0;
    const id = queue.enqueue<string>(async (update) => {
      update(10);
      return 'x';
    });
    const off = queue.onUpdate(id, () => {
      calls += 1;
    });
    off();
    await waitFor(() => queue.get(id)?.status === 'done');
    expect(calls).toBe(0);
  });
});
