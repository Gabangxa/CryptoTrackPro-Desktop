import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        
        // Subscribe to market data updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe_market_data'
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connection':
              console.log('WebSocket connection confirmed:', data.data);
              break;
              
            case 'market_update':
              // Invalidate and refetch relevant queries
              queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
              queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/market-data'] });
              break;
              
            case 'order_update':
              // Invalidate order-related queries
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
              
              toast({
                title: 'Order Update',
                description: `Order ${data.data.status}`,
              });
              break;
              
            case 'alert_triggered':
              // Handle alert notifications
              queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
              
              toast({
                title: 'Alert Triggered',
                description: data.data.description,
                variant: 'destructive',
              });
              break;
              
            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          toast({
            title: 'Connection Lost',
            description: 'Unable to connect to real-time updates. Please refresh the page.',
            variant: 'destructive',
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send: (data: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    },
  };
}
