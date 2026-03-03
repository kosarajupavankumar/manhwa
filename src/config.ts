/**
 * src/config.ts
 *
 * Loads environment variables from .env (via dotenv) and exports a
 * validated, fully-typed AppConfig object.
 *
 * All consuming code should import from here — never read process.env directly.
 */

import path from 'path';
import { config as loadDotenv } from 'dotenv';
import type { AppConfig } from './types';

// Load .env file relative to project root (where package.json lives).
// In production/CI the variables can be injected directly without a file.
loadDotenv({ path: path.resolve(process.cwd(), '.env') });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireString(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        `Copy .env.example → .env and set the value.`,
    );
  }
  return value;
}

function optionalString(key: string, defaultValue: string): string {
  const value = process.env[key]?.trim();
  return value !== undefined && value !== '' ? value : defaultValue;
}

function optionalInt(key: string, defaultValue: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error(`Environment variable "${key}" must be a positive integer (got "${raw}").`);
  }
  return parsed;
}

function optionalBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new Error(`Environment variable "${key}" must be "true" or "false" (got "${raw}").`);
}

// ─── Validate & export ────────────────────────────────────────────────────────

function buildConfig(): AppConfig {
  const toEpisodeRaw = process.env['TO_EPISODE']?.trim();
  const toEpisode = toEpisodeRaw
    ? (() => {
        const n = parseInt(toEpisodeRaw, 10);
        if (isNaN(n) || n < 1) {
          throw new Error(
            `Environment variable "TO_EPISODE" must be a positive integer (got "${toEpisodeRaw}").`,
          );
        }
        return n;
      })()
    : Infinity;

  return {
    webtoonUrl: requireString('WEBTOONS_URL'),
    fromEpisode: optionalInt('FROM_EPISODE', 1),
    toEpisode,
    downloadDir: path.resolve(optionalString('DOWNLOAD_DIR', './downloads')),
    ocrOutputDir: path.resolve(optionalString('OCR_OUTPUT_DIR', './output/Shifting Tails/ocr')),
    ocrConcurrency: optionalInt('OCR_CONCURRENCY', 2),
    ocrLang: optionalString('OCR_LANG', 'eng'),
    ocrInvert: optionalBool('OCR_INVERT', false),
    skipOcr: optionalBool('SKIP_OCR', false),
    skipPolish: optionalBool('SKIP_POLISH', false),
    skipNarrate: optionalBool('SKIP_NARRATE', false),
    geminiApiKey: optionalString('GEMINI_API_KEY', ''),
    geminiModel: optionalString('GEMINI_MODEL', 'gemini-2.5-flash'),
    polishOutputDir: path.resolve(
      optionalString('POLISH_OUTPUT_DIR', './output/Shifting Tails/polished'),
    ),
    narrationOutputDir: path.resolve(
      optionalString('NARRATION_OUTPUT_DIR', './output/Shifting Tails/narration'),
    ),
    geminiRateLimitMs: optionalInt('GEMINI_RATE_LIMIT_MS', 4000),
    debug: optionalBool('DEBUG', false),
  };
}

export const config: AppConfig = buildConfig();
