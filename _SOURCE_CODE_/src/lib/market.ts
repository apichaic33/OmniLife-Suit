// ============================================================
// Multi-Provider Market Data
//  • CoinGecko   — Crypto + Gold (via PAXG proxy)  — free, no key
//  • Frankfurter — Forex pairs                      — free, no key
//  • Alpha Vantage — Stocks, ETF, Index, Oil        — free key required
// ============================================================

const GECKO_BASE        = 'https://api.coingecko.com/api/v3';
const FRANKFURTER_BASE  = 'https://api.frankfurter.app';
const AV_BASE           = 'https://www.alphavantage.co/query';

// ── CoinGecko coin IDs ────────────────────────────────────────
export const GECKO_ID: Record<string, string> = {
  // Crypto
  BTC:   'bitcoin',
  ETH:   'ethereum',
  BNB:   'binancecoin',
  SOL:   'solana',
  XRP:   'ripple',
  ADA:   'cardano',
  DOGE:  'dogecoin',
  AVAX:  'avalanche-2',
  DOT:   'polkadot',
  MATIC: 'matic-network',
  POL:   'matic-network',
  LTC:   'litecoin',
  LINK:  'chainlink',
  UNI:   'uniswap',
  ATOM:  'cosmos',
  NEAR:  'near',
  APT:   'aptos',
  SUI:   'sui',
  TRX:   'tron',
  TON:   'the-open-network',
  // Gold — PAXG (Paxos Gold) is 1:1 pegged to 1 troy oz of gold
  XAU:   'pax-gold',
  GOLD:  'pax-gold',
  PAXG:  'pax-gold',
};

// ── Fiat currencies recognised for Forex detection ────────────
const FIAT_CODES = new Set([
  'USD','EUR','GBP','JPY','THB','CHF','AUD','CAD','NZD',
  'SGD','HKD','CNY','KRW','INR','MYR','IDR','PHP','VND','TWD',
]);

// ── Known ETF tickers ─────────────────────────────────────────
export const ETF_TICKERS = new Set([
  'SPY','QQQ','IWM','GLD','SLV','USO','VTI','BND',
  'ARKK','SQQQ','TQQQ','XLF','XLE','XLK','NVDL','BITO',
]);

// ── Known index symbols ───────────────────────────────────────
export const INDEX_SYMBOLS = new Set([
  '^GSPC','SPX','S&P500',
  '^IXIC','NDX','NASDAQ',
  '^DJI','DJI','DOW',
  '^N225','N225','NIKKEI',
  '^FTSE','FTSE100',
  'SET50','^SET','SET',
  '^HSI','HSI','HANGSENG',
  '^STI','STI',
]);

// ── Oil / non-gold commodities ────────────────────────────────
export const OIL_SYMBOLS = new Set(['WTI','BRENT','OIL','USOIL','UKOIL','CL','NG','NATGAS']);

// ── Asset type ────────────────────────────────────────────────
export type AssetType = 'crypto' | 'forex' | 'gold' | 'stock' | 'etf' | 'index' | 'commodity';

export const ASSET_META: Record<AssetType, { label: string; color: string; bg: string; source: string }> = {
  crypto:    { label: 'Crypto',     color: '#f59e0b', bg: '#f59e0b22', source: 'CoinGecko'      },
  gold:      { label: 'Gold',       color: '#fbbf24', bg: '#fbbf2422', source: 'CoinGecko/PAXG' },
  forex:     { label: 'Forex',      color: '#6366f1', bg: '#6366f122', source: 'Frankfurter'    },
  stock:     { label: 'Stock',      color: '#22c55e', bg: '#22c55e22', source: 'Alpha Vantage'  },
  etf:       { label: 'ETF',        color: '#818cf8', bg: '#818cf822', source: 'Alpha Vantage'  },
  index:     { label: 'Index',      color: '#94a3b8', bg: '#94a3b822', source: 'Alpha Vantage'  },
  commodity: { label: 'Commodity',  color: '#fb923c', bg: '#fb923c22', source: 'Alpha Vantage'  },
};

