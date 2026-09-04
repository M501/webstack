---
name: search-router
description: Routes web queries to the optimal tool. STRICT policy with crawler orchestration.
---

# Search Router Skill — COMPLETE POLICY

## Tool Budget (HARD LIMITS)

MAX 1 primary search pass (SearXNG)
MAX 1 query rewrite (if first pass fails)
MAX 1 second pass (SearXNG with rewritten query)
MAX 1 extractor per URL (Crawl4AI)
MAX 1 social chain call (Agent Reach) — ONLY for social queries (Reddit/Twitter/XHS/Bilibili), NOT for generic web
NO parallel fallbacks by default
NO Exa/Tavily/websearch/webfetch in normal route

## Priority Chain (STRICT)

1. Local Index (SQLite FTS5) — confidence >= 0.6 -> return cached
2. SearXNG (primary) — confidence >= 0.4 -> return with index
3. Query Rewrite (only if SearXNG fails) — ONE rewrite only
4. SearXNG second pass with rewritten query
5. Crawl4AI (extraction only, after SearXNG finds URLs)
6. STOP (report failure if all above fail)

## Social Chain (Agent Reach) — OPTIONAL, for Deep Research social queries ONLY

Reddit/Twitter/XHS/Bilibili → Agent Reach (free, $1 proxy опц.) → fallback to browser-use
- Budget: 1 extra call ONLY for social queries where SearXNG/Crawl4AI blind; never for generic web
- Detection: query contains reddit/twitter/xhs/bilibili OR user explicitly asks social UGC
- Order: `agent-reach reddit_search` / `twitter_search` / `xhs_search` / `bilibili_search` → on fail/empty → `browser-use` (browser-use:108, opencode.json:108)
- Generic web stays on SearXNG/Crawl4AI chain — do NOT add Agent Reach to generic web path
- Reddit 403 fallback: if Crawl4AI blocked 403 → use SearXNG snippet title+content 156-168 chars (доказано, no extra fetch).

## Multifaceted Search — как искать по любой теме (как ChatGPT5/Gemini/Claude Code)

Один запрос → 5 веток параллельно (waves), SearXNG primary починен TASK1 (host mode, proxies, bing/mojeek disabled:false, 31 results было 0). Синтез после waves. См. `.opencode/docs/multifaceted-search.md`.

**Цепочка (вызывается Deep Research по теме "лучший веб скрейпинг для YouTube" → все 5 веток параллельно):**

1. **SearXNG primary (general)** — обычный web (google cse + bing + mojeek теперь работают, 31 results) — для любой темы: `curl http://localhost:8080/search?q=<query>&format=json | jq .results` (health: `curl http://localhost:8080/healthz` → OK, `.../search?q=test&format=json` → 31).
2. **Agent Reach social (Reddit/Twitter/XHS/Bilibili)** — UGC мнения, если SearXNG дал reddit URL но Crawl4AI blocked 403 → fallback SearXNG snippet (title+content 156-168) как доказано; иначе `agent-reach reddit_search/twitter_search` (1 extra call, social-only).
3. **YouTube Chain:** `SearXNG categories=videos (20-93 results, `&categories=videos`) + yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json (metadata)` → если есть subs → `youtube_transcript_api`, иначе `faster-distil-large-v3 VRAM 756M (уже скачан 1.5G, 72.9с для 53мин)` — без скачки видео, cloud 403 → TranscriptAPI fallback.
4. **Forums:** `SearXNG → Crawl4AI → trafilatura 2.2.0 (уже PASS на 3 Discourse)` — Discourse/phpBB/XenForo (см. `forum-scraping.md`).
5. **Jina fallback `r.jina.ai/http://URL` 20 RPM no-key / 500 free / 10M tokens** — когда Crawl4AI fail/empty/403. Канон `r.jina.ai` (cc deprecated, TLS EOF). Headers: `X-Timeout: 15` `X-No-Cache: true` `Authorization: Bearer $JINA_API_KEY` для 500 RPM `X-Retain-Images: none`.

**Как Deep Research выбирает (волны):**
- Тема "лучший веб скрейпинг для YouTube" → waves: `wave1: SearXNG general` || `wave2: Agent Reach reddit "best web scraping reddit"` || `wave3: SearXNG youtube category + yt-dlp dump-json dQw4w9WgXcQ` || `wave4: SearXNG→Crawl4AI→trafilatura example.com` || `wave5: Jina` → синтез (trust_model + reasoner).
- Generic без youtube/reddit → 1+4+5; с `reddit/twitter` → +2; с `youtube/обзор` → +3. Не ставить Exa/Tavily/Firecrawl (EXCLUDES).

