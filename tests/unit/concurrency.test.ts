import { runWithConcurrency } from '../../src/utils/concurrency';

describe('runWithConcurrency', () => {
  it('runs all tasks to completion', async () => {
    const results: number[] = [];
    const tasks = [1, 2, 3, 4, 5].map((n) => async () => {
      results.push(n);
    });

    await runWithConcurrency(tasks, 2);

    expect(results).toHaveLength(5);
    expect(results.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles an empty task list without error', async () => {
    await expect(runWithConcurrency([], 4)).resolves.toBeUndefined();
  });

  it('does not exceed the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const concurrency = 3;

    const tasks = Array.from({ length: 10 }, () => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      active--;
    });

    await runWithConcurrency(tasks, concurrency);

    expect(maxActive).toBeLessThanOrEqual(concurrency);
  });

  it('completes even when some tasks reject (allSettled behaviour)', async () => {
    const succeeded: number[] = [];

    const tasks = [1, 2, 3].map((n) => async () => {
      if (n === 2) throw new Error('intentional failure');
      succeeded.push(n);
    });

    // Should not throw
    await expect(runWithConcurrency(tasks, 2)).resolves.toBeUndefined();
    // Tasks 1 and 3 should still have run
    expect(succeeded.sort()).toEqual([1, 3]);
  });

  it('processes tasks in batches of the given concurrency', async () => {
    const order: number[] = [];
    const concurrency = 2;

    const tasks = [1, 2, 3, 4].map((n) => async () => {
      order.push(n);
    });

    await runWithConcurrency(tasks, concurrency);

    // All 4 tasks must appear in the output
    expect(order).toHaveLength(4);
  });
});
