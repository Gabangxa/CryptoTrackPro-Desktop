import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Bell, Circle } from "lucide-react";
import type { PortfolioSummary } from "@shared/schema";

interface HeaderProps {
  summary?: PortfolioSummary;
}

export function Header({ summary }: HeaderProps) {
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

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Circle className="w-2 h-2 text-crypto-green fill-crypto-green" />
            <span>Real-time data</span>
            <span className="text-muted-foreground">•</span>
            <span>Last update: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {summary && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Portfolio</div>
              <div className="text-xl font-semibold">
                {formatCurrency(summary.totalValue)}
              </div>
              <div className={cn(
                "text-sm",
                parseFloat(summary.change24h) >= 0 ? "text-crypto-green" : "text-crypto-red"
              )}>
                {formatCurrency(summary.change24h)} ({formatPercent(summary.change24hPercent)})
              </div>
            </div>
          )}
          
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Quick Order
          </Button>
          
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            {summary && summary.triggeredAlerts > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs flex items-center justify-center"
              >
                {summary.triggeredAlerts}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
