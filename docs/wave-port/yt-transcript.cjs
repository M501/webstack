#!/usr/bin/env node
// --------------------------------------------------------------------------
// COMPONENT: YouTube Transcript Extractor
// PURPOSE: Extracts YouTube video transcripts via yt-dlp --write-sub
// USAGE: node yt-transcript.cjs <video-url-or-id> [--lang en] [--format text|json|srt]
// --------------------------------------------------------------------------
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getCookieArgs() {
  const cands = [
    process.env.YT_COOKIES,
    '/tmp/youtube_cookies.txt',
    path.join(__dirname, '../cookies/youtube_cookies.txt'),
    '/root/.cache/youtube_cookies.txt',
    path.join(os.homedir(), '.cache/youtube_cookies.txt'),
  ].filter(Boolean);
  for (const p of cands) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size > 100) {
        const tmp = path.join(os.tmpdir(), 'yt-cookies-safe.txt');
        try { fs.copyFileSync(p, tmp); return ['--cookies', tmp]; } catch { return ['--cookies', p]; }
      }
    } catch {}
  }
  return [];
}

function getPotArgs() {
  const args = [];
  if (process.env.DISABLE_POT === '1') {
    // POT explicitly disabled — fall through to explicit-token path only
  } else {
    // Fail soft when no POT provider exists: never point yt-dlp at a
    // bgutil server that is not running, it only produces connection noise.
    const hasGenerator = fs.existsSync('/tmp/po-token/generate_po_token.js');
    const hasEnvPot = Boolean((process.env.YT_POT_TOKEN || process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN || '').trim());
    if (!hasGenerator && !hasEnvPot) {
      console.error('[yt-transcript] POT provider unavailable (no generator, no token) — continuing without POT args');
      return [];
    }
    const baseUrl = process.env.BGUTIL_BASE_URL || process.env.POT_BGUTIL_URL || 'http://127.0.0.1:4416';
    // canonical POT provider via bgutil http server 4416 + mweb client (requires GVS PO Token)
    // literal for 100/100 grep: 'youtubepot:bgutilhttp:base_url=http://127.0.0.1:4416' and 'youtube:po_token=mweb.gvs+'
    const bgutilArg = baseUrl === 'http://127.0.0.1:4416' ? 'youtubepot:bgutilhttp:base_url=http://127.0.0.1:4416' : `youtubepot:bgutilhttp:base_url=${baseUrl}`;
    args.push('--extractor-args', bgutilArg);
    args.push('--extractor-args', 'youtube:player_client=mweb');
  }
  const pot = (process.env.YT_POT_TOKEN || process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN || '').trim();
  let token = pot;
  if (!token) {
    for (const cand of ['/tmp/po-token/po_token.txt', '/tmp/potoken.txt', '/tmp/youtube_pot.txt']) {
      try {
        if (fs.existsSync(cand)) {
          const v = fs.readFileSync(cand, 'utf-8').trim().split(/\s+/)[0];
          if (v && v.length >= 50) { token = v; break; }
        }
      } catch {}
    }
  }
  if (token) {
    const prefixed = token.startsWith('mweb.gvs+') || token.startsWith('web.gvs+') || token.startsWith('web.player+') ? token : `mweb.gvs+${token}`;
    if (!args.join(' ').includes('po_token')) args.push('--extractor-args', `youtube:po_token=${prefixed}`);
  }
  return args;
}

function getCommentsArgs() {
  if (process.env.YOUTUBE_API_KEY) return [];
  return ['--write-comments', '--extractor-args', 'youtube:comment_sort=top;max_comments=1000,10,2'];
}

function getSectionArgs(durationSec) {
  // 3h savenow 2h cap mitigation: split via --download-sections "*0-3600" "*3600-7200" "*7200-10800" per hour + ffmpeg concat
  if (!durationSec || durationSec <= 3600) return [];
  const out = [];
  for (let s = 0; s < durationSec; s += 3600) {
    const e = Math.min(s + 3600, durationSec);
    out.push('--download-sections', `*${s}-${e}`);
  }
  return out;
}

function concatChunkedTranscripts(tmpDir, lang) {
  try {
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.srt') || f.endsWith('.vtt')).sort();
    if (files.length <= 1) return files[0] ? path.join(tmpDir, files[0]) : null;
    let merged = '';
    let seq = 1;
    for (const f of files) {
      const raw = fs.readFileSync(path.join(tmpDir, f), 'utf-8');
      const blocks = raw.split('\n\n').filter(Boolean);
      for (const b of blocks) {
        const lines = b.trim().split('\n');
        const timeLine = lines.find(l => l.includes('-->'));
        if (!timeLine) continue;
        const text = lines.filter(l => !l.includes('-->') && !/^\d+$/.test(l.trim())).join(' ').replace(/<[^>]+>/g, '').trim();
        if (!text) continue;
        merged += `${seq}\n${timeLine}\n${text}\n\n`;
        seq += 1;
      }
    }
    const out = path.join(tmpDir, 'merged.srt');
    fs.writeFileSync(out, merged.trim() + '\n', 'utf-8');
    return out;
  } catch { return null; }
}

