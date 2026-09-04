---
name: youtube
description: Нативный анализ YouTube-обзоров — поиск, каналы, плейлисты и транскрипт-понимание для Deep Research
allowed-tools: [Read, Bash, Grep]
version: 1.0.0
---
# YouTube Skill — нативный обзор-анализ
Deep Research цепочка для поиска и понимания обзоров с 3-ступенчатым fallback и кэшем.
## 1. WHEN TO USE
Триггеры: `youtube`, `yt`, `видео обзор`, `транскрипт`, `канал`, `плейлист`. Использовать когда нужен поиск видео/канала/плейлиста или понимание обзора с цитатами и таймкодами.
## 2. SMART ROUTING
Детект по `youtube.com`/`youtu.be` или триггерам; выбор команды по intent. Ресурсы: [yt-transcript.cjs](../../bin/yt-transcript.cjs), [youtube-chain.md](../../docs/youtube-chain.md), [extract.sh](../../scripts/youtube-pipeline/extract.sh).
---
## 3. HOW IT WORKS
Команды: `transcript <url> --lang en --format text`, `search <query> --max 5`, `channel <handle> --videos 10`, `playlist <id>`. Фоллбэк: 1) `youtube_transcript_api` cloud без скачки → 2) `yt-dlp --write-sub` → 3) `yt-dlp --extract-audio + whisper` (не ставить локально). Кэш `.cache/youtube_transcripts/<id>.json`. Интеграция: SearXNG "обзор <продукт> youtube" → `youtube search` → `transcript` → LLM summarize с таймкодами.

### 3.1 Zero-download 3-layer stack (без скачанных байт)
- **Stage-0 — Gemini YouTube-URL batch-10 first:** watch-URL (`watch?v=` / `youtu.be/` / `shorts/`) всегда сначала в Gemini напрямую по URL, батчами до 10, public видео only, free 8ч/день. Ноль скачки, закрывает бан за скачивание.
- **Stage-1 — Supadata fallback:** если Stage-0 пуст/ошибка — Supadata transcript (100 free). Без mp3, без yt-dlp audio.
- **Stage-2 — NotebookLM шарды ≤50:** для глубокого синтеза — шарды не более 50 источников на ноутбук. Лимиты: 50/100/300/600 по тарифу. Reject: видео младше 72ч, корпус >500K слов. Шардинг обязателен для 100 видео (2+ ноутбука).
- **Правило watch-URL:** watch-URL → Stage-0 first. Скачивание mp3 — только last resort с явным warn про риск бана.
```bash
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang ru --format text
youtube search "Muse ultra review" --max 5
youtube transcript https://youtu.be/abc123 --lang en --format json
```
---
## 4. RULES
### ALWAYS
- Валидировать videoId `^[A-Za-z0-9_-]{11}$` иначе INVALID_VIDEO_ID.
- Кэшировать atomic write и реюзать без сети; при cloud 403 fallback к TranscriptAPI.
- Использовать куки если доступны: `yt-transcript.cjs` автоматически подхватывает `--cookies` из `/tmp/youtube_cookies.txt` / `.opencode/cookies/youtube_cookies.txt` / `/root/.cache/youtube_cookies.txt` (см. §5).
### NEVER
- Не скачивать видео целиком, не ставить whisper/TranscriptAPI npm без запроса; не коммитить .cache.
- Не коммитить куки — `.opencode/cookies/.gitignore` содержит `*`.
- Не скачивать mp3 раньше Stage-0/1/2: watch-URL → Stage-0 Gemini first; mp3 только как last resort с warn про бан за скачивание.
### ESCALATE IF
- Нет субтитров и whisper недоступен — вернуть no_transcript с описанием.
---
## 5. Cookies persistence
Куки `workyworkoff@gmail.com` сохранены в 3 места (чтобы новая сессия не потеряла):
1) `.opencode/cookies/youtube_cookies.txt` — в репо, переживает рестарт сессии (chmod 600, `.gitignore` `*`)
2) `C:\Users\M25\Desktop\youtube_cookies.txt` (существует) + `C:\AI\cookies\youtube_cookies.txt` (создана папка) — Windows persistence
3) `/root/.cache/youtube_cookies.txt` + `/tmp/youtube_cookies.txt` — fallback WSL (chmod 600)

Проверка: `ls -lh .opencode/cookies/youtube_cookies.txt /root/.cache/youtube_cookies.txt /tmp/youtube_cookies.txt` (все 3.0K 26 lines)

Авто-рефреш:
```powershell
# PowerShell (Windows)
powershell -ExecutionPolicy Bypass -File .opencode/scripts/refresh-youtube-cookies.ps1 --check   # проверка expires + yt-dlp list-subs 3eykcScdqJM
powershell -ExecutionPolicy Bypass -File .opencode/scripts/refresh-youtube-cookies.ps1           # рефреш: browser_cookie3 -> yt-dlp cookies-from-browser -> manual reminder
```
```bash
# Bash WSL wrapper
bash .opencode/scripts/refresh-youtube-cookies.sh --check
bash .opencode/scripts/refresh-youtube-cookies.sh        # то же, пробует 3 метода
```
Логика рефреша: копирует `Cookies` DB в `TEMP/cookies_copy.db`, пробует `browser_cookie3.chrome(domain_name='youtube.com')` → Netscape; если `Unable to get key` (Chrome v20 App-Bound) → fallback `yt-dlp --cookies-from-browser chrome --cookies $out --list-subs`; если оба fail → `manual export needed: chrome://extensions → Get cookies.txt LOCALLY → Export`

Интеграция в веб-стак: `yt-transcript.cjs` вызывает `getCookieArgs()` и добавляет `--cookies <path>` ко всем `yt-dlp` вызовам (`--list-subs`, `--write-sub`, `--extract-audio`). При 403 fallback цепочка остаётся: `transcript_api` → `yt-dlp --write-sub --cookies` → `whisper`. Ручная проверка: `yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs https://youtu.be/3eykcScdqJM`
---
## 6. REFERENCES
- [yt-transcript.cjs](../../bin/yt-transcript.cjs) — primary --help совместим
- [youtube-chain.md](../../docs/youtube-chain.md) — Deep Research цепочка
- [extract.sh](../../scripts/youtube-pipeline/extract.sh) — 3-ступенчатый pipeline
- Внешний: [YouTube Data API](https://developers.google.com/youtube/v3)
---
## 7. SUCCESS CRITERIA
search ≥5 видео, transcript >100 символов, кэш hit <500мс, суммаризация 5-8 тезисов с таймкодами.
---
## 8. INTEGRATION POINTS
Интеграция с search-router YouTube Chain и deep-research sourceType youtube; проверка `node .opencode/bin/yt-transcript.cjs --help` жив. Куки: `yt-transcript.cjs:getCookieArgs()` → `--cookies` (3 места, см. §5).
---
## 9. REFERENCES AND RELATED RESOURCES
Связан: `search-router` (YouTube Chain), `deep-research` (sourceType youtube), `taste` (enhance_query), `agent-reach`.
