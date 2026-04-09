/**
 * Clean raw Tesseract output into readable paragraphs.
 *
 * Rules (in order):
 *  1. Normalise fancy quotes / dashes to ASCII equivalents
 *  2. Replace non-printable characters with a space
 *  3. Split on blank lines to find natural paragraph blocks
 *  4. Within each block, strip lines that are pure noise:
 *       - completely empty after trimming
 *       - contain NO letter at all (pure numbers / punctuation / symbols)
 *  5. Merge continuation lines into full sentences
 *  6. Return one paragraph per block, blocks separated by a blank line
 *
 * Intentionally lenient: short-but-real lines like "I", "Oh!", "No."
 * are kept because they appear constantly in speech-bubble text.
 */
export function cleanOutput(rawText: string): string {
  // 1. Normalise fancy quotes/dashes; replace remaining non-printable chars.
  const text = rawText
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, ' ');

  // 2. Split into raw blocks separated by blank lines.
  const rawBlocks = text.split(/\n{2,}/);

  const paragraphs = rawBlocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        // Keep any line that contains at least one letter.
        // This preserves "I", "A", "Oh!", "No." etc.
        .filter((l) => l.length > 0 && /[a-zA-Z]/.test(l));

      if (lines.length === 0) return null;

      // 3. Merge continuation lines into sentences.
      const sentenceEnds = /[.!?…"')\]]$/;
      const tokens: string[] = [];
      let current = '';

      for (const line of lines) {
        if (!current) {
          current = line;
        } else if (sentenceEnds.test(current)) {
          tokens.push(current);
          current = line;
        } else {
          current += ` ${line}`;
        }
      }
      if (current) tokens.push(current);

      // 4. Join sentences within the block into one paragraph.
      return tokens.join(' ').trim();
    })
    .filter((p): p is string => p !== null && p.length > 0);

  return paragraphs.join('\n\n').trim();
}
