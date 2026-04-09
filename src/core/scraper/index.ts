import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { config as envConfig } from '../../config';
import type { ScrapeOptions, DownloadTask } from '../../types';
import {
  extractTitleFromUrl,
  extractEpisodeNo,
  buildNextEpisodeUrl,
  pad,
  guessExtension,
} from './url-utils';
import { extractEpisodeImages, getNextEpisodeUrl } from './browser';
import { downloadImage, downloadInBatches } from './downloader';

/**
 * Scrape all episodes of a webtoon series, starting from the first episode
 * and optionally bounded by fromEpisode / toEpisode.
 * Returns the resolved path to the directory where images were saved.
 */
export async function scrape({
  listUrl,
  fromEpisode = 1,
  toEpisode = Infinity,
  outputDir,
}: ScrapeOptions): Promise<string> {
  const title = extractTitleFromUrl(listUrl);
  const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
  const seriesDir = path.join(outputDir, safeTitle);

  console.log(`\n📚 Webtoon  : ${title}`);
  console.log(`📂 Save to  : ${seriesDir}`);
  console.log(`📖 Episodes : ${fromEpisode} → ${toEpisode === Infinity ? 'last' : toEpisode}`);
  console.log('');

  fs.mkdirSync(seriesDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/122.0.0.0 Safari/537.36',
    // A very tall viewport means more images are in-view on initial load,
    // reducing the amount of scrolling needed to trigger lazy loaders.
    viewport: { width: 1280, height: 4000 },
    locale: 'en-US',
  });

  const page = await context.newPage();

  try {
    // ── Step 1: Open list page and find the First Episode URL ───────────────
    console.log(`🌐 Opening list page…`);
    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const firstEpisodeUrl: string | null = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'));
      const first = links.find(
        (a) =>
          a.textContent?.trim().toLowerCase() === 'first episode' ||
          a.href.includes('episode_no=1'),
      );
      return first ? first.href : null;
    });

    if (!firstEpisodeUrl) {
      throw new Error('Could not find the first episode link on the list page.');
    }

    console.log(`🔗 First episode: ${firstEpisodeUrl}\n`);

    // ── Step 2: Navigate to the starting episode ────────────────────────────
    let currentUrl: string;
    if (fromEpisode > 1) {
      currentUrl = firstEpisodeUrl
        .replace(/episode_no=\d+/, `episode_no=${fromEpisode}`)
        .replace(/\/episode-\d+\//, `/episode-${fromEpisode}/`);
    } else {
      currentUrl = firstEpisodeUrl;
    }

    // ── Step 3: Loop through episodes ──────────────────────────────────────
    while (currentUrl) {
      const episodeNo = extractEpisodeNo(currentUrl);

      if (episodeNo === null) {
        console.warn('⚠️  Could not determine episode number; stopping.');
        break;
      }

      if (episodeNo > toEpisode) {
        console.log(`\n✅ Reached episode limit (${toEpisode}). Done.`);
        break;
      }

      const episodeDirName = `Episode ${pad(episodeNo)}`;
      const episodeDir = path.join(seriesDir, episodeDirName);

      // ── Resume support: skip already-downloaded episodes ─────────────────
      if (fs.existsSync(episodeDir) && fs.readdirSync(episodeDir).length > 0) {
        console.log(`⏭️  Episode ${episodeNo}: already downloaded – skipping`);
        const nextUrl = buildNextEpisodeUrl(currentUrl);
        if (!nextUrl) {
          console.log('\n🎉 No more episodes. All done!');
          break;
        }
        currentUrl = nextUrl;
        continue;
      }

      // ── Navigate to episode viewer ────────────────────────────────────────
      console.log(`📥 Episode ${episodeNo}: navigating…`);
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Give page JS (lazy-loader, ad scripts) time to initialise before we scroll.
      await page.waitForTimeout(2500);

      // ── Extract image URLs ─────────────────────────────────────────────────
      let imageUrls: string[];
      try {
        imageUrls = await extractEpisodeImages(page);
      } catch {
        console.log(`\n🎉 Episode ${episodeNo} not found – all episodes have been downloaded!`);
        break;
      }

      if (imageUrls.length === 0) {
        console.warn(`   ⚠️  No images found for episode ${episodeNo}.`);
      } else {
        fs.mkdirSync(episodeDir, { recursive: true });
        console.log(`   📸 ${imageUrls.length} image(s) found – downloading…`);

        let downloaded = 0;
        let failed = 0;

        const tasks: DownloadTask[] = imageUrls.map((imgUrl, idx) => async () => {
          const ext = guessExtension(imgUrl);
          const filename = `${pad(idx + 1)}${ext}`;
          const destPath = path.join(episodeDir, filename);

          try {
            await downloadImage(imgUrl, destPath);
            downloaded++;
            process.stdout.write(`\r   ✔  ${downloaded}/${imageUrls.length} downloaded`);
          } catch (err) {
            failed++;
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`\n   ✖  Failed [${filename}]: ${message}`);
          }
        });

        await downloadInBatches(tasks, 4);
        console.log(`\n   ✅ Episode ${episodeNo}: ${downloaded} downloaded, ${failed} failed`);
      }

      // ── Find next episode ──────────────────────────────────────────────────
      const nextUrl = await getNextEpisodeUrl(page);
      if (!nextUrl) {
        console.log('\n🎉 Reached the last episode. All done!');
        break;
      }

      currentUrl = nextUrl;
      await page.waitForTimeout(1000);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n📁 Images saved to: ${path.resolve(seriesDir)}\n`);

  if (envConfig.debug) {
    console.log(`[debug] seriesDir resolved to: ${path.resolve(seriesDir)}`);
  }

  return path.resolve(seriesDir);
}
