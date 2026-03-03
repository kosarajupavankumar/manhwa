export interface OcrOptions {
  inputDir: string;
  outputDir: string;
  concurrency: number;
  lang: string;
  invert: boolean;
}

export interface EpisodeFolder {
  name: string;
  number: number;
  fullPath: string;
}

export interface OcrResult {
  skipped: true;
  reason: string;
  text?: never;
}

export interface OcrSuccess {
  skipped: false;
  text: string;
  reason?: never;
}

export type ImageOcrResult = OcrResult | OcrSuccess;
