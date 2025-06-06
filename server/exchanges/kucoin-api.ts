import crypto from 'crypto';
import { InsertMarketData, InsertOrder } from '../../shared/schema';

export class KuCoinAPI {
  private baseUrl = 'https://api.kucoin.com';
  private apiKey = process.env.KUCOIN_API_KEY || '';
  private secretKey = process.env.KUCOIN_SECRET_KEY || '';
  private passphrase = process.env.KUCOIN_PASSPHRASE || '';

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
        hasPassphrase: !!this.passphrase
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? body : undefined,
    });

    if (!response.ok) {
      throw new Error(`KuCoin API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== '200000') {
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
    const marketDataPromises = symbols.map(symbol => this.getMarketData(symbol));
    return Promise.all(marketDataPromises);
  }
}

export const kucoinAPI = new KuCoinAPI();