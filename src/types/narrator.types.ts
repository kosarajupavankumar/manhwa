export interface NarratorOptions {
  /** Directory containing polished episode .txt files */
  polishedDir: string;
  /** Where to write the narration script */
  outputDir: string;
  /** Gemini API key */
  apiKey: string;
  /** Gemini model name */
  model: string;
  /** Manhwa title used in the prompt and output header */
  title: string;
}

export interface NarratorResult {
  outputFile: string;
  wordCount: number;
}
