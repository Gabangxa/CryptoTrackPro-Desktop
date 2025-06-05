import type { InsertMarketData } from "@shared/schema";

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const COINAPI_KEY = process.env.COINAPI_KEY || import.meta.env.VITE_COINAPI_KEY;

// Symbol mapping for CoinGecko
const symbolMap: Record<string, string> = {
  'BTC/USDT': 'bitcoin',
  'ETH/USDT': 'ethereum',
  'SOL/USDT': 'solana',
  'ADA/USDT': 'cardano',
  'DOT/USDT': 'polkadot',
};

// Get current crypto prices from CoinGecko
export async function getCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const coinIds = symbols.map(symbol => symbolMap[symbol]).filter(Boolean);
    
    if (coinIds.length === 0) {
      throw new Error('No valid symbols provided');
    }

    const response = await fetch(
      `${COINGECKO_API_URL}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices: Record<string, number> = {};

    symbols.forEach(symbol => {
      const coinId = symbolMap[symbol];
      if (coinId && data[coinId]) {
        prices[symbol] = data[coinId].usd;
      }
    });

    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    throw error;
  }
}

// Get detailed market data for a specific symbol
export async function getMarketData(symbol: string): Promise<InsertMarketData | null> {
  try {
    const coinId = symbolMap[symbol];
    if (!coinId) {
      throw new Error(`Unsupported symbol: ${symbol}`);
    }

    const response = await fetch(
      `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      return null;
    }

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      symbol,
      baseAsset,
      quoteAsset,
      price: coinData.usd.toString(),
      change24h: coinData.usd_24h_change?.toString() || '0',
      changePercent24h: coinData.usd_24h_change?.toString() || '0',
      volume24h: coinData.usd_24h_vol?.toString() || '0',
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    return null;
  }
}

// Get multiple market data entries
export async function getMultipleMarketData(symbols: string[]): Promise<InsertMarketData[]> {
  try {
    const results = await Promise.allSettled(
      symbols.map(symbol => getMarketData(symbol))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<InsertMarketData> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  } catch (error) {
    console.error('Error fetching multiple market data:', error);
    return [];
  }
}

// Alternative API fallback using CoinAPI (if API key is available)
export async function getCryptoPricesFromCoinAPI(symbols: string[]): Promise<Record<string, number>> {
  if (!COINAPI_KEY) {
    throw new Error('CoinAPI key not configured');
  }

  try {
    const prices: Record<string, number> = {};
    
    // CoinAPI uses different symbol format
    const coinApiSymbols = symbols.map(symbol => symbol.replace('/', ''));
    
    for (const symbol of coinApiSymbols) {
      const response = await fetch(
        `https://rest.coinapi.io/v1/exchangerate/${symbol.replace('USDT', '')}/USD`,
        {
          headers: {
            'X-CoinAPI-Key': COINAPI_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const originalSymbol = symbols.find(s => s.replace('/', '') === symbol);
        if (originalSymbol) {
          prices[originalSymbol] = data.rate;
        }
      }
    }

    return prices;
  } catch (error) {
    console.error('Error fetching prices from CoinAPI:', error);
    throw error;
  }
}

// WebSocket connection to CoinGecko (for premium users) or fallback to polling
export class CryptoWebSocket {
  private ws: WebSocket | null = null;
  private symbols: string[] = [];
  private onPriceUpdate?: (symbol: string, price: number) => void;

  constructor(symbols: string[], onPriceUpdate?: (symbol: string, price: number) => void) {
    this.symbols = symbols;
    this.onPriceUpdate = onPriceUpdate;
  }

  connect() {
    // CoinGecko doesn't provide free WebSocket, so we'll simulate with polling
    this.startPolling();
  }

  private startPolling() {
    const pollInterval = setInterval(async () => {
      try {
        const prices = await getCryptoPrices(this.symbols);
        
        Object.entries(prices).forEach(([symbol, price]) => {
          this.onPriceUpdate?.(symbol, price);
        });
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    // Store interval ID for cleanup
    (this as any).pollInterval = pollInterval;
  }

  disconnect() {
    if ((this as any).pollInterval) {
      clearInterval((this as any).pollInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}
