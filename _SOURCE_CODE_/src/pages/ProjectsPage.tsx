import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Project } from '../types';
import { Plus, FolderKanban, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const UID = 'demo-user';

const statusColors: Record<string, { bg: string; text: string }> = {
  Active:      { bg: '#22c55e22', text: '#22c55e' },
  Planning:    { bg: '#6366f122', text: '#818cf8' },
  'On Hold':   { bg: '#f59e0b22', text: '#f59e0b' },
  Completed:   { bg: '#64748b22', text: '#64748b' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', category: '', status: 'Planning', due: '', tasks: '0', completedTasks: '0' });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(30));
    return onSnapshot(q, s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))), () => {});
  }, []);

  const addProject = async () => {
    if (!form.title.trim()) return toast.error('กรอกชื่อโปรเจกต์');
    const tasks = +form.tasks || 0;
    const completedTasks = +form.completedTasks || 0;
    await addDoc(collection(db, 'projects'), {
      ...form,
      tasks,
      completedTasks,
      progress: tasks > 0 ? Math.round((completedTasks / tasks) * 100) : 0,
      uid: UID,
      createdAt: serverTimestamp(),
    });
    setForm({ title: '', category: '', status: 'Planning', due: '', tasks: '0', completedTasks: '0' });
    setShowForm(false);
    toast.success('เพิ่มโปรเจกต์แล้ว');
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Projects</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{projects.length} projects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Project Name</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="My Project..." className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Category</label>
              <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="Tech, Business..." className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                <option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Total Tasks</label>
              <input type="number" value={form.tasks} onChange={e => setForm(p => ({ ...p, tasks: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Completed Tasks</label>
              <input type="number" value={form.completedTasks} onChange={e => setForm(p => ({ ...p, completedTasks: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Due Date</label>
              <input type="date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addProject} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-sm text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <FolderKanban size={32} className="mx-auto mb-2 opacity-30" />
          No projects yet
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(p => {
            const c = statusColors[p.status] ?? { bg: '#64748b22', text: '#64748b' };
            return (
              <div key={p.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.title}</div>
                    {p.category && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.category}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.due && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.due}</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>{p.status}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
                    <span className="flex items-center gap-1"><CheckCircle2 size={11} />{p.completedTasks}/{p.tasks} tasks</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: 'var(--color-accent)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
