import type { PolishOptions } from './polisher.types';
import type { NarratorOptions } from './narrator.types';
import type { ScrapeOptions } from './scraper.types';
import type { OcrOptions } from './ocr.types';

export interface PipelineOptions {
  scraper: ScrapeOptions;
  ocr: OcrOptions;
  polish: Omit<PolishOptions, 'inputDir'>;
  narrate: Omit<NarratorOptions, 'polishedDir'>;
  skipOcr: boolean;
  skipPolish: boolean;
  skipNarrate: boolean;
}
