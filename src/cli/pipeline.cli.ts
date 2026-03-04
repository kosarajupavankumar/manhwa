#!/usr/bin/env node

/**
 * Webtoons Pipeline — Scrape → OCR → Polish → Narrate in one command
 *
 * Usage:
 *   ts-node src/cli/pipeline.cli.ts [<webtoons-list-url>] [options]
 *
 * Scraper options:
 *   --from  N          Start from episode N       (default: FROM_EPISODE or 1)
 *   --to    N          Stop after episode N        (default: TO_EPISODE or last)
 *   --output DIR       Save images to DIR          (default: DOWNLOAD_DIR or ./downloads)
 *
 * OCR options:
 *   --ocr-output DIR   Where to write .txt files   (default: OCR_OUTPUT_DIR)
 *   --concurrency N    Parallel OCR workers        (default: OCR_CONCURRENCY or 2)
 *   --lang LANG        Tesseract language code      (default: OCR_LANG or eng)
 *   --invert           Invert colours before OCR
 *   --skip-ocr         Skip OCR step
 *
 * Polish options:
 *   --polish-output DIR  Where to write polished .txt files (default: POLISH_OUTPUT_DIR)
 *   --model NAME         Gemini model name                  (default: GEMINI_MODEL)
 *   --skip-polish        Skip Gemini polishing step
 *
 * Narrate options:
 *   --narrate-output DIR  Where to write narration script   (default: NARRATION_OUTPUT_DIR)
 *   --title NAME          Series title for the script       (default: "Shifting Tails")
 *   --skip-narrate        Skip narration script generation
 *
 * TTS options:
 *   --tts-output DIR   Where to write the audio file    (default: TTS_OUTPUT_DIR)
 *   --voice NAME       macOS say voice name             (default: TTS_VOICE or Samantha)
 *   --rate N           Speaking rate in wpm             (default: TTS_RATE or 160)
 *   --format FORMAT    "m4a" or "aiff"                  (default: TTS_FORMAT or m4a)
 *   --tts              Enable TTS step (overrides SKIP_TTS)
 *   --skip-tts         Skip TTS step
 *
 * Examples:
 *   ts-node src/cli/pipeline.cli.ts
 *   ts-node src/cli/pipeline.cli.ts "https://www.webtoons.com/en/romance/shifting-tails/list?title_no=8942"
 *   ts-node src/cli/pipeline.cli.ts --from 1 --to 5 --skip-narrate
 */

import path from 'path';
import { config as envConfig } from '../config';
import type {
  OcrOptions,
  PipelineOptions,
  PolishOptions,
  NarratorOptions,
  TtsOptions,
} from '../types';
import { scrape } from '../core/scraper';
import { runOcr } from '../core/ocr';
import { runPolisher } from '../core/polisher';
import { runNarrator } from '../core/narrator';
import { runTts } from '../core/tts';

// ─── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): PipelineOptions {
  const args = argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  ts-node src/cli/pipeline.cli.ts [<webtoons-list-url>] [options]

  If <webtoons-list-url> is omitted, WEBTOONS_URL from .env is used.

Scraper options:
  --from  N             Start from episode N         (default: FROM_EPISODE or 1)
  --to    N             Stop after episode N          (default: TO_EPISODE or last)
  --output DIR          Save images to DIR            (default: DOWNLOAD_DIR)

OCR options:
  --ocr-output DIR      Where to write .txt files     (default: OCR_OUTPUT_DIR)
  --concurrency N       Parallel OCR workers          (default: OCR_CONCURRENCY or 2)
  --lang LANG           Tesseract language code        (default: OCR_LANG or eng)
  --invert              Invert colours before OCR
  --skip-ocr            Skip OCR step

Polish options:
  --polish-output DIR   Where to write polished .txt  (default: POLISH_OUTPUT_DIR)
  --model NAME          Gemini model name              (default: GEMINI_MODEL)
  --skip-polish         Skip Gemini polishing step

Narrate options:
  --narrate-output DIR  Where to write narration script (default: NARRATION_OUTPUT_DIR)
  --title NAME          Series title for the script      (default: "Shifting Tails")
  --skip-narrate        Skip narration script generation

Examples:
  ts-node src/cli/pipeline.cli.ts
  ts-node src/cli/pipeline.cli.ts "https://...url..." --from 1 --to 5
  ts-node src/cli/pipeline.cli.ts --skip-narrate
