import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FitnessLog, FitnessGoal } from '../types';
import { Plus, Dumbbell, Target, CheckSquare, Square, Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/CustomSelect';

const UID = 'demo-user';

export default function FitnessPage() {
  const [logs, setLogs]         = useState<FitnessLog[]>([]);
  const [goals, setGoals]       = useState<FitnessGoal[]>([]);
  const [tab, setTab]           = useState<'logs' | 'goals'>('logs');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ title: '', type: 'Workout', duration: '', intensity: 'Medium', calories: '', protein: '' });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'fitnessLogs'), orderBy('createdAt', 'desc'), limit(30)),
        s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as FitnessLog))), () => {}),
      onSnapshot(query(collection(db, 'fitnessGoals'), limit(5)),
        s => setGoals(s.docs.map(d => ({ id: d.id, ...d.data() } as FitnessGoal))), () => {}),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const addLog = async () => {
    if (!form.title.trim()) return toast.error('กรอกชื่อกิจกรรม');
    setLoading(true);
    try {
      await addDoc(collection(db, 'fitnessLogs'), {
        ...form,
        calories: form.calories ? +form.calories : undefined,
        completed: false,
        uid: UID,
        createdAt: serverTimestamp(),
      });
      setForm({ title: '', type: 'Workout', duration: '', intensity: 'Medium', calories: '', protein: '' });
      setShowForm(false);
      toast.success('เพิ่มกิจกรรมแล้ว');
    } catch { toast.error('บันทึกไม่สำเร็จ — ตรวจสอบ Firestore'); }
    finally { setLoading(false); }
  };

  const toggleLog = async (l: FitnessLog) => {
    try {
      await updateDoc(doc(db, 'fitnessLogs', l.id!), { completed: !l.completed });
    } catch { toast.error('อัปเดตไม่สำเร็จ'); }
  };

  const totalCalories  = logs.filter(l => l.completed && l.calories).reduce((s, l) => s + (l.calories || 0), 0);
  const completedToday = logs.filter(l => l.completed).length;

  const inputStyle = {
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Fitness</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Workouts & goals</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:brightness-110"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        >
          <Plus size={15} /> Add Activity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed', value: completedToday, icon: <CheckSquare size={18} />, color: '#22c55e' },
          { label: 'Total Calories', value: totalCalories, icon: <Flame size={18} />, color: '#ef4444' },
          { label: 'Activities', value: logs.length, icon: <Dumbbell size={18} />, color: '#6366f1' },
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
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Activity</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Push-ups, Running..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.border = '1px solid var(--color-accent)')}
                onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
              />
            </div>
            {[
              { key: 'duration', label: 'Duration', placeholder: '30 min' },
              { key: 'calories', label: 'Calories', placeholder: '300', type: 'number' },
              { key: 'protein',  label: 'Protein (g)', placeholder: '25' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.border = '1px solid var(--color-accent)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Intensity</label>
              <CustomSelect
                value={form.intensity}
                onChange={v => setForm(p => ({ ...p, intensity: v }))}
                options={['Low', 'Medium', 'High']}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addLog}
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface)' }}>
        {(['logs', 'goals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-sm capitalize transition-all duration-150"
            style={{ background: tab === t ? 'var(--color-accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--color-muted)' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Logs */}
      {tab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>No activities yet</div>
            : logs.map(l => (
              <div
                key={l.id}
                className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 active:scale-[0.99] hover:brightness-110"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', opacity: l.completed ? 0.6 : 1 }}
                onClick={() => toggleLog(l)}
              >
                {l.completed
                  ? <CheckSquare size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                  : <Square size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />}
                <div className="flex-1 min-w-0">
                  <div className={l.completed ? 'line-through text-sm' : 'text-sm'} style={{ color: l.completed ? 'var(--color-muted)' : 'var(--color-text)' }}>
                    {l.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    {[l.duration, l.intensity, l.calories ? `${l.calories} cal` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {l.calories && (
                  <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: '#ef4444' }}>
                    <Flame size={12} />{l.calories}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Goals */}
      {tab === 'goals' && (
        <div className="space-y-3">
          {goals.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>No goals set</div>
            : goals.map(g => (
              <div key={g.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} style={{ color: '#6366f1' }} />
                  <span className="font-medium text-sm capitalize" style={{ color: 'var(--color-text)' }}>{g.type.replace('_', ' ')}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted)' }}>{g.startDate} → {g.endDate}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span style={{ color: 'var(--color-muted)' }}>Current</span><br /><span className="font-semibold" style={{ color: 'var(--color-text)' }}>{g.currentWeight} kg</span></div>
                  <div><span style={{ color: 'var(--color-muted)' }}>Target</span><br /><span className="font-semibold" style={{ color: '#6366f1' }}>{g.targetWeight} kg</span></div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
