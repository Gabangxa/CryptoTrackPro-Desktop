import { 
  exchanges, 
  positions, 
  alerts, 
  orders, 
  marketData,
  exchangePrices,
  type Exchange, 
  type InsertExchange,
  type Position,
  type InsertPosition,
  type Alert,
  type InsertAlert,
  type Order,
  type InsertOrder,
  type MarketData,
  type InsertMarketData,
  type ExchangePrice,
  type InsertExchangePrice,
  type MarketDataWithBestPrice,
  type PortfolioSummary,
  type PositionWithExchange,
  type AlertWithTarget
} from "@shared/schema";

export interface IStorage {
  // Exchanges
  getExchanges(): Promise<Exchange[]>;
  getExchange(id: number): Promise<Exchange | undefined>;
  createExchange(exchange: InsertExchange): Promise<Exchange>;
  updateExchange(id: number, exchange: Partial<InsertExchange>): Promise<Exchange | undefined>;
  deleteExchange(id: number): Promise<boolean>;

  // Positions
  getPositions(): Promise<PositionWithExchange[]>;
  getPosition(id: number): Promise<Position | undefined>;
  getPositionsByExchange(exchangeId: number): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: number, position: Partial<InsertPosition>): Promise<Position | undefined>;
  deletePosition(id: number): Promise<boolean>;

  // Alerts
  getAlerts(): Promise<AlertWithTarget[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  getActiveAlerts(): Promise<AlertWithTarget[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  deleteAlert(id: number): Promise<boolean>;
  triggerAlert(id: number): Promise<Alert | undefined>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByExchange(exchangeId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;

  // Market Data
  getMarketData(): Promise<MarketData[]>;
  getMarketDataBySymbol(symbol: string): Promise<MarketData | undefined>;
  getMarketDataWithBestPrices(): Promise<MarketDataWithBestPrice[]>;
  upsertMarketData(data: InsertMarketData): Promise<MarketData>;
  updateMarketData(symbol: string, data: Partial<InsertMarketData>): Promise<MarketData | undefined>;

  // Exchange Prices
  getExchangePrices(): Promise<ExchangePrice[]>;
  getExchangePricesBySymbol(symbol: string): Promise<ExchangePrice[]>;
  upsertExchangePrice(data: InsertExchangePrice): Promise<ExchangePrice>;
  deleteExchangePricesForExchange(exchangeId: number): Promise<boolean>;

  // Portfolio Analytics
  getPortfolioSummary(): Promise<PortfolioSummary>;
}

export class MemStorage implements IStorage {
  private exchanges: Map<number, Exchange>;
  private positions: Map<number, Position>;
  private alerts: Map<number, Alert>;
  private orders: Map<number, Order>;
  private marketData: Map<string, MarketData>;
  private exchangePrices: Map<number, ExchangePrice>;
  private currentExchangeId: number;
  private currentPositionId: number;
  private currentAlertId: number;
  private currentOrderId: number;
  private currentExchangePriceId: number;

  constructor() {
    this.exchanges = new Map();
    this.positions = new Map();
    this.alerts = new Map();
    this.orders = new Map();
    this.marketData = new Map();
    this.currentExchangeId = 1;
    this.currentPositionId = 1;
    this.currentAlertId = 1;
    this.currentOrderId = 1;

    // Initialize with default exchanges and sample data
    this.initializeDefaultExchanges();
    this.initializeSampleData();
  }

  private async initializeDefaultExchanges() {
    const defaultExchanges: InsertExchange[] = [
      { name: "kucoin", displayName: "KuCoin", isConnected: true, sandboxMode: false, supportedAccountTypes: ["spot", "futures", "margin"] },
      { name: "binance", displayName: "Binance", isConnected: false, sandboxMode: true, supportedAccountTypes: ["spot", "futures", "margin"] },
      { name: "coinbase", displayName: "Coinbase", isConnected: false, sandboxMode: true, supportedAccountTypes: ["spot"] },
      { name: "kraken", displayName: "Kraken", isConnected: false, sandboxMode: true, supportedAccountTypes: ["spot", "futures", "margin"] },
      { name: "bybit", displayName: "Bybit", isConnected: false, sandboxMode: true, supportedAccountTypes: ["spot", "futures", "perpetual"] },
      { name: "okx", displayName: "OKX", isConnected: false, sandboxMode: true, supportedAccountTypes: ["spot", "futures", "perpetual", "margin"] },
    ];

    for (const exchange of defaultExchanges) {
      await this.createExchange(exchange);
    }
  }

  private async initializeSampleData() {
    // Add sample market data
    const sampleMarketData = [
      { symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", price: "43250.50", change24h: "1250.30", changePercent24h: "2.98", volume24h: "1234567890" },
      { symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", price: "2485.75", change24h: "-45.20", changePercent24h: "-1.79", volume24h: "987654321" },
      { symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", price: "98.42", change24h: "4.15", changePercent24h: "4.40", volume24h: "456789123" },
      { symbol: "ADA/USDT", baseAsset: "ADA", quoteAsset: "USDT", price: "0.3847", change24h: "0.0123", changePercent24h: "3.30", volume24h: "234567890" },
      { symbol: "DOT/USDT", baseAsset: "DOT", quoteAsset: "USDT", price: "6.52", change24h: "-0.18", changePercent24h: "-2.68", volume24h: "123456789" },
    ];

    for (const data of sampleMarketData) {
      await this.upsertMarketData(data);
    }

    // Add sample positions
    const samplePositions = [
      { exchangeId: 1, symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", accountType: "spot", side: "long", size: "0.5", entryPrice: "42000.00", markPrice: "43250.50", unrealizedPnl: "625.25" },
      { exchangeId: 1, symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", accountType: "futures", side: "long", size: "10", entryPrice: "2500.00", markPrice: "2485.75", unrealizedPnl: "-142.50" },
      { exchangeId: 2, symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", accountType: "spot", side: "long", size: "100", entryPrice: "95.00", markPrice: "98.42", unrealizedPnl: "342.00" },
      { exchangeId: 3, symbol: "ADA/USDT", baseAsset: "ADA", quoteAsset: "USDT", accountType: "margin", side: "long", size: "5000", entryPrice: "0.3700", markPrice: "0.3847", unrealizedPnl: "73.50" },
    ];

    for (const position of samplePositions) {
      await this.createPosition(position);
    }

    // Add sample alerts
    const sampleAlerts = [
      { type: "price", targetType: "token", targetId: "BTC/USDT", condition: "greater_than", threshold: "45000", description: "BTC price alert - above $45,000" },
      { type: "price", targetType: "token", targetId: "ETH/USDT", condition: "less_than", threshold: "2400", description: "ETH price alert - below $2,400" },
      { type: "portfolio_value", targetType: "portfolio", condition: "greater_than", threshold: "50000", description: "Portfolio value alert - above $50,000" },
    ];

    for (const alert of sampleAlerts) {
      await this.createAlert(alert);
    }
  }

  // Exchanges
  async getExchanges(): Promise<Exchange[]> {
    return Array.from(this.exchanges.values());
  }

  async getExchange(id: number): Promise<Exchange | undefined> {
    return this.exchanges.get(id);
  }

  async createExchange(insertExchange: InsertExchange): Promise<Exchange> {
    const id = this.currentExchangeId++;
    const exchange: Exchange = {
      ...insertExchange,
      id,
      createdAt: new Date(),
      isConnected: insertExchange.isConnected ?? false,
      apiKey: insertExchange.apiKey ?? null,
      apiSecret: insertExchange.apiSecret ?? null,
      sandboxMode: insertExchange.sandboxMode ?? true,
      supportedAccountTypes: Array.isArray(insertExchange.supportedAccountTypes) ? insertExchange.supportedAccountTypes : ["spot"],
    };
    this.exchanges.set(id, exchange);
    return exchange;
  }

  async updateExchange(id: number, update: Partial<InsertExchange>): Promise<Exchange | undefined> {
    const exchange = this.exchanges.get(id);
    if (!exchange) return undefined;

    const updated = { ...exchange, ...update };
    this.exchanges.set(id, updated);
    return updated;
  }

  async deleteExchange(id: number): Promise<boolean> {
    return this.exchanges.delete(id);
  }

  // Positions
  async getPositions(): Promise<PositionWithExchange[]> {
    const positions = Array.from(this.positions.values()).filter(p => p.isActive);
    const result: PositionWithExchange[] = [];

    for (const position of positions) {
      const exchange = this.exchanges.get(position.exchangeId);
      const marketData = this.marketData.get(position.symbol);
      if (exchange) {
        result.push({
          ...position,
          exchange,
          marketData,
        });
      }
    }

    return result;
  }

  async getPosition(id: number): Promise<Position | undefined> {
    return this.positions.get(id);
  }

  async getPositionsByExchange(exchangeId: number): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(p => p.exchangeId === exchangeId && p.isActive);
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = this.currentPositionId++;
    const position: Position = {
      ...insertPosition,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      markPrice: insertPosition.markPrice ?? null,
      unrealizedPnl: insertPosition.unrealizedPnl ?? null,
      realizedPnl: insertPosition.realizedPnl ?? "0",
      isActive: insertPosition.isActive ?? true,
    };
    this.positions.set(id, position);
    return position;
  }

  async updatePosition(id: number, update: Partial<InsertPosition>): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;

    const updated = { ...position, ...update, updatedAt: new Date() };
    this.positions.set(id, updated);
    return updated;
  }

  async deletePosition(id: number): Promise<boolean> {
    const position = this.positions.get(id);
    if (!position) return false;

    const updated = { ...position, isActive: false, updatedAt: new Date() };
    this.positions.set(id, updated);
    return true;
  }

  // Alerts
  async getAlerts(): Promise<AlertWithTarget[]> {
    const alerts = Array.from(this.alerts.values()).filter(a => a.isActive);
    return this.enrichAlertsWithTargetInfo(alerts);
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async getActiveAlerts(): Promise<AlertWithTarget[]> {
    const alerts = Array.from(this.alerts.values()).filter(a => a.isActive && !a.isTriggered);
    return this.enrichAlertsWithTargetInfo(alerts);
  }

  private async enrichAlertsWithTargetInfo(alerts: Alert[]): Promise<AlertWithTarget[]> {
    return alerts.map(alert => {
      let targetName: string | undefined = alert.targetId || undefined;
      let exchange: Exchange | undefined;

      if (alert.targetType === "position" && alert.targetId) {
        const position = this.positions.get(parseInt(alert.targetId));
        if (position) {
          targetName = position.symbol;
          exchange = this.exchanges.get(position.exchangeId);
        }
      }

      return {
        ...alert,
        targetName,
        exchange,
      };
    });
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const alert: Alert = {
      ...insertAlert,
      id,
      createdAt: new Date(),
      triggeredAt: null,
      targetId: insertAlert.targetId ?? null,
      currentValue: insertAlert.currentValue ?? null,
      isTriggered: insertAlert.isTriggered ?? false,
      isActive: insertAlert.isActive ?? true,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async updateAlert(id: number, update: Partial<InsertAlert>): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const updated = { ...alert, ...update };
    this.alerts.set(id, updated);
    return updated;
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }

  async triggerAlert(id: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const updated = { ...alert, isTriggered: true, triggeredAt: new Date() };
    this.alerts.set(id, updated);
    return updated;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByExchange(exchangeId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.exchangeId === exchangeId);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: new Date(),
      filledAt: null,
      price: insertOrder.price ?? null,
      status: insertOrder.status ?? "pending",
      externalOrderId: insertOrder.externalOrderId ?? null,
      errorMessage: insertOrder.errorMessage ?? null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: number, update: Partial<InsertOrder>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updated = { ...order, ...update };
    if (update.status === "filled") {
      updated.filledAt = new Date();
    }
    this.orders.set(id, updated);
    return updated;
  }

  // Market Data
  async getMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  async getMarketDataBySymbol(symbol: string): Promise<MarketData | undefined> {
    return this.marketData.get(symbol);
  }

  async upsertMarketData(data: InsertMarketData): Promise<MarketData> {
    const existing = this.marketData.get(data.symbol);
    const marketData: MarketData = {
      ...data,
      id: existing?.id || Math.floor(Math.random() * 10000),
      lastUpdated: new Date(),
      change24h: data.change24h ?? null,
      changePercent24h: data.changePercent24h ?? null,
      volume24h: data.volume24h ?? null,
    };
    this.marketData.set(data.symbol, marketData);
    return marketData;
  }

  async updateMarketData(symbol: string, update: Partial<InsertMarketData>): Promise<MarketData | undefined> {
    const data = this.marketData.get(symbol);
    if (!data) return undefined;

    const updated = { ...data, ...update, lastUpdated: new Date() };
    this.marketData.set(symbol, updated);
    return updated;
  }

  // Portfolio Analytics
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const positions = await this.getPositions();
    
    let totalValue = 0;
    let totalPnl = 0;
    let totalInvested = 0;

    for (const position of positions) {
      const size = parseFloat(position.size);
      const markPrice = parseFloat(position.markPrice || position.entryPrice);
      const entryPrice = parseFloat(position.entryPrice);
      
      const positionValue = size * markPrice;
      const positionCost = size * entryPrice;
      const positionPnl = parseFloat(position.unrealizedPnl || "0");

      totalValue += positionValue;
      totalInvested += positionCost;
      totalPnl += positionPnl;
    }

    const totalPnlPercent = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
    
    // For change24h, we'll calculate based on position changes (simplified)
    const change24h = totalPnl * 0.1; // Simplified 24h change
    const change24hPercent = totalValue > 0 ? (change24h / totalValue) * 100 : 0;

    const activeAlerts = Array.from(this.alerts.values()).filter(a => a.isActive && !a.isTriggered);
    const triggeredAlerts = Array.from(this.alerts.values()).filter(a => a.isTriggered && a.isActive);

    return {
      totalValue: totalValue.toFixed(2),
      totalPnl: totalPnl.toFixed(2),
      totalPnlPercent: totalPnlPercent.toFixed(2),
      change24h: change24h.toFixed(2),
      change24hPercent: change24hPercent.toFixed(2),
      activePositions: positions.length,
      activeAlerts: activeAlerts.length,
      triggeredAlerts: triggeredAlerts.length,
    };
  }
}

export const storage = new MemStorage();
