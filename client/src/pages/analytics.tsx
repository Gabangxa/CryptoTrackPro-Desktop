import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Users,
  Target
} from "lucide-react";
import type { 
  PortfolioSummary, 
  PositionWithExchange, 
  Exchange, 
  AlertWithTarget,
  MarketDataWithBestPrice 
} from "@shared/schema";

export default function AnalyticsPage() {
  const { data: portfolioSummary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: ['/api/portfolio/summary'],
  });

  const { data: positions, isLoading: positionsLoading } = useQuery<PositionWithExchange[]>({
    queryKey: ['/api/positions'],
  });

  const { data: exchanges, isLoading: exchangesLoading } = useQuery<Exchange[]>({
    queryKey: ['/api/exchanges'],
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<AlertWithTarget[]>({
    queryKey: ['/api/alerts'],
  });

  const { data: marketData, isLoading: marketLoading } = useQuery<MarketDataWithBestPrice[]>({
    queryKey: ['/api/market-data/best-prices'],
  });

  const isLoading = summaryLoading || positionsLoading || exchangesLoading || alertsLoading || marketLoading;

  // Calculate portfolio metrics
  const portfolioMetrics = {
    totalValue: parseFloat(portfolioSummary?.totalValue || '0'),
    totalPnl: parseFloat(portfolioSummary?.totalPnl || '0'),
    totalPnlPercent: parseFloat(portfolioSummary?.totalPnlPercent || '0'),
    change24h: parseFloat(portfolioSummary?.change24h || '0'),
    change24hPercent: parseFloat(portfolioSummary?.change24hPercent || '0'),
    activePositions: portfolioSummary?.activePositions || 0,
    activeAlerts: portfolioSummary?.activeAlerts || 0,
    triggeredAlerts: portfolioSummary?.triggeredAlerts || 0
  };

  // Exchange performance analysis
  const exchangePerformance = exchanges?.map(exchange => {
    const exchangePositions = positions?.filter(p => p.exchangeId === exchange.id) || [];
    const totalValue = exchangePositions.reduce((sum, pos) => {
      const positionValue = parseFloat(pos.size) * parseFloat(pos.markPrice || pos.entryPrice);
      return sum + positionValue;
    }, 0);
    const totalPnl = exchangePositions.reduce((sum, pos) => sum + parseFloat(pos.unrealizedPnl || '0'), 0);
    
    return {
      ...exchange,
      positionCount: exchangePositions.length,
      totalValue,
      totalPnl,
      pnlPercent: totalValue > 0 ? (totalPnl / totalValue) * 100 : 0
    };
  }) || [];

  // Position allocation analysis
  const positionAllocation = positions?.map(position => {
    const positionValue = parseFloat(position.size) * parseFloat(position.markPrice || position.entryPrice);
    const pnlPercent = positionValue > 0 ? (parseFloat(position.unrealizedPnl || '0') / positionValue) * 100 : 0;
    
    return {
      ...position,
      currentValue: positionValue,
      pnlPercent,
      allocationPercent: portfolioMetrics.totalValue > 0 ? (positionValue / portfolioMetrics.totalValue) * 100 : 0
    };
  }).sort((a, b) => b.allocationPercent - a.allocationPercent) || [];

  // Alert effectiveness analysis
  const alertStats = {
    total: alerts?.length || 0,
    active: alerts?.filter(a => a.isActive && !a.isTriggered).length || 0,
    triggered: alerts?.filter(a => a.isTriggered).length || 0,
    effectiveness: alerts?.length ? ((alerts.filter(a => a.isTriggered).length / alerts.length) * 100) : 0
  };

  // Top performers
  const topPerformers = positionAllocation?.filter(p => p.pnlPercent > 0)
    .sort((a, b) => b.pnlPercent - a.pnlPercent)
    .slice(0, 5) || [];

  const topLosers = positionAllocation?.filter(p => p.pnlPercent < 0)
    .sort((a, b) => a.pnlPercent - b.pnlPercent)
    .slice(0, 5) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
    return value >= 0 ? `+${formatted}` : formatted;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your cryptocurrency portfolio performance
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {portfolioMetrics.change24h >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {formatPercent(portfolioMetrics.change24hPercent)} (24h)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolioMetrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolioMetrics.totalPnl)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatPercent(portfolioMetrics.totalPnlPercent)} overall
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics.activePositions}</div>
            <div className="text-xs text-muted-foreground">
              Across {exchanges?.filter(e => e.isConnected).length} exchanges
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertStats.active}/{alertStats.total}</div>
            <div className="text-xs text-muted-foreground">
              {alertStats.effectiveness.toFixed(1)}% effectiveness
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Best performing positions by percentage gain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topPerformers.length > 0 ? (
                  topPerformers.map((position, index) => (
                    <div key={position.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(position.currentValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-600 font-medium">
                          {formatPercent(position.pnlPercent)}
                        </div>
                        <div className="text-sm text-green-600">
                          {formatCurrency(parseFloat(position.unrealizedPnl || '0'))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No profitable positions currently
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Losers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                  Underperformers
                </CardTitle>
                <CardDescription>
                  Positions requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topLosers.length > 0 ? (
                  topLosers.map((position, index) => (
                    <div key={position.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(position.currentValue))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-600 font-medium">
                          {formatPercent(parseFloat(position.pnlPercent))}
                        </div>
                        <div className="text-sm text-red-600">
                          {formatCurrency(parseFloat(position.unrealizedPnl))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No losing positions currently
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
              <CardDescription>
                Distribution of your portfolio across different assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {positionAllocation.slice(0, 10).map((position) => (
                <div key={position.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{position.symbol}</span>
                    <span>{position.allocationPercent.toFixed(2)}%</span>
                  </div>
                  <Progress value={position.allocationPercent} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(parseFloat(position.currentValue))}</span>
                    <span className={parseFloat(position.pnlPercent) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(parseFloat(position.pnlPercent))}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exchanges" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exchangePerformance.map((exchange) => (
              <Card key={exchange.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{exchange.displayName}</span>
                    <Badge variant={exchange.isConnected ? "default" : "secondary"}>
                      {exchange.isConnected ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {exchange.isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Positions</div>
                      <div className="font-medium">{exchange.positionCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Value</div>
                      <div className="font-medium">{formatCurrency(exchange.totalValue)}</div>
                    </div>
                  </div>
                  
                  {exchange.totalValue > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Performance</div>
                      <div className={`text-lg font-bold ${exchange.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(exchange.pnlPercent)}
                      </div>
                      <div className={`text-sm ${exchange.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(exchange.totalPnl)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Total Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alertStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-blue-500" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{alertStats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Triggered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{alertStats.triggered}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>
                Latest alert activity and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {alert.status === 'active' ? (
                          <Activity className="h-4 w-4 text-blue-500" />
                        ) : alert.status === 'triggered' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium">
                            {alert.type === 'price' ? 'Price Alert' : 
                             alert.type === 'pnl' ? 'P&L Alert' : 
                             'Portfolio Alert'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {alert.targetName || `Target: ${alert.targetId}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          alert.status === 'active' ? 'default' :
                          alert.status === 'triggered' ? 'secondary' : 'outline'
                        }>
                          {alert.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {alert.condition} ${alert.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No alerts configured
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}