# RIG Key Bank & Priority Dispatch — Design Spec

**Date:** 2026-10-16
**Status:** Approved approach (A — flat key-pool dispatcher), awaiting spec review
**Scope:** app.py (dispatch core), assets/js/app.js + index.html + index.css (key cards, priority UI)

## Goals

1. **Spread load across all keys in parallel** — every LLM call picks the least-used healthy key, not key #1 until it breaks.
2. **Per-key visual cards** — status pill (active / cooling / disabled), enable-disable toggle, remove.
3. **Custom provider priority** — user orders providers (↑↓); order drives dispatch.
4. **Persistent key health** — 429 → 30 s cooldown (self-heals); 401/403/404 → disabled until user re-enables (survives reloads).
5. **Faster generation** — concurrency = `min(pool_size, 8)` (today: 4).
6. **Stronger context** — richer blueprint prompt; full blueprint JSON injected into every document prompt.

## Current State (what we're replacing)

```
TODAY: sequential per-provider, key #1 hammering
─────────────────────────────────────────────────
call_llm_with_fallback(prompt):
  for provider in [selected, groq, openrouter, gemini, ollama]:
      for key in provider.keys:                 # key#1 does EVERYTHING
          retry 3× (429 → sleep → same key)
          401/404 → next key
  ← one call = one sequential walk; Semaphore(4) workers all walk it together

UI: one textarea per provider (newline keys) — no status, no order control
```

## Target Architecture

```
┌────────────────────────── FRONTEND (app.js / index.html) ──────────────────────────┐
│                                                                                    │
│  Provider Priority (localStorage: rig_provider_order)        Key Cards (per tab)   │
│  ┌───────────────────────────┐    ┌──────────────────────────────────────────┐     │
│  │ 1. Groq        ↑ ↓        │    │ [gsk_…A1B2 ●active  [o] ✕]              │     │
│  │ 2. OpenRouter  ↑ ↓        │    │ [gsk_…C3D4 ⏳cooling [o] ✕]              │     │
│  │ 3. Gemini      ↑ ↓        │    │ [gsk_…E5F6 ●disabled[○] ✕]  ← re-enable │     │
│  │ 4. Ollama       ↑ ↓        │    │ textarea: paste keys → "Add" → cards    │     │
│  └───────────────────────────┘    └──────────────────────────────────────────┘     │
│           │ rig_provider_order                 │ rig_keys_<prov>, rig_keys_disabled│
│           └──────────────┬─────────────────────┘                                  │
│                          ▼  POST /api/generate                                    │
│       { …, providerOrder: ["groq",…], disabledKeys: ["gsk_…E5F6", …] }            │
└──────────────────────────────────────────┬─────────────────────────────────────────┘
                                           ▼
┌────────────────────────────── BACKEND (app.py) ────────────────────────────────────┐
│  build_pool(payload)                                                               │
│    for prov in providerOrder:            # user's priority, then fallbacks         │
│        for key in prov.keys if key not in disabledKeys:                            │
│            pool += Entry{prov, key, model, used=0, state, cooldown_until}          │
│        ollama → single entry (url-validated)                                       │
│                                                                                    │
│  call_llm(prompt):                                     job["keyStatus"]           │
│    healthy = [e for e in pool if not cooling & not disabled]      │                │
│    e = min(healthy, key=used)         ← least-used-first spread   │ poll returns   │
│    try: call provider(e) → success: e.used++ ✅                    ▼  to frontend  │
│    429 → e.cooldown_until = now+30s → try next healthy ──► {"groq#1":              │
│    401/403/404 → e.state = disabled → try next           │  {state:"cooldown"}}    │
│    other → retry 2×, then next entry                                     │        │
│    ALL dead → raise "All providers failed" ◄───────────────────────────┘          │
│                                                                                    │
│  run_job: Semaphore(min(len(pool), 8))  … blueprint first, then doc gather         │
└────────────────────────────────────────────────────────────────────────────────────┘
                                           ▼
                         Groq / OpenRouter / Gemini / Ollama APIs
```

### Dispatch decision flow (per LLM call)

