import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { AmountInput } from '@/components/deposit/AmountInput';
import { PayPalButtonsWrapper } from '@/components/deposit/PayPalButtons';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const Deposit = () => {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: paypalConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['paypal-config'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('paypal', {
        body: { action: 'get_client_id' },
      });

      if (error) throw error;
      return data;
    },
  });

  const handleCreateOrder = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('paypal', {
        body: {
          action: 'create_order',
          amount: Number(amount),
        },
      });

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      throw error;
    }
  };

  const handleCaptureOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.functions.invoke('paypal', {
        body: {
          action: 'capture_order',
          orderId,
        },
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast({
        title: 'Success',
        description: 'Payment completed successfully!',
      });

      setAmount('');
    } catch (error) {
      console.error('Error capturing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect if not logged in
  if (!session) {
    navigate('/login');
    return null;
  }

  const handleAcceptTos = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tos_accepted: true })
        .eq('id', session.user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast({
        title: 'Terms of Service Accepted',
        description: 'You can now proceed with your deposit.',
      });
    } catch (error) {
      console.error('Error accepting TOS:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept Terms of Service. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!profile?.tos_accepted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container pt-24 pb-8">
          <h1 className="text-3xl font-bold mb-8">Accept Terms of Service</h1>

          <Card className="max-w-md mx-auto p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tos"
                  checked={acceptTos}
                  onCheckedChange={checked => setAcceptTos(checked as boolean)}
                />
                <Label htmlFor="tos">
                  I accept the Terms of Service and confirm that I am at least 21 years old
                </Label>
              </div>

              <Button onClick={handleAcceptTos} disabled={!acceptTos} className="w-full">
                Accept and Continue
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoadingConfig) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container pt-24 pb-8">
          <h1 className="text-3xl font-bold mb-8">Deposit Funds</h1>
          <Card className="max-w-md mx-auto p-6">
            <p>Loading payment options...</p>
          </Card>
        </main>
      </div>
    );
  }

  if (!paypalConfig?.clientId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container pt-24 pb-8">
          <h1 className="text-3xl font-bold mb-8">Deposit Funds</h1>
          <Card className="max-w-md mx-auto p-6">
            <p>Error loading payment options. Please try again later.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-8">Deposit Funds</h1>

        <Card className="max-w-md mx-auto p-6 space-y-6">
          <AmountInput amount={amount} onChange={setAmount} disabled={isProcessing} />

          <PayPalScriptProvider
            options={{
              clientId: paypalConfig.clientId,
              currency: 'USD',
              intent: 'capture',
              components: 'buttons',
            }}
          >
            <PayPalButtonsWrapper
              amount={amount}
              isProcessing={isProcessing}
              onCreateOrder={handleCreateOrder}
              onCaptureOrder={handleCaptureOrder}
            />
          </PayPalScriptProvider>
        </Card>
      </main>
    </div>
  );
};

export default Deposit;
