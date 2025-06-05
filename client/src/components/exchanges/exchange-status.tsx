import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Circle, Settings } from "lucide-react";
import type { Exchange } from "@shared/schema";

interface ExchangeStatusProps {
  exchanges?: Exchange[];
  isLoading: boolean;
}

export function ExchangeStatus({ exchanges, isLoading }: ExchangeStatusProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? 'text-crypto-green' : 'text-crypto-red';
  };

  const getStatusText = (isConnected: boolean) => {
    return isConnected ? 'Connected' : 'Disconnected';
  };

  // Mock balances for demonstration (in a real app, this would come from the API)
  const mockBalances = {
    binance: 89234.12,
    coinbase: 52847.33,
    kraken: 41923.78,
    bybit: 38912.45,
    okx: 24914.77,
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Exchange Connections</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="w-2 h-2 rounded-full" />
                </div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!exchanges || exchanges.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Exchange Connections</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No exchanges configured
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4">Exchange Connections</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {exchanges.map((exchange) => {
          const balance = mockBalances[exchange.name as keyof typeof mockBalances] || 0;
          
          return (
            <Card key={exchange.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {exchange.displayName.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium">{exchange.displayName}</span>
                  </div>
                  <Circle 
                    className={`w-2 h-2 ${getStatusColor(exchange.isConnected)} fill-current`} 
                  />
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {getStatusText(exchange.isConnected)}
                </div>
                <div className="text-sm font-medium">
                  {exchange.isConnected ? formatCurrency(balance) : 'N/A'}
                </div>
                {exchange.sandboxMode && (
                  <Badge variant="outline" className="text-xs mt-2">
                    Sandbox
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
