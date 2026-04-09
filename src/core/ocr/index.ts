import fs from 'fs';
import path from 'path';
import type { OcrOptions } from '../../types';
import { getEpisodeFolders } from '../../utils/fs';
import { createWorkerPool, terminateWorkerPool } from './worker-pool';
import { processEpisode } from './episode-processor';

/** Summary entry accumulated while processing each episode. */
interface EpisodeSummary {
  label: string;
  imageCount: number;
  paragraphCount: number;
  hasText: boolean;
}

/**
 * Run the OCR pipeline over an input directory of "Episode XXX" folders.
 *
 * For every episode:
 *  - Writes  <outputDir>/<Episode XXX>.txt  with all extracted text
 *  - Marks episodes with no detectable text as "[No text extracted]"
 *
 * After all episodes:
 *  - Writes  <outputDir>/all_episodes.txt  containing:
 *      • A table of contents (episode list with paragraph counts)
 *      • Every episode's text in order, separated by clear headers
 */
export async function runOcr(opts: OcrOptions): Promise<void> {
  console.log('\n📖  Webtoon OCR  ·  Tesseract.js (offline)');
  console.log(`    Input       : ${opts.inputDir}`);
  console.log(`    Output      : ${opts.outputDir}`);
  console.log(`    Language    : ${opts.lang}`);
  console.log(`    Concurrency : ${opts.concurrency}`);
  console.log(`    Invert      : ${opts.invert}`);
  console.log('');

  let episodes;
  try {
    episodes = getEpisodeFolders(opts.inputDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read input directory: ${message}`);
  }

  if (episodes.length === 0) {
    throw new Error('No "Episode XXX" folders found in the input directory.');
  }

  console.log(`📂  Found ${episodes.length} episode folder(s)`);
  console.log(`⚙️   Initialising ${opts.concurrency} Tesseract worker(s)…\n`);
  fs.mkdirSync(opts.outputDir, { recursive: true });

  const workers = await createWorkerPool(opts.concurrency, opts.lang);

  // Accumulate per-episode summaries for the combined file's TOC.
  const summaries: EpisodeSummary[] = [];
  // Accumulate the full body text for the combined file.
  const bodyLines: string[] = [];

  try {
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const label = ep.name;
      console.log(`━━━  [${i + 1}/${episodes.length}]  ${label}  ━━━`);

      // Count images up front so we can log it even if OCR fails.
      const { readdirSync } = fs;
      const imageCount = readdirSync(ep.fullPath).filter((f) =>
        ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()),
      ).length;

      let episodeText: string | null = null;
      try {
        episodeText = await processEpisode(ep, workers, opts);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ❌  Error: ${message} — skipping\n`);
      }

      const bodyText = episodeText?.trim() ?? '';
      const paragraphCount = bodyText
        ? bodyText.split('\n\n').filter((p) => p.trim().length > 0).length
        : 0;

      // ── Write per-episode file (always, even when empty) ────────────────
      const outFile = path.join(opts.outputDir, `${label}.txt`);
      const fileContent = bodyText.length > 0 ? bodyText : '[No text extracted from this episode]';
      fs.writeFileSync(outFile, fileContent, 'utf8');

      if (bodyText.length > 0) {
        console.log(`  ✅  ${paragraphCount} paragraph(s) → ${outFile}\n`);
      } else {
        console.log(`  ⚠️  No text extracted → ${outFile}\n`);
      }

      summaries.push({ label, imageCount, paragraphCount, hasText: bodyText.length > 0 });

      // ── Accumulate for combined file ────────────────────────────────────
      bodyLines.push(`${'═'.repeat(60)}`);
      bodyLines.push(`  ${label.toUpperCase()}`);
      bodyLines.push(`${'═'.repeat(60)}`);
      bodyLines.push('');
      bodyLines.push(fileContent);
      bodyLines.push('');
      bodyLines.push('');
    }
  } finally {
    await terminateWorkerPool(workers);
  }

  // ── Write combined file ────────────────────────────────────────────────────
  const combinedPath = path.join(opts.outputDir, 'all_episodes.txt');

  // Build table of contents.
  const episodesWithText = summaries.filter((s) => s.hasText).length;
  const tocLines: string[] = [
    `╔${'═'.repeat(58)}╗`,
    `║${'  TABLE OF CONTENTS'.padEnd(58)}║`,
    `╠${'═'.repeat(58)}╣`,
    ...summaries.map((s, idx) => {
      const num = `${idx + 1}`.padStart(3);
      const label = s.label.padEnd(20);
      const imgs = `${s.imageCount} img`.padStart(7);
      const paras = s.hasText ? `${s.paragraphCount} para`.padStart(7) : '  no text';
      return `║  ${num}.  ${label}  ${imgs}  ${paras}  ║`;
    }),
    `╠${'═'.repeat(58)}╣`,
    `${`║  Total: ${episodes.length} episodes  ·  ${episodesWithText} with text`.padEnd(58)}║`,
    `╚${'═'.repeat(58)}╝`,
    '',
    '',
  ];

  const combinedContent = [...tocLines, ...bodyLines].join('\n');
  fs.writeFileSync(combinedPath, combinedContent, 'utf8');

  console.log(`\n📄  Combined file → ${combinedPath}`);
  console.log(
    `    ${episodesWithText}/${episodes.length} episodes have text  ·  ` +
      `${summaries.reduce((a, s) => a + s.paragraphCount, 0)} total paragraphs`,
  );
  console.log('\n🎉  Done!\n');
}
