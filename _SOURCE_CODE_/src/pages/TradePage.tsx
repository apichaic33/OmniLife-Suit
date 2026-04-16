import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildTradeSeed } from '../lib/mirofish';
import { fetchPrices, baseCurrency, formatChange, type PriceData } from '../lib/market';
import type { Trade } from '../types';
import { TrendingUp, TrendingDown, Plus, Fish, Loader2, X, DollarSign, Target, BarChart2, Activity, RefreshCw, ShieldAlert, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import MiroFishSimulator from '../components/MiroFishSimulator';

const DEMO_UID = 'demo-user';

export default function TradePage() {
  const [trades, setTrades]           = useState<Trade[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showSim, setShowSim]         = useState(false);
  const [simPair, setSimPair]         = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [closingId, setClosingId]     = useState<string | null>(null);
  const [closePrice, setClosePrice]   = useState('');
  const [tab, setTab]                 = useState<'positions' | 'history' | 'analytics' | 'market'>('positions');
  const [prices, setPrices]           = useState<Record<string, PriceData>>({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [form, setForm]               = useState({ pair: '', type: 'Buy', price: '', amount: '', stopLoss: '', takeProfit: '', sentiment: 'neutral', notes: '' });
  const [portfolioSize, setPortfolioSize] = useState<number>(() => {
    const saved = localStorage.getItem('omnilife_portfolio_size');
    return saved ? +saved : 0;
  });
  const [showPortfolioInput, setShowPortfolioInput] = useState(false);
  const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, snap => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trade)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const refreshPrices = useCallback(async () => {
    if (trades.length === 0) return;
    setPriceLoading(true);
    const data = await fetchPrices(trades.map(t => t.pair));
    setPrices(data);
    setLastUpdated(new Date());
    setPriceLoading(false);

    // SL/TP alerts for open positions
    trades.filter(t => t.status === 'Open').forEach(t => {
      const base = baseCurrency(t.pair);
      const cur  = data[base]?.usd;
      if (!cur || alertedIds.has(t.id!)) return;
      if (t.stopLoss && (t.type === 'Buy' ? cur <= t.stopLoss : cur >= t.stopLoss)) {
        toast.error(`🔴 Stop Loss hit! ${t.pair} @ $${cur.toLocaleString()} (SL: ${t.stopLoss})`, { duration: 10000 });
        setAlertedIds(prev => new Set(prev).add(t.id!));
      } else if (t.takeProfit && (t.type === 'Buy' ? cur >= t.takeProfit : cur <= t.takeProfit)) {
        toast.success(`🎯 Take Profit hit! ${t.pair} @ $${cur.toLocaleString()} (TP: ${t.takeProfit})`, { duration: 10000 });
        setAlertedIds(prev => new Set(prev).add(t.id!));
      }
    });
  }, [trades, alertedIds]);

  // Auto-fetch prices when trades load, then every 60 seconds
  useEffect(() => {
    if (trades.length === 0) return;
    refreshPrices();
    const interval = setInterval(refreshPrices, 60000);
    return () => clearInterval(interval);
  }, [trades.length]);

  // ── Derived data ────────────────────────────────────────────
  const open   = trades.filter(t => t.status === 'Open');
  const closed = trades.filter(t => t.status === 'Closed');
  const pairs  = [...new Set(trades.map(t => t.pair))];

  const totalPnl   = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins       = closed.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate    = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
  const bestTrade  = closed.reduce((best, t) => (t.pnl ?? 0) > (best?.pnl ?? -Infinity) ? t : best, null as Trade | null);
  const worstTrade = closed.reduce((worst, t) => (t.pnl ?? 0) < (worst?.pnl ?? Infinity) ? t : worst, null as Trade | null);

  // P&L by pair
  const pnlByPair = pairs.map(p => ({
    pair: p,
    pnl: closed.filter(t => t.pair === p).reduce((s, t) => s + (t.pnl ?? 0), 0),
    trades: closed.filter(t => t.pair === p).length,
  })).filter(p => p.trades > 0).sort((a, b) => b.pnl - a.pnl);

  // ── Actions ─────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.pair || !form.price || !form.amount) return toast.error('กรอกข้อมูลให้ครบ');
    await addDoc(collection(db, 'trades'), {
      ...form,
      price: +form.price, amount: +form.amount,
      stopLoss:   form.stopLoss   ? +form.stopLoss   : null,
      takeProfit: form.takeProfit ? +form.takeProfit : null,
      status: 'Open', uid: DEMO_UID,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    toast.success('เพิ่ม Trade แล้ว');
    setShowAddForm(false);
    setForm({ pair: '', type: 'Buy', price: '', amount: '', stopLoss: '', takeProfit: '', sentiment: 'neutral', notes: '' });
  };

  const handleClose = async (t: Trade) => {
    const cp = parseFloat(closePrice);
    if (!cp || cp <= 0) return toast.error('กรอกราคาปิด');
    const pnl = t.type === 'Buy'
      ? (cp - t.price) * t.amount
      : (t.price - cp) * t.amount;
    await updateDoc(doc(db, 'trades', t.id!), {
      status: 'Closed', closePrice: cp,
      closedAt: new Date().toISOString().split('T')[0],
      pnl: Math.round(pnl * 100) / 100,
    });
    toast.success(`ปิด Trade ${pnl >= 0 ? '🟢 กำไร' : '🔴 ขาดทุน'} ${Math.abs(pnl).toLocaleString()}`);
    setClosingId(null);
    setClosePrice('');
  };

  const handleSimulate = () => {
    if (trades.length === 0) return toast.error('ยังไม่มีข้อมูล Trade');
    setShowSim(true);
  };

  if (showSim) {
    const seed = buildTradeSeed(trades, simPair || undefined, Object.keys(prices).length > 0 ? prices : undefined);
    return (
      <MiroFishSimulator
        title={`Trade Simulation${simPair ? ` — ${simPair}` : ''}`}
        seedText={seed}
        onBack={() => setShowSim(false)}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Trade</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{open.length} open · {closed.length} closed</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            <Plus size={15} /> Add Trade
          </button>
          <button onClick={handleSimulate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
            <Fish size={15} /> MiroFish
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total P&L',     value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444', icon: <DollarSign size={16} /> },
          { label: 'Win Rate',      value: `${winRate}%`,           color: '#6366f1', icon: <Target size={16} /> },
          { label: 'Open',          value: open.length,             color: '#f59e0b', icon: <Activity size={16} /> },
          { label: 'Total Trades',  value: trades.length,           color: 'var(--color-muted)', icon: <BarChart2 size={16} /> },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-3 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.label}</span>
            </div>
            <div className="font-bold text-sm" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Portfolio Size & Risk */}
      <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <ShieldAlert size={16} style={{ color: '#f59e0b' }} />
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Portfolio Size:</span>
        {showPortfolioInput ? (
          <input type="number" autoFocus
            defaultValue={portfolioSize || ''}
            placeholder="ใส่ขนาด portfolio (USD)"
            onBlur={e => { const v = +e.target.value; setPortfolioSize(v); localStorage.setItem('omnilife_portfolio_size', String(v)); setShowPortfolioInput(false); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="px-2 py-1 rounded text-xs outline-none w-36"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
        ) : (
          <button onClick={() => setShowPortfolioInput(true)} className="text-xs font-medium" style={{ color: portfolioSize ? 'var(--color-text)' : '#f59e0b' }}>
            {portfolioSize ? `$${portfolioSize.toLocaleString()}` : 'ตั้งค่า →'}
          </button>
        )}
        {portfolioSize > 0 && (() => {
          const totalRisk = open.reduce((s, t) => {
            if (!t.stopLoss) return s;
            return s + (Math.abs(t.price - t.stopLoss) * t.amount / portfolioSize * 100);
          }, 0);
          return totalRisk > 0 ? (
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: totalRisk > 10 ? '#ef444422' : totalRisk > 5 ? '#f59e0b22' : '#22c55e22',
                       color:      totalRisk > 10 ? '#ef4444'   : totalRisk > 5 ? '#f59e0b'   : '#22c55e' }}>
              Total Risk: {totalRisk.toFixed(1)}%
            </span>
          ) : null;
        })()}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'pair',   label: 'Pair',   placeholder: 'BTC/USDT' },
              { key: 'price',  label: 'Price',  placeholder: '85000', type: 'number' },
              { key: 'amount', label: 'Amount', placeholder: '0.1',   type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{f.label}</label>
                <input type={f.type || 'text'} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
              </div>
            ))}
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                <option>Buy</option><option>Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Stop Loss</label>
              <input type="number" placeholder="0.00" value={form.stopLoss}
                onChange={e => setForm(p => ({ ...p, stopLoss: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid #ef444444' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Take Profit</label>
              <input type="number" placeholder="0.00" value={form.takeProfit}
                onChange={e => setForm(p => ({ ...p, takeProfit: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid #22c55e44' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Sentiment</label>
              <div className="flex gap-1">
                {(['bullish','neutral','bearish'] as const).map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, sentiment: s }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition"
                    style={{
                      background: form.sentiment === s
                        ? (s === 'bullish' ? '#22c55e33' : s === 'bearish' ? '#ef444433' : '#6366f133')
                        : 'var(--color-bg)',
                      color: form.sentiment === s
                        ? (s === 'bullish' ? '#22c55e' : s === 'bearish' ? '#ef4444' : '#818cf8')
                        : 'var(--color-muted)',
                      border: '1px solid var(--color-border)',
                    }}>
                    {s === 'bullish' ? '🟢' : s === 'bearish' ? '🔴' : '⚪'} {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Journal / Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="เหตุผลที่เทรด, setup ที่เห็น, ความรู้สึก..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface)' }}>
        {(['positions', 'history', 'analytics', 'market'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-sm capitalize transition"
            style={{ background: tab === t ? 'var(--color-accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--color-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Simulate pair selector */}
      {pairs.length > 0 && (tab === 'positions' || tab === 'history') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Simulate pair:</span>
          <button onClick={() => setSimPair('')}
            className={clsx('px-2 py-1 rounded text-xs')}
            style={{ background: !simPair ? '#6366f133' : 'transparent', color: !simPair ? '#a78bfa' : 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
            All
          </button>
          {pairs.map(p => (
            <button key={p} onClick={() => setSimPair(p)}
              className="px-2 py-1 rounded text-xs"
              style={{ background: simPair === p ? '#6366f133' : 'transparent', color: simPair === p ? '#a78bfa' : 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── POSITIONS TAB ── */}
      {tab === 'positions' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface)' }}>
                {['Date', 'Pair', 'Type', 'Entry', 'SL / TP', 'Current', 'Unrealized P&L', 'Risk', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 size={20} className="animate-spin mx-auto" style={{ color: 'var(--color-muted)' }} /></td></tr>
              ) : open.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>ไม่มี open positions</td></tr>
              ) : open.map(t => (
                <tr key={t.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.date}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.pair}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                      style={{ background: t.type === 'Buy' ? '#22c55e22' : '#ef444422', color: t.type === 'Buy' ? '#22c55e' : '#ef4444' }}>
                      {t.type === 'Buy' ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{t.price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs space-y-0.5">
                      {t.stopLoss   && <div style={{ color: '#ef4444' }}>SL: {t.stopLoss.toLocaleString()}</div>}
                      {t.takeProfit && <div style={{ color: '#22c55e' }}>TP: {t.takeProfit.toLocaleString()}</div>}
                      {!t.stopLoss && !t.takeProfit && <span style={{ color: 'var(--color-muted)' }}>—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const p = prices[baseCurrency(t.pair)];
                      if (!p) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
                      return (
                        <div>
                          <div className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>{p.usd.toLocaleString()}</div>
                          <div className="text-xs" style={{ color: p.usd_24h_change >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatChange(p.usd_24h_change)}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-xs">
                    {(() => {
                      const p = prices[baseCurrency(t.pair)];
                      if (!p) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
                      const uPnl = t.type === 'Buy'
                        ? (p.usd - t.price) * t.amount
                        : (t.price - p.usd) * t.amount;
                      return (
                        <span style={{ color: uPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                          {uPnl >= 0 ? '+' : ''}{uPnl.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      if (!t.stopLoss || !portfolioSize) return <span className="text-xs" style={{ color: 'var(--color-muted)' }}>—</span>;
                      const riskPct = Math.abs(t.price - t.stopLoss) * t.amount / portfolioSize * 100;
                      const rr = t.takeProfit
                        ? (Math.abs(t.takeProfit - t.price) / Math.abs(t.price - t.stopLoss)).toFixed(1)
                        : null;
                      return (
                        <div className="text-xs space-y-0.5">
                          <span className="px-1.5 py-0.5 rounded font-medium"
                            style={{ background: riskPct > 5 ? '#ef444422' : riskPct > 2 ? '#f59e0b22' : '#22c55e22',
                                     color:      riskPct > 5 ? '#ef4444'   : riskPct > 2 ? '#f59e0b'   : '#22c55e' }}>
                            {riskPct.toFixed(1)}%
                          </span>
                          {rr && <div style={{ color: 'var(--color-muted)' }}>R:R {rr}</div>}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {closingId === t.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" placeholder="Close price" value={closePrice}
                          onChange={e => setClosePrice(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleClose(t)}
                          className="w-24 px-2 py-1 rounded text-xs outline-none"
                          style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                          autoFocus />
                        <button onClick={() => handleClose(t)} className="px-2 py-1 rounded text-xs text-white" style={{ background: '#22c55e' }}>✓</button>
                        <button onClick={() => { setClosingId(null); setClosePrice(''); }}
                          className="px-1 py-1 rounded text-xs" style={{ color: 'var(--color-muted)' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setClosingId(t.id!)}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b33' }}>
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface)' }}>
                {['Closed', 'Pair', 'Type', 'Entry', 'Exit', 'Amount', 'P&L', 'Sentiment / Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closed.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>ยังไม่มีประวัติ closed trades</td></tr>
              ) : closed.map(t => (
                <tr key={t.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.closedAt || t.date}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.pair}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium" style={{ color: t.type === 'Buy' ? '#22c55e' : '#ef4444' }}>{t.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.closePrice?.toLocaleString() ?? '-'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.amount}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: (t.pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(t.pnl ?? 0) >= 0 ? '+' : ''}{(t.pnl ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {t.sentiment && (
                        <span className="text-xs px-1.5 py-0.5 rounded w-fit"
                          style={{
                            background: t.sentiment === 'bullish' ? '#22c55e22' : t.sentiment === 'bearish' ? '#ef444422' : '#6366f122',
                            color: t.sentiment === 'bullish' ? '#22c55e' : t.sentiment === 'bearish' ? '#ef4444' : '#818cf8',
                          }}>
                          {t.sentiment === 'bullish' ? '🟢' : t.sentiment === 'bearish' ? '🔴' : '⚪'} {t.sentiment}
                        </span>
                      )}
                      {t.notes && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{t.notes}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MARKET TAB ── */}
      {tab === 'market' && (
        <div className="space-y-3">
          {/* Header + Refresh */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Fetching prices...'}
            </span>
            <button onClick={refreshPrices} disabled={priceLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
              <RefreshCw size={12} className={priceLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {pairs.length === 0 ? (
            <div className="text-sm text-center py-12" style={{ color: 'var(--color-muted)' }}>
              เพิ่ม trade ก่อนเพื่อดูราคาตลาด
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    {['Pair', 'Current Price (USD)', '24h Change', 'Open Positions', 'Total Exposure'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pairs.map(pair => {
                    const base = baseCurrency(pair);
                    const p    = prices[base];
                    const openForPair = open.filter(t => t.pair === pair);
                    const exposure    = openForPair.reduce((s, t) => s + t.price * t.amount, 0);
                    return (
                      <tr key={pair} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>{pair}</td>
                        <td className="px-4 py-3">
                          {priceLoading && !p
                            ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-muted)' }} />
                            : p
                              ? <span className="font-medium" style={{ color: 'var(--color-text)' }}>${p.usd.toLocaleString()}</span>
                              : <span style={{ color: 'var(--color-muted)' }}>ไม่รองรับ</span>}
                        </td>
                        <td className="px-4 py-3">
                          {p ? (
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                              style={{ background: p.usd_24h_change >= 0 ? '#22c55e22' : '#ef444422', color: p.usd_24h_change >= 0 ? '#22c55e' : '#ef4444' }}>
                              {p.usd_24h_change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {formatChange(p.usd_24h_change)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{openForPair.length}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text)' }}>
                          {exposure > 0 ? `$${exposure.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            ราคาจาก CoinGecko · อัปเดตทุก 60 วินาที · รองรับ crypto เท่านั้น
          </p>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {closed.length === 0 ? (
            <div className="text-sm text-center py-12" style={{ color: 'var(--color-muted)' }}>
              ปิด trade แรกก่อนเพื่อดู analytics
            </div>
          ) : (
            <>
              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Best Trade</div>
                  <div className="font-bold" style={{ color: '#22c55e' }}>
                    {bestTrade ? `+${(bestTrade.pnl ?? 0).toLocaleString()} (${bestTrade.pair})` : '-'}
                  </div>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Worst Trade</div>
                  <div className="font-bold" style={{ color: '#ef4444' }}>
                    {worstTrade ? `${(worstTrade.pnl ?? 0).toLocaleString()} (${worstTrade.pair})` : '-'}
                  </div>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Win / Loss</div>
                  <div className="font-bold" style={{ color: 'var(--color-text)' }}>
                    {wins}W · {closed.length - wins}L
                  </div>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Avg P&L per trade</div>
                  <div className="font-bold" style={{ color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {closed.length > 0 ? (totalPnl / closed.length).toFixed(2) : '-'}
                  </div>
                </div>
              </div>

              {/* Risk Overview */}
              {portfolioSize > 0 && open.some(t => t.stopLoss) && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="px-4 py-3 text-sm font-medium border-b flex items-center gap-2"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                    <ShieldAlert size={14} style={{ color: '#f59e0b' }} /> Risk Overview
                    <span className="ml-auto text-xs" style={{ color: 'var(--color-muted)' }}>Portfolio: ${portfolioSize.toLocaleString()}</span>
                  </div>
                  {open.filter(t => t.stopLoss).map(t => {
                    const riskPct = Math.abs(t.price - t.stopLoss!) * t.amount / portfolioSize * 100;
                    const rr = t.takeProfit
                      ? (Math.abs(t.takeProfit - t.price) / Math.abs(t.price - t.stopLoss!)).toFixed(1)
                      : null;
                    return (
                      <div key={t.id} className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: 'var(--color-border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t.pair}</span>
                        <span className="text-xs" style={{ color: '#ef4444' }}>SL: {t.stopLoss?.toLocaleString()}</span>
                        {t.takeProfit && <span className="text-xs" style={{ color: '#22c55e' }}>TP: {t.takeProfit.toLocaleString()}</span>}
                        {rr && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#6366f122', color: '#818cf8' }}>R:R {rr}</span>}
                        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: riskPct > 5 ? '#ef444422' : riskPct > 2 ? '#f59e0b22' : '#22c55e22',
                                   color:      riskPct > 5 ? '#ef4444'   : riskPct > 2 ? '#f59e0b'   : '#22c55e' }}>
                          {riskPct.toFixed(1)}% risk
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sentiment Analysis */}
              {(() => {
                const sentimentData = [
                  { key: 'bullish', label: '🟢 Bullish', color: '#22c55e' },
                  { key: 'bearish', label: '🔴 Bearish', color: '#ef4444' },
                  { key: 'neutral', label: '⚪ Neutral', color: '#818cf8' },
                ].map(s => ({
                  ...s,
                  count: trades.filter(t => t.sentiment === s.key).length,
                  winRate: (() => {
                    const sentTrades = closed.filter(t => t.sentiment === s.key);
                    if (!sentTrades.length) return null;
                    return Math.round(sentTrades.filter(t => (t.pnl ?? 0) > 0).length / sentTrades.length * 100);
                  })(),
                })).filter(s => s.count > 0);

                if (!sentimentData.length) return null;
                return (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="px-4 py-3 text-sm font-medium border-b" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                      Sentiment Analysis
                    </div>
                    <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--color-border)' }}>
                      {sentimentData.map(s => (
                        <div key={s.key} className="px-4 py-3 text-center">
                          <div className="text-lg font-bold" style={{ color: s.color }}>{s.count}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{s.label} trades</div>
                          {s.winRate !== null && (
                            <div className="text-xs mt-1 font-medium" style={{ color: s.winRate >= 50 ? '#22c55e' : '#ef4444' }}>
                              {s.winRate}% win rate
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* P&L by pair */}
              {pnlByPair.length > 0 && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="px-4 py-3 text-sm font-medium border-b" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                    P&L by Pair
                  </div>
                  {pnlByPair.map(p => {
                    const maxAbs = Math.max(...pnlByPair.map(x => Math.abs(x.pnl)));
                    const pct = maxAbs > 0 ? Math.abs(p.pnl) / maxAbs * 100 : 0;
                    return (
                      <div key={p.pair} className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.pair}</span>
                          <span className="text-sm font-semibold" style={{ color: p.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                            {p.pnl >= 0 ? '+' : ''}{p.pnl.toLocaleString()}
                            <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-muted)' }}>({p.trades} trades)</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.pnl >= 0 ? '#22c55e' : '#ef4444' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
