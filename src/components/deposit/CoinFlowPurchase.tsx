import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getMerchantId, getCoinFlowEnv } from '@/config/coinflow';
import { useNavigate } from 'react-router-dom';
import { CoinflowEnvs, CoinflowPurchase, Currency, SettlementType } from "@coinflowlabs/react";
import { CoinflowService } from '@/services/coinflow';

interface CoinFlowPurchaseProps {
  amount: number;
  setDepositeAmount: (amount: number) => void;
};

export const CoinFlowPurchaseComponent = ({ 
  amount,
  setDepositeAmount,
}: CoinFlowPurchaseProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuthContext();
  const [showCoinFlow, setShowCoinFlow] = useState(false);
  const [sessionKey, setSessionKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (amount > 0) {
      setShowCoinFlow(true);
      generateTokens();
    }
  }, [amount]);

  const generateTokens = async () => {
    if (!session?.email || !session?.id) {
      toast({
        title: 'Error',
        description: 'User session not found. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prepare parameters for token generation
      // const checkoutParams = CoinflowService.prepareCheckoutParams(
      //   amount,
      //   session.email,
      //   session.id
      // );
      
      const sessionParams = CoinflowService.prepareSessionParams(session.id);

      // Generate tokens (these should be called from your backend in production)
      // For now, we'll simulate the process
      const [sessionKeyResult] = await Promise.all([
        // CoinflowService.generateCheckoutJWT(checkoutParams),
        CoinflowService.generateSessionKey(sessionParams)
      ]);
      setSessionKey(sessionKeyResult);
    } catch (error) {
      console.error('Error generating tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const  handleSuccess = async (data: any) => {
    try {
      // { paymentId: "8cdaf1d4-de4a-45ec-96d3-d1c27f3a0e0a" } is the response
      toast({
        title: 'Payment Successful!',
        description: `Your deposit of $${amount} has been processed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/');
    } catch (error) {
      console.error('Error processing payment success:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  if (showCoinFlow && sessionKey) {
    return (
      <div className="w-full" style={{ height: '950px' }}>
        <CoinflowPurchase
          sessionKey="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcklkIjoiMTUzYzBlMjctMDI3MC00NTI0LTllYjQtMzBjZDQ0MDZmYTEzIiwibWVyY2hhbnRJZCI6InN0cmVhbWJldCIsImlhdCI6MTc1NTQ5NDczMywiZXhwIjoxNzU1NTgxMTMzfQ.xQaCGdt3XYhymPkAqUfSc4qWbFn-lwW4YFguPtZm1UQ"
          merchantId={getMerchantId()}
          env={getCoinFlowEnv() as CoinflowEnvs}
          onSuccess={handleSuccess}
          settlementType={SettlementType.USDC}
          subtotal={{
            cents: Math.floor(amount * 100),
            currency: Currency.USD
          }}
          email={session?.email || ''}
          // Force re-render when amount changes
          key={`coinflow-${amount}`}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDepositeAmount(0)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex-1" />
        </div>
        
        <h3 className="text-xl font-semibold">Processing Payment</h3>
        <p className="text-muted-foreground">
          Initializing payment for ${amount} worth of coins...
        </p>
        
        {isLoading && (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="text-sm text-muted-foreground">
              Setting up secure payment...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
