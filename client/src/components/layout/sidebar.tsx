import { Link, useLocation } from "wouter";
import { 
  TrendingUp, 
  Wallet, 
  Zap, 
  Bell, 
  Link as LinkIcon, 
  BarChart3,
  Circle,
  Sparkles
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
  { name: "KuCoin", status: "connected" },
  { name: "Bybit", status: "warning" },
  { name: "Coinbase", status: "connected" },
  { name: "OKX", status: "disconnected" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/50 flex-shrink-0 glass-subtle animate-fade-in">
      <div className="p-6 scrollbar-modern">
        {/* Modern Logo Section */}
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-crypto-blue rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gradient leading-tight">CryptoTrack</h1>
            <span className="text-xs text-muted-foreground font-medium">Pro Desktop</span>
          </div>
        </div>
        
        {/* Navigation with Modern Styling */}
        <nav className="space-y-1">
          {navigation.map((item, index) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center space-x-3 px-4 py-3 rounded-xl transition-smooth relative overflow-hidden",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-crypto-blue/10 text-primary shadow-md border border-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:shadow-sm"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-smooth group-hover:scale-110",
                  isActive && "text-primary"
                )} />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Modern Exchange Status */}
        <div className="mt-8 p-5 bg-gradient-to-br from-sidebar-accent/30 to-sidebar-accent/10 rounded-xl border border-sidebar-border/30 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-sidebar-foreground">Exchange Status</h3>
          </div>
          <div className="space-y-3">
            {exchangeStatus.map((exchange, index) => (
              <div 
                key={exchange.name} 
                className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/20 hover:bg-sidebar-accent/30 transition-smooth"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-sm text-sidebar-foreground/80 font-medium">{exchange.name}</span>
                <div className="flex items-center space-x-2">
                  <Circle
                    className={cn(
                      "w-2 h-2 transition-smooth",
                      exchange.status === "connected" && "text-crypto-green fill-crypto-green animate-pulse",
                      exchange.status === "warning" && "text-crypto-yellow fill-crypto-yellow",
                      exchange.status === "disconnected" && "text-crypto-red fill-crypto-red"
                    )}
                  />
                  <span className={cn(
                    "text-xs font-medium capitalize",
                    exchange.status === "connected" && "text-crypto-green",
                    exchange.status === "warning" && "text-crypto-yellow", 
                    exchange.status === "disconnected" && "text-crypto-red"
                  )}>
                    {exchange.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modern Footer */}
        <div className="mt-8 pt-4 border-t border-sidebar-border/30">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Real-time portfolio tracking
            </p>
            <div className="flex justify-center mt-2 space-x-1">
              <div className="w-1 h-1 bg-crypto-green rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-crypto-blue rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="w-1 h-1 bg-crypto-purple rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
