import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  calcTradeStats,
  calcFibLevels,
  calcElliottTargets,
  calcSMA, calcEMA,
  calcBollingerBands,
  calcRSI,
  calcATR,
  calcPositionSize,
  calcCompound,
  calcLinearRegression,
  calcBlackScholes,
  calcKellyCriterion,
  calcAnnualizedSharpe,
  calcMarkovChain,
  calcFourierCycles,
} from '../lib/indicators';
import { fetchOHLCV, GECKO_ID } from '../lib/market';
import {
  BarChart2, GitBranch, Calculator, Activity,
  TrendingUp, TrendingDown, Minus, ChevronDown, FlaskConical,
} from 'lucide-react';

type Tab = 'stats' | 'fibonacci' | 'calculators' | 'indicators' | 'advanced';

// ── small helpers ─────────────────────────────────────────────
const Card = ({ label, value, sub, color = 'var(--color-text)' }: {
  label: string; value: string | number; sub?: string; color?: string;
}) => (
  <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
    <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
    <div className="text-xl font-bold" style={{ color }}>{value}</div>
    {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</div>}
  </div>
);

const Input = ({ label, value, onChange, type = 'number', step, placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; step?: string; placeholder?: string;
}) => (
  <div>
    <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</label>
    <input
      type={type} value={value} step={step} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg text-sm border"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    />
  </div>
);

