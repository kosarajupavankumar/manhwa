import { createWorker, type Worker } from 'tesseract.js';

export type { Worker };

/** Initialise a pool of Tesseract workers for parallel OCR. */
export async function createWorkerPool(size: number, lang: string): Promise<Worker[]> {
  const workers: Worker[] = [];
  for (let i = 0; i < size; i++) {
    const w = await createWorker(lang, 1, { logger: () => {} });
    workers.push(w);
  }
  return workers;
}

/** Gracefully terminate all workers in the pool. */
export async function terminateWorkerPool(workers: Worker[]): Promise<void> {
  await Promise.allSettled(workers.map((w) => w.terminate()));
}
