import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PolishOptions, EpisodePolishResult } from '../../types';

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are rescuing real story text from extremely noisy OCR output scraped from the manhwa "Shifting Tails".

The OCR scanner photographed comic panels and produced lines where genuine dialogue/narration is buried inside garbage characters. Your job is to extract ONLY the real story content.

HOW TO IDENTIFY REAL TEXT:
- Real content = coherent English words that form meaningful phrases or sentences
- Often ALL CAPS (manhwa lettering style), but may be mixed case for character thoughts
- Examples of real fragments: "THE LIFE OF A WILD BOAR IS SIMPLE.", "SNIFF THE GROUND.", "WE ARE HALF HUMAN, HALF BOAR.", "OH! UHH... YOU CAN HAVE IT."

HOW TO IDENTIFY NOISE (DISCARD THESE):
- Random single letters separated by spaces: "a N 3 N\\ K { 7 & I"
- Backslashes and symbols: "\\ BN \\ Ek", "[i \\", "{ oF (0"
- Meaningless letter clusters: "Ng", "oY", "dls", "NIN", "AY Ee"
- Numbers without context: "4 N 3", "7 77", "32.8"
- Bracket/symbol runs: "| EE =", "p= { oF", "TSS | ELT}"

EXAMPLES — study these carefully:
INPUT:  "Ea \\ X THE LIFE Y OF AWILD BOAR [i \\ IS SIMPLE. 4 N 3 N\\ K { 7 & I"
OUTPUT: "THE LIFE OF A WILD BOAR IS SIMPLE."

INPUT:  "| J es DIG FOR | ey FOOD. R aN = 5 NB / EAT, AND \\ REPEAT."
OUTPUT: "DIG FOR FOOD.\\nEAT, AND REPEAT."

INPUT:  "\\ BN \\ Ek a 9 U 5 ) A = C. 7 77 : ge. : rs o WHAT'S / OUR NUMBER y E ONE RULE? i ll 7"
OUTPUT: "WHAT'S OUR NUMBER ONE RULE?"

INPUT:  "Yg va J 1 i EEE SHARING IS CARING? PON'T SHARE"
OUTPUT: "SHARING IS CARING? DON'T SHARE"

INPUT:  ") WN ANNE p= { oF (0 Ce | TSS | ELT} Nn How a \\ NN SURVIVE & \\ RD \\ \\ E oh \\| I = WE ARE HALF HUMAN, \\ HALF BOAR."
OUTPUT: "WE ARE HALF HUMAN, HALF BOAR."

INPUT:  "At 3d aE Ve 3 on Er ' - 2, 73 : | hes: od bv: i M A - . )"
OUTPUT: (nothing — pure noise, skip entirely)