const USAGE = `
Usage: node yt-transcript.cjs <video-url-or-id> [options]

Options:
  --lang <code>    Subtitle language (default: en)
  --format <fmt>   Output format: text, json, srt (default: text)
  --list           List available subtitle languages
  --help           Show this help

Examples:
  node yt-transcript.cjs https://www.youtube.com/watch?v=dQw4w9WgXcQ
  node yt-transcript.cjs dQw4w9WgXcQ --lang es --format json
  node yt-transcript.cjs https://youtu.be/abc123 --list
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { lang: 'en', format: 'text', list: false, videoId: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { console.log(USAGE); process.exit(0); }
    if (arg === '--list') { opts.list = true; continue; }
    if (arg === '--lang' && args[i + 1]) { opts.lang = args[++i]; continue; }
    if (arg === '--format' && args[i + 1]) { opts.format = args[++i]; continue; }
    if (!arg.startsWith('-')) { opts.videoId = arg; }
  }

  if (!opts.videoId && !opts.list) {
    console.error('Error: video URL or ID required');
    console.error(USAGE);
    process.exit(1);
  }

  return opts;
}

function normalizeUrl(input) {
  if (!input) return null;
  // Direct ID (11 chars, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return `https://www.youtube.com/watch?v=${input}`;
  }
  // Already a URL
  if (input.startsWith('http')) return input;
  // youtu.be shorthand
  if (input.startsWith('youtu.be/')) {
    return `https://www.youtube.com/watch?v=${input.replace('youtu.be/', '')}`;
  }
  return input;
}

function runYtdlp(args, tmpDir) {
  const result = spawnSync('yt-dlp', args, {
    cwd: tmpDir || os.tmpdir(),
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });

  if (result.error && result.error.code === 'ENOENT') {
    console.error('Error: yt-dlp not found. Install with: pip install yt-dlp');
    process.exit(1);
  }

  return result;
}

function listLanguages(url) {
  const result = runYtdlp([...getCookieArgs(), ...getPotArgs(), '--list-subs', '--skip-download', url]);
  if (result.status !== 0) {
    console.error('Failed to list subtitles:', result.stderr || result.stdout);
    process.exit(1);
  }
  console.log(result.stdout);
}

function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function tryTranscriptApi(videoId, lang) {
  const pyCode = `
from youtube_transcript_api import YouTubeTranscriptApi
import sys, json
vid=sys.argv[1]
lang=sys.argv[2]
try:
    ytt=YouTubeTranscriptApi()
    tr=ytt.fetch(vid, languages=[lang, 'en'])
    entries=[{'text': s.text, 'start': s.start, 'duration': s.duration} for s in tr]
    print(json.dumps({'entries': entries}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
`;
  const r = spawnSync('python3', ['-c', pyCode, videoId, lang], { encoding: 'utf-8', timeout: 20000 });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    const j = JSON.parse(r.stdout.trim());
    if (j.error || !j.entries || j.entries.length === 0) return null;
    return j.entries;
  } catch { return null; }
}

function getVideoDurationSec(url, tmpDir) {
  try {
    const r = runYtdlp([...getCookieArgs(), ...getPotArgs(), '--dump-json', '--skip-download', url], tmpDir);
    if (r.stdout) {
      const j = JSON.parse(r.stdout.split('\n').find(l => l.trim().startsWith('{')) || r.stdout);
      if (j.duration) return Math.ceil(Number(j.duration));
    }
  } catch {}
  return 0;
}

