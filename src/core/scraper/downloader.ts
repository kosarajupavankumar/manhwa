import http, { type IncomingMessage } from 'http';
import https from 'https';
import fs from 'fs';
import type { DownloadTask } from '../../types';

const REQUEST_HEADERS = {
  Referer: 'https://www.webtoons.com',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/122.0.0.0 Safari/537.36',
};

/** Minimum acceptable file size in bytes. Files smaller than this are almost
 *  certainly truncated or error pages rather than real images. */
const MIN_FILE_BYTES = 5_000; // 5 KB

/** Per-download timeout in milliseconds. */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/** Maximum number of attempts before giving up on a single image. */
const MAX_RETRIES = 3;

/**
 * Execute a single HTTP/HTTPS download with a timeout and redirect following.
 * Resolves when the file is fully flushed to disk, rejects on any error.
 */
function doDownload(imageUrl: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = imageUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    // Guard against the CDN hanging forever.
    const timeoutHandle = setTimeout(() => {
      request.destroy(new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS} ms`));
    }, DOWNLOAD_TIMEOUT_MS);

    const cleanup = (err?: Error): void => {
      clearTimeout(timeoutHandle);
      file.close();
      fs.unlink(destPath, () => {});
      if (err) reject(err);
    };

    const request = proto.get(imageUrl, { headers: REQUEST_HEADERS }, (res: IncomingMessage) => {
      // Follow redirects (301 / 302).
      if (res.statusCode === 301 || res.statusCode === 302) {
        cleanup();
        const location = res.headers.location;
        if (!location) return reject(new Error('Redirect with no location header'));
        void doDownload(location, destPath).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        cleanup(new Error(`HTTP ${res.statusCode} for ${imageUrl}`));
        return;
      }

      res.pipe(file);

      file.on('finish', () => {
        clearTimeout(timeoutHandle);
        file.close(() => {
          // Reject if the file is suspiciously small — likely an error page
          // or a truncated response that slipped through.
          const { size } = fs.statSync(destPath);
          if (size < MIN_FILE_BYTES) {
            fs.unlink(destPath, () => {});
            reject(
              new Error(
                `File too small (${size} bytes < ${MIN_FILE_BYTES}): likely corrupt — ${imageUrl}`,
              ),
            );
          } else {
            resolve();
          }
        });
      });

      file.on('error', (err) => cleanup(err));
      res.on('error', (err) => cleanup(err));
    });

    request.on('error', (err: Error) => cleanup(err));
  });
}

/**
 * Download a single image URL to a local filepath.
 * Retries up to MAX_RETRIES times with an exponential back-off on failure.
 */
export async function downloadImage(imageUrl: string, destPath: string): Promise<void> {
  let lastError: Error = new Error('Unknown download error');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await doDownload(imageUrl, destPath);
      return; // success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const backoff = attempt * 1500; // 1.5 s, 3 s
        await new Promise<void>((res) => setTimeout(res, backoff));
      }
    }
  }

  throw lastError;
}

/** Download a list of image tasks in batches (concurrency-limited). */
export async function downloadInBatches(
  tasks: DownloadTask[],
  concurrency = 3,
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}
