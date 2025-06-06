# Local Deployment Guide

## Cryptocurrency Portfolio Management Application

This guide will help you run the cryptocurrency portfolio management application on your desktop computer with full API integration for Binance, Bybit, and KuCoin exchanges.

## Prerequisites

1. **Node.js** (version 20 or later)
   - Download from [nodejs.org](https://nodejs.org)
   - Verify installation: `node --version`

2. **Exchange API Keys** (optional but recommended for real data)
   - Binance API credentials
   - Bybit API credentials  
   - KuCoin API credentials (including passphrase)

## Installation Steps

### 1. Download the Application
```bash
# If using Git
git clone [repository-url]
cd [project-directory]

# Or download and extract the ZIP file
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup (Optional)
Create a `.env` file in the root directory for default API keys:
```env
# Binance
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Bybit
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET_KEY=your_bybit_secret_key

# KuCoin
KUCOIN_API_KEY=your_kucoin_api_key
KUCOIN_SECRET_KEY=your_kucoin_secret_key
KUCOIN_PASSPHRASE=your_kucoin_passphrase
```

### 4. Start the Application
```bash
npm run dev
```

The application will start on `http://localhost:5000`

## Features

### Exchange Integration
- **Real-time Data**: Live price feeds from connected exchanges
- **Best Price Aggregation**: Compare prices across all connected exchanges
- **Account Management**: View balances and positions from multiple exchanges
- **Secure Credentials**: API keys stored securely in memory

### Portfolio Management
- **Multi-Exchange Portfolio**: Track positions across all exchanges
- **Real-time P&L**: Live profit/loss calculations
- **Price Alerts**: Set alerts for price movements
- **Order Management**: Place orders through connected exchanges

### Security Features
- **Sandbox Mode**: Test with exchange sandbox/testnet environments
- **In-Memory Storage**: No persistent storage of sensitive data
- **API Key Validation**: Test connections before storing credentials

## Exchange Setup

### Binance
1. Visit [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create a new API key
3. Enable "Enable Reading" and "Enable Spot & Margin Trading"
4. Set IP restrictions for security
5. Enter credentials in the app's Exchanges page

### Bybit
1. Visit [Bybit API Management](https://www.bybit.com/app/user/api-management)
2. Create a new API key
3. Enable necessary permissions for trading
4. Configure IP whitelist
5. Enter credentials in the app's Exchanges page

### KuCoin
1. Visit [KuCoin API Management](https://www.kucoin.com/account/api)
2. Create a new API key with passphrase
3. Enable trading permissions
4. Set IP restrictions
5. Enter API key, secret, and passphrase in the app

## Usage Guide

### 1. Connect Exchanges
- Navigate to the "Exchanges" page
- Click "Connect" on any exchange
- Enter your API credentials
- Test the connection
- Start with sandbox mode for safety

### 2. View Real-time Prices
- Connected exchanges will provide live price data
- Best prices are automatically calculated and displayed
- Price comparison shows spreads between exchanges

### 3. Manage Portfolio
- View aggregated portfolio value across all exchanges
- Monitor real-time P&L calculations
- Track positions from multiple exchanges in one dashboard

### 4. Set Alerts
- Create price alerts for specific tokens
- Monitor portfolio value changes
- Receive notifications for triggered alerts

## Troubleshooting

### Connection Issues
- Verify API keys are correct
- Check IP restrictions on exchange accounts
- Ensure internet connection is stable
- Try sandbox mode first

### Missing Market Data
- Click "Refresh Prices" to fetch latest data
- Ensure at least one exchange is connected
- Check exchange API status

### Performance
- App uses in-memory storage for fast performance
- Data resets when app is restarted
- Real-time updates via WebSocket connections

## Security Best Practices

1. **API Key Security**
   - Use read-only keys when possible
   - Enable IP restrictions
   - Regularly rotate API keys
   - Never share credentials

2. **Network Security**
   - Use on secure networks
   - Consider VPN for additional security
   - Monitor API key usage on exchanges

3. **Testing**
   - Always test with sandbox mode first
   - Start with small amounts
   - Verify all functionality before live trading

## Technical Details

### Architecture
- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Storage**: In-memory (no database required)
- **Real-time**: WebSocket connections
- **APIs**: Direct integration with exchange APIs

### Supported Exchanges
- **Binance**: Spot and futures trading
- **Bybit**: Spot and derivatives trading
- **KuCoin**: Spot and futures trading

### Data Sources
- All market data fetched directly from exchange APIs
- No third-party data providers required
- Real-time price aggregation across exchanges

## Development

### Available Scripts
```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run check   # Type checking
```

### Port Configuration
- Default port: 5000
- Frontend and backend served on same port
- WebSocket on same port for real-time updates

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify exchange API documentation
3. Test with sandbox mode
4. Review console logs for error details

## Important Notes

- **Data Persistence**: Application uses in-memory storage. Data will be lost when restarting.
- **API Limits**: Be aware of exchange API rate limits
- **Market Hours**: Some exchanges have maintenance windows
- **Regulations**: Ensure compliance with local trading regulations