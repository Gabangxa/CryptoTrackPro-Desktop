# Cryptocurrency Portfolio Management Application

A comprehensive web-based application for tracking cryptocurrency positions across multiple exchanges with real-time monitoring, alerts, and spot balance aggregation.

## Features

### Multi-Exchange Support
- **Binance** - Full spot trading and balance tracking
- **KuCoin** - Complete API integration with spot balances
- **Bybit** - Account balance and position monitoring

### Real-Time Data
- Live price feeds from all connected exchanges
- Real-time portfolio value updates
- Market data aggregation with best price discovery
- WebSocket connections for instant updates

### Portfolio Analytics
- Consolidated portfolio summary across all exchanges
- Spot balance tracking and aggregation
- PnL calculations with 24h change tracking
- Active position monitoring

### Alert System
- Price-based alerts for cryptocurrencies
- Exchange connection status monitoring
- Real-time alert triggering and notifications

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd crypto-portfolio-app
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Exchange API Setup

### KuCoin Configuration

1. **Create API Key**
   - Log into your KuCoin account
   - Go to **API Management** → **Create API**
   - Set API Name and create a strong passphrase

2. **Required Permissions**
   - ✅ **General** (required for account data)
   - ✅ **Spot Trading** (required for balance access)
   - ❌ Futures Trading (optional)
   - ❌ Margin Trading (optional)

3. **IP Restrictions**
   - Set to "Unrestricted" for development
   - Or add your server's IP address for production

4. **Important Notes**
   - The passphrase is case-sensitive and must match exactly
   - Save your API credentials securely
   - Never share your API secret or passphrase

### Binance Configuration

1. **Create API Key**
   - Log into Binance → **API Management**
   - Create new API key with a descriptive name

2. **Required Permissions**
   - ✅ **Enable Reading** (for account data)
   - ✅ **Enable Spot & Margin Trading** (for balance access)
   - ❌ Enable Futures (optional)

3. **Security Settings**
   - Enable IP restrictions for production use
   - Use testnet for development/testing

### Bybit Configuration

1. **Create API Key**
   - Bybit account → **API Management**
   - Generate new API key

2. **Required Permissions**
   - ✅ **Read-Write** for account access
   - Configure IP whitelist as needed

## Application Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and API client
├── server/                # Express backend
│   ├── exchanges/         # Exchange API integrations
│   ├── routes.ts          # API routes
│   ├── api-manager.ts     # Exchange management
│   └── storage.ts         # Data storage layer
└── shared/                # Shared types and schemas
```

## API Endpoints

### Exchanges
- `GET /api/exchanges` - List all exchanges
- `PUT /api/exchanges/:id` - Update exchange credentials
- `GET /api/exchanges/:id/balances` - Get exchange balances
- `GET /api/exchanges/:id/test` - Test exchange connection

### Portfolio
- `GET /api/portfolio/summary` - Portfolio overview
- `GET /api/positions` - All positions across exchanges

### Market Data
- `GET /api/market-data` - Current market data
- `GET /api/market-data/best-prices` - Best prices across exchanges

### Debug
- `GET /api/debug/exchanges` - Exchange status overview

## Environment Variables

The application uses environment secrets for API keys:

- `KUCOIN_API_KEY` - Your KuCoin API key
- `KUCOIN_API_SECRET` - Your KuCoin API secret  
- `KUCOIN_PASSPHRASE` - Your KuCoin API passphrase

## Troubleshooting

### Common KuCoin Issues

**401 Unauthorized - Invalid KC-API-PASSPHRASE**
- Verify the passphrase matches exactly what you set when creating the API key
- Passphrase is case-sensitive
- Create a new API key if needed

**401 Unauthorized - Insufficient Permissions**
- Enable "General" permission in KuCoin API settings
- Enable "Spot Trading" permission for balance access

### Common Binance Issues

**API Key Restrictions**
- Check if IP restrictions are properly configured
- Verify API key has reading permissions enabled

### Common Bybit Issues

**Authentication Failures**
- Confirm API key has read-write permissions
- Check IP whitelist settings

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Code Structure
- Frontend uses React with TypeScript
- Backend uses Express.js with TypeScript
- Real-time updates via WebSocket connections
- Responsive design with Tailwind CSS

## Security Considerations

- API keys are stored securely and never logged
- All API communications use HTTPS
- Rate limiting implemented for API calls
- Input validation on all endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues related to:
- **API connectivity**: Check exchange API key permissions and IP restrictions
- **Balance loading**: Verify exchange credentials and network connectivity  
- **Real-time updates**: Ensure WebSocket connections are enabled

## Changelog

### Latest Updates
- Added comprehensive API logging for early issue detection
- Implemented bulk market data endpoints for better performance
- Enhanced error handling with detailed diagnostic information
- Added spot balance focus across all exchanges
- Improved KuCoin API authentication debugging