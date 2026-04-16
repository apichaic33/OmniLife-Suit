import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkMiroFishHealth, getSimulationHistory, buildTradeSeed, buildFinanceSeed, buildPortfolioSeed } from '../lib/mirofish';
import { fetchPrices } from '../lib/market';
import { Fish, Wifi, WifiOff, TrendingUp, Wallet, Clock, ChevronRight, LayoutDashboard } from 'lucide-react';
import MiroFishSimulator from '../components/MiroFishSimulator';

type SimMode = null | 'trade' | 'finance' | 'portfolio';

export default function MiroFishPage() {
  const [online, setOnline]     = useState<boolean | null>(null);
  const [history, setHistory]   = useState<any[]>([]);
  const [simMode, setSimMode]   = useState<SimMode>(null);
  const [seedText, setSeedText] = useState('');
  const [simTitle, setSimTitle] = useState('');

  useEffect(() => {
    checkMiroFishHealth().then(setOnline);
    getSimulationHistory(5).then(setHistory);
  }, []);

  const handleTradeSimulate = async () => {
    const snap = await getDocs(query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(30)));
    const trades = snap.docs.map(d => d.data());
    setSeedText(buildTradeSeed(trades));
    setSimTitle('Trade Sentiment Simulation');
    setSimMode('trade');
  };

  const handlePortfolioSimulate = async () => {
    const [tradeSnap, assetSnap] = await Promise.all([
      getDocs(query(collection(db, 'trades'), orderBy('createdAt', 'desc'), limit(50))),
      getDocs(query(collection(db, 'assets'), limit(20))),
    ]);
    const trades = tradeSnap.docs.map(d => d.data());
    const assets = assetSnap.docs.map(d => d.data());
    const pairs  = [...new Set(trades.map((t: any) => t.pair).filter(Boolean))];
    const prices = await fetchPrices(pairs);
    setSeedText(buildPortfolioSeed(trades, assets, prices));
    setSimTitle('Full Portfolio Simulation');
    setSimMode('portfolio');
  };

  const handleFinanceSimulate = async () => {
    const [txSnap, debtSnap, bizSnap] = await Promise.all([
      getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(30))),
      getDocs(query(collection(db, 'debts'), limit(10))),
      getDocs(query(collection(db, 'businesses'), limit(10))),
    ]);
    const seed = buildFinanceSeed(
      txSnap.docs.map(d => d.data()),
      debtSnap.docs.map(d => d.data()),
      bizSnap.docs.map(d => d.data()),
    );
    setSeedText(seed);
    setSimTitle('Finance Forecast Simulation');
    setSimMode('finance');
  };

  if (simMode) {
    return <MiroFishSimulator title={simTitle} seedText={seedText} onBack={() => setSimMode(null)} />;
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ background: '#6366f122' }}>
          <Fish size={24} style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>MiroFish AI Hub</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Swarm intelligence prediction engine</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {online === null ? <Clock size={14} style={{ color: '#f59e0b' }} />
            : online ? <Wifi size={14} style={{ color: '#22c55e' }} />
            : <WifiOff size={14} style={{ color: '#ef4444' }} />}
          <span style={{ color: online ? '#22c55e' : online === null ? '#f59e0b' : '#ef4444' }}>
            {online === null ? 'Checking...' : online ? 'Online · localhost:5001' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Offline warning */}
      {online === false && (
        <div className="rounded-xl p-4 border text-sm" style={{ background: '#ef444411', borderColor: '#ef444433', color: '#ef4444' }}>
          MiroFish is offline. Run: <code className="font-mono bg-black/20 px-1 rounded">npm run dev</code> in the MiroFish directory.
        </div>
      )}

      {/* Quick Simulate */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={handleTradeSimulate}
          disabled={!online}
          className="rounded-xl p-5 border text-left hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-surface)', borderColor: '#22c55e33' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: '#22c55e22' }}>
              <TrendingUp size={20} style={{ color: '#22c55e' }} />
            </div>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Trade Simulation</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
            Simulate market sentiment จาก trade history ของคุณ
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: '#22c55e' }}>
            Start simulation <ChevronRight size={12} />
          </div>
        </button>

        <button
          onClick={handleFinanceSimulate}
          disabled={!online}
          className="rounded-xl p-5 border text-left hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-surface)', borderColor: '#6366f133' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: '#6366f122' }}>
              <Wallet size={20} style={{ color: '#818cf8' }} />
            </div>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Finance Forecast</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
            พยากรณ์กระแสเงินสดจาก transactions, debts และ businesses
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: '#818cf8' }}>
            Start simulation <ChevronRight size={12} />
          </div>
        </button>

        <button
          onClick={handlePortfolioSimulate}
          disabled={!online}
          className="rounded-xl p-5 border text-left hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-surface)', borderColor: '#f59e0b33' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: '#f59e0b22' }}>
              <LayoutDashboard size={20} style={{ color: '#f59e0b' }} />
            </div>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Portfolio</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
            รวม Trade + Assets + ราคาตลาดจริง
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
            Start simulation <ChevronRight size={12} />
          </div>
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>How it works</span>
        <div className="flex items-start gap-4 text-xs" style={{ color: 'var(--color-muted)' }}>
          {['1. Export your data as seed document', '2. Build knowledge graph (Zep Cloud)', '3. Simulate 20 rounds × 15 agents', '4. Generate prediction report'].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#6366f133', color: '#a78bfa' }}>{i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation History */}
      {history.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <Clock size={14} style={{ color: 'var(--color-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Recent Simulations</span>
          </div>
          {history.map((h, i) => (
            <div key={i} className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="text-sm" style={{ color: 'var(--color-text)' }}>{h.project_id || 'Simulation'}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{h.created_at || h.createdAt}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: h.status === 'completed' ? '#22c55e22' : '#6366f122', color: h.status === 'completed' ? '#22c55e' : '#a78bfa' }}>
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-xs space-y-1 p-3 rounded-lg" style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>
        <div>⏱ Simulation time: ~25-30 min (Gemini free tier)</div>
        <div>📊 Tokens per simulation: ~245K (Trade) / ~1M (Finance)</div>
        <div>🆓 Free tier: ~4 simulations/day</div>
      </div>
    </div>
  );
}
