---
title: YouTube Chain — Deep Research цепочка для обзоров
description: Как Deep Research находит YouTube-обзоры, понимает их через транскрипт и суммаризирует с таймкодами; 3-ступенчатый fallback и обработка cloud 403.
---

# YouTube Chain — Deep Research цепочка для обзоров

Deep Research сам находит обзоры на YouTube, понимает их содержание через транскрипт и возвращает сжатое понимание с цитатами и таймкодами — гибрид поиска и понимания, без ручных шагов.

> Связан: [search-router SKILL.md](../skills/search-router/SKILL.md) (YouTube Chain + Multifaceted секция), [youtube SKILL.md](../skills/youtube/SKILL.md), [yt-transcript.cjs](../bin/yt-transcript.cjs), [extract.sh](../scripts/youtube-pipeline/extract.sh), [multifaceted-search.md](./multifaceted-search.md).

> **SearXNG health (TASK1 fix, host mode, bing/mojeek disabled:false):** `curl http://localhost:8080/healthz` → OK, `curl "http://localhost:8080/search?q=test&format=json" | jq '.results|length'` → 31 (было 0/DOWN). YouTube ветка — часть [multifaceted 5 веток](./multifaceted-search.md) (ветка 3: SearXNG videos 20-93 + yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json → transcript_api → distil-large-v3 VRAM 756M).

> **HARD RULE — YouTube watch-URL → yt-transcript only:** `watch?v=` / `youtu.be/` / `shorts/` → `node .opencode/bin/yt-transcript.cjs --format text` (Stage1 transcript_api → Stage2 write-sub → Stage3 tiny). `crawl4ai_extract` для watch-URL ЗАПРЕЩЁН (JS/bot-wall → empty/NaN). POT/BGUTIL `:4416` — explicitly OPTIONAL (fail-soft, цепь даёт 1239 entries без него). SearXNG только `:8080`. /tmp эфемерен — пруфы хранить в `.opencode/specs/055-*/research/` или `.opencode/docs/`, не в `/tmp`.

## 1. Deep Research цепочка (4 шага, без ручных шагов)

**Шаг 1 — SearXNG поиск кандидатов:**
```bash
# первичный поиск обзоров (generic web, без YouTube API квот)
searxng_search query="обзор Muse ultra youtube" --limit 5
# альтернатива: site:youtube.com
searxng_search query="site:youtube.com Muse ultra обзор" --limit 5
```

**Шаг 2 — YouTube search (уточнение):**
```bash
# thin wrapper (future) — сейчас SearXNG site:youtube.com
youtube search "Muse ultra review" --max 5
# будущие команды:
youtube channel @MKBHD --videos 10
youtube playlist PLxxxxxxxx --max 20
```

**Шаг 3 — Транскрипт (3-ступенчатый fallback):**
```bash
# primary — сейчас:
node .opencode/bin/yt-transcript.cjs https://youtu.be/dQw4w9WgXcQ --lang ru --format text
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format json  # с таймкодами
# fallback цепочка (автоматически в extract.sh):
# 1) youtube_transcript_api (cloud-friendly, без скачки)
# 2) yt-dlp --write-sub --write-auto-sub --sub-lang en --skip-download
# 3) yt-dlp --extract-audio + whisper base (не ставить локально)
```

**Шаг 4 — LLM суммаризация с timestamp цитатами:**
```bash
# transcript.json → LLM summarize (та же модель агента, без отдельного сервиса)
# Вход: entries [{start,end,text}], выход: тезисы + плюсы/минусы + цитаты
```

---

## 2. Команды и кэш

| Команда | Сейчас | Future (без npm) |
|---------|--------|------------------|
| `transcript <url> --lang en --format text` | `node .opencode/bin/yt-transcript.cjs <id> --lang en --format text` | `youtube transcript <url> --lang en` |
| `search <query> --max 5` | SearXNG `site:youtube.com` | `youtube search "<query>" --max 5` |
| `channel <handle> --videos 10` | SearXNG | `youtube channel <handle> --videos 10` |
| `playlist <id>` | SearXNG | `youtube playlist <id>` |

- Валидация `videoId` по `^[A-Za-z0-9_-]{11}$` иначе `INVALID_VIDEO_ID`.
- Кэш `.cache/youtube_transcripts/<id>.json` atomic write (tmp → rename), hit <500мс, повторный вызов без сети.
- Форматы: `text` — сплошной текст, `json` — с `start/end/text`, `srt` — сырые субтитры.

---

## 3. Промпты для понимания обзора

