import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Settings, Trash2, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Exchange } from "@shared/schema";

interface ExchangeConfigProps {
  exchange: Exchange;
}

export function ExchangeConfig({ exchange }: ExchangeConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: "",
    apiSecret: "",
    passphrase: "",
    sandboxMode: false,
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCredentialsMutation = useMutation({
    mutationFn: async (credentials: typeof formData) => {
      return await apiRequest(`/api/exchanges/${exchange.id}/credentials`, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchanges"] });
      toast({
        title: "Credentials Updated",
        description: `Successfully connected to ${exchange.displayName}`,
      });
      setIsOpen(false);
      setFormData({ apiKey: "", apiSecret: "", passphrase: "", sandboxMode: false });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message || "Failed to update credentials",
      });
    },
  });

  const removeCredentialsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/exchanges/${exchange.id}/credentials`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchanges"] });
      toast({
        title: "Credentials Removed",
        description: `Disconnected from ${exchange.displayName}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove credentials",
      });
    },
  });

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await apiRequest(`/api/exchanges/${exchange.id}/test`, {
        method: "POST",
      });
      
      if (response.connected) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${exchange.displayName}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: response.error || "Unable to connect to exchange",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCredentialsMutation.mutate(formData);
  };

  const getConnectionStatus = () => {
    if (exchange.isConnected) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Connected
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl">{exchange.displayName}</CardTitle>
          <CardDescription>
            Configure API credentials for {exchange.displayName}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {getConnectionStatus()}
          {exchange.isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={isTestingConnection}
            >
              <TestTube className="w-4 h-4 mr-1" />
              {isTestingConnection ? "Testing..." : "Test"}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">API Connection</p>
              <p className="text-sm text-muted-foreground">
                {exchange.isConnected 
                  ? "Your API credentials are configured and active"
                  : "Connect your exchange account to enable trading and real-time data"
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              {exchange.isConnected ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeCredentialsMutation.mutate()}
                  disabled={removeCredentialsMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Settings className="w-4 h-4 mr-1" />
                      Connect
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Connect to {exchange.displayName}</DialogTitle>
                      <DialogDescription>
                        Enter your {exchange.displayName} API credentials to enable trading and real-time data.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          value={formData.apiKey}
                          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="Enter your API key"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="apiSecret">API Secret</Label>
                        <Input
                          id="apiSecret"
                          type="password"
                          value={formData.apiSecret}
                          onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                          placeholder="Enter your API secret"
                          required
                        />
                      </div>
                      
                      {exchange.name === "kucoin" && (
                        <div className="space-y-2">
                          <Label htmlFor="passphrase">Passphrase</Label>
                          <Input
                            id="passphrase"
                            type="password"
                            value={formData.passphrase}
                            onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                            placeholder="Enter your passphrase"
                            required
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="sandboxMode"
                          checked={formData.sandboxMode}
                          onCheckedChange={(checked) => setFormData({ ...formData, sandboxMode: checked })}
                        />
                        <Label htmlFor="sandboxMode">Use Sandbox/Testnet Mode</Label>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateCredentialsMutation.isPending}
                        >
                          {updateCredentialsMutation.isPending ? "Connecting..." : "Connect"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          {exchange.isConnected && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1">
                <p className="text-sm font-medium">Sandbox Mode</p>
                <p className="text-sm text-muted-foreground">
                  {exchange.sandboxMode ? "Enabled" : "Disabled"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Account Types</p>
                <div className="flex flex-wrap gap-1">
                  {exchange.supportedAccountTypes?.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}