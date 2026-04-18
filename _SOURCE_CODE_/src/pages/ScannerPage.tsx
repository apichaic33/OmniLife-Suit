// ============================================================
// Scanner & Signal Engine Page
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Target,
  BarChart2, Activity, Zap, Sparkles, Newspaper, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchPrices, getAVKey, type PriceData } from '../lib/market';
import { analyzeAsset, type AssetAnalysis, type SignalItem, type BacktestResult } from '../lib/analysis';
import { fetchNewsSentiment, getCPKey, setCPKey, type NewsSentiment } from '../lib/news';
import { getGeminiKey, setGeminiKey, getScannerSummary } from '../lib/gemini';

// ── Persisted watchlist in localStorage ─────────────────────
export const SCANNER_STORAGE_KEY = 'omnilife_scanner_favorites';
const loadFavorites = (): string[] => {
  try { return JSON.parse(localStorage.getItem(SCANNER_STORAGE_KEY) || '[]'); } catch { return []; }
};
const saveFavorites = (pairs: string[]) => localStorage.setItem(SCANNER_STORAGE_KEY, JSON.stringify(pairs));

// ── Helper: look up price by pair (fetchPrices keys by base ticker) ──
const getPrice = (prices: Record<string, PriceData>, pair: string) =>
  prices[pair.split('/')[0].toUpperCase()];

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number | null | undefined, dec = 2): string =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const pct = (n: number | null | undefined): string =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const dirColor = (d: AssetAnalysis['direction'] | undefined) =>
  d === 'Bullish' ? '#22c55e' : d === 'Bearish' ? '#ef4444' : '#f59e0b';

const sigColor = (s: SignalItem['signal']) =>
  s === 'bullish' ? '#22c55e' : s === 'bearish' ? '#ef4444' : '#94a3b8';

const confBg = (c: AssetAnalysis['confidence']) =>
  c === 'High' ? '#22c55e22' : c === 'Medium' ? '#f59e0b22' : '#94a3b822';

const confText = (c: AssetAnalysis['confidence']) =>
  c === 'High' ? '#22c55e' : c === 'Medium' ? '#f59e0b' : '#94a3b8';

// Suggested default pairs to get started
const SUGGESTED = ['BTC/USDT', 'ETH/USDT', 'XAU/USD'];

// ── Watchlist Card ───────────────────────────────────────────
interface PriceMeta { price?: number; change24h?: number; loading?: boolean }

