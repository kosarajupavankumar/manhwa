import fs from 'fs';
import path from 'path';
import type { EpisodeFolder } from '../types';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const EPISODE_FOLDER_RE = /^episode\s+(\d+)$/i;

/**
 * Reads an input directory and returns all "Episode XXX" sub-folders
 * sorted by episode number.
 */
export function getEpisodeFolders(inputDir: string): EpisodeFolder[] {
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory does not exist: ${inputDir}`);
  }

  return fs
    .readdirSync(inputDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && EPISODE_FOLDER_RE.test(e.name))
    .map((e) => {
      const match = EPISODE_FOLDER_RE.exec(e.name);
      if (!match) throw new Error(`Unexpected folder name: ${e.name}`);
      return {
        name: e.name,
        number: parseInt(match[1], 10),
        fullPath: path.join(inputDir, e.name),
      };
    })
    .sort((a, b) => a.number - b.number);
}

/**
 * Returns the full paths of all image files inside a folder, sorted by filename.
 */
export function getImageFiles(folderPath: string): string[] {
  return fs
    .readdirSync(folderPath)
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => path.join(folderPath, f));
}