**Live проверка (как в Deep Research):**
```bash
curl "http://localhost:8080/search?q=best+web+scraping+youtube+review&format=json" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['results']))" # expect 29 (>=5)
yt-dlp --cookies /tmp/youtube_cookies.txt --js-runtimes node --dump-json --skip-download https://youtu.be/dQw4w9WgXcQ | python3 -c "import json,sys;print(json.load(sys.stdin)['title'])" # expect title
curl "http://localhost:8080/search?q=best+web+scraping+reddit&format=json" | python3 -c "import json,sys;d=json.load(sys.stdin);r=[x for x in d['results'] if 'reddit' in x['url']][0];print(r['content'][:200])" # reddit snippet
python3 -c "import trafilatura;print(trafilatura.extract('<article><p>test</p></article>',output_format='markdown'))" # PASS
curl -H "X-Timeout: 15" -H "X-No-Cache: true" https://r.jina.ai/http://example.com | head
```

## Crawler Orchestration (for deep research)

For queries requiring deep/multi-hop extraction:

1. Add seed URLs to frontier: `frontier.py add <url>`
2. Route content type: `content_router.py <url>`
3. Crawl with orchestrator: `orchestrator.py crawl <url>`
4. Check changes: `change_detector.py check <url>`
5. Run benchmark: `coverage_benchmark.py run`

## Content-Type Routing

- HTML -> html_extract (default)
- PDF -> pdf_extract (requires pdfplumber)
- Sitemap -> sitemap_extract (XML parsing)
- RSS/Atom -> rss_extract (feed parsing)
- API/JSON -> api_extract (JSON parsing)
- Forum -> forum_extract (post detection)
- Code -> code_extract (GitHub/GitLab)
- Media -> media_extract (metadata only)

## Browser Sessions (for interactive pages)

Use browser_session.py for:
- Login-required pages
- Form filling
- Cloudflare bypass
- Dynamic JS rendering
- Session persistence

```bash
# Create session
browser_session.py create --id my_session

# Navigate and extract
browser_session.py extract my_session https://example.com
```

## Change Detection

Track page versions and detect changes:

```bash
# Record snapshot
change_detector.py record <url> <content_file>

# Check for changes
change_detector.py check <url>

# Get version history
change_detector.py history <url>

# Set re-crawl policy
change_detector.py policy <url> --interval 24
```

## Coverage Benchmark

Test system ability to find hidden answers:

```bash
# List test cases
coverage_benchmark.py list

# Run benchmark
coverage_benchmark.py run

# Get report
coverage_benchmark.py report
```

## YouTube Chain — Deep Research (3-ступенчатый fallback)

Deep Research понимает YouTube-обзоры целиком: находит видео, каналы, плейлисты и извлекает транскрипт-понимание с таймкодами, а не только качает субтитры.

> **HARD RULE — YouTube watch-URL → yt-transcript only:** `watch?v=` / `youtu.be/` / `shorts/` → `node .opencode/bin/yt-transcript.cjs --format text` (Stage1 transcript_api → Stage2 write-sub → Stage3 tiny). `crawl4ai_extract` для watch-URL ЗАПРЕЩЁН (JS/bot-wall → empty/NaN). POT/BGUTIL `:4416` — explicitly OPTIONAL (fail-soft, цепь даёт 1239 entries без него). SearXNG только `:8080`. /tmp эфемерен — пруфы хранить в `.opencode/specs/055-*/research/` или `.opencode/docs/`, не в `/tmp`.

**Транскрипт-фоллбэк (cloud-friendly, без скачки видео):**
1) `youtube_transcript_api` — cloud, без скачки, primary в cloud (см. .opencode/scripts/youtube-pipeline/extract.sh:14-27), работает при 403 yt-dlp
2) `yt-dlp --write-sub --write-auto-sub --sub-lang <lang> --skip-download --convert-subs srt` — primary для `node .opencode/bin/yt-transcript.cjs <id> --lang en --format text` (см. yt-transcript.cjs:96-104)
3) `yt-dlp --extract-audio --audio-format mp3 + whisper base` — крайний fallback только если первые два вернули `no_transcript`; whisper локально не ставить, не качать видео целиком (EXCLUDES)

