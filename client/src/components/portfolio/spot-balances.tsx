import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, TrendingUp, AlertCircle } from "lucide-react";

interface SpotBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
  exchange: string;
}

interface SpotBalancesProps {
  exchanges?: Array<{ id: number; name: string; displayName: string; isConnected: boolean }>;
}

export function SpotBalances({ exchanges }: SpotBalancesProps) {
  const connectedExchanges = exchanges?.filter(e => e.isConnected) || [];

  const balanceQueries = useQuery({
    queryKey: ['/api/exchanges/balances', connectedExchanges.map(e => e.id)],
    queryFn: async () => {
      if (connectedExchanges.length === 0) return [];
      
      const balancePromises = connectedExchanges.map(async exchange => {
        try {
          const response = await fetch(`/api/exchanges/${exchange.id}/balances`);
          if (!response.ok) throw new Error(`Failed to fetch balances for ${exchange.displayName}`);
          const balances = await response.json();
          return balances.map((balance: SpotBalance) => ({
            ...balance,
            exchangeDisplayName: exchange.displayName
          }));
        } catch (error) {
          console.error(`Error fetching balances for ${exchange.displayName}:`, error);
          return [];
        }
      });

      const results = await Promise.all(balancePromises);
      return results.flat();
    },
    enabled: connectedExchanges.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const aggregateBalances = (balances: any[]) => {
    const aggregated = new Map();
    
    balances.forEach(balance => {
      const key = balance.asset;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.total = (parseFloat(existing.total) + parseFloat(balance.total)).toString();
        existing.free = (parseFloat(existing.free) + parseFloat(balance.free)).toString();
        existing.locked = (parseFloat(existing.locked) + parseFloat(balance.locked)).toString();
        existing.exchanges.push(balance.exchangeDisplayName);
      } else {
        aggregated.set(key, {
          ...balance,
          exchanges: [balance.exchangeDisplayName]
        });
      }
    });
    
    return Array.from(aggregated.values()).sort((a, b) => 
      parseFloat(b.total) - parseFloat(a.total)
    );
  };

  if (connectedExchanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Spot Balances
          </CardTitle>
          <CardDescription>
            Your cryptocurrency holdings across connected exchanges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connect to exchanges to view your spot balances. Go to the Exchanges page to add your API credentials.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (balanceQueries.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Spot Balances
          </CardTitle>
          <CardDescription>
            Loading balances from {connectedExchanges.length} connected exchange{connectedExchanges.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
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

  if (balanceQueries.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Spot Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load balances. Check your API credentials in the Exchanges section.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const balances = balanceQueries.data || [];
  const aggregatedBalances = aggregateBalances(balances);

  if (aggregatedBalances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Spot Balances
          </CardTitle>
          <CardDescription>
            Your cryptocurrency holdings across connected exchanges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No balances found on connected exchanges. Make sure your API keys have the correct permissions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Spot Balances
        </CardTitle>
        <CardDescription>
          Your cryptocurrency holdings across {connectedExchanges.length} connected exchange{connectedExchanges.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Total Balance</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>In Orders</TableHead>
              <TableHead>Exchanges</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregatedBalances.map((balance) => (
              <TableRow key={balance.asset}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    {balance.asset}
                  </div>
                </TableCell>
                <TableCell>
                  {parseFloat(balance.total).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </TableCell>
                <TableCell className="text-green-600">
                  {parseFloat(balance.free).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </TableCell>
                <TableCell className="text-orange-600">
                  {parseFloat(balance.locked).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {balance.exchanges.map((exchange: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {exchange}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}