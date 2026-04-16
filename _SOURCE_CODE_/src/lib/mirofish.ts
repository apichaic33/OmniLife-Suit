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
export function buildTradeSeed(trades: any[], pair?: string): string {
  const filtered = pair ? trades.filter(t => t.pair === pair) : trades;
  const lines = filtered.map(t =>
    `| ${t.date || t.createdAt} | ${t.type} | ${t.pair} | ${t.price} | ${t.amount} | ${t.status} |`
  );

  return `# Trade Analysis Report

## Trading Data
${pair ? `Pair: ${pair}` : 'All Pairs'}
Period: Recent ${filtered.length} trades

## Trade History
| Date | Type | Pair | Price | Amount | Status |
|------|------|------|-------|--------|--------|
${lines.join('\n')}

## Prediction Request
Analyze market sentiment based on this trading history.
Should I continue with the current strategy or adjust my position?
What are the key risks and opportunities in the next 1-2 weeks?
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
