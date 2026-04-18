// ============================================================
// News Sentiment Engine
//  • CryptoPanic — Crypto news sentiment  (PAID PLAN required)
//  • Alpha Vantage NEWS_SENTIMENT — Stocks (reuses AV key, free tier)
// ============================================================

const CP_BASE = 'https://cryptopanic.com/api/v1';

export interface NewsSentiment {
  score: number;       // -1.0 (very bearish) to +1.0 (very bullish)
  label: string;       // "Very Bullish" | "Bullish" | "Neutral" | "Bearish" | "Very Bearish"
  articles: number;
  source: 'CryptoPanic' | 'AlphaVantage';
}

// ── CryptoPanic key ───────────────────────────────────────────
export function getCPKey(): string  { return localStorage.getItem('cryptopanic_api_key') || ''; }
export function setCPKey(k: string) { localStorage.setItem('cryptopanic_api_key', k.trim()); }

function scoreLabel(score: number): string {
  return score > 0.5  ? 'Very Bullish'
       : score > 0.1  ? 'Bullish'
       : score < -0.5 ? 'Very Bearish'
       : score < -0.1 ? 'Bearish'
       : 'Neutral';
}

// ── CryptoPanic ───────────────────────────────────────────────
async function _fetchCPSentiment(symbols: string[]): Promise<Record<string, NewsSentiment>> {
  const key = getCPKey();
  if (!key) return {};
  const currencies = symbols.join(',');
  try {
    const res = await fetch(
      `${CP_BASE}/posts/?auth_token=${key}&currencies=${currencies}&filter=hot&public=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const data = await res.json();

    // Accumulate votes per symbol
    const acc: Record<string, { pos: number; neg: number; count: number }> = {};
    for (const post of (data.results || [])) {
      for (const curr of (post.currencies || [])) {
        const sym = curr.code as string;
        if (!acc[sym]) acc[sym] = { pos: 0, neg: 0, count: 0 };
        acc[sym].pos   += (post.votes?.positive || 0);
        acc[sym].neg   += (post.votes?.negative || 0);
        acc[sym].count ++;
      }
    }

    const result: Record<string, NewsSentiment> = {};
    for (const [sym, v] of Object.entries(acc)) {
      const total = v.pos + v.neg;
      const score = total > 0 ? Math.max(-1, Math.min(1, (v.pos - v.neg) / total)) : 0;
      result[sym] = { score, label: scoreLabel(score), articles: v.count, source: 'CryptoPanic' };
    }
    return result;
  } catch { return {}; }
}

// ── Alpha Vantage News Sentiment ──────────────────────────────
async function _fetchAVSentiment(symbols: string[], avKey: string): Promise<Record<string, NewsSentiment>> {
  if (!avKey) return {};
  const result: Record<string, NewsSentiment> = {};
  await Promise.allSettled(symbols.slice(0, 3).map(async sym => {
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${sym}&apikey=${avKey}&limit=25`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const feed: any[] = data.feed || [];
      if (feed.length === 0) return;

      let sum = 0, n = 0;
      for (const article of feed) {
        const ts = (article.ticker_sentiment || []).find((t: any) => t.ticker === sym);
        if (ts?.ticker_sentiment_score) { sum += parseFloat(ts.ticker_sentiment_score); n++; }
      }
      if (n === 0) return;

      // AV scores are roughly -0.35 to +0.35 → scale to -1/+1
      const score = Math.max(-1, Math.min(1, (sum / n) * 3));
      result[sym] = { score, label: scoreLabel(score), articles: feed.length, source: 'AlphaVantage' };
    } catch { /* skip */ }
  }));
  return result;
}

// ── Public unified fetch ──────────────────────────────────────
/**
 * Fetch news sentiment for a list of pairs.
 * Crypto → CryptoPanic (needs CP key)
 * Stocks → Alpha Vantage (reuses AV key)
 *
 * Return key = base ticker (e.g. 'BTC', 'AAPL')
 */
export async function fetchNewsSentiment(
  pairs: string[],
  avKey = '',
): Promise<Record<string, NewsSentiment>> {
  const FIAT = new Set(['USD','EUR','GBP','JPY','THB','AUD','CAD','NZD','SGD','CHF','HKD','CNY','KRW']);

  const cryptoSymbols: string[] = [];
  const stockSymbols:  string[] = [];

  for (const pair of pairs) {
    const base = pair.split('/')[0].toUpperCase();
    if (FIAT.has(base)) continue;
    // Decide: if it looks like a stock ticker (short, alpha-only, no common crypto name)
    const isCrypto = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','DOT','LTC',
      'LINK','UNI','ATOM','NEAR','APT','SUI','TRX','TON','MATIC','POL'].includes(base);
    if (isCrypto) cryptoSymbols.push(base);
    else if (/^[A-Z]{1,5}$/.test(base)) stockSymbols.push(base);
  }

  const [cpRes, avRes] = await Promise.all([
    cryptoSymbols.length > 0 ? _fetchCPSentiment(cryptoSymbols) : Promise.resolve({}),
    stockSymbols.length  > 0 ? _fetchAVSentiment(stockSymbols, avKey) : Promise.resolve({}),
  ]);

  return { ...cpRes, ...avRes };
}
