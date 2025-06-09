import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Bell, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Edit,
  Target,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { PortfolioSummary, AlertWithTarget, PositionWithExchange } from "@shared/schema";

const alertSchema = z.object({
  type: z.enum(["price", "portfolio_pnl", "position_pnl", "portfolio_value"]),
  targetType: z.enum(["portfolio", "position", "token"]),
  targetId: z.string().optional(),
  condition: z.enum(["greater_than", "less_than", "change_percent"]),
  threshold: z.string().min(1, "Threshold is required"),
  description: z.string().min(1, "Description is required"),
});

type AlertFormData = z.infer<typeof alertSchema>;

export default function AlertsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<AlertWithTarget[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: positions } = useQuery<PositionWithExchange[]>({
    queryKey: ["/api/positions"],
  });

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      type: "price",
      targetType: "token",
      condition: "greater_than",
      threshold: "",
      description: "",
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: (data: AlertFormData) => apiRequest("/api/alerts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/alerts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/alerts/${id}`, "PATCH", { isActive: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const onSubmit = (data: AlertFormData) => {
    createAlertMutation.mutate(data);
  };

  const getAlertIcon = (alert: AlertWithTarget) => {
    if (alert.isTriggered) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (alert.isActive) {
      return <Activity className="h-4 w-4 text-blue-500" />;
    }
    return <XCircle className="h-4 w-4 text-gray-400" />;
  };

  const getAlertStatus = (alert: AlertWithTarget) => {
    if (alert.isTriggered) return "triggered";
    if (alert.isActive) return "active";
    return "inactive";
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const alertStats = {
    total: alerts?.length || 0,
    active: alerts?.filter(a => a.isActive && !a.isTriggered).length || 0,
    triggered: alerts?.filter(a => a.isTriggered).length || 0,
    inactive: alerts?.filter(a => !a.isActive).length || 0,
  };

  const watchedType = form.watch("type");
  const watchedTargetType = form.watch("targetType");

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header summary={summary} />
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Price & Portfolio Alerts</h1>
              <p className="text-muted-foreground">
                Monitor your portfolio and get notified when conditions are met
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>
                    Set up a new alert to monitor your portfolio or specific positions.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select alert type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="price">Price Alert</SelectItem>
                              <SelectItem value="portfolio_value">Portfolio Value</SelectItem>
                              <SelectItem value="portfolio_pnl">Portfolio P&L</SelectItem>
                              <SelectItem value="position_pnl">Position P&L</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {watchedType === "price" && (
                                <SelectItem value="token">Specific Token</SelectItem>
                              )}
                              {(watchedType === "portfolio_value" || watchedType === "portfolio_pnl") && (
                                <SelectItem value="portfolio">Entire Portfolio</SelectItem>
                              )}
                              {watchedType === "position_pnl" && (
                                <SelectItem value="position">Specific Position</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(watchedTargetType === "token" || watchedTargetType === "position") && (
                      <FormField
                        control={form.control}
                        name="targetId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {watchedTargetType === "token" ? "Token Symbol" : "Position"}
                            </FormLabel>
                            {watchedTargetType === "token" ? (
                              <FormControl>
                                <Input placeholder="e.g., BTC/USDT" {...field} />
                              </FormControl>
                            ) : (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {positions?.map((position) => (
                                    <SelectItem key={position.id} value={position.id.toString()}>
                                      {position.symbol} on {position.exchange.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="change_percent">Percentage Change</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threshold Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="Enter threshold value" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            {watchedType === "price" && "Price in USD"}
                            {watchedType === "portfolio_value" && "Portfolio value in USD"}
                            {(watchedType === "portfolio_pnl" || watchedType === "position_pnl") && "P&L amount or percentage"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief description of this alert" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createAlertMutation.isPending}>
                        {createAlertMutation.isPending ? "Creating..." : "Create Alert"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Alert Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alertStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{alertStats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Triggered</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{alertStats.triggered}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                <XCircle className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{alertStats.inactive}</div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Alerts</CardTitle>
              <CardDescription>
                Manage your price and portfolio monitoring alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getAlertIcon(alert)}
                            <Badge variant={
                              alert.isTriggered ? "secondary" :
                              alert.isActive ? "default" : "outline"
                            }>
                              {getAlertStatus(alert)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {alert.type === "price" && <TrendingUp className="h-4 w-4" />}
                            {alert.type === "portfolio_value" && <Target className="h-4 w-4" />}
                            {(alert.type === "portfolio_pnl" || alert.type === "position_pnl") && (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            <span className="capitalize">
                              {alert.type.replace("_", " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {alert.targetType === "token" && alert.targetId}
                          {alert.targetType === "portfolio" && "Entire Portfolio"}
                          {alert.targetType === "position" && 
                            `Position ${alert.targetId}`
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span className="capitalize">
                              {alert.condition.replace("_", " ")}
                            </span>
                            <span className="font-mono">
                              {formatCurrency(alert.threshold)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{alert.description}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAlertMutation.mutate({
                                id: alert.id,
                                isActive: alert.isActive || false
                              })}
                            >
                              {alert.isActive ? "Pause" : "Resume"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAlertMutation.mutate(alert.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No alerts configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first alert to start monitoring your portfolio
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Alert
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}