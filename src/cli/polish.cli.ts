#!/usr/bin/env node

/**
 * Polish CLI — Run Gemini text polishing on OCR output files
 *
 * Usage:
 *   ts-node src/cli/polish.cli.ts [options]
 *
 * Options:
 *   --input-dir DIR    Directory containing OCR .txt files (default: OCR_OUTPUT_DIR or ./output)
 *   --output-dir DIR   Where to write polished .txt files  (default: POLISH_OUTPUT_DIR or ./output/polished)
 *   --model NAME       Gemini model name                   (default: GEMINI_MODEL or gemini-2.0-flash)
 *   --rate-limit N     Milliseconds between API calls      (default: GEMINI_RATE_LIMIT_MS or 4000)
 *   --help             Show this help message
 *
 * Environment variable:
 *   GEMINI_API_KEY     Your Google Gemini API key (required)
 *
 * Examples:
 *   ts-node src/cli/polish.cli.ts
 *   ts-node src/cli/polish.cli.ts --input-dir ./output --output-dir ./output/polished
 */

import path from 'path';
import { config as envConfig } from '../config';
import type { PolishOptions } from '../types';
import { runPolisher } from '../core/polisher';

// ─── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): PolishOptions {
  const args = argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  ts-node src/cli/polish.cli.ts [options]

Options:
  --input-dir DIR    Directory containing OCR .txt files (default: OCR_OUTPUT_DIR or ./output)
  --output-dir DIR   Where to write polished .txt files  (default: POLISH_OUTPUT_DIR or ./output/polished)
  --model NAME       Gemini model name                   (default: GEMINI_MODEL or gemini-2.0-flash)
  --rate-limit N     Milliseconds between API calls      (default: GEMINI_RATE_LIMIT_MS or 4000)

Environment variable:
  GEMINI_API_KEY     Your Google Gemini API key (required)

Examples:
  ts-node src/cli/polish.cli.ts
  ts-node src/cli/polish.cli.ts --input-dir ./output --output-dir ./output/polished
`);
    process.exit(0);
  }

  let inputDir = envConfig.ocrOutputDir;
  let outputDir = envConfig.polishOutputDir;
  let model = envConfig.geminiModel;
  let rateLimitMs = envConfig.geminiRateLimitMs;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input-dir':
        inputDir = path.resolve(args[++i]);
        break;
      case '--output-dir':
        outputDir = path.resolve(args[++i]);
        break;
      case '--model':
        model = args[++i];
        break;
      case '--rate-limit':
        rateLimitMs = parseInt(args[++i], 10);
        break;
    }
  }

  if (!envConfig.geminiApiKey) {
    console.error('❌  GEMINI_API_KEY is not set in .env');
    console.error('   Get a free key at: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }

  return {
    inputDir,
    outputDir,
    apiKey: envConfig.geminiApiKey,
    model,
    rateLimitMs,
  };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const opts = parseArgs(process.argv);
  await runPolisher(opts);
}

if (require.main === module) {
  run().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌  Fatal: ${message}`);
    if (envConfig.debug && err instanceof Error) console.error(err.stack);
    process.exit(1);
  });
}
