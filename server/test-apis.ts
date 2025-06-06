import { binanceAPI } from './exchanges/binance-api';
import { bybitAPI } from './exchanges/bybit-api';

async function testAPIs() {
  console.log('Testing API connections...');
  
  // Test Binance public endpoint (no auth required)
  try {
    console.log('Testing Binance public API...');
    const binancePrice = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const binanceData = await binancePrice.json();
    console.log('✓ Binance public API works:', binanceData);
  } catch (error) {
    console.log('✗ Binance public API failed:', error);
  }

  // Test Bybit public endpoint (no auth required)
  try {
    console.log('Testing Bybit public API...');
    const bybitPrice = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT');
    const bybitData = await bybitPrice.json();
    console.log('✓ Bybit public API works:', bybitData);
  } catch (error) {
    console.log('✗ Bybit public API failed:', error);
  }

  // Test authenticated endpoints
  console.log('\nTesting authenticated endpoints...');
  
  try {
    console.log('Testing Binance authenticated API...');
    const binanceAccount = await binanceAPI.getAccountInfo();
    console.log('✓ Binance authenticated API works');
  } catch (error) {
    console.log('✗ Binance authenticated API failed:', error.message);
  }

  try {
    console.log('Testing Bybit authenticated API...');
    const bybitAccount = await bybitAPI.getAccountBalance();
    console.log('✓ Bybit authenticated API works');
  } catch (error) {
    console.log('✗ Bybit authenticated API failed:', error.message);
  }
}

testAPIs();