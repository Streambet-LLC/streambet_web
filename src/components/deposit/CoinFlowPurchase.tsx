import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getMerchantId, getCoinFlowEnv, getSupportedPaymentMethods } from '@/config/coinflow';
import { useNavigate } from 'react-router-dom';
import { CoinflowEnvs, CoinflowPurchase, Currency, SettlementType, ThreeDsChallengePreference } from "@coinflowlabs/react";
import api from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';

interface CoinFlowPurchaseProps {
  amount: number;
  packageId: string;
  setDepositeAmount: (amount: number) => void;
};

export const CoinFlowPurchaseComponent = ({
  amount,
  packageId,
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
      const sessionKeyResult = await api.payment.getSessionKey();
      setSessionKey(sessionKeyResult?.key);
    } catch (error) {
      toast({
        title: 'Error generating session key',
        description: getMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (data: any) => {
    try {
      toast({
        id: 'purchase',
        title: 'Payment Successful!',
        description: `Please wait till we get confirmation from payment provider`,
        duration: 7000,
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
    return (<>
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
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1" />
      </div>
      <div className="w-full" style={{ height: '950px' }}>
        <CoinflowPurchase
          sessionKey={sessionKey}
          merchantId={getMerchantId() || 'streambet'}
          env={getCoinFlowEnv() as CoinflowEnvs || 'sandbox'}
          onSuccess={handleSuccess}
          settlementType={SettlementType.USDC}
          allowedPaymentMethods={getSupportedPaymentMethods()}
          chargebackProtectionData={[{
            productType: 'gameOfSkill',
            productName: `Coins Package ${packageId}`,
            quantity: 1,
            rawProductData: {
              packageId,
              userId: session?.id,
              subtotalCents: Math.floor(amount * 100),
              currency: 'USD',
            }
          }]}
          threeDsChallengePreference={ThreeDsChallengePreference.Challenge}
          subtotal={{
            cents: Math.floor(amount * 100),
            currency: Currency.USD
          }}
          email={session?.email || ''}
          key={`coinflow-${amount}`}
          webhookInfo={{
            env: import.meta.env.VITE_BUGSNAG_SERVER || 'prod',
            user_id: session?.id,
            coin_package_id: packageId,
          }}
        />
      </div>
    </>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
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
