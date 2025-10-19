import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, Layers, Bell, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSummary } from "@shared/schema";

interface OverviewCardsProps {
  summary?: PortfolioSummary;
  isLoading: boolean;
}

export function OverviewCards({ summary, isLoading }: OverviewCardsProps) {
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="modern-card animate-pulse">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-32 mb-3 rounded-lg" />
              <Skeleton className="h-9 w-28 mb-2 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No portfolio data available</p>
              <p className="text-xs mt-1">Connect your exchanges to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Portfolio Value",
      value: formatCurrency(summary.totalValue),
      change: `${formatCurrency(summary.change24h)} (${formatPercent(summary.change24hPercent)})`,
      changeType: parseFloat(summary.change24h) >= 0 ? 'positive' : 'negative',
      period: "24h",
      icon: Wallet,
      gradient: "from-primary/20 to-crypto-blue/20",
      iconBg: "from-primary to-crypto-blue",
    },
    {
      title: "Total P&L",
      value: formatCurrency(summary.totalPnl),
      change: formatPercent(summary.totalPnlPercent),
      changeType: parseFloat(summary.totalPnl) >= 0 ? 'positive' : 'negative',
      period: "All time",
      icon: TrendingUp,
      gradient: parseFloat(summary.totalPnl) >= 0 ? "from-crypto-green/20 to-crypto-green/10" : "from-crypto-red/20 to-crypto-red/10",
      iconBg: parseFloat(summary.totalPnl) >= 0 ? "from-crypto-green to-emerald-400" : "from-crypto-red to-red-400",
    },
    {
      title: "Active Positions",
      value: summary.activePositions.toString(),
      change: "Across exchanges",
      changeType: 'neutral' as const,
      period: "",
      icon: Layers,
      gradient: "from-crypto-purple/20 to-crypto-purple/10",
      iconBg: "from-crypto-purple to-purple-400",
    },
    {
      title: "Active Alerts",
      value: summary.activeAlerts.toString(),
      change: `${summary.triggeredAlerts} triggered`,
      changeType: summary.triggeredAlerts > 0 ? 'negative' : 'neutral',
      period: "today",
      icon: Bell,
      gradient: "from-crypto-yellow/20 to-crypto-yellow/10",
      iconBg: "from-crypto-yellow to-yellow-400",
    },
  ];

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return ArrowUpRight;
      case 'negative':
        return ArrowDownRight;
      default:
        return Minus;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const ChangeIcon = getChangeIcon(card.changeType);
        return (
          <Card 
            key={index} 
            className="modern-card-hover group relative overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20 transition-opacity group-hover:opacity-30", card.gradient)} />
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 tracking-wide">{card.title}</h3>
                </div>
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", card.iconBg)}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-3xl font-bold tracking-tight text-balance">
                  {card.value}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-lg text-sm font-medium",
                    card.changeType === 'positive' && "bg-crypto-green/10 text-crypto-green",
                    card.changeType === 'negative' && "bg-crypto-red/10 text-crypto-red",
                    card.changeType === 'neutral' && "bg-muted/50 text-muted-foreground"
                  )}>
                    <ChangeIcon className="w-3 h-3" />
                    <span className="text-balance">{card.change}</span>
                  </div>
                  {card.period && (
                    <span className="text-xs text-muted-foreground/70 font-medium">{card.period}</span>
                  )}
                </div>
              </div>

              {/* Subtle animated border effect */}
              <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
