import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, Layers, Bell } from "lucide-react";
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
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              No portfolio data available
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
    },
    {
      title: "Total P&L",
      value: formatCurrency(summary.totalPnl),
      change: formatPercent(summary.totalPnlPercent),
      changeType: parseFloat(summary.totalPnl) >= 0 ? 'positive' : 'negative',
      period: "All time",
      icon: TrendingUp,
    },
    {
      title: "Active Positions",
      value: summary.activePositions.toString(),
      change: "Across 5 exchanges",
      changeType: 'neutral' as const,
      period: "",
      icon: Layers,
    },
    {
      title: "Active Alerts",
      value: summary.activeAlerts.toString(),
      change: `${summary.triggeredAlerts} triggered`,
      changeType: summary.triggeredAlerts > 0 ? 'negative' : 'neutral',
      period: "today",
      icon: Bell,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-1">{card.value}</div>
            <div className="flex items-center text-sm">
              <span className={`${
                card.changeType === 'positive' ? 'text-crypto-green' : 
                card.changeType === 'negative' ? 'text-crypto-red' : 
                'text-muted-foreground'
              } mr-1`}>
                {card.change}
              </span>
              {card.period && (
                <span className="text-muted-foreground ml-1">{card.period}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
