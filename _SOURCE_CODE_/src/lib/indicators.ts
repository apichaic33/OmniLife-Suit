// ============================================================
// Trading Mathematics & Statistical Indicators
// ============================================================

// ── 1. BASIC STATISTICS FROM TRADE HISTORY ──────────────────

export interface TradeStats {
  totalTrades: number;
  winRate: number;         // %
  avgWin: number;
  avgLoss: number;
  expectancy: number;      // (WinRate × AvgWin) - (LossRate × AvgLoss)
  profitFactor: number;    // TotalWins / TotalLosses
  maxDrawdown: number;     // % of peak equity
  consecutiveWins: number;
  consecutiveLosses: number;
  sharpeRatio: number | null;
}

export function calcTradeStats(trades: { pnl?: number; status: string }[]): TradeStats {
  const closed = trades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
  if (closed.length === 0) return {
    totalTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0,
    expectancy: 0, profitFactor: 0, maxDrawdown: 0,
    consecutiveWins: 0, consecutiveLosses: 0, sharpeRatio: null,
  };

  const wins  = closed.filter(t => (t.pnl ?? 0) > 0);
  const losses = closed.filter(t => (t.pnl ?? 0) <= 0);
  const winRate = wins.length / closed.length;
  const avgWin  = wins.length  > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length  : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;

  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
  const totalWins  = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalLoss  = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const profitFactor = totalLoss > 0 ? totalWins / totalLoss : totalWins > 0 ? Infinity : 0;

  // Max Drawdown (equity curve)
  let equity = 0, peak = 0, maxDD = 0;
  for (const t of closed) {
    equity += t.pnl ?? 0;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? (peak - equity) / peak * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }

  // Consecutive wins/losses
  let cWins = 0, cLoss = 0, curW = 0, curL = 0;
  for (const t of closed) {
    if ((t.pnl ?? 0) > 0) { curW++; curL = 0; }
    else { curL++; curW = 0; }
    cWins = Math.max(cWins, curW);
    cLoss = Math.max(cLoss, curL);
  }

  // Simplified Sharpe: mean(pnl) / std(pnl)
  const pnls = closed.map(t => t.pnl ?? 0);
  const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
  const std  = Math.sqrt(pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length);
  const sharpeRatio = std > 0 ? mean / std : null;

  return {
    totalTrades: closed.length, winRate: winRate * 100,
    avgWin, avgLoss, expectancy, profitFactor,
    maxDrawdown: maxDD, consecutiveWins: cWins, consecutiveLosses: cLoss, sharpeRatio,
  };
}

// ── 2. FIBONACCI RETRACEMENT ──────────────────────────────────

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618] as const;

export function calcFibLevels(high: number, low: number, trend: 'up' | 'down' = 'up') {
  const diff = high - low;
  return FIB_LEVELS.map(ratio => ({
    ratio,
    label: `${(ratio * 100).toFixed(1)}%`,
    price: trend === 'up'
      ? high - diff * ratio          // retracement from high
      : low + diff * ratio,          // retracement from low
    isGolden: ratio === 0.618 || ratio === 1.618,
  }));
}

// ── 3. ELLIOTT WAVE TARGETS (Fibonacci-based) ─────────────────

export interface WaveTargets {
  wave3_min: number;   // 161.8% of Wave 1
  wave3_ext: number;   // 261.8% of Wave 1
  wave4_retr: number;  // 38.2% retracement
  wave5_min: number;   // Equal to Wave 1
  wave5_ext: number;   // 61.8% of Wave 1 from Wave 4 end
  waveC_min: number;   // 100% of Wave A
  waveC_ext: number;   // 161.8% of Wave A
}

export function calcElliottTargets(wave1Start: number, wave1End: number) {
  const w1 = Math.abs(wave1End - wave1Start);
  const dir = wave1End > wave1Start ? 1 : -1;
  return {
    wave2_support: wave1End - dir * w1 * 0.618,   // 61.8% retrace
    wave3_min:     wave1End + dir * w1 * 1.618,
    wave3_ext:     wave1End + dir * w1 * 2.618,
    wave4_retr:    wave1End + dir * w1 * 1.618 - dir * w1 * 0.382, // 38.2% of W3
    wave5_eq:      wave1End + dir * w1 * 1.618 - dir * w1 * 0.382 + dir * w1,
    note: `Wave 1 size: ${w1.toFixed(2)} | Direction: ${dir > 0 ? '▲ Bullish' : '▼ Bearish'}`,
  };
}

// ── 4. MOVING AVERAGE ─────────────────────────────────────────

export function calcSMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    return prices.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period;
  });
}

export function calcEMA(prices: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  let ema = prices.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ── 5. BOLLINGER BANDS ────────────────────────────────────────

export function calcBollingerBands(prices: number[], period = 20, multiplier = 2) {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const slice = prices.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((s, v) => s + v, 0) / period;
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { upper: mean + multiplier * std, middle: mean, lower: mean - multiplier * std, std };
  });
}

