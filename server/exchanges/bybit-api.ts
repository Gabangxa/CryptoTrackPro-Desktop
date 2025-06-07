import crypto from 'crypto';
import type { InsertMarketData, InsertOrder } from '@shared/schema';

const BYBIT_API_BASE = 'https://api.bybit.com';
const BYBIT_TESTNET_BASE = 'https://api-testnet.bybit.com';

export class BybitAPI {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, secretKey?: string, sandboxMode = false) {
    this.apiKey = apiKey || process.env.BYBIT_API_KEY || '';
    this.secretKey = secretKey || process.env.BYBIT_SECRET_KEY || '';
    this.baseUrl = sandboxMode ? BYBIT_TESTNET_BASE : BYBIT_API_BASE;
  }

  private createSignature(timestamp: string, params: string): string {
    const message = timestamp + this.apiKey + '5000' + params;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex');
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET', signed = false) {
    const timestamp = Date.now().toString();
    const paramString = JSON.stringify(params);
    
    let url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (signed && this.apiKey && this.secretKey) {
      const signature = this.createSignature(timestamp, paramString);
      headers['X-BAPI-API-KEY'] = this.apiKey;
      headers['X-BAPI-SIGN'] = signature;
      headers['X-BAPI-TIMESTAMP'] = timestamp;
      headers['X-BAPI-RECV-WINDOW'] = '5000';

      console.log('Bybit API Request:', {
        endpoint,
        method,
        hasApiKey: !!this.apiKey,
        hasSecretKey: !!this.secretKey,
        timestamp
      });
    }

    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? paramString : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Bybit API Error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        body: errorBody
      });
      throw new Error(`Bybit API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    if (data.retCode !== 0) {
      console.error('Bybit API Business Error:', {
        endpoint,
        retCode: data.retCode,
        retMsg: data.retMsg
      });
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    return data.result;
  }

  async getTickerPrice(symbol: string): Promise<any> {
    // Use public endpoint for market data (no auth required)
    return this.makeRequest('/v5/market/tickers', { category: 'spot', symbol }, 'GET', false);
  }

  async getMarketData(symbol: string): Promise<InsertMarketData> {
    const ticker = await this.getTickerPrice(symbol.replace('/', ''));
    const tickerData = ticker.list[0];
    
    return {
      symbol,
      baseAsset: symbol.split('/')[0],
      quoteAsset: symbol.split('/')[1],
      price: tickerData.lastPrice,
      change24h: tickerData.price24hPcnt,
      changePercent24h: tickerData.price24hPcnt,
      volume24h: tickerData.volume24h,
    };
  }

  async getAccountBalance(): Promise<any> {
    return this.makeRequest('/v5/account/wallet-balance', { accountType: 'UNIFIED' }, 'GET', true);
  }

  async getPositions(): Promise<any[]> {
    try {
      const result = await this.makeRequest('/v5/position/list', { category: 'linear' }, 'GET', true);
      return result.list || [];
    } catch (error) {
      console.error('Error fetching Bybit positions:', error);
      return [];
    }
  }

  async placeOrder(order: InsertOrder): Promise<any> {
    const params = {
      category: order.accountType === 'spot' ? 'spot' : 'linear',
      symbol: order.symbol.replace('/', ''),
      side: order.side.charAt(0).toUpperCase() + order.side.slice(1),
      orderType: order.type.charAt(0).toUpperCase() + order.type.slice(1),
      qty: order.quantity,
    };

    if (order.type === 'Limit' && order.price) {
      (params as any).price = order.price;
    }

    return this.makeRequest('/v5/order/create', params, 'POST', true);
  }

  async getMultipleMarketData(symbols: string[]): Promise<InsertMarketData[]> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getMarketData(symbol))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<InsertMarketData> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }
}

export const bybitAPI = new BybitAPI();