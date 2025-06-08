# Deployment Guide

This guide covers deploying the Cryptocurrency Portfolio Management Application to various environments.

## Environment Setup

### Required Environment Variables

```bash
# KuCoin API Credentials
KUCOIN_API_KEY=your_kucoin_api_key
KUCOIN_API_SECRET=your_kucoin_api_secret
KUCOIN_PASSPHRASE=your_kucoin_passphrase

# Optional: Binance API Credentials
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Optional: Bybit API Credentials
BYBIT_API_KEY=your_bybit_api_key
BYBIT_API_SECRET=your_bybit_api_secret

# Application Settings
NODE_ENV=production
PORT=5000
```

## Replit Deployment

### Automatic Deployment

1. The application is pre-configured for Replit deployment
2. Click the "Deploy" button in your Replit workspace
3. Configure secrets in the Replit Secrets tab:
   - `KUCOIN_API_KEY`
   - `KUCOIN_API_SECRET`
   - `KUCOIN_PASSPHRASE`

### Manual Setup

1. Fork the repository in Replit
2. Install dependencies: `npm install`
3. Configure API keys in Secrets
4. Run: `npm run dev`

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone repository
git clone <repository-url>
cd crypto-portfolio-app

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure API keys in .env
# Start development server
npm run dev
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  crypto-portfolio:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - KUCOIN_API_KEY=${KUCOIN_API_KEY}
      - KUCOIN_API_SECRET=${KUCOIN_API_SECRET}
      - KUCOIN_PASSPHRASE=${KUCOIN_PASSPHRASE}
    restart: unless-stopped
```

### Traditional Server Deployment

```bash
# On your server
git clone <repository-url>
cd crypto-portfolio-app

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Set environment variables
export NODE_ENV=production
export KUCOIN_API_KEY=your_key
export KUCOIN_API_SECRET=your_secret
export KUCOIN_PASSPHRASE=your_passphrase

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/index.js --name crypto-portfolio

# Or start directly
npm start
```

## Cloud Platform Deployments

### Vercel

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

### Netlify

1. Connect repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Configure environment variables

### Heroku

```bash
# Install Heroku CLI
heroku create crypto-portfolio-app

# Set environment variables
heroku config:set KUCOIN_API_KEY=your_key
heroku config:set KUCOIN_API_SECRET=your_secret
heroku config:set KUCOIN_PASSPHRASE=your_passphrase

# Deploy
git push heroku main
```

### AWS EC2

1. Launch EC2 instance (Ubuntu 20.04+)
2. Install Node.js and npm
3. Clone repository and setup as above
4. Configure reverse proxy with nginx
5. Setup SSL with Let's Encrypt

## Security Considerations

### API Key Management

- Never commit API keys to version control
- Use environment variables or secure secret management
- Rotate API keys regularly
- Use minimum required permissions

### Network Security

- Enable HTTPS in production
- Configure CORS properly
- Use rate limiting
- Implement IP whitelisting if needed

### Server Security

```bash
# Example nginx configuration
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring

### Health Check Endpoint

The application provides health check at `/api/health`:

```javascript
// Example monitoring script
const checkHealth = async () => {
  try {
    const response = await fetch('https://yourapp.com/api/health');
    const data = await response.json();
    console.log('Health status:', data.status);
  } catch (error) {
    console.error('Health check failed:', error);
  }
};
```

### Logging

- Application logs are written to stdout
- Use log aggregation service (e.g., Papertrail, Loggly)
- Monitor API response times and error rates

### Performance Monitoring

- Monitor memory usage and CPU utilization
- Track API response times
- Set up alerts for high error rates
- Monitor exchange API rate limits

## Backup and Recovery

### Data Backup

Since the application uses in-memory storage by default:
- No persistent data to backup
- Configuration and API keys should be backed up securely

### Recovery Procedures

1. Redeploy application from source
2. Restore environment variables
3. Verify exchange connections
4. Test functionality

## Scaling

### Horizontal Scaling

- Use load balancer (nginx, HAProxy)
- Deploy multiple instances
- Share session state if needed

### Vertical Scaling

- Increase server resources
- Monitor resource utilization
- Optimize code for better performance

## Troubleshooting

### Common Deployment Issues

**Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review build logs for specific errors

**Runtime Errors**
- Check environment variables are set
- Verify API key permissions
- Review application logs

**Connection Issues**
- Test exchange API connectivity
- Check network/firewall settings
- Verify SSL certificates

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm start
```

This enables verbose logging for troubleshooting.

## Support

For deployment issues:
1. Check application logs first
2. Verify environment configuration
3. Test exchange API connections
4. Review this deployment guide
5. Create an issue with deployment details