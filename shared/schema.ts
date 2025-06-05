import { pgTable, text, serial, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exchanges = pgTable("exchanges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  isConnected: boolean("is_connected").default(false),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  sandboxMode: boolean("sandbox_mode").default(true),
  supportedAccountTypes: jsonb("supported_account_types").$type<string[]>().default(["spot", "futures", "perpetual", "margin"]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  symbol: text("symbol").notNull(), // e.g., "BTC/USDT"
  baseAsset: text("base_asset").notNull(), // e.g., "BTC"
  quoteAsset: text("quote_asset").notNull(), // e.g., "USDT"
  accountType: text("account_type").notNull(), // spot, futures, perpetual, margin
  side: text("side").notNull(), // long, short
  size: decimal("size", { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }).notNull(),
  markPrice: decimal("mark_price", { precision: 20, scale: 8 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 20, scale: 8 }),
  realizedPnl: decimal("realized_pnl", { precision: 20, scale: 8 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // price, portfolio_pnl, position_pnl, portfolio_value
  targetType: text("target_type").notNull(), // portfolio, position, token
  targetId: text("target_id"), // position ID or token symbol
  condition: text("condition").notNull(), // greater_than, less_than, change_percent
  threshold: decimal("threshold", { precision: 20, scale: 8 }).notNull(),
  currentValue: decimal("current_value", { precision: 20, scale: 8 }),
  isTriggered: boolean("is_triggered").default(false),
  isActive: boolean("is_active").default(true),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  triggeredAt: timestamp("triggered_at"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  symbol: text("symbol").notNull(),
  accountType: text("account_type").notNull(),
  side: text("side").notNull(), // buy, sell
  type: text("type").notNull(), // market, limit, stop
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }),
  status: text("status").notNull().default("pending"), // pending, filled, cancelled, failed
  externalOrderId: text("external_order_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  filledAt: timestamp("filled_at"),
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  baseAsset: text("base_asset").notNull(),
  quoteAsset: text("quote_asset").notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  change24h: decimal("change_24h", { precision: 10, scale: 4 }),
  changePercent24h: decimal("change_percent_24h", { precision: 10, scale: 4 }),
  volume24h: decimal("volume_24h", { precision: 20, scale: 8 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Insert schemas
export const insertExchangeSchema = createInsertSchema(exchanges).omit({
  id: true,
  createdAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  triggeredAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  filledAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type Exchange = typeof exchanges.$inferSelect;
export type InsertExchange = z.infer<typeof insertExchangeSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

// Additional types for API responses
export type PortfolioSummary = {
  totalValue: string;
  totalPnl: string;
  totalPnlPercent: string;
  change24h: string;
  change24hPercent: string;
  activePositions: number;
  activeAlerts: number;
  triggeredAlerts: number;
};

export type PositionWithExchange = Position & {
  exchange: Exchange;
  marketData?: MarketData;
};

export type AlertWithTarget = Alert & {
  targetName?: string;
  exchange?: Exchange;
};
