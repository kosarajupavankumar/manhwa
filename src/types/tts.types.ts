export interface TtsOptions {
  /** Path to the narration script .txt file */
  scriptFile: string;
  /** Directory where the audio file will be saved */
  outputDir: string;
  /** macOS `say` voice name  (e.g. "Samantha", "Daniel", "Reed (English (US))") */
  voice: string;
  /** Speaking rate in words-per-minute */
  rate: number;
  /** Output audio format — "m4a" (AAC, compressed) or "aiff" (uncompressed) */
  format: 'aiff' | 'm4a';
}

export interface TtsResult {
  /** Absolute path of the generated audio file */
  outputFile: string;
  /** Duration estimate in seconds (word-count ÷ wpm × 60) */
  estimatedSeconds: number;
}
