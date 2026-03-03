export interface AppConfig {
  // ── Scraper ──────────────────────────────────────────────────────────────
  /** Full list-page URL of the webtoon to scrape */
  webtoonUrl: string;
  /** Episode number to start from (inclusive) */
  fromEpisode: number;
  /** Episode number to stop at (inclusive). Infinity means scrape all. */
  toEpisode: number;
  /** Directory where image folders are saved */
  downloadDir: string;

  // ── OCR ───────────────────────────────────────────────────────────────────
  /** Directory where .txt output files are written */
  ocrOutputDir: string;
  /** Number of parallel Tesseract workers */
  ocrConcurrency: number;
  /** Tesseract language code */
  ocrLang: string;
  /** Whether to invert image colours before OCR (dark-mode panels) */
  ocrInvert: boolean;

  // ── Pipeline ──────────────────────────────────────────────────────────────
  /** When true, only scrape — skip the OCR step */
  skipOcr: boolean;
  /** When true, skip the Gemini polishing step */
  skipPolish: boolean;
  /** When true, skip the narration script generation step */
  skipNarrate: boolean;

  // ── Polisher ──────────────────────────────────────────────────────────────
  /** Gemini API key (required for polishing) */
  geminiApiKey: string;
  /** Gemini model to use for polishing */
  geminiModel: string;
  /** Directory where polished .txt files are written */
  polishOutputDir: string;
  /** Directory where narration scripts are written */
  narrationOutputDir: string;
  /** Milliseconds between Gemini API calls (rate-limit guard) */
  geminiRateLimitMs: number;

  // ── General ───────────────────────────────────────────────────────────────
  /** Enable verbose debug logging */
  debug: boolean;
}