```
             pick least-used entry from healthy pool
                        │
        ┌───────────────┼──────────────────┐
        ▼               ▼                  ▼
   provider call    HTTP 429          HTTP 401/403/404
        │               │                  │
     success      cooldown 30s         state = DISABLED
     used +=1     (auto-heals,        (card red, stays off
        │          next entry)         until user re-enables)
        ▼               └──────► try next ◄──────┘
   return (content, prov)              │
                              pool empty?
                            ┌────┴────┐
                           no         yes
                            │          │
                         retry      raise error
```

### Job timeline

```
POST /api/generate
   │
   ▼
[1] build_pool (order = providerOrder, minus disabledKeys)
   │
   ▼
[2] BLUEPRINT  ── 1 call through pool (temp 0.3)
   │              prompt: enriched "master context" instructions
   ▼
[3] DOCS  × N   ── Semaphore(min(pool,8)) concurrent gather, order preserved
   │              each prompt embeds:  MASTER CONTEXT: {full blueprint JSON}
   ▼
[4] zip + status="done"; job["keyStatus"] shipped on every poll
```

### UI wireframe (Step 1 of wizard — provider section)

```
┌ Providers ────────────────────────────────────────────────────────┐
│ ( Groq )( Ollama )( Gemini )( OpenRouter )                        │
├──────────────────────────────────────────────────────────────────┤
│ Model        [ qwen/qwen3.8-27b ▾ ]                              │
│                                                                            │
│ API Keys     ┌────────────────────────────────────────────────┐   │
│              │ gsk_…A1B2  ● active      [⏸] [✕]              │   │
│              │ gsk_…C3D4  ⏳ cooling 22s [⏸] [✕]              │   │
│              │ gsk_…E5F6  ✖ disabled     [▶] [✕]              │   │
│              └────────────────────────────────────────────────┘   │
│              [ textarea: paste one key per line …  ] [Add]        │
│              Keys stay in browser localStorage.                   │
├──────────────────────────────────────────────────────────────────┤
│ Provider Priority                                                 │
│  1 Groq [↑][↓]   2 OpenRouter [↑][↓]   3 Gemini [↑][↓]   4 Ollama [↑][↓] │
└──────────────────────────────────────────────────────────────────┘
```

## Data Model

| Store | Key | Value |
|---|---|---|
| localStorage | `rig_keys_<prov>` | `["key1", …]` (unchanged) |
| localStorage | `rig_provider_order` | `["groq","openrouter","gemini","ollama"]` |
| localStorage | `rig_keys_disabled` | `["gsk_…E5F6", …]` (key strings) |
| payload | `providerOrder` | `list[str]` (new) |
| payload | `disabledKeys` | `list[str]` (new) |
| app.py (module) | `_cooldowns` | `{key_str: expire_ts}` — survives across jobs, resets on server restart |
| job dict | `keyStatus` | `{"groq#0": {state, used, cooldownLeft}, …}` — returned by `/api/status` |
| Entry (in-pool) | — | `{prov, idx, key, model, url, used, state: healthy\|cooldown\|disabled, cooldown_until}` |

**Key health matrix:**

| Event | Entry state | Recovery |
|---|---|---|
| success | `used++` | — |
| HTTP 429 | `cooldown`, 30 s | automatic |
| HTTP 401 / 403 / 404 | `disabled` | manual toggle in UI (clears `rig_keys_disabled` entry) |
| other error | retry 2× (2 s), then next entry | entry stays healthy |
| all entries dead | job/doc error (existing path) | user fixes keys |

## Implementation Steps

### Phase 1 — Backend dispatch core (app.py)

1. `GenerateRequest`: add `providerOrder: list[str] = []`, `disabledKeys: list[str] = []`.
2. Add module-level `Entry` logic (dict is fine — no class needed) + `_cooldowns: dict[str, float]`.
3. `build_pool(req, llm)`: iterate `req.providerOrder or PROVIDERS`; validate each name against known set; append one entry per non-disabled key; ollama → one entry if `_ollama_ok`. Store pool on the job.
4. Rewrite `call_llm_with_fallback` → `call_llm(pool, job, prompt, system, temp)`:
   - healthy filter (`state==healthy` and not cooling), pick `min(…, key=used)`,
   - call by `prov` (existing `call_groq/openrouter/gemini/ollama` functions unchanged),
   - outcomes per health matrix; update `entry` + `_cooldowns` + `job["keyStatus"][f"{prov}#{idx}"]`,
   - exhausted → `raise Exception("All providers failed: …")` (redacted messages as today).
