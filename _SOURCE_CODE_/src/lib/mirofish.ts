// MiroFish API Client
// Connects OmniLife Suit to MiroFish backend at localhost:5001

const MIROFISH_BASE = 'http://localhost:5001';

export interface MiroFishProject {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface SimulationStatus {
  simulation_id: string;
  status: 'created' | 'preparing' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

export interface ReportResult {
  report_id: string;
  content: string;
  summary: string;
  created_at: string;
}

// Check if MiroFish backend is reachable
export async function checkMiroFishHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${MIROFISH_BASE}/api/simulation/history?limit=1`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Upload seed document and start graph build
export async function uploadSeed(
  seedText: string,
  projectName: string,
  predictionRequest: string
): Promise<{ project_id: string; graph_id: string }> {
  const blob = new Blob([seedText], { type: 'text/markdown' });
  const formData = new FormData();
  formData.append('file', blob, 'seed.md');
  formData.append('project_name', projectName);
  formData.append('prediction_request', predictionRequest);

  const res = await fetch(`${MIROFISH_BASE}/api/graph/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Graph upload failed: ${res.status}`);
  return res.json();
}

// Get graph build status
export async function getGraphStatus(projectId: string): Promise<{ status: string; graph_info?: any }> {
  const res = await fetch(`${MIROFISH_BASE}/api/graph/status/${projectId}`);
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json();
}

// Start simulation
export async function startSimulation(projectId: string, graphId: string): Promise<SimulationStatus> {
  const res = await fetch(`${MIROFISH_BASE}/api/simulation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, graph_id: graphId, max_rounds: 20 }),
  });
  if (!res.ok) throw new Error(`Simulation start failed: ${res.status}`);
  return res.json();
}

// Get simulation status
export async function getSimulationStatus(simulationId: string): Promise<SimulationStatus> {
  const res = await fetch(`${MIROFISH_BASE}/api/simulation/status/${simulationId}`);
  if (!res.ok) throw new Error(`Simulation status failed: ${res.status}`);
  return res.json();
}

// Get simulation history
export async function getSimulationHistory(limit = 10): Promise<any[]> {
  const res = await fetch(`${MIROFISH_BASE}/api/simulation/history?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.simulations || [];
}

// Generate report
export async function generateReport(projectId: string, simulationId: string): Promise<ReportResult> {
  const res = await fetch(`${MIROFISH_BASE}/api/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, simulation_id: simulationId }),
  });
  if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);
  return res.json();
}

