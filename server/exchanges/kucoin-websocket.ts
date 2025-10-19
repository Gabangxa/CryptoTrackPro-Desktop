import WebSocket from 'ws';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface KuCoinTickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  lastUpdateTime: number;
}

interface KuCoinWSToken {
  token: string;
  instanceServers: Array<{
    endpoint: string;
    encrypt: boolean;
    protocol: string;
    pingInterval: number;
    pingTimeout: number;
  }>;
}

export class KuCoinWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private pingInterval: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private wsToken: KuCoinWSToken | null = null;
  private connectId: string = '';
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private baseUrl: string;

  constructor(apiKey: string, apiSecret: string, passphrase: string, private sandboxMode = false) {
    super();
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    this.baseUrl = sandboxMode 
      ? 'https://openapi-sandbox.kucoin.com'
      : 'https://api.kucoin.com';
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('KuCoin WebSocket already connected');
      return;
    }

    this.isManualClose = false;

    try {
      // Get WebSocket token from KuCoin API
      await this.getWSToken();

      if (!this.wsToken) {
        throw new Error('Failed to get KuCoin WebSocket token');
      }

      const server = this.wsToken.instanceServers[0];
      const wsUrl = `${server.endpoint}?token=${this.wsToken.token}&connectId=${this.connectId}`;

      console.log(`Connecting to KuCoin WebSocket: ${server.endpoint}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('KuCoin WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Resubscribe to all symbols
        if (this.subscribedSymbols.size > 0) {
          this.resubscribeAll();
        }

        // Start ping
        this.startPing(server.pingInterval);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing KuCoin WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('KuCoin WebSocket disconnected');
        this.stopPing();
        this.emit('disconnected');
        
        if (!this.isManualClose) {
          this.reconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('KuCoin WebSocket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('Error connecting to KuCoin WebSocket:', error);
      this.reconnect();
    }
  }

  private async getWSToken(): Promise<void> {
    const endpoint = '/api/v1/bullet-public';
    const timestamp = Date.now().toString();
    const method = 'POST';
    
    // Create signature
    const message = timestamp + method + endpoint;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(message).digest('base64');
    const passphraseSignature = crypto.createHmac('sha256', this.apiSecret).update(this.passphrase).digest('base64');

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'KC-API-KEY': this.apiKey,
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-PASSPHRASE': passphraseSignature,
        'KC-API-KEY-VERSION': '2',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get KuCoin WebSocket token: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== '200000') {
      throw new Error(`KuCoin API error: ${data.msg}`);
    }

    this.wsToken = data.data;
    this.connectId = Date.now().toString();
  }

  private handleMessage(message: any): void {
    if (message.type === 'message') {
      if (message.topic && message.topic.startsWith('/market/ticker:')) {
        const data = message.data;
        
        const tickerData: KuCoinTickerData = {
          symbol: data.symbol.replace('-', '/'),
          price: data.price,
          priceChange: data.changePrice,
          priceChangePercent: data.changeRate,
          volume: data.vol,
          lastUpdateTime: data.time,
        };
        
        this.emit('ticker', tickerData);
      }
    } else if (message.type === 'pong') {
      // Pong received
      console.log('KuCoin WebSocket pong received');
    } else if (message.type === 'welcome') {
      console.log('KuCoin WebSocket welcome message received');
    }
  }

  subscribe(symbols: string[]): void {
    if (!symbols || symbols.length === 0) return;

    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));

    if (this.ws?.readyState === WebSocket.OPEN) {
      // Subscribe to each symbol individually
      symbols.forEach(symbol => {
        const kucoinSymbol = symbol.replace('/', '-');
        const subscribeMessage = {
          id: Date.now(),
          type: 'subscribe',
          topic: `/market/ticker:${kucoinSymbol}`,
          privateChannel: false,
          response: true,
        };

        console.log('KuCoin WebSocket subscribing to:', kucoinSymbol);
        this.ws?.send(JSON.stringify(subscribeMessage));
      });
    }
  }

  unsubscribe(symbols: string[]): void {
    if (!symbols || symbols.length === 0) return;

    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));

    if (this.ws?.readyState === WebSocket.OPEN) {
      symbols.forEach(symbol => {
        const kucoinSymbol = symbol.replace('/', '-');
        const unsubscribeMessage = {
          id: Date.now(),
          type: 'unsubscribe',
          topic: `/market/ticker:${kucoinSymbol}`,
          privateChannel: false,
          response: true,
        };

        console.log('KuCoin WebSocket unsubscribing from:', kucoinSymbol);
        this.ws?.send(JSON.stringify(unsubscribeMessage));
      });
    }
  }

  private resubscribeAll(): void {
    if (this.subscribedSymbols.size > 0) {
      const symbols = Array.from(this.subscribedSymbols);
      this.subscribe(symbols);
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('KuCoin WebSocket max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`KuCoin WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPing(interval: number): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingMessage = {
          id: Date.now(),
          type: 'ping',
        };
        this.ws.send(JSON.stringify(pingMessage));
      }
    }, interval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect(): void {
    console.log('KuCoin WebSocket disconnecting...');
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPing();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscribedSymbols.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}