5. `run_job`: build pool first; `sem = asyncio.Semaphore(min(len(pool), 8))`; thread `pool`/`job` through blueprint + doc calls; keep ordered gather + zip flow as-is.
6. `/api/status`: include `keyStatus`.

### Phase 2 — Blueprint as master context (app.py)

7. `generate_blueprint` prompt: add explicit role ("You are the master context for 44 downstream consulting documents; return complete, specific JSON — no empty strings where real data can be inferred; stakeholders/milestones must be concrete").
8. `generate_document` prompt: prepend `MASTER CONTEXT (stay factually consistent with this across all documents):\n{json.dumps(blueprint, ensure_ascii=False)}` and keep the existing per-field lines below it.

### Phase 3 — Frontend key cards + priority (app.js, index.html)

9. State: `S.keyOrder` (from `rig_provider_order`, default `["groq","openrouter","gemini","ollama"]`), `S.disabled` (Set from `rig_keys_disabled`).
10. Key area: render cards for current provider from `loadKeys(prov)`: masked tail (`…A1B2`), status pill (from `S.keyStatus` cache if present, else enabled→`active`), pause/resume toggle (edits `rig_keys_disabled`), ✕ (removes from `rig_keys_*`). Textarea + **Add** button appends lines as keys (textarea no longer the source of truth; cleared after add).
11. Priority list: 4 rows with ↑↓ swapping `S.keyOrder`, saved to localStorage; rendered under `#api-key-wrap`.
12. `startGeneration` payload: add `providerOrder: S.keyOrder`, `disabledKeys: [...S.disabled]`.
13. Poll: merge `st.keyStatus` into `S.keyStatus`; on `state:"disabled"` also persist to `rig_keys_disabled`; log events to ticker (`groq key#2 cooling down`, `openrouter key#1 disabled`).

### Phase 4 — Styles + polish (index.css)

14. `.key-card`, `.key-pill.{active,cooling,disabled}`, `.prio-row` styles (~30 lines, zinc+indigo theme, existing CSS variables).

### Phase 5 — Verification

15. Backend unit-style checks (TestClient, stubbed `call_*`): pool ordering honors `providerOrder`; least-used spread across 2+ keys; 429 → cooldown entry skipped then used again after expiry; 401 → disabled + `keyStatus` reflects it; `disabledKeys` excluded from pool; concurrency cap = `min(pool,8)`; blueprint JSON present in captured doc prompts.
16. `py_compile` + `node --check` + integration smoke (existing `/tmp/opencode/rig_smoke.py` updated for `keyStatus`).
17. Manual E2E with 2 real Groq keys: watch `used` counts spread, generation wall-clock drop vs baseline.

## Error Handling

- Empty pool (all disabled / none added) → fail fast at `/api/generate` with clear message: `"No enabled API keys"`.
- `providerOrder` containing unknown names → ignored (fall back to `PROVIDERS` defaults for missing slots).
- Cooldowns in `_cooldowns` are best-effort in-memory (server restart clears them — acceptable for a local app).
- Per-doc failure path, redaction, SSRF guard, 45-doc cap: unchanged.

## Out of Scope (YAGNI)

- Drag-and-drop ordering (↑↓ buttons suffice)
- Per-provider worker queues (Approach B — rejected)
- Server-side persistence of key health (browser owns it)
- Streaming/token UI, response caching, key auto-import from env

## Files Touched

| File | Change |
|---|---|
| `app.py` | pool builder, `call_llm` rewrite, `keyStatus`, semaphore sizing, blueprint/doc prompts (~+120/−60) |
| `assets/js/app.js` | cards, priority, payload, status merge (~+90) |
| `index.html` | key area + priority markup (~+15) |
| `assets/css/index.css` | card/pill/row styles (~+30) |
| `README.md` | one paragraph: keys & priority |

**No new dependencies. Stdlib + existing stack only.**
