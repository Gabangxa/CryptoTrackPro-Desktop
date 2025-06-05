import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Edit, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PositionWithExchange } from "@shared/schema";

interface PositionsTableProps {
  positions?: PositionWithExchange[];
  isLoading: boolean;
}

export function PositionsTable({ positions, isLoading }: PositionsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deletePosition = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      toast({
        title: "Position closed",
        description: "Position has been successfully closed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to close position",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const calculatePnlPercent = (position: PositionWithExchange) => {
    const entryPrice = parseFloat(position.entryPrice);
    const markPrice = parseFloat(position.markPrice || position.entryPrice);
    const pnlPercent = ((markPrice - entryPrice) / entryPrice) * 100;
    return position.side === 'long' ? pnlPercent : -pnlPercent;
  };

  const getAccountTypeBadge = (type: string) => {
    const variants = {
      spot: "default",
      futures: "secondary",
      perpetual: "outline",
      margin: "destructive",
    } as const;
    
    return variants[type as keyof typeof variants] || "default";
  };

  const getAssetIcon = (symbol: string) => {
    const base = symbol.split('/')[0];
    const colors = {
      BTC: "bg-orange-500",
      ETH: "bg-blue-500", 
      SOL: "bg-purple-500",
      ADA: "bg-green-500",
      DOT: "bg-pink-500",
    } as const;
    
    return colors[base as keyof typeof colors] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Positions</CardTitle>
          <Button>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No active positions found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Positions</CardTitle>
        <Button variant="ghost" size="icon">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b border-border">
                <th className="pb-3">Asset</th>
                <th className="pb-3">Exchange</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Value</th>
                <th className="pb-3">P&L</th>
                <th className="pb-3">Change</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {positions.map((position) => {
                const pnlPercent = calculatePnlPercent(position);
                const markPrice = parseFloat(position.markPrice || position.entryPrice);
                const size = parseFloat(position.size);
                const value = markPrice * size;
                const unrealizedPnl = parseFloat(position.unrealizedPnl || "0");

                return (
                  <tr key={position.id} className="border-b border-border/50">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 ${getAssetIcon(position.symbol)} rounded-full flex items-center justify-center text-xs font-bold text-white`}>
                          {position.baseAsset.charAt(0)}
                        </div>
                        <span className="font-medium">{position.baseAsset}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{position.exchange.displayName}</td>
                    <td className="py-3">
                      <Badge variant={getAccountTypeBadge(position.accountType)}>
                        {position.accountType}
                      </Badge>
                    </td>
                    <td className="py-3 font-mono">{parseFloat(position.size).toFixed(4)}</td>
                    <td className="py-3 font-mono">{formatCurrency(value)}</td>
                    <td className="py-3 font-mono">
                      <span className={unrealizedPnl >= 0 ? "text-crypto-green" : "text-crypto-red"}>
                        {formatCurrency(unrealizedPnl)}
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      <span className={pnlPercent >= 0 ? "text-crypto-green" : "text-crypto-red"}>
                        {formatPercent(pnlPercent)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon" className="w-6 h-6">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 text-crypto-red hover:text-crypto-red"
                          onClick={() => deletePosition.mutate(position.id)}
                          disabled={deletePosition.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