function WatchCard({
  pair, meta, isActive, onSelect, onRemove,
}: {
  pair: string; meta: PriceMeta; isActive: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const change = meta.change24h ?? 0;
  const up = change >= 0;
  return (
    <div
      onClick={onSelect}
      className="relative flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-95"
      style={{
        background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
        borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
        minWidth: 120,
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute top-1.5 right-1.5 p-0.5 rounded opacity-50 hover:opacity-100 transition"
        style={{ color: isActive ? '#fff' : 'var(--color-muted)' }}
      >
        <X size={11} />
      </button>
      <span className="text-xs font-bold pr-4" style={{ color: isActive ? '#fff' : 'var(--color-text)' }}>
        {pair.split('/')[0]}
      </span>
      {meta.loading ? (
        <Loader2 size={12} className="animate-spin" style={{ color: isActive ? '#fff' : 'var(--color-muted)' }} />
      ) : (
        <>
          <span className="text-xs font-mono" style={{ color: isActive ? '#ffffffcc' : 'var(--color-muted)' }}>
            {meta.price != null ? `$${meta.price > 1000 ? meta.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : meta.price.toFixed(4)}` : '—'}
          </span>
          <span className="text-xs font-medium" style={{ color: up ? '#22c55e' : '#ef4444' }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        </>
      )}
    </div>
  );
}

// ── Signal Row ───────────────────────────────────────────────
function SignalRow({ sig }: { sig: SignalItem }) {
  const barPct = Math.round((sig.score + 1) / 2 * 100);
  return (
    <div className="py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{sig.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>weight {sig.weight}%</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
            style={{ background: `${sigColor(sig.signal)}22`, color: sigColor(sig.signal) }}
          >
            {sig.signal}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barPct}%`,
            background: barPct >= 60 ? '#22c55e' : barPct <= 40 ? '#ef4444' : '#f59e0b',
          }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{sig.detail}</p>
    </div>
  );
}

// ── Backtest Card ────────────────────────────────────────────
function BacktestCard({ bt, isBest }: { bt: BacktestResult; isBest: boolean }) {
  return (
    <div
      className="p-3 rounded-xl border"
      style={{
        background: isBest ? '#22c55e0d' : 'var(--color-surface)',
        borderColor: isBest ? '#22c55e44' : 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: isBest ? '#22c55e' : 'var(--color-text)' }}>
          {isBest ? '🏆 ' : ''}{bt.strategy}
        </span>
        <span className="text-sm font-bold" style={{ color: bt.winRate >= 55 ? '#22c55e' : bt.winRate >= 45 ? '#f59e0b' : '#ef4444' }}>
          {bt.winRate}% WR
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>{bt.description}</p>
      <div className="flex gap-4 text-xs" style={{ color: 'var(--color-muted)' }}>
        <span>Trades: <b style={{ color: 'var(--color-text)' }}>{bt.trades}</b></span>
        <span>Wins: <b style={{ color: '#22c55e' }}>{bt.wins}</b></span>
        <span>Avg PnL: <b style={{ color: bt.avgPnlPct >= 0 ? '#22c55e' : '#ef4444' }}>{pct(bt.avgPnlPct)}</b></span>
      </div>
    </div>
  );
}

// ── News Sentiment Card ──────────────────────────────────────
function NewsCard({ news }: { news: NewsSentiment }) {
  const color = news.score > 0.1 ? '#22c55e' : news.score < -0.1 ? '#ef4444' : '#f59e0b';
  const barPct = Math.round((news.score + 1) / 2 * 100);
  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={15} style={{ color: '#6366f1' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          News Sentiment
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ background: '#6366f122', color: '#a78bfa' }}>{news.source}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-bold" style={{ color }}>{news.label}</span>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{news.articles} articles</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barPct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
        <span>Bearish</span><span>Neutral</span><span>Bullish</span>
      </div>
    </div>
  );
}

// ── Analysis Panel ───────────────────────────────────────────
function AnalysisPanel({ analysis, geminiText, geminiLoading, onAskGemini }: {
  analysis: AssetAnalysis;
  geminiText: string;
  geminiLoading: boolean;
  onAskGemini: () => void;
}) {
  const [showFib, setShowFib] = useState(false);
  const dc = dirColor(analysis.direction);

  return (
    <div className="space-y-4 mt-4">

      {/* Header */}
      <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{analysis.pair}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${dc}22`, color: dc }}>
                {analysis.direction}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: confBg(analysis.confidence), color: confText(analysis.confidence) }}>
                {analysis.confidence} Confidence
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                ${analysis.currentPrice > 1000
                  ? analysis.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : analysis.currentPrice.toFixed(4)}
              </span>
              <span className="text-sm font-medium" style={{ color: analysis.change24h >= 0 ? '#22c55e' : '#ef4444' }}>
                {pct(analysis.change24h)} 24h
              </span>
            </div>
          </div>

          {/* Score gauge */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Bullish Score</span>
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={dc} strokeWidth="3" strokeDasharray="100"
                  strokeDashoffset={100 - analysis.bullishScore}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold" style={{ color: dc }}>{analysis.bullishScore}</span>
              </div>
            </div>
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {analysis.analyzedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {!analysis.hasOHLCV && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg text-xs"
            style={{ background: '#f59e0b11', color: '#f59e0b', border: '1px solid #f59e0b22' }}>
            <AlertTriangle size={13} />
            ข้อมูล OHLCV ไม่พร้อมใช้งาน — วิเคราะห์เฉพาะ Momentum 24h (รองรับ Crypto &amp; Gold เท่านั้น)
          </div>
        )}
      </div>

      {/* Indicators summary */}
      {analysis.hasOHLCV && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'RSI (14)', value: analysis.rsi != null ? analysis.rsi.toFixed(1) : '—',
              badge: analysis.rsi != null ? (analysis.rsi < 30 ? 'Oversold' : analysis.rsi > 70 ? 'Overbought' : 'Normal') : '',
              color: analysis.rsi != null ? (analysis.rsi < 30 ? '#22c55e' : analysis.rsi > 70 ? '#ef4444' : '#94a3b8') : '#94a3b8' },
            { label: 'EMA 9', value: fmt(analysis.ema9), badge: '', color: 'var(--color-muted)' },
            { label: 'EMA 21', value: fmt(analysis.ema21), badge: '', color: 'var(--color-muted)' },
            { label: 'EMA 50', value: fmt(analysis.ema50),
              badge: analysis.ema50 != null ? (analysis.currentPrice > analysis.ema50 ? 'Price Above' : 'Price Below') : '',
              color: analysis.ema50 != null ? (analysis.currentPrice > analysis.ema50 ? '#22c55e' : '#ef4444') : '#94a3b8' },
            { label: 'ATR (14)', value: analysis.atr != null ? analysis.atr.toFixed(4) : '—', badge: 'Volatility', color: '#94a3b8' },
            { label: 'BB Width', value: (analysis.bbUpper != null && analysis.bbLower != null)
                ? (analysis.bbUpper - analysis.bbLower).toFixed(4) : '—', badge: '', color: 'var(--color-muted)' },
          ].map(({ label, value, badge, color }) => (
            <div key={label} className="p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
              <div className="text-sm font-mono font-semibold" style={{ color: 'var(--color-text)' }}>{value}</div>
              {badge && <div className="text-xs mt-0.5" style={{ color }}>{badge}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Signals */}
      <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Signal Breakdown</span>
        </div>
        {analysis.signals.map(sig => <SignalRow key={sig.name} sig={sig} />)}
      </div>

      {/* Trade Plan */}
      {analysis.planDirection && analysis.suggestedEntry != null && (
        <div className="p-4 rounded-xl border" style={{
          background: analysis.planDirection === 'Buy' ? '#22c55e0a' : '#ef44440a',
          borderColor: analysis.planDirection === 'Buy' ? '#22c55e44' : '#ef444444',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <Target size={15} style={{ color: analysis.planDirection === 'Buy' ? '#22c55e' : '#ef4444' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Trade Plan — {analysis.planDirection === 'Buy' ? '🟢 Buy / Long' : '🔴 Sell / Short'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Entry', value: fmt(analysis.suggestedEntry, 4), color: 'var(--color-text)' },
              { label: 'Stop Loss', value: fmt(analysis.suggestedSL, 4), color: '#ef4444' },
              { label: 'Take Profit', value: fmt(analysis.suggestedTP, 4), color: '#22c55e' },
              { label: 'R:R Ratio', value: analysis.suggestedRR != null ? `1:${analysis.suggestedRR.toFixed(1)}` : '—', color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
                <div className="text-sm font-mono font-bold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
            Entry = nearest Fibonacci support · SL = 1.5×ATR · TP = 3×ATR (R:R 2.0)
            {analysis.bestStrategy && ` · แนะนำกลยุทธ์: ${analysis.bestStrategy.strategy} (WR ${analysis.bestStrategy.winRate}%)`}
          </p>
        </div>
      )}

      {/* Fibonacci Levels */}
      {analysis.fibLevels.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setShowFib(v => !v)}
            className="w-full flex items-center justify-between p-3 text-left transition-all hover:brightness-110"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center gap-2">
              <BarChart2 size={14} style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold">Fibonacci Retracement (30d Swing)</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>
                High {fmt(analysis.fibHigh, 0)} · Low {fmt(analysis.fibLow, 0)}
              </span>
            </div>
            {showFib ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFib && (
            <div className="overflow-x-auto" style={{ background: 'var(--color-bg)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Level', 'Price', 'vs Current', 'Zone'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.fibLevels.map(f => {
                    const diff = ((f.price - analysis.currentPrice) / analysis.currentPrice * 100);
                    const isNearest = f.price === analysis.nearestSupport || f.price === analysis.nearestResistance;
                    return (
                      <tr key={f.label}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: f.isGolden ? '#f59e0b0a' : isNearest ? 'var(--color-accent)11' : undefined,
                        }}
                      >
                        <td className="px-3 py-2 font-medium" style={{ color: f.isGolden ? '#f59e0b' : 'var(--color-text)' }}>
                          {f.label} {f.isGolden ? '✨' : ''}
                        </td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text)' }}>
                          ${f.price > 1000 ? f.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : f.price.toFixed(4)}
                        </td>
                        <td className="px-3 py-2 font-mono" style={{ color: diff >= 0 ? '#22c55e' : '#ef4444' }}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2">
                          {f.price === analysis.nearestSupport && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#22c55e22', color: '#22c55e' }}>Support</span>
                          )}
                          {f.price === analysis.nearestResistance && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#ef444422', color: '#ef4444' }}>Resistance</span>
                          )}
                          {f.price < analysis.currentPrice && f.price !== analysis.nearestSupport && (
                            <span style={{ color: 'var(--color-muted)' }}>Below</span>
                          )}
                          {f.price > analysis.currentPrice && f.price !== analysis.nearestResistance && (
                            <span style={{ color: 'var(--color-muted)' }}>Above</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Backtests */}
      {analysis.backtestResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Strategy Backtest (30d · 4h candles)
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {analysis.backtestResults.map(bt => (
              <BacktestCard key={bt.strategy} bt={bt} isBest={bt.strategy === analysis.bestStrategy?.strategy} />
            ))}
          </div>
        </div>
      )}

      {/* News Sentiment */}
      {analysis.newsSentiment && <NewsCard news={analysis.newsSentiment} />}

      {/* Gemini AI Summary */}
      <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} style={{ color: '#a78bfa' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Gemini AI Summary</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#6366f122', color: '#a78bfa' }}>Gemini 2.0 Flash</span>
        </div>

        {geminiText ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{geminiText}</p>
        ) : (
          <button
            onClick={onAskGemini}
            disabled={geminiLoading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#6366f122', color: '#a78bfa', border: '1px solid #6366f144' }}
          >
            {geminiLoading
              ? <><Loader2 size={14} className="animate-spin" /> กำลังวิเคราะห์...</>
              : <><Sparkles size={14} /> วิเคราะห์ด้วย Gemini AI</>}
          </button>
        )}

        {geminiText && (
          <button
            onClick={onAskGemini}
            disabled={geminiLoading}
            className="mt-2 text-xs transition hover:opacity-70 disabled:opacity-40 flex items-center gap-1"
            style={{ color: 'var(--color-muted)' }}
          >
            <RefreshCw size={11} className={geminiLoading ? 'animate-spin' : ''} /> วิเคราะห์ใหม่
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function ScannerPage() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [input, setInput] = useState('');
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [activePair, setActivePair] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // API Keys
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiKey());
  const [cpKeyInput, setCpKeyInput] = useState(() => getCPKey());

  // Gemini summary
  const [geminiText, setGeminiText] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Persist favorites
  useEffect(() => { saveFavorites(favorites); }, [favorites]);

  // Load prices for all favorites
  const refreshPrices = useCallback(async () => {
    if (favorites.length === 0) return;
    setLoadingPrices(true);
    try {
      const data = await fetchPrices(favorites);
      setPrices(data);
    } catch { toast.error('โหลดราคาไม่สำเร็จ'); }
    finally { setLoadingPrices(false); }
  }, [favorites]);

  useEffect(() => { refreshPrices(); }, [refreshPrices]);

  const addFavorite = () => {
    const pair = input.trim().toUpperCase();
    if (!pair) return;
    // Normalize: ensure it has a quote currency
    const normalized = pair.includes('/') ? pair : `${pair}/USDT`;
    if (favorites.includes(normalized)) { toast.error('มี pair นี้แล้ว'); return; }
    setFavorites(prev => [...prev, normalized]);
    setInput('');
    toast.success(`เพิ่ม ${normalized} แล้ว`);
  };

  const removeFavorite = (pair: string) => {
    setFavorites(prev => prev.filter(p => p !== pair));
    if (activePair === pair) { setActivePair(null); setAnalysis(null); }
  };

  const handleAnalyze = async (pair: string) => {
    const meta = getPrice(prices, pair);
    if (!meta) { toast.error('ยังไม่มีราคา — กด Refresh ก่อน'); return; }
    setActivePair(pair);
    setAnalysis(null);
    setGeminiText('');
    setAnalyzing(true);
    try {
      const base = pair.split('/')[0].toUpperCase();
      // Fetch news sentiment first (fast, graceful fallback), then run full analysis
      const newsMap = await fetchNewsSentiment([pair], getAVKey()).catch(() => ({}));
      const news = (newsMap as Record<string, NewsSentiment>)[base];
      const result = await analyzeAsset(pair, meta.usd, meta.usd_24h_change, news);
      setAnalysis(result);
    } catch (e) {
      toast.error('วิเคราะห์ไม่สำเร็จ');
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskGemini = async () => {
    if (!analysis) return;
    if (!getGeminiKey()) { toast.error('ยังไม่ได้ตั้ง Gemini API Key — กด ⚙️ Settings'); return; }
    setGeminiLoading(true);
    try {
      const text = await getScannerSummary(analysis);
      setGeminiText(text);
    } catch (e: any) {
      if (e.message === 'NO_KEY') toast.error('ยังไม่ได้ตั้ง Gemini API Key');
      else toast.error('Gemini ไม่ตอบสนอง — ตรวจสอบ API Key');
    } finally {
      setGeminiLoading(false);
    }
  };

  const saveKeys = () => {
    setGeminiKey(geminiKeyInput);
    setCPKey(cpKeyInput);
    setShowKeySetup(false);
    toast.success('บันทึก API Keys แล้ว');
  };

  return (
    <div className="max-w-4xl space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Scanner & Signal Engine</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            วิเคราะห์ทิศทางทรัพย์สิน · RSI · EMA · BB · Fibonacci · News · Gemini AI
          </p>
        </div>
        <button
          onClick={() => setShowKeySetup(v => !v)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition hover:brightness-110"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          <Settings size={13} /> API Keys
        </button>
      </div>

      {/* API Key Setup panel */}
      {showKeySetup && (
        <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--color-surface)', borderColor: '#6366f144' }}>
          <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>⚙️ API Keys — เก็บใน localStorage เท่านั้น</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                Gemini API Key — <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>aistudio.google.com</a>
              </label>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={e => setGeminiKeyInput(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                CryptoPanic API Key
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: '#f59e0b22', color: '#f59e0b' }}>Paid Plan Only</span>
                {' '}<a href="https://cryptopanic.com/developers/api/" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>cryptopanic.com</a>
              </label>
              <input
                type="password"
                value={cpKeyInput}
                onChange={e => setCpKeyInput(e.target.value)}
                placeholder="your_token..."
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveKeys}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition active:scale-95"
              style={{ background: '#6366f133', color: '#a78bfa', border: '1px solid #6366f144' }}>
              บันทึก
            </button>
            <button onClick={() => setShowKeySetup(false)}
              className="px-4 py-1.5 rounded-lg text-sm transition"
              style={{ color: 'var(--color-muted)' }}>
              ยกเลิก
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Alpha Vantage key ใช้ร่วมกับ Assets page (ตั้งค่าได้ที่นั่น)
          </p>
        </div>
      )}

      {/* Add pair + Refresh */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addFavorite()}
          placeholder="เพิ่ม pair เช่น BTC, ETH/USDT, XAU/USD..."
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          onFocus={e => (e.currentTarget.style.border = '1px solid var(--color-accent)')}
          onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
        />
        <button
          onClick={addFavorite}
          className="px-3 py-2 rounded-lg transition-all active:scale-95 hover:brightness-110"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={16} />
        </button>
        <button
          onClick={refreshPrices}
          disabled={loadingPrices}
          className="px-3 py-2 rounded-lg transition-all active:scale-95 hover:brightness-110 disabled:opacity-60"
          style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
          title="Refresh prices"
        >
          <RefreshCw size={16} className={loadingPrices ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Empty state with suggestions */}
      {favorites.length === 0 && (
        <div className="text-center py-10 space-y-4">
          <div style={{ color: 'var(--color-muted)', fontSize: 40 }}>📡</div>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>ยังไม่มี pair ใน watchlist</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {SUGGESTED.map(p => (
              <button
                key={p}
                onClick={() => { setFavorites(prev => prev.includes(p) ? prev : [...prev, p]); toast.success(`เพิ่ม ${p}`); }}
                className="px-3 py-1.5 rounded-lg text-sm border transition-all hover:brightness-110 active:scale-95"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)', background: 'var(--color-surface)' }}
              >
                + {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist cards */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
              WATCHLIST ({favorites.length})
            </span>
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              คลิก pair เพื่อวิเคราะห์
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {favorites.map(pair => (
              <WatchCard
                key={pair}
                pair={pair}
                meta={getPrice(prices, pair)
                  ? { price: getPrice(prices, pair)!.usd, change24h: getPrice(prices, pair)!.usd_24h_change }
                  : { loading: loadingPrices && !getPrice(prices, pair) }}
                isActive={activePair === pair}
                onSelect={() => handleAnalyze(pair)}
                onRemove={() => removeFavorite(pair)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Analyzing loader */}
      {analyzing && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>กำลังวิเคราะห์ {activePair}...</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              โหลด 180 candles · คำนวณ RSI / EMA / BB / ATR / Fibonacci · Backtest 3 กลยุทธ์
            </p>
          </div>
        </div>
      )}

      {/* Analysis result */}
      {analysis && !analyzing && (
        <AnalysisPanel
          analysis={analysis}
          geminiText={geminiText}
          geminiLoading={geminiLoading}
          onAskGemini={handleAskGemini}
        />
      )}

      {/* Direction legend */}
      {favorites.length > 0 && !analysis && !analyzing && (
        <div className="flex items-center gap-4 text-xs pt-2" style={{ color: 'var(--color-muted)' }}>
          <span className="flex items-center gap-1"><TrendingUp size={12} style={{ color: '#22c55e' }} /> Bullish ≥62</span>
          <span className="flex items-center gap-1"><Minus size={12} style={{ color: '#f59e0b' }} /> Neutral 38–62</span>
          <span className="flex items-center gap-1"><TrendingDown size={12} style={{ color: '#ef4444' }} /> Bearish ≤38</span>
        </div>
      )}
    </div>
  );
}
