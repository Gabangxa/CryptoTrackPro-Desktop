import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { OverviewCards } from "@/components/portfolio/overview-cards";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { QuickOrder } from "@/components/trading/quick-order";
import { AlertsPanel } from "@/components/alerts/alerts-panel";
import { ExchangeStatus } from "@/components/exchanges/exchange-status";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  // Connect to WebSocket for real-time updates
  useWebSocket();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ["/api/positions"],
  });

  const { data: exchanges, isLoading: exchangesLoading } = useQuery({
    queryKey: ["/api/exchanges"],
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/alerts"],
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header summary={summary} />
        
        <div className="p-6 space-y-6">
          <OverviewCards summary={summary} isLoading={summaryLoading} />
          
          <ExchangeStatus exchanges={exchanges} isLoading={exchangesLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PositionsTable positions={positions} isLoading={positionsLoading} />
            </div>
            
            <div className="space-y-6">
              <QuickOrder exchanges={exchanges} />
              <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
