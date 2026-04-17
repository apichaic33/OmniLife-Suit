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
  Plus, Pencil, Trash2, Loader2, Link,
} from 'lucide-react';
import MiroFishSimulator from '../components/MiroFishSimulator';
import CustomSelect from '../components/CustomSelect';
import { toast } from 'sonner';

const UID = 'demo-user';

/* ── Debt amortization helpers ── */
// reducing balance (ลดต้นลดดอก): interest shrinks as balance falls
// flat rate       (คิดดอกเบี้ยแบบคงต้น): interest fixed on original principal — used by most Thai digital lenders
const monthlyInterest = (
  remaining: number,
  annualRate: number,
  interestType: 'reducing' | 'flat' = 'reducing',
  totalAmount?: number,
) =>
  interestType === 'flat'
    ? (totalAmount ?? remaining) * (annualRate / 100) * 30 / 365
    : remaining * (annualRate / 100 / 12);

const calcPayoffMonths = (
  remaining: number,
  payment: number,
  annualRate: number,
  interestType: 'reducing' | 'flat' = 'reducing',
  totalAmount?: number,
): number => {
  if (payment <= 0 || remaining <= 0) return 0;
  if (interestType === 'flat') {
    const fixedInterest = (totalAmount ?? remaining) * (annualRate / 100) * 30 / 365;
    const principalPerMonth = payment - fixedInterest;
    if (principalPerMonth <= 0) return Infinity;
    return Math.ceil(remaining / principalPerMonth);
  }
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.ceil(remaining / payment);
  if (payment <= remaining * r) return Infinity; // payment doesn't cover interest
  return Math.ceil(-Math.log(1 - (r * remaining) / payment) / Math.log(1 + r));
};

