import { Link, useLocation } from "wouter";
import { 
  TrendingUp, 
  Wallet, 
  Zap, 
  Bell, 
  Link as LinkIcon, 
  BarChart3,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: TrendingUp },
  { name: "Positions", href: "/positions", icon: Wallet },
  { name: "Quick Trade", href: "/trade", icon: Zap },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Exchanges", href: "/exchanges", icon: LinkIcon },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const exchangeStatus = [
  { name: "Binance", status: "connected" },
  { name: "Coinbase", status: "connected" },
  { name: "Kraken", status: "warning" },
  { name: "Bybit", status: "connected" },
  { name: "OKX", status: "disconnected" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">CryptoPortfolio Pro</h1>
        </div>
        
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-8 p-4 bg-sidebar-accent rounded-lg">
          <h3 className="text-sm font-medium text-sidebar-foreground/70 mb-3">Exchange Status</h3>
          <div className="space-y-2">
            {exchangeStatus.map((exchange) => (
              <div key={exchange.name} className="flex items-center justify-between">
                <span className="text-xs text-sidebar-foreground/50">{exchange.name}</span>
                <Circle
                  className={cn(
                    "w-2 h-2",
                    exchange.status === "connected" && "text-crypto-green fill-crypto-green",
                    exchange.status === "warning" && "text-crypto-yellow fill-crypto-yellow",
                    exchange.status === "disconnected" && "text-crypto-red fill-crypto-red"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