**Промпт 1 — сжатое понимание с таймкодами:**
```
Ты — аналитик YouTube-обзоров. По транскрипту сделай:
- 5-8 ключевых тезисов (что сказал автор)
- плюсы / минусы (отдельно)
- лучшие цитаты с таймкодами [mm:ss]
- вердикт автора (рекомендует / нет)
Транскрипт: {{transcript_text}}
Формат: markdown с секциями ## Тезисы ## Плюсы/Минусы ## Цитаты ## Вердикт
```

**Промпт 2 — сравнение нескольких обзоров:**
```
Сравни 3 транскрипта обзоров продукта X. Выдели:
- сходится у всех (консенсус)
- противоречит
- уникальные находки каждого
Транскрипты: {{t1}} {{t2}} {{t3}}
```

**Промпт 3 — извлечение таймкодов:**
```
Извлеки из транскрипта с таймкодами структуру видео:
- главы по темам с [start - end]
- где автор говорит о цене/батарее/камере
```

**Проверка точности:** на 5 видео >5 мин точность ключевых тезисов ≥80% при ручной проверке (SC-002 из spec.md:5).

---

## 4. Cloud 403 и fallback к TranscriptAPI

**Симптом:** `yt-dlp` в cloud (Vercel/Cloud Run) возвращает `403 Forbidden` или `Sign in to confirm you’re not a bot`, `yt-transcript.cjs` падает с `yt-dlp failed`.

**Причина:** YouTube банит IP дата-центров; Innertube требует обхода.

**Решение — автоматический 3-ступенчатый fallback (см. extract.sh:13-47):**
1. `youtube_transcript_api` (Python) — cloud-friendly, без скачки видео, обходит 403 через Innertube API
   ```python
   from youtube_transcript_api import YouTubeTranscriptApi
   ytt_api = YouTubeTranscriptApi()
   transcript = ytt_api.fetch(video_id)  # video_id 11 символов
   ```
2. `yt-dlp --write-sub --skip-download` — если TranscriptAPI нет/пусто
3. `yt-dlp --extract-audio + whisper base` — только если первые два вернули `no_transcript`; whisper локально не ставить (EXCLUDES)

**Ручной тест fallback:**
```bash
# 1) TranscriptAPI
python3 -c "from youtube_transcript_api import YouTubeTranscriptApi; print(YouTubeTranscriptApi().fetch('dQw4w9WgXcQ'))" 2>&1 | head
# 2) yt-dlp subs
yt-dlp --list-subs --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | head -n 20
# 3) yt-transcript.cjs primary
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text 2>&1 | head -c 500
```

**Когда fallback не помогает:** видео без субтитров → вернуть `no_transcript` + fallback к описанию/комментариям (если доступны) + флаг `no_transcript` (spec.md:186).

---

## 4b. Zero-download 3-layer stack (Gemini → Supadata → NotebookLM)

Ноль скачанных байт — закрывает бан за скачивание. Порядок строгий:

- **Stage-0 — Gemini YouTube-URL batch-10:** watch-URL (`watch?v=` / `youtu.be/` / `shorts/`) → Gemini напрямую по URL, батч до 10 за вызов, public only, free 8ч/день. Первый шаг для любого watch-URL.
- **Stage-1 — Supadata:** если Stage-0 пуст/ошибка → Supadata transcript (100 free). Без mp3 и без audio-скачки.
- **Stage-2 — NotebookLM синтез шардами ≤50:** шард не более 50 источников. Лимиты тарифа: 50/100/300/600. Reject: видео младше 72ч, корпус >500K слов.
- **Шардинг для 100 видео:** 100 видео = минимум 2 шарда по 50 (или 4 по 25 для стабильности). Каждый шард → отдельный ноутбук → сводный синтез.
- **<72ч fallback:** свежее видео (<72ч) NotebookLM отклонит → оставить на Stage-0/1 (Gemini summary + Supadata transcript), повторить Stage-2 после 72ч.
- **mp3 last resort:** скачивание mp3/audio только если все три слоя пустые, с явным warn про риск бана.

---

## 5. Cookies persistence + auto-refresh

Куки `workyworkoff@gmail.com` делают `yt-dlp` work в cloud/403 и сохраняются в 3 места чтобы новая сессия не потеряла доступ.

**3 места:**
1) `.opencode/cookies/youtube_cookies.txt` — в репо, переживает рестарт сессии (chmod 600, `.gitignore` `*` → `!.gitignore`)
2) `C:\Users\M25\Desktop\youtube_cookies.txt` + `C:\AI\cookies\youtube_cookies.txt` — Windows persistence (папка `C:\AI\cookies` создаётся скриптом)
3) `/root/.cache/youtube_cookies.txt` + `/tmp/youtube_cookies.txt` — fallback WSL/Linux

