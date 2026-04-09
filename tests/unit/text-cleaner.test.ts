import { cleanOutput } from '../../src/core/ocr/text-cleaner';

describe('cleanOutput', () => {
  it('returns an empty string for blank input', () => {
    expect(cleanOutput('')).toBe('');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(cleanOutput('   \n\n   ')).toBe('');
  });

  it('strips non-printable characters', () => {
    // Non-printable chars become spaces, but the line normaliser then collapses
    // consecutive whitespace into a single space.
    expect(cleanOutput('Hello\x01\x02 World')).toBe('Hello World');
  });

  it('normalises fancy left/right single quotes to ASCII apostrophes', () => {
    expect(cleanOutput('\u2018Hello\u2019')).toBe("'Hello'");
  });

  it('normalises fancy double quotes to ASCII double quotes', () => {
    expect(cleanOutput('\u201CHello\u201D')).toBe('"Hello"');
  });

  it('normalises em-dash and en-dash to hyphens', () => {
    // Use real words so the line passes the "has 2+ consecutive letters" guard.
    expect(cleanOutput('Hello\u2013world\u2014text.')).toBe('Hello-world-text.');
  });

  it('filters out lines with no letters at all (pure punctuation/numbers)', () => {
    const raw = '12345\n\nActual text here\n\n!!@@##';
    expect(cleanOutput(raw)).toBe('Actual text here');
  });

  it('keeps single-letter words like "I"', () => {
    // "I" is a valid English word that appears constantly in speech bubbles.
    expect(cleanOutput('I\n\nHello world!\n\nA')).toBe('I\n\nHello world!\n\nA');
  });

  it('merges continuation lines within a block into one paragraph', () => {
    const raw = 'This is the first line\nand this continues it\nand so does this.';
    expect(cleanOutput(raw)).toBe('This is the first line and this continues it and so does this.');
  });

  it('splits on sentence-ending punctuation within a block', () => {
    const raw = 'First sentence.\nSecond sentence.\nThird sentence.';
    expect(cleanOutput(raw)).toBe('First sentence. Second sentence. Third sentence.');
  });

  it('separates distinct blocks with a blank line', () => {
    const raw = 'Block one text.\n\nBlock two text.';
    expect(cleanOutput(raw)).toBe('Block one text.\n\nBlock two text.');
  });

  it('handles multiple blank lines between blocks', () => {
    const raw = 'Block one text.\n\n\n\nBlock two text.';
    expect(cleanOutput(raw)).toBe('Block one text.\n\nBlock two text.');
  });
});
