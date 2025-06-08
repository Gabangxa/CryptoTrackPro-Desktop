import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';

describe('API Routes Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Exchange Management', () => {
    it('GET /api/exchanges should return all exchanges', async () => {
      const response = await request(app)
        .get('/api/exchanges')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('displayName');
      expect(response.body[0]).toHaveProperty('isConnected');
    });

    it('PUT /api/exchanges/:id should update exchange credentials', async () => {
      const exchangeId = 1;
      const credentials = {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        passphrase: 'test-passphrase',
        sandboxMode: true
      };

      const response = await request(app)
        .put(`/api/exchanges/${exchangeId}`)
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('PUT /api/exchanges/:id should validate required fields', async () => {
      const exchangeId = 1;
      const invalidCredentials = {
        apiKey: 'test-key'
        // Missing apiSecret and passphrase
      };

      await request(app)
        .put(`/api/exchanges/${exchangeId}`)
        .send(invalidCredentials)
        .expect(400);
    });

    it('GET /api/exchanges/:id/test should test exchange connection', async () => {
      const exchangeId = 1;
      
      const response = await request(app)
        .get(`/api/exchanges/${exchangeId}/test`)
        .expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(typeof response.body.connected).toBe('boolean');
    });

    it('GET /api/exchanges/:id/balances should return exchange balances', async () => {
      const exchangeId = 1;
      
      const response = await request(app)
        .get(`/api/exchanges/${exchangeId}/balances`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Portfolio Analytics', () => {
    it('GET /api/portfolio/summary should return portfolio summary', async () => {
      const response = await request(app)
        .get('/api/portfolio/summary')
        .expect(200);

      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('totalPnl');
      expect(response.body).toHaveProperty('totalPnlPercent');
      expect(response.body).toHaveProperty('change24h');
      expect(response.body).toHaveProperty('change24hPercent');
      expect(response.body).toHaveProperty('activePositions');
      expect(response.body).toHaveProperty('activeAlerts');
      
      expect(typeof response.body.totalValue).toBe('string');
      expect(typeof response.body.activePositions).toBe('number');
    });

    it('GET /api/positions should return all positions', async () => {
      const response = await request(app)
        .get('/api/positions')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      if (response.body.length > 0) {
        const position = response.body[0];
        expect(position).toHaveProperty('id');
        expect(position).toHaveProperty('exchangeId');
        expect(position).toHaveProperty('symbol');
        expect(position).toHaveProperty('baseAsset');
        expect(position).toHaveProperty('quoteAsset');
        expect(position).toHaveProperty('exchange');
      }
    });
  });

  describe('Market Data', () => {
    it('GET /api/market-data should return current market data', async () => {
      const response = await request(app)
        .get('/api/market-data')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      if (response.body.length > 0) {
        const marketData = response.body[0];
        expect(marketData).toHaveProperty('symbol');
        expect(marketData).toHaveProperty('price');
        expect(marketData).toHaveProperty('change24h');
        expect(marketData).toHaveProperty('volume24h');
      }
    });

    it('GET /api/market-data/best-prices should return best prices across exchanges', async () => {
      const response = await request(app)
        .get('/api/market-data/best-prices')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      if (response.body.length > 0) {
        const bestPrice = response.body[0];
        expect(bestPrice).toHaveProperty('symbol');
        expect(bestPrice).toHaveProperty('bestPrice');
        expect(bestPrice).toHaveProperty('bestExchange');
        expect(bestPrice).toHaveProperty('exchangePrices');
      }
    });
  });

  describe('Alert Management', () => {
    it('GET /api/alerts should return all alerts', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('POST /api/alerts should create new alert', async () => {
      const newAlert = {
        type: 'price',
        targetType: 'token',
        targetId: 'BTC',
        condition: 'above',
        value: '50000',
        message: 'BTC above $50,000'
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(newAlert)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('price');
      expect(response.body.targetId).toBe('BTC');
      expect(response.body.isActive).toBe(true);
    });

    it('DELETE /api/alerts/:id should remove alert', async () => {
      // First create an alert
      const newAlert = {
        type: 'price',
        targetType: 'token',
        targetId: 'ETH',
        condition: 'below',
        value: '2000',
        message: 'ETH below $2,000'
      };

      const createResponse = await request(app)
        .post('/api/alerts')
        .send(newAlert)
        .expect(201);

      const alertId = createResponse.body.id;

      // Then delete it
      await request(app)
        .delete(`/api/alerts/${alertId}`)
        .expect(200);

      // Verify it's deleted
      const getResponse = await request(app)
        .get('/api/alerts')
        .expect(200);

      const deletedAlert = getResponse.body.find((alert: any) => alert.id === alertId);
      expect(deletedAlert).toBeUndefined();
    });
  });

  describe('Debug Endpoints', () => {
    it('GET /api/debug/exchanges should return exchange debug info', async () => {
      const response = await request(app)
        .get('/api/debug/exchanges')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      if (response.body.length > 0) {
        const debugInfo = response.body[0];
        expect(debugInfo).toHaveProperty('id');
        expect(debugInfo).toHaveProperty('name');
        expect(debugInfo).toHaveProperty('displayName');
        expect(debugInfo).toHaveProperty('isConnected');
        expect(debugInfo).toHaveProperty('hasApiKey');
        expect(debugInfo).toHaveProperty('hasApiSecret');
        expect(debugInfo).toHaveProperty('sandboxMode');
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/non-existent-route')
        .expect(404);
    });

    it('should return 400 for invalid exchange ID', async () => {
      await request(app)
        .get('/api/exchanges/invalid-id/balances')
        .expect(400);
    });

    it('should handle malformed JSON in request body', async () => {
      await request(app)
        .put('/api/exchanges/1')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});