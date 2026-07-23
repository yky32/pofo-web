/**
 * Concurrent async pool for batch uploads (photographer large sets).
 */

export type PoolTask<T> = () => Promise<T>;

export async function runPool<T>(
  tasks: PoolTask<T>[],
  concurrency: number,
  onProgress?: (done: number, total: number) => void
): Promise<PromiseSettledResult<T>[]> {
  const total = tasks.length;
  const results: PromiseSettledResult<T>[] = new Array(total);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= total) return;
      try {
        const value = await tasks[i]();
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
      done += 1;
      onProgress?.(done, total);
    }
  }

  const n = Math.max(1, Math.min(concurrency, total || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 400
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
      }
    }
  }
  throw last;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
