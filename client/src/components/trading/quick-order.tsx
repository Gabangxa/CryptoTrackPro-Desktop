import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOrderSchema } from "@shared/schema";
import type { Exchange } from "@shared/schema";

interface QuickOrderProps {
  exchanges?: Exchange[];
}

export function QuickOrder({ exchanges }: QuickOrderProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [exchangeId, setExchangeId] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('market');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectedExchanges = exchanges?.filter(e => e.isConnected) || [];

  const symbols = [
    'BTC/USDT',
    'ETH/USDT', 
    'SOL/USDT',
    'ADA/USDT',
    'DOT/USDT',
  ];

  const createOrder = useMutation({
    mutationFn: async (orderData: any) => {
      const validatedData = insertOrderSchema.parse(orderData);
      return await apiRequest("POST", "/api/orders", validatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      toast({
        title: "Order submitted",
        description: "Your order has been submitted successfully",
      });
      // Reset form
      setQuantity('');
      setPrice('');
    },
    onError: () => {
      toast({
        title: "Order failed",
        description: "Failed to submit order",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exchangeId || !symbol || !accountType || !quantity) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createOrder.mutate({
      exchangeId: parseInt(exchangeId),
      symbol,
      accountType,
      side,
      type: orderType,
      quantity,
      price: orderType === 'market' ? null : price,
    });
  };

  const selectedExchange = exchanges?.find(e => e.id.toString() === exchangeId);
  const availableAccountTypes = selectedExchange?.supportedAccountTypes || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Exchange</Label>
            <Select value={exchangeId} onValueChange={setExchangeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                {connectedExchanges.map((exchange) => (
                  <SelectItem key={exchange.id} value={exchange.id.toString()}>
                    {exchange.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pair</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Account type" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccountTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={() => setSide('buy')}
              variant={side === 'buy' ? 'default' : 'outline'}
              className={side === 'buy' ? 'bg-crypto-green hover:bg-crypto-green/90 text-white' : ''}
            >
              Buy
            </Button>
            <Button
              type="button"
              onClick={() => setSide('sell')}
              variant={side === 'sell' ? 'default' : 'outline'}
              className={side === 'sell' ? 'bg-crypto-red hover:bg-crypto-red/90 text-white' : ''}
            >
              Sell
            </Button>
          </div>

          <div>
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                placeholder="0.0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="any"
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                placeholder={orderType === 'market' ? 'Market' : '0.0'}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={orderType === 'market'}
                step="any"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={createOrder.isPending}
          >
            {createOrder.isPending ? 'Placing Order...' : 'Place Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