const payoffLabel = (months: number): string => {
  if (months === Infinity) return 'ค่างวดน้อยกว่าดอกเบี้ย ⚠️';
  if (months <= 0) return 'ชำระครบแล้ว ✓';
  const yrs = Math.floor(months / 12);
  const mth = months % 12;
  const now = new Date();
  now.setMonth(now.getMonth() + months);
  const finish = `${now.getFullYear() + 543}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (yrs > 0) return `อีก ${yrs} ปี ${mth} เดือน (ครบ ${finish})`;
  return `อีก ${mth} เดือน (ครบ ${finish})`;
};

const EXPENSE_CATS = ['อาหาร', 'ที่พัก', 'เดินทาง', 'สุขภาพ', 'การศึกษา', 'บันเทิง', 'ช็อปปิ้ง', 'ค่างวด', 'อื่นๆ'];
const INCOME_CATS  = ['เงินเดือน', 'ธุรกิจ', 'ลงทุน', 'ค่าเช่า', 'ฟรีแลนซ์', 'อื่นๆ'];

type Tab = 'transactions' | 'debts' | 'businesses';

const inputCls   = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-150';
const inputStyle = { background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' };
const onFocus    = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.border = '1px solid var(--color-accent)');
const onBlur     = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.border = '1px solid var(--color-border)');

const defTx = {
  title: '', category: '', amount: '' as any,
  date: new Date().toISOString().split('T')[0],
  type: 'expense' as 'income' | 'expense',
  debtId: '', businessId: '',
  principalOnly: false,
};
const defDebt = {
  title: '', type: 'Personal Loan' as Debt['type'],
  interestType: 'reducing' as 'reducing' | 'flat',
  totalAmount: '' as any, remainingBalance: '' as any,
  interestRate: '' as any, monthlyPayment: '' as any, dueDate: '',
};
const defBiz = { name: '', type: 'Other' as Business['type'], description: '', status: 'Active' as Business['status'], monthlyTarget: '' as any };

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts]               = useState<Debt[]>([]);
  const [businesses, setBusinesses]     = useState<Business[]>([]);
  const [showSim, setShowSim]           = useState(false);
  const [tab, setTab]                   = useState<Tab>('transactions');

  const [showTxForm, setShowTxForm]     = useState(false);
  const [txForm, setTxForm]             = useState({ ...defTx });
  const [txLoading, setTxLoading]       = useState(false);
  const [editTxId, setEditTxId]         = useState<string | null>(null);

  const [showDebtForm, setShowDebtForm] = useState(false);
  const [debtForm, setDebtForm]         = useState({ ...defDebt });
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

  /* ── derived ── */
  const bizRevenue   = (bizId: string) => transactions.filter(t => t.businessId === bizId && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const bizExpense   = (bizId: string) => transactions.filter(t => t.businessId === bizId && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const debtPaid     = (debtId: string) => transactions.filter(t => t.debtId === debtId).reduce((s, t) => s + t.amount, 0);
  const debtName     = (id?: string) => debts.find(d => d.id === id)?.title ?? '';
  const bizName      = (id?: string) => businesses.find(b => b.id === id)?.name ?? '';

  /* ── Transactions CRUD ── */
  const saveTx = async () => {
    if (!txForm.title.trim() || !txForm.amount) return toast.error('กรอกข้อมูลให้ครบ');
    setTxLoading(true);
    try {
      const amount = +txForm.amount;
      const data: any = {
        title: txForm.title, category: txForm.category,
        amount, date: txForm.date, type: txForm.type, uid: UID,
        ...(txForm.debtId       ? { debtId: txForm.debtId }                   : {}),
        ...(txForm.debtId && txForm.principalOnly ? { principalOnly: true }   : {}),
        ...(txForm.businessId   ? { businessId: txForm.businessId }           : {}),
      };

      if (editTxId) {
        await updateDoc(doc(db, 'transactions', editTxId), data);
        toast.success('แก้ไขแล้ว');
      } else {
        await addDoc(collection(db, 'transactions'), { ...data, createdAt: serverTimestamp() });

        // ── Auto-reduce debt remaining balance ──
        if (txForm.debtId && txForm.type === 'expense') {
          const debt = debts.find(d => d.id === txForm.debtId);
          if (debt) {
            if (txForm.principalOnly) {
              // โปะเงินต้นล้วนๆ — ตัดเงินต้นทั้งหมด ไม่หักดอกเบี้ย
              const newBalance = Math.max(0, debt.remainingBalance - amount);
              await updateDoc(doc(db, 'debts', txForm.debtId), { remainingBalance: newBalance });
              toast.success(`โปะเงินต้น ฿${amount.toLocaleString()} · คงเหลือ ฿${newBalance.toLocaleString()}`);
            } else {
              // ค่างวดปกติ — หักดอกเบี้ยก่อน ส่วนที่เหลือตัดเงินต้น
              const interest   = monthlyInterest(debt.remainingBalance, debt.interestRate, debt.interestType ?? 'reducing', debt.totalAmount);
              const principal  = Math.max(0, amount - interest);
              const newBalance = Math.max(0, debt.remainingBalance - principal);
              await updateDoc(doc(db, 'debts', txForm.debtId), { remainingBalance: newBalance });
              toast.success(
                `ชำระแล้ว · ดอกเบี้ย ฿${interest.toFixed(0)} · เงินต้น ฿${principal.toFixed(0)} · คงเหลือ ฿${newBalance.toLocaleString()}`
              );
            }
          } else { toast.success('เพิ่มรายการแล้ว'); }
        } else {
          toast.success('เพิ่มรายการแล้ว');
        }
      }
      setTxForm({ ...defTx }); setShowTxForm(false); setEditTxId(null);
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setTxLoading(false); }
  };

  const editTx = (t: Transaction) => {
    setTxForm({ title: t.title, category: t.category, amount: t.amount as any, date: t.date, type: t.type, debtId: t.debtId ?? '', businessId: t.businessId ?? '', principalOnly: t.principalOnly ?? false });
    setEditTxId(t.id!); setShowTxForm(true); setTab('transactions');
  };
  const deleteTx = async (t: Transaction) => {
    try {
      await deleteDoc(doc(db, 'transactions', t.id!));
      // ── Restore debt balance if this was a debt payment ──
      if (t.debtId && t.type === 'expense') {
        const debt = debts.find(d => d.id === t.debtId);
        if (debt) {
          let restoredPrincipal: number;
          if (t.principalOnly) {
            restoredPrincipal = t.amount; // โปะเงินต้น — คืนเต็มจำนวน
          } else {
            const interest    = monthlyInterest(debt.remainingBalance, debt.interestRate, debt.interestType ?? 'reducing', debt.totalAmount);
            restoredPrincipal = Math.max(0, t.amount - interest);
          }
          await updateDoc(doc(db, 'debts', t.debtId), { remainingBalance: debt.remainingBalance + restoredPrincipal });
        }
      }
      toast.success('ลบแล้ว');
    } catch { toast.error('ลบไม่สำเร็จ'); }
  };

  /* ── Debts CRUD ── */
  const saveDebt = async () => {
    if (!debtForm.title.trim()) return toast.error('กรอกชื่อหนี้');
    setDebtLoading(true);
    try {
      const data = { ...debtForm, totalAmount: +debtForm.totalAmount, remainingBalance: +debtForm.remainingBalance, interestRate: +debtForm.interestRate, monthlyPayment: +debtForm.monthlyPayment, interestType: debtForm.interestType, uid: UID };
      if (editDebtId) { await updateDoc(doc(db, 'debts', editDebtId), data); toast.success('แก้ไขแล้ว'); }
      else { await addDoc(collection(db, 'debts'), { ...data, createdAt: serverTimestamp() }); toast.success('เพิ่มหนี้แล้ว'); }
      setDebtForm({ ...defDebt }); setShowDebtForm(false); setEditDebtId(null);
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setDebtLoading(false); }
  };
  const editDebt = (d: Debt) => {
    setDebtForm({ title: d.title, type: d.type, interestType: d.interestType ?? 'reducing', totalAmount: d.totalAmount as any, remainingBalance: d.remainingBalance as any, interestRate: d.interestRate as any, monthlyPayment: d.monthlyPayment as any, dueDate: d.dueDate });
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
      const data = { ...bizForm, monthlyTarget: bizForm.monthlyTarget ? +bizForm.monthlyTarget : undefined, uid: UID };
      if (editBizId) { await updateDoc(doc(db, 'businesses', editBizId), data); toast.success('แก้ไขแล้ว'); }
      else { await addDoc(collection(db, 'businesses'), { ...data, createdAt: serverTimestamp() }); toast.success('เพิ่มธุรกิจแล้ว'); }
      setBizForm({ ...defBiz }); setShowBizForm(false); setEditBizId(null);
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setBizLoading(false); }
  };
  const editBiz = (b: Business) => {
    setBizForm({ name: b.name, type: b.type, description: b.description ?? '', status: b.status, monthlyTarget: b.monthlyTarget ?? '' as any });
    setEditBizId(b.id!); setShowBizForm(true); setTab('businesses');
  };
  const deleteBiz = async (b: Business) => {
    try { await deleteDoc(doc(db, 'businesses', b.id!)); toast.success('ลบแล้ว'); }
    catch { toast.error('ลบไม่สำเร็จ'); }
  };

  /* ── summary ── */
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalDebt     = debts.reduce((s, d) => s + d.remainingBalance, 0);
  const netCash       = totalIncome - totalExpenses;

  if (showSim) {
    const seed = buildFinanceSeed(transactions, debts, businesses);
    return <MiroFishSimulator title="Finance Forecast" seedText={seed} onBack={() => setShowSim(false)} />;
  }

  const addBtnConfig: Record<Tab, { label: string; action: () => void }> = {
    transactions: { label: '+ Transaction', action: () => { setEditTxId(null); setTxForm({ ...defTx }); setShowTxForm(v => !v); } },
    debts:        { label: '+ Debt',        action: () => { setEditDebtId(null); setDebtForm({ ...defDebt }); setShowDebtForm(v => !v); } },
    businesses:   { label: '+ Business',    action: () => { setEditBizId(null); setBizForm({ ...defBiz }); setShowBizForm(v => !v); } },
  };

  /* ── options for link dropdowns ── */
  const debtOptions    = [{ value: '', label: '— ไม่ระบุ —' }, ...debts.map(d => ({ value: d.id!, label: d.title }))];
  const bizOptions     = [{ value: '', label: '— ไม่ระบุ —' }, ...businesses.map(b => ({ value: b.id!, label: b.name }))];

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Finance</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Income, expenses & debts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addBtnConfig[tab].action}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:brightness-110"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            <Plus size={15} /> {addBtnConfig[tab].label}
          </button>
          <button onClick={() => setShowSim(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 active:scale-95 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Fish size={15} /> MiroFish AI
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Income',     value: totalIncome,   color: '#22c55e', icon: <TrendingUp size={16} /> },
          { label: 'Expenses',   value: totalExpenses, color: '#ef4444', icon: <TrendingDown size={16} /> },
          { label: 'Net Cash',   value: netCash,       color: netCash >= 0 ? '#22c55e' : '#ef4444', icon: <Wallet size={16} /> },
          { label: 'Total Debt', value: totalDebt,     color: '#f59e0b', icon: <Wallet size={16} /> },
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
                  <CustomSelect value={txForm.type}
                    onChange={v => setTxForm(p => ({ ...p, type: v as any, category: '', debtId: '', businessId: '' }))}
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

                {/* ── Link to Debt (expense only) ── */}
                {txForm.type === 'expense' && debts.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <div>
                      <label className="block text-xs mb-1 flex items-center gap-1" style={{ color: '#f59e0b' }}>
                        <Link size={11} /> เชื่อมกับหนี้ (ลด remaining balance อัตโนมัติ)
                      </label>
                      <CustomSelect value={txForm.debtId} onChange={v => setTxForm(p => ({ ...p, debtId: v, principalOnly: false }))}
                        options={debtOptions} />
                    </div>
                    {txForm.debtId && (
                      <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg"
                        style={{ background: txForm.principalOnly ? '#22c55e22' : 'var(--color-bg)', border: `1px solid ${txForm.principalOnly ? '#22c55e' : 'var(--color-border)'}` }}>
                        <input
                          type="checkbox"
                          checked={txForm.principalOnly}
                          onChange={e => setTxForm(p => ({ ...p, principalOnly: e.target.checked }))}
                          className="w-4 h-4 accent-green-500"
                        />
                        <div>
                          <div className="text-xs font-medium" style={{ color: txForm.principalOnly ? '#22c55e' : 'var(--color-text)' }}>
                            โปะเงินต้น (ไม่หักดอกเบี้ย)
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            ตัดเงินต้นทั้งจำนวน — ใช้เมื่อจ่ายดอกเบี้ยงวดนั้นไปแล้ว
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                )}

                {/* ── Link to Business (income + expense) ── */}
                {businesses.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs mb-1 flex items-center gap-1"
                      style={{ color: txForm.type === 'income' ? '#22c55e' : '#f59e0b' }}>
                      <Link size={11} />
                      {txForm.type === 'income' ? 'เชื่อมกับธุรกิจ (นับรายได้)' : 'เชื่อมกับธุรกิจ (นับต้นทุน/ค่าใช้จ่าย)'}
                    </label>
                    <CustomSelect value={txForm.businessId} onChange={v => setTxForm(p => ({ ...p, businessId: v }))}
                      options={bizOptions} />
                  </div>
                )}
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
                      {['วันที่', 'ชื่อ', 'หมวด / เชื่อมกับ', 'ประเภท', 'จำนวน', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.date}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.title}</td>
                        <td className="px-4 py-3 text-xs">
                          <div style={{ color: 'var(--color-muted)' }}>{t.category}</div>
                          {t.debtId && (
                            <div className="flex items-center gap-1 mt-0.5" style={{ color: '#f59e0b' }}>
                              <Link size={10} />{debtName(t.debtId)}
                              {t.principalOnly && (
                                <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: '#22c55e22', color: '#22c55e', fontSize: '10px' }}>โปะเงินต้น</span>
                              )}
                            </div>
                          )}
                          {t.businessId && (
                            <div className="flex items-center gap-1 mt-0.5" style={{ color: '#22c55e' }}>
                              <Link size={10} />{bizName(t.businessId)}
                            </div>
                          )}
                        </td>
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
                              style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}><Pencil size={12} /></button>
                            <button onClick={() => deleteTx(t)} className="p-1.5 rounded-lg transition-all active:scale-90 hover:brightness-110"
                              style={{ background: '#ef444422', color: '#ef4444' }}><Trash2 size={12} /></button>
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
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>วิธีคิดดอกเบี้ย</label>
                  <CustomSelect value={debtForm.interestType} onChange={v => setDebtForm(p => ({ ...p, interestType: v as any }))}
                    options={[
                      { value: 'reducing', label: 'ลดต้นลดดอก (Reducing Balance)' },
                      { value: 'flat',     label: 'คงต้น (Flat Rate) — P×r×30/365' },
                    ]} />
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
            : debts.map(d => {
              const paid       = debtPaid(d.id!);
              const paidPct    = d.totalAmount > 0 ? Math.min(100, Math.round((1 - d.remainingBalance / d.totalAmount) * 100)) : 0;
              const linkedTxs  = transactions.filter(t => t.debtId === d.id);
              const iType      = d.interestType ?? 'reducing';
              const interest   = monthlyInterest(d.remainingBalance, d.interestRate, iType, d.totalAmount);
              const principal  = Math.max(0, d.monthlyPayment - interest);
              const months     = calcPayoffMonths(d.remainingBalance, d.monthlyPayment, d.interestRate, iType, d.totalAmount);
              return (
                <div key={d.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-medium" style={{ color: 'var(--color-text)' }}>{d.title}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>{d.type}</span>
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: iType === 'flat' ? '#f59e0b22' : '#6366f122', color: iType === 'flat' ? '#f59e0b' : '#818cf8' }}>
                        {iType === 'flat' ? 'คงต้น' : 'ลดต้นลดดอก'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {/* Quick pay button */}
                      <button
                        onClick={() => {
                          setTxForm({ title: `ค่างวด ${d.title}`, category: 'ค่างวด', amount: d.monthlyPayment as any, date: new Date().toISOString().split('T')[0], type: 'expense', debtId: d.id!, businessId: '', principalOnly: false });
                          setEditTxId(null); setShowTxForm(true); setTab('transactions');
                        }}
                        className="px-2 py-1 rounded-lg text-xs transition-all active:scale-90 hover:brightness-110"
                        style={{ background: '#22c55e22', color: '#22c55e' }}
                        title="บันทึกชำระค่างวด"
                      >
                        ชำระ
                      </button>
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
                        <span>{paidPct}% ชำระแล้ว</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, background: '#22c55e' }} />
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="rounded-lg p-2" style={{ background: '#ef444411' }}>
                      <div style={{ color: 'var(--color-muted)' }}>ดอกเบี้ย/เดือน</div>
                      <div className="font-semibold mt-0.5" style={{ color: '#ef4444' }}>฿{interest.toFixed(0)}</div>
                      {iType === 'flat' && (
                        <div style={{ color: 'var(--color-muted)', fontSize: '10px', marginTop: 2 }}>P×{d.interestRate}%×30/365</div>
                      )}
                    </div>
                    <div className="rounded-lg p-2" style={{ background: '#22c55e11' }}>
                      <div style={{ color: 'var(--color-muted)' }}>ตัดเงินต้น/เดือน</div>
                      <div className="font-semibold mt-0.5" style={{ color: '#22c55e' }}>฿{principal.toFixed(0)}</div>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: '#6366f111' }}>
                      <div style={{ color: 'var(--color-muted)' }}>ค่างวด/เดือน</div>
                      <div className="font-semibold mt-0.5" style={{ color: '#818cf8' }}>฿{d.monthlyPayment?.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Payoff timeline */}
                  {d.remainingBalance > 0 && d.monthlyPayment > 0 && (
                    <div className="text-xs px-3 py-2 rounded-lg mb-2 flex items-center gap-2"
                      style={{ background: months === Infinity ? '#ef444411' : '#6366f111', color: months === Infinity ? '#ef4444' : '#818cf8' }}>
                      🏁 {payoffLabel(months)}
                    </div>
                  )}

                  {/* Linked transactions */}
                  {linkedTxs.length > 0 && (
                    <div className="pt-2 border-t text-xs flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                      <Link size={11} style={{ color: '#f59e0b' }} />
                      <span style={{ color: '#f59e0b' }}>ชำระ {linkedTxs.length} ครั้ง · ฿{paid.toLocaleString()} รวม</span>
                    </div>
                  )}
                </div>
              );
            })}
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
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>เป้าหมายรายได้/เดือน (฿)</label>
                  <input type="number" value={bizForm.monthlyTarget} onChange={e => setBizForm(p => ({ ...p, monthlyTarget: e.target.value as any }))}
                    placeholder="50000" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
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
            : businesses.map(b => {
              const revenue  = bizRevenue(b.id!);
              const expense  = bizExpense(b.id!);
              const profit   = revenue - expense;
              const target   = b.monthlyTarget ?? 0;
              const targetPct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 0;
              const incomeTxs  = transactions.filter(t => t.businessId === b.id && t.type === 'income');
              const expenseTxs = transactions.filter(t => t.businessId === b.id && t.type === 'expense');
              return (
                <div key={b.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
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

                  {/* Revenue / Expense / Profit */}
                  <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                    <div className="rounded-lg p-2 text-center" style={{ background: '#22c55e11' }}>
                      <div style={{ color: 'var(--color-muted)' }}>รายได้ ({incomeTxs.length})</div>
                      <div className="font-bold mt-0.5" style={{ color: '#22c55e' }}>฿{revenue.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: '#ef444411' }}>
                      <div style={{ color: 'var(--color-muted)' }}>ต้นทุน ({expenseTxs.length})</div>
                      <div className="font-bold mt-0.5" style={{ color: '#ef4444' }}>฿{expense.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: profit >= 0 ? '#6366f111' : '#ef444411' }}>
                      <div style={{ color: 'var(--color-muted)' }}>กำไร</div>
                      <div className="font-bold mt-0.5" style={{ color: profit >= 0 ? '#818cf8' : '#ef4444' }}>
                        {profit >= 0 ? '+' : ''}฿{profit.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Monthly target progress */}
                  {target > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
                        <span className="flex items-center gap-1"><Link size={10} />เป้าหมาย/เดือน ฿{target.toLocaleString()}</span>
                        <span style={{ color: targetPct >= 100 ? '#22c55e' : 'var(--color-muted)' }}>{targetPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${targetPct}%`, background: targetPct >= 100 ? '#22c55e' : targetPct >= 60 ? '#f59e0b' : '#6366f1' }} />
                      </div>
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
