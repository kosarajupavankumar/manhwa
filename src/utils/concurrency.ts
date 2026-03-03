/**
 * Runs an array of async task functions with a maximum concurrency limit.
 * Uses Promise.allSettled so individual failures do not abort the batch.
 */
export async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  concurrency: number,
): Promise<void> {
  for (let i = 0; i < tasks.length; i += concurrency) {
    await Promise.allSettled(tasks.slice(i, i + concurrency).map((fn) => fn()));
  }
}
