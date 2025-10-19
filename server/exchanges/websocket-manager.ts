import { EventEmitter } from 'events';
import { BinanceWebSocket, type BinanceTickerData } from './binance-websocket';
import { KuCoinWebSocket, type KuCoinTickerData } from './kucoin-websocket';
import { BybitWebSocket, type BybitTickerData } from './bybit-websocket';
import { storage } from '../storage';
import type { InsertMarketData } from '@shared/schema';

type TickerData = BinanceTickerData | KuCoinTickerData | BybitTickerData;

export class WebSocketManager extends EventEmitter {
  private binanceWS: Map<number, BinanceWebSocket> = new Map();
  private kucoinWS: Map<number, KuCoinWebSocket> = new Map();
  private bybitWS: Map<number, BybitWebSocket> = new Map();
  private balanceSyncInterval: NodeJS.Timeout | null = null;

  async initializeExchangeWebSockets(): Promise<void> {
    console.log('Initializing exchange WebSocket connections...');
    
    const exchanges = await storage.getExchanges();
    const connectedExchanges = exchanges.filter(ex => ex.isConnected && ex.apiKey && ex.apiSecret);

    for (const exchange of connectedExchanges) {
      try {
        await this.connectExchangeWebSocket(exchange.id, exchange.name, {
          apiKey: exchange.apiKey!,
          apiSecret: exchange.apiSecret!,
          passphrase: exchange.name === 'kucoin' ? process.env.KUCOIN_PASSPHRASE : undefined,
          sandboxMode: exchange.sandboxMode || false,
        });
      } catch (error) {
        console.error(`Failed to initialize WebSocket for ${exchange.displayName}:`, error);
      }
    }

    // Start periodic balance sync
    this.startBalanceSync();
  }

  async connectExchangeWebSocket(exchangeId: number, exchangeName: string, credentials: {
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
    sandboxMode?: boolean;
  }): Promise<void> {
    console.log(`Connecting WebSocket for ${exchangeName} (ID: ${exchangeId})`);

    switch (exchangeName.toLowerCase()) {
      case 'binance': {
        const ws = new BinanceWebSocket(credentials.sandboxMode);
        
        ws.on('connected', () => {
          console.log(`Binance WebSocket connected for exchange ${exchangeId}`);
          this.emit('exchange_connected', { exchangeId, exchangeName: 'binance' });
        });

        ws.on('ticker', (data: BinanceTickerData) => {
          this.handleTickerUpdate(exchangeId, 'binance', data);
        });

        ws.on('error', (error) => {
          console.error(`Binance WebSocket error for exchange ${exchangeId}:`, error);
        });

        ws.on('disconnected', () => {
          console.log(`Binance WebSocket disconnected for exchange ${exchangeId}`);
          this.emit('exchange_disconnected', { exchangeId, exchangeName: 'binance' });
        });

        ws.connect();
        this.binanceWS.set(exchangeId, ws);
        
        // Subscribe to default symbols
        await this.subscribeToSymbols(exchangeId, 'binance');
        break;
      }

      case 'kucoin': {
        if (!credentials.passphrase) {
          throw new Error('KuCoin requires a passphrase');
        }

        const ws = new KuCoinWebSocket(
          credentials.apiKey,
          credentials.apiSecret,
          credentials.passphrase,
          credentials.sandboxMode
        );
        
        ws.on('connected', () => {
          console.log(`KuCoin WebSocket connected for exchange ${exchangeId}`);
          this.emit('exchange_connected', { exchangeId, exchangeName: 'kucoin' });
        });

        ws.on('ticker', (data: KuCoinTickerData) => {
          this.handleTickerUpdate(exchangeId, 'kucoin', data);
        });

        ws.on('error', (error) => {
          console.error(`KuCoin WebSocket error for exchange ${exchangeId}:`, error);
        });

        ws.on('disconnected', () => {
          console.log(`KuCoin WebSocket disconnected for exchange ${exchangeId}`);
          this.emit('exchange_disconnected', { exchangeId, exchangeName: 'kucoin' });
        });

        await ws.connect();
        this.kucoinWS.set(exchangeId, ws);
        
        // Subscribe to default symbols
        await this.subscribeToSymbols(exchangeId, 'kucoin');
        break;
      }

      case 'bybit': {
        const ws = new BybitWebSocket(credentials.sandboxMode);
        
        ws.on('connected', () => {
          console.log(`Bybit WebSocket connected for exchange ${exchangeId}`);
          this.emit('exchange_connected', { exchangeId, exchangeName: 'bybit' });
        });

        ws.on('ticker', (data: BybitTickerData) => {
          this.handleTickerUpdate(exchangeId, 'bybit', data);
        });

        ws.on('error', (error) => {
          console.error(`Bybit WebSocket error for exchange ${exchangeId}:`, error);
        });

        ws.on('disconnected', () => {
          console.log(`Bybit WebSocket disconnected for exchange ${exchangeId}`);
          this.emit('exchange_disconnected', { exchangeId, exchangeName: 'bybit' });
        });

        ws.connect();
        this.bybitWS.set(exchangeId, ws);
        
        // Subscribe to default symbols
        await this.subscribeToSymbols(exchangeId, 'bybit');
        break;
      }

      default:
        console.warn(`WebSocket not implemented for exchange: ${exchangeName}`);
    }
  }

  private async subscribeToSymbols(exchangeId: number, exchangeName: string): Promise<void> {
    // Get active positions to subscribe to their symbols
    const positions = await storage.getPositionsByExchange(exchangeId);
    const symbols = new Set<string>();

    // Add position symbols
    positions.forEach(pos => symbols.add(pos.symbol));

    // Add default major pairs if no positions
    if (symbols.size === 0) {
      ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'XRP/USDT'].forEach(s => symbols.add(s));
    }

