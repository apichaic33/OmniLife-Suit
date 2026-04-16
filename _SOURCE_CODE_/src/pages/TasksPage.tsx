import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task } from '../types';
import { Plus, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';

const UID = 'demo-user';

export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task))), () => {});
  }, []);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    await addDoc(collection(db, 'tasks'), { title: newTitle, completed: false, uid: UID, createdAt: serverTimestamp() });
    setNewTitle('');
    toast.success('Task added');
  };

  const toggle = async (t: Task) => {
    await updateDoc(doc(db, 'tasks', t.id!), { completed: !t.completed });
  };

  const pending   = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Tasks</h1>
      <div className="flex gap-2">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task..." className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
        <button onClick={addTask} className="px-3 py-2 rounded-lg" style={{ background: 'var(--color-accent)', color: '#fff' }}>
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {pending.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-white/3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} onClick={() => toggle(t)}>
            <Square size={16} style={{ color: 'var(--color-muted)' }} />
            <span style={{ color: 'var(--color-text)' }}>{t.title}</span>
            {t.priority && <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{ background: t.priority === 'high' ? '#ef444422' : t.priority === 'medium' ? '#f59e0b22' : '#22c55e22',
                color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e' }}>{t.priority}</span>}
          </div>
        ))}
        {completed.length > 0 && (
          <>
            <p className="text-xs pt-2" style={{ color: 'var(--color-muted)' }}>Completed ({completed.length})</p>
            {completed.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer opacity-50"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} onClick={() => toggle(t)}>
                <CheckSquare size={16} style={{ color: '#22c55e' }} />
                <span className="line-through" style={{ color: 'var(--color-muted)' }}>{t.title}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