**Команды (thin wrapper над youtube-skills паттерном, без npm-установки — API как future):**
- `youtube search "<query>" --max 5` — поиск видео по ключу (future, сейчас SearXNG `site:youtube.com`)
- `youtube channel <handle|id> --videos 10` — последние видео канала
- `youtube playlist <id|url>` — плейлист и его видео
- `youtube transcript <url|id> --lang en --format text|json|srt` — сейчас `node .opencode/bin/yt-transcript.cjs <url> --lang en --format text`

Валидация `videoId` по `^[A-Za-z0-9_-]{11}$` иначе `INVALID_VIDEO_ID`, кэш `.cache/youtube_transcripts/<id>.json` atomic write, при cloud 403 автоматический fallback к `transcript_api`, иначе `no_transcript` + описание/комментарии.

## Forums / JS-hard — Trafilatura + Jina Reader Fallback (100% покрытие)

Trafilatura 2.2.0 — best для форумов Discourse/phpBB/XenForo/XenForo per arxiv.org/pdf/2605.21097; Jina Reader — 10M free tokens без MCP/curl only.

**Цепочка (понятна Hermes Deep Research):** `SearXNG → Crawl4AI → if fail/403/empty → Jina Reader → if JS/Cloudflare/dynamic → BrowserUse (opencode.json:108) открывает JS/Cloudflare → trafilatura.extract(html) → markdown`

BrowserUse (opencode.json:108) открывает JS/Cloudflare → trafilatura.extract(html) → markdown, fallback Jina Reader: curl -H "X-Timeout: 15" -H "X-No-Cache: true" -H "Authorization: Bearer $JINA_API_KEY" -H "X-Retain-Images: none" https://r.jina.ai/http://URL (20 RPM no-key / 500 free / 10M free, X-Cache-Tolerance 5 min Warning cached → X-No-Cache:true for fresh).

```bash
# 1) Trafilatura — прямой extract html→markdown (форумы Discourse/phpBB/XenForo)
python3 -c "import trafilatura; html=open('page.html').read(); print(trafilatura.extract(html, output_format='markdown'))"
# или CLI (без кода)
trafilatura --output_format markdown --inputfile page.html

# 2) Jina Reader — curl fallback когда Crawl4AI вернул пустоту/403 (20 RPM no-key / 500 free / 10M free, без MCP, r.jina.ai canonical)
curl -H "X-Timeout: 15" -H "X-No-Cache: true" -H "Authorization: Bearer $JINA_API_KEY" https://r.jina.ai/http://4pda.to/forum/index.php?showtopic=12345
curl https://r.jina.ai/http://forum.xda-developers.com/t/rom-xyz.12345
curl https://r.jina.ai/http://discourse.example.com/t/topic/42

# 3) JS-hard / Cloudflare → BrowserUse → trafilatura
# browser-use открывает страницу с JS/Cloudflare (opencode.json:108), затем trafilatura чистит html
browser-use extract https://4pda.to/forum/index.php?showtopic=12345  # → html
python3 -c "import trafilatura; print(trafilatura.extract(open('/tmp/page.html').read(), output_format='markdown'))"
```

Тон: не ставить Exa/Firecrawl/Tavily/ScrapeGraph/Bright Data — только этот chain (ponytail minimal). См. `.opencode/docs/forum-scraping.md`.

## Routing Rules

- github.com -> GitHub MCP
- youtube.com / youtu.be -> YouTube Chain (см. секцию выше) — команды `youtube search/channel/playlist/transcript`
- twitter.com/x.com -> Agent Reach `twitter_search` (primary) → SearXNG site:x.com fallback
- reddit.com -> Agent Reach `reddit_search` (primary) → SearXNG site:reddit.com fallback
- xhs/xiaohongshu & bilibili -> Agent Reach `xhs_search` / `bilibili_search` (primary) → browser-use fallback
- login/form-fill/Cloudflare -> browser_session.py (generic) or browser-use MCP (opencode.json:108)
- extracting known URLs -> Crawl4AI
- deep research -> orchestrator.py (+ Agent Reach as social sourceType)
- ELSE -> Local Index -> SearXNG -> Query Rewrite -> SearXNG -> STOP
- Social EXTRA budget: 1 call only for social queries, never counted against generic chain

## Confidence Zones (SEPARATE)

