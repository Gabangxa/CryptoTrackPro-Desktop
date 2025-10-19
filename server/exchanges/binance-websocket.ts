import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface BinanceTickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  lastUpdateTime: number;
}

export class BinanceWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private baseUrl: string;

  constructor(private sandboxMode = false) {
    super();
    this.baseUrl = sandboxMode 
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Binance WebSocket already connected');
      return;
    }

    this.isManualClose = false;
    console.log(`Connecting to Binance WebSocket: ${this.baseUrl}`);

    this.ws = new WebSocket(this.baseUrl);

    this.ws.on('open', () => {
      console.log('Binance WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // Resubscribe to all symbols
      if (this.subscribedSymbols.size > 0) {
        this.resubscribeAll();
      }

      // Start heartbeat
      this.startHeartbeat();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing Binance WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('Binance WebSocket disconnected');
      this.stopHeartbeat();
      this.emit('disconnected');
      
      if (!this.isManualClose) {
        this.reconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('Binance WebSocket error:', error);
      this.emit('error', error);
    });

    this.ws.on('ping', () => {
      this.ws?.pong();
    });
  }

  private handleMessage(message: any): void {
    // Handle different message types
    if (message.e === '24hrTicker') {
      // Individual ticker update
      const tickerData: BinanceTickerData = {
        symbol: this.formatSymbol(message.s),
        price: message.c,
        priceChange: message.p,
        priceChangePercent: message.P,
        volume: message.v,
        lastUpdateTime: message.E,
      };
      this.emit('ticker', tickerData);
    } else if (Array.isArray(message)) {
      // Multiple ticker updates
      message.forEach(ticker => {
        if (ticker.e === '24hrTicker') {
          const tickerData: BinanceTickerData = {
            symbol: this.formatSymbol(ticker.s),
            price: ticker.c,
            priceChange: ticker.p,
            priceChangePercent: ticker.P,
            volume: ticker.v,
            lastUpdateTime: ticker.E,
          };
          this.emit('ticker', tickerData);
        }
      });
    }
  }

  subscribe(symbols: string[]): void {
    if (!symbols || symbols.length === 0) return;

    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));

    if (this.ws?.readyState === WebSocket.OPEN) {
      const streams = symbols.map(symbol => {
        const binanceSymbol = symbol.replace('/', '').toLowerCase();
        return `${binanceSymbol}@ticker`;
      });

      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: streams,
        id: Date.now(),
      };

      console.log('Binance WebSocket subscribing to:', streams);
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  unsubscribe(symbols: string[]): void {
    if (!symbols || symbols.length === 0) return;

    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));

    if (this.ws?.readyState === WebSocket.OPEN) {
      const streams = symbols.map(symbol => {
        const binanceSymbol = symbol.replace('/', '').toLowerCase();
        return `${binanceSymbol}@ticker`;
      });

      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: streams,
        id: Date.now(),
      };

      console.log('Binance WebSocket unsubscribing from:', streams);
      this.ws.send(JSON.stringify(unsubscribeMessage));
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
      console.error('Binance WebSocket max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Binance WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private formatSymbol(binanceSymbol: string): string {
    // Convert BTCUSDT to BTC/USDT
    // Assuming quote asset is always USDT, BTC, ETH, BNB, or BUSD
    const quoteAssets = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'USDC'];
    for (const quote of quoteAssets) {
      if (binanceSymbol.endsWith(quote)) {
        const base = binanceSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    return binanceSymbol;
  }

  disconnect(): void {
    console.log('Binance WebSocket disconnecting...');
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
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
