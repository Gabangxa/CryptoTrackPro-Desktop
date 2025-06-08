import { KuCoinAPI } from '../../../server/exchanges/kucoin-api';

describe('KuCoinAPI', () => {
  let kucoinAPI: KuCoinAPI;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    kucoinAPI = new KuCoinAPI('test-key', 'test-secret', 'test-passphrase', true);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with sandbox URL when sandboxMode is true', () => {
      const api = new KuCoinAPI('key', 'secret', 'pass', true);
      expect(api).toBeDefined();
    });

    it('should initialize with production URL when sandboxMode is false', () => {
      const api = new KuCoinAPI('key', 'secret', 'pass', false);
      expect(api).toBeDefined();
    });
  });

  describe('getTickerPrice', () => {
    it('should fetch ticker price for a symbol', async () => {
      const mockResponse = {
        data: {
          symbol: 'BTC-USDT',
          price: '50000'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await kucoinAPI.getTickerPrice('BTC-USDT');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/market/orderbook/level1'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"code":"400001","msg":"Bad Request"}')
      } as Response);

      await expect(kucoinAPI.getTickerPrice('INVALID')).rejects.toThrow('KuCoin API error');
    });
  });

  describe('getSpotBalances', () => {
    it('should fetch and format spot balances', async () => {
      const mockResponse = {
        data: [
          {
            currency: 'BTC',
            balance: '1.5',
            available: '1.4',
            holds: '0.1',
            type: 'trade'
          },
          {
            currency: 'USDT',
            balance: '10000',
            available: '9500',
            holds: '500',
            type: 'trade'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await kucoinAPI.getSpotBalances();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/accounts'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'KC-API-KEY': 'test-key',
            'KC-API-SIGN': expect.any(String),
            'KC-API-TIMESTAMP': expect.any(String),
            'KC-API-PASSPHRASE': expect.any(String)
          })
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"code":"400004","msg":"Invalid KC-API-PASSPHRASE"}')
      } as Response);

      await expect(kucoinAPI.getSpotBalances()).rejects.toThrow('Invalid KC-API-PASSPHRASE');
    });
  });

  describe('getMultipleMarketData', () => {
    it('should fetch market data for multiple symbols using bulk endpoint', async () => {
      const mockTickersResponse = {
        data: {
          ticker: [
            { symbol: 'BTC-USDT', last: '50000' },
            { symbol: 'ETH-USDT', last: '3000' }
          ]
        }
      };

      const mockStatsResponse = {
        data: [
          { symbol: 'BTC-USDT', changePrice: '1000', changeRate: '0.02', vol: '100' },
          { symbol: 'ETH-USDT', changePrice: '50', changeRate: '0.017', vol: '200' }
        ]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTickersResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatsResponse)
        } as Response);

      const result = await kucoinAPI.getMultipleMarketData(['BTC/USDT', 'ETH/USDT']);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        price: '50000'
      });
    });

    it('should fallback to individual requests when bulk endpoint fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Bulk endpoint failed'));

      const mockIndividualResponse = {
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        price: '50000',
        change24h: '1000',
        changePercent24h: '0.02',
        volume24h: '100'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockIndividualResponse })
      } as Response);

      const result = await kucoinAPI.getMultipleMarketData(['BTC/USDT']);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT'
      });
    });
  });
});