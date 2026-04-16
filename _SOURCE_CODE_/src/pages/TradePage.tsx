import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildTradeSeed, uploadSeed, startSimulation, getSimulationHistory } from '../lib/mirofish';
import type { Trade } from '../types';
import { TrendingUp, TrendingDown, Plus, Fish, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import MiroFishSimulator from '../components/MiroFishSimulator';

const DEMO_UID = 'demo-user';

export default function TradePage() {
  const [trades, setTrades]           = useState<Trade[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showSim, setShowSim]         = useState(false);
  const [simPair, setSimPair]         = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm]               = useState({ pair: '', type: 'Buy', price: '', amount: '', status: 'Open' });

  // Live Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, snap => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trade)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const pairs = [...new Set(trades.map(t => t.pair))];

  const handleAdd = async () => {
    if (!form.pair || !form.price || !form.amount) return toast.error('กรอกข้อมูลให้ครบ');
    await addDoc(collection(db, 'trades'), {
      ...form, price: +form.price, amount: +form.amount,
      uid: DEMO_UID, date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    toast.success('เพิ่ม Trade แล้ว');
    setShowAddForm(false);
    setForm({ pair: '', type: 'Buy', price: '', amount: '', status: 'Open' });
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
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{trades.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          >
            <Plus size={15} /> Add Trade
          </button>
          <button
            onClick={handleSimulate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
          >
            <Fish size={15} /> Simulate with MiroFish
          </button>
        </div>
      </div>

      {/* Simulate pair selector */}
      {pairs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Simulate pair:</span>
          <button
            onClick={() => setSimPair('')}
            className={clsx('px-2 py-1 rounded text-xs', !simPair && 'font-bold')}
            style={{ background: !simPair ? '#6366f133' : 'transparent', color: !simPair ? '#a78bfa' : 'var(--color-muted)', border: '1px solid var(--color-border)' }}
          >All</button>
          {pairs.map(p => (
            <button
              key={p}
              onClick={() => setSimPair(p)}
              className={clsx('px-2 py-1 rounded text-xs', simPair === p && 'font-bold')}
              style={{ background: simPair === p ? '#6366f133' : 'transparent', color: simPair === p ? '#a78bfa' : 'var(--color-muted)', border: '1px solid var(--color-border)' }}
            >{p}</button>
          ))}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'pair', label: 'Pair', placeholder: 'BTC/USDT' },
              { key: 'price', label: 'Price', placeholder: '85000', type: 'number' },
              { key: 'amount', label: 'Amount', placeholder: '0.1', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Type</label>
              <select
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              >
                <option>Buy</option>
                <option>Sell</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Trade List */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              {['Date', 'Pair', 'Type', 'Price', 'Amount', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 size={20} className="animate-spin mx-auto" style={{ color: 'var(--color-muted)' }} /></td></tr>
            ) : trades.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No trades yet — add your first trade</td></tr>
            ) : trades.map(t => (
              <tr key={t.id} className="border-t hover:bg-white/2 transition" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{t.date}</td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.pair}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                    style={{ background: t.type === 'Buy' ? '#22c55e22' : '#ef444422', color: t.type === 'Buy' ? '#22c55e' : '#ef4444' }}>
                    {t.type === 'Buy' ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {t.type}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{t.price?.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{t.amount}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
