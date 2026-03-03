export interface PolishOptions {
  /** Directory containing raw OCR episode .txt files (output of runOcr) */
  inputDir: string;
  /** Directory where polished .txt files will be written */
  outputDir: string;
  /** Gemini API key */
  apiKey: string;
  /** Gemini model name (e.g. "gemini-1.5-flash") */
  model: string;
  /** Milliseconds to wait between successive Gemini API calls (rate-limit guard) */
  rateLimitMs: number;
}

export interface EpisodePolishResult {
  label: string;
  success: boolean;
  error?: string;
  paragraphCount: number;
}
