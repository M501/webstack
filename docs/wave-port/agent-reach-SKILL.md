---
name: agent-reach
description: Social UGC reach via Agent Reach MCP for Reddit, Twitter/X, XHS, Bilibili search/fetch with optional $1 proxy and browser-use fallback.
allowed-tools: [Read, Bash, Glob, Grep, Write]
version: 1.0.0
---

<!-- Keywords: agent-reach, reddit, twitter, xhs, bilibili, social search, utcp, proxy -->

# Agent Reach — Social Chain for Deep Research

Thin wrapper for Agent Reach MCP (UTCP): добивает Reddit/Twitter/XHS/Bilibili где SearXNG/Crawl4AI слепы. Интеграция через `opencode.json:117` и `search-router` social chain.

## 1. WHEN TO USE

### Activation Triggers

**Use when**:
- Запрос содержит Reddit, Twitter/X, XHS Xiaohongshu, Bilibili или UGC мнения (`spec.md:62`)
- Generic SearXNG `searxng_search` вернул пусто/низкую релевантность для social контента
- Deep Research требует social sourceType (`plan.md:89`)

**Keyword Triggers**:
- `reddit`, `twitter`, `x.com`, `xhs`, `xiaohongshu`, `bilibili`, `agent-reach`

> **HARD RULE — YouTube watch-URL → yt-transcript only:** `watch?v=` / `youtu.be/` / `shorts/` → `node .opencode/bin/yt-transcript.cjs --format text` (Stage1 transcript_api → Stage2 write-sub → Stage3 tiny). `crawl4ai_extract` для watch-URL ЗАПРЕЩЁН (JS/bot-wall → empty/NaN). POT/BGUTIL `:4416` — explicitly OPTIONAL (fail-soft, цепь даёт 1239 entries без него). SearXNG только `:8080`. /tmp эфемерен — пруфы хранить в `.opencode/specs/055-*/research/` или `.opencode/docs/`, не в `/tmp`.

> **DEFER — youtube transcript → YouTube Chain (youtube SKILL + yt-transcript.cjs).** Agent Reach НЕ владеет YouTube transcript; зона ответственности — только Reddit/Twitter/XHS/Bilibili.

### When NOT to Use

**Do not use for**:
- Generic web без social платформы — остаётся SearXNG/Crawl4AI primary chain (`search-router/SKILL.md:17`)
- Видео загрузка/публикация — out of scope (`spec.md:81`)
- Публикация постов — только search/fetch (`spec.md:83`)

---

## 2. SMART ROUTING

### Primary Detection Signal

```bash
# Social query detection
echo "$QUERY" | grep -qiE "reddit|twitter|x\.com|xhs|xiaohongshu|bilibili" && USE_AGENT_REACH=1
[ "$USE_AGENT_REACH" = 1 ] && ROUTE="social" || ROUTE="generic"
```

### Phase Detection

```text
QUERY
  ├─ social? (reddit/twitter/xhs/bilibili) → Agent Reach (1 call) → browser-use fallback
  └─ generic? → SearXNG → Crawl4AI (existing chain, no extra call)
```

### Resource Domains

- `references/` — provider notes, proxy/cookies guide
- `assets/` — doctor checklist snippets
- `.opencode/docs/agent-reach-setup.md:1` — install checklist (canonical)

### Resource Loading Levels

| Level | When to Load | Resources |
|-------|--------------|-----------|
| ALWAYS | Every invocation | This SKILL.md + setup doc |
| CONDITIONAL | Social query | Provider-specific notes |
| ON_DEMAND | Debug/proxy issue | Troubleshooting playbook |

### Smart Router Pseudocode

```python
from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent
RESOURCE_BASES = (SKILL_ROOT / "references", SKILL_ROOT / "assets")
DEFAULT_RESOURCE = ".opencode/docs/agent-reach-setup.md"

INTENT_SIGNALS = {
    "SOCIAL_SEARCH": {"weight": 4, "keywords": ["reddit", "twitter", "xhs", "bilibili"]},
    "YOUTUBE_DEFER": {"weight": 3, "keywords": ["youtube", "transcript"]},
    "DOCTOR": {"weight": 4, "keywords": ["doctor", "health", "check"]},
}
RESOURCE_MAP = {
    "SOCIAL_SEARCH": [".opencode/docs/agent-reach-setup.md"],
    "YOUTUBE_DEFER": [".opencode/skills/search-router/SKILL.md"],
    "DOCTOR": [".opencode/docs/agent-reach-setup.md"],
}
def _guard_in_skill(p): return p
def discover_markdown_resources(): return set()
UNKNOWN_FALLBACK_CHECKLIST = ["Confirm platform (reddit/twitter/xhs/bilibili)", "Provide query", "Check doctor output"]
```

---

## 3. HOW IT WORKS

### Overview

