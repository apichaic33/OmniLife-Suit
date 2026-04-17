// ============================================================
// Signal Analysis Engine — wires OHLCV data to indicators.ts
// ============================================================
import { fetchOHLCV, detectAssetType } from './market';
import {
  calcRSI, calcEMA, calcBollingerBands, calcATR,
  calcLinearRegression, calcFibLevels,
} from './indicators';

export interface SignalItem {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;    // contribution weight (all weights sum to 100)
  score: number;     // -1 (full bearish) to +1 (full bullish)
  detail: string;
}

export interface BacktestResult {
  strategy: string;
  description: string;
  trades: number;
  wins: number;
  winRate: number;   // 0-100
  avgPnlPct: number; // average PnL per trade in %
}

export interface AssetAnalysis {
  pair: string;
  base: string;
  currentPrice: number;
  change24h: number;
  analyzedAt: Date;
  hasOHLCV: boolean;  // false for forex/stocks without OHLCV

  // Technical indicators (null if no OHLCV)
  rsi: number | null;
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  atr: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbMiddle: number | null;
  trend: 'up' | 'down' | 'sideways' | 'unknown';

  // Fibonacci (swing high/low from last 30 days)
  fibHigh: number;
  fibLow: number;
  fibLevels: { ratio: number; label: string; price: number; isGolden: boolean }[];
  nearestSupport: number | null;
  nearestResistance: number | null;

  // Overall signal
  signals: SignalItem[];
  bullishScore: number;  // 0-100
  direction: 'Bullish' | 'Bearish' | 'Neutral';
  confidence: 'High' | 'Medium' | 'Low';

  // Trade plan
  planDirection: 'Buy' | 'Sell' | null;
  suggestedEntry: number | null;
  suggestedSL: number | null;
  suggestedTP: number | null;
  suggestedRR: number | null;

  // Strategy backtests
  backtestResults: BacktestResult[];
  bestStrategy: BacktestResult | null;
}

// ── Backtest helpers ──────────────────────────────────────────

type BbPoint = { upper: number; middle: number; lower: number; std: number } | null;

/** Strategy 1: RSI Mean Reversion — buy when oversold, sell when recovered */
function backtestRSI(closes: number[], rsis: (number | null)[]): BacktestResult {
  const trades: number[] = [];
  for (let i = 14; i < closes.length - 6; i++) {
    const r = rsis[i];
    if (r === null || r > 35) continue;
    const entry = closes[i];
    let exitPnl = -0.025; // default stop
    for (let j = i + 1; j <= Math.min(i + 6, closes.length - 1); j++) {
      const rj = rsis[j];
      if (rj !== null && rj > 60) { exitPnl = (closes[j] - entry) / entry; break; }
      if ((closes[j] - entry) / entry < -0.025) { exitPnl = -0.025; break; }
      if (j === i + 6) exitPnl = (closes[j] - entry) / entry;
    }
    trades.push(exitPnl);
  }
  const wins = trades.filter(t => t > 0).length;
  return {
    strategy: 'RSI Mean Reversion',
    description: 'Buy RSI<35 → exit RSI>60 or -2.5% stop (4h candles)',
    trades: trades.length,
    wins,
    winRate: trades.length > 0 ? Math.round(wins / trades.length * 100) : 0,
    avgPnlPct: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t, 0) / trades.length * 10000) / 100 : 0,
  };
}

/** Strategy 2: EMA 9/21 Crossover — golden/death cross */
function backtestEMACross(closes: number[], ema9: (number | null)[], ema21: (number | null)[]): BacktestResult {
  const trades: number[] = [];
  let entry = 0, inTrade = false;
  for (let i = 22; i < closes.length; i++) {
    const e9 = ema9[i], e21 = ema21[i], e9p = ema9[i - 1], e21p = ema21[i - 1];
    if (e9 === null || e21 === null || e9p === null || e21p === null) continue;
    if (!inTrade && e9p <= e21p && e9 > e21) { inTrade = true; entry = closes[i]; }
    else if (inTrade && e9p >= e21p && e9 < e21) { trades.push((closes[i] - entry) / entry); inTrade = false; }
  }
  if (inTrade && entry > 0) trades.push((closes[closes.length - 1] - entry) / entry);
  const wins = trades.filter(t => t > 0).length;
  return {
    strategy: 'EMA 9/21 Crossover',
    description: 'Buy golden cross (EMA9>EMA21) → sell death cross (4h candles)',
    trades: trades.length,
    wins,
    winRate: trades.length > 0 ? Math.round(wins / trades.length * 100) : 0,
    avgPnlPct: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t, 0) / trades.length * 10000) / 100 : 0,
  };
}

