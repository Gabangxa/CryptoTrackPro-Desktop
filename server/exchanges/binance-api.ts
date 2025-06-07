import crypto from 'crypto';
import type { InsertMarketData, InsertOrder } from '@shared/schema';

const BINANCE_API_BASE = 'https://api.binance.com';
const BINANCE_TESTNET_BASE = 'https://testnet.binance.vision';

export class BinanceAPI {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, secretKey?: string, sandboxMode = false) {
    this.apiKey = apiKey || process.env.BINANCE_API_KEY || '';
    this.secretKey = secretKey || process.env.BINANCE_SECRET_KEY || '';
    this.baseUrl = sandboxMode ? BINANCE_TESTNET_BASE : BINANCE_API_BASE;
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET', signed = false) {
    const queryString = new URLSearchParams(params).toString();
    let url = `${this.baseUrl}${endpoint}`;
    
    if (signed) {
      params.timestamp = Date.now();
      const signedQueryString = new URLSearchParams(params).toString();
      const signature = this.createSignature(signedQueryString);
      url += `?${signedQueryString}&signature=${signature}`;
    } else if (queryString) {
      url += `?${queryString}`;
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['X-MBX-APIKEY'] = this.apiKey;
    }

    if (signed) {
      console.log('Binance API Request:', {
        endpoint,
        method,
        hasApiKey: !!this.apiKey,
        hasSecretKey: !!this.secretKey,
        timestamp: params.timestamp
      });
    }

    const response = await fetch(url, {
      method,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Binance API Error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        body: errorBody
      });
      throw new Error(`Binance API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }

  async getTickerPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    return this.makeRequest('/api/v3/ticker/price', { symbol });
  }

  async getTicker24hr(symbol: string): Promise<any> {
    return this.makeRequest('/api/v3/ticker/24hr', { symbol });
  }

  async getMarketData(symbol: string): Promise<InsertMarketData> {
    // Use public endpoint for market data (no auth required)
    const ticker = await this.makeRequest('/api/v3/ticker/24hr', { symbol: symbol.replace('/', '') });
    
    return {
      symbol: `${ticker.symbol.slice(0, -4)}/${ticker.symbol.slice(-4)}`, // Convert BTCUSDT to BTC/USDT
      baseAsset: ticker.symbol.slice(0, -4),
      quoteAsset: ticker.symbol.slice(-4),
      price: ticker.lastPrice,
      change24h: ticker.priceChange,
      changePercent24h: ticker.priceChangePercent,
      volume24h: ticker.volume,
    };
  }

  async getAccountInfo(): Promise<any> {
    return this.makeRequest('/api/v3/account', {}, 'GET', true);
  }

  async getSpotBalances(): Promise<any[]> {
    const account = await this.getAccountInfo();
    return account.balances.filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0);
  }

  async getFuturesPositions(): Promise<any[]> {
    try {
      return this.makeRequest('/fapi/v2/positionRisk', {}, 'GET', true);
    } catch (error) {
      console.error('Error fetching futures positions:', error);
      return [];
    }
  }

  async placeSpotOrder(order: InsertOrder): Promise<any> {
    const params = {
      symbol: order.symbol.replace('/', ''),
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      quantity: order.quantity,
    };

    if (order.type === 'limit' && order.price) {
      (params as any).price = order.price;
      (params as any).timeInForce = 'GTC';
    }

    return this.makeRequest('/api/v3/order', params, 'POST', true);
  }

  async getMultipleMarketData(symbols: string[]): Promise<InsertMarketData[]> {
    try {
      // Use bulk ticker endpoints for better performance
      const allPrices = await this.makeRequest('/api/v3/ticker/price');
      const all24hrStats = await this.makeRequest('/api/v3/ticker/24hr');
      
      const results: InsertMarketData[] = [];
      
      for (const symbol of symbols) {
        const binanceSymbol = symbol.replace('/', '');
        const priceData = allPrices.find((p: any) => p.symbol === binanceSymbol);
        const statsData = all24hrStats.find((s: any) => s.symbol === binanceSymbol);
        
        if (priceData && statsData) {
          results.push({
            symbol,
            baseAsset: symbol.split('/')[0],
            quoteAsset: symbol.split('/')[1],
            price: priceData.price,
            change24h: statsData.priceChange || '0',
            changePercent24h: statsData.priceChangePercent || '0',
            volume24h: statsData.volume || '0',
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Binance bulk market data error, falling back to individual requests:', error);
      // Fallback to individual requests
      const binanceSymbols = symbols.map(s => s.replace('/', ''));
      const results = await Promise.allSettled(
        binanceSymbols.map(symbol => 
          this.getMarketData(symbol).catch(err => {
            console.error(`Failed to get market data for ${symbol}:`, err);
            return null;
          })
        )
      );

      return results
        .filter((result): result is PromiseFulfilledResult<InsertMarketData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
    }
  }
}

export const binanceAPI = new BinanceAPI();