import { BinanceAPI } from './exchanges/binance-api';
import { BybitAPI } from './exchanges/bybit-api';
import { KuCoinAPI } from './exchanges/kucoin-api';
import { websocketManager } from './exchanges/websocket-manager';
import { storage } from './storage';
import type { Exchange, InsertMarketData, InsertExchangePrice } from '@shared/schema';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For KuCoin
  sandboxMode?: boolean;
}

export class APIManager {
  private binanceInstances: Map<number, BinanceAPI> = new Map();
  private bybitInstances: Map<number, BybitAPI> = new Map();
  private kucoinInstances: Map<number, KuCoinAPI> = new Map();

  async updateExchangeCredentials(exchangeId: number, credentials: ExchangeCredentials): Promise<boolean> {
    const exchange = await storage.getExchange(exchangeId);
    if (!exchange) {
      console.error(`Exchange with ID ${exchangeId} not found`);
      return false;
    }

    console.log(`Updating credentials for ${exchange.name} (ID: ${exchangeId})`);

    // Update exchange in storage
    await storage.updateExchange(exchangeId, {
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      sandboxMode: credentials.sandboxMode ?? false,
      isConnected: true,
    });

    // Create new API instance with credentials
    switch (exchange.name.toLowerCase()) {
      case 'binance':
        this.binanceInstances.set(exchangeId, new BinanceAPI(credentials.apiKey, credentials.apiSecret, credentials.sandboxMode));
        console.log(`Binance API initialized for exchange ${exchangeId}, sandbox: ${credentials.sandboxMode}`);
        break;
      case 'bybit':
        this.bybitInstances.set(exchangeId, new BybitAPI(credentials.apiKey, credentials.apiSecret, credentials.sandboxMode));
        console.log(`Bybit API initialized for exchange ${exchangeId}, sandbox: ${credentials.sandboxMode}`);
        break;
      case 'kucoin':
        if (!credentials.passphrase) {
          console.error('KuCoin requires a passphrase');
          throw new Error('KuCoin requires a passphrase');
        }
        const kucoinAPI = new KuCoinAPI(credentials.apiKey, credentials.apiSecret, credentials.passphrase, credentials.sandboxMode);
        this.kucoinInstances.set(exchangeId, kucoinAPI);
        console.log(`KuCoin API initialized for exchange ${exchangeId}, sandbox: ${credentials.sandboxMode}`);
        break;
      default:
        console.error(`Unsupported exchange: ${exchange.name}`);
        return false;
    }

    // Connect WebSocket for real-time updates
    try {
      await websocketManager.connectExchangeWebSocket(exchangeId, exchange.name, credentials);
      console.log(`WebSocket connected for ${exchange.name} (ID: ${exchangeId})`);
    } catch (error) {
      console.error(`Failed to connect WebSocket for ${exchange.name}:`, error);
      // Continue anyway - REST API still works
    }

    console.log(`Successfully updated credentials for ${exchange.name}`);
    return true;
  }

  async removeExchangeCredentials(exchangeId: number): Promise<boolean> {
    const exchange = await storage.getExchange(exchangeId);
    
    await storage.updateExchange(exchangeId, {
      apiKey: null,
      apiSecret: null,
      isConnected: false,
    });

    this.binanceInstances.delete(exchangeId);
    this.bybitInstances.delete(exchangeId);
    this.kucoinInstances.delete(exchangeId);
    
    // Disconnect WebSocket
    if (exchange) {
      try {
        await websocketManager.disconnectExchange(exchangeId, exchange.name);
        console.log(`WebSocket disconnected for ${exchange.name} (ID: ${exchangeId})`);
      } catch (error) {
        console.error(`Failed to disconnect WebSocket for ${exchange.name}:`, error);
      }
    }
    
    // Clear exchange prices
    await storage.deleteExchangePricesForExchange(exchangeId);
    
    return true;
  }

  async fetchAllMarketData(symbols: string[]): Promise<void> {
    const exchanges = await storage.getExchanges();
    const connectedExchanges = exchanges.filter(e => e.isConnected && e.apiKey && e.apiSecret);

    for (const exchange of connectedExchanges) {
      try {
        await this.fetchMarketDataForExchange(exchange, symbols);
      } catch (error) {
        console.error(`Error fetching data from ${exchange.displayName}:`, error);
      }
    }

    // Update aggregated market data with best prices
    await this.updateAggregatedMarketData(symbols);
  }

