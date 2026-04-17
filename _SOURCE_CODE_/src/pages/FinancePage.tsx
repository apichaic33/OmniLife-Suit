import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildFinanceSeed } from '../lib/mirofish';
import type { Transaction, Debt, Business } from '../types';
import {
  Fish, TrendingUp, TrendingDown, Wallet,
  Plus, Pencil, Trash2, Check, X, Loader2,
} from 'lucide-react';
import MiroFishSimulator from '../components/MiroFishSimulator';
import CustomSelect from '../components/CustomSelect';
import { toast } from 'sonner';

const UID = 'demo-user';

const EXPENSE_CATS = ['อาหาร', 'ที่พัก', 'เดินทาง', 'สุขภาพ', 'การศึกษา', 'บันเทิง', 'ช็อปปิ้ง', 'ค่างวด', 'อื่นๆ'];
const INCOME_CATS  = ['เงินเดือน', 'ธุรกิจ', 'ลงทุน', 'ค่าเช่า', 'ฟรีแลนซ์', 'อื่นๆ'];

type Tab = 'transactions' | 'debts' | 'businesses';

/* ─── small helpers ─────────────────────────────────────────── */
const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150';
const inputStyle = { background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' };
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  (e.currentTarget.style.border = '1px solid var(--color-accent)');
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  (e.currentTarget.style.border = '1px solid var(--color-border)');

/* ─── default forms ─────────────────────────────────────────── */
const defTx: Omit<Transaction, 'id' | 'uid' | 'createdAt'> = {
  title: '', category: '', amount: 0, date: new Date().toISOString().split('T')[0], type: 'expense',
};
const defDebt: Omit<Debt, 'id' | 'uid' | 'createdAt'> = {
  title: '', type: 'Personal Loan', totalAmount: 0, remainingBalance: 0,
  interestRate: 0, monthlyPayment: 0, dueDate: '',
};
const defBiz: Omit<Business, 'id' | 'uid' | 'createdAt'> = {
  name: '', type: 'Other', description: '', status: 'Active',
};

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts]               = useState<Debt[]>([]);
  const [businesses, setBusinesses]     = useState<Business[]>([]);
  const [showSim, setShowSim]           = useState(false);
  const [tab, setTab]                   = useState<Tab>('transactions');

  /* form state */
  const [showTxForm, setShowTxForm]     = useState(false);
  const [txForm, setTxForm]             = useState({ ...defTx, amount: '' as any });
  const [txLoading, setTxLoading]       = useState(false);
  const [editTxId, setEditTxId]         = useState<string | null>(null);

  const [showDebtForm, setShowDebtForm] = useState(false);
  const [debtForm, setDebtForm]         = useState({ ...defDebt, totalAmount: '' as any, remainingBalance: '' as any, interestRate: '' as any, monthlyPayment: '' as any });
  const [debtLoading, setDebtLoading]   = useState(false);
  const [editDebtId, setEditDebtId]     = useState<string | null>(null);

  const [showBizForm, setShowBizForm]   = useState(false);
  const [bizForm, setBizForm]           = useState({ ...defBiz });
  const [bizLoading, setBizLoading]     = useState(false);
  const [editBizId, setEditBizId]       = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(50)),
        s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), () => {}),
      onSnapshot(query(collection(db, 'debts'), limit(20)),
        s => setDebts(s.docs.map(d => ({ id: d.id, ...d.data() } as Debt))), () => {}),
      onSnapshot(query(collection(db, 'businesses'), limit(20)),
        s => setBusinesses(s.docs.map(d => ({ id: d.id, ...d.data() } as Business))), () => {}),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  /* ── Transactions CRUD ── */
  const saveTx = async () => {
    if (!txForm.title.trim() || !txForm.amount) return toast.error('กรอกข้อมูลให้ครบ');
    setTxLoading(true);
    try {
      const data = { ...txForm, amount: +txForm.amount, uid: UID };
      if (editTxId) {
        await updateDoc(doc(db, 'transactions', editTxId), data);
        toast.success('แก้ไขแล้ว');
      } else {
        await addDoc(collection(db, 'transactions'), { ...data, createdAt: serverTimestamp() });
        toast.success('เพิ่มรายการแล้ว');
      }
      setTxForm({ ...defTx, amount: '' as any });
      setShowTxForm(false); setEditTxId(null);
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setTxLoading(false); }
  };
  const editTx = (t: Transaction) => {
    setTxForm({ title: t.title, category: t.category, amount: t.amount as any, date: t.date, type: t.type });
    setEditTxId(t.id!); setShowTxForm(true); setTab('transactions');
  };
  const deleteTx = async (t: Transaction) => {
    try { await deleteDoc(doc(db, 'transactions', t.id!)); toast.success('ลบแล้ว'); }
    catch { toast.error('ลบไม่สำเร็จ'); }
  };

  /* ── Debts CRUD ── */
  const saveDebt = async () => {
    if (!debtForm.title.trim()) return toast.error('กรอกชื่อหนี้');
    setDebtLoading(true);
    try {
      const data = {
        ...debtForm,
        totalAmount: +debtForm.totalAmount, remainingBalance: +debtForm.remainingBalance,
        interestRate: +debtForm.interestRate, monthlyPayment: +debtForm.monthlyPayment,
        uid: UID,
      };
      if (editDebtId) {
        await updateDoc(doc(db, 'debts', editDebtId), data);
        toast.success('แก้ไขแล้ว');
      } else {
        await addDoc(collection(db, 'debts'), { ...data, createdAt: serverTimestamp() });
        toast.success('เพิ่มหนี้แล้ว');
      }
      setDebtForm({ ...defDebt, totalAmount: '' as any, remainingBalance: '' as any, interestRate: '' as any, monthlyPayment: '' as any });
      setShowDebtForm(false); setEditDebtId(null);
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setDebtLoading(false); }
  };
  const editDebt = (d: Debt) => {
    setDebtForm({ title: d.title, type: d.type, totalAmount: d.totalAmount as any, remainingBalance: d.remainingBalance as any, interestRate: d.interestRate as any, monthlyPayment: d.monthlyPayment as any, dueDate: d.dueDate });
    setEditDebtId(d.id!); setShowDebtForm(true); setTab('debts');
  };
  const deleteDebt = async (d: Debt) => {
    try { await deleteDoc(doc(db, 'debts', d.id!)); toast.success('ลบแล้ว'); }
    catch { toast.error('ลบไม่สำเร็จ'); }
  };

  /* ── Businesses CRUD ── */
  const saveBiz = async () => {
    if (!bizForm.name.trim()) return toast.error('กรอกชื่อธุรกิจ');
    setBizLoading(true);
    try {
      const data = { ...bizForm, uid: UID };
      if (editBizId) {
        await updateDoc(doc(db, 'businesses', editBizId), data);
        toast.success('แก้ไขแล้ว');
      } else {
        await addDoc(collection(db, 'businesses'), { ...data, createdAt: serverTimestamp() });
        toast.success('เพิ่มธุรกิจแล้ว');
      }
      setBizForm({ ...defBiz });
      setShowBizForm(false); setEditBizId(null);
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setBizLoading(false); }
  };
  const editBiz = (b: Business) => {
    setBizForm({ name: b.name, type: b.type, description: b.description ?? '', status: b.status });
    setEditBizId(b.id!); setShowBizForm(true); setTab('businesses');
  };
  const deleteBiz = async (b: Business) => {
    try { await deleteDoc(doc(db, 'businesses', b.id!)); toast.success('ลบแล้ว'); }
    catch { toast.error('ลบไม่สำเร็จ'); }
  };

  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalDebt     = debts.reduce((s, d) => s + d.remainingBalance, 0);
  const netCash       = totalIncome - totalExpenses;

  if (showSim) {
    const seed = buildFinanceSeed(transactions, debts, businesses);
    return <MiroFishSimulator title="Finance Forecast" seedText={seed} onBack={() => setShowSim(false)} />;
  }

  /* ── tab add button config ── */
  const addBtnConfig: Record<Tab, { label: string; action: () => void }> = {
    transactions: { label: '+ Transaction', action: () => { setEditTxId(null); setTxForm({ ...defTx, amount: '' as any }); setShowTxForm(v => !v); } },
    debts:        { label: '+ Debt',        action: () => { setEditDebtId(null); setDebtForm({ ...defDebt, totalAmount: '' as any, remainingBalance: '' as any, interestRate: '' as any, monthlyPayment: '' as any }); setShowDebtForm(v => !v); } },
    businesses:   { label: '+ Business',    action: () => { setEditBizId(null); setBizForm({ ...defBiz }); setShowBizForm(v => !v); } },
  };

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Finance</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Income, expenses & debts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addBtnConfig[tab].action}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:brightness-110"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          >
            <Plus size={15} /> {addBtnConfig[tab].label}
          </button>
          <button
            onClick={() => setShowSim(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 active:scale-95 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Fish size={15} /> MiroFish AI
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Income',   value: totalIncome,   color: '#22c55e', icon: <TrendingUp size={16} /> },
          { label: 'Expenses', value: totalExpenses, color: '#ef4444', icon: <TrendingDown size={16} /> },
          { label: 'Net Cash', value: netCash,       color: netCash >= 0 ? '#22c55e' : '#ef4444', icon: <Wallet size={16} /> },
          { label: 'Total Debt', value: totalDebt,   color: '#f59e0b', icon: <Wallet size={16} /> },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-3 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.label}</span>
            </div>
            <div className="text-base font-bold" style={{ color: c.color }}>
              {c.value < 0 ? '-' : ''}฿{Math.abs(c.value).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface)' }}>
        {(['transactions', 'debts', 'businesses'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-sm capitalize transition-all duration-150"
            style={{ background: tab === t ? 'var(--color-accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--color-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TRANSACTIONS ── */}
      {tab === 'transactions' && (
        <div className="space-y-3">
          {showTxForm && (
            <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{editTxId ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ชื่อรายการ</label>
                  <input value={txForm.title} onChange={e => setTxForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="ค่าอาหาร, เงินเดือน..." className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ประเภท</label>
                  <CustomSelect value={txForm.type} onChange={v => setTxForm(p => ({ ...p, type: v as any, category: '' }))}
                    options={[{ value: 'expense', label: '🔴 รายจ่าย' }, { value: 'income', label: '🟢 รายรับ' }]} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>หมวดหมู่</label>
                  <CustomSelect value={txForm.category} onChange={v => setTxForm(p => ({ ...p, category: v }))}
                    options={txForm.type === 'income' ? INCOME_CATS : EXPENSE_CATS} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>จำนวน (฿)</label>
                  <input type="number" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value as any }))}
                    placeholder="0" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>วันที่</label>
                  <input type="date" value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))}
                    className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveTx} disabled={txLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150 active:scale-95 hover:brightness-110 disabled:opacity-60"
                  style={{ background: 'var(--color-accent)' }}>
                  {txLoading && <Loader2 size={14} className="animate-spin" />} Save
                </button>
                <button onClick={() => { setShowTxForm(false); setEditTxId(null); }}
                  className="px-4 py-2 rounded-lg text-sm transition-all duration-150 active:scale-95" style={{ color: 'var(--color-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {transactions.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>ยังไม่มีรายการ — กด + Transaction</div>
            : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--color-surface)' }}>
                      {['วันที่', 'ชื่อ', 'หมวด', 'ประเภท', 'จำนวน', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-t group" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.date}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.title}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.category}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: t.type === 'income' ? '#22c55e22' : '#ef444422', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                            {t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                          {t.type === 'income' ? '+' : '-'}฿{t.amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => editTx(t)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                              style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteTx(t)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                              style={{ background: '#ef444422', color: '#ef4444' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── DEBTS ── */}
      {tab === 'debts' && (
        <div className="space-y-3">
          {showDebtForm && (
            <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{editDebtId ? 'แก้ไขหนี้' : 'เพิ่มหนี้'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ชื่อหนี้</label>
                  <input value={debtForm.title} onChange={e => setDebtForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="บ้าน, รถ, บัตรเครดิต..." className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ประเภท</label>
                  <CustomSelect value={debtForm.type} onChange={v => setDebtForm(p => ({ ...p, type: v as any }))}
                    options={['Mortgage', 'Car Loan', 'Credit Card', 'Personal Loan', 'Installment', 'Other']} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>วงเงินทั้งหมด (฿)</label>
                  <input type="number" value={debtForm.totalAmount} onChange={e => setDebtForm(p => ({ ...p, totalAmount: e.target.value as any }))}
                    placeholder="0" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ยอดคงเหลือ (฿)</label>
                  <input type="number" value={debtForm.remainingBalance} onChange={e => setDebtForm(p => ({ ...p, remainingBalance: e.target.value as any }))}
                    placeholder="0" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ดอกเบี้ย (%/ปี)</label>
                  <input type="number" value={debtForm.interestRate} onChange={e => setDebtForm(p => ({ ...p, interestRate: e.target.value as any }))}
                    placeholder="5.5" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ค่างวด/เดือน (฿)</label>
                  <input type="number" value={debtForm.monthlyPayment} onChange={e => setDebtForm(p => ({ ...p, monthlyPayment: e.target.value as any }))}
                    placeholder="0" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>วันครบกำหนด</label>
                  <input type="date" value={debtForm.dueDate} onChange={e => setDebtForm(p => ({ ...p, dueDate: e.target.value }))}
                    className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveDebt} disabled={debtLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150 active:scale-95 hover:brightness-110 disabled:opacity-60"
                  style={{ background: 'var(--color-accent)' }}>
                  {debtLoading && <Loader2 size={14} className="animate-spin" />} Save
                </button>
                <button onClick={() => { setShowDebtForm(false); setEditDebtId(null); }}
                  className="px-4 py-2 rounded-lg text-sm transition-all duration-150 active:scale-95" style={{ color: 'var(--color-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {debts.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>ยังไม่มีหนี้ — กด + Debt</div>
            : debts.map(d => (
              <div key={d.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{d.title}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>{d.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editDebt(d)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                      style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}><Pencil size={12} /></button>
                    <button onClick={() => deleteDebt(d)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                      style={{ background: '#ef444422', color: '#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </div>
                {/* Progress bar */}
                {d.totalAmount > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                      <span>คงเหลือ ฿{d.remainingBalance?.toLocaleString()}</span>
                      <span>{Math.round((1 - d.remainingBalance / d.totalAmount) * 100)}% ชำระแล้ว</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((1 - d.remainingBalance / d.totalAmount) * 100)}%`, background: '#22c55e' }} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span style={{ color: 'var(--color-muted)' }}>ดอกเบี้ย</span><br /><span style={{ color: 'var(--color-text)' }}>{d.interestRate}%/ปี</span></div>
                  <div><span style={{ color: 'var(--color-muted)' }}>ค่างวด</span><br /><span style={{ color: 'var(--color-text)' }}>฿{d.monthlyPayment?.toLocaleString()}</span></div>
                  <div><span style={{ color: 'var(--color-muted)' }}>ครบกำหนด</span><br /><span style={{ color: 'var(--color-text)' }}>{d.dueDate || '—'}</span></div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── BUSINESSES ── */}
      {tab === 'businesses' && (
        <div className="space-y-3">
          {showBizForm && (
            <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{editBizId ? 'แก้ไขธุรกิจ' : 'เพิ่มธุรกิจ/รายได้'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ชื่อ</label>
                  <input value={bizForm.name} onChange={e => setBizForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="ร้านค้า, ค่าเช่า..." className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>ประเภท</label>
                  <CustomSelect value={bizForm.type} onChange={v => setBizForm(p => ({ ...p, type: v as any }))}
                    options={['Rental', 'E-commerce', 'Service', 'Investment', 'Other']} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>สถานะ</label>
                  <CustomSelect value={bizForm.status} onChange={v => setBizForm(p => ({ ...p, status: v as any }))}
                    options={[{ value: 'Active', label: '🟢 Active' }, { value: 'Inactive', label: '⚫ Inactive' }]} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>รายละเอียด</label>
                  <input value={bizForm.description} onChange={e => setBizForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="รายละเอียดเพิ่มเติม..." className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveBiz} disabled={bizLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150 active:scale-95 hover:brightness-110 disabled:opacity-60"
                  style={{ background: 'var(--color-accent)' }}>
                  {bizLoading && <Loader2 size={14} className="animate-spin" />} Save
                </button>
                <button onClick={() => { setShowBizForm(false); setEditBizId(null); }}
                  className="px-4 py-2 rounded-lg text-sm transition-all duration-150 active:scale-95" style={{ color: 'var(--color-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {businesses.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>ยังไม่มีธุรกิจ — กด + Business</div>
            : businesses.map(b => (
              <div key={b.id} className="rounded-xl p-4 border flex justify-between items-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.type}{b.description ? ` · ${b.description}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: b.status === 'Active' ? '#22c55e22' : '#64748b22', color: b.status === 'Active' ? '#22c55e' : '#64748b' }}>
                    {b.status}
                  </span>
                  <button onClick={() => editBiz(b)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                    style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}><Pencil size={12} /></button>
                  <button onClick={() => deleteBiz(b)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                    style={{ background: '#ef444422', color: '#ef4444' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
