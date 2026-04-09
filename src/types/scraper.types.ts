export interface ScrapeOptions {
  listUrl: string;
  fromEpisode: number;
  toEpisode: number;
  outputDir: string;
}

export interface DownloadTask {
  (): Promise<void>;
}
