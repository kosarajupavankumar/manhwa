#!/usr/bin/env node

/**
 * Webtoons Scraper — standalone CLI entry point
 *
 * Usage:
 *   ts-node src/cli/scraper.cli.ts [<webtoons-list-url>] [options]
 *
 * Options:
 *   --from  N    Start from episode N     (default: FROM_EPISODE or 1)
 *   --to    N    Stop after episode N     (default: TO_EPISODE or last)
 *   --output DIR Save images to DIR       (default: DOWNLOAD_DIR or ./downloads)
 *   --help       Show this help message
 */

import path from 'path';
import { config as envConfig } from '../config';
import type { ScrapeOptions } from '../types';
import { scrape } from '../core/scraper';

function parseArgs(argv: string[]): ScrapeOptions {
  const args = argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  ts-node src/cli/scraper.cli.ts [<webtoons-list-url>] [--from N] [--to N] [--output DIR]

  If <webtoons-list-url> is omitted, WEBTOONS_URL from .env is used.

Options:
  --from  N    Start from episode N   (default: FROM_EPISODE or 1)
  --to    N    Stop after episode N   (default: TO_EPISODE or last)
  --output DIR Save images to DIR     (default: DOWNLOAD_DIR or ./downloads)
  --help       Show this help message
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

  for (let i = argOffset; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      fromEpisode = parseInt(args[++i], 10);
    } else if (args[i] === '--to' && args[i + 1]) {
      toEpisode = parseInt(args[++i], 10);
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = path.resolve(args[++i]);
    }
  }

  return { listUrl, fromEpisode, toEpisode, outputDir };
}

if (require.main === module) {
  void (async () => {
    const opts = parseArgs(process.argv);
    try {
      await scrape(opts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Fatal error: ${message}`);
      if (envConfig.debug && err instanceof Error) console.error(err.stack);
      process.exit(1);
    }
  })();
}