  private async fetchMarketDataForExchange(exchange: Exchange, symbols: string[]): Promise<void> {
    let marketDataArray: InsertMarketData[] = [];

    switch (exchange.name.toLowerCase()) {
      case 'binance':
        const binanceAPI = this.binanceInstances.get(exchange.id);
        if (binanceAPI) {
          marketDataArray = await binanceAPI.getMultipleMarketData(symbols);
        }
        break;
      case 'bybit':
        const bybitAPI = this.bybitInstances.get(exchange.id);
        if (bybitAPI) {
          marketDataArray = await bybitAPI.getMultipleMarketData(symbols);
        }
        break;
      case 'kucoin':
        const kucoinAPI = this.kucoinInstances.get(exchange.id);
        if (kucoinAPI) {
          marketDataArray = await kucoinAPI.getMultipleMarketData(symbols);
        }
        break;
    }

    // Store exchange-specific prices
    for (const marketData of marketDataArray) {
      await storage.upsertExchangePrice({
        exchangeId: exchange.id,
        symbol: marketData.symbol,
        price: marketData.price,
        volume24h: marketData.volume24h || null,
      });
    }
  }

  private async updateAggregatedMarketData(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      const exchangePrices = await storage.getExchangePricesBySymbol(symbol);
      
      if (exchangePrices.length > 0) {
        // Calculate best price and aggregated data
        const sortedPrices = exchangePrices.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        const bestPrice = sortedPrices[0];
        
        // Calculate average volume
        const totalVolume = exchangePrices.reduce((sum, ep) => {
          return sum + (parseFloat(ep.volume24h || "0"));
        }, 0);

        // Get existing market data or create new
        const existing = await storage.getMarketDataBySymbol(symbol);
        const [baseAsset, quoteAsset] = symbol.split('/');
        
        const aggregatedData: InsertMarketData = {
          symbol,
          baseAsset,
          quoteAsset,
          price: bestPrice.price,
          volume24h: totalVolume.toString(),
          change24h: existing?.change24h || null,
          changePercent24h: existing?.changePercent24h || null,
        };

        await storage.upsertMarketData(aggregatedData);
      }
    }
  }

  async testExchangeConnection(exchangeId: number): Promise<boolean> {
    const exchange = await storage.getExchange(exchangeId);
    if (!exchange || !exchange.isConnected) return false;

    try {
      switch (exchange.name.toLowerCase()) {
        case 'binance':
          const binanceAPI = this.binanceInstances.get(exchangeId);
          if (binanceAPI) {
            await binanceAPI.getTickerPrice('BTCUSDT');
            return true;
          }
          break;
        case 'bybit':
          const bybitAPI = this.bybitInstances.get(exchangeId);
          if (bybitAPI) {
            await bybitAPI.getTickerPrice('BTCUSDT');
            return true;
          }
          break;
        case 'kucoin':
          const kucoinAPI = this.kucoinInstances.get(exchangeId);
          if (kucoinAPI) {
            await kucoinAPI.getTickerPrice('BTC-USDT');
            return true;
          }
          break;
      }
    } catch (error) {
      console.error(`Connection test failed for ${exchange.displayName}:`, error);
    }

    return false;
  }

  async getExchangeBalances(exchangeId: number): Promise<any[]> {
    const exchange = await storage.getExchange(exchangeId);
    if (!exchange || !exchange.isConnected) {
      console.log(`Exchange ${exchangeId} not found or not connected`);
      return [];
    }

    console.log(`Fetching balances for ${exchange.displayName} (ID: ${exchangeId})`);

    try {
      switch (exchange.name.toLowerCase()) {
        case 'binance':
          const binanceAPI = this.binanceInstances.get(exchangeId);
          if (binanceAPI) {
            console.log(`Calling Binance getSpotBalances for exchange ${exchangeId}`);
            const balances = await binanceAPI.getSpotBalances();
            const formatted = this.formatSpotBalances(balances, 'binance');
            console.log(`Binance returned ${formatted.length} spot balances`);
            return formatted;
          } else {
            console.error(`Binance API instance not found for exchange ${exchangeId}`);
          }
          break;
        case 'bybit':
          const bybitAPI = this.bybitInstances.get(exchangeId);
          if (bybitAPI) {
            console.log(`Calling Bybit getAccountBalance for exchange ${exchangeId}`);
            const account = await bybitAPI.getAccountBalance();
            const formatted = this.formatSpotBalances(account, 'bybit');
            console.log(`Bybit returned ${formatted.length} spot balances`);
            return formatted;
          } else {
            console.error(`Bybit API instance not found for exchange ${exchangeId}`);
          }
          break;
        case 'kucoin':
          const kucoinAPI = this.kucoinInstances.get(exchangeId);
          if (kucoinAPI) {
            console.log(`Calling KuCoin getSpotBalances for exchange ${exchangeId}`);
            const balances = await kucoinAPI.getSpotBalances();
            const formatted = this.formatSpotBalances(balances, 'kucoin');
            console.log(`KuCoin returned ${formatted.length} spot balances`);
            return formatted;
          } else {
            console.error(`KuCoin API instance not found for exchange ${exchangeId}`);
          }
          break;
      }
    } catch (error) {
      console.error(`Error fetching balances from ${exchange.displayName} (ID: ${exchangeId}):`, error);
    }

    return [];
  }

  private formatSpotBalances(balances: any, exchangeName: string): any[] {
    if (!balances) return [];

    switch (exchangeName) {
      case 'binance':
        return balances
          .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
          .map((balance: any) => ({
            asset: balance.asset,
            free: balance.free,
            locked: balance.locked,
            total: (parseFloat(balance.free) + parseFloat(balance.locked)).toString(),
            exchange: 'binance'
          }));

      case 'bybit':
        if (balances.result && balances.result.list) {
          return balances.result.list
            .filter((account: any) => account.accountType === 'SPOT')
            .flatMap((account: any) => 
              account.coin.filter((coin: any) => parseFloat(coin.walletBalance) > 0)
                .map((coin: any) => ({
                  asset: coin.coin,
                  free: coin.availableToWithdraw,
                  locked: (parseFloat(coin.walletBalance) - parseFloat(coin.availableToWithdraw)).toString(),
                  total: coin.walletBalance,
                  exchange: 'bybit'
                }))
            );
        }
        return [];

      case 'kucoin':
        return balances
          .filter((balance: any) => parseFloat(balance.available) > 0 || parseFloat(balance.holds) > 0)
          .map((balance: any) => ({
            asset: balance.currency,
            free: balance.available,
            locked: balance.holds,
            total: (parseFloat(balance.available) + parseFloat(balance.holds)).toString(),
            exchange: 'kucoin'
          }));

      default:
        return [];
    }
  }

  async getExchangePositions(exchangeId: number): Promise<any[]> {
    const exchange = await storage.getExchange(exchangeId);
    if (!exchange || !exchange.isConnected) return [];

    try {
      switch (exchange.name.toLowerCase()) {
        case 'binance':
          const binanceAPI = this.binanceInstances.get(exchangeId);
          if (binanceAPI) {
            return await binanceAPI.getFuturesPositions();
          }
          break;
        case 'bybit':
          const bybitAPI = this.bybitInstances.get(exchangeId);
          if (bybitAPI) {
            return await bybitAPI.getPositions();
          }
          break;
        case 'kucoin':
          const kucoinAPI = this.kucoinInstances.get(exchangeId);
          if (kucoinAPI) {
            return await kucoinAPI.getFuturesPositions();
          }
          break;
      }
    } catch (error) {
      console.error(`Error fetching positions from ${exchange.displayName}:`, error);
    }

    return [];
  }

  // Initialize with any existing credentials
  async initialize(): Promise<void> {
    const exchanges = await storage.getExchanges();
    
    for (const exchange of exchanges) {
      if (exchange.isConnected || exchange.name.toLowerCase() === 'kucoin') {
        try {
          let credentials: ExchangeCredentials | null = null;

          // For KuCoin, check environment variables first
          if (exchange.name.toLowerCase() === 'kucoin') {
            const apiKey = process.env.KUCOIN_API_KEY;
            const apiSecret = process.env.KUCOIN_API_SECRET;
            const passphrase = process.env.KUCOIN_PASSPHRASE;

            if (apiKey && apiSecret && passphrase) {
              credentials = {
                apiKey,
                apiSecret,
                passphrase,
                sandboxMode: false, // Always use production for KuCoin
              };
              
              // Update exchange to be connected
              await storage.updateExchange(exchange.id, { 
                isConnected: true, 
                sandboxMode: false,
                apiKey,
                apiSecret 
              });
            }
          } else if (exchange.apiKey && exchange.apiSecret) {
            credentials = {
              apiKey: exchange.apiKey,
              apiSecret: exchange.apiSecret,
              sandboxMode: exchange.sandboxMode || false,
            };
          }

          if (credentials) {
            await this.updateExchangeCredentials(exchange.id, credentials);
            console.log(`Initialized ${exchange.displayName} API connection`);
          }
        } catch (error) {
          console.error(`Failed to initialize ${exchange.displayName}:`, error);
        }
      }
    }
  }
}

export const apiManager = new APIManager();