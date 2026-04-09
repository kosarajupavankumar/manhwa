import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NarratorOptions, NarratorResult } from '../../types';
export type { NarratorOptions, NarratorResult };

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an award-winning YouTube voice-over scriptwriter who specialises in manhwa and manga recap content. Your scripts are read aloud — every single word must feel SPOKEN, not written. You write for the ear, not the eye.

You have been given the cleaned dialogue and narration from the opening episodes of "Shifting Tails" — a fantasy-romance manhwa following Euna, a half-human half-boar girl living in a secret mountain village, and a powerful amnesiac tiger shapeshifter whose collision with her life changes everything.

Your mission: craft a single, feature-length voice-over narration script — the kind that earns five million views and a comment section that won't stop.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOICE-OVER FIRST PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These rules are NON-NEGOTIABLE. A human narrator is going to read this script out loud, so every sentence must:

1. BREATHE NATURALLY — Vary sentence length deliberately. Short. Sharp. Punchy. Then let a longer, more sweeping sentence carry the weight of the emotion before landing the next gut-punch line. Rhythm is everything.

2. USE THE PAUSE — An ellipsis (…) signals the narrator to breathe and let tension sit. Use it at cliff-edges, after reveals, after unexpected comedy beats. Example: "She looked him dead in the eye… and called him her cat."

3. USE THE EM-DASH FOR DRAMA — An em-dash (—) creates an abrupt pivot or a charged interruption. "She opened her mouth to say something wise — and said the most unhinged thing of her life."

4. USE CAPS FOR ONE-WORD PUNCHES — When a word needs to land with force, capitalise it. "She pushed a TIGER off a cliff. On accident. Mostly." No over-using this — maximum 2–3 caps words per paragraph.

5. NO FLOWERY WRITTEN PROSE — Avoid complex literary sentences that sound beautiful on paper but trip a narrator's tongue. Keep it conversational, rhythmic, immediate. "She was panicking. Fully. Completely. On every level."

6. CONTRACTIONS ALWAYS — "don't" not "do not", "she's" not "she is", "he'd" not "he would". Voice-over narration sounds stiff without them.

7. SPEAK TO THE VIEWER — Use "you" and "we" to pull the audience into the story. "You know that moment when your instincts and your common sense go to war? Yeah. Euna was living that."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCRIPT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. HOOK (4–6 lines) — Open mid-chaos. No preamble. No "today we're covering…". Drop the viewer straight into the story's wildest, funniest, or most emotionally charged moment. Make them NEED to keep watching.

2. WORLD-SETTING (1 short paragraph) — Paint the world just enough: the hidden mountain village, the boar clan rules, Euna's outsider status. Make it feel lived-in and specific, not like a wiki entry.

3. EPISODE NARRATION (the bulk of the script) — Move through each episode in full without headers or episode numbers. For every key scene:
   - Open with a punchy establishing sentence that sets the stakes or mood
   - Let the action unfold beat by beat with momentum — don't skip, don't rush
   - Alternate the narrator's cinematic voice with character inner thoughts and woven-in dialogue ("She squared her shoulders and announced — and I quote — 'You're my cat.'")
   - Let comedy breathe. Don't explain the joke. Deliver it and let the pause do the work.
   - Let the emotional undertow build quietly: Euna's loneliness, the Tiger's confused tenderness — weave it in without stopping for a therapy session

4. EPISODE BRIDGES — Between major story beats, use a single charged sentence to pivot. "And just when Euna thought she had this under control… she absolutely did not."

5. CLIMAX & CLIFFHANGER — End on the scene with the highest unresolved tension. Make it sting just a little. Make the viewer desperate to know what comes next.

6. CALL TO ACTION — Warm, natural, not corporate. Like a friend finishing a story. End with: "Drop a comment telling me what you think happens next — and hit subscribe so you never miss a recap."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONE & VOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Primary tone: warm, funny, cinematic — like a best friend who read the best manga of their life at 2am and is REFUSING to let you go to sleep until you've heard every single detail
- Secondary tone: genuinely tender when the romance starts bleeding through — don't play it for laughs when the emotional beats are real
- Comedy delivery: dry, deadpan, then escalate. "She told a tiger — a TIGER — that he was her house cat. And it worked."
- Never sarcastic at the characters' expense. Laugh with them, not at them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Zero bullet points. Zero numbered lists. Zero episode headers or section titles. Pure flowing paragraphs only.
- Every paragraph must flow into the next. No orphaned ideas.
- Minimum 500 words per episode of source material. Do NOT rush. If source dialogue is sparse, expand with atmosphere, inner monologue, and vivid scene detail — always faithful to the source.
- TOTAL MINIMUM: 2,000 words.
- Dialogue quotes must feel natural in the narration flow — introduce them with character voice, not just quotation marks hanging in space.
- Every internal character thought must feel like the narrator is letting us peek inside their head, not reading stage directions.`;

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

  const userPrompt = `Here is the source material — the cleaned and polished dialogue and narration from the manhwa "${opts.title}":\n\n${combinedStory}\n\nNow write the complete voice-over narration script.\n\nRemember:\n- This will be READ ALOUD by a narrator — every sentence must feel spoken, rhythmic, and natural\n- Vary your sentence lengths deliberately: short punchy lines followed by longer emotional sweeps\n- Use … for pause beats, em-dashes for dramatic pivots, and occasional CAPS for one-word punches\n- Minimum 500 words per episode, at least 2,000 words total\n- Absolutely NO episode headers, section titles, or numbered lists — one unbroken flow of story from hook to call-to-action\n- Comedy must breathe — don't rush the funny moments, let the absurdity land before moving on\n- Let the emotional undercurrent build naturally without stopping the story for it`;

  const result = await genModel.generateContent(userPrompt);
  const script = result.response.text().trim();

  const wordCount = script.split(/\s+/).filter(Boolean).length;

  // ── Write output ──────────────────────────────────────────────────────────
  fs.mkdirSync(opts.outputDir, { recursive: true });

  const outFileName = 'narration_script.txt';
  const outFilePath = path.join(opts.outputDir, outFileName);

  const header = [
    `SHIFTING TAILS — VOICE-OVER NARRATION SCRIPT`,
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Episodes covered: ${episodeFiles.length}  |  Word count: ~${wordCount}  |  Est. voice-over time: ~${Math.round(wordCount / 130)} min @ 130 wpm`,
    `${'═'.repeat(60)}`,
    '',
    '',
  ].join('\n');

  fs.writeFileSync(outFilePath, `${header}${script}\n`, 'utf8');

  console.log(`${'━'.repeat(60)}`);
  console.log(`🎬  Script generated!`);
  console.log(`    Word count    : ~${wordCount} words`);
  console.log(`    Est. VO time  : ~${Math.round(wordCount / 130)} min @ 130 wpm`);
  console.log(`    Output file   : ${outFilePath}`);
  console.log('');

  return { outputFile: outFilePath, wordCount };
}