Проверка: `ls -lh .opencode/cookies/youtube_cookies.txt /root/.cache/youtube_cookies.txt /tmp/youtube_cookies.txt /mnt/c/AI/cookies/youtube_cookies.txt /mnt/c/Users/M25/Desktop/youtube_cookies.txt` — все 3.0K 26 lines, chmod 600 в WSL.

**Авто-рефреш скрипты:**
- `.opencode/scripts/refresh-youtube-cookies.ps1` — PowerShell primary (Windows)
- `.opencode/scripts/refresh-youtube-cookies.sh` — bash wrapper (WSL/Linux)

```powershell
# проверка (expires <7 дней warn + yt-dlp list-subs 3eykcScdqJM)
powershell -ExecutionPolicy Bypass -File .opencode/scripts/refresh-youtube-cookies.ps1 --check
bash .opencode/scripts/refresh-youtube-cookies.sh --check
# рефреш
powershell -ExecutionPolicy Bypass -File .opencode/scripts/refresh-youtube-cookies.ps1
bash .opencode/scripts/refresh-youtube-cookies.sh
```

**Логика рефреша (minimal viable, Chrome v20 App-Bound):**
1. Копирует `"$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Network\Cookies"` → `"$env:TEMP\cookies_copy.db"` `-Force` (обход lock)
2. Пробует `python -c "import browser_cookie3; cj=browser_cookie3.chrome(domain_name='youtube.com')"` → Netscape `youtube_cookies.txt`
3. Если `Unable to get key` / fail → `yt-dlp --cookies-from-browser chrome --cookies $out --list-subs https://youtu.be/3eykcScdqJM` (требует закрытый Chrome)
4. Если оба fail → `manual export needed: chrome://extensions → Get cookies.txt LOCALLY → Export youtube.com`

**Интеграция в веб-стак:**
- `yt-transcript.cjs:getCookieArgs()` автоматически добавляет `--cookies <path>` ко всем `yt-dlp` вызовам (`--list-subs`, `--write-sub`, `--extract-audio`). Приоритет: `$YT_COOKIES` → `/tmp` → `.opencode/cookies` → `/root/.cache`.
- `extract.sh` также использует `yt-dlp --cookies` если файл найден.
- Ручная проверка: `yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs --skip-download https://youtu.be/3eykcScdqJM`
- Проверка expires: скрипт парсит столбец 5 Netscape (epoch), warn если `<7 дней`, выводит `minExpires` + `days left`.

---

## 6. Комментарии (YouTube / Bilibili / XHS)

YOUTUBE_API_KEY guard как REDDIT_CLIENT_ID: если ключ есть — Data API, иначе yt-dlp --write-comments если cookies+JS runtime есть, иначе no_comments.

**YouTube Data API (canonical, 1 quota per page):**
- Guard: `if [ -n "$YOUTUBE_API_KEY" ]` → `GET https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=ID&maxResults=100&order=relevance&textFormat=plainText&key=$YOUTUBE_API_KEY` — 1 quota, maxResults 1..100 default 20, plainText, nextPageToken pagination, parentId через `comments.list` для replies 1 quota.
- Pre-check guard только в конце цепочки: `GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id=ID&key=$YOUTUBE_API_KEY` → `statistics.commentCount` 1 quota; если 0 или `commentsDisabled` 403 → сразу `no_comments`.
- Пагинация: `nextPageToken` до исчерпания, порядок `relevance|time`, textFormat `plainText` для чистого текста без HTML.
- Ошибки → `no_comments` с причиной: `LOGIN_REQUIRED|commentsDisabled|quotaExceeded|apiKeyMissing` (не пустой `comments:[]`, а флаг `no_comments:true`).

Guard цепочка точно как в iteration 007: `if YOUTUBE_API_KEY → commentThreads plainText 100 nextPageToken + commentCount guard end-only → else if cookies 16 lines + PO 116 mweb.gvs+ + residential 8181 → yt-dlp --write-comments --extractor-args youtube:comment_sort=top;max_comments=1000,10,2 --dump-json → else no_comments reason=LOGIN_REQUIRED|commentsDisabled|quotaExceeded|apiKeyMissing`.

