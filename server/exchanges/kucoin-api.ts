import crypto from 'crypto';
import { InsertMarketData, InsertOrder } from '../../shared/schema';

export class KuCoinAPI {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;

  constructor(apiKey?: string, secretKey?: string, passphrase?: string, sandboxMode = false) {
    this.baseUrl = sandboxMode ? 'https://openapi-sandbox.kucoin.com' : 'https://api.kucoin.com';
    this.apiKey = apiKey || process.env.KUCOIN_API_KEY || '';
    this.secretKey = secretKey || process.env.KUCOIN_API_SECRET || '';
    this.passphrase = passphrase || process.env.KUCOIN_PASSPHRASE || '';
  }

  private createSignature(timestamp: string, method: string, endpoint: string, body: string = ''): string {
    const message = timestamp + method.toUpperCase() + endpoint + body;
    return crypto.createHmac('sha256', this.secretKey).update(message).digest('base64');
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET', signed = false) {
    const url = new URL(endpoint, this.baseUrl);
    
    if (method === 'GET' && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let body = '';
    if (method === 'POST' && Object.keys(params).length > 0) {
      body = JSON.stringify(params);
    }

    if (signed && this.apiKey && this.secretKey && this.passphrase) {
      const timestamp = Date.now().toString();
      const requestPath = url.pathname + url.search;
      const signature = this.createSignature(timestamp, method, requestPath, body);
      
      headers['KC-API-KEY'] = this.apiKey;
      headers['KC-API-SIGN'] = signature;
      headers['KC-API-TIMESTAMP'] = timestamp;
      headers['KC-API-PASSPHRASE'] = crypto.createHmac('sha256', this.secretKey).update(this.passphrase).digest('base64');
      headers['KC-API-KEY-VERSION'] = '2';
      
      console.log('KuCoin Auth Debug:', {
        timestamp,
        method,
        requestPath,
        hasApiKey: !!this.apiKey,
        hasSecretKey: !!this.secretKey,
        hasPassphrase: !!this.passphrase,
        signature: signature.substring(0, 20) + '...',
        message: (timestamp + method.toUpperCase() + requestPath + body).substring(0, 50) + '...'
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? body : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('KuCoin API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      throw new Error(`KuCoin API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== '200000') {
      console.error('KuCoin API Error Response:', data);
      throw new Error(`KuCoin API error: ${data.code} - ${data.msg}`);
    }

    return data.data;
  }

  async getTickerPrice(symbol: string): Promise<any> {
    return this.makeRequest('/api/v1/market/orderbook/level1', { symbol });
  }

  async getTicker24hr(symbol: string): Promise<any> {
    return this.makeRequest('/api/v1/market/stats', { symbol });
  }

  async getMarketData(symbol: string): Promise<InsertMarketData> {
    // Convert format: BTC/USDT -> BTC-USDT for KuCoin
    const kucoinSymbol = symbol.replace('/', '-');
    
    const [ticker, stats] = await Promise.all([
      this.getTickerPrice(kucoinSymbol),
      this.getTicker24hr(kucoinSymbol)
    ]);

    return {
      symbol,
      baseAsset: symbol.split('/')[0],
      quoteAsset: symbol.split('/')[1],
      price: ticker.price,
      change24h: stats.changePrice,
      changePercent24h: stats.changeRate,
      volume24h: stats.vol,
    };
  }

  async getAccountInfo(): Promise<any> {
    return this.makeRequest('/api/v1/accounts', {}, 'GET', true);
  }

  async getSpotBalances(): Promise<any[]> {
    const accounts = await this.getAccountInfo();
    return accounts.filter((account: any) => account.type === 'trade');
  }

  async getFuturesPositions(): Promise<any[]> {
    return this.makeRequest('/api/v1/positions', {}, 'GET', true);
  }

  async placeSpotOrder(order: InsertOrder): Promise<any> {
    const kucoinSymbol = order.symbol.replace('/', '-');
    
    const orderData = {
      clientOid: crypto.randomUUID(),
      side: order.side.toLowerCase(),
      symbol: kucoinSymbol,
      type: order.type.toLowerCase(),
      size: order.quantity,
      ...(order.price && { price: order.price })
    };

    return this.makeRequest('/api/v1/orders', orderData, 'POST', true);
  }

  async getMultipleMarketData(symbols: string[]): Promise<InsertMarketData[]> {
    try {
      // Use the bulk all tickers endpoint for better performance
      const allTickers = await this.makeRequest('/api/v1/market/allTickers');
      const allStats = await this.makeRequest('/api/v1/market/stats');
      
      const results: InsertMarketData[] = [];
      
      for (const symbol of symbols) {
        const kucoinSymbol = symbol.replace('/', '-');
        const ticker = allTickers.ticker?.find((t: any) => t.symbol === kucoinSymbol);
        const stats = allStats?.find((s: any) => s.symbol === kucoinSymbol);
        
        if (ticker && stats) {
          results.push({
            symbol,
            baseAsset: symbol.split('/')[0],
            quoteAsset: symbol.split('/')[1],
            price: ticker.last,
            change24h: stats.changePrice || '0',
            changePercent24h: stats.changeRate || '0',
            volume24h: stats.vol || '0',
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('KuCoin bulk market data error, falling back to individual requests:', error);
      // Fallback to individual requests if bulk fails
      const marketDataPromises = symbols.map(symbol => 
        this.getMarketData(symbol).catch(err => {
          console.error(`Failed to get market data for ${symbol}:`, err);
          return null;
        })
      );
      const results = await Promise.all(marketDataPromises);
      return results.filter(result => result !== null) as InsertMarketData[];
    }
  }
}

export const kucoinAPI = new KuCoinAPI();