import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Circle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AlertWithTarget } from "@shared/schema";

interface AlertsPanelProps {
  alerts?: AlertWithTarget[];
  isLoading: boolean;
}

export function AlertsPanel({ alerts, isLoading }: AlertsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteAlert = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert deleted",
        description: "Alert has been successfully deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive",
      });
    },
  });

  const getAlertStatus = (alert: AlertWithTarget) => {
    if (alert.isTriggered) return 'triggered';
    if (!alert.isActive) return 'inactive';
    return 'active';
  };

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'triggered':
        return 'text-crypto-red';
      case 'active':
        return 'text-crypto-green';
      case 'inactive':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatAlertDescription = (alert: AlertWithTarget) => {
    const target = alert.targetName || alert.targetId || alert.targetType;
    const condition = alert.condition === 'greater_than' ? '>' : '<';
    return `${target} ${condition} ${alert.threshold}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="w-6 h-6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAlerts = alerts?.filter(alert => alert.isActive) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Alerts</CardTitle>
        <Button size="sm" className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" />
          Add Alert
        </Button>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No active alerts
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => {
              const status = getAlertStatus(alert);
              const statusColor = getAlertStatusColor(status);
              
              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.isTriggered ? 'bg-destructive/10 border border-destructive/20' : 'bg-accent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Circle className={`w-2 h-2 ${statusColor} fill-current`} />
                    <div>
                      <div className="font-medium text-sm">
                        {formatAlertDescription(alert)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alert.type.replace('_', ' ').charAt(0).toUpperCase() + alert.type.replace('_', ' ').slice(1)} • {alert.targetType} level
                      </div>
                      {alert.isTriggered && (
                        <div className="text-xs text-crypto-red font-medium mt-1">
                          TRIGGERED
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAlert.mutate(alert.id)}
                    disabled={deleteAlert.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
