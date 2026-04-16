---
title: "Deployment Guide — GitHub Pages"
type: source
tags: [deployment, github-pages, omnilife, build]
related: "[[entities/OmniLifeSuit]]"
source_count: 1
updated: 2026-04-16
---

# Deployment Guide — GitHub Pages

**Raw source**: `DEPLOYMENT_GUIDE.md` (ภาษาไทย)

คู่มือ deploy [[entities/OmniLifeSuit]] ขึ้น GitHub Pages

---

## ปัญหาที่เคยพบและวิธีแก้

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| Error 404 / MIME type | GitHub Pages run .tsx ไม่ได้ | Build เป็น static JS/CSS ก่อน |
| ชื่อไฟล์สุ่ม (hashing) | Vite default behavior | ตั้งค่า build ให้ชื่อ fixed: `index.js`, `index.css` |
| ไฟล์ .nojekyll หาย | OS ซ่อนไฟล์ที่ขึ้นต้นด้วย `.` | สร้างบน GitHub โดยตรง หรือเก็บใน `GITHUB_FILES/` |

---

## 4 ไฟล์ที่ต้องอยู่ที่ root ของ repo

```
/ (repo root)
├── index.html
├── index.js
├── index.css
└── .nojekyll
```

> ⚠️ ต้องอยู่ที่ root เท่านั้น — ห้ามอยู่ใน subdirectory

---

## ขั้นตอน Deploy

1. Build app → ได้ static files
2. วางไฟล์ทั้ง 4 ที่ `GITHUB_FILES/` (local)
3. Upload ขึ้น GitHub repo root
4. Commit changes
5. รอ 1-2 นาที → clear cache (Ctrl+F5 / Cmd+Shift+R)

---

## Key Insight

GitHub Pages = **static hosting เท่านั้น**
→ ไม่สามารถ run Python/Node server ได้
→ [[entities/MiroFish]] backend ต้องอยู่บน server แยก

---

## Related

- [[entities/OmniLifeSuit]] — app ที่ deploy
