---
title: "LLM Wiki Pattern"
type: concept
tags: [meta, pattern, knowledge-base, obsidian]
related: "[[overview]]"
source_count: 1
updated: 2026-04-16
---

# LLM Wiki Pattern

Pattern สำหรับสร้าง personal knowledge base ที่ LLM เป็นผู้ maintain
แทนที่จะเป็น RAG (ค้นหาทุกครั้ง) — wiki สะสม knowledge ไปเรื่อยๆ

---

## ความแตกต่างจาก RAG

| RAG | LLM Wiki |
|---|---|
| ค้นหา chunks ทุกครั้งที่ถาม | Synthesis ทำไว้แล้ว |
| ไม่มีการสะสม | Knowledge compounding |
| Cross-reference ค้นทุกครั้ง | Links พร้อมแล้วใน wiki |
| ต้องการ embedding infrastructure | แค่ markdown files |

---

## 3 Layers

```
raw/          ← Source documents (read-only, immutable)
wiki/         ← LLM-maintained wiki (markdown files)
CLAUDE.md     ← Schema: rules และ conventions
```

---

## Operations

### Ingest
เพิ่ม source ใหม่ใน `raw/` → บอก LLM ว่า "ingest"
LLM อ่าน, สรุป, อัปเดต wiki หลายหน้า, อัปเดต index + log

### Query
ถาม LLM → LLM อ่าน index → ดึง relevant pages → ตอบพร้อม citations
คำตอบที่ดี → file กลับเป็น wiki page ใหม่

### Lint
บอก "lint the wiki" → LLM ตรวจหา contradictions, orphans, stale info

---

## เครื่องมือที่ใช้ใน vault นี้

- **Obsidian** — IDE สำหรับ browse wiki, graph view
- **Claude Code** — LLM ที่ maintain wiki
- **`raw/`** — source documents

---

## Tips

- Obsidian graph view แสดง connected pages — orphan pages จะเห็นชัด
- ทุก wiki page ควรมี wikilink ≥ 2 ลิงก์
- `log.md` grep ได้: `grep "^## \[" wiki/log.md`

---

## Related

- [[overview]] — wiki นี้ track อะไร
- [CLAUDE.md](../CLAUDE.md) — schema ของ wiki นี้
