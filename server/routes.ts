import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPositionSchema, insertAlertSchema, insertOrderSchema } from "@shared/schema";
import { getCryptoPrices, getMarketData } from "../client/src/lib/crypto-api";

export async function registerRoutes(app: Express): Promise<Server> {
  // Portfolio endpoints
  app.get("/api/portfolio/summary", async (req, res) => {
    try {
      const summary = await storage.getPortfolioSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio summary" });
    }
  });

  // Exchange endpoints
  app.get("/api/exchanges", async (req, res) => {
    try {
      const exchanges = await storage.getExchanges();
      res.json(exchanges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exchanges" });
    }
  });

  app.patch("/api/exchanges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateExchange(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Exchange not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update exchange" });
    }
  });

  // Position endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.post("/api/positions", async (req, res) => {
    try {
      const validatedData = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(validatedData);
      res.status(201).json(position);
    } catch (error) {
      res.status(400).json({ error: "Invalid position data" });
    }
  });

  app.patch("/api/positions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updatePosition(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Position not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update position" });
    }
  });

  app.delete("/api/positions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePosition(id);
      if (!deleted) {
        return res.status(404).json({ error: "Position not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete position" });
    }
  });

  // Alert endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/active", async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAlert(id);
      if (!deleted) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Order endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      
      // In a real implementation, this would integrate with exchange APIs
      // For now, we'll simulate order creation
      const order = await storage.createOrder({
        ...validatedData,
        status: "pending",
        externalOrderId: `sim_${Date.now()}`,
      });

      // Simulate order execution after a short delay
      setTimeout(async () => {
        await storage.updateOrder(order.id, { 
          status: "filled",
        });
        
        // Broadcast order update via WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "order_update",
              data: { ...order, status: "filled" }
            }));
          }
        });
      }, 2000);

      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  // Market data endpoints
  app.get("/api/market-data", async (req, res) => {
    try {
      const marketData = await storage.getMarketData();
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.get("/api/market-data/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      const data = await storage.getMarketDataBySymbol(symbol);
      if (!data) {
        return res.status(404).json({ error: "Market data not found" });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected', timestamp: new Date().toISOString() }
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe_market_data') {
          // Handle market data subscription
          console.log('Client subscribed to market data');
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Periodic market data updates
  setInterval(async () => {
    try {
      // Fetch fresh market data from external API
      const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'];
      
      for (const symbol of symbols) {
        try {
          const marketData = await getMarketData(symbol);
          if (marketData) {
            await storage.upsertMarketData(marketData);
          }
        } catch (error) {
          console.error(`Failed to update market data for ${symbol}:`, error);
        }
      }

      // Update position mark prices and PnL
      const positions = await storage.getPositions();
      for (const position of positions) {
        const marketData = await storage.getMarketDataBySymbol(position.symbol);
        if (marketData) {
          const markPrice = parseFloat(marketData.price);
          const entryPrice = parseFloat(position.entryPrice);
          const size = parseFloat(position.size);
          
          let unrealizedPnl = 0;
          if (position.side === 'long') {
            unrealizedPnl = (markPrice - entryPrice) * size;
          } else {
            unrealizedPnl = (entryPrice - markPrice) * size;
          }

          await storage.updatePosition(position.id, {
            markPrice: markPrice.toString(),
            unrealizedPnl: unrealizedPnl.toString(),
          });
        }
      }

      // Check and trigger alerts
      const alerts = await storage.getActiveAlerts();
      for (const alert of alerts) {
        let shouldTrigger = false;
        let currentValue = 0;

        if (alert.type === 'price' && alert.targetId) {
          const marketData = await storage.getMarketDataBySymbol(alert.targetId);
          if (marketData) {
            currentValue = parseFloat(marketData.price);
            const threshold = parseFloat(alert.threshold);
            
            if (alert.condition === 'greater_than' && currentValue > threshold) {
              shouldTrigger = true;
            } else if (alert.condition === 'less_than' && currentValue < threshold) {
              shouldTrigger = true;
            }
          }
        } else if (alert.type === 'portfolio_value') {
          const summary = await storage.getPortfolioSummary();
          currentValue = parseFloat(summary.totalValue);
          const threshold = parseFloat(alert.threshold);
          
          if (alert.condition === 'greater_than' && currentValue > threshold) {
            shouldTrigger = true;
          } else if (alert.condition === 'less_than' && currentValue < threshold) {
            shouldTrigger = true;
          }
        }

        if (shouldTrigger) {
          await storage.triggerAlert(alert.id);
          await storage.updateAlert(alert.id, { currentValue: currentValue.toString() });
        }
      }

      // Broadcast updates to all connected clients
      const summary = await storage.getPortfolioSummary();
      const updatedPositions = await storage.getPositions();
      const updatedMarketData = await storage.getMarketData();

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'market_update',
            data: {
              summary,
              positions: updatedPositions,
              marketData: updatedMarketData,
            }
          }));
        }
      });

    } catch (error) {
      console.error('Market data update error:', error);
    }
  }, 10000); // Update every 10 seconds

  return httpServer;
}
