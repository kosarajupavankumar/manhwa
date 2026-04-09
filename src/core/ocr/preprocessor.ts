import sharp from 'sharp';

/**
 * Prepare an image for Tesseract:
 *  - Skip tiny spacer images (webtoon separators < 20px)
 *  - Convert to greyscale (improves OCR accuracy)
 *  - 2× upscale with Lanczos (Tesseract works better with larger images)
 *  - Normalise contrast + sharpen
 *  - Optional colour invert (dark-mode panels)
 *  - Returns a PNG buffer
 */
export async function preprocessImage(
  imagePath: string,
  { invert = false }: { invert?: boolean } = {},
): Promise<Buffer> {
  const meta = await sharp(imagePath, { failOn: 'none' }).metadata();

  if ((meta.width ?? 0) < 20 || (meta.height ?? 0) < 20) {
    throw new Error(`Tiny spacer (${meta.width}×${meta.height}) — skipped`);
  }

  let pipeline = sharp(imagePath, { failOn: 'none' })
    .greyscale()
    .resize({ width: (meta.width ?? 800) * 2, kernel: sharp.kernel.lanczos3 })
    .normalise()
    .sharpen();

  if (invert) pipeline = pipeline.negate({ alpha: false });

  return pipeline.png().toBuffer();
}
