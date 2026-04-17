import { useEffect, useState } from 'react';
import { type Page } from '../App';
import { TrendingUp, Wallet, CheckSquare, Sprout, Fish, Activity, Sparkles, Loader2 } from 'lucide-react';
import { checkMiroFishHealth } from '../lib/mirofish';
import { fetchPrices } from '../lib/market';
import { getDailyBrief, getGeminiKey } from '../lib/gemini';

interface Props { onNavigate: (page: Page) => void; }

export default function Dashboard({ onNavigate }: Props) {
  const [miroFishOnline, setMiroFishOnline] = useState<boolean | null>(null);
  const [briefText, setBriefText]     = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    checkMiroFishHealth().then(setMiroFishOnline);
  }, []);

  const handleDailyBrief = async () => {
    if (!getGeminiKey()) {
      setBriefText('⚠️ ยังไม่ได้ตั้ง Gemini API Key — ไปที่ Scanner > ⚙️ API Keys เพื่อตั้งค่า');
      return;
    }
    setBriefLoading(true);
    try {
      const priceData = await fetchPrices(['BTC/USDT', 'ETH/USDT', 'XAU/USD']).catch(() => ({}));
      const lines = Object.entries(priceData)
        .map(([sym, p]) => `${sym}: $${p.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })} (${p.usd_24h_change >= 0 ? '+' : ''}${p.usd_24h_change.toFixed(2)}% 24h)`)
        .join('\n');
      const text = await getDailyBrief(lines || undefined);
      setBriefText(text);
    } catch {
      setBriefText('ไม่สามารถติดต่อ Gemini ได้ — ตรวจสอบ API Key');
    } finally {
      setBriefLoading(false);
    }
  };

  const cards = [
    { id: 'trade' as Page,       label: 'Trade',       icon: <TrendingUp size={22} />,  color: '#22c55e', desc: 'Simulate market sentiment' },
    { id: 'finance' as Page,     label: 'Finance',     icon: <Wallet size={22} />,      color: '#6366f1', desc: 'Cash flow & debt tracking' },
    { id: 'tasks' as Page,       label: 'Tasks',       icon: <CheckSquare size={22} />, color: '#f59e0b', desc: 'Tasks & routines' },
    { id: 'agriculture' as Page, label: 'Agriculture', icon: <Sprout size={22} />,      color: '#10b981', desc: 'Plants & harvest tracking' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <p style={{ color: 'var(--color-muted)' }}>Welcome to OmniLife Suit</p>
      </div>

      {/* MiroFish Status */}
      <div
        className="rounded-xl p-4 border flex items-center gap-4 cursor-pointer hover:opacity-90 transition"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b, #1a1d27)',
          borderColor: miroFishOnline ? '#6366f155' : '#ef444433',
        }}
        onClick={() => onNavigate('mirofish')}
      >
        <div className="p-2 rounded-lg" style={{ background: '#6366f122' }}>
          <Fish size={24} style={{ color: '#a78bfa' }} />
        </div>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: 'var(--color-text)' }}>MiroFish AI Prediction</div>
          <div className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Swarm intelligence simulation engine
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: miroFishOnline === null ? '#f59e0b' : miroFishOnline ? '#22c55e' : '#ef4444' }}
          />
          <span style={{ color: 'var(--color-muted)' }}>
            {miroFishOnline === null ? 'Checking...' : miroFishOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className="rounded-xl p-5 border text-left hover:opacity-90 transition"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg" style={{ background: card.color + '22' }}>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{card.label}</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{card.desc}</p>
          </button>
        ))}
      </div>

      {/* Gemini Daily Brief */}
      <div className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--color-surface)', borderColor: '#6366f133' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#6366f122' }}>
            <Sparkles size={20} style={{ color: '#a78bfa' }} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Gemini AI Daily Brief</div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>สรุปภาพรวมตลาด + คำแนะนำประจำวัน</div>
          </div>
          <button
            onClick={handleDailyBrief}
            disabled={briefLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 hover:brightness-110 disabled:opacity-60"
            style={{ background: '#6366f133', color: '#a78bfa', border: '1px solid #6366f144' }}
          >
            {briefLoading
              ? <><Loader2 size={12} className="animate-spin" /> กำลังโหลด...</>
              : <><Sparkles size={12} /> {briefText ? 'รีเฟรช' : 'Generate Brief'}</>}
          </button>
        </div>
        {briefText && (
          <div className="text-sm leading-relaxed whitespace-pre-line pt-1 border-t"
            style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
            {briefText}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Quick Actions</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Simulate Trade', page: 'trade' as Page, color: '#22c55e' },
            { label: 'Simulate Finance', page: 'finance' as Page, color: '#6366f1' },
            { label: 'MiroFish Hub', page: 'mirofish' as Page, color: '#a78bfa' },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => onNavigate(btn.page)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-80"
              style={{ background: btn.color + '22', color: btn.color, border: `1px solid ${btn.color}33` }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