// ── 6. RSI ────────────────────────────────────────────────────

export function calcRSI(prices: number[], period = 14): (number | null)[] {
  if (prices.length < period + 1) return prices.map(() => null);
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const result: (number | null)[] = new Array(period).fill(null);

  let avgGain = changes.slice(0, period).filter(c => c > 0).reduce((s, v) => s + v, 0) / period;
  let avgLoss = Math.abs(changes.slice(0, period).filter(c => c < 0).reduce((s, v) => s + v, 0)) / period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < changes.length; i++) {
    const g = changes[i] > 0 ? changes[i] : 0;
    const l = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

// ── 7. ATR (Average True Range) ───────────────────────────────

export function calcATR(
  highs: number[], lows: number[], closes: number[], period = 14
): (number | null)[] {
  if (highs.length < 2) return highs.map(() => null);
  const tr = highs.map((h, i) => {
    if (i === 0) return h - lows[i];
    const prevClose = closes[i - 1];
    return Math.max(h - lows[i], Math.abs(h - prevClose), Math.abs(lows[i] - prevClose));
  });
  const result: (number | null)[] = new Array(period - 1).fill(null);
  let atr = tr.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push(atr);
  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    result.push(atr);
  }
  return result;
}

// ── 8. POSITION SIZING (Fixed Fractional) ─────────────────────

export function calcPositionSize(
  portfolioSize: number,   // total capital
  riskPercent: number,     // % willing to risk (e.g. 1)
  entryPrice: number,
  stopLoss: number
): { units: number; riskAmount: number; riskPerUnit: number } {
  const riskAmount  = portfolioSize * (riskPercent / 100);
  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  const units       = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
  return { units, riskAmount, riskPerUnit };
}

// ── 9. COMPOUND INTEREST ─────────────────────────────────────

export function calcCompound(
  principal: number,
  ratePerTrade: number,   // % e.g. 2 = 2%
  nTrades: number
): { final: number; growth: number; data: { trade: number; equity: number }[] } {
  const r    = ratePerTrade / 100;
  const data = Array.from({ length: nTrades + 1 }, (_, i) => ({
    trade: i,
    equity: principal * Math.pow(1 + r, i),
  }));
  return {
    final:  principal * Math.pow(1 + r, nTrades),
    growth: (Math.pow(1 + r, nTrades) - 1) * 100,
    data,
  };
}

// ── 11. BLACK-SCHOLES OPTION PRICING ─────────────────────────

/** Normal CDF approximation (Abramowitz & Stegun, max error < 7.5×10⁻⁸) */
function normCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp(-x * x / 2);
  const p = t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const prob = 1 - d * p;
  return x >= 0 ? prob : 1 - prob;
}

export interface BSResult {
  callPrice: number; putPrice: number;
  d1: number; d2: number;
  delta_call: number; delta_put: number;
  gamma: number; vega: number;
  intrinsicCall: number; intrinsicPut: number;
}

/**
 * Black-Scholes European option pricing.
 * @param S  Current underlying price
 * @param K  Strike price
 * @param r  Risk-free rate (decimal, e.g. 0.05 = 5%)
 * @param T  Time to expiry in years (e.g. 30 days = 30/365)
 * @param sigma  Implied volatility (decimal, e.g. 0.3 = 30%)
 */
export function calcBlackScholes(
  S: number, K: number, r: number, T: number, sigma: number
): BSResult | null {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const callPrice = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  const putPrice  = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
  const delta_call = normCDF(d1);
  const delta_put  = normCDF(d1) - 1;
  const gamma = Math.exp(-d1 * d1 / 2) / (S * sigma * sqrtT * Math.sqrt(2 * Math.PI));
  const vega  = S * sqrtT * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) / 100; // per 1% σ move
  return {
    callPrice, putPrice, d1, d2,
    delta_call, delta_put, gamma, vega,
    intrinsicCall: Math.max(0, S - K),
    intrinsicPut:  Math.max(0, K - S),
  };
}

// ── 12. KELLY CRITERION ───────────────────────────────────────

/**
 * Kelly Criterion: optimal fraction of capital to risk per trade.
 * f* = (b×p − q) / b  where b = odds ratio, p = win prob, q = 1−p
 */
export function calcKellyCriterion(
  winRatePct: number,  // e.g. 55 for 55%
  avgWin: number,
  avgLoss: number
): { kelly: number; halfKelly: number; quarterKelly: number; b: number; interpretation: string } {
  const p = winRatePct / 100;
  const q = 1 - p;
  const b = avgLoss > 0 ? avgWin / avgLoss : 0;
  const kelly = b > 0 ? Math.max(0, (b * p - q) / b) : 0;
  const halfKelly = kelly / 2;
  const quarterKelly = kelly / 4;
  const interpretation =
    kelly <= 0   ? 'System has no edge — do not trade.' :
    kelly > 0.5  ? 'Kelly > 50%: extreme risk, use ¼ Kelly in practice.' :
    kelly > 0.25 ? 'High Kelly: use ½ Kelly to reduce volatility.' :
                   'Kelly looks reasonable; ½ Kelly is still safer.';
  return {
    kelly:        kelly * 100,
    halfKelly:    halfKelly * 100,
    quarterKelly: quarterKelly * 100,
    b, interpretation
  };
}

