import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import type { TtsOptions, TtsResult } from '../../types';
export type { TtsOptions, TtsResult };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip the auto-generated file header (title line, metadata line, divider) so
 * `say` only reads the actual script content.
 */
function stripHeader(raw: string): string {
  const dividerIdx = raw.indexOf('═');
  if (dividerIdx === -1) return raw;
  // Find the end of the divider line
  const newlineAfterDivider = raw.indexOf('\n', dividerIdx);
  return newlineAfterDivider === -1 ? raw : raw.slice(newlineAfterDivider + 1).trimStart();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runTts(opts: TtsOptions): Promise<TtsResult> {
  console.log('\n🔊  Text-to-Speech (macOS say)');
  console.log(`    Script      : ${opts.scriptFile}`);
  console.log(`    Voice       : ${opts.voice}`);
  console.log(`    Rate        : ${opts.rate} wpm`);
  console.log(`    Format      : ${opts.format.toUpperCase()}`);
  console.log(`    Output dir  : ${opts.outputDir}`);
  console.log('');

  // ── Read & strip header ───────────────────────────────────────────────────
  let rawScript: string;
  try {
    rawScript = fs.readFileSync(opts.scriptFile, 'utf8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read narration script: ${msg}`);
  }

  const scriptText = stripHeader(rawScript);
  if (scriptText.trim().length === 0) {
    throw new Error('Narration script is empty after stripping header.');
  }

  const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = (wordCount / opts.rate) * 60;

  console.log(
    `📄  Script length  : ~${wordCount} words (~${formatDuration(estimatedSeconds)} audio)`,
  );

  // ── Write cleaned script to a temp file ───────────────────────────────────
  const tmpFile = path.join(os.tmpdir(), `narration_tts_${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, scriptText, 'utf8');

  // ── Resolve output path ───────────────────────────────────────────────────
  fs.mkdirSync(opts.outputDir, { recursive: true });

  const baseName = `narration_audio.${opts.format}`;
  const outputFile = path.join(opts.outputDir, baseName);

  // ── Build `say` command ───────────────────────────────────────────────────
  //   say -v <voice> -r <rate> -f <input> -o <output>
  //   For m4a, macOS say picks AAC automatically from the .m4a extension.
  const sayArgs = ['-v', opts.voice, '-r', String(opts.rate), '-f', tmpFile, '-o', outputFile];

  console.log(`⚙️   Generating audio…  (this will take a while — real-time synthesis)\n`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('say', sayArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', (chunk: Buffer) => process.stdout.write(chunk));
    proc.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`macOS \`say\` exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start \`say\`: ${err.message}. Are you on macOS?`));
    });
  });

  // ── Cleanup temp file ─────────────────────────────────────────────────────
  try {
    fs.unlinkSync(tmpFile);
  } catch {
    // non-fatal
  }

  // ── Stat output file ─────────────────────────────────────────────────────
  const stat = fs.statSync(outputFile);
  const sizeMb = (stat.size / 1024 / 1024).toFixed(1);

  console.log(`${'━'.repeat(60)}`);
  console.log(`🎧  Audio generated!`);
  console.log(`    Duration (est.) : ${formatDuration(estimatedSeconds)}`);
  console.log(`    File size       : ${sizeMb} MB`);
  console.log(`    Output file     : ${outputFile}`);
  console.log('');

  return { outputFile, estimatedSeconds };
}
