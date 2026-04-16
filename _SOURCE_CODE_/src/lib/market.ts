// CoinGecko free API — no API key required
const BASE = 'https://api.coingecko.com/api/v3';

// Map base currency → CoinGecko ID
const GECKO_ID: Record<string, string> = {
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
};

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

/** Extract base from "BTC/USDT" → "BTC" */
export function baseCurrency(pair: string): string {
  return pair.split('/')[0].toUpperCase();
}

/**
 * Fetch current USD prices for a list of trading pairs.
 * Returns { BTC: { usd: 65000, usd_24h_change: 2.5 }, ... }
 */
export async function fetchPrices(pairs: string[]): Promise<Record<string, PriceData>> {
  const bases  = [...new Set(pairs.map(baseCurrency))];
  const idList = bases.map(b => GECKO_ID[b]).filter(Boolean).join(',');
  if (!idList) return {};

  try {
    const res = await fetch(
      `${BASE}/simple/price?ids=${idList}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const data = await res.json();

    const result: Record<string, PriceData> = {};
    for (const base of bases) {
      const id = GECKO_ID[base];
      if (id && data[id]) result[base] = data[id];
    }
    return result;
  } catch {
    return {};
  }
}

export function formatChange(change: number): string {
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
}
