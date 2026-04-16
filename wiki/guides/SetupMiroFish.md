---
title: "Setup MiroFish — MacBook (Free)"
type: guide
tags: [setup, docker, mirofish, macbook, mobile]
related: "[[entities/MiroFish]], [[entities/GeminiAI]], [[entities/ZepCloud]], [[overview]]"
updated: 2026-04-16
---

# Setup MiroFish บน MacBook (ฟรีทั้งหมด)

**เป้าหมาย**: Run MiroFish บน MacBook, ใช้มือถือดูผลผ่าน WiFi เดียวกัน
**ค่าใช้จ่าย**: ฿0

---

## สิ่งที่ต้องมีก่อน

| สิ่งที่ต้องมี | มีแล้ว? | ที่ไหน |
|---|---|---|
| MacBook (Mac OS) | ✅ | — |
| Gemini API Key | ✅ | จาก OmniLife Suit `.env.local` |
| Docker Desktop | ❌ ต้องติดตั้ง | ดู Step 1 |
| Zep Cloud API Key | ❌ ต้องสมัคร | ดู Step 2 |

---

## Step 1 — ติดตั้ง Docker Desktop

1. เปิด browser ไปที่ **docker.com/products/docker-desktop**
2. เลือก **Mac with Apple Silicon** หรือ **Mac with Intel chip**
3. ดาวน์โหลดและติดตั้ง
4. เปิด Docker Desktop ทิ้งไว้ (ต้อง run อยู่เสมอตอนใช้ MiroFish)

ตรวจสอบ: เปิด Terminal พิมพ์ `docker --version`

---

## Step 2 — สมัคร Zep Cloud (ฟรี)

1. ไปที่ **app.getzep.com**
2. Sign up (ใช้ Google account ได้)
3. ไปที่ **Settings → API Keys**
4. Copy API Key

---

## Step 3 — ใส่ API Keys ใน .env

เปิดไฟล์:
```
raw/MiroFish-main/MiroFish-main/.env
```

แก้ไข 2 บรรทัดนี้:
```env
LLM_API_KEY=ใส่ Gemini API Key ของคุณที่นี่
ZEP_API_KEY=ใส่ Zep Cloud API Key ที่นี่
```

> ⚠️ Gemini API Key หาได้จาก `_SOURCE_CODE_/.env.local` (ค่า `GEMINI_API_KEY`)
> หรือจาก **aistudio.google.com → Get API Key**

---

## Step 4 — Run MiroFish

เปิด Terminal แล้วรันคำสั่ง:

```bash
cd /Users/laboon/Documents/GitHub/OmniLife-Suit/raw/MiroFish-main/MiroFish-main
docker compose up -d
```

รอ ~2-3 นาทีครั้งแรก (download image)

**ตรวจสอบ**: เปิด browser ไปที่ `http://localhost:3000`
ควรเห็นหน้า MiroFish interface

---

## Step 5 — เข้าจากมือถือ (WiFi เดียวกัน)

MacBook IP ปัจจุบัน: **172.20.10.5**

เปิดมือถือ → browser → พิมพ์:
```
http://172.20.10.5:3000
```

> ⚠️ ต้องอยู่ WiFi เดียวกันกับ MacBook
> ถ้า IP เปลี่ยน: Terminal → `ipconfig getifaddr en0`

---

## วิธีหยุด MiroFish

```bash
cd /Users/laboon/Documents/GitHub/OmniLife-Suit/raw/MiroFish-main/MiroFish-main
docker compose down
```

---

## การใช้งานประจำวัน

```
เปิด MacBook
  ↓
เปิด Docker Desktop (ถ้ายังไม่ได้ตั้งค่า auto-start)
  ↓
Terminal: docker compose up -d
  ↓
MacBook: http://localhost:3000
มือถือ: http://172.20.10.5:3000
```

---

## Related

- [[guides/TradeSeedTemplate]] — template สำหรับ Trade simulation
- [[entities/MiroFish]] — รายละเอียดระบบ
- [[entities/GeminiAI]] — LLM ที่ใช้
- [[entities/ZepCloud]] — memory service
