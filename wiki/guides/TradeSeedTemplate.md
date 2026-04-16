---
title: "Trade Simulation — Seed Template"
type: guide
tags: [trade, simulation, mirofish, template, seed]
related: "[[entities/MiroFish]], [[entities/OmniLifeSuit]], [[guides/SetupMiroFish]], [[concepts/MultiAgentSimulation]]"
updated: 2026-04-16
---

# Trade Simulation — วิธีสร้าง Seed และ Simulate

**เป้าหมาย**: ใช้ MiroFish จำลอง market sentiment สำหรับ trading pair
เพื่อประกอบการตัดสินใจ Buy/Sell

---

## Seed Document Template

สร้างไฟล์ `.md` ใน `raw/seeds/` สำหรับแต่ละ simulation
MiroFish รับไฟล์ประเภท: `.pdf`, `.md`, `.txt`, `.markdown`

---

### Template 1 — Trade History Analysis

```markdown
# Trade Analysis Report: [PAIR] — [DATE]

## Trading Pair Overview
- Pair: BTC/USDT (หรือ pair ที่คุณเทรด)
- Period: [วันที่เริ่ม] to [วันที่สิ้นสุด]
- My Position: [Buy/Sell/Hold]

## Recent Trade History
| Date | Type | Price | Amount | Status |
|------|------|-------|--------|--------|
| 2026-04-10 | Buy  | 85,000 | 0.1 | Completed |
| 2026-04-12 | Sell | 87,500 | 0.1 | Completed |
| 2026-04-15 | Buy  | 84,200 | 0.15 | Open |

## Market Context
- ราคาปัจจุบัน: [ราคา]
- แนวโน้มล่าสุด: [ขึ้น/ลง/ทรงตัว]
- ข่าวสำคัญ: [ข่าวที่เกี่ยวข้อง ถ้ามี]

## Prediction Request
ต้องการทราบ: ในสถานการณ์นี้ควร Buy เพิ่ม, Hold, หรือ Sell?
ระยะเวลา: [สั้น 1-3 วัน / กลาง 1-2 สัปดาห์]
```

---

### Template 2 — Market Scenario ("What-if")

```markdown
# What-if Scenario: [SCENARIO NAME]

## สถานการณ์
ถ้า [เงื่อนไข เช่น: Fed ขึ้นดอกเบี้ย 0.25%]
จะส่งผลต่อ [PAIR] อย่างไร?

## Asset ที่ถือ
- [PAIR1]: [จำนวน] ที่ราคา [ราคาเฉลี่ย]
- [PAIR2]: [จำนวน] ที่ราคา [ราคาเฉลี่ย]

## คำถามหลัก
1. Sentiment ของนักเทรดจะเปลี่ยนอย่างไร?
2. ควรป้องกัน position หรือเพิ่ม position?
3. ระดับราคาไหนที่น่าจับตา?
```

---

## วิธีใช้ MiroFish กับ Seed เหล่านี้

### ขั้นตอนใน MiroFish Interface

```
1. เปิด http://localhost:3000
2. กด "New Project"
3. Step 1 — Graph Build:
   อัปโหลดไฟล์ seed .md
   ใส่ชื่อ: "Trade Analysis [PAIR] [DATE]"
4. Step 2 — Environment Setup:
   ระบุ prediction requirement (copy จาก "Prediction Request")
5. Step 3 — Simulation:
   Rounds: 20 (แนะนำสำหรับ Trade)
   รอ ~25-30 นาที
6. Step 4 — Report:
   อ่าน prediction report
7. Step 5 — Interaction:
   ถามรายละเอียดเพิ่มเติมกับ ReportAgent
```

---

## Seed Files ที่ควรสร้างประจำ

| Simulation | ความถี่ | ไฟล์ |
|---|---|---|
| Weekly trade review | ทุก อาทิตย์ | `raw/seeds/trade-weekly-YYYY-WW.md` |
| Before big trade | ก่อนตัดสินใจ | `raw/seeds/trade-decision-PAIR-DATE.md` |
| Market event | มีข่าวสำคัญ | `raw/seeds/market-event-TOPIC-DATE.md` |

---

## ข้อจำกัดที่ต้องรู้

> ⚠️ MiroFish simulate **sentiment** ไม่ใช่ **price prediction**
> ผลลัพธ์คือ "นักเทรดใน simulation ส่วนใหญ่คิดว่า..." ไม่ใช่ราคาที่แน่นอน

> ⚠️ Gemini free tier: 1,500 req/day → ทำ simulation ได้ ~4 ครั้ง/วัน
> ถ้าต้องการมากกว่า ต้องรอวันถัดไป หรือใช้ Qwen-plus

---

## Related

- [[guides/SetupMiroFish]] — วิธี run MiroFish
- [[entities/MiroFish]] — รายละเอียดระบบ
- [[concepts/MultiAgentSimulation]] — วิธีที่ simulation ทำงาน
- [[entities/OmniLifeSuit]] — Trade collection ใน Firestore