/**
 * Detect the asset type from a trading symbol.
 * Examples: 'BTC/USDT' → crypto | 'EUR/USD' → forex | 'AAPL' → stock | 'XAU/USD' → gold
 */
export function detectAssetType(symbol: string): AssetType {
  const upper = symbol.toUpperCase().trim();
  const base  = upper.split('/')[0];
  const quote = upper.split('/')[1] || '';

  if (['XAU','GOLD','PAXG','XAG','SILVER'].includes(base))   return 'gold';
  if (OIL_SYMBOLS.has(base))                                  return 'commodity';
  if (GECKO_ID[base])                                         return 'crypto';
  if (INDEX_SYMBOLS.has(upper) || INDEX_SYMBOLS.has(base))   return 'index';
  if (ETF_TICKERS.has(base))                                  return 'etf';
  if (FIAT_CODES.has(base) && (!quote || FIAT_CODES.has(quote))) return 'forex';
  // 6-char no-slash forex like EURUSD
  if (!quote && base.length === 6 && FIAT_CODES.has(base.slice(0,3)) && FIAT_CODES.has(base.slice(3))) return 'forex';
  return 'stock';
}

// ── Shared types ──────────────────────────────────────────────
export interface PriceData {
  usd: number;          // current price (in quote currency, typically USD)
  usd_24h_change: number; // 24-hour % change
}

/** Extract base ticker: 'BTC/USDT' → 'BTC', 'EUR/USD' → 'EUR', 'AAPL' → 'AAPL' */
export function baseCurrency(pair: string): string {
  return pair.split('/')[0].toUpperCase().trim();
}

export function formatChange(change: number): string {
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
}

// ── Alpha Vantage key management (stored in localStorage) ─────
export function getAVKey(): string        { return localStorage.getItem('av_api_key') || ''; }
export function setAVKey(key: string): void { localStorage.setItem('av_api_key', key.trim()); }

// ── Internal: CoinGecko (crypto + gold via PAXG) ──────────────
async function _fetchCryptoPrices(pairs: string[]): Promise<Record<string, PriceData>> {
  const bases  = [...new Set(pairs.map(baseCurrency))];
  const idList = bases.map(b => GECKO_ID[b]).filter(Boolean).join(',');
  if (!idList) return {};
  try {
    const res = await fetch(
      `${GECKO_BASE}/simple/price?ids=${idList}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, PriceData> = {};
    for (const base of bases) {
      const id = GECKO_ID[base];
      if (id && data[id]) result[base] = { usd: data[id].usd, usd_24h_change: data[id].usd_24h_change ?? 0 };
    }
    return result;
  } catch { return {}; }
}

// ── Internal: Frankfurter (forex) ────────────────────────────
async function _fetchForexPrices(pairs: string[]): Promise<Record<string, PriceData>> {
  try {
    // One call gets all USD-based rates; yesterday's call gives 24h change
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split('T')[0];

    const [todayRes, yestRes] = await Promise.all([
      fetch(`${FRANKFURTER_BASE}/latest?from=USD`,  { signal: AbortSignal.timeout(8000) }),
      fetch(`${FRANKFURTER_BASE}/${yDate}?from=USD`, { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!todayRes.ok) return {};
    const todayData = await todayRes.json();
    const yestData  = yestRes.ok ? await yestRes.json() : null;

    // usdRates[X] = how many X per 1 USD
    const todayRates: Record<string, number> = { ...todayData.rates, USD: 1 };
    const yestRates:  Record<string, number> = yestData ? { ...yestData.rates, USD: 1 } : {};

    const result: Record<string, PriceData> = {};
    const processedBases = new Set<string>();

    for (const pair of pairs) {
      const base  = pair.split('/')[0].toUpperCase();
      const quote = (pair.split('/')[1] || 'USD').toUpperCase();
      if (processedBases.has(base)) continue; // first pair wins for this base

      const baseRate  = todayRates[base];
      const quoteRate = todayRates[quote];
      if (!baseRate || !quoteRate) continue;

      // Price of 1 unit of base in quote currency
      const price = quoteRate / baseRate;

      // 24h change %
      let change = 0;
      if (yestRates[base] && yestRates[quote]) {
        const prevPrice = yestRates[quote] / yestRates[base];
        change = prevPrice > 0 ? (price - prevPrice) / prevPrice * 100 : 0;
      }

      result[base] = { usd: price, usd_24h_change: change };
      processedBases.add(base);
    }
    return result;
  } catch { return {}; }
}

// ── Internal: Alpha Vantage (stocks / ETF / index / commodity) ─
async function _fetchAVPrices(symbols: string[], apiKey: string): Promise<Record<string, PriceData>> {
  if (!apiKey) return {};
  const result: Record<string, PriceData> = {};
  // Fetch up to 5 in parallel to stay within rate limits
  const batch = [...new Set(symbols)].slice(0, 5);
  await Promise.allSettled(batch.map(async sym => {
    try {
      const res = await fetch(
        `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const q = data['Global Quote'];
      if (!q?.['05. price']) return;
      result[sym] = {
        usd:             parseFloat(q['05. price']),
        usd_24h_change:  parseFloat(q['10. change percent']?.replace('%','') || '0'),
      };
    } catch { /* skip */ }
  }));
  return result;
}

