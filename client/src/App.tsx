import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import ExchangesPage from "@/pages/exchanges";
import AnalyticsPage from "@/pages/analytics";
import AlertsPage from "@/pages/alerts";
import TradePage from "@/pages/trade";
import PositionsPage from "@/pages/positions";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/positions" component={PositionsPage} />
      <Route path="/trade" component={TradePage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/exchanges" component={ExchangesPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