Fallback yt-dlp (когда ключа нет но куки есть):
```bash
yt-dlp --proxy http://scrapeops:KEY@residential-proxy.scrapeops.io:8181 \
  --extractor-args youtubepot:bgutilhttp:base_url=http://127.0.0.1:4416 \
  --extractor-args youtube:player-client=mweb \
  --js-runtimes node --write-comments \
  --extractor-args youtube:comment_sort=top;max_comments=1000,10,2 \
  --dump-json https://youtu.be/ID | jq .comments
```
Без ключа и без куков → `no_comments:true reason=LOGIN_REQUIRED|commentsDisabled|quotaExceeded|apiKeyMissing`.

**Bilibili:** `api.bilibili.com/x/v2/reply 405 without WBI → need w_rid/wts via x/web-interface/nav img_key/sub_key` — через `agent-reach bilibili_search/bilibili_fetch` (см. agent-reach SKILL).

**XHS:** `agent-reach xhs_search/xhs_fetch + browser-use fallback tamnd/xiaohongshu-cli unofficial a1/web_session x-s sign`.

Верификация комментариев:
```bash
# Data API guard
[ -n "$YOUTUBE_API_KEY" ] && curl "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=dQw4w9WgXcQ&maxResults=10&textFormat=plainText&key=$YOUTUBE_API_KEY" | jq .items
# commentCount guard
curl "https://www.googleapis.com/youtube/v3/videos?part=statistics&id=dQw4w9WgXcQ&key=$YOUTUBE_API_KEY" | jq .items[0].statistics.commentCount
# yt-dlp fallback
yt-dlp --write-comments --extractor-args youtube:comment_sort=top --dump-json https://youtu.be/dQw4w9WgXcQ | jq .comments
grep -c comment .opencode/docs/youtube-chain.md  # >0
```

---

## 7. Верификация Deep Research

```bash
# 1) yt-transcript жив (не ломай)
node .opencode/bin/yt-transcript.cjs --help

# 2) search-router знает YouTube Chain
grep -n "YouTube Chain" .opencode/skills/search-router/SKILL.md
grep -n "3-ступенчатый" .opencode/skills/search-router/SKILL.md

# 3) youtube skill загружается
cat .opencode/skills/youtube/SKILL.md | head -n 20
python3 .opencode/skills/sk-doc/scripts/package_skill.py .opencode/skills/youtube --check

# 4) extract.sh pipeline
bash .opencode/scripts/youtube-pipeline/extract.sh https://youtu.be/dQw4w9WgXcQ /tmp/youtube-extract 2>&1 | tail -n 20

# 5) cookies persistence
ls -lh .opencode/cookies/youtube_cookies.txt /root/.cache/youtube_cookies.txt /tmp/youtube_cookies.txt
bash .opencode/scripts/refresh-youtube-cookies.sh --check
yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs --skip-download https://youtu.be/3eykcScdqJM 2>&1 | head -n 20

# 6) spec пакет валиден
bash .opencode/skills/system-spec-kit/scripts/spec/validate.sh .opencode/specs/055-agent-reach-youtube-taste --strict
```

---

## 8. Troubleshooting

| Что видишь | Почему | Фикс |
|------------|--------|------|
| `yt-dlp failed: 403` | Cloud IP бан | Fallback к `youtube_transcript_api` (см. §4) |
| `INVALID_VIDEO_ID` | Невалидный ID | Проверка `^[A-Za-z0-9_-]{11}$`, подсказка формата |
| `No subtitle file found` | Нет субтитров на языке | Попробовать `--lang ru` или `--list` для доступных языков |
| `No transcript` + `no_transcript` флаг | Видео без субтитров | Использовать описание + комментарии как fallback |
| `yt-dlp not found` | Не установлен | `pip install yt-dlp` (не коммитить) |
| Кэш повреждён | Частичная запись | Удалить битый файл, перекачать, atomic write |

---

## 9. Ссылки

- `.opencode/bin/yt-transcript.cjs:getCookieArgs` — cookie-aware yt-dlp wrapper
- `.opencode/scripts/refresh-youtube-cookies.ps1` + `.sh` — auto-refresh 3 метода
- `.opencode/cookies/youtube_cookies.txt` + `/root/.cache` + `/tmp` + `C:\AI\cookies` — 3 места
- `.opencode/skills/search-router/SKILL.md` — YouTube Chain секция (3-ступенчатый fallback)
- `.opencode/skills/youtube/SKILL.md:5` — Cookies persistence секция
- `.opencode/scripts/youtube-pipeline/extract.sh` — 3-ступенчатый pipeline
- [YouTube Data API](https://developers.google.com/youtube/v3) — future search/channel/playlist (квота 100/день)
- Spec: `.opencode/specs/055-agent-reach-youtube-taste/spec.md:4` REQ-004, `plan.md:3` YouTube Chain
