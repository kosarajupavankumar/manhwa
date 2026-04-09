/**
 * Public library API
 *
 * Import core functions and types from this file when using
 * webtoons-scraper as a programmatic library:
 *
 *   import { scrape, runOcr } from './src';
 */

// Core functions
export { scrape } from './core/scraper';
export { runOcr } from './core/ocr';

// Types
export type { ScrapeOptions, OcrOptions, PipelineOptions } from './types';
