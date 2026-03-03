import fs from 'fs';
import path from 'path';
import os from 'os';
import { getEpisodeFolders, getImageFiles } from '../../src/utils/fs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'webtoons-test-'));
}

// ─── getEpisodeFolders ────────────────────────────────────────────────────────

describe('getEpisodeFolders', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns episode folders sorted by episode number', () => {
    fs.mkdirSync(path.join(tmpDir, 'Episode 003'));
    fs.mkdirSync(path.join(tmpDir, 'Episode 001'));
    fs.mkdirSync(path.join(tmpDir, 'Episode 002'));

    const folders = getEpisodeFolders(tmpDir);

    expect(folders.map((f) => f.number)).toEqual([1, 2, 3]);
  });

  it('ignores non-episode directories', () => {
    fs.mkdirSync(path.join(tmpDir, 'Episode 001'));
    fs.mkdirSync(path.join(tmpDir, 'covers'));
    fs.mkdirSync(path.join(tmpDir, 'thumbnails'));

    const folders = getEpisodeFolders(tmpDir);

    expect(folders).toHaveLength(1);
    expect(folders[0].number).toBe(1);
  });

  it('ignores files in the root directory', () => {
    fs.mkdirSync(path.join(tmpDir, 'Episode 001'));
    fs.writeFileSync(path.join(tmpDir, 'episode 002.txt'), '');

    const folders = getEpisodeFolders(tmpDir);

    expect(folders).toHaveLength(1);
  });

  it('returns correct fullPath for each folder', () => {
    fs.mkdirSync(path.join(tmpDir, 'Episode 005'));

    const folders = getEpisodeFolders(tmpDir);

    expect(folders[0].fullPath).toBe(path.join(tmpDir, 'Episode 005'));
  });

  it('returns an empty array when no episode folders exist', () => {
    expect(getEpisodeFolders(tmpDir)).toEqual([]);
  });

  it('throws when the directory does not exist', () => {
    expect(() => getEpisodeFolders('/no/such/path/xyz')).toThrow('Input directory does not exist');
  });
});

// ─── getImageFiles ────────────────────────────────────────────────────────────

describe('getImageFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns image files sorted by filename', () => {
    fs.writeFileSync(path.join(tmpDir, '003.jpg'), '');
    fs.writeFileSync(path.join(tmpDir, '001.png'), '');
    fs.writeFileSync(path.join(tmpDir, '002.webp'), '');

    const files = getImageFiles(tmpDir);

    expect(files.map((f) => path.basename(f))).toEqual(['001.png', '002.webp', '003.jpg']);
  });

  it('filters out non-image files', () => {
    fs.writeFileSync(path.join(tmpDir, '001.jpg'), '');
    fs.writeFileSync(path.join(tmpDir, 'notes.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'metadata.json'), '');

    const files = getImageFiles(tmpDir);

    expect(files).toHaveLength(1);
    expect(path.basename(files[0])).toBe('001.jpg');
  });

  it('returns full absolute paths', () => {
    fs.writeFileSync(path.join(tmpDir, '001.png'), '');

    const files = getImageFiles(tmpDir);

    expect(path.isAbsolute(files[0])).toBe(true);
  });

  it('returns an empty array for an empty folder', () => {
    expect(getImageFiles(tmpDir)).toEqual([]);
  });

  it('handles all supported extensions', () => {
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
      fs.writeFileSync(path.join(tmpDir, `image${ext}`), '');
    }
    const files = getImageFiles(tmpDir);
    expect(files).toHaveLength(4);
  });
});