`);
    process.exit(0);
  }

  let argOffset = 0;
  let listUrl = envConfig.webtoonUrl;
  if (args[0]?.startsWith('http')) {
    listUrl = args[0];
    argOffset = 1;
  }

  let fromEpisode = envConfig.fromEpisode;
  let toEpisode = envConfig.toEpisode;
  let outputDir = envConfig.downloadDir;
  let ocrOutputDir = envConfig.ocrOutputDir;
  let concurrency = envConfig.ocrConcurrency;
  let lang = envConfig.ocrLang;
  let invert = envConfig.ocrInvert;
  let skipOcr = envConfig.skipOcr;
  let polishOutputDir = envConfig.polishOutputDir;
  let geminiModel = envConfig.geminiModel;
  let skipPolish = envConfig.skipPolish;
  let narrateOutputDir = envConfig.narrationOutputDir;
  let seriesTitle = 'Shifting Tails';
  let skipNarrate = envConfig.skipNarrate;
  let ttsOutputDir = envConfig.ttsOutputDir;
  let ttsVoice = envConfig.ttsVoice;
  let ttsRate = envConfig.ttsRate;
  let ttsFormat = envConfig.ttsFormat as 'aiff' | 'm4a';
  let skipTts = envConfig.skipTts;

  for (let i = argOffset; i < args.length; i++) {
    switch (args[i]) {
      case '--from':
        fromEpisode = parseInt(args[++i], 10);
        break;
      case '--to':
        toEpisode = parseInt(args[++i], 10);
        break;
      case '--output':
        outputDir = path.resolve(args[++i]);
        break;
      case '--ocr-output':
        ocrOutputDir = path.resolve(args[++i]);
        break;
      case '--concurrency':
        concurrency = parseInt(args[++i], 10);
        break;
      case '--lang':
        lang = args[++i];
        break;
      case '--invert':
        invert = true;
        break;
      case '--skip-ocr':
        skipOcr = true;
        break;
      case '--polish-output':
        polishOutputDir = path.resolve(args[++i]);
        break;
      case '--model':
        geminiModel = args[++i];
        break;
      case '--skip-polish':
        skipPolish = true;
        break;
      case '--narrate-output':
        narrateOutputDir = path.resolve(args[++i]);
        break;
      case '--title':
        seriesTitle = args[++i];
        break;
      case '--skip-narrate':
        skipNarrate = true;
        break;
      case '--tts':
        skipTts = false;
        break;
      case '--skip-tts':
        skipTts = true;
        break;
      case '--tts-output':
        ttsOutputDir = path.resolve(args[++i]);
        break;
      case '--voice':
        ttsVoice = args[++i];
        break;
      case '--rate':
        ttsRate = parseInt(args[++i], 10);
        break;
      case '--format':
        ttsFormat = args[++i] as 'aiff' | 'm4a';
        break;
    }
  }

  return {
    scraper: { listUrl, fromEpisode, toEpisode, outputDir },
    ocr: {
      inputDir: '', // filled in after scraping
      outputDir: ocrOutputDir,
      concurrency,
      lang,
      invert,
    },
    polish: {
      outputDir: polishOutputDir,
      apiKey: envConfig.geminiApiKey,
      model: geminiModel,
      rateLimitMs: envConfig.geminiRateLimitMs,
    },
    narrate: {
      outputDir: narrateOutputDir,
      apiKey: envConfig.geminiApiKey,
      model: geminiModel,
      title: seriesTitle,
    },
    tts: {
      outputDir: ttsOutputDir,
      voice: ttsVoice,
      rate: ttsRate,
      format: ttsFormat,
    },
    skipOcr,
    skipPolish,
    skipNarrate,
    skipTts,
  };
}

// ─── Pipeline ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const opts = parseArgs(process.argv);

  // ── Step 1: Scrape ───────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('  STEP 1 — SCRAPING');
  console.log('═'.repeat(60));

  const seriesDir = await scrape(opts.scraper);

  if (opts.skipOcr) {
    console.log('\n⏭️  --skip-ocr flag set. Skipping remaining steps.\n');
    return;
  }

  // ── Step 2: OCR ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  STEP 2 — TEXT EXTRACTION (OCR)');
  console.log('═'.repeat(60));

  const ocrOpts: OcrOptions = { ...opts.ocr, inputDir: seriesDir };
  await runOcr(ocrOpts);

  // ── Step 3: Polish (optional — skip-polish only skips this step) ─────────
  if (opts.skipPolish) {
    console.log('\n⏭️  --skip-polish flag set. Skipping text polishing.\n');
  } else if (!opts.polish.apiKey) {
    console.warn('\n⚠️  GEMINI_API_KEY is not set. Skipping polish + narrate steps.');
    console.warn('   Set GEMINI_API_KEY in .env to enable AI-powered text polishing.\n');
    return;
  } else {
    console.log(`\n${'═'.repeat(60)}`);
    console.log('  STEP 3 — TEXT POLISHING (Gemini AI)');
    console.log('═'.repeat(60));

    const polishOpts: PolishOptions = { ...opts.polish, inputDir: ocrOpts.outputDir };
    await runPolisher(polishOpts);
  }

  // ── Step 4: Narrate — always runs last unless explicitly skipped ─────────
  if (opts.skipNarrate) {
    console.log('\n⏭️  --skip-narrate flag set. Skipping narration script generation.\n');
    return;
  }

  if (!opts.narrate.apiKey) {
    console.warn('\n⚠️  GEMINI_API_KEY is not set. Skipping narration step.\n');
    return;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  STEP 4 — NARRATION SCRIPT (Gemini AI)');
  console.log('═'.repeat(60));

  const narrateOpts: NarratorOptions = {
    ...opts.narrate,
    polishedDir: opts.polish.outputDir,
  };
  const narrateResult = await runNarrator(narrateOpts);

  // ── Step 5: TTS (opt-in, macOS only) ─────────────────────────────────
  if (opts.skipTts) {
    console.log("\n⏭️  TTS skipped. Run 'npm run tts' or pass '--tts' to generate audio.\n");
    return;
  }

  console.log(`\n${'\u2550'.repeat(60)}`);
  console.log('  STEP 5 — TEXT-TO-SPEECH (macOS say)');
  console.log('\u2550'.repeat(60));

  const ttsOpts: TtsOptions = {
    ...opts.tts,
    scriptFile: narrateResult.outputFile,
  };
  await runTts(ttsOpts);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

run().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌  Fatal: ${message}`);
  if (envConfig.debug && err instanceof Error) console.error(err.stack);
  process.exit(1);
});
