import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Filter,
  Search,
  Eye,
  BarChart3
} from "lucide-react";
import type { 
  PortfolioSummary, 
  PositionWithExchange, 
  Exchange 
} from "@shared/schema";

export default function PositionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExchange, setSelectedExchange] = useState<string>("all");
  const [selectedAccountType, setSelectedAccountType] = useState<string>("all");

  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: positions, isLoading: positionsLoading } = useQuery<PositionWithExchange[]>({
    queryKey: ["/api/positions"],
  });

  const { data: exchanges } = useQuery<Exchange[]>({
    queryKey: ["/api/exchanges"],
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getPositionValue = (position: PositionWithExchange) => {
    return parseFloat(position.size) * parseFloat(position.markPrice || position.entryPrice);
  };

  const getPositionPnl = (position: PositionWithExchange) => {
    return parseFloat(position.unrealizedPnl || '0');
  };

  const getPositionPnlPercent = (position: PositionWithExchange) => {
    const value = getPositionValue(position);
    const pnl = getPositionPnl(position);
    return value > 0 ? (pnl / value) * 100 : 0;
  };

  // Filter positions based on search and filters
  const filteredPositions = positions?.filter(position => {
    const matchesSearch = position.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.baseAsset.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExchange = selectedExchange === "all" || position.exchangeId.toString() === selectedExchange;
    const matchesAccountType = selectedAccountType === "all" || position.accountType === selectedAccountType;
    
    return matchesSearch && matchesExchange && matchesAccountType;
  }) || [];

  // Group positions by account type
  const spotPositions = filteredPositions.filter(p => p.accountType === "spot");
  const futuresPositions = filteredPositions.filter(p => p.accountType === "futures");
  const marginPositions = filteredPositions.filter(p => p.accountType === "margin");

  // Calculate totals
  const totalValue = filteredPositions.reduce((sum, pos) => sum + getPositionValue(pos), 0);
  const totalPnl = filteredPositions.reduce((sum, pos) => sum + getPositionPnl(pos), 0);
  const totalPnlPercent = totalValue > 0 ? (totalPnl / totalValue) * 100 : 0;

  const renderPositionsTable = (positions: PositionWithExchange[], title: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">{positions.length} positions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Entry Price</TableHead>
                <TableHead>Mark Price</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>P&L %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const positionValue = getPositionValue(position);
                const positionPnl = getPositionPnl(position);
                const positionPnlPercent = getPositionPnlPercent(position);
                
                return (
                  <TableRow key={position.id}>
                    <TableCell>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.baseAsset}/{position.quoteAsset}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {position.exchange.displayName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.side === "long" ? "default" : "secondary"}>
                        {position.side.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{position.size}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(position.entryPrice)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(position.markPrice || position.entryPrice)}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(positionValue)}
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${
                      positionPnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(positionPnl)}
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${
                      positionPnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercent(positionPnlPercent)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No {title.toLowerCase()} positions</h3>
            <p className="text-muted-foreground">
              Your {title.toLowerCase()} positions will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header summary={summary} />
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Portfolio Positions</h1>
              <p className="text-muted-foreground">
                Monitor all your positions across connected exchanges
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredPositions.length}</div>
                <div className="text-xs text-muted-foreground">
                  Across {exchanges?.filter(e => e.isConnected).length || 0} exchanges
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <div className="text-xs text-muted-foreground">
                  Current market value
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalPnl)}
                </div>
                <div className={`text-xs ${totalPnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(totalPnlPercent)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profitable Positions</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {filteredPositions.filter(p => getPositionPnl(p) > 0).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Out of {filteredPositions.length} total
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search symbols..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Exchanges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exchanges</SelectItem>
                    {exchanges?.filter(e => e.isConnected).map((exchange) => (
                      <SelectItem key={exchange.id} value={exchange.id.toString()}>
                        {exchange.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Account Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Account Types</SelectItem>
                    <SelectItem value="spot">Spot Trading</SelectItem>
                    <SelectItem value="futures">Futures</SelectItem>
                    <SelectItem value="margin">Margin</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedExchange("all");
                    setSelectedAccountType("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Positions Tables */}
          {positionsLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-32"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Positions ({filteredPositions.length})</TabsTrigger>
                <TabsTrigger value="spot">Spot ({spotPositions.length})</TabsTrigger>
                <TabsTrigger value="futures">Futures ({futuresPositions.length})</TabsTrigger>
                <TabsTrigger value="margin">Margin ({marginPositions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                {renderPositionsTable(filteredPositions, "All Positions")}
              </TabsContent>

              <TabsContent value="spot" className="space-y-6">
                {renderPositionsTable(spotPositions, "Spot Positions")}
              </TabsContent>

              <TabsContent value="futures" className="space-y-6">
                {renderPositionsTable(futuresPositions, "Futures Positions")}
              </TabsContent>

              <TabsContent value="margin" className="space-y-6">
                {renderPositionsTable(marginPositions, "Margin Positions")}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}