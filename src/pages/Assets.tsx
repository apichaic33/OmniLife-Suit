import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  History, 
  ChevronRight,
  MoreVertical,
  Search,
  Filter,
  BarChart3,
  Trash2,
  LineChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';
import TradingViewWidget from '../components/TradingViewWidget';
import { cn } from '../lib/utils';
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

interface Asset {
  id: string;
  name: string;
  category: string;
  value: number;
  change: string;
  type: 'up' | 'down';
  uid: string;
  createdAt: any;
}

interface Trade {
  id: string;
  pair: string;
  type: 'Buy' | 'Sell';
  price: number;
  amount: number;
  date: string;
  status: string;
  uid: string;
  createdAt: any;
}

export default function Assets() {
  const [activeTab, setActiveTab] = useState<'assets' | 'trades' | 'trading-hub'>('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', category: 'Stock', value: '' });
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch real-time prices for demo (BTC, ETH, SOL)
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
        const data = await res.json();
        setMarketPrices({
          'BTC': data.bitcoin.usd,
          'ETH': data.ethereum.usd,
          'SOL': data.solana.usd
        });
      } catch (e) {
        console.error('Failed to fetch prices', e);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const assetsQuery = query(
      collection(db, 'assets'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const tradesQuery = query(
      collection(db, 'trades'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
      const assetList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Asset[];
      setAssets(assetList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assets');
    });

    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const tradeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trade[];
      setTrades(tradeList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trades');
    });

    return () => {
      unsubscribeAssets();
      unsubscribeTrades();
    };
  }, []);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'assets'), {
        ...newAsset,
        value: Number(newAsset.value),
        change: '+0.0%',
        type: 'up',
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewAsset({ name: '', category: 'Stock', value: '' });
      setIsAddingAsset(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assets');
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'assets', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assets/${id}`);
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'trades', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trades/${id}`);
    }
  };

  const totalNetWorth = assets.reduce((sum, asset) => sum + asset.value, 0);
  const cryptoValue = assets.filter(a => a.category === 'Crypto').reduce((sum, a) => sum + a.value, 0);
  const stocksValue = assets.filter(a => a.category === 'Stock').reduce((sum, a) => sum + a.value, 0);
  const collectiblesValue = assets.filter(a => a.category === 'Collectible').reduce((sum, a) => sum + a.value, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Asset Tracking</h1>
          <p className="text-gray-500 mt-1">Monitor your portfolio and log your trading history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('trades')}
            className="flex items-center gap-2 bg-white text-black border border-gray-200 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all"
          >
            <History className="w-5 h-5" />
            <span>Trade Log</span>
          </button>
          <button 
            onClick={() => setIsAddingAsset(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Add Asset Form */}
      {isAddingAsset && (
        <form onSubmit={handleAddAsset} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
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
              <option>Stock</option>
              <option>Crypto</option>
              <option>Collectible</option>
              <option>Metal</option>
              <option>Other</option>
            </select>
            <input 
              type="number" 
              placeholder="Current Value" 
              value={newAsset.value}
              onChange={(e) => setNewAsset({...newAsset, value: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAddingAsset(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Save Asset
            </button>
          </div>
        </form>
      )}

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-black text-white p-8 rounded-3xl shadow-xl shadow-black/20 flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Net Worth</p>
            <h2 className="text-4xl font-bold mt-2">${totalNetWorth.toLocaleString()}</h2>
            <div className="flex items-center gap-2 mt-4 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">+12.5% ($3,678.20)</span>
              <span className="text-xs text-gray-500 font-medium ml-2">this month</span>
            </div>
          </div>
          <div className="flex items-center gap-6 relative z-10">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Crypto</p>
              <p className="text-lg font-bold">${cryptoValue.toLocaleString()}</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-800"></div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Stocks</p>
              <p className="text-lg font-bold">${stocksValue.toLocaleString()}</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-800"></div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Collectibles</p>
              <p className="text-lg font-bold">${collectiblesValue.toLocaleString()}</p>
            </div>
          </div>
          {/* Abstract background element */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Portfolio Mix</h3>
            <p className="text-xs text-gray-400">Diversification overview</p>
          </div>
          <div className="space-y-4 mt-6">
            {[
              { label: 'Collectibles', percent: totalNetWorth ? Math.round((collectiblesValue / totalNetWorth) * 100) : 0, color: 'bg-amber-400' },
              { label: 'Crypto', percent: totalNetWorth ? Math.round((cryptoValue / totalNetWorth) * 100) : 0, color: 'bg-blue-400' },
              { label: 'Stocks', percent: totalNetWorth ? Math.round((stocksValue / totalNetWorth) * 100) : 0, color: 'bg-emerald-400' },
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{item.label}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs & List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('assets')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2",
                activeTab === 'assets' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              My Assets
            </button>
            <button 
              onClick={() => setActiveTab('trades')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2",
                activeTab === 'trades' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              Trade Log
            </button>
            <button 
              onClick={() => setActiveTab('trading-hub')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2",
                activeTab === 'trading-hub' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              Trading Hub
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-xs w-48 focus:ring-0"
              />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Filter className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {activeTab === 'trading-hub' ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Market Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { symbol: 'BTC', name: 'Bitcoin', price: marketPrices['BTC'], change: '+2.4%' },
                  { symbol: 'ETH', name: 'Ethereum', price: marketPrices['ETH'], change: '-1.2%' },
                  { symbol: 'SOL', name: 'Solana', price: marketPrices['SOL'], change: '+5.8%' },
                ].map((coin) => (
                  <div key={coin.symbol} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">{coin.symbol[0]}</div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{coin.symbol}</p>
                          <h4 className="font-bold text-gray-900">{coin.name}</h4>
                        </div>
                      </div>
                      <p className="text-xl font-bold mt-3">${coin.price?.toLocaleString() || '---'}</p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
                      coin.change.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {coin.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {coin.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* TradingView Chart */}
              <div className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <LineChart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Advanced Market Analysis</h3>
                      <p className="text-xs text-gray-400">Real-time TradingView integration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full">
                      <Activity className="w-3 h-3" />
                      Live Market
                    </span>
                  </div>
                </div>
                <TradingViewWidget />
              </div>

              {/* AI Trading Insights */}
              <div className="bg-black text-white p-8 rounded-[40px] shadow-xl shadow-black/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xl">Intelligent Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Based on your current portfolio and market trends, the system suggests a 
                      <span className="text-emerald-400 font-bold mx-1">Moderate Accumulation</span> 
                      strategy for Ethereum as it tests major support levels.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Risk Level</p>
                        <p className="font-bold text-amber-400">Medium</p>
                      </div>
                      <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sentiment</p>
                        <p className="font-bold text-emerald-400">Bullish</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all border border-white/5">
                        Set Price Alert for BTC @ $70,000
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all border border-white/5">
                        Calculate Rebalancing Strategy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'assets' ? (
            loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-400">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">No assets tracked yet.</p>
              </div>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{asset.name}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{asset.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${asset.value.toLocaleString()}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-[10px] font-bold mt-0.5",
                        asset.type === 'up' ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {asset.type === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {asset.change}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => deleteAsset(asset.id)}
                        className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <th className="px-6 pb-2">Pair</th>
                    <th className="px-6 pb-2">Type</th>
                    <th className="px-6 pb-2">Price</th>
                    <th className="px-6 pb-2">Amount</th>
                    <th className="px-6 pb-2">Date</th>
                    <th className="px-6 pb-2">Status</th>
                    <th className="px-6 pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-gray-400 bg-white rounded-2xl">No trades recorded yet.</td>
                    </tr>
                  ) : (
                    trades.map((trade) => (
                      <tr key={trade.id} className="bg-white group hover:shadow-md transition-all">
                        <td className="px-6 py-4 rounded-l-2xl border-y border-l border-gray-100 font-bold text-sm">{trade.pair}</td>
                        <td className="px-6 py-4 border-y border-gray-100">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                            trade.type === 'Buy' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-y border-gray-100 font-medium text-sm">${trade.price.toLocaleString()}</td>
                        <td className="px-6 py-4 border-y border-gray-100 font-medium text-sm">{trade.amount}</td>
                        <td className="px-6 py-4 border-y border-gray-100 text-xs text-gray-400">{trade.date}</td>
                        <td className="px-6 py-4 border-y border-gray-100">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            {trade.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 rounded-r-2xl border-y border-r border-gray-100 text-right">
                          <button 
                            onClick={() => deleteTrade(trade.id)}
                            className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