/** Strategy 3: Bollinger Band Bounce — buy at lower band, exit at middle */
function backtestBBBounce(closes: number[], bbs: BbPoint[]): BacktestResult {
  const trades: number[] = [];
  for (let i = 20; i < closes.length - 4; i++) {
    const bb = bbs[i];
    if (!bb || closes[i] >= bb.lower) continue;
    const entry = closes[i];
    let exitPnl = -0.02;
    for (let j = i + 1; j <= Math.min(i + 4, closes.length - 1); j++) {
      const bbj = bbs[j];
      if (bbj && closes[j] >= bbj.middle) { exitPnl = (closes[j] - entry) / entry; break; }
      if ((closes[j] - entry) / entry < -0.02) { exitPnl = -0.02; break; }
      if (j === i + 4) exitPnl = (closes[j] - entry) / entry;
    }
    trades.push(exitPnl);
  }
  const wins = trades.filter(t => t > 0).length;
  return {
    strategy: 'Bollinger Band Bounce',
    description: 'Buy below lower BB → exit at middle BB or -2% stop (4h candles)',
    trades: trades.length,
    wins,
    winRate: trades.length > 0 ? Math.round(wins / trades.length * 100) : 0,
    avgPnlPct: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t, 0) / trades.length * 10000) / 100 : 0,
  };
}

// ── Basic analysis for assets without OHLCV ──────────────────

