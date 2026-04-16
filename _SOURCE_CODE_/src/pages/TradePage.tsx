import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildTradeSeed } from '../lib/mirofish';
import type { Trade } from '../types';
import { TrendingUp, TrendingDown, Plus, Fish, Loader2, X, DollarSign, Target, BarChart2, Activity } from 'lucide-react';
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
  const [tab, setTab]                 = useState<'positions' | 'history' | 'analytics'>('positions');
  const [form, setForm]               = useState({ pair: '', type: 'Buy', price: '', amount: '' });

  useEffect(() => {
    const q = query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, snap => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trade)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

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
      ...form, price: +form.price, amount: +form.amount,
      status: 'Open', uid: DEMO_UID,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    toast.success('เพิ่ม Trade แล้ว');
    setShowAddForm(false);
    setForm({ pair: '', type: 'Buy', price: '', amount: '' });
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
    const seed = buildTradeSeed(trades, simPair || undefined);
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
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface)' }}>
        {(['positions', 'history', 'analytics'] as const).map(t => (
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
                {['Date', 'Pair', 'Type', 'Entry Price', 'Amount', 'Value', 'Action'].map(h => (
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
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{t.amount}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                    {(t.price * t.amount).toLocaleString()}
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
                {['Closed', 'Pair', 'Type', 'Entry', 'Exit', 'Amount', 'P&L'].map(h => (
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
                </tr>
              ))}
            </tbody>
          </table>
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