// ── Stats Tab ─────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState<ReturnType<typeof calcTradeStats> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    getDocs(query(collection(db, 'trades'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const trades = snap.docs
          .map(d => d.data() as { uid: string; pnl?: number; status: string })
          .filter(t => t.uid === uid);
        setStats(calcTradeStats(trades));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading trade data…</div>;
  if (!stats || stats.totalTrades === 0)
    return <div className="text-sm" style={{ color: 'var(--color-muted)' }}>No closed trades yet. Close some trades to see statistics.</div>;

  const winColor = stats.winRate >= 50 ? '#22c55e' : '#ef4444';
  const expColor = stats.expectancy > 0 ? '#22c55e' : '#ef4444';
  const ddColor  = stats.maxDrawdown > 20 ? '#ef4444' : stats.maxDrawdown > 10 ? '#f59e0b' : '#22c55e';

  return (
    <div className="space-y-4">
      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total Trades" value={stats.totalTrades} />
        <Card label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={winColor} />
        <Card label="Avg Win" value={`+${stats.avgWin.toFixed(2)}`} color="#22c55e" />
        <Card label="Avg Loss" value={`-${stats.avgLoss.toFixed(2)}`} color="#ef4444" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          label="Expectancy"
          value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}`}
          sub="(WR × AvgWin) − (LR × AvgLoss)"
          color={expColor}
        />
        <Card
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          sub="TotalWins / TotalLosses"
          color={stats.profitFactor >= 1.5 ? '#22c55e' : stats.profitFactor >= 1 ? '#f59e0b' : '#ef4444'}
        />
        <Card
          label="Max Drawdown"
          value={`${stats.maxDrawdown.toFixed(1)}%`}
          sub="Peak-to-trough equity"
          color={ddColor}
        />
        <Card
          label="Sharpe Ratio"
          value={stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(3) : 'N/A'}
          sub="mean(pnl) / std(pnl)"
          color={stats.sharpeRatio !== null && stats.sharpeRatio > 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card label="Max Consecutive Wins" value={stats.consecutiveWins} color="#22c55e" />
        <Card label="Max Consecutive Losses" value={stats.consecutiveLosses} color="#ef4444" />
      </div>

      {/* Interpretation */}
      <div className="rounded-xl p-4 border text-sm space-y-2"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>System Interpretation</div>
        {stats.expectancy > 0
          ? <div style={{ color: '#22c55e' }}>✓ Positive expectancy — system is profitable over time.</div>
          : <div style={{ color: '#ef4444' }}>✗ Negative expectancy — review your strategy.</div>}
        {stats.profitFactor >= 2
          ? <div style={{ color: '#22c55e' }}>✓ Profit factor ≥ 2 — excellent system quality.</div>
          : stats.profitFactor >= 1.3
          ? <div style={{ color: '#f59e0b' }}>~ Profit factor {stats.profitFactor.toFixed(2)} — acceptable but room to improve.</div>
          : <div style={{ color: '#ef4444' }}>✗ Profit factor {'<'} 1.3 — system needs improvement.</div>}
        {stats.maxDrawdown > 20
          ? <div style={{ color: '#ef4444' }}>⚠ Drawdown {'>'} 20% — consider reducing position size.</div>
          : <div style={{ color: '#22c55e' }}>✓ Drawdown under control ({stats.maxDrawdown.toFixed(1)}%).</div>}
      </div>
    </div>
  );
}

// ── Fibonacci / Elliott Wave Tab ──────────────────────────────
function FibonacciTab() {
  // Fib state
  const [fibHigh, setFibHigh]   = useState('');
  const [fibLow,  setFibLow]    = useState('');
  const [fibTrend, setFibTrend] = useState<'up' | 'down'>('up');
  const [fibResult, setFibResult] = useState<ReturnType<typeof calcFibLevels> | null>(null);

  // Elliott state
  const [w1Start, setW1Start] = useState('');
  const [w1End,   setW1End]   = useState('');
  const [elliottResult, setElliottResult] = useState<ReturnType<typeof calcElliottTargets> | null>(null);

  const runFib = () => {
    const h = parseFloat(fibHigh), l = parseFloat(fibLow);
    if (!isNaN(h) && !isNaN(l) && h > l) setFibResult(calcFibLevels(h, l, fibTrend));
  };

  const runElliott = () => {
    const s = parseFloat(w1Start), e = parseFloat(w1End);
    if (!isNaN(s) && !isNaN(e) && s !== e) setElliottResult(calcElliottTargets(s, e));
  };

  return (
    <div className="space-y-6">
      {/* Fibonacci Retracement */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <GitBranch size={16} style={{ color: '#f59e0b' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Fibonacci Retracement</span>
        </div>
        <div className="p-4 space-y-4" style={{ background: 'var(--color-surface)' }}>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Swing High" value={fibHigh} onChange={setFibHigh} step="0.01" />
            <Input label="Swing Low"  value={fibLow}  onChange={setFibLow}  step="0.01" />
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Trend</label>
              <div className="flex gap-2">
                {(['up','down'] as const).map(t => (
                  <button key={t} onClick={() => setFibTrend(t)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium border transition"
                    style={{
                      background: fibTrend === t ? (t === 'up' ? '#22c55e22' : '#ef444422') : 'transparent',
                      borderColor: fibTrend === t ? (t === 'up' ? '#22c55e' : '#ef4444') : 'var(--color-border)',
                      color: fibTrend === t ? (t === 'up' ? '#22c55e' : '#ef4444') : 'var(--color-muted)',
                    }}>
                    {t === 'up' ? '▲ Up' : '▼ Down'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={runFib}
            className="w-full py-2 rounded-lg text-sm font-medium transition"
            style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
            Calculate Fibonacci Levels
          </button>

          {fibResult && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Ratio','Level','Price',''].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-medium"
                      style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fibResult.map(row => (
                  <tr key={row.label}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: row.isGolden ? '#f59e0b11' : undefined,
                    }}>
                    <td className="py-2 px-2" style={{ color: 'var(--color-muted)' }}>{row.label}</td>
                    <td className="py-2 px-2 font-mono" style={{ color: row.isGolden ? '#f59e0b' : 'var(--color-text)' }}>
                      {(row.ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 font-mono font-medium" style={{ color: row.isGolden ? '#f59e0b' : 'var(--color-text)' }}>
                      {row.price.toFixed(4)}
                    </td>
                    <td className="py-2 px-2 text-xs" style={{ color: '#f59e0b' }}>
                      {row.isGolden ? '★ Golden' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Elliott Wave */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Activity size={16} style={{ color: '#6366f1' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Elliott Wave Targets</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#6366f122', color: '#a78bfa' }}>Fibonacci-based</span>
        </div>
        <div className="p-4 space-y-4" style={{ background: 'var(--color-surface)' }}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Wave 1 Start Price" value={w1Start} onChange={setW1Start} step="0.01" />
            <Input label="Wave 1 End Price"   value={w1End}   onChange={setW1End}   step="0.01" />
          </div>
          <button onClick={runElliott}
            className="w-full py-2 rounded-lg text-sm font-medium transition"
            style={{ background: '#6366f122', color: '#a78bfa', border: '1px solid #6366f144' }}>
            Calculate Elliott Wave Targets
          </button>

          {elliottResult && (
            <div className="space-y-2">
              <div className="text-xs px-2 py-1 rounded" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
                {elliottResult.note}
              </div>
              {[
                { label: 'Wave 2 Support (61.8% retrace)', key: 'wave2_support', color: '#ef4444' },
                { label: 'Wave 3 Min Target (161.8%)',      key: 'wave3_min',     color: '#22c55e' },
                { label: 'Wave 3 Extended (261.8%)',        key: 'wave3_ext',     color: '#22c55e' },
                { label: 'Wave 4 Retracement (38.2%)',      key: 'wave4_retr',    color: '#f59e0b' },
                { label: 'Wave 5 Equal (= Wave 1)',         key: 'wave5_eq',      color: '#6366f1' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{label}</span>
                  <span className="font-mono font-bold text-sm" style={{ color }}>
                    {(elliottResult[key as keyof typeof elliottResult] as number).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Calculators Tab ───────────────────────────────────────────
function CalculatorsTab() {
  // Position Sizing
  const [psPortfolio, setPsPortfolio] = useState('10000');
  const [psRisk,      setPsRisk]      = useState('1');
  const [psEntry,     setPsEntry]     = useState('');
  const [psStop,      setPsStop]      = useState('');
  const psResult = (() => {
    const p = parseFloat(psPortfolio), r = parseFloat(psRisk),
          e = parseFloat(psEntry),     s = parseFloat(psStop);
    if ([p,r,e,s].some(isNaN) || e === s) return null;
    return calcPositionSize(p, r, e, s);
  })();

  // Compound Interest
  const [cpPrincipal, setCpPrincipal] = useState('10000');
  const [cpRate,      setCpRate]      = useState('2');
  const [cpTrades,    setCpTrades]    = useState('100');
  const cpResult = (() => {
    const p = parseFloat(cpPrincipal), r = parseFloat(cpRate), n = parseInt(cpTrades);
    if ([p,r].some(isNaN) || isNaN(n) || n <= 0) return null;
    return calcCompound(p, r, n);
  })();
  const cpMilestones = cpResult
    ? [10, 25, 50, 75, 100].filter(n => n <= parseInt(cpTrades)).map(n => ({
        trade: n,
        equity: parseFloat(cpPrincipal) * Math.pow(1 + parseFloat(cpRate)/100, n),
      }))
    : [];

  // ATR Calculator (manual OHLCV paste)
  const [atrPeriod,  setAtrPeriod]  = useState('14');
  const [atrPrices,  setAtrPrices]  = useState('');
  const [atrResult,  setAtrResult]  = useState<string>('');

  const runATR = () => {
    const lines = atrPrices.trim().split('\n').filter(Boolean);
    const rows  = lines.map(l => l.trim().split(/[\s,\t]+/).map(Number));
    if (rows.length < 2 || rows[0].length < 4) {
      setAtrResult('Format: one row per candle — High, Low, Close (e.g. "42000 41500 41800")');
      return;
    }
    const highs  = rows.map(r => r[0]);
    const lows   = rows.map(r => r[1]);
    const closes = rows.map(r => r[2]);
    const period = parseInt(atrPeriod) || 14;
    const atrs   = calcATR(highs, lows, closes, period);
    const last   = atrs.filter(v => v !== null).pop();
    setAtrResult(last !== undefined && last !== null
      ? `ATR(${period}) = ${last.toFixed(4)} — Suggested SL distance: 1.5× = ${(last * 1.5).toFixed(4)}, 2× = ${(last * 2).toFixed(4)}`
      : 'Not enough data for ATR calculation.');
  };

  return (
    <div className="space-y-5">
      {/* Position Sizing */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Calculator size={16} style={{ color: '#22c55e' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Position Sizing (Fixed Fractional)</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Portfolio Size ($)" value={psPortfolio} onChange={setPsPortfolio} step="100" />
            <Input label="Risk per Trade (%)" value={psRisk}      onChange={setPsRisk}      step="0.1" />
            <Input label="Entry Price"        value={psEntry}     onChange={setPsEntry}     step="0.01" />
            <Input label="Stop Loss Price"    value={psStop}      onChange={setPsStop}      step="0.01" />
          </div>
          {psResult && (
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: 'Units to Buy', value: psResult.units.toFixed(4) },
                { label: 'Risk Amount ($)', value: psResult.riskAmount.toFixed(2) },
                { label: 'Risk per Unit ($)', value: psResult.riskPerUnit.toFixed(4) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'var(--color-bg)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>{label}</div>
                  <div className="font-bold text-lg" style={{ color: '#22c55e' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compound Interest */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <TrendingUp size={16} style={{ color: '#6366f1' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Compound Interest Projector — A = P(1+r)ⁿ</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Starting Capital ($)" value={cpPrincipal} onChange={setCpPrincipal} step="100" />
            <Input label="Return per Trade (%)" value={cpRate}      onChange={setCpRate}      step="0.1" />
            <Input label="Number of Trades"     value={cpTrades}    onChange={setCpTrades}    />
          </div>
          {cpResult && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--color-bg)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Final Equity</div>
                  <div className="font-bold text-xl" style={{ color: '#6366f1' }}>
                    ${cpResult.final.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--color-bg)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Total Growth</div>
                  <div className="font-bold text-xl" style={{ color: '#22c55e' }}>
                    +{cpResult.growth.toFixed(1)}%
                  </div>
                </div>
              </div>
              {cpMilestones.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left py-1.5 px-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Trade #</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Equity</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpMilestones.map(m => (
                      <tr key={m.trade} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="py-1.5 px-2" style={{ color: 'var(--color-muted)' }}>#{m.trade}</td>
                        <td className="py-1.5 px-2 text-right font-mono" style={{ color: '#6366f1' }}>
                          ${m.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono" style={{ color: '#22c55e' }}>
                          +{((m.equity / parseFloat(cpPrincipal) - 1) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* ATR Calculator */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Activity size={16} style={{ color: '#f59e0b' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>ATR Stop Loss Calculator</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="grid grid-cols-4 gap-3">
            <Input label="ATR Period" value={atrPeriod} onChange={setAtrPeriod} />
            <div className="col-span-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                OHLC Data (one row per candle: High Low Close — separated by spaces)
              </label>
              <textarea
                value={atrPrices}
                onChange={e => setAtrPrices(e.target.value)}
                placeholder={"42000 41500 41800\n41900 41200 41600\n..."}
                rows={5}
                className="w-full px-3 py-2 rounded-lg text-sm border font-mono"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)', resize: 'vertical' }}
              />
            </div>
          </div>
          <button onClick={runATR}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
            Calculate ATR
          </button>
          {atrResult && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', color: '#f59e0b' }}>
              {atrResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Indicators Tab ────────────────────────────────────────────
type OHLCVRow = { time: number; open: number; high: number; low: number; close: number };

function IndicatorsTab() {
  const supportedPairs = Object.keys(GECKO_ID).map(b => `${b}/USDT`);
  const [pair,    setPair]    = useState('BTC/USDT');
  const [days,    setDays]    = useState<7 | 14 | 30>(30);
  const [ohlcv,   setOhlcv]   = useState<OHLCVRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const load = async () => {
    const base = pair.split('/')[0].toUpperCase();
    if (!GECKO_ID[base]) { setError(`Pair ${pair} not supported.`); return; }
    setLoading(true); setError('');
    try {
      const data = await fetchOHLCV(base, days);
      setOhlcv(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Derived indicator values
  const closes = ohlcv.map(r => r.close);
  const highs   = ohlcv.map(r => r.high);
  const lows    = ohlcv.map(r => r.low);

  const sma20  = calcSMA(closes, 20);
  const ema20  = calcEMA(closes, 20);
  const bb     = calcBollingerBands(closes, 20, 2);
  const rsi14  = calcRSI(closes, 14);
  const atr14  = calcATR(highs, lows, closes, 14);
  const linReg = closes.length >= 5 ? calcLinearRegression(closes) : null;

  // Show last 20 rows
  const displayRows = ohlcv.slice(-20).map((row, idx) => {
    const absIdx = ohlcv.length - 20 + idx;
    return {
      ...row,
      sma:  sma20[absIdx],
      ema:  ema20[absIdx],
      bb:   bb[absIdx],
      rsi:  rsi14[absIdx],
      atr:  atr14[absIdx],
    };
  });

  const lastClose = closes[closes.length - 1];
  const lastBB    = bb[bb.length - 1];
  const lastRSI   = rsi14[rsi14.length - 1];
  const lastSMA   = sma20[sma20.length - 1];
  const lastEMA   = ema20[ema20.length - 1];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-xl p-4 border flex flex-wrap gap-3 items-end"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex-1 min-w-36">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Pair</label>
          <div className="relative">
            <select
              value={pair}
              onChange={e => setPair(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-lg text-sm border"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {supportedPairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Period</label>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map(d => (
              <button key={d} onClick={() => setDays(d)}
                className="px-3 py-2 rounded-lg text-sm border transition"
                style={{
                  background: days === d ? '#6366f133' : 'transparent',
                  borderColor: days === d ? '#6366f1' : 'var(--color-border)',
                  color: days === d ? '#a78bfa' : 'var(--color-muted)',
                }}>{d}D</button>
            ))}
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          style={{ background: '#6366f133', color: '#a78bfa', border: '1px solid #6366f144' }}>
          {loading ? 'Loading…' : 'Load Indicators'}
        </button>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#ef444411', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Signal Summary */}
      {ohlcv.length > 0 && lastClose && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* RSI Signal */}
          <div className="rounded-xl p-3 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>RSI(14)</div>
            <div className="text-xl font-bold" style={{
              color: lastRSI === null ? 'var(--color-muted)'
                : lastRSI > 70 ? '#ef4444'
                : lastRSI < 30 ? '#22c55e'
                : 'var(--color-text)'
            }}>{lastRSI !== null ? lastRSI.toFixed(1) : 'N/A'}</div>
            <div className="text-xs mt-0.5" style={{
              color: lastRSI === null ? 'var(--color-muted)'
                : lastRSI > 70 ? '#ef4444' : lastRSI < 30 ? '#22c55e' : 'var(--color-muted)'
            }}>
              {lastRSI === null ? '' : lastRSI > 70 ? 'Overbought' : lastRSI < 30 ? 'Oversold' : 'Neutral'}
            </div>
          </div>
          {/* BB Position */}
          <div className="rounded-xl p-3 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>BB Position</div>
            <div className="text-xl font-bold" style={{
              color: !lastBB ? 'var(--color-muted)'
                : lastClose > lastBB.upper ? '#ef4444'
                : lastClose < lastBB.lower ? '#22c55e'
                : 'var(--color-text)'
            }}>
              {!lastBB ? 'N/A'
                : lastClose > lastBB.upper ? 'Above Upper'
                : lastClose < lastBB.lower ? 'Below Lower'
                : 'Inside Band'}
            </div>
            {lastBB && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              U:{lastBB.upper.toFixed(0)} | L:{lastBB.lower.toFixed(0)}
            </div>}
          </div>
          {/* MA Trend */}
          <div className="rounded-xl p-3 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>MA Trend (20)</div>
            <div className="flex items-center gap-1.5">
              {lastSMA !== null && lastClose > lastSMA
                ? <TrendingUp size={18} style={{ color: '#22c55e' }} />
                : <TrendingDown size={18} style={{ color: '#ef4444' }} />}
              <span className="text-xl font-bold" style={{
                color: lastSMA === null ? 'var(--color-muted)' : lastClose > lastSMA ? '#22c55e' : '#ef4444'
              }}>
                {lastSMA === null ? 'N/A' : lastClose > lastSMA ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            {lastSMA !== null && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              SMA:{lastSMA.toFixed(0)} | EMA:{lastEMA !== null ? lastEMA.toFixed(0) : 'N/A'}
            </div>}
          </div>
          {/* Linear Regression */}
          <div className="rounded-xl p-3 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Linear Regression</div>
            <div className="flex items-center gap-1.5">
              {linReg && (linReg.slope > 0
                ? <TrendingUp size={18} style={{ color: '#22c55e' }} />
                : linReg.slope < 0
                ? <TrendingDown size={18} style={{ color: '#ef4444' }} />
                : <Minus size={18} style={{ color: 'var(--color-muted)' }} />)}
              <span className="text-xl font-bold" style={{
                color: !linReg ? 'var(--color-muted)'
                  : linReg.slope > 0 ? '#22c55e' : linReg.slope < 0 ? '#ef4444' : 'var(--color-muted)'
              }}>
                {!linReg ? 'N/A' : linReg.slope > 0 ? 'Up Trend' : linReg.slope < 0 ? 'Down Trend' : 'Flat'}
              </span>
            </div>
            {linReg && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              R²:{linReg.r2.toFixed(3)} | Next:{linReg.nextValue.toFixed(0)}
            </div>}
          </div>
        </div>
      )}

      {/* OHLCV + Indicators Table */}
      {displayRows.length > 0 && (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                {['Date','Close','SMA(20)','EMA(20)','BB Upper','BB Lower','RSI(14)','ATR(14)'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => {
                const date = new Date(row.time).toLocaleDateString();
                const rsiColor = row.rsi === null ? 'var(--color-muted)'
                  : row.rsi > 70 ? '#ef4444' : row.rsi < 30 ? '#22c55e' : 'var(--color-text)';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-muted)' }}>{date}</td>
                    <td className="px-3 py-2 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {row.close.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-muted)' }}>
                      {row.sma !== null && row.sma !== undefined ? row.sma.toFixed(0) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-muted)' }}>
                      {row.ema !== null && row.ema !== undefined ? row.ema.toFixed(0) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#ef444488' }}>
                      {row.bb ? row.bb.upper.toFixed(0) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#22c55e88' }}>
                      {row.bb ? row.bb.lower.toFixed(0) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium" style={{ color: rsiColor }}>
                      {row.rsi !== null && row.rsi !== undefined ? row.rsi.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#f59e0b' }}>
                      {row.atr !== null && row.atr !== undefined ? row.atr.toFixed(2) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ohlcv.length === 0 && !loading && (
        <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>
          Select a pair and click "Load Indicators" to fetch OHLCV data from CoinGecko.
        </div>
      )}
    </div>
  );
}

// ── Advanced Math Tab ─────────────────────────────────────────
function AdvancedMathTab() {
  // ── Black-Scholes state ─────────────────────────
  const [bsS,     setBsS]     = useState('');
  const [bsK,     setBsK]     = useState('');
  const [bsR,     setBsR]     = useState('5');    // risk-free %
  const [bsT,     setBsT]     = useState('30');   // days
  const [bsSigma, setBsSigma] = useState('');     // implied vol %
  const bsResult = (() => {
    const S = parseFloat(bsS), K = parseFloat(bsK),
          r = parseFloat(bsR) / 100, T = parseFloat(bsT) / 365,
          sigma = parseFloat(bsSigma) / 100;
    if ([S,K,r,T,sigma].some(isNaN)) return null;
    return calcBlackScholes(S, K, r, T, sigma);
  })();

  // ── Kelly + Markov + Sharpe + Fourier — from trade history ──
  const [tradeData, setTradeData] = useState<{ pnl: number }[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [rfRate, setRfRate] = useState('4');   // risk-free annual %

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoadingTrades(false); return; }
    getDocs(query(collection(db, 'trades'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const closed = snap.docs
          .map(d => d.data() as { uid: string; pnl?: number; status: string })
          .filter(t => t.uid === uid && t.status === 'Closed' && t.pnl !== undefined)
          .map(t => ({ pnl: t.pnl! }));
        setTradeData(closed);
      })
      .finally(() => setLoadingTrades(false));
  }, []);

  const pnls  = tradeData.map(t => t.pnl);
  const stats = tradeData.length > 0 ? calcTradeStats(tradeData.map(t => ({ pnl: t.pnl, status: 'Closed' }))) : null;

  const kellyResult  = stats ? calcKellyCriterion(stats.winRate, stats.avgWin, stats.avgLoss) : null;
  const sharpeResult = pnls.length >= 2 ? calcAnnualizedSharpe(pnls, parseFloat(rfRate) || 0) : null;
  const markovResult = pnls.length >= 4 ? calcMarkovChain(pnls) : null;
  const fourierResult = pnls.length >= 8 ? calcFourierCycles(pnls, 3) : null;

  const stateColor = (idx: number) => idx === 0 ? '#22c55e' : idx === 1 ? '#ef4444' : '#f59e0b';

  return (
    <div className="space-y-5">

      {/* ── 1. Black-Scholes ─────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <FlaskConical size={16} style={{ color: '#a78bfa' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Black-Scholes Option Pricing</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#6366f122', color: '#a78bfa' }}>Nobel Prize Model</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            C = S₀N(d₁) − Ke⁻ʳᵀN(d₂) &nbsp;|&nbsp; P = Ke⁻ʳᵀN(−d₂) − S₀N(−d₁)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input label="Underlying Price (S)" value={bsS}     onChange={setBsS}     step="0.01" />
            <Input label="Strike Price (K)"      value={bsK}     onChange={setBsK}     step="0.01" />
            <Input label="Risk-Free Rate % (r)"  value={bsR}     onChange={setBsR}     step="0.1" />
            <Input label="Days to Expiry (T)"    value={bsT}     onChange={setBsT}     step="1" />
            <Input label="Implied Volatility %"  value={bsSigma} onChange={setBsSigma} step="1" />
          </div>
          {bsResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {[
                { label: 'Call Price', value: bsResult.callPrice.toFixed(4),  color: '#22c55e' },
                { label: 'Put Price',  value: bsResult.putPrice.toFixed(4),   color: '#ef4444' },
                { label: 'Call Δ (Delta)', value: bsResult.delta_call.toFixed(4), color: '#6366f1' },
                { label: 'Put Δ (Delta)',  value: bsResult.delta_put.toFixed(4),  color: '#f59e0b' },
                { label: 'Gamma',      value: bsResult.gamma.toFixed(6),      color: 'var(--color-text)' },
                { label: 'Vega (per 1% σ)', value: bsResult.vega.toFixed(4), color: 'var(--color-text)' },
                { label: 'Intrinsic Call', value: bsResult.intrinsicCall.toFixed(4), color: '#22c55e' },
                { label: 'Intrinsic Put',  value: bsResult.intrinsicPut.toFixed(4),  color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg px-3 py-2" style={{ background: 'var(--color-bg)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>{label}</div>
                  <div className="font-bold font-mono" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}
          {bsResult && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
              {bsResult.callPrice > bsResult.intrinsicCall
                ? `Call time value: ${(bsResult.callPrice - bsResult.intrinsicCall).toFixed(4)} (option premium above intrinsic)`
                : 'Deep in-the-money call — mostly intrinsic value.'}
              {bsResult.delta_call > 0.5 ? ' · Delta > 0.5 → option moves like the underlying.' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Kelly Criterion ─────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Calculator size={16} style={{ color: '#22c55e' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Kelly Criterion — Optimal Position Size</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            f* = (b×p − q) / b &nbsp;|&nbsp; b = AvgWin/AvgLoss &nbsp;|&nbsp; p = WinRate &nbsp;|&nbsp; q = 1−p
          </div>
          {loadingTrades
            ? <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading trade history…</div>
            : !stats || stats.totalTrades === 0
            ? <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Need closed trades with P&L to calculate Kelly.</div>
            : kellyResult && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--color-bg)' }}>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Full Kelly f*</div>
                    <div className="text-xl font-bold" style={{ color: kellyResult.kelly > 0 ? '#22c55e' : '#ef4444' }}>
                      {kellyResult.kelly.toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-center" style={{ background: '#22c55e11' }}>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>½ Kelly (Recommended)</div>
                    <div className="text-xl font-bold" style={{ color: '#22c55e' }}>
                      {kellyResult.halfKelly.toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--color-bg)' }}>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>¼ Kelly (Conservative)</div>
                    <div className="font-bold text-lg" style={{ color: '#f59e0b' }}>
                      {kellyResult.quarterKelly.toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--color-bg)' }}>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Odds Ratio (b)</div>
                    <div className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                      {kellyResult.b.toFixed(2)}x
                    </div>
                  </div>
                </div>
                <div className="text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg)', color: kellyResult.kelly > 0 ? '#22c55e' : '#ef4444' }}>
                  {kellyResult.interpretation}
                </div>
              </>
            )}
        </div>
      </div>

      {/* ── 3. Enhanced Sharpe Ratio ───────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <BarChart2 size={16} style={{ color: '#6366f1' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Sharpe Ratio (Annualized, vs Risk-Free)</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Sharpe = (R̄ − Rƒ) / σ × √252 &nbsp;|&nbsp; Compares return vs risk relative to risk-free asset
          </div>
          <div className="grid grid-cols-4 gap-3 items-end">
            <Input label="Risk-Free Rate % / Year (e.g. Thai bond)" value={rfRate} onChange={setRfRate} step="0.1" />
          </div>
          {sharpeResult && sharpeResult.sharpe !== null && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Annualized Sharpe',
                  value: sharpeResult.sharpe.toFixed(3),
                  color: sharpeResult.sharpe > 1 ? '#22c55e' : sharpeResult.sharpe > 0 ? '#f59e0b' : '#ef4444',
                  note: sharpeResult.sharpe > 2 ? 'Excellent' : sharpeResult.sharpe > 1 ? 'Good' : sharpeResult.sharpe > 0 ? 'Marginal' : 'Poor',
                },
                { label: 'Avg P&L per Trade', value: sharpeResult.mean.toFixed(4), color: sharpeResult.mean > 0 ? '#22c55e' : '#ef4444', note: '' },
                { label: 'Std Dev (Risk)', value: sharpeResult.std.toFixed(4), color: '#f59e0b', note: 'Lower = more consistent' },
              ].map(({ label, value, color, note }) => (
                <div key={label} className="rounded-lg px-3 py-2" style={{ background: 'var(--color-bg)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>{label}</div>
                  <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
                  {note && <div className="text-xs mt-0.5" style={{ color }}>{note}</div>}
                </div>
              ))}
            </div>
          )}
          {(!sharpeResult || sharpeResult.sharpe === null) && !loadingTrades && (
            <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Need ≥ 2 closed trades.</div>
          )}
        </div>
      </div>

      {/* ── 4. Markov Chain ────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Activity size={16} style={{ color: '#f59e0b' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Markov Chain — Market State Prediction</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            P(next state | current state) built from your trade P&L history. States: Bull · Bear · Sideways
          </div>
          {loadingTrades
            ? <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>
            : !markovResult
            ? <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Need ≥ 4 closed trades.</div>
            : (
              <>
                {/* Current state + next prediction */}
                <div className="rounded-lg px-4 py-3" style={{ background: 'var(--color-bg)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>Current State (last trade):</div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{ background: `${stateColor(markovResult.lastState)}22`, color: stateColor(markovResult.lastState) }}>
                      {markovResult.stateNames[markovResult.lastState]}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-muted)' }}>→ Next trade probabilities:</span>
                  </div>
                  <div className="flex gap-3">
                    {markovResult.stateNames.map((name, i) => (
                      <div key={name} className="flex-1 rounded-lg px-3 py-2 text-center"
                        style={{ background: `${stateColor(i)}11`, border: `1px solid ${stateColor(i)}33` }}>
                        <div className="text-xs mb-1" style={{ color: stateColor(i) }}>{name}</div>
                        <div className="text-lg font-bold" style={{ color: stateColor(i) }}>
                          {(markovResult.nextStateProbabilities[i] * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Transition Matrix */}
                <div>
                  <div className="text-xs mb-2 font-medium" style={{ color: 'var(--color-text)' }}>Full Transition Matrix:</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-2 py-1.5 text-left text-xs" style={{ color: 'var(--color-muted)' }}>From ↓ / To →</th>
                        {markovResult.stateNames.map((n, i) => (
                          <th key={n} className="px-3 py-1.5 text-center text-xs font-medium" style={{ color: stateColor(i) }}>{n}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {markovResult.matrix.map((row, from) => (
                        <tr key={from} style={{ borderTop: '1px solid var(--color-border)' }}>
                          <td className="px-2 py-2 text-xs font-medium" style={{ color: stateColor(from) }}>
                            {markovResult.stateNames[from]}
                          </td>
                          {row.map((prob, to) => (
                            <td key={to} className="px-3 py-2 text-center font-mono text-sm"
                              style={{
                                background: from === to ? `${stateColor(to)}11` : undefined,
                                color: prob > 0.5 ? stateColor(to) : 'var(--color-text)',
                                fontWeight: prob > 0.5 ? 700 : 400,
                              }}>
                              {(prob * 100).toFixed(0)}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
        </div>
      </div>

      {/* ── 5. Fourier Transform ───────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Activity size={16} style={{ color: '#818cf8' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Fourier Transform — Dominant Cycles</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            DFT applied to your P&L series — finds repeating cycles in your win/loss pattern.
            High magnitude = strong recurring cycle.
          </div>
          {loadingTrades
            ? <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</div>
            : !fourierResult
            ? <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Need ≥ 8 closed trades for cycle analysis.</div>
            : (
              <div className="space-y-2">
                {fourierResult.map((cycle, i) => {
                  const barWidth = i === 0 ? '100%' : `${(cycle.magnitude / fourierResult[0].magnitude) * 100}%`;
                  return (
                    <div key={i} className="rounded-lg px-4 py-3" style={{ background: 'var(--color-bg)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          #{i+1} — Cycle every <span style={{ color: '#818cf8' }}>{cycle.period.toFixed(1)} trades</span>
                        </span>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                          magnitude: {cycle.magnitude.toFixed(4)}
                        </span>
                      </div>
                      {/* Magnitude bar */}
                      <div className="h-2 rounded-full" style={{ background: 'var(--color-surface)' }}>
                        <div className="h-2 rounded-full transition-all" style={{
                          width: barWidth,
                          background: i === 0 ? '#6366f1' : i === 1 ? '#818cf8' : '#a78bfa',
                        }} />
                      </div>
                      <div className="text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
                        {cycle.period < 3  ? 'Very short cycle — high-frequency noise.' :
                         cycle.period < 8  ? `Pattern repeats ~every ${cycle.period.toFixed(0)} trades.` :
                         cycle.period < 20 ? `Medium-term cycle: check for ${cycle.period.toFixed(0)}-trade patterns.` :
                                             `Long cycle: ${cycle.period.toFixed(0)}-trade recurring trend.`}
                      </div>
                    </div>
                  );
                })}
                <div className="text-xs px-2 py-1" style={{ color: 'var(--color-muted)' }}>
                  Based on {pnls.length} closed trades. More data = more accurate cycle detection.
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'stats',       label: 'Statistics',          icon: <BarChart2 size={16} /> },
  { id: 'fibonacci',   label: 'Fibonacci / Elliott',  icon: <GitBranch size={16} /> },
  { id: 'calculators', label: 'Calculators',          icon: <Calculator size={16} /> },
  { id: 'indicators',  label: 'Indicators',           icon: <Activity size={16} /> },
  { id: 'advanced',    label: 'Advanced Math',        icon: <FlaskConical size={16} /> },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ background: '#6366f122' }}>
          <BarChart2 size={24} style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Analytics & Prediction</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Elliott Wave · Fibonacci · Technical Indicators · Risk Calculators
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition"
            style={{
              background: tab === t.id ? 'var(--color-bg)' : 'transparent',
              color: tab === t.id ? 'var(--color-text)' : 'var(--color-muted)',
              fontWeight: tab === t.id ? 600 : 400,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'stats'       && <StatsTab />}
      {tab === 'fibonacci'   && <FibonacciTab />}
      {tab === 'calculators' && <CalculatorsTab />}
      {tab === 'indicators'  && <IndicatorsTab />}
      {tab === 'advanced'    && <AdvancedMathTab />}
    </div>
  );
}