Memory Recall: >= 0.6 use cached, < 0.6 go to internet
Internet Search: >= 0.5 usable, < 0.5 try query rewrite
Final Answer: >= 0.8 HIGH, 0.5-0.8 MEDIUM, < 0.5 LOW

## Available Tools (RESTRICTED)

- searxng_search: PRIMARY (generic web, opencode.json:85, .utcp_config.json searxng)
- crawl4ai_extract: EXTRACTION (opencode.json:96)
- youtube: CHAIN (search/channel/playlist/transcript, yt-transcript.cjs primary, 3-ступенчатый fallback: transcript_api → yt-dlp --write-sub → yt-dlp --extract-audio + whisper)
- agent-reach: SOCIAL (Reddit/Twitter/XHS/Bilibili — 1 extra call for social queries only, opencode.json:117)
- browser-use: INTERACTIVE (login/forms/Cloudflare ONLY, opencode.json:108) + social fallback
- github: CODE
- local_index: MEMORY
- frontier.py: CRAWL QUEUE
- content_router.py: CONTENT ROUTING
- change_detector.py: VERSIONING
- browser_session.py: STATEFUL BROWSING
- coverage_benchmark.py: TESTING
- qdrant: REMOVED (abandoned Aug 2026, see 029-qdrant-vector-backend)
- exa: DISABLED (sealed fallback only)

## Scripts Reference

### research_engine.py — Main Entry Point

Unified research workflow orchestrator. Ties all modules together.

```bash
# Full research workflow
python research_engine.py research "What is Python GIL?" --complexity moderate

# Search with local index fallback
python research_engine.py search "Python async await"

# Extract content from URL
python research_engine.py extract https://docs.python.org/3/

# Show engine status (all components)
python research_engine.py status --format json

# Show metrics dashboard
python research_engine.py metrics --format text

# Cleanup old data across all components
python research_engine.py cleanup --max-age 30
```

Options:
- `--db-dir PATH` — Directory for database files (default: scripts/)

### local_index.py — SQLite FTS5 Search Index

Caches search results locally with full-text search, deduplication, and importance scoring.

```bash
# Index a document
python local_index.py index --url URL --title TITLE --snippet SNIPPET

# Search local index
python local_index.py search "query" --limit 10

# Show index stats
python local_index.py stats

# Cleanup old documents
python local_index.py cleanup --max-age 30
```

### frontier.py — Crawl Queue Manager

Manages URL queue for deep research with priority scheduling, depth tracking, and domain budgets.

```bash
# Add URL to frontier
python frontier.py add <url> --depth 2 --priority 0.8

# Get next URLs to crawl
python frontier.py next --count 5

# Mark URL as visited
python frontier.py visited <url>

# Set domain budget
python frontier.py budget example.com --budget 50

# Set stop conditions
python frontier.py stop --max-urls 5000 --time-limit 7200

# Show frontier stats
python frontier.py stats
```

### content_router.py — Content-Type Router

Routes URLs to appropriate extractors based on content type detection.

```bash
# Route URL to extractor
python content_router.py route https://example.com/paper.pdf

# Detect content type
python content_router.py detect https://api.example.com/data

# List available extractors
python content_router.py extractors

# Register custom route
python content_router.py register custom_doc custom_extract --pattern '.*\.doc$'

# Show routing stats
python content_router.py stats
```

### orchestrator.py — Crawl Orchestrator

Coordinates deep crawl sessions using frontier and content router.

```bash
# Crawl single URL
python orchestrator.py crawl https://example.com --max-depth 3 --budget 50

# Crawl multiple URLs from file
python orchestrator.py crawl --seeds-file seeds.txt --max-depth 2

# Check session status
python orchestrator.py status --session-id <id>

# View results
python orchestrator.py results --session-id <id> --limit 20

# View logs
python orchestrator.py logs --session-id <id> --level error
```

### change_detector.py — Version Tracking

Tracks page versions and detects content changes for re-crawl decisions.

```bash
# Record page snapshot
python change_detector.py record <url> <content_file>

# Check for changes
python change_detector.py check <url> <content_file>

# Get version history
python change_detector.py history <url> --limit 10

# Set re-crawl policy
python change_detector.py policy <url> --interval 24

# Check if re-crawl needed
python change_detector.py needs-recrawl <url>

# Show stats
python change_detector.py stats
```

### evidence.py — Evidence Set Manager

First-class evidence objects with support/contradiction tracking and confirmation counting.