function buildBasicAnalysis(pair: string, base: string, currentPrice: number, change24h: number): AssetAnalysis {
  const momScore = change24h > 3 ? 1 : change24h > 1 ? 0.5 : change24h < -3 ? -1 : change24h < -1 ? -0.5 : 0;
  const signals: SignalItem[] = [{
    name: '24h Momentum',
    signal: momScore > 0 ? 'bullish' : momScore < 0 ? 'bearish' : 'neutral',
    weight: 100, score: momScore,
    detail: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% — ไม่มีข้อมูล OHLCV (ใช้ได้เฉพาะ Crypto/Gold)`,
  }];
  const bullishScore = Math.round((momScore + 1) / 2 * 100);
  return {
    pair, base, currentPrice, change24h, analyzedAt: new Date(),
    hasOHLCV: false,
    rsi: null, ema9: null, ema21: null, ema50: null, atr: null,
    bbUpper: null, bbLower: null, bbMiddle: null, trend: 'unknown',
    fibHigh: currentPrice * 1.05, fibLow: currentPrice * 0.95, fibLevels: [],
    nearestSupport: null, nearestResistance: null,
    signals, bullishScore,
    direction: bullishScore > 60 ? 'Bullish' : bullishScore < 40 ? 'Bearish' : 'Neutral',
    confidence: 'Low',
    planDirection: null, suggestedEntry: null, suggestedSL: null, suggestedTP: null, suggestedRR: null,
    backtestResults: [], bestStrategy: null,
  };
}

// ── Main analysis function ─────────────────────────────────────

export async function analyzeAsset(
  pair: string,
  currentPrice: number,
  change24h: number,
): Promise<AssetAnalysis> {
  const base = pair.split('/')[0].toUpperCase().trim();
  const assetType = detectAssetType(pair);
  const hasOHLCV = assetType === 'crypto' || assetType === 'gold';

  if (!hasOHLCV) return buildBasicAnalysis(pair, base, currentPrice, change24h);

  // ── Fetch 30 days of 4h OHLCV candles ────────────────────────
  let candles: { time: number; open: number; high: number; low: number; close: number }[] = [];
  try { candles = await fetchOHLCV(base, 30); } catch { /* fall through */ }
  if (candles.length < 30) return buildBasicAnalysis(pair, base, currentPrice, change24h);

  const closes = candles.map(c => c.close);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const last    = closes.length - 1;

  // ── Calculate indicators ──────────────────────────────────────
  const rsiArr  = calcRSI(closes, 14);
  const ema9Arr = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const ema50Arr = calcEMA(closes, 50);
  const bbArr   = calcBollingerBands(closes, 20, 2);
  const atrArr  = calcATR(highs, lows, closes, 14);
  const reg     = calcLinearRegression(closes.slice(-30));

  const rsi  = rsiArr[last]  ?? null;
  const ema9 = ema9Arr[last] ?? null;
  const ema21 = ema21Arr[last] ?? null;
  const ema50 = ema50Arr[last] ?? null;
  const bb   = bbArr[last];
  const atr  = atrArr[last] ?? null;
  const price = closes[last];

  // ── Fibonacci (30d swing high/low) ───────────────────────────
  const fibHigh = Math.max(...highs);
  const fibLow  = Math.min(...lows);
  const isBullish = price > (fibHigh + fibLow) / 2;
  const rawFib = calcFibLevels(fibHigh, fibLow, isBullish ? 'up' : 'down');
  const fibLevels = rawFib.map(f => ({ ratio: f.ratio, label: f.label, price: f.price, isGolden: f.isGolden }));

  // Support = highest fib level below price, Resistance = lowest above
  const below = fibLevels.filter(f => f.price < price).sort((a, b) => b.price - a.price);
  const above = fibLevels.filter(f => f.price > price).sort((a, b) => a.price - b.price);
  const nearestSupport    = below[0]?.price ?? null;
  const nearestResistance = above[0]?.price ?? null;

  // ── Build signals ─────────────────────────────────────────────
  const signals: SignalItem[] = [];

  // 1. RSI (weight 15)
  if (rsi !== null) {
    const s = rsi < 30 ? 1 : rsi < 40 ? 0.5 : rsi > 70 ? -1 : rsi > 60 ? -0.5 : 0;
    signals.push({ name: 'RSI (14)', signal: s > 0 ? 'bullish' : s < 0 ? 'bearish' : 'neutral', weight: 15, score: s,
      detail: `${rsi.toFixed(1)}${rsi < 30 ? ' — Oversold ⬇️' : rsi > 70 ? ' — Overbought ⬆️' : ''}` });
  }

  // 2. EMA 9/21 crossover (weight 20)
  if (ema9 !== null && ema21 !== null) {
    const s = ema9 > ema21 ? 1 : -1;
    signals.push({ name: 'EMA 9/21', signal: s > 0 ? 'bullish' : 'bearish', weight: 20, score: s,
      detail: `EMA9 ${ema9.toFixed(2)} ${s > 0 ? '>' : '<'} EMA21 ${ema21.toFixed(2)} — ${s > 0 ? 'Golden Cross 🟢' : 'Death Cross 🔴'}` });
  }

  // 3. Price vs EMA50 (weight 15)
  if (ema50 !== null) {
    const s = price > ema50 ? 1 : -1;
    signals.push({ name: 'Price vs EMA50', signal: s > 0 ? 'bullish' : 'bearish', weight: 15, score: s,
      detail: `Price ${price > ema50 ? 'above' : 'below'} EMA50 (${ema50.toFixed(2)})` });
  }

  // 4. Bollinger Bands position (weight 15)
  if (bb) {
    let s = 0;
    let detail = '';
    if (price < bb.lower) { s = 1; detail = `Below lower band (Oversold) — BB: ${bb.lower.toFixed(2)}`; }
    else if (price > bb.upper) { s = -1; detail = `Above upper band (Overbought) — BB: ${bb.upper.toFixed(2)}`; }
    else {
      const pos = (price - bb.lower) / (bb.upper - bb.lower);
      s = -(pos * 2 - 1) * 0.5; // center = neutral, lower half = slight bullish
      detail = `Within bands (${(pos * 100).toFixed(0)}% from lower) — BW: ${(bb.upper - bb.lower).toFixed(2)}`;
    }
    signals.push({ name: 'Bollinger Bands', signal: s > 0.2 ? 'bullish' : s < -0.2 ? 'bearish' : 'neutral', weight: 15, score: s, detail });
  }

  // 5. Trend — linear regression slope (weight 20)
  {
    const pricePer1pct = price * 0.005;
    const s = Math.max(-1, Math.min(1, reg.slope / pricePer1pct));
    signals.push({ name: 'Trend (Regression)', signal: s > 0.1 ? 'bullish' : s < -0.1 ? 'bearish' : 'neutral', weight: 20, score: s,
      detail: `Slope ${reg.slope >= 0 ? '+' : ''}${reg.slope.toFixed(4)} — R²=${reg.r2.toFixed(2)} (${s > 0 ? 'Uptrend' : s < 0 ? 'Downtrend' : 'Sideways'})` });
  }

  // 6. 24h momentum (weight 15)
  {
    const s = change24h > 3 ? 1 : change24h > 1 ? 0.5 : change24h < -3 ? -1 : change24h < -1 ? -0.5 : 0;
    signals.push({ name: '24h Momentum', signal: s > 0 ? 'bullish' : s < 0 ? 'bearish' : 'neutral', weight: 15, score: s,
      detail: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% in 24h` });
  }

  // ── Aggregate score ───────────────────────────────────────────
  const totalWeight  = signals.reduce((s, sig) => s + sig.weight, 0);
  const weightedScore = signals.reduce((s, sig) => s + sig.score * sig.weight, 0) / totalWeight;
  const bullishScore = Math.min(100, Math.max(0, Math.round((weightedScore + 1) / 2 * 100)));

  const direction: 'Bullish' | 'Bearish' | 'Neutral' =
    bullishScore >= 62 ? 'Bullish' : bullishScore <= 38 ? 'Bearish' : 'Neutral';
  const confidence: 'High' | 'Medium' | 'Low' =
    bullishScore >= 75 || bullishScore <= 25 ? 'High' :
    bullishScore >= 65 || bullishScore <= 35 ? 'Medium' : 'Low';

  const trend: AssetAnalysis['trend'] =
    reg.slope > price * 0.0001 ? 'up' : reg.slope < -price * 0.0001 ? 'down' : 'sideways';

  // ── Trade plan ────────────────────────────────────────────────
  const planDirection: 'Buy' | 'Sell' | null = direction === 'Neutral' ? null : direction === 'Bullish' ? 'Buy' : 'Sell';
  let suggestedEntry: number | null = null;
  let suggestedSL: number | null = null;
  let suggestedTP: number | null = null;
  let suggestedRR: number | null = null;

  if (planDirection && atr !== null) {
    if (planDirection === 'Buy') {
      suggestedEntry = nearestSupport ?? price;
      suggestedSL    = suggestedEntry - atr * 1.5;
      suggestedTP    = suggestedEntry + atr * 3;
      suggestedRR    = 2.0;
    } else {
      suggestedEntry = nearestResistance ?? price;
      suggestedSL    = suggestedEntry + atr * 1.5;
      suggestedTP    = suggestedEntry - atr * 3;
      suggestedRR    = 2.0;
    }
  }

  // ── Backtests ─────────────────────────────────────────────────
  const backtestResults = [
    backtestRSI(closes, rsiArr),
    backtestEMACross(closes, ema9Arr, ema21Arr),
    backtestBBBounce(closes, bbArr),
  ].filter(b => b.trades > 0);

  const bestStrategy = backtestResults.length > 0
    ? backtestResults.reduce((best, b) => b.winRate > best.winRate ? b : best)
    : null;

  return {
    pair, base, currentPrice: price, change24h, analyzedAt: new Date(),
    hasOHLCV: true,
    rsi, ema9, ema21, ema50, atr,
    bbUpper: bb?.upper ?? null, bbLower: bb?.lower ?? null, bbMiddle: bb?.middle ?? null,
    trend,
    fibHigh, fibLow, fibLevels,
    nearestSupport, nearestResistance,
    signals, bullishScore, direction, confidence,
    planDirection, suggestedEntry, suggestedSL, suggestedTP, suggestedRR,
    backtestResults, bestStrategy,
  };
}