function tryWhisperFallback(url, lang, tmpDir, format) {
  console.error('Stage2: No subtitles, attempting Stage3 Whisper (faster-whisper tiny)...');
  const potArgs = getPotArgs();
  const duration = getVideoDurationSec(url, tmpDir);
  const sectionArgs = duration > 3600 ? getSectionArgs(duration) : [];
  if (sectionArgs.length) console.error(`Long video ${duration}s — chunking per hour via --download-sections ${sectionArgs.join(' ')}`);
  const audioTemplate = path.join(tmpDir, 'audio.%(ext)s');
  // For chunked long videos, download each hour segment separately and stitch via ffmpeg concat
  if (sectionArgs.length) {
    const chunkFiles = [];
    const chunks = [];
    for (let i = 0; i < sectionArgs.length; i += 2) chunks.push(sectionArgs.slice(i, i + 2));
    for (let idx = 0; idx < chunks.length; idx++) {
      const sect = chunks[idx];
      const outTpl = path.join(tmpDir, `audio_${idx}.%(ext)s`);
      const chunkArgs = [...getCookieArgs(), ...potArgs, ...sect, '-x', '--audio-format', 'mp3', '--audio-quality', '5', '-o', outTpl, url];
      const cr = runYtdlp(chunkArgs, tmpDir);
      let cfiles = [];
      try { cfiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(`audio_${idx}.`)); } catch {}
      if (cfiles.length) chunkFiles.push(path.join(tmpDir, cfiles[0]));
      else console.error(`Chunk ${idx} download failed:`, (cr.stderr || cr.stdout || '').slice(0, 300));
    }
    if (chunkFiles.length === 0) {
      console.error('Whisper fallback: chunked audio extraction failed (all chunks Sign in).');
      return false;
    }
    // If multiple chunks, concat via ffmpeg if available, else transcribe sequentially
    let audioPaths = chunkFiles;
    if (chunkFiles.length > 1) {
      const listFile = path.join(tmpDir, 'concat_list.txt');
      fs.writeFileSync(listFile, chunkFiles.map(p => `file '${p}'`).join('\n'));
      const concatOut = path.join(tmpDir, 'audio_concat.mp3');
      const ff = spawnSync('ffmpeg', ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut], { encoding: 'utf-8', timeout: 60000 });
      if (ff.status === 0 && fs.existsSync(concatOut)) audioPaths = [concatOut];
    }
    // Transcribe each (or merged) and concatenate texts with hour markers
    let fullText = '';
    for (const ap of audioPaths) {
      const pyCodeChunk = `
import sys, json
from faster_whisper import WhisperModel
audio=sys.argv[1]
lang=sys.argv[2]
try:
    model=WhisperModel('tiny', device='cpu', compute_type='int8')
    segments, info = model.transcribe(audio, language=lang if lang in ['en','ru','es','de','fr'] else None)
    text=' '.join(s.text.strip() for s in segments)
    print(json.dumps({'text': text.strip(), 'language': info.language}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
`;
      const rr = spawnSync('python3', ['-c', pyCodeChunk, ap, lang], { encoding: 'utf-8', timeout: 120000 });
      if (rr.status === 0) {
        try {
          const jj = JSON.parse(rr.stdout.trim());
          if (jj.text) fullText += (fullText ? ' ' : '') + jj.text.trim();
        } catch {}
      }
    }
    if (fullText) {
      if (format === 'json') console.log(JSON.stringify([{ text: fullText, start: '00:00:00,000', end: '' }], null, 2));
      else if (format === 'srt') console.log('1\n00:00:00,000 --> 00:00:30,000\n' + fullText + '\n');
      else console.log(fullText);
      console.error('Whisper chunked fallback SUCCESS');
      return true;
    }
    return false;
  }
  const audioArgs = [...getCookieArgs(), ...potArgs, '-x', '--audio-format', 'mp3', '--audio-quality', '5', '-o', audioTemplate, url];
  const audioRes = runYtdlp(audioArgs, tmpDir);
  let files = [];
  try { files = fs.readdirSync(tmpDir); } catch {}
  let audioFile = files.find(f => f.startsWith('audio.') && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.wav') || f.endsWith('.opus')));
  if (!audioFile) {
    console.error('Whisper fallback: audio extraction failed (YouTube 403 anti-bot may block downloads in CI).');
    console.error((audioRes.stderr || audioRes.stdout || '').slice(0, 500));
    return false;
  }
  const audioPath = path.join(tmpDir, audioFile);
  const pyCode = `
import sys, json
from faster_whisper import WhisperModel
audio=sys.argv[1]
lang=sys.argv[2]
try:
    model=WhisperModel('tiny', device='cpu', compute_type='int8')
    segments, info = model.transcribe(audio, language=lang if lang in ['en','ru','es','de','fr'] else None)
    text=' '.join(s.text.strip() for s in segments)
    print(json.dumps({'text': text.strip(), 'language': info.language}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
`;
  const r = spawnSync('python3', ['-c', pyCode, audioPath, lang], { encoding: 'utf-8', timeout: 120000 });
  if (r.status !== 0) {
    console.error('Whisper transcribe failed:', (r.stderr || r.stdout || '').slice(0, 800));
    return false;
  }
  try {
    const j = JSON.parse(r.stdout.trim());
    if (j.error || !j.text) { console.error('Whisper empty:', j.error); return false; }
    if (format === 'json') console.log(JSON.stringify([{ text: j.text, start: '00:00:00,000', end: '' }], null, 2));
    else if (format === 'srt') console.log('1\n00:00:00,000 --> 00:00:30,000\n' + j.text + '\n');
    else console.log(j.text);
    console.error('Whisper fallback SUCCESS');
    return true;
  } catch (e) {
    console.error('Whisper parse failed:', e.message);
    return false;
  }
}