// ── 13. ENHANCED SHARPE RATIO (annualized, with risk-free rate) ──

/**
 * Annualized Sharpe Ratio: (mean_excess_return / std) × √252
 * @param pnls  Array of per-trade P&L values
 * @param riskFreeAnnual  Annual risk-free rate % (e.g. 4 for 4%)
 * @param tradesPerYear   Assumed trading frequency (default 252)
 */
export function calcAnnualizedSharpe(
  pnls: number[],
  riskFreeAnnual = 0,
  tradesPerYear = 252
): { sharpe: number | null; mean: number; std: number; riskFreePerPeriod: number } {
  if (pnls.length < 2) return { sharpe: null, mean: 0, std: 0, riskFreePerPeriod: 0 };
  const rfPeriod = riskFreeAnnual / 100 / tradesPerYear;
  const excess = pnls.map(r => r - rfPeriod);
  const mean = excess.reduce((s, v) => s + v, 0) / excess.length;
  const std  = Math.sqrt(excess.reduce((s, v) => s + (v - mean) ** 2, 0) / excess.length);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(tradesPerYear) : null;
  return { sharpe, mean, std, riskFreePerPeriod: rfPeriod };
}

// ── 14. MARKOV CHAIN TRANSITION MATRIX ───────────────────────

export type MarketState = 'Bull' | 'Bear' | 'Sideways';

/**
 * Build a Markov transition probability matrix from a P&L series.
 * States: Bull (pnl > threshold), Bear (pnl < -threshold), Sideways (|pnl| ≤ threshold)
 */
export function calcMarkovChain(
  pnls: number[],
  threshold = 0
): {
  matrix: number[][];       // [from][to] probabilities
  stateNames: MarketState[];
  lastState: number;
  nextStateProbabilities: number[];
  stateHistory: number[];
} {
  const STATES: MarketState[] = ['Bull', 'Bear', 'Sideways'];
  const getState = (pnl: number) => pnl > threshold ? 0 : pnl < -threshold ? 1 : 2;
  const stateHistory = pnls.map(getState);

  // Transition counts [from][to]
  const counts = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < stateHistory.length - 1; i++) {
    counts[stateHistory[i]][stateHistory[i+1]]++;
  }
  // Normalise to probabilities
  const matrix = counts.map(row => {
    const total = row.reduce((s, v) => s + v, 0);
    return total > 0 ? row.map(v => v / total) : [1/3, 1/3, 1/3];
  });

  const lastState = stateHistory[stateHistory.length - 1] ?? 2;
  return { matrix, stateNames: STATES, lastState, nextStateProbabilities: matrix[lastState], stateHistory };
}

// ── 15. DISCRETE FOURIER TRANSFORM — DOMINANT CYCLES ─────────

export interface FourierCycle {
  period: number;    // candles / bars per cycle
  magnitude: number; // relative strength
  phase: number;     // phase offset in radians
}

/**
 * Find the top dominant cycles in a price/P&L series using DFT.
 * @param series  Price or P&L array
 * @param topN    How many dominant cycles to return (default 3)
 */
export function calcFourierCycles(series: number[], topN = 3): FourierCycle[] {
  const n = series.length;
  if (n < 4) return [];
  const mean      = series.reduce((s, v) => s + v, 0) / n;
  const detrended = series.map(p => p - mean);

  const results: FourierCycle[] = [];
  const halfN = Math.floor(n / 2);
  for (let k = 1; k <= halfN; k++) {
    let re = 0, im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      re += detrended[t] * Math.cos(angle);
      im -= detrended[t] * Math.sin(angle);
    }
    const magnitude = (2 / n) * Math.sqrt(re * re + im * im);
    const phase     = Math.atan2(im, re);
    results.push({ period: n / k, magnitude, phase });
  }
  results.sort((a, b) => b.magnitude - a.magnitude);
  return results.slice(0, topN);
}

// ── 10. LINEAR REGRESSION ────────────────────────────────────

export function calcLinearRegression(prices: number[]): {
  slope: number; intercept: number; r2: number;
  predict: (x: number) => number;
  nextValue: number;
} {
  const n = prices.length;
  const x = prices.map((_, i) => i);
  const sumX  = x.reduce((s, v) => s + v, 0);
  const sumY  = prices.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * prices[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = prices.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = prices.reduce((s, v, i) => s + (v - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const predict = (xi: number) => slope * xi + intercept;
  return { slope, intercept, r2, predict, nextValue: predict(n) };
}
