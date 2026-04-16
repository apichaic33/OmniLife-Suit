---
title: "Swarm Intelligence"
type: concept
tags: [ai, simulation, prediction, emergence]
related: "[[entities/MiroFish]], [[concepts/MultiAgentSimulation]], [[overview]]"
source_count: 1
updated: 2026-04-16
---

# Swarm Intelligence

แนวคิดที่ใช้ agent จำนวนมาก (แต่ละตัวเรียบง่าย) interact กัน
จนเกิด **emergent behaviour** ที่ซับซ้อน — ใช้พยากรณ์ผลลัพธ์ที่
model เดียวคาดไม่ถึง

---

## หลักการ

```
Agent A  ←→  Agent B
   ↕              ↕
Agent C  ←→  Agent D
        ↓
  Emergent Pattern
  (ไม่ได้ถูก program โดยตรง)
```

แต่ละ agent มี:
- **Persona** — บุคลิก, อาชีพ, MBTI, ความสนใจ
- **Long-term memory** (ผ่าน [[entities/ZepCloud]])
- **Behavioural logic** — ตอบสนองต่อสิ่งแวดล้อมและ agent อื่น

---

## ทำไมถึง Predict ได้ดีกว่า Single LLM

| วิธี | ข้อจำกัด |
|---|---|
| ถาม LLM ตรงๆ | Opinion เดียว, ไม่มี dynamics |
| RAG + LLM | ค้นหาข้อมูลเก่า, ไม่ simulate interaction |
| **Swarm simulation** | หลาย perspectives, interaction เกิด emergent insights |

---

## การใช้งานใน [[entities/MiroFish]]

MiroFish implement swarm intelligence ผ่าน CAMEL-OASIS:
- สร้าง agents จาก entities ที่ extract จาก seed text
- Simulate บน Twitter + Reddit platform พร้อมกัน
- Record ทุก action (post, like, follow, repost) ทุก round
- ReportAgent สรุปผลเป็น prediction report

---

## Use Cases ที่เหมาะ

- Public opinion prediction
- Market sentiment simulation
- Social dynamics modelling
- "What-if" scenario analysis

---

## Related

- [[concepts/MultiAgentSimulation]] — implementation details
- [[entities/MiroFish]] — ระบบที่ใช้แนวคิดนี้
