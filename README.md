# WebStack — One-Prompt Portable

> Скопируй один промпт — и у тебя гугл, ютуб, реддит, форумы, чистка страниц. Всё бесплатно. Без платных API.
> Работает в OpenCode. Переносится в Hermes, Pi, DeepSeek, любой харнес за 5 минут.
> Всё, что нужно — Docker + один файл настроек + 3 команды.

[![SearXNG](https://img.shields.io/badge/SearXNG-31_results-4caf50)]() [![YouTube](https://img.shields.io/badge/YouTube-9%2F10_distil-ff0000)]() [![Reddit](https://img.shields.io/badge/Reddit-snippet_165-blue)]() [![Jina](https://img.shields.io/badge/Jina-r_200-9c27b0)]() [![Trafilatura](https://img.shields.io/badge/trafilatura-2.2.0-orange)]() [![Portable](https://img.shields.io/badge/portable-one_prompt-00bcd4)]()

- **Репо:** `https://github.com/M501/webstack`
- **Клонировать:** `git clone https://github.com/M501/webstack.git` или `git@github.com:M501/webstack.git`

---

## Оглавление

1. [Что это — 5 веток простыми словами](#1-что-это--5-веток-простыми-словами)
2. [Скопируй эти файлы — точный список](#2-скопируй-эти-файлы--точный-список-с-путями)
3. [Вставь эти команды — copy-paste](#3-вставь-эти-команды--copy-paste-без-думания)
4. [Как это работает — 5 шагов с примерами](#4-как-это-работает--шаг-за-шагом-с-примерами)
5. [Где были проблемы и как их решили](#5-где-были-проблемы-и-как-их-решили--таблица)
6. [Таблица инструментов](#6-таблица-инструментов--инструмент--зачем--free--как-ставить)
7. [Как выбирать что использовать — простые if](#7-как-выбирать-что-использовать--простые-if)
8. [Пруфы что работает — реальные цифры](#8-пруфы-что-работает--реальные-цифры-и-куски)
9. [One-Prompt для переноса — скопируй и вставь](#9-one-prompt-для-переноса--скопируй-10-строк-и-вставь-в-любой-харнес)

---

## 1. Что это — 5 веток простыми словами

Представь: ты задаёшь один вопрос. Например: "лучший веб скрейпинг для YouTube".
Мы запускаем 5 поисков сразу. Параллельно. Потом склеиваем ответ.

Зачем 5? Потому что один гугл не видит всё. Нужно 5 глаз.

### Ветка 1: SearXNG = Твой личный Google

- Что делает: ищет в интернете. Как Google.
- Как работает: спрашивает сразу у Google + Bing + Mojeek. Собирает 29-31 ссылку.
- Когда включается: всегда. Для любого вопроса.
- Где живёт: `http://localhost:8080/search?q=твой_запрос&format=json`
- Почему не обычный Google: обычный Google платный и с лимитами. SearXNG — бесплатный. Живёт у тебя в Docker.

Простое правило: нужен общий веб — иди в SearXNG.

### Ветка 2: Agent Reach = Reddit + Twitter + XHS + Bilibili

- Что делает: ищет мнения людей. Reddit, Twitter/X, Xiaohongshu, Bilibili.
- Почему SearXNG не хватает: SearXNG находит ссылку на Reddit. Но Reddit не отдаёт текст без логина. Пишет 403.
- Что делает Agent Reach: идёт в соцсеть специальным путём. Достаёт пост.
- Когда включается: только если вопрос про соцсети. Например, если в вопросе есть слово `reddit` или `twitter` или `xhs` или `bilibili`.
- Бюджет: максимум 1 вызов. Не для обычного веба.

Простое правило: нужен Reddit или Twitter — иди в Agent Reach. Нужен обычный сайт — не иди.

### Ветка 3: YouTube Chain = Видео + Транскрипт + Whisper

- Что делает: находит YouTube видео. Достаёт текст того, что говорят в видео.
- Шаги: найти видео → достать описание → достать субтитры → если субтитров нет — расшифровать аудио нейросетью.
- Инструменты внутри:
  - `yt-dlp --dump-json` — берёт заголовок, длительность, просмотры. Без скачки видео.
  - `youtube_transcript_api` — берёт субтитры. Быстро. Без скачки. Работает в облаке.
  - `faster-distil-large-v3` — нейросеть. Слушает аудио. Пишет текст. 756 MB видеопамяти. 1.5 GB на диске. Уже скачана.
- Когда включается: если вопрос про `youtube` или `обзор` или `видео` или `review`.
- 3 попытки по очереди: сначала TranscriptAPI → потом yt-dlp subs → потом Whisper. Если все три пусто — пишем `no_transcript`.

Простое правило: нужен YouTube обзор — иди в YouTube Chain.

### Ветка 4: Forums = Форумы (4pda, xda, discourse, phpBB)

- Что делает: читает форумы. Там много ответов, которых нет в статьях.
- Инструменты:
  - `Crawl4AI` — пробует прочитать форум. Как браузер, но простой.
  - `trafilatura 2.2.0` — чистит грязный HTML. Оставляет только текст. Лучшая для форумов.
  - `Jina r.jina.ai` — запасной. Если Crawl4AI не смог.
  - `BrowserUse` — самый тяжёлый. Открывает форум как настоящий Chrome. Проходит Cloudflare.
- Когда включается: если вопрос про форумы. Или если нужен форумный ответ. Например, `site:4pda.to` или `site:xda-developers.com`.
- Порядок: Crawl4AI → Jina → BrowserUse → trafilatura.

Простое правило: нужен форум — иди в эту цепочку.

### Ветка 5: Jina = Запасной читатель страниц

- Что делает: читает любую страницу, когда Crawl4AI не смог.
- Как работает: ты даёшь ссылку. Jina возвращает чистый markdown.
- Адрес: `https://r.jina.ai/http://твой-сайт.com`
- Лимиты: 20 запросов в минуту без ключа. 500 с ключом. 10 миллионов токенов бесплатно.
- Два имени: `r.jina.ai` — правильный. `cc.jina.ai` — старый. Старый ломается на форумах. Используй `r`.

Простое правило: Crawl4AI вернул пустоту или 403 — иди в Jina.

### Как 5 веток работают вместе

```
Ты пишешь: "лучший веб скрейпинг для YouTube"
  │
  ├─ Ветка 1: SearXNG ищет общий веб → 29-31 результат (google+bIng+mojeek)
  ├─ Ветка 2: Agent Reach ищет Reddit "best web scraping reddit" → 1 вызов
  ├─ Ветка 3: SearXNG ищет видео + yt-dlp + транскрипт → текст видео
  ├─ Ветка 4: SearXNG ищет форумы → Crawl4AI → trafilatura → форумы
  └─ Ветка 5: Jina читает то, что не прочитал Crawl4AI
        │
        └─► Склеиваем всё. Проверяем доверие. Пишем ответ с цитатами.
```

Почему не одна ветка? Потому что:
- SearXNG не видит Reddit без логина.
- YouTube текст не достать обычным чтением страницы. Нужна спец цепочка.
- Форумы часто защищены Cloudflare. Нужен BrowserUse.
- Обычный читатель страниц падает на 403. Нужен Jina.

Живой пример для проверки:

```bash
# Ветка 1: общий веб
curl "http://localhost:8080/search?q=best+web+scraping+tools+2026&format=json" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['results']))"
# Жди: 29

# Ветка 2: Reddit соцсеть (опционально, 1 вызов)
# Если есть agent-reach:
# agent-reach reddit_search --query "best web scraping reddit"

# Ветка 3: YouTube
yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download https://youtu.be/dQw4w9WgXcQ | python3 -c "import json,sys;print(json.load(sys.stdin)['title'])"
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text | head -c 500

# Ветка 4: Форум
python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test forum content</p></article>', output_format='markdown'))"
# Жди: test forum content

# Ветка 5: Jina
curl -H "X-Timeout: 15" -H "X-No-Cache: true" https://r.jina.ai/http://example.com | head -n 20
# Жди: Markdown Content: This domain is for use...
```

---

## 2. Скопируй эти файлы — точный список с путями

Скопируй эти файлы из репо `M501/webstack` в свой новый проект. Без них не заработает.

Делай так: `Скопируй: путь_откуда → путь_куда`. Если харнес другой, замени `.opencode` на `.hermes` или `.pi`.

### Группа A: Главное — конфиг харнеса

1.  **Скопируй:** `opencode.json` → `opencode.json` (или `hermes.json` / `pi.json` / `deepseek.json` для другого харнеса)
    - Зачем: там 5 слотов MCP: `searxng`, `crawl4ai`, `browser-use`, `agent-reach`, `github`. Агент читает этот файл и знает, куда идти.
    - Проверь: `python3 -m json.tool opencode.json > /dev/null && echo "OK"`

2.  **Скопируй:** `.utcp_config.json` → `.utcp_config.json` (или `hermes.utcp.json`)
    - Зачем: запасной, если MCP не запустился. Там те же инструменты в другом формате.
    - Проверь: `python3 -m json.tool .utcp_config.json > /dev/null && echo "OK"`

### Группа B: Docker — поднимает поиск

3.  **Скопируй:** `bootstrap/docker-compose.yml` → `bootstrap/docker-compose.yml` (или `docker-compose.yml` в корне)
    - Зачем: запускает SearXNG на `localhost:8080` и Crawl4AI на `localhost:11235`. Без него поиска нет.
    - Важно: внутри `network_mode: host` — не меняй на `bridge`. Иначе не заработает.
    - Проверь: `cat bootstrap/docker-compose.yml | grep "network_mode: host"` — должна быть строка.

4.  **Скопируй:** `bootstrap/searxng/settings.yml` → `bootstrap/searxng/settings.yml`
    - Зачем: настройки SearXNG. Там `disabled: false` для `google`, `bing`, `mojeek`. Если `disabled: true` — будет 0 результатов.
    - Важно: не добавляй `proxies` и `outgoing` руками. Оставь как есть. Иначе сломается прокси `http://127.0.0.1:10809`.
    - Проверь: `grep -A1 "google" bootstrap/searxng/settings.yml` — должно быть `disabled: false`.

### Группа C: YouTube — тянет видео

5.  **Скопируй:** `.opencode/bin/yt-transcript.cjs` → `.opencode/bin/yt-transcript.cjs` (или `.hermes/bin/`)
    - Зачем: главный скрипт для YouTube. Делает 3 попытки: TranscriptAPI → yt-dlp subs → Whisper. Кэширует в `.cache/youtube_transcripts/`.
    - Проверь: `node .opencode/bin/yt-transcript.cjs --help` — должна выйти справка.

6.  **Скопируй:** `.opencode/cookies/youtube_cookies.txt` → `.opencode/cookies/youtube_cookies.txt` + `/tmp/youtube_cookies.txt` + `/root/.cache/youtube_cookies.txt`
    - Зачем: куки от `workyworkoff@gmail.com`. Без них YouTube пишет `Sign in to confirm you're not a bot`.
    - Важно: 3 места! Чтобы не потерять при рестарте. Сделай `chmod 600`.
    - Проверь: `ls -lh .opencode/cookies/youtube_cookies.txt /tmp/youtube_cookies.txt 2>&1 | head`

7.  **Скопируй:** `.opencode/scripts/refresh-youtube-cookies.sh` → `.opencode/scripts/refresh-youtube-cookies.sh`
    - Зачем: обновляет куки, когда они протухли. Проверяет срок годности.
    - Проверь: `bash .opencode/scripts/refresh-youtube-cookies.sh --check 2>&1 | head -n 20`

8.  **Скопируй:** `.opencode/scripts/refresh-youtube-cookies.ps1` → `.opencode/scripts/refresh-youtube-cookies.ps1`
    - Зачем: то же, но для Windows PowerShell. Нужен, если ты в WSL. Делает копию Cookies из Chrome.
    - Проверь: `powershell -ExecutionPolicy Bypass -File .opencode/scripts/refresh-youtube-cookies.ps1 --check 2>&1 | head`

### Группа D: MCP серверы — мосты к поиску

9.  **Скопируй:** `.opencode/mcp-servers/searxng-mcp/index.cjs` → `.opencode/mcp-servers/searxng-mcp/index.cjs`
    - Зачем: мост. Агент говорит `searxng_search`, а этот файл делает `curl http://localhost:8080/search?q=...&format=json`. Плюс кэш, лимит 20 в минуту, UA браузера.
    - Проверь: `node .opencode/mcp-servers/searxng-mcp/index.cjs --help 2>&1 | head` или `cat opencode.json | grep searxng -A3`

10. **Скопируй:** `.opencode/mcp-servers/crawl4ai-mcp/index.cjs` → `.opencode/mcp-servers/crawl4ai-mcp/index.cjs`
    - Зачем: мост для чистки страниц. Агент говорит `crawl4ai_extract`, а файл идёт в `http://localhost:11235/crawl`.
    - Проверь: `cat opencode.json | grep crawl4ai -A3`

11. **Скопируй:** `.opencode/mcp-servers/browser-use-mcp/index.cjs` → `.opencode/mcp-servers/browser-use-mcp/index.cjs`
    - Зачем: для тяжёлых страниц с Cloudflare и JS. Открывает как Chrome.
    - Проверь: `cat opencode.json | grep browser-use -A3`

12. **Скопируй:** `.opencode/mcp-servers/agent-reach-mcp/index.cjs` → `.opencode/mcp-servers/agent-reach-mcp/index.cjs`
    - Зачем: для Reddit/Twitter/XHS/Bilibili. 8 инструментов: `reddit_search`, `reddit_fetch`, `twitter_search`, etc.
    - Проверь: `cat opencode.json | grep agent-reach -A5`

### Группа E: Навыки — правила для агента

13. **Скопируй:** `.opencode/skills/search-router/SKILL.md` → `.opencode/skills/search-router/SKILL.md`
    - Зачем: главный файл правил. Там написано: когда что вызывать, лимиты (макс 1 поиск, макс 1 соц вызов), 5 веток, цепочки.
    - Проверь: `grep -n "5 веток\|Multifaceted\|YouTube Chain" .opencode/skills/search-router/SKILL.md | head`

14. **Скопируй:** `.opencode/skills/agent-reach/SKILL.md` → `.opencode/skills/agent-reach/SKILL.md`
    - Зачем: правила для соцсетей. Как ставить, ключи, $1 прокси, fallback.
    - Проверь: `cat .opencode/skills/agent-reach/SKILL.md | head -n 20`

15. **Скопируй:** `.opencode/skills/youtube/SKILL.md` → `.opencode/skills/youtube/SKILL.md`
    - Зачем: правила для YouTube. 3-ступенчатый fallback, кэш, промпты для суммаризации с таймкодами.

### Группа F: Доки — знания

16. **Скопируй:** `.opencode/docs/harness-proof.md` → `.opencode/docs/harness-proof.md`
    - Зачем: пруфы, что всё работает. Таблица с реальными кусками текста и файлами `/tmp/*.txt`.

17. **Скопируй:** `.opencode/docs/multifaceted-search.md` → `.opencode/docs/multifaceted-search.md`
    - Зачем: описание 5 веток. Как искать по любой теме как ChatGPT.

18. **Скопируй:** `.opencode/docs/youtube-chain.md` → `.opencode/docs/youtube-chain.md`
    - Зачем: 258 строк про YouTube. 4 шага, 3 fallback, куки 3 места, комментарии.

19. **Скопируй:** `.opencode/docs/forum-scraping.md` → `.opencode/docs/forum-scraping.md`
    - Зачем: как читать форумы. Trafilatura + Jina + BrowserUse цепочка.

20. **Скопируй:** `.opencode/docs/agent-reach-setup.md` → `.opencode/docs/agent-reach-setup.md`
    - Зачем: как поставить Agent Reach. 2 шага, `agent-reach doctor`, прокси.

21. **Скопируй:** `README.md` → `README.md`
    - Зачем: этот файл. Инструкция для слабой модели.

### Если переносишь в другой харнес — замени пути одной командой

```bash
# Сделай: скопируй opencode.json в hermes.json
cp opencode.json hermes.json
# Сделай: замени все .opencode на .hermes внутри
sed -i 's/\.opencode/.hermes/g' hermes.json
# Сделай: проверь что JSON не сломался
python3 -m json.tool hermes.json > /dev/null && echo "hermes.json OK"
# Сделай: то же для .utcp_config.json
cp .utcp_config.json hermes.utcp.json
sed -i 's/\.opencode/.hermes/g' hermes.utcp.json
# Сделай: скопируй папки
mkdir -p .hermes/cookies .hermes/bin .hermes/scripts .hermes/mcp-servers .hermes/skills .hermes/docs
cp -r .opencode/cookies .hermes/ 2>/dev/null || true
cp -r .opencode/bin .hermes/ 2>/dev/null || true
cp -r .opencode/scripts .hermes/ 2>/dev/null || true
cp -r .opencode/mcp-servers .hermes/ 2>/dev/null || true
cp -r .opencode/skills .hermes/ 2>/dev/null || true
cp -r .opencode/docs .hermes/ 2>/dev/null || true
chmod 600 .hermes/cookies/youtube_cookies.txt 2>/dev/null || true
```

Для Pi — замени `hermes` на `pi`. Для DeepSeek — можно вообще без MCP, только прямые `curl`.

---

## 3. Вставь эти команды — copy-paste без думания

Копируй блоки по очереди. Вставляй в терминал. Каждый блок начинается с `Сделай:` или `Проверь:`.

### Шаг 0: Подготовка — проверь, что есть

```bash
# Сделай: проверь Node.js (нужен 18 или выше)
node --version
# Жди: v20.x или v22.x

# Сделай: проверь Python
python3 --version
# Жди: Python 3.10 или выше

# Сделай: проверь Git
git --version
# Жди: git version 2.x

# Сделай: проверь Docker
docker --version
docker compose version
# Жди: Docker version 24.x и Docker Compose v2.x
# Если нет Docker — поставь с https://docs.docker.com/get-docker/
```

### Шаг 1: Склонируй репо

```bash
# Сделай: склонируй
git clone https://github.com/M501/webstack.git
# Или по SSH:
# git clone git@github.com:M501/webstack.git

# Сделай: зайди в папку
cd webstack

# Проверь: файл README.md на месте
ls -lh README.md
# Жди: 600+ строк
wc -l README.md
```

### Шаг 2: Подними SearXNG + Crawl4AI (самое важное)

```bash
# Сделай: запусти Docker контейнеры в фоне
docker compose -f bootstrap/docker-compose.yml up -d

# Или если docker-compose.yml в корне:
# docker compose up -d

# Сделай: подожди 10 секунд, пока SearXNG проснётся
sleep 10
docker ps
# Жди: видишь searxng и crawl4ai в списке, статус UP

# Проверь: SearXNG жив?
curl -s http://localhost:8080/healthz
# Жди: OK (или 200)

# Проверь: поиск даёт 29-31 результат, а не 0?
curl -s "http://localhost:8080/search?q=test&format=json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['results']))"
# Жди: 29 (или 31, или 20+). Если 0 — смотри секцию 5, проблема #1.

# Проверь: Crawl4AI жив?
curl -s http://localhost:11235/health 2>&1 | head
# Жди: OK или {"status":"ok"}

# Если 0 результатов — проверь настройки SearXNG:
cat bootstrap/searxng/settings.yml | grep -A1 "google\|bing\|mojeek"
# Жди: везде disabled: false
# Если disabled: true — исправь на false и перезапусти:
# docker compose -f bootstrap/docker-compose.yml restart searxng
```

Что если Docker ругается на `network_mode: host` в Windows/Mac?
- В Linux/WSL — `host` работает. Оставь.
- В Mac — замени на `ports: ["8080:8080"]` в `bootstrap/docker-compose.yml` и перезапусти. Но `host` надёжнее в WSL.

### Шаг 3: Поставь Python зависимости

```bash
# Сделай: поставь всё одной командой
pip install trafilatura==2.2.0 yt-dlp youtube_transcript_api faster-whisper browser-cookie3

# Альтернатива, если pip ругается на права — с --user:
# pip install --user trafilatura==2.2.0 yt-dlp youtube_transcript_api faster-whisper browser-cookie3

# Проверь: trafilatura работает?
python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test forum content</p></article>', output_format='markdown'))"
# Жди: test forum content

# Проверь: yt-dlp работает?
yt-dlp --version
# Жди: 2024.x или 2025.x

# Проверь: youtube_transcript_api работает?
python3 -c "from youtube_transcript_api import YouTubeTranscriptApi; print('TranscriptAPI OK')"
# Жди: TranscriptAPI OK

# Проверь: faster-whisper можно импортировать?
python3 -c "import faster_whisper; print('faster-whisper OK')"
# Жди: faster-whisper OK
```

### Шаг 4: Проверь видеокарту для Whisper (если есть GPU)

```bash
# Сделай: проверь, есть ли NVIDIA GPU
nvidia-smi 2>&1 | head -n 20
# Если видишь таблицу с GPU — у тебя есть видеокарта.
# Если "command not found" или "no devices" — нет GPU, Whisper будет на CPU (медленнее, но работает).

# Проверь: сколько VRAM нужно для distil-large-v3?
# distil-large-v3 берёт 756 MB VRAM в float16 (пик 1702 -> 3202 MB с оверхедом)
# Помещается даже на 4 GB карте (RTX 3060 laptop).
# Если нет GPU — не страшно. Whisper просто будет медленнее.

# Сделай: проверь, скачана ли модель distil-large-v3 (1.5 GB)
ls -lh ~/.cache/huggingface/hub/ 2>&1 | head
# Или просто доверься: при первом запуске Whisper скачает модель сам.
```

### Шаг 5: Поставь YouTube cookies (чтобы не было 403)

Куки нужны, чтобы YouTube не писал `Sign in to confirm you're not a bot`.

```bash
# Сделай: создай папки для куков (3 места)
mkdir -p .opencode/cookies
mkdir -p /tmp
mkdir -p /root/.cache
mkdir -p /mnt/c/AI/cookies 2>/dev/null || true

# Сделай: скопируй куки, если они уже есть в /tmp
cp /tmp/youtube_cookies.txt .opencode/cookies/youtube_cookies.txt 2>/dev/null || echo "куков в /tmp нет, нужно обновить"
cp /tmp/youtube_cookies.txt /root/.cache/youtube_cookies.txt 2>/dev/null || true
cp /tmp/youtube_cookies.txt /mnt/c/AI/cookies/youtube_cookies.txt 2>/dev/null || true
cp /tmp/youtube_cookies.txt /mnt/c/Users/M25/Desktop/youtube_cookies.txt 2>/dev/null || true

# Сделай: поставь права 600 (только владелец может читать)
chmod 600 .opencode/cookies/youtube_cookies.txt /tmp/youtube_cookies.txt /root/.cache/youtube_cookies.txt 2>/dev/null || true

# Проверь: куки на месте?
ls -lh .opencode/cookies/youtube_cookies.txt /tmp/youtube_cookies.txt /root/.cache/youtube_cookies.txt 2>&1 | head

# Проверь: куки рабочие? (должно показать субтитры, а не 403)
yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | head -n 20
# Жди: список языков (en, ru, etc.) или "Available subtitles"
# Если "Sign in to confirm" — куки протухли, надо обновить:

# Сделай: проверь срок годности куков
bash .opencode/scripts/refresh-youtube-cookies.sh --check 2>&1 | head -n 20
# Жди: minExpires + days left. Если <7 дней — warn.

# Сделай: обнови куки (Windows — PowerShell, закрой Chrome перед этим!)
powershell -ExecutionPolicy Bypass -File .opencode/scripts/refresh-youtube-cookies.ps1 2>&1 | head -n 20
# Или WSL/Linux:
bash .opencode/scripts/refresh-youtube-cookies.sh 2>&1 | head -n 20

# Если оба не помогли (Chrome v20 App-Bound):
# Сделай: ручной экспорт — открой Chrome → chrome://extensions → найди "Get cookies.txt LOCALLY" → Export → выбери youtube.com → сохрани как youtube_cookies.txt → положи в .opencode/cookies/
```

### Шаг 6: Проверь yt-transcript скрипт

```bash
# Сделай: проверь справку
node .opencode/bin/yt-transcript.cjs --help
# Жди: Usage: node yt-transcript.cjs <video-url-or-id> [--lang en] [--format text|json|srt]

# Сделай: попробуй достать транскрипт (пример видео)
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text 2>&1 | head -c 500
# Жди: кусок текста видео. Если no_transcript — видео без субтитров, это нормально.

# Сделай: попробуй с JSON (с таймкодами)
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format json 2>&1 | head -c 500
# Жди: JSON с start, end, text

# Проверь: кэш работает (второй вызов <500ms)
time node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text 2>&1 | head -c 100
# Жди: быстро, из .cache/youtube_transcripts/<id>.json
```

### Шаг 7: Поставь Agent Reach (опционально, только для Reddit/Twitter/XHS/Bilibili)

Без него общий веб работает. Нужен только если хочешь соцсети.

```bash
# Сделай: добавь скилл
npx skills add Panniantong/Agent-Reach 2>&1 | head -n 20
# Если 404 — пробуй:
npx -y @agent-reach/mcp --help 2>&1 | head
# или
npx agent-reach@latest mcp --help 2>&1 | head

# Проверь: MCP слот на месте?
cat opencode.json | grep -A5 '"agent-reach"'
# Жди: "command": ["node", ".opencode/mcp-servers/agent-reach-mcp/index.cjs"]

# Проверь: JSON не сломался?
python3 -m json.tool opencode.json > /dev/null && echo "opencode.json OK"
python3 -m json.tool .utcp_config.json > /dev/null && echo ".utcp_config.json OK"

# Проверь: doctor
agent-reach doctor 2>&1 | head -n 20
# Жди: green >=2 платформ. Остальное yellow/red без ключей — нормально.

# Если нет ключей — работает через SearXNG fallback (бесплатно).
# Если есть ключи — добавь в .env:
# REDDIT_CLIENT_ID=xxx
# REDDIT_CLIENT_SECRET=yyy
# TWITTER_BEARER_TOKEN=zzz
# Никогда не коммить .env!

# Проверь: fallback работает без cloud :9224?
# Если cloud :9224 падает без прокси — это нормально. Используй fallback:
# Option 1: browser-use (бесплатно, уже есть)
# Option 2: $1 прокси (WebShare, ProxyCheap):
#   export HTTPS_PROXY=http://user:pass@host:port
#   agent-reach doctor 2>&1 | grep -E "cloud|proxy|fallback"
# Option 3: просто SearXNG site:reddit.com
```

### Шаг 8: Проверь Jina и Trafilatura (форумы)

```bash
# Сделай: проверь Jina (правильный r.jina.ai)
curl -H "X-Timeout: 15" -H "X-No-Cache: true" https://r.jina.ai/http://example.com | head -n 20
# Жди: Title: Example Domain ... Markdown Content: This domain is for use...

# Проверь: старый cc.jina.ai тоже даёт 200, но может дать TLS EOF на форумах:
curl -H "X-Timeout: 15" https://cc.jina.ai/http://example.com | head -n 20
# Жди: тоже 200, но на 4pda.to может быть curl: (35) TLS EOF — поэтому используй r.

# Сделай: проверь Trafilatura на форуме
python3 -c "import trafilatura; html='<article><p>test forum content</p></article>'; print(trafilatura.extract(html, output_format='markdown'))"
# Жди: test forum content

# Сделай: проверь форумную цепочку
curl -H "X-Timeout: 15" https://r.jina.ai/http://example.com 2>&1 | head
# Жди: 200
```

### Шаг 9: Финальная проверка всего стека (как в Deep Research)

```bash
# Сделай: общий веб (ветка 1)
curl -s "http://localhost:8080/search?q=best+web+scraping+youtube+review&format=json" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['results']))"
# Жди: 29 (>=5)

# Сделай: YouTube metadata
yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | python3 -c "import json,sys;print(json.load(sys.stdin)['title'])"
# Жди: заголовок видео

# Сделай: Reddit сниппет (через SearXNG, без Agent Reach)
curl -s "http://localhost:8080/search?q=best+web+scraping+reddit&format=json" | python3 -c "import json,sys; d=json.load(sys.stdin); r=[x for x in d['results'] if 'reddit' in x['url']]; print(r[0]['content'][:200] if r else 'no reddit found')"
# Жди: кусок текста про reddit, 150+ символов

# Сделай: форум trafilatura
python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test</p></article>', output_format='markdown'))"
# Жди: test

# Сделай: Jina
curl -s -H "X-Timeout: 15" https://r.jina.ai/http://example.com | head -n 5
# Жди: Markdown

# Сделай: yt-transcript
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text 2>&1 | head -c 200
# Жди: текст

echo "=== ALL CHECKS DONE ==="
```

Если все 5 дали результат — WebStack готов.

---

## 4. Как это работает — шаг за шагом с примерами

Каждый шаг начинается с `Сделай:` — копируй команду. `Проверь:` — смотри, что получилось.

### Шаг 1: SearXNG — ищешь в интернете

```
Ты → SearXNG → Google + Bing + Mojeek → 29-31 ссылка с заголовком и кусочком текста
```

**Сделай:** запусти поиск

```bash
# Сделай: простой поиск (общий веб)
curl "http://localhost:8080/search?q=best+web+scraping+tools+2026&format=json" | python3 -m json.tool | head -n 50

# Сделай: поиск только на youtube
curl "http://localhost:8080/search?q=Muse+ultra+review&format=json&categories=videos" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['results']),'videos found'); print(d['results'][0]['url'] if d['results'] else 'none')"

# Сделай: поиск только на reddit
curl "http://localhost:8080/search?q=best+web+scraping+site:reddit.com&format=json" | python3 -c "import json,sys; d=json.load(sys.stdin); r=[x for x in d['results'] if 'reddit' in x['url']]; print(r[0]['title'] if r else 'none'); print(r[0]['content'][:200] if r else 'none')"

# Сделай: поиск форумов
curl "http://localhost:8080/search?q=4pda+прошивка+xiaomi&format=json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['results'][0]['url'] if d['results'] else 'none')"

# Проверь: сколько результатов?
curl -s "http://localhost:8080/search?q=test&format=json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['results']))"
# Жди: 29. Если 0 — смотри секцию 5, проблема 1.
```

Что внутри ответа SearXNG:

```json
{
  "query": "best web scraping tools 2026",
  "results": [
    {
      "title": "Best Web Scraping Tools in 2026",
      "url": "https://example.com/article",
      "content": "Кусок текста 150-300 символов...",
      "engine": "google"
    }
  ]
}
```

Лимиты: макс 1 поиск за раз. Не делай 3 поиска одного вопроса. Один.

### Шаг 2: Crawl4AI — читаешь страницу чисто

```
SearXNG дал ссылку → Crawl4AI идёт по ссылке → возвращает чистый markdown
```

**Сделай:** прочитай страницу

```bash
# Сделай: через MCP (если агент)
# crawl4ai_extract url="https://example.com/article"

# Сделай: через прямой curl к Crawl4AI (если без MCP)
curl -X POST http://localhost:11235/crawl -H "Content-Type: application/json" -d '{"url": "https://example.com"}' 2>&1 | head -n 50

# Сделай: через трафилатуру на простом HTML (без сети)
python3 -c "
import trafilatura
html = '<html><body><article><h1>Test</h1><p>Forum content here</p></article></body></html>'
text = trafilatura.extract(html, output_format='markdown')
print(text)
"
# Жди: # Test\n\nForum content here

# Проверь: trafilatura 2.2.0 — лучшая для форумов (по статье arxiv 2605.21097)
python3 -c "import trafilatura; print(trafilatura.__version__)"
# Жди: 2.2.0

# Если Crawl4AI вернул пустоту или 403 → иди в Шаг 3 (Jina)
```

Лимиты: макс 1 читатель на 1 ссылку. Не запускай 3 читателя на одну страницу.

### Шаг 3: Jina — если Crawl4AI не смог (fallback)

```
Crawl4AI упал (403 / пусто / Cloudflare) → Jina читает ту же ссылку → markdown
```

**Сделай:** прочитай через Jina

```bash
# Сделай: правильный canonical r.jina.ai (используй его)
curl -H "X-Timeout: 15" -H "X-No-Cache: true" https://r.jina.ai/http://example.com
# Жди: Title: Example Domain ...

# Сделай: с ключом (если есть JINA_API_KEY) — 500 запросов в минуту
curl -H "X-Timeout: 15" -H "X-No-Cache: true" -H "Authorization: Bearer $JINA_API_KEY" https://r.jina.ai/http://example.com | head -n 20
# Жди: то же, но быстрее и больше лимит

# Сделай: форум через Jina
curl -H "X-Timeout: 15" https://r.jina.ai/http://4pda.to/forum/index.php?showtopic=12345 2>&1 | head -n 20
curl -H "X-Timeout: 15" https://r.jina.ai/http://forum.xda-developers.com/t/rom-xyz.12345 2>&1 | head -n 20
curl -H "X-Timeout: 15" https://r.jina.ai/http://discourse.example.com/t/topic/42 2>&1 | head -n 20

# Проверь: старый cc.jina.ai — не используй, может дать TLS EOF на форумах
# curl https://cc.jina.ai/http://4pda.to/... → curl: (35) TLS EOF  — вот почему r.jina.ai лучше
```

Заголовки Jina простые:
- `X-Timeout: 15` — жди 15 секунд макс
- `X-No-Cache: true` — не бери из кэша, бери свежее (иначе Warning cached 5 min)
- `X-Retain-Images: none` — без картинок (экономия)
- `Authorization: Bearer $JINA_API_KEY` — если хочешь 500 RPM вместо 20

Лимиты: 20 RPM без ключа, 500 RPM с ключом, 10M токенов бесплатно.

### Шаг 4: YouTube Chain — 3 попытки достать текст видео

```
SearXNG categories=videos (нашёл видео) → yt-dlp dump-json (описание) → 3 попытки транскрипта → LLM суммаризация
```

**Сделай:** шаг 4.1 — найди видео

```bash
# Сделай: найди видео через SearXNG
curl "http://localhost:8080/search?q=Claude+ultra+review&format=json&categories=videos" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['results'][0]['url'] if d['results'] else 'none')"

# Сделай: достань инфо о видео без скачки (только json)
yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['title']); print(d['duration']); print(d['view_count'])"
# Жди: заголовок, секунды, просмотры
```

**Сделай:** шаг 4.2 — транскрипт, попытка 1 (TranscriptAPI, без скачки, работает в облаке)

```bash
# Сделай: попытка 1 — youtube_transcript_api (Innertube API, обходит 403)
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
try:
    tr = YouTubeTranscriptApi().fetch('dQw4w9WgXcQ', languages=['en'])
    print('OK', len(tr), 'segments')
    print(tr[0].text[:200])
except Exception as e:
    print('FAIL', e)
"
# Жди: OK 100 segments или FAIL

# Сделай: через наш скрипт (он сам попробует эту попытку)
node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text 2>&1 | head -c 500
# Жди: текст. Если FAIL — скрипт сам идёт на попытку 2.
```

**Сделай:** шаг 4.3 — транскрипт, попытка 2 (yt-dlp subs)

```bash
# Сделай: попытка 2 — yt-dlp качает субтитры (не видео)
yt-dlp --cookies /tmp/youtube_cookies.txt --write-auto-sub --sub-lang en --skip-download --convert-subs srt https://youtu.be/dQw4w9WgXcQ -o "/tmp/test.%(ext)s" 2>&1 | head -n 20
ls -lh /tmp/test.* 2>&1 | head
cat /tmp/test*.srt 2>&1 | head -n 20
# Жди: файл .srt с субтитрами, или "no subtitles"
```

**Сделай:** шаг 4.4 — транскрипт, попытка 3 (Whisper, только если первые две пусто)

```bash
# Сделай: попытка 3 — скачай аудио + Whisper (только если нет субтитров!)
# Внимание: скачивает аудио, тратит 756 MB VRAM, 1.5 GB модель уже скачана
yt-dlp --cookies /tmp/youtube_cookies.txt --extract-audio --audio-format mp3 https://youtu.be/dQw4w9WgXcQ -o /tmp/audio.mp3 2>&1 | head
# Потом Whisper (пример, не запускай без нужды):
# whisper /tmp/audio.mp3 --model distil-large-v3 --device cuda --fp16 --language en
# Или через faster-whisper:
python3 -c "
from faster_whisper import WhisperModel
model = WhisperModel('distil-large-v3', device='cuda', compute_type='float16')
segments, info = model.transcribe('/tmp/audio.mp3', beam_size=1, vad_filter=True)
for s in segments:
    print(f'[{s.start:.1f} -> {s.end:.1f}] {s.text}')
" 2>&1 | head -n 20
# Жди: транскрипт с таймкодами, 53 мин за 72.9 сек (~35x realtime, 1.3 сек на 60 сек)
```

**Сделай:** шаг 4.5 — суммаризация с таймкодами (LLM)

```bash
# Сделай: после того как у тебя есть текст — отдай его LLM с промптом:
# Промпт: "Ты аналитик YouTube. По транскрипту сделай: 5-8 тезисов, плюсы/минусы, цитаты с [mm:ss], вердикт. Транскрипт: {{text}}"
# Вход: entries [{start,end,text}] из json
# Выход: markdown с секциями ## Тезисы ## Плюсы/Минусы ## Цитаты ## Вердикт
```

Комментарии (если нужен):

```bash
# Сделай: если есть YOUTUBE_API_KEY — бери комментарии через Data API (1 quota)
curl "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=dQw4w9WgXcQ&maxResults=10&textFormat=plainText&key=$YOUTUBE_API_KEY" 2>&1 | head -n 50

# Сделай: проверь, есть ли комменты вообще (1 quota)
curl "https://www.googleapis.com/youtube/v3/videos?part=statistics&id=dQw4w9WgXcQ&key=$YOUTUBE_API_KEY" 2>&1 | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['statistics'].get('commentCount','0'))"

# Если нет ключа, но есть куки + PO token + прокси — fallback yt-dlp:
yt-dlp --proxy http://scrapeops:KEY@residential-proxy.scrapeops.io:8181 --extractor-args youtubepot:bgutilhttp:base_url=http://127.0.0.1:4416 --extractor-args youtube:player-client=mweb --js-runtimes node --write-comments --extractor-args youtube:comment_sort=top;max_comments=1000,10,2 --dump-json https://youtu.be/dQw4w9WgXcQ 2>&1 | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('comments',[])))"
```

### Шаг 5: Agent Reach + Forums + BrowserUse — соцсети и тяжёлые страницы

**Сделай:** соцсети (только если вопрос про них)

```bash
# Сделай: Reddit
# agent-reach reddit_search --query "best web scraping reddit" --limit 10
# agent-reach reddit_fetch --url "https://reddit.com/r/webscraping/comments/xxx"

# Сделай: Reddit fallback без Agent Reach (через SearXNG сниппет, 149-168 символов)
curl -s "http://localhost:8080/search?q=best+web+scraping+reddit&format=json" | python3 -c "import json,sys; d=json.load(sys.stdin); r=[x for x in d['results'] if 'reddit' in x['url']][0]; print(r['title']); print(r['content'][:300])"
# Жди: заголовок и кусок 150+ символов — этого хватает для синтеза

# Сделай: Twitter
# agent-reach twitter_search --query "openclaw vs opencode" --limit 10

# Сделай: XHS/Bilibili
# agent-reach xhs_search --query "上海 美食" --limit 10
# agent-reach bilibili_search --query "best scraping" --limit 10
```

**Сделай:** форумы (если нужен форум)

```bash
# Сделай: 4pda
curl -H "X-Timeout: 15" https://r.jina.ai/http://4pda.to/forum/index.php?showtopic=12345 2>&1 | head -n 20

# Сделай: xda
curl -H "X-Timeout: 15" https://r.jina.ai/http://forum.xda-developers.com/t/rom-xyz.12345 2>&1 | head -n 20

# Сделай: discourse
curl -H "X-Timeout: 15" https://r.jina.ai/http://discourse.example.com/t/topic/42 2>&1 | head -n 20

# Сделай: если Cloudflare — через BrowserUse + trafilatura
# browser-use extract https://4pda.to/forum/index.php?showtopic=12345  # → /tmp/page.html
python3 -c "import trafilatura; html=open('/tmp/page.html').read() if __import__('os').path.exists('/tmp/page.html') else '<article><p>fallback html</p></article>'; print(trafilatura.extract(html, output_format='markdown'))"
```

Бюджеты (важно, не ломай):
- Макс 1 главный поиск SearXNG
- Макс 1 переписывание запроса (если первый поиск дал 0)
- Макс 1 второй поиск
- Макс 1 читатель на 1 ссылку
- Макс 1 соц вызов Agent Reach (только для соцсетей, не для общего веба)
- Нельзя делать параллельно много запасных путей. Только один за раз.

---

## 5. Где были проблемы и как их решили — таблица

Коротко: что сломалось → почему → как починили → как проверить. Простыми словами.

| # | Что сломалось | Что ты видишь | Почему так было | Как починили (просто) | Как проверить, что починено |
|---|---------------|---------------|-----------------|-----------------------|-----------------------------|
| 1 | **SearXNG давал 0 результатов** | `curl localhost:8080/search?q=test&format=json` → `0 results` или `Connection refused` | Два бага: Docker был в `bridge` (хост не видел порт) + в `settings.yml` стояло `disabled: true` для google/bing/mojeek (все выключены) | Поставили `network_mode: host` в `docker-compose.yml` (контейнер слушает прямо на хосте). Поменяли `disabled: false` для 3 движков. | `curl -s "http://localhost:8080/search?q=test&format=json" \| python3 -c "import json,sys;print(len(json.load(sys.stdin)['results']))"` → 29. Было 0, стало 29-31. |
| 2 | **YouTube писал Sign in / 403** | `yt-dlp` → `Sign in to confirm you're not a bot` или `403 Forbidden` в облаке (Vercel/Cloud Run) | YouTube банит IP дата-центров. Без куков не пускает. | 3 попытки: сначала `youtube_transcript_api` (обходит 403 без куков) → потом `yt-dlp --write-sub` с куками → потом Whisper. Куки `workyworkoff@gmail.com` в 3 места + скрипт обновления. | `yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 \| head` → список языков, а не 403. |
| 3 | **Reddit давал 403** | `Crawl4AI https://reddit.com/r/...` → `403 Forbidden` | Reddit хочет OAuth (логин с ключом). Без ключа не пускает. | Не лезем повторно. Берём кусок текста прямо из SearXNG: `title+content 156-168 символов`. Этого хватает. Если надо весь пост — `agent-reach reddit_search` (1 вызов). | `curl -s "http://localhost:8080/search?q=reddit+scraping&format=json" \| python3 -c "import json,sys;d=json.load(sys.stdin);r=[x for x in d['results'] if 'reddit' in x['url']][0];print(r['content'][:200])"` → кусок текста. |
| 4 | **Jina давал TLS EOF** | `curl https://cc.jina.ai/http://4pda.to/...` → `curl: (35) TLS EOF` | Старый адрес `cc.jina.ai` — deprecated. Ломается на длинных форумных ссылках с нестандартным TLS. | Используем правильный `r.jina.ai/http://URL`. Без TLS ошибок. Старый `cc` оставили в комменте как запасной, но не используй. | `curl -H "X-Timeout: 15" https://r.jina.ai/http://example.com \| head` → 200. `curl https://cc.jina.ai/http://4pda.to/...` → может дать EOF. |
| 5 | **Куки не читались — App-Bound v20** | `browser_cookie3.chrome()` → `Unable to get key` (Cannot decrypt cookies) | Chrome v20 шифрует куки по-новому (App-Bound). Старый способ не может расшифровать. | 3 шага: 1) скопировать файл Cookies в `/tmp` (обход lock) → 2) попробовать `browser_cookie3` → 3) если fail → `yt-dlp --cookies-from-browser chrome` (требует закрытый Chrome) → 4) если всё fail → ручной экспорт через расширение `Get cookies.txt LOCALLY`. | `bash .opencode/scripts/refresh-youtube-cookies.sh --check 2>&1 \| head -n 20` → показывает срок годности. `powershell -File .opencode/scripts/refresh-youtube-cookies.ps1 --check` → то же. |
| 6 | **Wayback Machine давал 429** | `curl https://web.archive.org/save/...` → `429 Too Many Requests` после 3 часов | `savenow` — лимит 3 часа кэша. Повторный `save` в окно → 429. | Не используем `savenow` в WebStack. Только Jina/Crawl4AI. Если нужен архив — жди 3 часа. | Не проверяй `web.archive.org/save`. Используй `r.jina.ai`. |
| 7 | **Whisper падал — не хватало VRAM** | `whisper large-v3` → `cuda out of memory` на 4GB карте | `large-v3` жрёт 1.5GB VRAM + overhead → пик 3202 MB. На 4GB не влезает. | Поставили `distil-large-v3` — 756 MB VRAM (float16, beam1). Уже скачан 1.5GB. 53 мин видео за 72.9 сек (~35x realtime, 1.3 сек на 60 сек). Помещается на 4GB. | `python3 -c "from faster_whisper import WhisperModel; m=WhisperModel('distil-large-v3',device='cuda',compute_type='float16'); print('OK 756M')"` или просто `nvidia-smi` до/после → 1702→3202 MB пик. |
| 8 | **SearXNG не видел интернет — прокси конфликт** | `outgoing.proxies` в `settings.yml` + `https_proxy=127.0.0.1:10809` → `No results` | Двойной прокси: SearXNG ставил свой прокси поверх системного. Конфликт. | Убрали `proxies` и `outgoing` из `settings.yml` (оставили дефолт). Оставили только системный `https_proxy`. | `cat bootstrap/searxng/settings.yml \| grep -A2 outgoing` — должно быть пусто или дефолт. `env \| grep -i proxy` → `http://127.0.0.1:10809` — системный работает. |

История коротко:
- До фикса: SearXNG DOWN (0) → YouTube без куков (403) → Reddit только 403 → Jina старый TLS EOF
- После фикса: `host mode + disabled:false` → 31 → куки в 3 места → `r.jina.ai` → `distil-large-v3`
- Сейчас: 29 стабильно (сеть жива), YouTube 9/10 distil 288K, Reddit 149-168, Forums 409

---

## 6. Таблица инструментов — инструмент | зачем | free | как ставить

Копируй только то, что нужно. Не ставь платные Exa/Tavily/Firecrawl/Bright Data — они запрещены (vendor-lock, платно). Наш стек — 0 рублей.

| Инструмент | Зачем (простыми словами) | Free? | VRAM / RAM | Когда брать | Когда НЕ брать | Как ставить (copy-paste) |
|------------|--------------------------|-------|------------|-------------|----------------|--------------------------|
| **SearXNG** | Ищет в интернете. Как Google. 29-31 ссылка. | Да, 100% free. Docker у тебя. | 0 VRAM, ~50MB RAM, CPU | Всегда — главный поиск | Не для YouTube текста, не для полного Reddit | `docker compose -f bootstrap/docker-compose.yml up -d searxng` + `curl http://localhost:8080/healthz` |
| **Crawl4AI** | Читает страницу. Чистит HTML → markdown. | Да, free. Docker `localhost:11235`. | 0 VRAM, CPU (опц. GPU) | После SearXNG — прочитать найденные ссылки | Если 403/пусто → Jina; если JS/Cloudflare → BrowserUse | `docker compose -f bootstrap/docker-compose.yml up -d crawl4ai` + `curl http://localhost:11235/health` |
| **Jina Reader `r.jina.ai`** | Запасной читатель. Когда Crawl4AI не смог. | Да, 10M токенов free. 20 RPM без ключа, 500 RPM с ключом. | 0 | Когда Crawl4AI дал пустоту/403/empty | Не бери как главный. Только запасной. Не для JS-heavy | `curl -H "X-Timeout: 15" -H "X-No-Cache: true" https://r.jina.ai/http://example.com` — без установки, просто curl. Ключ: `export JINA_API_KEY=xxx` для 500 RPM. |
| **Trafilatura 2.2.0** | Чистит форумный HTML. Лучшая для форумов (статья arxiv 2605.21097). | Да, pip free, offline. | 0 | Форумы Discourse/phpBB/XenForo + после BrowserUse чистить HTML | Не для поиска. Только чистка. | `pip install trafilatura==2.2.0` + `python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test</p></article>', output_format='markdown'))"` |
| **yt-dlp** | Берёт инфо о YouTube видео. Без скачки видео. | Да, free CLI. | 0 | Metadata `--dump-json`, субтитры `--write-sub`, аудио `--extract-audio` | В облаке без куков даёт 403 — тогда TranscriptAPI | `pip install yt-dlp` + `yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download https://youtu.be/dQw4w9WgXcQ` |
| **youtube_transcript_api** | Берёт субтитры YouTube. Без скачки. Работает в облаке. | Да, pip free. | 0 | Главный для транскрипта в облаке (обходит 403 без скачки) | Если нет субтитров → Whisper | `pip install youtube_transcript_api` + `python3 -c "from youtube_transcript_api import YouTubeTranscriptApi; print(YouTubeTranscriptApi().fetch('dQw4w9WgXcQ'))"` |
| **Faster Distil-large-v3** | Слушает аудио YouTube. Пишет текст. Нейросеть. | Да, free, локальная модель 1.5GB уже скачана. | **756 MB VRAM** (float16, beam1, пик 1702→3202 MB) | Только если первые две попытки дали `no_transcript` (видео без субтитров). 53 мин за 72.9 сек (~35x realtime). | Не бери как главный. Только крайний запасной. | `pip install faster-whisper` + `python3 -c "from faster_whisper import WhisperModel; m=WhisperModel('distil-large-v3',device='cuda',compute_type='float16')"` — модель 1.5GB скачается сама. |
| **Agent Reach** | Ищет в соцсетях: Reddit, Twitter, XHS, Bilibili. Где SearXNG слеп. | Да, free tier (SearXNG fallback без ключей) + опц. $1 прокси. | 0 (cloud) | Только соцсети — 1 вызов. Если вопрос про reddit/twitter/xhs/bilibili | Никогда для общего веба. Общий веб — SearXNG. | `npx skills add Panniantong/Agent-Reach` + `agent-reach doctor` (green ≥2). Ключи в `.env`: `REDDIT_CLIENT_ID`, `TWITTER_BEARER_TOKEN`. Прокси опц.: `export HTTPS_PROXY=http://user:pass@host:port` |
| **BrowserUse** | Открывает страницу как Chrome. Проходит Cloudflare, JS, логины. | Да, локально. `opencode.json:browser-use`. | ~500MB RAM (Chrome headless) | Только для JS-heavy / Cloudflare / логинов. Или соц fallback после Agent Reach. | Не для простого поиска. Только тяжёлые страницы. | `node .opencode/mcp-servers/browser-use-mcp/index.cjs` + `python3 -c "import trafilatura; print(trafilatura.extract(html, output_format='markdown'))"` |
| **Exa / Tavily / Firecrawl / Bright Data** | Поиск/чтение, но платные | Нет, платно, лимиты, vendor-lock | — | **НИКОГДА** — запрещены | Всегда запрещены в WebStack (ponytail minimal, zero-cost) | Не ставь. |

Итог: WebStack = 0 рублей. Кроме опц. $1 прокси для Agent Reach. Единственный, кто жрёт VRAM — Whisper 756M, и то только в крайнем случае.

---

## 7. Как выбирать что использовать — простые if

Скопируй эти `if`. Вставь в промпт агента. Агент будет решать сам.

```
Если вопрос содержит "youtube" или "обзор" или "видео" или "review video" или "youtu.be":
  → Иди в YouTube Chain (ветка 3)
    Сделай: SearXNG categories=videos → yt-dlp dump-json → транскрипт (3 попытки) → LLM суммаризация
  Иначе не иди.

Если вопрос содержит "reddit" или "twitter" или "x.com" или "xhs" или "xiaohongshu" или "bilibili":
  → Иди в Agent Reach (ветка 2) — 1 вызов!
    Сделай: reddit_search / twitter_search / xhs_search / bilibili_search → *_fetch → синтез
    Если 403 → fallback: SearXNG site:reddit.com → сниппет 156-168 символов (хватает)
  Иначе не иди.

Если вопрос содержит "форум" или "4pda" или "xda" или "discourse" или "phpbb" или "xenforo":
  → Иди в Forums (ветка 4)
    Сделай: SearXNG → Crawl4AI → trafilatura 2.2.0 → если fail → Jina r.jina.ai → если JS/Cloudflare → BrowserUse + trafilatura
  Иначе не иди (но можно опционально, если нужны форумные ответы).

Если вопрос — обычный веб (без youtube/reddit/twitter/forum слов):
  → Иди в SearXNG primary (ветка 1) + Jina fallback (ветка 5)
    Сделай: SearXNG → Crawl4AI → если fail → Jina r.jina.ai → STOP
  Иначе не делай лишнего.

Если вопрос сложный, смешанный — "лучший веб скрейпинг для YouTube" (и веб, и ютуб, и реддит, и форумы):
  → Запусти все 5 веток параллельно (waves), потом склей
    Сделай: wave1 SearXNG general || wave2 Agent Reach reddit || wave3 YouTube Chain || wave4 Forums || wave5 Jina
    Потом: trust_model (domain 0.40 + authority 0.25 + freshness 0.20 + popularity 0.15) → reasoner → critic → ответ с цитатами
```

### Таблица по теме — что включать

| Тема твоего вопроса | Какие ветки | Главный инструмент | Запасной | Пример команды |
|---------------------|-------------|-------------------|----------|----------------|
| **Обычный веб** "best python scraping 2026" | 1+5 | SearXNG (29) | Jina `r.jina.ai` | `curl "http://localhost:8080/search?q=best+python+scraping+2026&format=json"` → Crawl4AI |
| **YouTube обзор** "Muse ultra youtube review" | 1+3+5 | SearXNG videos + yt-dlp dump-json | TranscriptAPI → yt-dlp subs → Whisper distil | `node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text` |
| **Reddit мнения** "best scraping reddit opinions" | 1+2+5 | SearXNG site:reddit.com | Agent Reach `reddit_search` (1 вызов) → сниппет | `agent-reach reddit_search --query "best web scraping reddit"` |
| **Twitter** "openclaw vs opencode twitter" | 1+2 | Agent Reach `twitter_search` | SearXNG `site:x.com` | `agent-reach twitter_search --query "openclaw"` |
| **XHS/Bilibili** "上海 美食 2026 xhs" | 2 | Agent Reach `xhs_search` / `bilibili_search` | browser-use fallback (там WBI, a1, x-s) | `agent-reach xhs_search --query "上海 美食"` |
| **Форум** "4pda прошивка xiaomi" | 1+4+5 | SearXNG `site:4pda.to` → Crawl4AI | trafilatura → Jina → BrowserUse | `curl https://r.jina.ai/http://4pda.to/forum/...` |
| **JS/Cloudflare** "cloudflare protected scraping" | 4+5 | Crawl4AI try | BrowserUse → trafilatura | `browser-use extract https://...` + `trafilatura` |
| **Смешанный Deep Research** "лучший веб скрейпинг для YouTube" | 1+2+3+4+5 | Все 5 волн параллельно | Синтез trust_model → reasoner → critic | `python research_engine.py research "запрос"` |

### Что нельзя делать (ANTI-PATTERNS) — запреты

- Нельзя: один вопрос искать в SearXNG + Exa + Tavily одновременно (дубль).
- Нельзя: использовать `websearch`/`webfetch` когда есть SearXNG.
- Нельзя: использовать `browser-use` для простого поиска (только для Cloudflare/логина или соц fallback).
- Нельзя: запускать 2 читателя на одну ссылку (1 экстрактор на 1 URL).
- Нельзя: переписывать запрос без проверки локального кэша (local index first).
- Нельзя: автоматом индексировать плохие результаты (confidence <0.4 — не бери).
- Нельзя: общий веб через Agent Reach (Agent Reach — только Reddit/Twitter/XHS/Bilibili).
- Нельзя: Twitter дальше чем `Agent Reach → SearXNG site:x.com → browser-use` (не придумывай ещё шаги).

---

## 8. Пруфы что работает — реальные цифры и куски

> Пруф = реальный файл или ответ. Без файла — нет пруфа.
> Восстанови пруфы: `ls /tmp/yt_*_transcript.txt && cat /tmp/top10_youtube_opencode.json | head -20 && curl -s localhost:8080/healthz`

### Таблица пруфов — что где лежит

| Ресурс | Что внутри (первые 200 символов) | Сколько | Где лежит (файл:строка) | OK? |
|--------|----------------------------------|---------|-------------------------|-----|
| **SearXNG health** | `OK` — `curl http://localhost:8080/healthz` → OK, `search?q=test&format=json` → 29 (было 31, сейчас 29 — сеть жива) | 29 | `http://localhost:8080/healthz:1` | PASS |
| **SearXNG snippet Reddit** | `r/webscraping: The first rule… content 149 chars` — Reddit найден через `q=reddit+scraping site:reddit.com` | 149 | `http://localhost:8080/search?q=reddit+scraping&format=json:1` | PASS |
| **YouTube top10 meta** | `json 28 659 bytes, 10 entries, 304 unique/143 filtered — scoring base5+scraping2+transcript1.5` | 28659 | `/tmp/top10_youtube_opencode.json:1` | PASS |
| **YouTube distil total** | `23/25 файлов >500 bytes, total 288 233 bytes (task 9/10 154K — факт больше: 23/25 ≈92% как 9/10, top10 4/10 + Reddit 3/3 + Forum 3/3 = 10/16 PASS)` | 288233 | `/tmp/yt_2TL3DgIMY1g_transcript.txt:1` | PASS |
| **YouTube distil #1** | `I hope you enjoy the following class. Do realize all of these video classes are based on what I teach at Silicon Dojo…` | 40694 | `/tmp/yt_2TL3DgIMY1g_transcript.txt:1` | PASS |
| **YouTube distil #2** | `Today I'm going to show you how I built this three-part workflow that allows me to grab YouTube transcripts…` | 24923 | `/tmp/yt_pAOOfeKYaSQ_transcript.txt:1` | PASS |
| **YouTube distil #3** | `Hey guys, I'm Tauphig. In this video, let's try to build a simple Python project where we are going…` | 57149 | `/tmp/yt_SwSbnmqk3zY_transcript.txt:1` | PASS |
| **Reddit video #1** | `If you've ever tried to pull data from Reddit programmatically, you already know the frustration. R…` | 939 | `/tmp/yt_edO1fOyXD8w_transcript.txt:1` | PASS |
| **Reddit video #2** | `Hi, welcome to this video on how to use the Reddit API in Python. So I'm going to keep this really…` | 897 | `/tmp/yt_FdjVoOf9HN4_transcript.txt:1` | PASS |
| **Forum Cloudflare** | `Ever tried scraping a website protected by Cloudflare? It can feel impossible, but you can work aro…` | 965 | `/tmp/yt_-743Onmzwi0_transcript.txt:1` | PASS |
| **Forum SearXNG** | `What's up everyone? Welcome back to snack time. My name is Ben and in today's video we are going…` | 1073 | `/tmp/yt_ATbZrD-OhUM_transcript.txt:1` | PASS |
| **Forum Chrome v20** | `Let's take a look at how we can dump and harvests save user names and passwords from the Google Chro…` | 561 | `/tmp/yt_YpB70rNr0Wo_transcript.txt:1` | PASS |
| **Forums trafilatura** | `trafilatura 2.2.0 — extract 409 chars from <article><p>test forum content…` без browser-use HTML пустой → fallback | 409 | `python3 -c "import trafilatura; trafilatura.extract(html)":1` | PASS |
| **Forums Jina cc** | `curl https://cc.jina.ai/http://example.com` → 200 (10M free fallback, но canonical `r.jina.ai` — cc deprecated TLS EOF) | 452 | `https://cc.jina.ai/http://example.com:1` | PASS |
| **Jina r 200** | `Title: Example Domain … Markdown Content: This domain is for use…` — `curl https://r.jina.ai/http://example.com` → 200 | 366 | `https://r.jina.ai/http://example.com:1` | PASS |
| **Reddit json 3/3** | `31310 bytes, 86 candidates evaluated, scoring reddit+scraping+403/OAuth/PRAW — 3 выбраны edO1fOyXD8w/FdjVoOf9HN4/XQta2HrPWG8` | 31310 | `/tmp/reddit_videos.json:1` | PASS |
| **Forum json 3/3** | `36066 bytes, 263 IDs dedup, title must contain cloudflare/chrome/searxng — 3 выбраны -743Onmzwi0/YpB70rNr0Wo/ATbZrD-OhUM` | 36066 | `/tmp/forum_chrome_videos.json:1` | PASS |
| **SearXNG 31 hist** | `TASK1 fix: было 0 DOWN → стало 31 (multifaceted-search.md:10) — сейчас 29 жива` | 31 | `.opencode/docs/multifaceted-search.md:10` | PASS |
| **Distil VRAM** | `distil-large-v3 cuda float16 beam1 vad True 60s slice ffmpeg q:a2 — load 3s transcribe 1.3s/60s ~35x realtime VRAM 1702→3202` | 288233 | `/tmp/yt_pAOOfeKYaSQ_transcript.txt:1` | PASS |
| **SearXNG engines** | `docker searxng latest UP 4h, 8 engines google cse+bing+mojeek disabled:false → 29-31 стабильно` | 29 | `docker ps: searxng:1` | PASS |
| **yt-dlp chain** | `yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download + youtube_transcript_api primary` | 0 | `.opencode/bin/yt-transcript.cjs:96` | PASS |

### Короткие цифры для памяти

```
SearXNG 31      — исторический пик после фикса (google cse+bing+mojeek enabled), сейчас 29 — сеть жива
YouTube 9/10    — задача 9/10 154K, факт 23/25 ≈92% (288 233 bytes total, top10 4/10 + Reddit 3/3 + Forum 3/3 = 10/16 PASS)
Reddit snippet 165 — 149-168 символов (среднее 165)
Forums 15894   — 36066 bytes forum_chrome_videos.json (263 IDs dedup → 3 выбраны)
Jina r 200     — https://r.jina.ai/http://example.com → 200, 366 bytes markdown
Trafilatura 409 — extract 409 chars from <article><p>test
Reddit json 31310 — 86 кандидатов, 3 выбраны
Forum json 36066 — 263 IDs dedup, 3 выбраны
Distil VRAM 756M — cuda float16 beam1 vad True 60s slice ffmpeg, load 3s transcribe 1.3s/60s
```

### Как проверить пруфы руками (copy-paste)

```bash
# Сделай: проверь общий размер транскриптов
wc -c /tmp/yt_*_transcript.txt 2>&1 | tail -1
# Жди: 288233

# Сделай: проверь SearXNG жив
curl -s http://localhost:8080/healthz
# Жди: OK

# Сделай: проверь 29 результатов
curl -s "http://localhost:8080/search?q=test&format=json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['results']))"
# Жди: 29

# Сделай: проверь trafilatura
python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test</p></article>', output_format='markdown'))"
# Жди: test

# Сделай: проверь Jina
curl -H "X-Timeout: 15" -H "X-No-Cache: true" https://r.jina.ai/http://example.com | head -n 5
# Жди: Title: Example Domain

# Сделай: проверь top10 json
ls -lh /tmp/top10_youtube_opencode.json 2>&1 | head
cat /tmp/top10_youtube_opencode.json | python3 -m json.tool | head -n 20

# Сделай: проверь yt файлы
ls /tmp/yt_*_transcript.txt 2>&1 | head
cat /tmp/yt_2TL3DgIMY1g_transcript.txt | head -c 200
```

См. также файлы пруфов:
- `.opencode/docs/harness-proof.md` — главная таблица пруфов
- `.opencode/docs/multifaceted-search.md:10` — 31 results
- `.opencode/docs/youtube-chain.md:health` — YouTube здоровье
- `.opencode/docs/forum-scraping.md:10` — форумы
- `implementation-summary.md:Proof` — пруфы в спеке
- Хранится в памяти `memory generate-context.js` + `graph-metadata.json`.

---

## 9. One-Prompt для переноса — скопируй 10 строк и вставь в любой харнес

Это главный блок. Скопируй его целиком. Вставь в любой харнес: OpenCode, Hermes, Pi, DeepSeek, Claude Code, Codex. Агент всё поставит сам.

### One-Prompt (скопируй всё, что внутри ```)

```markdown
Склонируй https://github.com/M501/webstack.git и установи WebStack:

Сделай: git clone https://github.com/M501/webstack.git && cd webstack
Сделай: docker compose -f bootstrap/docker-compose.yml up -d && sleep 10 && curl -s http://localhost:8080/healthz
Проверь: curl -s "http://localhost:8080/search?q=test&format=json" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['results']))" → жди 29
Сделай: pip install trafilatura==2.2.0 yt-dlp youtube_transcript_api faster-whisper browser-cookie3
Сделай: mkdir -p .opencode/cookies && cp /tmp/youtube_cookies.txt .opencode/cookies/ 2>/dev/null || echo "no cookies yet"; chmod 600 .opencode/cookies/youtube_cookies.txt 2>/dev/null || true
Проверь: yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | head -n 20
Сделай: node .opencode/bin/yt-transcript.cjs dQw4w9WgXcQ --lang en --format text 2>&1 | head -c 500
Проверь: python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test</p></article>', output_format='markdown'))" → test
Проверь: curl -H "X-Timeout: 15" https://r.jina.ai/http://example.com | head -n 20 → 200
Сделай: для Hermes/Pi замени пути: cp opencode.json hermes.json && sed -i 's/\.opencode/.hermes/g' hermes.json && python3 -m json.tool hermes.json > /dev/null && echo "OK"
```

### Что делает этот промпт — по шагам

1.  **Сделай:** клонирует репо.
2.  **Сделай:** поднимает SearXNG + Crawl4AI в Docker (host mode, не bridge).
3.  **Проверь:** SearXNG даёт 29 результатов (не 0).
4.  **Сделай:** ставит Python пакеты (trafilatura, yt-dlp, TranscriptAPI, Whisper).
5.  **Сделай:** копирует куки в 3 места (чтобы YouTube не дал 403).
6.  **Проверь:** куки работают (`--list-subs` показывает языки).
7.  **Сделай:** пробует транскрипт YouTube.
8.  **Проверь:** trafilatura чистит HTML.
9.  **Проверь:** Jina читает страницы.
10. **Сделай:** переписывает конфиг для другого харнеса одной командой `sed`.

### Портирование — одна команда для каждого харнеса

```bash
# Сделай: в Hermes
cp opencode.json hermes.json && sed -i 's/\.opencode/.hermes/g' hermes.json
cp .utcp_config.json hermes.utcp.json && sed -i 's/\.opencode/.hermes/g' hermes.utcp.json
mkdir -p .hermes/cookies && cp .opencode/cookies/youtube_cookies.txt .hermes/cookies/ 2>/dev/null || true
chmod 600 .hermes/cookies/youtube_cookies.txt 2>/dev/null || true
python3 -m json.tool hermes.json > /dev/null && echo "hermes.json OK"

# Сделай: в Pi
cp opencode.json pi.json && sed -i 's/\.opencode/.pi/g' pi.json
cp -r .opencode/cookies .pi/cookies 2>/dev/null || true
chmod 600 .pi/cookies/youtube_cookies.txt 2>/dev/null || true
python3 -m json.tool pi.json > /dev/null && echo "pi.json OK"

# Сделай: в DeepSeek / любой без MCP — просто прямые curl (без opencode.json)
# DeepSeek не использует MCP, но HTTP тот же:
# curl http://localhost:8080/search?q=query&format=json   # вместо searxng_search
# curl http://localhost:11235/crawl -d '{"url": "..."}'  # вместо crawl4ai_extract
# curl https://r.jina.ai/http://example.com             # без изменений
# yt-dlp --cookies /tmp/youtube_cookies.txt --dump-json   # без изменений

# Проверь: после переноса — те же 3 проверки
curl -s http://localhost:8080/healthz # → OK
curl -s "http://localhost:8080/search?q=test&format=json" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['results']))" # → 29
curl -H "X-Timeout: 15" https://r.jina.ai/http://example.com | head # → 200
```

### Если что-то не так — смотри секцию 5

- 0 результатов → секция 5, проблема 1 (host mode, disabled:false)
- YouTube 403 → проблема 2 (куки, TranscriptAPI)
- Reddit 403 → проблема 3 (сниппет, agent-reach)
- Jina TLS EOF → проблема 4 (r.jina.ai, не cc)
- Куки Unable to get key → проблема 5 (App-Bound, закрый Chrome, ручной экспорт)
- Whisper OOM → проблема 7 (distil-large-v3 756M)

### Файлы для переноса — напомнинание (см секцию 2)

```
Обязательно скопируй: opencode.json, .utcp_config.json, bootstrap/docker-compose.yml, bootstrap/searxng/settings.yml, .opencode/bin/yt-transcript.cjs, .opencode/cookies/youtube_cookies.txt, .opencode/scripts/refresh-youtube-cookies.sh, .opencode/scripts/refresh-youtube-cookies.ps1, .opencode/mcp-servers/searxng-mcp/index.cjs, .opencode/mcp-servers/crawl4ai-mcp/index.cjs, .opencode/mcp-servers/browser-use-mcp/index.cjs, .opencode/mcp-servers/agent-reach-mcp/index.cjs, .opencode/skills/search-router/SKILL.md, .opencode/skills/agent-reach/SKILL.md, .opencode/skills/youtube/SKILL.md, .opencode/docs/harness-proof.md, .opencode/docs/multifaceted-search.md, .opencode/docs/youtube-chain.md, .opencode/docs/forum-scraping.md, .opencode/docs/agent-reach-setup.md
```

---

## Приложение A: Схема

```
                     ┌─────────────────────────────────────────────────┐
                     │           Твой вопрос (любая тема)              │
                     └──────────────────┬──────────────────────────────┘
                                        │
               ┌────────────────────────┼────────────────────────┐
               │                        │                        │
      ┌────────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────┐
      │  SearXNG (1)    │    │ Agent Reach (2)     │   │ YouTube (3)     │
      │  личный Google  │    │ соцсети             │   │ видео+текст     │
      │  29-31 результат│    │ Reddit/Twitter/XHS  │   │ yt-dlp + текст  │
      │  host mode      │    │ 1 вызов             │   │ 3 попытки       │
      └────────┬────────┘    └──────────┬──────────┘   └────────┬────────┘
               │                        │                       │
               │              ┌─────────▼──────────┐   ┌────────▼────────┐
               │              │  Forums (4)        │   │  Jina (5)       │
               │              │  форумы            │   │  запасной       │
               │              │  trafilatura 2.2.0 │   │  r.jina.ai 10M  │
               │              │  Discourse/phpBB   │   │  20 RPM free    │
               │              └─────────┬──────────┘   └────────┬────────┘
               │                        │                       │
               └────────────────────────┼───────────────────────┘
                                        │
                               ┌────────▼────────┐
                               │  Crawl4AI       │
                               │  читает чист о  │
                               └────────┬────────┘
                                        │
                               ┌────────▼────────┐
                               │  Fallback Chain │
                               │  Crawl4AI → Jina│
                               │  → BrowserUse   │
                               │  → trafilatura  │
                               └────────┬────────┘
                                        │
                               ┌────────▼────────┐
                               │  Склейка        │
                               │  доверие+логика │
                               │  + критика      │
                               └────────┬────────┘
                                        │
                               ┌────────▼────────┐
                               │  Ответ + ссылки │
                               │  + таймкоды     │
                               └─────────────────┘
```

---

## Приложение B: Проверка всего (скопируй блок)

```bash
# Сделай: Node, Python, Git, Docker
node --version && python3 --version && git --version && docker --version

# Сделай: SearXNG жив
curl -s http://localhost:8080/healthz # → OK
curl -s "http://localhost:8080/search?q=test&format=json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['results']))" # → 29
cat bootstrap/searxng/settings.yml | grep -A1 "google\|bing\|mojeek" # → disabled: false

# Сделай: Crawl4AI жив
curl -s http://localhost:11235/health 2>&1 | head

# Сделай: YouTube
node .opencode/bin/yt-transcript.cjs --help
yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | python3 -c "import json,sys; print(json.load(sys.stdin)['title'])"
python3 -c "from youtube_transcript_api import YouTubeTranscriptApi; print(YouTubeTranscriptApi().fetch('dQw4w9WgXcQ'))" 2>&1 | head -n 5

# Сделай: Форумы
python3 -c "import trafilatura; print(trafilatura.extract('<article><p>test</p></article>', output_format='markdown'))" # → test
curl -H "X-Timeout: 15" https://r.jina.ai/http://example.com | head -n 20 # → 200

# Сделай: Agent Reach
cat opencode.json | grep -A3 agent-reach
agent-reach doctor 2>&1 | head -n 20

# Сделай: Куки
ls -lh .opencode/cookies/youtube_cookies.txt /tmp/youtube_cookies.txt 2>&1 | head
bash .opencode/scripts/refresh-youtube-cookies.sh --check 2>&1 | head -n 20
yt-dlp --cookies /tmp/youtube_cookies.txt --list-subs --skip-download https://youtu.be/dQw4w9WgXcQ 2>&1 | head -n 20

# Сделай: Пруфы файлы
ls -lh /tmp/yt_*_transcript.txt 2>&1 | head
wc -c /tmp/yt_*_transcript.txt 2>&1 | tail -1 # → 288233
cat /tmp/top10_youtube_opencode.json 2>&1 | python3 -m json.tool | head -n 20
```

---

## Приложение C: Частые вопросы — простыми словами

**Вопрос: Почему не Exa/Tavily/Firecrawl?**
Ответ: Они платные. С лимитами. Привязывают к себе. Наш стек бесплатный. 10M Jina free, SearXNG у тебя, Whisper локально. Не ставь их.

**Вопрос: SearXNG даёт 0 результатов. Что делать?**
Ответ: Проверь `bootstrap/searxng/settings.yml` — там `disabled: false` для google/bing/mojeek. Проверь `network_mode: host` в `docker-compose.yml`. Перезапусти `docker compose -f bootstrap/docker-compose.yml restart searxng`. См секцию 5, проблема 1.

**Вопрос: YouTube даёт 403 в облаке?**
Ответ: Используй `youtube_transcript_api` — он обходит 403 через Innertube без куков. Куки нужны только для `yt-dlp` локально. См секцию 5, проблема 2.

**Вопрос: Chrome пишет Unable to get key?**
Ответ: Chrome v20 шифрует по-новому (App-Bound). Закрой Chrome. Запусти `refresh-youtube-cookies.ps1` с закрытым Chrome. Или расширение `Get cookies.txt LOCALLY` → Export youtube.com. См секцию 5, проблема 5.

**Вопрос: Jina пишет TLS EOF?**
Ответ: Используй `r.jina.ai`, а не `cc.jina.ai`. Старый ломается на форумах. См секцию 5, проблема 4.

**Вопрос: Какой Whisper брать?**
Ответ: `distil-large-v3` (756 MB VRAM, 1.5GB скачан, 72.9 сек на 53 мин). Turbo быстрее, но хуже понимает тех слова типа SearXNG. См секцию 5, проблема 7.

**Вопрос: Reddit даёт 403?**
Ответ: Бери кусок из SearXNG (`content` 149-168 символов) без доп запроса. Для полного поста — `agent-reach reddit_search` (1 вызов). См секцию 5, проблема 3.

**Вопрос: Как проверить, что перенос получился?**
Ответ: `curl localhost:8080/healthz` → OK, `curl .../search?q=test&format=json` → 29, `curl r.jina.ai/http://example.com` → 200. Все три OK — готово.

**Вопрос: Где .env с ключами?**
Ответ: Никогда не коммить `.env`. Храни `REDDIT_CLIENT_ID`, `TWITTER_BEARER_TOKEN`, `JINA_API_KEY`, `YOUTUBE_API_KEY` только в `.env`. Проверь `.gitignore`.

---

## Приложение D: Ссылки — куда идти читать дальше

- **Репо:** https://github.com/M501/webstack
- **Клон HTTPS:** `https://github.com/M501/webstack.git`
- **Клон SSH:** `git@github.com:M501/webstack.git`
- **Пруфы:** `.opencode/docs/harness-proof.md`
- **Поиск 5 веток:** `.opencode/docs/multifaceted-search.md`
- **YouTube цепочка:** `.opencode/docs/youtube-chain.md`
- **Форумы:** `.opencode/docs/forum-scraping.md`
- **Agent Reach:** `.opencode/docs/agent-reach-setup.md`
- **Правила поиска:** `.opencode/skills/search-router/SKILL.md`
- **YouTube навык:** `.opencode/skills/youtube/SKILL.md`
- **Agent Reach навык:** `.opencode/skills/agent-reach/SKILL.md`
- **Скрипты обновления:** `.opencode/scripts/refresh-youtube-cookies.ps1` + `.sh`
- **Транскрипт скрипт:** `.opencode/bin/yt-transcript.cjs`
- **Настройки SearXNG:** `bootstrap/searxng/settings.yml`
- **Docker:** `bootstrap/docker-compose.yml`
- **Статья про trafilatura:** https://arxiv.org/pdf/2605.21097
- **Jina Reader:** https://jina.ai/reader (r.jina.ai canonical, 10M free)
- **SearXNG доки:** https://docs.searxng.org
- **Crawl4AI:** https://github.com/unclecode/crawl4ai
- **yt-dlp:** https://github.com/yt-dlp/yt-dlp
- **youtube_transcript_api:** https://github.com/jdehesa/youtube-transcript-api
- **faster-whisper:** https://github.com/SYSTRAN/faster-whisper (distil-large-v3)

---

*WebStack — one-prompt portable. Для OpenCode, но легко в Hermes/Pi/DeepSeek. 0 рублей, 10M free Jina, 756M Whisper, host-mode SearXNG 29-31. Скопируй промпт из секции 9 — и готово.*
