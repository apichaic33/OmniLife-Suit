import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon, 
  History, 
  ChevronRight,
  MoreVertical,
  Search,
  Filter,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface Transaction {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  uid: string;
  createdAt: any;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  value: number;
  uid: string;
  createdAt: any;
}

interface Debt {
  id: string;
  title: string;
  amount: number;
  interestRate: number;
  dueDate: string;
  uid: string;
  createdAt: any;
}

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'assets' | 'debts'>('cashflow');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ title: '', category: 'Food', amount: '', type: 'expense' as 'income' | 'expense' });
  const [newAsset, setNewAsset] = useState({ name: '', category: 'Cash', value: '' });
  const [newDebt, setNewDebt] = useState({ title: '', amount: '', interestRate: '', dueDate: '' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Transactions
    const qTx = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    // Assets
    const qAssets = query(
      collection(db, 'assets'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'assets'));

    // Debts
    const qDebts = query(
      collection(db, 'debts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'debts'));

    return () => {
      unsubTx();
      unsubAssets();
      unsubDebts();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      if (activeTab === 'cashflow') {
        if (!newTransaction.title.trim()) return;
        await addDoc(collection(db, 'transactions'), {
          ...newTransaction,
          amount: Number(newTransaction.amount),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
        setNewTransaction({ title: '', category: 'Food', amount: '', type: 'expense' });
      } else if (activeTab === 'assets') {
        if (!newAsset.name.trim()) return;
        await addDoc(collection(db, 'assets'), {
          ...newAsset,
          value: Number(newAsset.value),
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
        setNewAsset({ name: '', category: 'Cash', value: '' });
      } else if (activeTab === 'debts') {
        if (!newDebt.title.trim()) return;
        await addDoc(collection(db, 'debts'), {
          ...newDebt,
          amount: Number(newDebt.amount),
          interestRate: Number(newDebt.interestRate),
          uid: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
        setNewDebt({ title: '', amount: '', interestRate: '', dueDate: '' });
      }
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, activeTab);
    }
  };

  const deleteItem = async (id: string, collectionName: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.amount, 0);
  const netWorth = totalAssets - totalDebts;

  const cashflowData = [
    { name: 'Total', income: totalIncome, expense: totalExpense },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finance & Wealth</h1>
          <p className="text-gray-500 mt-1">Manage your cashflow, assets, and liabilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-full flex items-center">
            {(['cashflow', 'assets', 'debts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-widest",
                  activeTab === tab ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" />
            <span>Add {activeTab === 'cashflow' ? 'Transaction' : activeTab === 'assets' ? 'Asset' : 'Debt'}</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          {activeTab === 'cashflow' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Title" 
                value={newTransaction.title}
                onChange={(e) => setNewTransaction({...newTransaction, title: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
              <select 
                value={newTransaction.category}
                onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              >
                <option>Food</option>
                <option>Work</option>
                <option>Fitness</option>
                <option>Business</option>
                <option>Bills</option>
                <option>Shopping</option>
                <option>Other</option>
              </select>
              <input 
                type="number" 
                placeholder="Amount" 
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
              <select 
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as 'income' | 'expense'})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          )}
          {activeTab === 'assets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Asset Name" 
                value={newAsset.name}
                onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
              <select 
                value={newAsset.category}
                onChange={(e) => setNewAsset({...newAsset, category: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              >
                <option>Cash</option>
                <option>Real Estate</option>
                <option>Stocks</option>
                <option>Crypto</option>
                <option>Gold</option>
                <option>Vehicle</option>
                <option>Other</option>
              </select>
              <input 
                type="number" 
                placeholder="Value" 
                value={newAsset.value}
                onChange={(e) => setNewAsset({...newAsset, value: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
            </div>
          )}
          {activeTab === 'debts' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Debt Title" 
                value={newDebt.title}
                onChange={(e) => setNewDebt({...newDebt, title: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
              <input 
                type="number" 
                placeholder="Amount" 
                value={newDebt.amount}
                onChange={(e) => setNewDebt({...newDebt, amount: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
              <input 
                type="number" 
                placeholder="Interest Rate (%)" 
                value={newDebt.interestRate}
                onChange={(e) => setNewDebt({...newDebt, interestRate: e.target.value})}
                className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Save {activeTab === 'cashflow' ? 'Transaction' : activeTab === 'assets' ? 'Asset' : 'Debt'}
            </button>
          </div>
        </form>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Net Worth</p>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mt-4">${netWorth.toLocaleString()}</h2>
          <p className="text-[10px] font-bold text-gray-400 mt-2">Assets - Liabilities</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Assets</p>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mt-4">${totalAssets.toLocaleString()}</h2>
          <p className="text-[10px] font-bold text-emerald-500 mt-2">{assets.length} items tracked</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Debts</p>
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mt-4">${totalDebts.toLocaleString()}</h2>
          <p className="text-[10px] font-bold text-rose-500 mt-2">{debts.length} liabilities</p>
        </div>
      </div>

      {activeTab === 'cashflow' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cashflow Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">Cashflow Overview</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Expense</span>
                </div>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#9CA3AF'}}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#F9FAFB'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="income" fill="#000000" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">Recent Transactions</h3>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Filter className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        tx.type === 'income' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                      )}>
                        {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{tx.title}</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{tx.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs font-bold",
                        tx.type === 'income' ? "text-emerald-500" : "text-gray-900"
                      )}>
                        ${tx.amount.toLocaleString()}
                      </span>
                      <button 
                        onClick={() => deleteItem(tx.id, 'transactions')}
                        className="p-1.5 hover:bg-rose-50 text-gray-300 hover:text-rose-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-8">Asset Portfolio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="p-6 bg-gray-50 rounded-3xl border border-transparent hover:border-gray-200 transition-all group relative">
                <button 
                  onClick={() => deleteItem(asset.id, 'assets')}
                  className="absolute top-4 right-4 p-2 bg-white text-gray-300 hover:text-rose-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{asset.category}</p>
                <h4 className="text-lg font-bold text-gray-900">{asset.name}</h4>
                <p className="text-2xl font-bold mt-4">${asset.value.toLocaleString()}</p>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                <p className="text-gray-400">No assets tracked yet. Click "Add Asset" to begin.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-8">Liabilities & Debts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {debts.map((debt) => (
              <div key={debt.id} className="p-8 bg-rose-50/30 rounded-3xl border border-rose-100/50 relative group">
                <button 
                  onClick={() => deleteItem(debt.id, 'debts')}
                  className="absolute top-6 right-6 p-2 bg-white text-gray-300 hover:text-rose-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{debt.title}</h4>
                    <p className="text-xs font-semibold text-rose-500">{debt.interestRate}% Interest Rate</p>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Outstanding Amount</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">${debt.amount.toLocaleString()}</p>
                  </div>
                  <button className="px-4 py-2 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition-all">
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
            {debts.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                <p className="text-gray-400">No debts recorded. You're debt-free!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