```bash
# Add evidence
python evidence.py add --source "docs.python.org" --url "URL" --quote "quote" --trust 0.8

# Get evidence by ID
python evidence.py get <id>

# Query evidence with filters
python evidence.py query --topic "json" --min-trust 0.5

# Find contradictions
python evidence.py contradictions

# Find confirmations
python evidence.py confirmations --claim-id "claim_id"

# Get summary
python evidence.py summary

# Export evidence
python evidence.py export --format json
```

### reasoner.py — Answer Synthesis

Synthesizes answers from evidence only. No direct answering from raw results.

```bash
# Synthesize from evidence
python reasoner.py synthesize "query" --evidence-id id1 --evidence-id id2
```

### critic.py — Answer Validation

Checks answers before release. Verifies claims, contradictions, and sources.

```bash
# Check answer
python critic.py check "answer" --query "original query"
```

### trust_model.py — Trust Scoring

Weighted trust scoring: domain (0.40) + authority (0.25) + freshness (0.20) + popularity (0.15).

```bash
# Score a URL
python trust_model.py score --url https://example.com

# Show domain trust table
python trust_model.py domains

# Update domain trust
python trust_model.py update example.com --trust 0.85

# Show stats
python trust_model.py stats
```

### confidence_model.py — Confidence Scoring

Multi-factor confidence: retrieval (0.35) + trust (0.25) + freshness (0.20) + agreement (0.20).

```bash
# Compute confidence
python confidence_model.py compute --query "query"

# Show zones
python confidence_model.py zones
```

### research_planner.py — Research Strategy

Handles budget, cost, iterations, and source selection with learning-aware weighting.

```bash
# Plan research
python research_planner.py plan "query" --complexity moderate

# Show budget options
python research_planner.py budgets
```

### metrics.py — Metrics Database

Tracks search requests, escalations, extractions, and daily aggregated statistics.

```bash
# Log a search event
python metrics.py log-search --query "query" --tool searxng --latency 150

# Show stats
python metrics.py stats

# Query events
python metrics.py query --tool searxng --limit 50
```

### dashboard.py — Operational Reports

Read-only dashboard with hit rates, escalation rates, tool latency, and trust distributions.

```bash
# Generate full report
python dashboard.py report --format json

# Hit rate summary
python dashboard.py hit-rate

# Tool latency
python dashboard.py latency
```

### observability.py — Distributed Tracing

Tracing, health checks, and alerting for search router operations.

```bash
# Start trace
python observability.py start --operation "search"

# Finish trace
python observability.py finish <trace_id> --status ok

# Health check
python observability.py health

# Show recent traces
python observability.py traces --limit 20
```

### learning_loop.py — Adaptive Learning

Adjusts weights based on feedback. Tracks query logs, source reliability, and tool success rates.

```bash
# Log feedback
python learning_loop.py feedback --query-id Q1 --type accurate

# Show learning stats
python learning_loop.py stats

# Get weight adjustments
python learning_loop.py weights
```

### browser_session.py — Stateful Browsing

Session management for login-required pages, form filling, and Cloudflare bypass.

```bash
# Create session
python browser_session.py create --id my_session

# Navigate and extract
python browser_session.py extract my_session https://example.com

# Destroy session
python browser_session.py destroy my_session
```

### coverage_benchmark.py — Testing

Tests system ability to find hidden answers across the research pipeline.

```bash
# List test cases
python coverage_benchmark.py list

# Run benchmark
python coverage_benchmark.py run

# Get report
python coverage_benchmark.py report
```

### search_local.py — Local Search Helper

Quick local search wrapper for FTS5 index queries.

```bash
python search_local.py "query" --limit 10
```

### index_utils.py — Shared Utilities

Content hashing, domain extraction, freshness calculation, and deduplication helpers.

## Anti-Patterns (FORBIDDEN)

- Same query to SearXNG + Exa + Tavily
- websearch/webfetch when SearXNG exists
- browser-use for simple search (use only for login/Cloudflare or social fallback after Agent Reach)
- Multiple extractors on same URL
- Query rewrite without checking local index first
- Auto-indexing low-confidence results
- Generic web via Agent Reach (social chain ONLY for Reddit/Twitter/XHS/Bilibili; generic web stays SearXNG/Crawl4AI)
- Twitter chain beyond Agent Reach → SearXNG site:x.com → browser-use (do not invent extra hops)
