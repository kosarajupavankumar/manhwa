import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NarratorOptions, NarratorResult } from '../../types';
export type { NarratorOptions, NarratorResult };

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a viral YouTube video scriptwriter specialising in manhwa/manga recap content.
You have been given the cleaned dialogue and narration lines from the first episodes of "Shifting Tails" — a fantasy romance manhwa about a half-human half-boar girl named Euna who lives in a hidden mountain village, and a powerful tiger shapeshifter who loses his memory after an encounter with her.

Your task is to rewrite this content as a smooth, gripping, first-person AND narrator-style video script — the kind that gets 5 million views. Use the dialogue as your source material to reconstruct the story.

CRITICAL LENGTH REQUIREMENT:
- Each episode must produce AT LEAST 450 words of narration (3 minutes at 150 wpm)
- Do NOT rush through events. Slow down, paint the scene, dwell on the emotion
- If an episode's dialogue is sparse, expand with vivid scene description, internal monologue, and dramatic atmosphere — as long as it is faithful to the source material

SCRIPT STRUCTURE TO FOLLOW:
1. HOOK (3-5 sentences) — Start mid-action with something shocking, funny, or deeply relatable that makes viewers stop scrolling. Make it punchy.
2. STORY NARRATION — Tell every episode in full, rich paragraphs. For each episode:
   - Set the scene with atmospheric description (mountain village, tension in the air, etc.)
   - Alternate between third-person narrator voice (dramatic, cinematic) and direct character quotes woven in naturally
   - Expand each key moment into at least 2-3 sentences — don't just state what happened, make us feel it
   - Highlight the comedy moments: this manhwa is funny — let that personality breathe
   - Show the internal conflict of both Euna (panic, survival instinct, secret tenderness) and the Tiger (predator instincts vs. confused feelings)
3. EPISODE TRANSITIONS — Between episodes, add a short "but it only gets worse / better / more unhinged from here…" style bridge sentence to keep momentum
4. CLIFFHANGER ENDING — End on the biggest unresolved tension with real stakes. Make the viewer desperate for the next episode.

WRITING RULES:
- Write in flowing PARAGRAPHS — absolutely no bullet points, no "Episode 1:" headers, no numbered lists
- Every paragraph flows naturally into the next like a single unstoppable story
- Inject emotion: "Her heart hammered", "he narrowed those dangerously golden eyes", "she plastered on the most convincing smile of her life"
- Keep the comedy alive — especially the "you're my pet cat" lie and the boar village culture moments
- DO NOT number episodes or use any section headers. Just pure flowing story paragraphs from start to finish.
- Total length: AT LEAST 1,800 words (minimum 450 words per episode × 4 episodes)
- End with a call-to-action: "Comment below what you think happens next — and subscribe so you never miss a recap."

TONE: Dramatic but warm and funny. Like you're telling your best friend the most unhinged, beautiful story you've ever read, and you refuse to let them leave until you've told them every detail.`;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runNarrator(opts: NarratorOptions): Promise<NarratorResult> {
  console.log('\n🎬  Viral Video Narrator (Gemini AI)');
  console.log(`    Input       : ${opts.polishedDir}`);
  console.log(`    Output      : ${opts.outputDir}`);
  console.log(`    Model       : ${opts.model}`);
  console.log(`    Title       : ${opts.title}`);
  console.log('');

  // ── Gather polished episode files ─────────────────────────────────────────
  let episodeFiles: string[];
  try {
    episodeFiles = fs
      .readdirSync(opts.polishedDir)
      .filter((f) => f.endsWith('.txt') && f !== 'all_episodes.txt' && f !== 'narration_script.txt')
      .sort()
      .map((f) => path.join(opts.polishedDir, f));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read polished directory: ${message}`);
  }

  if (episodeFiles.length === 0) {
    throw new Error(
      'No polished episode .txt files found. Run the polisher first with: npm run polish',
    );
  }

  console.log(`📂  Found ${episodeFiles.length} polished episode(s)`);

  // ── Combine episode content into one prompt block ─────────────────────────
  const storyLines: string[] = [];

  for (const filePath of episodeFiles) {
    const label = path.basename(filePath, '.txt');
    const content = fs.readFileSync(filePath, 'utf8').trim();
    storyLines.push(`--- ${label} ---`);
    storyLines.push(content);
    storyLines.push('');
  }

  const combinedStory = storyLines.join('\n');

  // ── Call Gemini ────────────────────────────────────────────────────────────
  console.log('⚙️   Generating narration script with Gemini…\n');

  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const genModel = genAI.getGenerativeModel({
    model: opts.model,
    systemInstruction: SYSTEM_PROMPT,
  });

  const userPrompt = `Here is the source material — cleaned dialogue and narration from the manhwa "${opts.title}":\n\n${combinedStory}\n\nWrite the viral video narration script now. Remember: minimum 450 words per episode, at least 1,800 words total. Do NOT use episode headers or section labels — just flowing paragraphs from start to finish.`;

  const result = await genModel.generateContent(userPrompt);
  const script = result.response.text().trim();

  const wordCount = script.split(/\s+/).filter(Boolean).length;

  // ── Write output ──────────────────────────────────────────────────────────
  fs.mkdirSync(opts.outputDir, { recursive: true });

  const outFileName = 'narration_script.txt';
  const outFilePath = path.join(opts.outputDir, outFileName);

  const header = [
    `SHIFTING TAILS — VIRAL VIDEO NARRATION SCRIPT`,
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Episodes covered: ${episodeFiles.length}  |  Word count: ~${wordCount}  |  Est. read time: ~${Math.round(wordCount / 150)} min`,
    `${'═'.repeat(60)}`,
    '',
    '',
  ].join('\n');

  fs.writeFileSync(outFilePath, `${header}${script}\n`, 'utf8');

  console.log(`${'━'.repeat(60)}`);
  console.log(`🎬  Script generated!`);
  console.log(`    Word count    : ~${wordCount} words`);
  console.log(`    Est. read time: ~${Math.round(wordCount / 150)} min voiceover`);
  console.log(`    Output file   : ${outFilePath}`);
  console.log('');

  return { outputFile: outFilePath, wordCount };
}