RULES:
1. Rescue every coherent English phrase you can find on each line
2. Each rescued speech bubble or caption goes on its own line
3. Reconstruct broken words where the meaning is obvious (e.g. "AWILD" → "A WILD", "PON'T" → "DON'T")
4. Do NOT invent, summarise, or add any content not present in the raw input
5. If a line has zero recoverable real text, skip it — output nothing for that line
6. Return ONLY the cleaned story text. No headings, no commentary, no explanations.`;

// ─── Pre-filter ───────────────────────────────────────────────────────────────

/**
 * Lightweight pre-filter: keep only lines that contain at least one
 * run of 3+ consecutive English letters (likely a real word).
 * This dramatically reduces tokens sent to the API and focuses Gemini
 * on lines that actually have recoverable content.
 */
function preFilter(raw: string): string {
  return raw
    .split('\n')
    .filter((line) => /[a-zA-Z]{3,}/.test(line))
    .join('\n');
}

// ─── Delay helper ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Polish a single episode's raw OCR text via Gemini.
 * Returns the cleaned text, or throws on API failure.
 */
async function polishEpisode(
  rawText: string,
  genAI: GoogleGenerativeAI,
  model: string,
): Promise<string> {
  // Pre-filter to keep only lines that have at least one real word
  const filtered = preFilter(rawText);

  if (!filtered.trim()) {
    return '(No readable text found in this episode)';
  }

  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await genModel.generateContent(filtered);
  const response = result.response;
  const text = response.text().trim();

  // Sanity-check: if Gemini returned something very close in length to the
  // input it likely didn't clean anything — warn so we notice in logs.
  const inputLen = filtered.length;
  const outputLen = text.length;
  if (outputLen > inputLen * 0.8) {
    console.warn(
      `  ⚠️   Output is ${Math.round((outputLen / inputLen) * 100)}% the size of filtered input — Gemini may not have cleaned aggressively enough`,
    );
  }

  return text;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the polisher pipeline over all episode .txt files in opts.inputDir.
 *
 * For every episode:
 *  - Reads  <inputDir>/<Episode XXX>.txt
 *  - Sends raw OCR text to Gemini for cleaning
 *  - Writes <outputDir>/<Episode XXX>.txt  with polished text
 *
 * After all episodes:
 *  - Writes <outputDir>/all_episodes.txt  with a TOC + all polished text
 */
export async function runPolisher(opts: PolishOptions): Promise<void> {
  console.log('\n✨  Gemini Text Polisher');
  console.log(`    Input       : ${opts.inputDir}`);
  console.log(`    Output      : ${opts.outputDir}`);
  console.log(`    Model       : ${opts.model}`);
  console.log(`    Rate limit  : ${opts.rateLimitMs}ms between calls`);
  console.log('');

  // Gather episode .txt files (skip combined all_episodes.txt)
  let episodeFiles: string[];
  try {
    episodeFiles = fs
      .readdirSync(opts.inputDir)
      .filter((f) => f.endsWith('.txt') && f !== 'all_episodes.txt')
      .sort()
      .map((f) => path.join(opts.inputDir, f));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read OCR input directory: ${message}`);
  }

  if (episodeFiles.length === 0) {
    console.warn('⚠️   No episode .txt files found in OCR output directory. Nothing to polish.');
    return;
  }

  console.log(`📂  Found ${episodeFiles.length} episode file(s) to polish`);
  fs.mkdirSync(opts.outputDir, { recursive: true });

  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const results: EpisodePolishResult[] = [];

  // Accumulate body for combined file
  const bodyLines: string[] = [];

  for (let i = 0; i < episodeFiles.length; i++) {
    const filePath = episodeFiles[i];
    const label = path.basename(filePath, '.txt');

    console.log(`━━━  [${i + 1}/${episodeFiles.length}]  ${label}  ━━━`);

    const rawText = fs.readFileSync(filePath, 'utf8');

    // Rate-limit guard (skip delay before the first call)
    if (i > 0) {
      await sleep(opts.rateLimitMs);
    }

    let polished = '';
    let success = false;
    let errorMsg: string | undefined;

    try {
      polished = await polishEpisode(rawText, genAI, opts.model);
      success = true;
      console.log(`  ✅  Polished — ${polished.split('\n').filter(Boolean).length} line(s)\n`);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`  ❌  Gemini error: ${errorMsg}`);
      console.warn(`      Falling back to pre-filtered OCR text\n`);
      // Fallback: at least strip pure-noise lines
      polished = preFilter(rawText);
    }

    const paragraphCount = polished.split('\n').filter(Boolean).length;

    // Write per-episode polished file
    const outFile = path.join(opts.outputDir, `${label}.txt`);
    fs.writeFileSync(outFile, polished, 'utf8');

    results.push({ label, success, error: errorMsg, paragraphCount });

    // Accumulate for combined file
    bodyLines.push(`${'═'.repeat(60)}`);
    bodyLines.push(`  ${label}`);
    bodyLines.push(`${'═'.repeat(60)}`);
    bodyLines.push('');
    bodyLines.push(polished);
    bodyLines.push('');
  }

  // ── Write combined file ───────────────────────────────────────────────────
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  const tocLines: string[] = [
    `╔${'═'.repeat(58)}╗`,
    `║${'  Shifting Tails — Polished Dialogue'.padEnd(58)}║`,
    `║${`  Polished: ${successCount}/${results.length} episodes`.padEnd(58)}║`,
    `╚${'═'.repeat(58)}╝`,
    '',
    'TABLE OF CONTENTS',
    '─'.repeat(60),
    ...results.map((r, idx) => {
      const num = String(idx + 1).padStart(3);
      const status = r.success ? '✅' : '⚠️ ';
      return `  ${num}. ${status}  ${r.label}  (${r.paragraphCount} lines)`;
    }),
    '',
    '─'.repeat(60),
    '',
  ];

  const combinedContent = [...tocLines, ...bodyLines].join('\n');
  const combinedPath = path.join(opts.outputDir, 'all_episodes.txt');
  fs.writeFileSync(combinedPath, combinedContent, 'utf8');

  console.log(`\n${'━'.repeat(60)}`);
  console.log(`✨  Polishing complete`);
  console.log(`    Episodes polished : ${successCount}/${results.length}`);
  if (failCount > 0) {
    console.log(`    Fallback (raw)    : ${failCount} episode(s)`);
  }
  console.log(`    Output directory  : ${opts.outputDir}`);
  console.log(`    Combined file     : ${combinedPath}`);
  console.log('');
}
