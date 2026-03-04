#!/usr/bin/env node

/**
 * TTS CLI — Convert the narration script to an audio file using macOS `say`
 *
 * Usage:
 *   ts-node src/cli/tts.cli.ts [options]
 *
 * Options:
 *   --script FILE      Path to narration_script.txt  (default: NARRATION_OUTPUT_DIR/narration_script.txt)
 *   --output-dir DIR   Where to write the audio file  (default: TTS_OUTPUT_DIR or ./output/Shifting Tails/audio)
 *   --voice NAME       macOS `say` voice name         (default: TTS_VOICE or Samantha)
 *   --rate N           Words per minute               (default: TTS_RATE or 160)
 *   --format FORMAT    "m4a" or "aiff"                (default: TTS_FORMAT or m4a)
 *   --list-voices      Print available English voices and exit
 *   --help             Show this help message
 *
 * Requires:
 *   macOS (uses the built-in `say` command)
 *
 * Examples:
 *   ts-node src/cli/tts.cli.ts
 *   ts-node src/cli/tts.cli.ts --voice "Daniel" --rate 155
 *   ts-node src/cli/tts.cli.ts --voice "Reed (English (US))" --format aiff
 */

import path from 'path';
import { execSync } from 'child_process';
import { config as envConfig } from '../config';
import { type TtsOptions, runTts } from '../core/tts';

// ─── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): TtsOptions {
  const args = argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  ts-node src/cli/tts.cli.ts [options]

Options:
  --script FILE      Path to narration_script.txt  (default: <NARRATION_OUTPUT_DIR>/narration_script.txt)
  --output-dir DIR   Where to write the audio file  (default: TTS_OUTPUT_DIR or ./output/Shifting Tails/audio)
  --voice NAME       macOS say voice name           (default: TTS_VOICE or Samantha)
  --rate N           Words per minute               (default: TTS_RATE or 160)
  --format FORMAT    m4a or aiff                    (default: TTS_FORMAT or m4a)
  --list-voices      Print available English voices and exit

Examples:
  ts-node src/cli/tts.cli.ts
  ts-node src/cli/tts.cli.ts --voice "Daniel" --rate 155
  ts-node src/cli/tts.cli.ts --voice "Reed (English (US))" --format aiff
`);
    process.exit(0);
  }

  if (args[0] === '--list-voices') {
    console.log('\n🔊  Available English voices on this Mac:\n');
    try {
      const voices = execSync("say -v '?' 2>/dev/null | grep -i 'en_'", {
        encoding: 'utf8',
      });
      console.log(voices);
    } catch {
      console.log('  (Could not retrieve voice list — are you on macOS?)');
    }
    process.exit(0);
  }

  let scriptFile = path.join(envConfig.narrationOutputDir, 'narration_script.txt');
  let outputDir = envConfig.ttsOutputDir;
  let voice = envConfig.ttsVoice;
  let rate = envConfig.ttsRate;
  let format = envConfig.ttsFormat as 'aiff' | 'm4a';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--script':
        scriptFile = path.resolve(args[++i]);
        break;
      case '--output-dir':
        outputDir = path.resolve(args[++i]);
        break;
      case '--voice':
        voice = args[++i];
        break;
      case '--rate':
        rate = parseInt(args[++i], 10);
        break;
      case '--format':
        format = args[++i] as 'aiff' | 'm4a';
        break;
    }
  }

  if (format !== 'aiff' && format !== 'm4a') {
    console.error(`❌  --format must be "aiff" or "m4a" (got "${String(format)}")`);
    process.exit(1);
  }

  return { scriptFile, outputDir, voice, rate, format };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const opts = parseArgs(process.argv);
  await runTts(opts);
}

if (require.main === module) {
  run().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌  TTS failed: ${message}`);
    if (envConfig.debug && err instanceof Error) console.error(err.stack);
    process.exit(1);
  });
}
