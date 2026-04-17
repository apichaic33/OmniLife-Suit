import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task } from '../types';
import { Plus, CheckSquare, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const UID = 'demo-user';

export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task))), () => {});
  }, []);

  const addTask = async () => {
    if (!newTitle.trim()) return toast.error('กรอกชื่อ task ก่อน');
    setLoading(true);
    try {
      await addDoc(collection(db, 'tasks'), { title: newTitle, completed: false, uid: UID, createdAt: serverTimestamp() });
      setNewTitle('');
      toast.success('เพิ่ม task แล้ว');
    } catch { toast.error('บันทึกไม่สำเร็จ — ตรวจสอบ Firestore'); }
    finally { setLoading(false); }
  };

  const toggle = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id!), { completed: !t.completed });
    } catch { toast.error('อัปเดตไม่สำเร็จ'); }
  };

  const pending   = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Tasks</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {pending.length} pending · {completed.length} done
        </p>
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && addTask()}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          onFocus={e => (e.currentTarget.style.border = '1px solid var(--color-accent)')}
          onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
        />
        <button
          onClick={addTask}
          disabled={loading}
          className="px-3 py-2 rounded-lg transition-all duration-150 active:scale-95 hover:brightness-110 disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {loading
            ? <Loader2 size={16} className="animate-spin" />
            : <Plus size={16} />}
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {pending.length === 0 && completed.length === 0 && (
          <div className="text-sm text-center py-10" style={{ color: 'var(--color-muted)' }}>
            ยังไม่มี task — เพิ่มด้านบนได้เลย
          </div>
        )}

        {pending.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 active:scale-[0.99] hover:brightness-110"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={() => toggle(t)}
          >
            <Square size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text)' }}>{t.title}</span>
            {t.priority && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: t.priority === 'high' ? '#ef444422' : t.priority === 'medium' ? '#f59e0b22' : '#22c55e22',
                  color:      t.priority === 'high' ? '#ef4444'   : t.priority === 'medium' ? '#f59e0b'   : '#22c55e',
                }}>
                {t.priority}
              </span>
            )}
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <p className="text-xs pt-2" style={{ color: 'var(--color-muted)' }}>
              Completed ({completed.length})
            </p>
            {completed.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer opacity-50 transition-all duration-150 active:scale-[0.99] hover:opacity-70"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                onClick={() => toggle(t)}
              >
                <CheckSquare size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span className="line-through" style={{ color: 'var(--color-muted)' }}>{t.title}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