    const symbolsArray = Array.from(symbols);
    console.log(`Subscribing ${exchangeName} to symbols:`, symbolsArray);

    switch (exchangeName.toLowerCase()) {
      case 'binance':
        this.binanceWS.get(exchangeId)?.subscribe(symbolsArray);
        break;
      case 'kucoin':
        this.kucoinWS.get(exchangeId)?.subscribe(symbolsArray);
        break;
      case 'bybit':
        this.bybitWS.get(exchangeId)?.subscribe(symbolsArray);
        break;
    }
  }

  private async handleTickerUpdate(exchangeId: number, exchangeName: string, data: TickerData): Promise<void> {
    try {
      // Store exchange-specific price
      await storage.upsertExchangePrice({
        exchangeId,
        symbol: data.symbol,
        price: data.price,
        volume24h: data.volume,
      });

      // Update aggregated market data
      const [baseAsset, quoteAsset] = data.symbol.split('/');
      const marketData: InsertMarketData = {
        symbol: data.symbol,
        baseAsset,
        quoteAsset,
        price: data.price,
        change24h: data.priceChange,
        changePercent24h: data.priceChangePercent,
        volume24h: data.volume,
      };

      await storage.upsertMarketData(marketData);

      // Emit update event
      this.emit('ticker_update', {
        exchangeId,
        exchangeName,
        symbol: data.symbol,
        price: data.price,
      });

    } catch (error) {
      console.error(`Error handling ticker update from ${exchangeName}:`, error);
    }
  }

  async disconnectExchange(exchangeId: number, exchangeName: string): Promise<void> {
    console.log(`Disconnecting WebSocket for ${exchangeName} (ID: ${exchangeId})`);

    switch (exchangeName.toLowerCase()) {
      case 'binance':
        this.binanceWS.get(exchangeId)?.disconnect();
        this.binanceWS.delete(exchangeId);
        break;
      case 'kucoin':
        this.kucoinWS.get(exchangeId)?.disconnect();
        this.kucoinWS.delete(exchangeId);
        break;
      case 'bybit':
        this.bybitWS.get(exchangeId)?.disconnect();
        this.bybitWS.delete(exchangeId);
        break;
    }

    // Clear exchange prices
    await storage.deleteExchangePricesForExchange(exchangeId);
  }

  async updateSubscriptions(exchangeId: number, exchangeName: string, symbols: string[]): Promise<void> {
    console.log(`Updating subscriptions for ${exchangeName} (ID: ${exchangeId})`, symbols);

    switch (exchangeName.toLowerCase()) {
      case 'binance': {
        const ws = this.binanceWS.get(exchangeId);
        if (ws) {
          const currentSymbols = ws.getSubscribedSymbols();
          const toUnsubscribe = currentSymbols.filter(s => !symbols.includes(s));
          const toSubscribe = symbols.filter(s => !currentSymbols.includes(s));

          if (toUnsubscribe.length > 0) ws.unsubscribe(toUnsubscribe);
          if (toSubscribe.length > 0) ws.subscribe(toSubscribe);
        }
        break;
      }
      case 'kucoin': {
        const ws = this.kucoinWS.get(exchangeId);
        if (ws) {
          const currentSymbols = ws.getSubscribedSymbols();
          const toUnsubscribe = currentSymbols.filter(s => !symbols.includes(s));
          const toSubscribe = symbols.filter(s => !currentSymbols.includes(s));

          if (toUnsubscribe.length > 0) ws.unsubscribe(toUnsubscribe);
          if (toSubscribe.length > 0) ws.subscribe(toSubscribe);
        }
        break;
      }
      case 'bybit': {
        const ws = this.bybitWS.get(exchangeId);
        if (ws) {
          const currentSymbols = ws.getSubscribedSymbols();
          const toUnsubscribe = currentSymbols.filter(s => !symbols.includes(s));
          const toSubscribe = symbols.filter(s => !currentSymbols.includes(s));

          if (toUnsubscribe.length > 0) ws.unsubscribe(toUnsubscribe);
          if (toSubscribe.length > 0) ws.subscribe(toSubscribe);
        }
        break;
      }
    }
  }

  private startBalanceSync(): void {
    // Sync balances every 60 seconds
    this.balanceSyncInterval = setInterval(async () => {
      try {
        console.log('Auto-syncing exchange balances...');
        const exchanges = await storage.getExchanges();
        
        for (const exchange of exchanges.filter(ex => ex.isConnected)) {
          this.emit('sync_balances', { exchangeId: exchange.id });
        }
      } catch (error) {
        console.error('Balance sync error:', error);
      }
    }, 60000); // Every 60 seconds
  }

  disconnectAll(): void {
    console.log('Disconnecting all exchange WebSockets...');

    if (this.balanceSyncInterval) {
      clearInterval(this.balanceSyncInterval);
      this.balanceSyncInterval = null;
    }

    this.binanceWS.forEach((ws) => ws.disconnect());
    this.kucoinWS.forEach((ws) => ws.disconnect());
    this.bybitWS.forEach((ws) => ws.disconnect());

    this.binanceWS.clear();
    this.kucoinWS.clear();
    this.bybitWS.clear();
  }

  getConnectionStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    
    this.binanceWS.forEach((ws, id) => {
      status.set(`binance-${id}`, ws.isConnected());
    });
    
    this.kucoinWS.forEach((ws, id) => {
      status.set(`kucoin-${id}`, ws.isConnected());
    });
    
    this.bybitWS.forEach((ws, id) => {
      status.set(`bybit-${id}`, ws.isConnected());
    });

    return status;
  }
}

export const websocketManager = new WebSocketManager();
