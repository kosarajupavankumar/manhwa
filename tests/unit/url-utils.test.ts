import {
  slugToTitle,
  extractTitleFromUrl,
  extractEpisodeNo,
  buildNextEpisodeUrl,
  pad,
  guessExtension,
} from '../../src/core/scraper/url-utils';

describe('slugToTitle', () => {
  it('converts a hyphenated slug to title case', () => {
    expect(slugToTitle('miss-pendleton')).toBe('Miss Pendleton');
  });

  it('handles a single word', () => {
    expect(slugToTitle('shifting')).toBe('Shifting');
  });

  it('handles multiple words', () => {
    expect(slugToTitle('the-quick-brown-fox')).toBe('The Quick Brown Fox');
  });

  it('capitalises the first letter of each word', () => {
    expect(slugToTitle('a-b-c')).toBe('A B C');
  });
});

describe('extractTitleFromUrl', () => {
  it('extracts the title slug from a list URL', () => {
    expect(
      extractTitleFromUrl('https://www.webtoons.com/en/romance/shifting-tails/list?title_no=8942'),
    ).toBe('Shifting Tails');
  });

  it('extracts the title slug from a viewer URL', () => {
    expect(
      extractTitleFromUrl(
        'https://www.webtoons.com/en/historical/miss-pendleton/viewer?title_no=7847&episode_no=3',
      ),
    ).toBe('Miss Pendleton');
  });

  it('throws when URL has no recognisable pattern', () => {
    expect(() => extractTitleFromUrl('https://example.com/no-match')).toThrow(
      'Could not extract title from URL',
    );
  });
});

describe('extractEpisodeNo', () => {
  it('extracts episode_no from a query string', () => {
    expect(extractEpisodeNo('https://example.com/viewer?episode_no=7')).toBe(7);
  });

  it('extracts episode_no when it is not the first param', () => {
    expect(extractEpisodeNo('https://example.com/viewer?title_no=123&episode_no=42')).toBe(42);
  });

  it('returns null when episode_no is absent', () => {
    expect(extractEpisodeNo('https://example.com/list?title_no=8942')).toBeNull();
  });
});

describe('buildNextEpisodeUrl', () => {
  it('increments episode_no in the query string', () => {
    const url =
      'https://www.webtoons.com/en/romance/shifting-tails/episode-5/viewer?title_no=8942&episode_no=5';
    const result = buildNextEpisodeUrl(url);
    expect(result).toContain('episode_no=6');
  });

  it('increments the episode path segment', () => {
    const url =
      'https://www.webtoons.com/en/romance/shifting-tails/episode-5/viewer?title_no=8942&episode_no=5';
    const result = buildNextEpisodeUrl(url);
    expect(result).toContain('/episode-6/');
  });

  it('returns null when episode_no is absent', () => {
    expect(buildNextEpisodeUrl('https://example.com/list?title_no=8942')).toBeNull();
  });
});

describe('pad', () => {
  it('pads a single digit to 3 characters by default', () => {
    expect(pad(1)).toBe('001');
  });

  it('pads a two-digit number to 3 characters', () => {
    expect(pad(42)).toBe('042');
  });

  it('does not pad a number that already meets the width', () => {
    expect(pad(100)).toBe('100');
  });

  it('respects a custom width', () => {
    expect(pad(5, 5)).toBe('00005');
  });
});

describe('guessExtension', () => {
  it('returns .jpg for a JPEG URL', () => {
    expect(guessExtension('https://cdn.example.com/image.jpg')).toBe('.jpg');
  });

  it('returns .png for a PNG URL', () => {
    expect(guessExtension('https://cdn.example.com/image.png')).toBe('.png');
  });

  it('returns .webp for a WebP URL', () => {
    expect(guessExtension('https://cdn.example.com/image.webp')).toBe('.webp');
  });

  it('strips query parameters before checking extension', () => {
    expect(guessExtension('https://cdn.example.com/image.png?v=1&token=abc')).toBe('.png');
  });

  it('falls back to .jpg for unknown extensions', () => {
    expect(guessExtension('https://cdn.example.com/image.bmp')).toBe('.jpg');
  });

  it('falls back to .jpg when there is no extension', () => {
    expect(guessExtension('https://cdn.example.com/image')).toBe('.jpg');
  });
});
