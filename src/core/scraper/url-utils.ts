import path from 'path';

/** Convert a URL slug to a human-readable title.
 *  e.g. "miss-pendleton" → "Miss Pendleton" */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Extract the webtoon title slug from a Webtoons URL.
 *  Supports both list and viewer URLs. */
export function extractTitleFromUrl(url: string): string {
  const match = url.match(/webtoons\.com\/[a-z]{2}\/[^/]+\/([^/?#]+)/);
  if (!match) throw new Error(`Could not extract title from URL: ${url}`);
  return slugToTitle(match[1]);
}

/** Extract the episode_no query param from a viewer URL. */
export function extractEpisodeNo(url: string): number | null {
  const match = url.match(/[?&]episode_no=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Build the next episode URL by incrementing episode_no (pure string manipulation). */
export function buildNextEpisodeUrl(currentUrl: string): string | null {
  const epNo = extractEpisodeNo(currentUrl);
  if (epNo === null) return null;
  const next = epNo + 1;
  return currentUrl
    .replace(/\/episode-\d+\//, `/episode-${next}/`)
    .replace(/episode_no=\d+/, `episode_no=${next}`);
}

/** Zero-pad a number to a fixed width. */
export function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

/** Determine the file extension from a URL, defaulting to .jpg. */
export function guessExtension(url: string): string {
  const cleaned = url.split('?')[0];
  const ext = path.extname(cleaned).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return ext;
  return '.jpg';
}
