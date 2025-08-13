import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { getMerchantId } from '@/config/coinflow';
import { useCoinFlowWallet } from '@/utils/coinflowWallet';

interface CoinFlowPurchaseProps {
  amount: string;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

// Dynamic import to handle potential dependency issues
const CoinflowPurchase = ({ ...props }: any) => {
  const [Component, setComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('@coinflowlabs/react')
      .then((module) => {
        setComponent(() => module.CoinflowPurchase);
      })
      .catch((err) => {
        console.error('Failed to load CoinFlow component:', err);
        setError('CoinFlow component failed to load');
      });
  }, []);

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-2">CoinFlow component unavailable</p>
        <p className="text-sm text-gray-600">Please try again later or contact support.</p>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Loading CoinFlow component...</p>
      </div>
    );
  }

  return <Component {...props} />;
};

export const CoinFlowPurchaseComponent = ({ 
  amount, 
  isProcessing, 
  onProcessingChange 
}: CoinFlowPurchaseProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuthContext();
  const [showCoinFlow, setShowCoinFlow] = useState(false);
  const wallet = useCoinFlowWallet();

  const handleSuccess = async (data: any) => {
    try {
      toast({
        title: 'Payment Successful!',
        description: `Your deposit of $${amount} has been processed.`,
      });
      
      onProcessingChange(false);
      setShowCoinFlow(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) {
      console.error('Error processing payment success:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  const handlePurchaseClick = () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to proceed.',
        variant: 'destructive',
      });
      return;
    }

    setShowCoinFlow(true);
    onProcessingChange(true);
  };

  if (showCoinFlow) {
    return (
      <div className="w-full" style={{ height: '950px' }}>
        <CoinflowPurchase
          env="sandbox"
          blockchain="solana"
          email={session?.user?.email || ''}
          onSuccess={handleSuccess}
          merchantId={getMerchantId()}
          wallet={wallet}
          // Add additional props that might be needed
          amount={Number(amount)}
          onError={(error: any) => {
            console.error('CoinFlow error:', error);
            toast({
              title: 'Payment Error',
              description: 'There was an error processing your payment. Please try again.',
              variant: 'destructive',
            });
            onProcessingChange(false);
            setShowCoinFlow(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Button
        onClick={handlePurchaseClick}
        disabled={isProcessing || !amount || Number(amount) <= 0}
        className="w-full"
        size="lg"
      >
        Pay with CoinFlow - ${amount}
      </Button>
      
      <div className="text-sm text-muted-foreground text-center">
        Secure payment powered by CoinFlow
      </div>
    </div>
  );
}; 