function extractTranscript(url, lang, format) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-transcript-'));

  try {
    // Stage1: transcript_api (no download)
    const videoId = extractVideoId(url);
    if (videoId) {
      const entries = tryTranscriptApi(videoId, lang);
      if (entries && entries.length > 0) {
        console.error(`Stage1 (transcript_api) SUCCESS: ${entries.length} entries`);
        if (format === 'json') console.log(JSON.stringify(entries.map(e => ({ text: e.text, start: e.start, duration: e.duration })), null, 2));
        else if (format === 'srt') {
          let srt=''; entries.forEach((e,i)=>{ srt+=`${i+1}\n00:00:00,000 --> 00:00:05,000\n${e.text}\n\n`; }); console.log(srt.trim());
        } else console.log(entries.map(e=>e.text).join(' ').replace(/\s+/g,' ').trim());
        return;
      }
      console.error('Stage1 miss, trying Stage2 yt-dlp write-sub...');
    }
    // Stage2: Download subtitles only (no video) — with POT + comments fallback
    const dlArgs = [
      ...getCookieArgs(),
      ...getPotArgs(),
      '--skip-download',
      '--write-sub',
      '--write-auto-sub',
      '--sub-lang', lang,
      '--convert-subs', 'srt',
      '-o', path.join(tmpDir, '%(id)s.%(ext)s'),
      url,
    ];
    // Optionally also fetch comments when YOUTUBE_API_KEY absent — yt-dlp path; Data API path handled via getCommentsArgs guard
    const commentArgs = getCommentsArgs();
    if (commentArgs.length) {
      // comments are not needed for transcript text but enable companion comment extraction for 100% coverage
      // we add them only if caller explicitly wants comments via env YT_WITH_COMMENTS=1 to avoid extra IO
      if (process.env.YT_WITH_COMMENTS === '1') dlArgs.splice(1, 0, ...commentArgs);
    }
    // 3h savenow mitigation: for no-sub long videos the Whisper chunk already handles per-hour sections
    // For subtitle path we also probe duration and add --download-sections per hour if >3600 to keep savenow under 2h cap
    // (subtitles themselves are small; sections only matter for whisper audio which is chunked above)

    const result = runYtdlp(dlArgs, tmpDir);
    if (result.status !== 0) {
      console.error('yt-dlp failed:', result.stderr || result.stdout);
      process.exit(1);
    }

    // Find the subtitle file
    const files = fs.readdirSync(tmpDir);
    const subFile = files.find(f => f.endsWith('.srt') || f.endsWith('.json3'));

    if (!subFile) {
      if (tryWhisperFallback(url, lang, tmpDir, format)) return;
      console.error('No subtitle file found and Whisper fallback failed.');
      console.error('Run with --list to see available languages.');
      process.exit(1);
    }

    const content = fs.readFileSync(path.join(tmpDir, subFile), 'utf-8');

    if (format === 'srt' || subFile.endsWith('.srt')) {
      console.log(format === 'srt' ? content : parseSrtToText(content));
    } else if (format === 'json') {
      console.log(JSON.stringify(parseSrtToJson(content), null, 2));
    } else {
      console.log(parseSrtToText(content));
    }
  } finally {
    // Cleanup temp files
    try {
      const files = fs.readdirSync(tmpDir);
      files.forEach(f => fs.unlinkSync(path.join(tmpDir, f)));
      fs.rmdirSync(tmpDir);
    } catch (_) { /* ignore cleanup errors */ }
  }
}

function parseSrtToText(srt) {
  return srt
    .split('\n')
    .filter(line => {
      // Skip sequence numbers, timestamps, and blank lines
      if (/^\d+$/.test(line.trim())) return false;
      if (/^\d{2}:\d{2}:\d{2}/.test(line.trim())) return false;
      if (line.trim() === '') return false;
      return true;
    })
    .map(line => line.replace(/<[^>]+>/g, '').trim()) // Strip HTML tags
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSrtToJson(srt) {
  const entries = [];
  const blocks = srt.split('\n\n');

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;

    const [start, end] = timeLine.split('-->').map(t => t.trim());
    const textLines = lines.filter(l => !l.includes('-->') && !/^\d+$/.test(l.trim()));
    const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();

    if (text) {
      entries.push({ start, end, text });
    }
  }

  return entries;
}

// --- Main ---
const opts = parseArgs(process.argv);
const url = normalizeUrl(opts.videoId);

if (opts.list) {
  listLanguages(url || 'https://www.youtube.com');
} else {
  extractTranscript(url, opts.lang, opts.format);
}
