#!/usr/bin/env node

/**
 * Narrate CLI — Generate viral video narration script from polished episodes
 *
 * Usage:
 *   ts-node src/cli/narrate.cli.ts [options]
 *
 * Options:
 *   --input-dir DIR    Directory with polished episode .txt files  (default: POLISH_OUTPUT_DIR or ./output/Shifting Tails/polished)
 *   --output-dir DIR   Where to write the narration script         (default: NARRATION_OUTPUT_DIR or ./output/Shifting Tails/narration)
 *   --model NAME       Gemini model name                           (default: GEMINI_MODEL or gemini-2.5-flash)
 *   --title NAME       Manhwa title for the prompt                 (default: "Shifting Tails")
 *   --help             Show this help message
 *
 * Requires:
 *   GEMINI_API_KEY     Set in .env
 *
 * Examples:
 *   ts-node src/cli/narrate.cli.ts
 *   ts-node src/cli/narrate.cli.ts --input-dir ./output/polished --title "Shifting Tails"
 */

import path from 'path';
import { config as envConfig } from '../config';
import { type NarratorOptions, runNarrator } from '../core/narrator';

// ─── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): NarratorOptions {
  const args = argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  ts-node src/cli/narrate.cli.ts [options]

Options:
  --input-dir DIR    Directory with polished episode .txt files  (default: POLISH_OUTPUT_DIR or ./output/Shifting Tails/polished)
  --output-dir DIR   Where to write the narration script         (default: NARRATION_OUTPUT_DIR or ./output/Shifting Tails/narration)
  --model NAME       Gemini model name                           (default: GEMINI_MODEL or gemini-2.5-flash)
  --title NAME       Manhwa title for the prompt                 (default: "Shifting Tails")

Requires:
  GEMINI_API_KEY     Set in .env — get one free at https://aistudio.google.com/app/apikey

Examples:
  ts-node src/cli/narrate.cli.ts
  ts-node src/cli/narrate.cli.ts --input-dir ./output/polished --title "Shifting Tails"
`);
    process.exit(0);
  }

  if (!envConfig.geminiApiKey) {
    console.error('❌  GEMINI_API_KEY is not set in .env');
    console.error('   Get a free key at: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }

  let inputDir = envConfig.polishOutputDir;
  let outputDir = envConfig.narrationOutputDir;
  let model = envConfig.geminiModel;
  let title = 'Shifting Tails';

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
      case '--title':
        title = args[++i];
        break;
    }
  }

  return {
    polishedDir: inputDir,
    outputDir,
    apiKey: envConfig.geminiApiKey,
    model,
    title,
  };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const opts = parseArgs(process.argv);
  await runNarrator(opts);
}

if (require.main === module) {
  run().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌  Fatal: ${message}`);
    if (envConfig.debug && err instanceof Error) console.error(err.stack);
    process.exit(1);
  });
}
