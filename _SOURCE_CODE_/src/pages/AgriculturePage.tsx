import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Plant } from '../types';
import { Plus, Leaf, Sprout, FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/CustomSelect';

const UID = 'demo-user';

const healthColor = (h: number) => h >= 80 ? '#22c55e' : h >= 50 ? '#f59e0b' : '#ef4444';

const statusColors: Record<string, { bg: string; text: string }> = {
  Seedling:   { bg: '#22c55e22', text: '#22c55e' },
  Growing:    { bg: '#6366f122', text: '#818cf8' },
  Flowering:  { bg: '#f59e0b22', text: '#f59e0b' },
  Harvesting: { bg: '#06b6d422', text: '#22d3ee' },
  Done:       { bg: '#64748b22', text: '#64748b' },
};

export default function AgriculturePage() {
  const [plants, setPlants]     = useState<Plant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ name: '', method: '', status: 'Seedling', health: '80', planted: '', harvest: '', isExperimental: false });

  useEffect(() => {
    const q = query(collection(db, 'plants'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => setPlants(s.docs.map(d => ({ id: d.id, ...d.data() } as Plant))), () => {});
  }, []);

  const addPlant = async () => {
    if (!form.name.trim()) return toast.error('กรอกชื่อพืช');
    setLoading(true);
    try {
      await addDoc(collection(db, 'plants'), {
        ...form,
        health: +form.health || 80,
        uid: UID,
        createdAt: serverTimestamp(),
      });
      setForm({ name: '', method: '', status: 'Seedling', health: '80', planted: '', harvest: '', isExperimental: false });
      setShowForm(false);
      toast.success('เพิ่มพืชแล้ว');
    } catch { toast.error('บันทึกไม่สำเร็จ — ตรวจสอบ Firestore'); }
    finally { setLoading(false); }
  };

  const active       = plants.filter(p => p.status !== 'Done');
  const done         = plants.filter(p => p.status === 'Done');
  const experimental = plants.filter(p => p.isExperimental);

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
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Agriculture</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{active.length} active · {experimental.length} experimental</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:brightness-110"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        >
          <Plus size={15} /> Add Plant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active',       value: active.length,       color: '#22c55e', icon: <Sprout size={18} /> },
          { label: 'Experimental', value: experimental.length, color: '#818cf8', icon: <FlaskConical size={18} /> },
          { label: 'Completed',    value: done.length,         color: '#64748b', icon: <Leaf size={18} /> },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.label}</span>
            </div>
            <div className="text-lg font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Plant Name</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Tomato, Basil..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Method</label>
              <input
                value={form.method}
                onChange={e => setForm(p => ({ ...p, method: e.target.value }))}
                placeholder="Hydroponic, Soil..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Status</label>
              <CustomSelect
                value={form.status}
                onChange={v => setForm(p => ({ ...p, status: v }))}
                options={['Seedling', 'Growing', 'Flowering', 'Harvesting', 'Done']}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Health (%)</label>
              <input
                type="number" min="0" max="100"
                value={form.health}
                onChange={e => setForm(p => ({ ...p, health: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Planted Date</label>
              <input
                type="date"
                value={form.planted}
                onChange={e => setForm(p => ({ ...p, planted: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Expected Harvest</label>
              <input
                type="date"
                value={form.harvest}
                onChange={e => setForm(p => ({ ...p, harvest: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--color-muted)' }}>
              <input type="checkbox" checked={form.isExperimental} onChange={e => setForm(p => ({ ...p, isExperimental: e.target.checked }))} />
              Experimental
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPlant}
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

      {/* Plant List */}
      {plants.length === 0 ? (
        <div className="text-sm text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <Leaf size={32} className="mx-auto mb-2 opacity-30" />
          No plants recorded
        </div>
      ) : (
        <div className="space-y-3">
          {plants.map(p => {
            const sc = statusColors[p.status] ?? { bg: '#64748b22', text: '#64748b' };
            return (
              <div key={p.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Leaf size={16} style={{ color: '#22c55e' }} />
                    <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                    {p.isExperimental && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#818cf822', color: '#818cf8' }}>
                        <FlaskConical size={10} className="inline mr-0.5" />exp
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{p.status}</span>
                </div>
                {p.method && <div className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>{p.method}</div>}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
                    <span>Health</span>
                    <span style={{ color: healthColor(p.health) }}>{p.health}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.health}%`, background: healthColor(p.health) }} />
                  </div>
                </div>
                {(p.planted || p.harvest) && (
                  <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                    {p.planted && <span>Planted: {p.planted}</span>}
                    {p.harvest && <span>Harvest: {p.harvest}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
