---
title: "Gemini AI"
type: entity
tags: [llm, google, free, openai-compatible]
related: "[[entities/OmniLifeSuit]], [[entities/MiroFish]], [[entities/ZepCloud]]"
source_count: 1
updated: 2026-04-16
---

# Gemini AI

Google's LLM — ใช้งานอยู่แล้วใน [[entities/OmniLifeSuit]]
และสามารถใช้ใน [[entities/MiroFish]] ได้โดยไม่ต้องสมัครใหม่

---

## การใช้งานใน OmniLife Suit

```json
"@google/genai": "^1.29.0"
```

ใช้ผ่าน Google AI SDK โดยตรง

---

## การใช้งานใน MiroFish

MiroFish ใช้ OpenAI SDK แบบ configurable — ชี้ base_url ไปที่ Gemini ได้เลย:

```env
LLM_API_KEY=<GEMINI_API_KEY>
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL_NAME=gemini-2.0-flash
```

---

## Free Tier (Gemini Flash)

| ขีดจำกัด | ค่า |
|---|---|
| Requests per minute | 15 RPM |
| Tokens per minute | 1,000,000 TPM |
| Requests per day | **1,500 RPD** |
| ค่าใช้จ่าย | **฿0** |

**1 Trade simulation ใช้ ~300-360 requests**
→ free tier รองรับ **~4 simulations/วัน**

---

## Gemini Flash vs Qwen-plus

| | Gemini Flash | Qwen-plus |
|---|---|---|
| ราคา | ฿0 (free tier) | ~฿3/1M tokens |
| ความเร็ว | ช้าลงเล็กน้อย (rate limit) | เร็วกว่า |
| ภาษาไทย | ดี | ดี |
| API key | **มีอยู่แล้ว** | ต้องสมัครใหม่ |

→ **แนะนำใช้ Gemini Flash** สำหรับ personal free use

---

## Related

- [[entities/OmniLifeSuit]] — ใช้ Gemini อยู่แล้ว
- [[entities/MiroFish]] — สามารถใช้ Gemini แทน Qwen ได้
