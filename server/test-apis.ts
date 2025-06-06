import { kucoinAPI } from './exchanges/kucoin-api';

async function testAPIs() {
  console.log('Testing KuCoin API connections...');
  
  // Test KuCoin public endpoint (no auth required)
  try {
    console.log('Testing KuCoin public API...');
    const kucoinPrice = await fetch('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT');
    const kucoinData = await kucoinPrice.json();
    console.log('✓ KuCoin public API works:', kucoinData);
    
    // Test market data method
    const marketData = await kucoinAPI.getMarketData('BTC/USDT');
    console.log('✓ KuCoin market data method works:', marketData);
  } catch (error: any) {
    console.log('✗ KuCoin public API failed:', error.message);
  }

  // Test authenticated endpoints if credentials are available
  try {
    console.log('Testing KuCoin authenticated API...');
    console.log('API Key available:', !!process.env.KUCOIN_API_KEY);
    console.log('Secret Key available:', !!process.env.KUCOIN_SECRET_KEY);
    console.log('Passphrase available:', !!process.env.KUCOIN_PASSPHRASE);
    
    const kucoinAccount = await kucoinAPI.getAccountInfo();
    console.log('✓ KuCoin authenticated API works');
  } catch (error: any) {
    console.log('✗ KuCoin authenticated API failed:', error.message);
  }
}

testAPIs();