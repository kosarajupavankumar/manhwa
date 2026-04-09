#!/usr/bin/env node

/**
 * Webtoon OCR — standalone CLI entry point
 *
 * Usage:
 *   ts-node src/cli/ocr.cli.ts [options]
 *
 * Options:
 *   --input-dir   <path>  Folder with "Episode XXX" sub-folders
 *   --output-dir  <path>  Output folder for .txt files  (default: ./output)
 *   --concurrency <n>     Parallel OCR workers           (default: 2)
 *   --lang        <lang>  Tesseract language code         (default: eng)
 *   --invert              Invert colours before OCR (dark panels)
 *   --help                Show this message
 */

import path from 'path';
import os from 'os';
import { config as envConfig } from '../config';
import type { OcrOptions } from '../types';
import { runOcr } from '../core/ocr';

function parseArgs(argv: string[]): OcrOptions {
  const args = argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  ts-node src/cli/ocr.cli.ts [options]

Options:
  --input-dir   <path>  Folder with "Episode XXX" sub-folders
  --output-dir  <path>  Output folder for .txt files  (default: ./output)
  --concurrency <n>     Parallel OCR workers          (default: 2)
  --lang        <lang>  Tesseract language code        (default: eng)
  --invert              Invert colours before OCR (dark panels)
  --help                Show this message
`);
    process.exit(0);
  }

  const get = (flag: string, fallback: string): string => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] !== undefined ? args[idx + 1] : fallback;
  };

  return {
    inputDir: path.resolve(
      get('--input-dir', path.join(os.homedir(), 'Downloads', 'Miss Pendleton')),
    ),
    outputDir: path.resolve(get('--output-dir', envConfig.ocrOutputDir)),
    concurrency: parseInt(get('--concurrency', String(envConfig.ocrConcurrency)), 10),
    lang: get('--lang', envConfig.ocrLang),
    invert: args.includes('--invert') || envConfig.ocrInvert,
  };
}

if (require.main === module) {
  runOcr(parseArgs(process.argv)).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌  Fatal: ${message}`);
    if (envConfig.debug && err instanceof Error) console.error(err.stack);
    process.exit(1);
  });
}
