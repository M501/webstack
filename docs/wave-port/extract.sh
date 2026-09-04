#!/bin/bash
# YouTube content extraction pipeline
# Usage: ./extract.sh <youtube_url> [output_dir]

URL="$1"
OUTPUT_DIR="${2:-/tmp/youtube-extract}"
mkdir -p "$OUTPUT_DIR"

# Reuse an existing login session when present so subtitle and audio
# fetches survive anonymous-request throttling.
COOKIE_ARGS=()
for cand in "${YT_COOKIES:-}" /tmp/youtube_cookies.txt "$HOME/.cache/youtube_cookies.txt" /root/.cache/youtube_cookies.txt; do
    if [[ -n "$cand" && -f "$cand" ]]; then
        COOKIE_ARGS=(--cookies "$cand")
        break
    fi
done

echo "=== YouTube Pipeline ==="
echo "URL: $URL"

# Step 1: Try youtube-transcript-api
echo "--- Step 1: youtube-transcript-api ---"
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
import json, sys, re
url = sys.argv[1]
video_id = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
if not video_id:
    print(json.dumps({'error': 'No video ID'}))
    sys.exit(1)
video_id = video_id.group(1)
try:
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)
    entries = [{'text': s.text, 'start': s.start, 'duration': s.duration} for s in transcript.snippets]
    print(json.dumps({'source': 'transcript-api', 'video_id': video_id, 'entries': entries}))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
" "$URL" > "$OUTPUT_DIR/transcript.json" 2>/dev/null

if [ -s "$OUTPUT_DIR/transcript.json" ] && ! grep -q '"error"' "$OUTPUT_DIR/transcript.json"; then
    echo "SUCCESS: Transcript obtained"
    cat "$OUTPUT_DIR/transcript.json" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Entries:', len(d.get('entries',[])))"
else
    echo "FAILED: No transcript, trying yt-dlp..."
    if ! command -v yt-dlp &>/dev/null; then
        pip3 install yt-dlp 2>/dev/null | tail -1
    fi
    # Subtitle-only fetch first: no media download, keeps long-video cost near zero.
    yt-dlp "${COOKIE_ARGS[@]}" --skip-download --write-sub --write-auto-sub --sub-lang "en" --convert-subs srt -o "$OUTPUT_DIR/%(id)s.%(ext)s" "$URL" 2>/dev/null
    yt-dlp "${COOKIE_ARGS[@]}" --dump-json --no-download "$URL" > "$OUTPUT_DIR/metadata.json" 2>/dev/null
    yt-dlp "${COOKIE_ARGS[@]}" --extract-audio --audio-format mp3 --audio-quality 5 -o "$OUTPUT_DIR/audio.%(ext)s" "$URL" 2>/dev/null
    if [ -f "$OUTPUT_DIR/audio.mp3" ]; then
        echo "Trying Whisper..."
        python3 -c "import whisper, json, sys; m=whisper.load_model('tiny'); r=m.transcribe(sys.argv[1]); json.dump({'source':'whisper','text':r['text']},open(sys.argv[2],'w'))" "$OUTPUT_DIR/audio.mp3" "$OUTPUT_DIR/whisper.json" 2>/dev/null || echo "Whisper not available"
    fi
fi

echo "=== Done ==="
ls -la "$OUTPUT_DIR/" 2>/dev/null