// Build seed text from Trade data (Firestore → markdown)
export function buildTradeSeed(
  trades: any[],
  pair?: string,
  prices?: Record<string, { usd: number; usd_24h_change: number }>
): string {
  const filtered = pair ? trades.filter(t => t.pair === pair) : trades;
  const open     = filtered.filter(t => t.status === 'Open');
  const closed   = filtered.filter(t => t.status === 'Closed');
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins     = closed.filter(t => (t.pnl || 0) > 0).length;

  const tradeLines = filtered.map(t => {
    const base   = t.pair?.split('/')[0]?.toUpperCase();
    const curPrice = prices?.[base]?.usd;
    const uPnl = t.status === 'Open' && curPrice
      ? ((t.type === 'Buy' ? curPrice - t.price : t.price - curPrice) * t.amount).toFixed(2)
      : t.pnl ?? '—';
    const note = t.notes ? ` [Note: ${t.notes}]` : '';
    const mood = t.sentiment ? ` (${t.sentiment})` : '';
    return `| ${t.date} | ${t.type} | ${t.pair} | ${t.price} | ${t.amount} | ${t.status} | ${uPnl}${mood}${note} |`;
  });

  const marketSection = prices && Object.keys(prices).length > 0
    ? `## Current Market Prices (${new Date().toLocaleDateString()})
${Object.entries(prices).map(([sym, p]) =>
  `- ${sym}/USDT: $${p.usd.toLocaleString()} (24h: ${p.usd_24h_change >= 0 ? '+' : ''}${p.usd_24h_change.toFixed(2)}%)`
).join('\n')}\n`
    : '';

  const sentimentCounts = filtered.reduce((acc, t) => {
    if (t.sentiment) acc[t.sentiment] = (acc[t.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `# Trade Portfolio Analysis

## Summary
${pair ? `Pair: ${pair}` : 'All Pairs'} | Total trades: ${filtered.length}
Open positions: ${open.length} | Closed: ${closed.length}
Realized P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
Win rate: ${closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0}% (${wins}W / ${closed.length - wins}L)
${Object.keys(sentimentCounts).length > 0 ? `Trader sentiment history: ${Object.entries(sentimentCounts).map(([k,v]) => `${k}:${v}`).join(', ')}` : ''}

${marketSection}## Trade Log
| Date | Type | Pair | Entry Price | Amount | Status | P&L / Sentiment / Notes |
|------|------|------|-------------|--------|--------|--------------------------|
${tradeLines.join('\n')}

## Prediction Request
Analyze this trading portfolio including current market prices and trader sentiment.
- What is the overall portfolio health and risk level?
- Based on sentiment patterns, what does the trader's psychology suggest?
- Should I hold, reduce, or increase positions given current market conditions?
- What are the key risks and opportunities in the next 1-2 weeks?
`;
}

// Build seed from combined Trade + Assets portfolio
export function buildPortfolioSeed(
  trades: any[],
  assets: any[],
  prices?: Record<string, { usd: number; usd_24h_change: number }>
): string {
  const open        = trades.filter(t => t.status === 'Open');
  const closed      = trades.filter(t => t.status === 'Closed');
  const totalPnl    = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const totalAssets = assets.reduce((s, a) => s + (a.value || 0), 0);

  const unrealizedPnl = open.reduce((s, t) => {
    const base = t.pair?.split('/')[0]?.toUpperCase();
    const cur  = prices?.[base]?.usd;
    if (!cur) return s;
    return s + (t.type === 'Buy' ? cur - t.price : t.price - cur) * t.amount;
  }, 0);

  const marketSection = prices && Object.keys(prices).length > 0
    ? `## Live Market Prices
${Object.entries(prices).map(([sym, p]) =>
  `- ${sym}: $${p.usd.toLocaleString()} (${p.usd_24h_change >= 0 ? '+' : ''}${p.usd_24h_change.toFixed(2)}% 24h)`
).join('\n')}\n`
    : '';

  return `# Full Portfolio Analysis — OmniLife Suit

## Portfolio Overview
- Total Asset Value: ฿${totalAssets.toLocaleString()}
- Realized Trading P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
- Unrealized Trading P&L: ${unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
- Open Positions: ${open.length}

${marketSection}## Assets
${assets.map(a => `- ${a.name} (${a.category}): ฿${a.value?.toLocaleString()} ${a.change} (${a.type})`).join('\n')}

## Open Trade Positions
${open.map(t => {
  const base = t.pair?.split('/')[0]?.toUpperCase();
  const cur  = prices?.[base]?.usd;
  const uPnl = cur ? ((t.type === 'Buy' ? cur - t.price : t.price - cur) * t.amount).toFixed(2) : '?';
  return `- ${t.type} ${t.pair}: entry ${t.price}, size ${t.amount}, unrealized P&L: ${uPnl}`;
}).join('\n')}

## Recent Closed Trades (Last 10)
${closed.slice(0, 10).map(t => `- ${t.closedAt || t.date}: ${t.type} ${t.pair} → P&L: ${(t.pnl || 0) >= 0 ? '+' : ''}${t.pnl || 0}${t.notes ? ` | ${t.notes}` : ''}`).join('\n')}

## Prediction Request
Analyze this complete portfolio combining traditional assets and crypto trading positions.
- What is the total portfolio risk exposure?
- How correlated are the crypto positions with overall asset performance?
- What rebalancing strategy would optimize risk-adjusted returns?
- Which positions should be reduced or increased given current market conditions?
`;
}

// Build seed text from Finance data
export function buildFinanceSeed(transactions: any[], debts: any[], businesses: any[]): string {
  const income    = transactions.filter(t => t.type === 'income');
  const expenses  = transactions.filter(t => t.type === 'expense');
  const totalIn   = income.reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut  = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (d.remainingBalance || 0), 0);

  return `# Financial Analysis Report

## Income & Expenses (Recent)
- Total Income: ฿${totalIn.toLocaleString()}
- Total Expenses: ฿${totalOut.toLocaleString()}
- Net Cash Flow: ฿${(totalIn - totalOut).toLocaleString()}

## Debts
${debts.map(d => `- ${d.title}: ฿${d.remainingBalance?.toLocaleString()} remaining (${d.interestRate}% interest, ฿${d.monthlyPayment}/month)`).join('\n')}
Total Debt: ฿${totalDebt.toLocaleString()}

## Businesses / Income Sources
${businesses.map(b => `- ${b.name} (${b.type}): ${b.status}`).join('\n')}

## Recent Transactions
${transactions.slice(0, 20).map(t => `- ${t.date}: ${t.type === 'income' ? '+' : '-'}฿${t.amount} — ${t.title} (${t.category})`).join('\n')}

## Prediction Request
Based on this financial data, simulate future cash flow scenarios.
What is the projected financial health in 3-6 months?
How can I optimize debt repayment while maintaining business growth?
`;
}
