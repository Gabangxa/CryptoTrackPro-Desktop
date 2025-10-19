import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface BybitTickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  lastUpdateTime: number;
}

export class BybitWebSocket extends EventEmitter {
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
      ? 'wss://stream-testnet.bybit.com/v5/public/spot'
      : 'wss://stream.bybit.com/v5/public/spot';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Bybit WebSocket already connected');
      return;
    }

    this.isManualClose = false;
    console.log(`Connecting to Bybit WebSocket: ${this.baseUrl}`);

    this.ws = new WebSocket(this.baseUrl);

    this.ws.on('open', () => {
      console.log('Bybit WebSocket connected');
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
        console.error('Error parsing Bybit WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('Bybit WebSocket disconnected');
      this.stopHeartbeat();
      this.emit('disconnected');
      
      if (!this.isManualClose) {
        this.reconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('Bybit WebSocket error:', error);
      this.emit('error', error);
    });
  }

  private handleMessage(message: any): void {
    if (message.topic && message.topic.startsWith('tickers.')) {
      const data = message.data;
      
      if (data) {
        const tickerData: BybitTickerData = {
          symbol: this.formatSymbol(data.symbol),
          price: data.lastPrice,
          priceChange: data.price24hPcnt ? (parseFloat(data.lastPrice) * parseFloat(data.price24hPcnt)).toString() : '0',
          priceChangePercent: data.price24hPcnt || '0',
          volume: data.volume24h || '0',
          lastUpdateTime: data.ts || Date.now(),
        };
        
        this.emit('ticker', tickerData);
      }
    } else if (message.op === 'pong') {
      // Pong received
      console.log('Bybit WebSocket pong received');
    } else if (message.success === false) {
      console.error('Bybit WebSocket subscription error:', message);
    }
  }

  subscribe(symbols: string[]): void {
    if (!symbols || symbols.length === 0) return;

    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));

    if (this.ws?.readyState === WebSocket.OPEN) {
      const args = symbols.map(symbol => {
        const bybitSymbol = symbol.replace('/', '');
        return `tickers.${bybitSymbol}`;
      });

      const subscribeMessage = {
        op: 'subscribe',
        args: args,
      };

      console.log('Bybit WebSocket subscribing to:', args);
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  unsubscribe(symbols: string[]): void {
    if (!symbols || symbols.length === 0) return;

    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));

    if (this.ws?.readyState === WebSocket.OPEN) {
      const args = symbols.map(symbol => {
        const bybitSymbol = symbol.replace('/', '');
        return `tickers.${bybitSymbol}`;
      });

      const unsubscribeMessage = {
        op: 'unsubscribe',
        args: args,
      };

      console.log('Bybit WebSocket unsubscribing from:', args);
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
      console.error('Bybit WebSocket max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Bybit WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingMessage = {
          op: 'ping',
        };
        this.ws.send(JSON.stringify(pingMessage));
      }
    }, 20000); // Ping every 20 seconds (Bybit recommends < 30s)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private formatSymbol(bybitSymbol: string): string {
    // Convert BTCUSDT to BTC/USDT
    const quoteAssets = ['USDT', 'USDC', 'BTC', 'ETH'];
    for (const quote of quoteAssets) {
      if (bybitSymbol.endsWith(quote)) {
        const base = bybitSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    return bybitSymbol;
  }

  disconnect(): void {
    console.log('Bybit WebSocket disconnecting...');
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
