import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ExchangeConfig } from "@/components/exchanges/exchange-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Exchange, MarketDataWithBestPrice, PortfolioSummary } from "@shared/schema";

export default function ExchangesPage() {
  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: exchanges, isLoading: exchangesLoading } = useQuery<Exchange[]>({
    queryKey: ["/api/exchanges"],
  });

  const { data: bestPrices, isLoading: pricesLoading, refetch } = useQuery<MarketDataWithBestPrice[]>({
    queryKey: ["/api/market-data/best-prices"],
    refetchInterval: 10000,
  });

  const fetchMarketData = async () => {
    const symbols = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "ADA/USDT", "SOL/USDT"];
    try {
      await fetch("/api/market-data/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      refetch();
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(num);
  };

  const formatChange = (change: string | null) => {
    if (!change) return null;
    const num = parseFloat(change);
    const isPositive = num >= 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span className="text-xs font-medium">
          {isPositive ? "+" : ""}{num.toFixed(2)}%
        </span>
      </div>
    );
  };

  const exchangesList = exchanges || [];
  const marketDataArray = bestPrices || [];
  const connectedExchanges = exchangesList.filter(e => e.isConnected);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header summary={summary} />
        
        <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exchange Configuration</h1>
          <p className="text-muted-foreground">
            Connect your exchange accounts to enable real-time trading and market data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {connectedExchanges.length} of {exchangesList.length} Connected
          </Badge>
        </div>
      </div>

      {/* Exchange Configuration Cards */}
      <div className="grid gap-6">
        {exchangesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          exchangesList.map((exchange) => (
            <ExchangeConfig key={exchange.id} exchange={exchange} />
          ))
        )}
      </div>

      {/* Best Prices Section */}
      {connectedExchanges.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Best Prices Across Connected Exchanges</CardTitle>
              <CardDescription>
                Real-time price comparison from your connected exchanges
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMarketData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh Prices
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pricesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : marketDataArray.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No market data available</p>
                  <Button variant="outline" className="mt-2" onClick={fetchMarketData}>
                    Fetch Market Data
                  </Button>
                </div>
              ) : (
                marketDataArray.map((marketData) => (
                  <div key={marketData.symbol} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{marketData.symbol}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            {formatPrice(marketData.bestPrice)}
                          </span>
                          {marketData.changePercent24h && formatChange(marketData.changePercent24h)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          Best: {marketData.bestExchange}
                        </Badge>
                        {marketData.exchangePrices.length > 1 && (
                          <div className="text-xs text-muted-foreground">
                            {marketData.exchangePrices.length} exchanges compared
                          </div>
                        )}
                      </div>
                    </div>

                    {marketData.exchangePrices.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Prices Across Your Connected Exchanges:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {marketData.exchangePrices.map((exchangePrice) => {
                            const exchange = exchangesList.find(e => e.id === exchangePrice.exchangeId);
                            return (
                              <div
                                key={`${exchangePrice.exchangeId}-${exchangePrice.symbol}`}
                                className={`p-3 rounded border ${
                                  exchangePrice.price === marketData.bestPrice
                                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                    : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium">
                                    {exchange?.displayName || `Exchange ${exchangePrice.exchangeId}`}
                                  </span>
                                  {exchangePrice.price === marketData.bestPrice && (
                                    <Badge variant="secondary" className="text-xs">
                                      Best
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-lg font-mono font-bold">
                                  {formatPrice(exchangePrice.price)}
                                </div>
                                {exchangePrice.volume24h && (
                                  <div className="text-xs text-muted-foreground">
                                    Volume: {parseFloat(exchangePrice.volume24h).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started Section */}
      {connectedExchanges.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Connect your first exchange to start trading and monitoring prices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Step 1: Generate API Keys</h4>
              <p className="text-sm text-muted-foreground">
                Visit your exchange's API settings and generate new API keys with trading permissions.
                For security, enable IP restrictions and only grant necessary permissions.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Step 2: Configure Exchange</h4>
              <p className="text-sm text-muted-foreground">
                Click "Connect" on any exchange above and enter your API credentials.
                Start with sandbox mode to test the connection safely.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Step 3: Start Trading</h4>
              <p className="text-sm text-muted-foreground">
                Once connected, you'll see real-time prices, can place orders, and monitor your portfolio
                across all connected exchanges from one dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </main>
    </div>
  );
}