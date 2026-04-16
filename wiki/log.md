# Wiki Log

Append-only chronological record of all wiki operations.
Parse with: `grep "^## \[" wiki/log.md | tail -10`

---

## [2026-04-16] init | Wiki created

Wiki initialized for OmniLife Suit research vault.
- Created CLAUDE.md schema
- Created wiki/index.md, wiki/log.md, wiki/overview.md
- Created 4 entity pages: OmniLifeSuit, MiroFish, ZepCloud, GeminiAI
- Created 3 concept pages: SwarmIntelligence, MultiAgentSimulation, LLMWiki
- Created 2 source pages: MiroFishDocs, DeploymentGuide
- Ingested: `raw/666ghj...MiroFish.md` (MiroFish README)
- Ingested: `DEPLOYMENT_GUIDE.md` (GitHub Pages deployment guide)
- Ingested: `raw/MiroFish-main/` (MiroFish source code — partial, key files only)

**Key findings from initial ingest:**
- MiroFish uses OpenAI-compatible SDK → can point to Gemini Flash endpoint
- Zep Cloud free tier sufficient for personal use
- 1 Trade simulation ≈ 245K tokens ≈ ฿0.70 (Qwen) or ~฿0 (Gemini free tier)
- Oracle Cloud Always Free = best zero-cost server option
- MiroFish simulates market **sentiment**, not exact price prediction

---

## [2026-04-16] ingest | MiroFish Documentation

Source: `raw/666ghjMiroFish...md` + `raw/MiroFish-main/`
Pages touched: OmniLifeSuit, MiroFish, ZepCloud, GeminiAI, SwarmIntelligence, MultiAgentSimulation, sources/MiroFishDocs

---

## [2026-04-16] ingest | Deployment Guide

Source: `DEPLOYMENT_GUIDE.md`
Pages touched: OmniLifeSuit, sources/DeploymentGuide

---

## [2026-04-16] setup | MiroFish MacBook Setup

Goal: Run MiroFish on MacBook (free), access from mobile via WiFi
Files created:
- `raw/MiroFish-main/MiroFish-main/.env` — Gemini Flash config (placeholders)
- `wiki/guides/SetupMiroFish.md` — step-by-step setup guide
- `wiki/guides/TradeSeedTemplate.md` — Trade simulation seed templates
- `wiki/index.md` — updated with Guides section

**MacBook local IP**: 172.20.10.5  
**Mobile access URL**: http://172.20.10.5:3000 (same WiFi only)

**Pending actions (user must do):**
1. ติดตั้ง Docker Desktop
2. สมัคร Zep Cloud (app.getzep.com) → copy API key
3. ใส่ Gemini API key + Zep API key ใน `.env`
4. `docker compose up -d`
