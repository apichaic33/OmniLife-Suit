import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildFinanceSeed } from '../lib/mirofish';
import type { Transaction, Debt, Business } from '../types';
import { Fish, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import MiroFishSimulator from '../components/MiroFishSimulator';


export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts]               = useState<Debt[]>([]);
  const [businesses, setBusinesses]     = useState<Business[]>([]);
  const [showSim, setShowSim]           = useState(false);
  const [tab, setTab]                   = useState<'transactions' | 'debts' | 'businesses'>('transactions');

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

  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalDebt     = debts.reduce((s, d) => s + d.remainingBalance, 0);

  if (showSim) {
    const seed = buildFinanceSeed(transactions, debts, businesses);
    return <MiroFishSimulator title="Finance Forecast" seedText={seed} onBack={() => setShowSim(false)} />;
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Finance</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Income, expenses & debts</p>
        </div>
        <button
          onClick={() => setShowSim(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          <Fish size={15} /> Simulate with MiroFish
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Income', value: totalIncome, color: '#22c55e', icon: <TrendingUp size={18} /> },
          { label: 'Expenses', value: totalExpenses, color: '#ef4444', icon: <TrendingDown size={18} /> },
          { label: 'Total Debt', value: totalDebt, color: '#f59e0b', icon: <Wallet size={18} /> },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.label}</span>
            </div>
            <div className="text-lg font-bold" style={{ color: c.color }}>
              ฿{c.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface)' }}>
        {(['transactions', 'debts', 'businesses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-sm capitalize transition"
            style={{ background: tab === t ? 'var(--color-accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--color-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface)' }}>
                {['Date', 'Title', 'Category', 'Type', 'Amount'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No transactions yet</td></tr>
                : transactions.map(t => (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.date}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.title}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>{t.category}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: t.type === 'income' ? '#22c55e22' : '#ef444422', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                      {t.type === 'income' ? '+' : '-'}฿{t.amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Debts */}
      {tab === 'debts' && (
        <div className="space-y-3">
          {debts.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>No debts recorded</div>
            : debts.map(d => (
              <div key={d.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>{d.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>{d.type}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span style={{ color: 'var(--color-muted)' }}>Remaining</span><br /><span className="font-semibold" style={{ color: '#f59e0b' }}>฿{d.remainingBalance?.toLocaleString()}</span></div>
                  <div><span style={{ color: 'var(--color-muted)' }}>Interest</span><br /><span style={{ color: 'var(--color-text)' }}>{d.interestRate}%</span></div>
                  <div><span style={{ color: 'var(--color-muted)' }}>Monthly</span><br /><span style={{ color: 'var(--color-text)' }}>฿{d.monthlyPayment?.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Businesses */}
      {tab === 'businesses' && (
        <div className="space-y-3">
          {businesses.length === 0
            ? <div className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>No businesses recorded</div>
            : businesses.map(b => (
              <div key={b.id} className="rounded-xl p-4 border flex justify-between items-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.type} · {b.description}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: b.status === 'Active' ? '#22c55e22' : '#64748b22', color: b.status === 'Active' ? '#22c55e' : '#64748b' }}>
                  {b.status}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
