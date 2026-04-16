---
title: "Multi-Agent Simulation"
type: concept
tags: [ai, oasis, camel, simulation, agents]
related: "[[entities/MiroFish]], [[entities/ZepCloud]], [[concepts/SwarmIntelligence]]"
source_count: 1
updated: 2026-04-16
---

# Multi-Agent Simulation

Implementation ของ [[concepts/SwarmIntelligence]] ใน [[entities/MiroFish]]
ผ่าน **CAMEL-OASIS framework** — จำลอง social media platform
ที่ agents มีปฏิสัมพันธ์กันแบบ Twitter และ Reddit

---

## CAMEL-OASIS Framework

- **Library**: `camel-oasis==0.2.5` + `camel-ai==0.2.78`
- **Platforms**: Twitter-style + Reddit-style (run พร้อมกัน)
- **Open source**: ไม่มีค่าใช้จ่าย

### Actions ที่ Agent ทำได้

**Twitter platform:**
`CREATE_POST`, `LIKE_POST`, `REPOST`, `FOLLOW`, `DO_NOTHING`, `QUOTE_POST`

**Reddit platform:**
`LIKE_POST`, `DISLIKE_POST`, `CREATE_POST`, `CREATE_COMMENT`,
`LIKE_COMMENT`, `DISLIKE_COMMENT`, `SEARCH_POSTS`, `TREND`, `FOLLOW`

---

## Agent Profile Structure

แต่ละ agent มี persona ที่สร้างจาก Zep graph entities:

```python
@dataclass
class OasisAgentProfile:
    user_id: int
    name: str
    bio: str
    persona: str        # detailed personality
    age: int
    gender: str
    mbti: str           # เช่น INTJ, ENFP
    profession: str
    interested_topics: List[str]
    activity_level: float    # 0.0 - 1.0
    sentiment_bias: float    # -1.0 (negative) to 1.0 (positive)
    stance: str         # supportive / opposing / neutral / observer
```

---

## Simulation Flow

```
Seed Text (เช่น trade history)
        ↓
Zep Cloud → Knowledge Graph (entities + relationships)
        ↓
OasisProfileGenerator → Agent Personas (10-30 agents)
        ↓
SimulationConfigGenerator → Round config, timing, events
        ↓
OASIS Simulation (20-40 rounds × agents)
  ├── Twitter platform
  └── Reddit platform
        ↓
ZepGraphMemoryUpdater → อัปเดต memory หลัง simulate
        ↓
ReportAgent → Prediction Report
```

---

## Token Usage

| ขั้นตอน | ~Tokens (Trade module) |
|---|---|
| Graph building | 10,000 |
| Agent profiles (15 agents) | 30,000 |
| Simulation (25 rounds × 15 agents) | 185,000 |
| Report generation | 20,000 |
| **รวม** | **~245,000** |

---

## Related

- [[concepts/SwarmIntelligence]] — แนวคิดพื้นฐาน
- [[entities/MiroFish]] — ระบบที่ใช้ framework นี้
- [[entities/ZepCloud]] — memory layer
