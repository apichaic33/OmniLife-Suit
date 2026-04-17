import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Asset } from '../types';
import { Plus, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/CustomSelect';

const UID = 'demo-user';

export default function AssetsPage() {
  const [assets, setAssets]     = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ name: '', category: '', value: '', change: '0%', type: 'up' as 'up' | 'down' });

  useEffect(() => {
    const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => setAssets(s.docs.map(d => ({ id: d.id, ...d.data() } as Asset))), () => {});
  }, []);

  const addAsset = async () => {
    if (!form.name.trim() || !form.value) return toast.error('กรอกข้อมูลให้ครบ');
    setLoading(true);
    try {
      await addDoc(collection(db, 'assets'), {
        ...form,
        value: +form.value,
        uid: UID,
        createdAt: serverTimestamp(),
      });
      setForm({ name: '', category: '', value: '', change: '0%', type: 'up' });
      setShowForm(false);
      toast.success('เพิ่มสินทรัพย์แล้ว');
    } catch { toast.error('บันทึกไม่สำเร็จ — ตรวจสอบ Firestore'); }
    finally { setLoading(false); }
  };

  const totalValue = assets.reduce((s, a) => s + a.value, 0);
  const categories = [...new Set(assets.map(a => a.category).filter(Boolean))];

  const inputStyle = {
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  };
  const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.border = '1px solid var(--color-accent)');
  const blurBorder  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.border = '1px solid var(--color-border)');

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Assets</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Total: ฿{totalValue.toLocaleString()}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:brightness-110"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        >
          <Plus size={15} /> Add Asset
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} style={{ color: '#6366f1' }} />
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Total Portfolio Value</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>฿{totalValue.toLocaleString()}</div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{assets.length} assets · {categories.length} categories</div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Asset Name</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="BTC, House, Car..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Category</label>
              <input
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="Crypto, Real Estate..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Value (฿)</label>
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder="100000"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Change</label>
              <input
                value={form.change}
                onChange={e => setForm(p => ({ ...p, change: e.target.value }))}
                placeholder="+5.2%"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Trend</label>
              <CustomSelect
                value={form.type}
                onChange={v => setForm(p => ({ ...p, type: v as 'up' | 'down' }))}
                options={[
                  { value: 'up',   label: '▲ Up'   },
                  { value: 'down', label: '▼ Down' },
                ]}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addAsset}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150 active:scale-95 hover:brightness-110 disabled:opacity-60"
              style={{ background: 'var(--color-accent)' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm transition-all duration-150 active:scale-95 hover:brightness-110"
              style={{ color: 'var(--color-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <div className="text-sm text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <Wallet size={32} className="mx-auto mb-2 opacity-30" />
          No assets recorded
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {categories.map(cat => (
            <div key={cat}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>{cat}</div>
              {assets.filter(a => a.category === cat).map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border mb-2"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{a.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{a.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>฿{a.value.toLocaleString()}</div>
                    <div className="text-xs flex items-center gap-1 justify-end" style={{ color: a.type === 'up' ? '#22c55e' : '#ef4444' }}>
                      {a.type === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {a.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {assets.filter(a => !a.category).map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{a.name}</div>
              <div className="text-right">
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>฿{a.value.toLocaleString()}</div>
                <div className="text-xs flex items-center gap-1 justify-end" style={{ color: a.type === 'up' ? '#22c55e' : '#ef4444' }}>
                  {a.type === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {a.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
