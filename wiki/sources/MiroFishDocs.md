---
title: "MiroFish Documentation"
type: source
tags: [mirofish, source, readme, source-code]
related: "[[entities/MiroFish]], [[entities/ZepCloud]], [[concepts/SwarmIntelligence]], [[concepts/MultiAgentSimulation]]"
source_count: 1
updated: 2026-04-16
---

# MiroFish Documentation

**Raw sources:**
- `raw/666ghjMiroFish...md` — clipped README จาก GitHub
- `raw/MiroFish-main/` — source code (แตกจาก MiroFish-main.zip)

---

## Key Takeaways

### Architecture
- **Backend**: Python Flask + CAMEL-OASIS + Zep Cloud
- **Frontend**: Vue 3 (แยกจาก OmniLife ที่ใช้ React)
- **Docker**: image เดียว run ทั้ง frontend (3000) + backend (5001)
- **LLM**: OpenAI SDK format, base_url ปรับได้ → ใช้ Gemini ได้

### ไฟล์สำคัญที่อ่านแล้ว

| File | สิ่งที่เรียนรู้ |
|---|---|
| `backend/app/config.py` | LLM_BASE_URL configurable, Zep API key required |
| `backend/app/utils/llm_client.py` | ใช้ OpenAI SDK, รองรับ JSON mode |
| `backend/app/services/graph_builder.py` | Zep standalone graph, async build |
| `backend/app/services/simulation_config_generator.py` | Agent activity config, timezone-aware |
| `backend/app/services/oasis_profile_generator.py` | Agent persona structure (MBTI, profession, stance) |
| `backend/requirements.txt` | flask, openai, zep-cloud, camel-oasis, PyMuPDF |
| `docker-compose.yml` | Single container, volumes for uploads |

### Deployment Options
1. **Docker** (แนะนำ) — `docker compose up -d`
2. **Manual** — `npm run setup:all` + `npm run dev`

### Cost Profile (Free Setup)
```
MiroFish software  → ฿0 (open source)
Gemini Flash API   → ฿0 (free tier, 1500 req/day)
Zep Cloud          → ฿0 (free tier)
Oracle Cloud VM    → ฿0 (always free 4 OCPU / 24GB RAM)
─────────────────────────────────────────────────────
Total              → ฿0/เดือน
```

---

## Simulation Performance

จาก config พบว่า:
- Default max rounds: 10 (ปรับได้ผ่าน `OASIS_DEFAULT_MAX_ROUNDS`)
- Docs เตือน: "High consumption, try <40 rounds first"
- Rate limiting กับ Gemini free (15 RPM) → simulation ช้าลง ~25-30 นาที

---

## Pages ที่ถูกอัปเดตจาก Ingest นี้

- [[entities/MiroFish]] — สร้างใหม่
- [[entities/ZepCloud]] — สร้างใหม่
- [[entities/GeminiAI]] — สร้างใหม่ (Gemini endpoint สำหรับ MiroFish)
- [[concepts/SwarmIntelligence]] — สร้างใหม่
- [[concepts/MultiAgentSimulation]] — สร้างใหม่
- [[overview]] — cost analysis + architecture diagram
