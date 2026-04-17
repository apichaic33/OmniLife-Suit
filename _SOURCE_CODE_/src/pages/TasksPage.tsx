import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task } from '../types';
import { Plus, CheckSquare, Square, Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const UID = 'demo-user';

export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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

  const deleteTask = async (t: Task) => {
    try {
      await deleteDoc(doc(db, 'tasks', t.id!));
      toast.success('ลบแล้ว');
    } catch { toast.error('ลบไม่สำเร็จ'); }
  };

  const startEdit = (t: Task) => {
    setEditId(t.id!);
    setEditText(t.title);
  };

  const saveEdit = async () => {
    if (!editText.trim() || !editId) return;
    try {
      await updateDoc(doc(db, 'tasks', editId), { title: editText });
      setEditId(null);
      toast.success('แก้ไขแล้ว');
    } catch { toast.error('แก้ไขไม่สำเร็จ'); }
  };

  const pending   = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  const TaskRow = ({ t, dim = false }: { t: Task; dim?: boolean }) => (
    <div
      className="group flex items-center gap-3 p-3 rounded-xl border transition-all duration-150"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', opacity: dim ? 0.55 : 1 }}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggle(t)}
        className="flex-shrink-0 transition-all duration-150 active:scale-90"
      >
        {t.completed
          ? <CheckSquare size={16} style={{ color: '#22c55e' }} />
          : <Square size={16} style={{ color: 'var(--color-muted)' }} />}
      </button>

      {/* Title / Edit field */}
      {editId === t.id ? (
        <input
          autoFocus
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
          className="flex-1 px-2 py-0.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-accent)' }}
        />
      ) : (
        <span
          className={`flex-1 text-sm ${t.completed ? 'line-through' : ''}`}
          style={{ color: t.completed ? 'var(--color-muted)' : 'var(--color-text)' }}
        >
          {t.title}
        </span>
      )}

      {/* Priority badge */}
      {t.priority && editId !== t.id && (
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: t.priority === 'high' ? '#ef444422' : t.priority === 'medium' ? '#f59e0b22' : '#22c55e22',
            color:      t.priority === 'high' ? '#ef4444'   : t.priority === 'medium' ? '#f59e0b'   : '#22c55e',
          }}>
          {t.priority}
        </span>
      )}

      {/* Action buttons */}
      {editId === t.id ? (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={saveEdit} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110" style={{ background: '#22c55e22', color: '#22c55e' }}>
            <Check size={13} />
          </button>
          <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={e => { e.stopPropagation(); startEdit(t); }}
            className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
            style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}
            title="แก้ไข"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); deleteTask(t); }}
            className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
            style={{ background: '#ef444422', color: '#ef4444' }}
            title="ลบ"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );

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
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          onFocus={e => (e.currentTarget.style.border = '1px solid var(--color-accent)')}
          onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
        />
        <button
          onClick={addTask}
          disabled={loading}
          className="px-3 py-2 rounded-lg transition-all duration-150 active:scale-95 hover:brightness-110 disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {pending.length === 0 && completed.length === 0 && (
          <div className="text-sm text-center py-10" style={{ color: 'var(--color-muted)' }}>
            ยังไม่มี task — เพิ่มด้านบนได้เลย
          </div>
        )}

        {pending.map(t => <TaskRow key={t.id} t={t} />)}

        {completed.length > 0 && (
          <>
            <p className="text-xs pt-2" style={{ color: 'var(--color-muted)' }}>
              Completed ({completed.length})
            </p>
            {completed.map(t => <TaskRow key={t.id} t={t} dim />)}
          </>
        )}
      </div>
    </div>
  );
}
