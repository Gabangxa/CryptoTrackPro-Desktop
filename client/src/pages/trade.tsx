import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Calculator,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { 
  PortfolioSummary, 
  Exchange, 
  MarketDataWithBestPrice, 
  Order,
  PositionWithExchange 
} from "@shared/schema";

const orderSchema = z.object({
  exchangeId: z.string().min(1, "Exchange is required"),
  symbol: z.string().min(1, "Symbol is required"),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit", "stop"]),
  quantity: z.string().min(1, "Quantity is required"),
  price: z.string().optional(),
  accountType: z.enum(["spot", "futures", "margin"]),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const queryClient = useQueryClient();

  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: exchanges } = useQuery<Exchange[]>({
    queryKey: ["/api/exchanges"],
  });

  const { data: marketData } = useQuery<MarketDataWithBestPrice[]>({
    queryKey: ["/api/market-data/best-prices"],
    refetchInterval: 5000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: positions } = useQuery<PositionWithExchange[]>({
    queryKey: ["/api/positions"],
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      exchangeId: "",
      symbol: selectedSymbol,
      side: orderSide,
      type: "market",
      quantity: "",
      price: "",
      accountType: "spot",
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: (data: OrderFormData) => {
      const orderData = {
        ...data,
        exchangeId: parseInt(data.exchangeId),
        quantity: parseFloat(data.quantity),
        price: data.price ? parseFloat(data.price) : undefined,
      };
      return apiRequest("/api/orders", "POST", orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      form.reset();
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: number) => apiRequest(`/api/orders/${orderId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const onSubmit = (data: OrderFormData) => {
    placeOrderMutation.mutate(data);
  };

  const connectedExchanges = exchanges?.filter(e => e.isConnected) || [];
  const currentMarketData = marketData?.find(m => m.symbol === selectedSymbol);
  const watchedOrderType = form.watch("type");
  const watchedQuantity = form.watch("quantity");
  const watchedPrice = form.watch("price");

  const calculateOrderValue = () => {
    if (!watchedQuantity) return 0;
    const quantity = parseFloat(watchedQuantity);
    let price = 0;
    
    if (watchedOrderType === "market") {
      price = currentMarketData ? parseFloat(currentMarketData.bestPrice) : 0;
    } else if (watchedPrice) {
      price = parseFloat(watchedPrice);
    }
    
    return quantity * price;
  };

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

  const orderValue = calculateOrderValue();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header summary={summary} />
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quick Trade</h1>
              <p className="text-muted-foreground">
                Execute trades across your connected exchanges
              </p>
            </div>
          </div>

          {connectedExchanges.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No exchanges connected. Please configure your exchange connections first.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trading Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Place Order
                  </CardTitle>
                  <CardDescription>
                    Execute buy or sell orders on your connected exchanges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="exchangeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Exchange</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select exchange" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {connectedExchanges.map((exchange) => (
                                    <SelectItem key={exchange.id} value={exchange.id.toString()}>
                                      {exchange.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="symbol"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trading Pair</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedSymbol(value);
                                }} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select trading pair" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {marketData?.map((market) => (
                                    <SelectItem key={market.symbol} value={market.symbol}>
                                      {market.symbol}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={orderSide === "buy" ? "default" : "outline"}
                          className={orderSide === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
                          onClick={() => {
                            setOrderSide("buy");
                            form.setValue("side", "buy");
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Buy
                        </Button>
                        <Button
                          type="button"
                          variant={orderSide === "sell" ? "default" : "outline"}
                          className={orderSide === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                          onClick={() => {
                            setOrderSide("sell");
                            form.setValue("side", "sell");
                          }}
                        >
                          <TrendingDown className="h-4 w-4 mr-2" />
                          Sell
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select order type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="market">Market Order</SelectItem>
                                  <SelectItem value="limit">Limit Order</SelectItem>
                                  <SelectItem value="stop">Stop Order</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Market orders execute immediately at current price
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select account type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="spot">Spot Trading</SelectItem>
                                  <SelectItem value="futures">Futures</SelectItem>
                                  <SelectItem value="margin">Margin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.00000001" 
                                  placeholder="Enter quantity" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Amount of {selectedSymbol.split('/')[0]} to {orderSide}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchedOrderType !== "market" && (
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="Enter price" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Price per {selectedSymbol.split('/')[0]}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Order Summary */}
                      {watchedQuantity && (
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <h4 className="font-medium">Order Summary</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Order Type:</div>
                            <div className="capitalize">{watchedOrderType}</div>
                            <div>Side:</div>
                            <div className={`capitalize ${orderSide === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                              {orderSide}
                            </div>
                            <div>Quantity:</div>
                            <div>{watchedQuantity} {selectedSymbol.split('/')[0]}</div>
                            <div>Estimated Price:</div>
                            <div>
                              {watchedOrderType === "market" 
                                ? formatCurrency(currentMarketData?.bestPrice || 0)
                                : formatCurrency(watchedPrice || 0)
                              }
                            </div>
                            <div className="font-medium">Total Value:</div>
                            <div className="font-medium">{formatCurrency(orderValue)}</div>
                          </div>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={placeOrderMutation.isPending || connectedExchanges.length === 0}
                      >
                        {placeOrderMutation.isPending ? (
                          "Placing Order..."
                        ) : (
                          <>
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            Place {orderSide.toUpperCase()} Order
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Market Data & Quick Actions */}
            <div className="space-y-6">
              {/* Current Price */}
              {currentMarketData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedSymbol}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(currentMarketData.bestPrice)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Best price: {currentMarketData.bestExchange}
                        </div>
                      </div>
                      
                      {currentMarketData.changePercent24h && (
                        <div className={`flex items-center space-x-1 ${
                          parseFloat(currentMarketData.changePercent24h) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {parseFloat(currentMarketData.changePercent24h) >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {formatPercent(currentMarketData.changePercent24h)} (24h)
                          </span>
                        </div>
                      )}

                      {currentMarketData.volume24h && (
                        <div className="text-sm text-muted-foreground">
                          Volume: {parseFloat(currentMarketData.volume24h).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      if (currentMarketData) {
                        const quantity = "0.01"; // Default small quantity
                        form.setValue("quantity", quantity);
                        form.setValue("side", "buy");
                        setOrderSide("buy");
                      }
                    }}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Quick Buy (0.01)
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      if (currentMarketData) {
                        const quantity = "0.01"; // Default small quantity
                        form.setValue("quantity", quantity);
                        form.setValue("side", "sell");
                        setOrderSide("sell");
                      }
                    }}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Quick Sell (0.01)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Orders History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                View and manage your recent trading activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 10).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={order.side === "buy" ? "default" : "secondary"}>
                            {order.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{order.type}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          {order.price ? formatCurrency(order.price) : "Market"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === "filled" ? "default" :
                            order.status === "cancelled" ? "secondary" :
                            order.status === "failed" ? "destructive" : "outline"
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          {order.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelOrderMutation.mutate(order.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                  <p className="text-muted-foreground">
                    Your trading history will appear here once you place your first order
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}