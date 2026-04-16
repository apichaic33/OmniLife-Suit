---
title: "Zep Cloud"
type: entity
tags: [memory, graph, saas, knowledge-graph]
related: "[[entities/MiroFish]], [[concepts/MultiAgentSimulation]]"
source_count: 1
updated: 2026-04-16
---

# Zep Cloud

บริการ Knowledge Graph + Long-term Memory สำหรับ AI agents
ใช้ใน [[entities/MiroFish]] เพื่อเก็บ entity relationships และ agent memory

- **Website**: app.getzep.com
- **SDK**: `zep-cloud==3.13.0` (Python)

---

## หน้าที่ใน MiroFish

1. **Graph Build** — รับ seed text → สกัด entities และ relationships → สร้าง Knowledge Graph
2. **Agent Memory** — agents แต่ละตัวมี long-term memory ผ่าน Zep
3. **Query** — ReportAgent ดึง context จาก graph เพื่อสร้าง report

---

## Free Tier

จาก MiroFish docs: *"Free monthly quota is sufficient for simple usage"*

| Plan | ค่าใช้จ่าย | เหมาะกับ |
|---|---|---|
| Free | ฿0 | Personal use, ~4-10 simulations/วัน |
| Professional | ~฿1,700/เดือน | Production scale |

สำหรับ OmniLife Suit personal use: **Free tier เพียงพอ**

---

## Related

- [[entities/MiroFish]] — ใช้ Zep เป็น memory layer
- [[concepts/MultiAgentSimulation]] — agents ใช้ Zep memory
