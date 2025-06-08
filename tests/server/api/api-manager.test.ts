import { APIManager } from '../../../server/api-manager';
import { BinanceAPI } from '../../../server/exchanges/binance-api';
import { KuCoinAPI } from '../../../server/exchanges/kucoin-api';
import { BybitAPI } from '../../../server/exchanges/bybit-api';

// Mock the exchange APIs
jest.mock('../../../server/exchanges/binance-api');
jest.mock('../../../server/exchanges/kucoin-api');
jest.mock('../../../server/exchanges/bybit-api');

const MockedBinanceAPI = BinanceAPI as jest.MockedClass<typeof BinanceAPI>;
const MockedKuCoinAPI = KuCoinAPI as jest.MockedClass<typeof KuCoinAPI>;
const MockedBybitAPI = BybitAPI as jest.MockedClass<typeof BybitAPI>;

describe('APIManager', () => {
  let apiManager: APIManager;

  beforeEach(() => {
    jest.clearAllMocks();
    apiManager = new APIManager();
  });

  describe('updateExchangeCredentials', () => {
    it('should initialize Binance API with credentials', async () => {
      const credentials = {
        apiKey: 'binance-key',
        apiSecret: 'binance-secret',
        sandboxMode: true
      };

      const result = await apiManager.updateExchangeCredentials(1, credentials);

      expect(result).toBe(true);
      expect(MockedBinanceAPI).toHaveBeenCalledWith(
        'binance-key',
        'binance-secret',
        true
      );
    });

    it('should initialize KuCoin API with passphrase', async () => {
      const credentials = {
        apiKey: 'kucoin-key',
        apiSecret: 'kucoin-secret',
        passphrase: 'kucoin-passphrase',
        sandboxMode: false
      };

      const result = await apiManager.updateExchangeCredentials(1, credentials);

      expect(result).toBe(true);
      expect(MockedKuCoinAPI).toHaveBeenCalledWith(
        'kucoin-key',
        'kucoin-secret',
        'kucoin-passphrase',
        false
      );
    });

    it('should throw error for KuCoin without passphrase', async () => {
      const credentials = {
        apiKey: 'kucoin-key',
        apiSecret: 'kucoin-secret',
        sandboxMode: false
      };

      await expect(
        apiManager.updateExchangeCredentials(1, credentials)
      ).rejects.toThrow('KuCoin requires a passphrase');
    });

    it('should initialize Bybit API with credentials', async () => {
      const credentials = {
        apiKey: 'bybit-key',
        apiSecret: 'bybit-secret',
        sandboxMode: true
      };

      const result = await apiManager.updateExchangeCredentials(2, credentials);

      expect(result).toBe(true);
      expect(MockedBybitAPI).toHaveBeenCalledWith(
        'bybit-key',
        'bybit-secret',
        true
      );
    });
  });

  describe('getExchangeBalances', () => {
    it('should fetch Binance spot balances', async () => {
      const mockBalances = [
        { asset: 'BTC', free: '1.0', locked: '0.1' },
        { asset: 'ETH', free: '10.0', locked: '0.5' }
      ];

      const mockBinanceInstance = {
        getSpotBalances: jest.fn().mockResolvedValue(mockBalances)
      };

      MockedBinanceAPI.mockImplementation(() => mockBinanceInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret'
      });

      const result = await apiManager.getExchangeBalances(1);

      expect(mockBinanceInstance.getSpotBalances).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should handle KuCoin API errors gracefully', async () => {
      const mockKuCoinInstance = {
        getSpotBalances: jest.fn().mockRejectedValue(
          new Error('KuCoin API error: 401 Unauthorized')
        )
      };

      MockedKuCoinAPI.mockImplementation(() => mockKuCoinInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret',
        passphrase: 'pass'
      });

      const result = await apiManager.getExchangeBalances(1);

      expect(result).toEqual([]);
    });

    it('should format spot balances correctly', async () => {
      const mockBinanceBalances = [
        { asset: 'BTC', free: '1.5', locked: '0.1' },
        { asset: 'USDT', free: '5000', locked: '500' }
      ];

      const mockBinanceInstance = {
        getSpotBalances: jest.fn().mockResolvedValue(mockBinanceBalances)
      };

      MockedBinanceAPI.mockImplementation(() => mockBinanceInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret'
      });

      const result = await apiManager.getExchangeBalances(1);

      expect(result[0]).toMatchObject({
        asset: 'BTC',
        free: '1.5',
        locked: '0.1',
        exchange: 'binance'
      });
    });
  });

  describe('testExchangeConnection', () => {
    it('should test Binance connection successfully', async () => {
      const mockBinanceInstance = {
        getAccountInfo: jest.fn().mockResolvedValue({ canTrade: true })
      };

      MockedBinanceAPI.mockImplementation(() => mockBinanceInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret'
      });

      const result = await apiManager.testExchangeConnection(1);

      expect(result).toBe(true);
      expect(mockBinanceInstance.getAccountInfo).toHaveBeenCalled();
    });

    it('should handle connection test failures', async () => {
      const mockKuCoinInstance = {
        getAccountInfo: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      MockedKuCoinAPI.mockImplementation(() => mockKuCoinInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret',
        passphrase: 'pass'
      });

      const result = await apiManager.testExchangeConnection(1);

      expect(result).toBe(false);
    });
  });

  describe('fetchAllMarketData', () => {
    it('should fetch market data from all connected exchanges', async () => {
      const symbols = ['BTC/USDT', 'ETH/USDT'];
      const mockMarketData = [
        {
          symbol: 'BTC/USDT',
          price: '50000',
          baseAsset: 'BTC',
          quoteAsset: 'USDT'
        }
      ];

      const mockBinanceInstance = {
        getMultipleMarketData: jest.fn().mockResolvedValue(mockMarketData)
      };

      MockedBinanceAPI.mockImplementation(() => mockBinanceInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret'
      });

      await apiManager.fetchAllMarketData(symbols);

      expect(mockBinanceInstance.getMultipleMarketData).toHaveBeenCalledWith(symbols);
    });

    it('should handle market data fetch errors', async () => {
      const symbols = ['BTC/USDT'];
      
      const mockKuCoinInstance = {
        getMultipleMarketData: jest.fn().mockRejectedValue(new Error('API rate limit'))
      };

      MockedKuCoinAPI.mockImplementation(() => mockKuCoinInstance as any);

      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret',
        passphrase: 'pass'
      });

      // Should not throw error, just log it
      await expect(apiManager.fetchAllMarketData(symbols)).resolves.not.toThrow();
    });
  });

  describe('removeExchangeCredentials', () => {
    it('should remove API instances and update storage', async () => {
      // First add credentials
      await apiManager.updateExchangeCredentials(1, {
        apiKey: 'key',
        apiSecret: 'secret'
      });

      // Then remove them
      const result = await apiManager.removeExchangeCredentials(1);

      expect(result).toBe(true);
    });
  });
});