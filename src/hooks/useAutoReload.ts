import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';

interface AutoReloadSettings {
  enabled: boolean;
  amount: number; // The amount to reload when balance is low
  threshold: number; // The threshold below which to trigger auto-reload
}

const DEFAULT_SETTINGS: AutoReloadSettings = {
  enabled: false,
  amount: 10, // Default to $10
  threshold: 5, // Trigger when balance is below $5
};

export function useAutoReload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutoReloadSettings>(DEFAULT_SETTINGS);

  // Get saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('autoReloadSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error parsing auto-reload settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: AutoReloadSettings) => {
    localStorage.setItem('autoReloadSettings', JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  // Get wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      return api.wallet.getBalance();
    },
  });

  // Check if the user has a payment method saved
  const { data: hasPaymentMethod } = useQuery({
    queryKey: ['has-payment-method'],
    queryFn: async () => {
      try {
        // This would be an endpoint to check if the user has a payment method saved
        const response = await api.wallet.hasPaymentMethod();
        return response.hasPaymentMethod;
      } catch (error) {
        // If the endpoint doesn't exist yet, assume no payment method
        return false;
      }
    },
    // Only run this query if auto-reload is enabled
    enabled: settings.enabled,
  });

  // Mutation for processing auto-reload
  const autoReloadMutation = useMutation({
    mutationFn: async (amount: number) => {
      // This would be an endpoint to process auto-reload
      return api.wallet.processAutoReload(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      toast({
        title: 'Auto-Reload Successful',
        description: `Your wallet has been topped up with $${settings.amount}.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Auto-Reload Failed',
        description: error.message || 'Failed to process auto-reload. Please try manually.',
      });

      // Disable auto-reload on failure to prevent repeated errors
      saveSettings({ ...settings, enabled: false });
    },
  });

  // Function to check if auto-reload is needed for a bet
  const checkAutoReloadForBet = async (betAmount: number) => {
    if (!settings.enabled || !hasPaymentMethod) return false;

    const balance = wallet?.balance || 0;

    if (balance < betAmount && balance < settings.threshold) {
      try {
        // Process auto-reload
        await autoReloadMutation.mutateAsync(settings.amount);
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  };

  return {
    settings,
    saveSettings,
    hasPaymentMethod: !!hasPaymentMethod,
    isAutoReloading: autoReloadMutation.isPending,
    checkAutoReloadForBet,
  };
}
