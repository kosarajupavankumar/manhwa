import type { Page } from 'playwright';

// Minimum dimensions (px) an image must have to be considered real content.
// Spacer/ad images are typically tiny; webtoon panels are always much larger.
const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;

/**
 * Scroll the full length of the page so that every lazy-loaded image is
 * triggered to load, then wait until all `<img data-url>` elements inside
 * `#_imageList` have a populated `src` attribute with a non-empty natural
 * size — meaning the browser has actually fetched the image data.
 *
 * Webtoons uses an IntersectionObserver that copies `data-url` → `src` only
 * once the image enters the viewport. Without scrolling, images below the
 * fold never get their real CDN URL set and any "src" we read back is blank,
 * causing corrupt/empty downloads.
 */
async function scrollAndWaitForImages(page: Page): Promise<void> {
  // 1. Scroll incrementally to trigger IntersectionObserver for every image.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const distance = 400; // px per tick
      const delay = 120; // ms between ticks
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0); // scroll back to top
          resolve();
        }
      }, delay);
    });
  });

  // 2. Wait for every img[data-url] to have a real src loaded.
  //    Poll up to 30 s; most episodes finish in < 5 s on a fast connection.
  await page.waitForFunction(
    () => {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>('#_imageList img[data-url]'),
      ).filter((img) => {
        const du = img.getAttribute('data-url') ?? '';
        return du.length > 0 && !du.includes('bg_transparency');
      });
      if (imgs.length === 0) return false;
      return imgs.every((img) => img.naturalWidth > 0 && img.naturalHeight > 0);
    },
    { timeout: 30000, polling: 500 },
  );
}

/**
 * Extract all fully-loaded image URLs from the currently-loaded viewer page.
 *
 * Strategy (in priority order):
 *  1. `currentSrc` – the URL the browser actually fetched (most accurate)
 *  2. `src`        – the attribute set by the lazy-loader JS
 *  3. `data-url`   – the static fallback baked into the HTML
 *
 * Only returns URLs for images whose natural dimensions exceed the minimum
 * threshold so that tiny spacer GIFs are silently excluded.
 */
export async function extractEpisodeImages(page: Page): Promise<string[]> {
  await page.waitForSelector('#_imageList', { timeout: 30000 });

  // Scroll entire page so lazy-loader fires for every image.
  await scrollAndWaitForImages(page);

  const imageUrls = await page.evaluate(
    ({ minW, minH }: { minW: number; minH: number }) => {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>('#_imageList img[data-url]'),
      );

      return imgs
        .filter((img) => {
          const du = img.getAttribute('data-url') ?? '';
          if (!du || du.includes('bg_transparency')) return false;
          // Only include images that the browser has actually rendered.
          return img.naturalWidth >= minW && img.naturalHeight >= minH;
        })
        .map((img) => {
          // Prefer the URL the browser resolved over the static attribute.
          const loaded = img.currentSrc || img.src;
          const fallback = img.getAttribute('data-url') ?? '';
          // loaded.startsWith('http') already returns false for empty strings
          return loaded.startsWith('http') ? loaded : fallback;
        })
        .filter((url) => url.length > 0);
    },
    { minW: MIN_IMAGE_WIDTH, minH: MIN_IMAGE_HEIGHT },
  );

  return imageUrls;
}

/**
 * Get the href of the "Next Episode" button, or null if this is the last episode.
 */
export async function getNextEpisodeUrl(page: Page): Promise<string | null> {
  const href = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'));
    const next = links.find(
      (a) =>
        a.textContent?.trim() === 'Next Episode' ||
        a.className.includes('pg_next') ||
        (a.href && a.href.includes('episode_no') && a.className.includes('next')),
    );
    return next ? next.href : null;
  });
  return href ?? null;
}