// ── Public: unified fetchPrices ───────────────────────────────
/**
 * Fetch current prices for any mix of pairs/symbols.
 * Routes automatically to the correct provider by asset type.
 *
 * Return key = base ticker  (e.g. 'BTC', 'EUR', 'AAPL', 'XAU', 'SPY')
 * Return value = { usd: <price>, usd_24h_change: <% change> }
 */
export async function fetchPrices(pairs: string[]): Promise<Record<string, PriceData>> {
  if (pairs.length === 0) return {};

  const cryptoGoldPairs:  string[] = [];
  const forexPairs:       string[] = [];
  const avSymbols:        string[] = [];

  for (const pair of pairs) {
    const type = detectAssetType(pair);
    if (type === 'crypto' || type === 'gold')     cryptoGoldPairs.push(pair);
    else if (type === 'forex')                    forexPairs.push(pair);
    else                                          avSymbols.push(baseCurrency(pair)); // stock/etf/index/commodity
  }

  const [cryptoResult, forexResult, avResult] = await Promise.all([
    cryptoGoldPairs.length > 0 ? _fetchCryptoPrices(cryptoGoldPairs) : Promise.resolve({}),
    forexPairs.length      > 0 ? _fetchForexPrices(forexPairs)       : Promise.resolve({}),
    avSymbols.length       > 0 ? _fetchAVPrices(avSymbols, getAVKey()) : Promise.resolve({}),
  ]);

  return { ...cryptoResult, ...forexResult, ...avResult };
}

// ── OHLCV (CoinGecko — crypto/gold only) ─────────────────────
/**
 * Fetch OHLCV candles from CoinGecko.
 * Only works for crypto and gold (via PAXG).
 */
export async function fetchOHLCV(
  base: string,
  days: number,
): Promise<{ time: number; open: number; high: number; low: number; close: number }[]> {
  const id = GECKO_ID[base.toUpperCase()];
  if (!id) throw new Error(`No CoinGecko ID for: ${base}`);
  const res = await fetch(
    `${GECKO_BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
    { signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) throw new Error(`CoinGecko OHLCV error: ${res.status}`);
  const raw: [number, number, number, number, number][] = await res.json();
  return raw.map(([time, open, high, low, close]) => ({ time, open, high, low, close }));
}
