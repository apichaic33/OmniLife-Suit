---
title: "MiroFish"
type: entity
tags: [ai, prediction, python, flask, multi-agent, swarm]
related: "[[entities/OmniLifeSuit]], [[entities/ZepCloud]], [[entities/GeminiAI]], [[concepts/SwarmIntelligence]], [[concepts/MultiAgentSimulation]]"
source_count: 2
updated: 2026-04-16
---

# MiroFish

**Next-generation AI prediction engine** powered by multi-agent swarm simulation.
สร้างโลกดิจิทัลคู่ขนานจาก seed data และ simulate ด้วย agents หลายพันตัว
เพื่อพยากรณ์ผลลัพธ์ในอนาคต

- **Repo**: `666ghj/MiroFish` (MIT License — ฟรี open source)
- **Source**: `raw/MiroFish-main/`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python ≥3.11 + Flask |
| Frontend | Vue 3 + Vite (แยกจาก OmniLife) |
| LLM | OpenAI SDK (configurable base_url) |
| Memory | [[entities/ZepCloud]] |
| Simulation | CAMEL-OASIS (camel-oasis==0.2.5) |
| Package mgr | `uv` (Python) |
| Deploy | Docker (port 3000 frontend / 5001 backend) |

---

## Workflow (5 ขั้นตอน)

```
1. Graph Build   → Zep Cloud สร้าง Knowledge Graph จาก seed text
2. Env Setup     → Extract entities, generate agent personas
3. Simulation    → OASIS run Twitter/Reddit-style agents หลาย rounds
4. Report Gen    → ReportAgent สร้าง prediction report
5. Interaction   → Chat กับ agent ใน simulated world
```

---

## LLM Configuration

```env
LLM_API_KEY=...
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1  ← default (Qwen)
LLM_MODEL_NAME=qwen-plus
```

สามารถเปลี่ยน base_url เป็น [[entities/GeminiAI]] ได้:
```env
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL_NAME=gemini-2.0-flash
```

---

## Token Usage ต่อ Simulation

| Use Case | Tokens โดยประมาณ | ค่าใช้จ่าย (Gemini free) |
|---|---|---|
| Trade only (20 rounds, 15 agents) | ~245,000 | ฿0 |
| Full Finance simulation (40 rounds, 25 agents) | ~1,000,000 | ฿0 |

**Free tier limit**: Gemini Flash 1,500 req/day → ~4 simulations/วัน

---

## สิ่งที่ MiroFish ทำได้ vs ไม่ได้

| ทำได้ | ไม่ได้ |
|---|---|
| Simulate market sentiment | Predict exact prices |
| สร้าง "what-if" scenarios | Real-time data |
| วิเคราะห์ public opinion dynamics | Guaranteed outcomes |
| สร้าง prediction report แบบ rich | Short-term HFT signals |

---

## ค่าใช้จ่ายรวม (Free Setup)

| บริการ | ค่าใช้จ่าย |
|---|---|
| MiroFish (software) | ฿0 — open source |
| [[entities/GeminiAI]] API | ฿0 — free tier |
| [[entities/ZepCloud]] | ฿0 — free tier |
| Server (Mac local) | ฿0 — เปิดเครื่องตอนใช้ |
| Server (Oracle Cloud) | ฿0 — always free tier |

---

## Related

- [[concepts/SwarmIntelligence]] — แนวคิดหลักเบื้องหลัง
- [[concepts/MultiAgentSimulation]] — OASIS framework
- [[sources/MiroFishDocs]] — source summary
- [[overview]] — integration plan
