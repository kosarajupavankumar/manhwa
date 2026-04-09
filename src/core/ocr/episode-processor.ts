import path from 'path';
import type { OcrOptions, EpisodeFolder, OcrSuccess, ImageOcrResult } from '../../types';
import type { Worker } from './worker-pool';
import { preprocessImage } from './preprocessor';
import { cleanOutput } from './text-cleaner';
import { getImageFiles } from '../../utils/fs';

/** Run OCR on a single image using a Tesseract worker. */
async function ocrImage(
  imagePath: string,
  worker: Worker,
  opts: OcrOptions,
): Promise<ImageOcrResult> {
  let buffer: Buffer;
  try {
    buffer = await preprocessImage(imagePath, { invert: opts.invert });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { skipped: true, reason };
  }

  const {
    data: { text },
  } = await worker.recognize(buffer);

  const cleaned = cleanOutput(text);
  return { skipped: false, text: cleaned };
}

/**
 * Process all images in an episode folder.
 *
 * Workers are used via a simple queue: each worker handles at most one image
 * at a time — this prevents Tesseract corruption that occurs when the same
 * worker instance is called concurrently.
 *
 * Returns the combined text for the episode, or null if no text was found.
 */
export async function processEpisode(
  episode: EpisodeFolder,
  workers: Worker[],
  opts: OcrOptions,
): Promise<string | null> {
  const images = getImageFiles(episode.fullPath);

  if (images.length === 0) {
    console.log('  ⚠️  No images found — skipping');
    return null;
  }

  // results array preserves image order regardless of completion order.
  const results = new Array<ImageOcrResult | undefined>(images.length).fill(undefined);
  let done = 0;

  // Worker queue: each slot holds the in-flight promise for that worker.
  // A new task only starts on a worker once its previous task resolves.
  const queue: Promise<void>[] = workers.map(() => Promise.resolve());

  const imagePromises = images.map((imgPath, idx) => {
    const workerIdx = idx % workers.length;
    // Chain onto the previous task for this worker slot.
    queue[workerIdx] = queue[workerIdx].then(async () => {
      const worker = workers[workerIdx];
      const name = path.basename(imgPath);
      const result = await ocrImage(imgPath, worker, opts);
      results[idx] = result;
      done++;

      const summary = result.skipped
        ? `SKIPPED — ${result.reason}`
        : result.text
          ? `${result.text.split('\n\n').filter(Boolean).length} paragraph(s)`
          : 'no text';

      process.stdout.write(`\r  [${done}/${images.length}] ${name} … ${summary}\n`);
    });
    return queue[workerIdx];
  });

  await Promise.allSettled(imagePromises);

  const parts = results
    .filter((r): r is OcrSuccess => r !== undefined && !r.skipped && Boolean(r.text?.trim()))
    .map((r) => r.text.trim());

  return parts.length > 0 ? parts.join('\n\n') : null;
}
