import crypto from 'crypto';
import type { InsertMarketData, InsertOrder } from '@shared/schema';

const BYBIT_API_BASE = 'https://api.bybit.com';
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_SECRET_KEY = process.env.BYBIT_SECRET_KEY;

export class BybitAPI {
  private createSignature(timestamp: string, params: string): string {
    const message = timestamp + BYBIT_API_KEY + '5000' + params;
    return crypto
      .createHmac('sha256', BYBIT_SECRET_KEY!)
      .update(message)
      .digest('hex');
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET', signed = false) {
    const timestamp = Date.now().toString();
    const paramString = JSON.stringify(params);
    
    let url = `${BYBIT_API_BASE}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (signed && BYBIT_API_KEY && BYBIT_SECRET_KEY) {
      const signature = this.createSignature(timestamp, paramString);
      headers['X-BAPI-API-KEY'] = BYBIT_API_KEY;
      headers['X-BAPI-SIGN'] = signature;
      headers['X-BAPI-TIMESTAMP'] = timestamp;
      headers['X-BAPI-RECV-WINDOW'] = '5000';
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
      throw new Error(`Bybit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    return data.result;
  }

  async getTickerPrice(symbol: string): Promise<any> {
    return this.makeRequest('/v5/market/tickers', { category: 'spot', symbol });
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