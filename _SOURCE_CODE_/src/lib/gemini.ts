// ============================================================
// Gemini AI wrapper — @google/genai
// ============================================================
import { GoogleGenAI } from '@google/genai';
import type { AssetAnalysis } from './analysis';

export function getGeminiKey(): string  { return localStorage.getItem('gemini_api_key') || ''; }
export function setGeminiKey(k: string) { localStorage.setItem('gemini_api_key', k.trim()); }

async function generate(prompt: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('NO_KEY');
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  return res.text ?? '';
}

// ── Scanner: วิเคราะห์ผล technical analysis ──────────────────
export async function getScannerSummary(a: AssetAnalysis): Promise<string> {
  const signals = a.signals.map(s => `- ${s.name}: ${s.signal} — ${s.detail}`).join('\n');
  const plan = a.planDirection && a.suggestedEntry
    ? `แผนการเทรด: ${a.planDirection} ที่ ${a.suggestedEntry.toFixed(4)}, SL ${a.suggestedSL?.toFixed(4)}, TP ${a.suggestedTP?.toFixed(4)}`
    : 'ยังไม่มีสัญญาณชัดเจน (Neutral)';
  const best = a.bestStrategy
    ? `กลยุทธ์แนะนำ: ${a.bestStrategy.strategy} (Win Rate ${a.bestStrategy.winRate}%, ${a.bestStrategy.trades} trades)`
    : '';

  const prompt = `คุณเป็นนักวิเคราะห์ตลาดมืออาชีพ วิเคราะห์ผลต่อไปนี้สำหรับ ${a.pair}

Bullish Score: ${a.bullishScore}/100 (${a.direction}, ${a.confidence} Confidence)
Trend: ${a.trend} | RSI: ${a.rsi?.toFixed(1) ?? 'N/A'} | ATR: ${a.atr?.toFixed(4) ?? 'N/A'}
${plan}
${best}

Signals:
${signals}

${a.newsSentiment ? `News Sentiment: ${a.newsSentiment.label} (${a.newsSentiment.articles} articles, source: ${a.newsSentiment.source})` : ''}

สรุปเป็นภาษาไทย 4-5 ประโยคสั้นๆ ครอบคลุม:
1. แนวโน้มรวม และเหตุผลหลัก
2. indicator ที่น่าสังเกตที่สุด
3. ความเสี่ยงหลักที่ต้องระวัง
4. คำแนะนำปฏิบัติ (เข้า/รอ/ออก)
ตอบตรงประเด็น ไม่ต้องมีหัวข้อ`;

  return generate(prompt);
}

// ── Dashboard: Daily Brief ────────────────────────────────────
export async function getDailyBrief(
  priceLines?: string,  // e.g. "BTC: $65,000 (+2.3%)\nETH: $3,400 (+1.1%)"
): Promise<string> {
  const marketCtx = priceLines
    ? `\nราคาตลาดล่าสุด:\n${priceLines}`
    : '';

  const prompt = `คุณเป็น AI ผู้ช่วยการลงทุนส่วนตัว วันนี้คือ ${new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
${marketCtx}

สร้าง Daily Brief ตอนเช้าเป็นภาษาไทย 4 bullet points:
• ภาพรวมตลาดที่ควรติดตามวันนี้
• โอกาสหรือ setup ที่น่าสนใจ
• ความเสี่ยงหรือ catalyst ที่ต้องระวัง
• แนวคิดการบริหารความเสี่ยงสำหรับวันนี้

กระชับ แต่ละ bullet 1-2 ประโยค ใช้ข้อมูลจริงถ้ามี`;

  return generate(prompt);
}

// ── Finance: คำแนะนำการเงิน ───────────────────────────────────
export async function getFinanceAdvice(
  netCashFlow: number,
  totalDebt: number,
  debts: { title: string; remaining: number; rate: number; monthly: number; type: string }[],
): Promise<string> {
  const debtLines = debts.map(d =>
    `- ${d.title} (${d.type}): ยอดค้าง ฿${d.remaining.toLocaleString()}, ดอก ${d.rate}%, จ่าย ฿${d.monthly}/เดือน`
  ).join('\n');

  const prompt = `คุณเป็นที่ปรึกษาการเงินส่วนตัวชาวไทย วิเคราะห์สถานะการเงินต่อไปนี้

กระแสเงินสดสุทธิ: ฿${netCashFlow.toLocaleString()} ต่อเดือน
หนี้รวม: ฿${totalDebt.toLocaleString()}
รายการหนี้:
${debtLines || '- ไม่มีหนี้'}

ให้คำแนะนำ 3 ข้อเป็นภาษาไทย:
1. ลำดับความสำคัญในการชำระหนี้ (ระบุชื่อหนี้ที่ควรจัดการก่อน)
2. วิธีเพิ่มกระแสเงินสดหรือลดรายจ่าย
3. สิ่งที่ควรทำทันทีในเดือนนี้

ปฏิบัติได้จริง แต่ละข้อไม่เกิน 2 ประโยค`;

  return generate(prompt);
}