Agent Reach — единый MCP сервер с 8 инструментами: `reddit_search`, `twitter_search`, `xhs_search`, `bilibili_search`, `reddit_fetch`, `twitter_fetch`, `xhs_fetch`, `bilibili_fetch` (`spec.md:75`). Конфиг через UTCP providers, `agent-reach doctor` диагностика, SearxNG fallback без ключей.

**Flow**:
```text
User query (social) → search-router social chain → agent-reach *_search → *_fetch → synthesis
                                    ↓ (on fail) → browser-use fallback (opencode.json:108)
```

### Installation

```bash
# 1. Add skill
npx skills add Panniantong/Agent-Reach

# 2. Diagnose
agent-reach doctor

# 3. Verify MCP registered
cat opencode.json | grep -A5 agent-reach  # opencode.json:117
cat .utcp_config.json | grep agent-reach  # .utcp_config.json:2
```

### Examples

```bash
agent-reach reddit search "query"
agent-reach twitter search "openclaw vs opencode"
agent-reach xhs search "上海 美食 2026"
agent-reach bilibili search "rust async tutorial"
# youtube transcript → DEFER to YouTube Chain: node .opencode/bin/yt-transcript.cjs --format text (see search-router SKILL.md)
# canonical examples per task:
# agent-reach reddit search "query"
# agent-reach twitter search
agent-reach twitter search
```

Extract after search:

```bash
agent-reach reddit fetch <post_id>
agent-reach twitter fetch <tweet_id>
```

Budget: 1 extra call только для social queries, не для generic web (`search-router/SKILL.md:10`).

---

## 4. RULES

### ALWAYS

1. **ALWAYS проверять `agent-reach doctor` перед social вызовами** — green ≥2 платформ (`spec.md:112`).
2. **ALWAYS использовать SearXNG/Crawl4AI для generic web** — Agent Reach только для social где они слепы.
3. **ALWAYS соблюдать 1-call бюджет для social** — не добавлять параллельные fallback без необходимости.
4. **ALWAYS defer YouTube transcript → YouTube Chain (youtube SKILL + yt-transcript.cjs)** — Agent Reach за Reddit/Twitter/XHS/Bilibili, не за YouTube.

### NEVER

1. **NEVER публиковать посты** — только search/fetch (`spec.md:83`).
2. **NEVER хардкодить ключи в доках** — env `REDDIT_CLIENT_ID` и т.д. (`spec.md:168`).
3. **NEVER ломать primary SearXNG chain для generic web** — social chain отдельный.

### ESCALATE IF

1. **ESCALATE IF `agent-reach doctor` все платформы red** — проверить proxy $1 и cookies (`.opencode/docs/agent-reach-setup.md:15`).
2. **ESCALATE IF cloud :9224 падает без прокси** — применить mitigation из setup doc.
3. **ESCALATE IF 429/quota loop** — вернуть `retryAfter`, не ретраить бесконечно.

---

## 5. REFERENCES

### Core References

- `.opencode/docs/agent-reach-setup.md:1` — чеклист установки (cookies, $1 proxy, :9224 mitigation)
- `opencode.json:117` — MCP регистрация `agent-reach` (canonical `npx -y agent-reach mcp` (was `@agent-reach/mcp` 404), fallback UTCP `.utcp_config.json:agent-reach` + `browser-use` opencode.json:108; note `agent-reach@0.3.4` deprecated → `openclaw-agent-reach@0.6.14`, оба без bin но без 404, SearXNG/Crawl4AI ultimate fallback)
- `.opencode/skills/search-router/SKILL.md:26` — social chain policy и бюджет

### Templates and Assets

- Setup doc checklist — reusable install snippet

### Reference Loading Notes

- Load setup doc on every social call; keep search-router chain as authority for routing.

---

## 6. SUCCESS CRITERIA

**Complete when**:
- [ ] `agent-reach doctor` green ≥2 платформы
- [ ] `agent-reach reddit search "test"` → ≥5 результатов
- [ ] Social chain бюджет 1 extra call задокументирован (`search-router/SKILL.md:10`)
- [ ] Fallback `browser-use` (opencode.json:108) указан
- [ ] `cat opencode.json | python3 -m json.tool` без ошибок

---

## 7. INTEGRATION POINTS

### Search Router

Social chain: `Reddit/Twitter/XHS/Bilibili → Agent Reach (free, $1 proxy опц.) → browser-use` — только для social queries, generic web не трогать.

### Tool Usage

Use Bash for `agent-reach` CLI, Read for setup doc, Grep for verification.

### Knowledge Base Dependencies

**Required**: `opencode.json`, `.utcp_config.json`
**Optional**: proxy $1, cookies, cloud :9224

---

## 8. REFERENCES AND RELATED RESOURCES

The router discovers resources from `references/` and `assets/`. Start with `.opencode/docs/agent-reach-setup.md`, `.opencode/skills/search-router/SKILL.md`, then load provider-specific notes if present.

Related skills: `search-router` for routing, `deep-research` for sourceType integration, `system-spec-kit` for packet docs.

Install guide: `.opencode/docs/agent-reach-setup.md`
