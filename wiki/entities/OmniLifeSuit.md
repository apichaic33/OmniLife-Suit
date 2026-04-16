---
title: "OmniLife Suit"
type: entity
tags: [app, react, firebase, gemini, github-pages]
related: "[[entities/MiroFish]], [[entities/GeminiAI]], [[overview]]"
source_count: 2
updated: 2026-04-16
---

# OmniLife Suit

แอปพลิเคชัน personal management ที่ครอบคลุมการจัดการชีวิตด้านต่างๆ
deploy บน GitHub Pages เป็น static web app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | TailwindCSS 4 + Lucide React |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| AI | [[entities/GeminiAI]] (`@google/genai ^1.29.0`) |
| Charts | Recharts |
| Animation | Motion (Framer) |
| Deployment | GitHub Pages (static) |

---

## Data Model (12 Collections)

| Collection | Entity | หน้าที่ |
|---|---|---|
| `/tasks` | Task | Tasks พร้อม priority, due date |
| `/routines` | Routine | Daily/weekly recurring habits |
| `/fitness_logs` | FitnessLog | Workout + meal logs + calories |
| `/fitness_goals` | FitnessGoal | เป้าหมายน้ำหนัก/fitness |
| `/assets` | Asset | ทรัพย์สินที่ติดตาม + มูลค่า |
| `/debts` | Debt | หนี้สิน + อัตราดอกเบี้ย + monthly payment |
| `/trades` | Trade | ประวัติการเทรด (pair, Buy/Sell, price, amount) |
| `/projects` | Project | โปรเจกต์ + progress tracking |
| `/plants` | Plant | เกษตร: พืช, สุขภาพ, harvest date |
| `/transactions` | Transaction | รายรับ/รายจ่าย + tax tracking |
| `/businesses` | Business | แหล่งรายได้ (Rental, E-commerce, Service) |
| `/users` | User | Profile + role |

---

## Deployment Architecture

```
Source Code (_SOURCE_CODE_/)
        ↓ npm run build
Built Files (GITHUB_FILES/)
  ├── index.html
  ├── index.js     ← fixed name (no hash)
  ├── index.css
  └── .nojekyll
        ↓ upload to GitHub repo root
GitHub Pages → live app
```

ดูรายละเอียด: [[sources/DeploymentGuide]]

---

## ข้อจำกัดสำคัญ

> ⚠️ GitHub Pages = static only — ไม่สามารถ run backend (Python/Node server) ได้
> การ integrate [[entities/MiroFish]] ต้องใช้ server แยกต่างหาก

---

## โมดูลที่เหมาะกับ MiroFish

1. **Trade** → simulate market sentiment ก่อนตัดสินใจ
2. **Finance** (transactions + debts + businesses) → พยากรณ์กระแสเงินสด
3. **Agriculture** (plants) → พยากรณ์ harvest และสภาพแวดล้อม

ดูรายละเอียด: [[overview]]
