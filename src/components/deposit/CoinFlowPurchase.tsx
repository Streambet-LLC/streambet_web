import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getMerchantId, getCoinFlowEnv, getBlockchain } from '@/config/coinflow';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { CoinflowEnvs, CoinflowPurchase, Currency, PaymentMethods } from "@coinflowlabs/react";
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { WalletModalButton } from '@solana/wallet-adapter-react-ui';

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
  const solanaWallet = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();

  // Create a Coinflow-compatible wallet wrapper
  const coinflowWallet = {
    publicKey: solanaWallet.publicKey,
    signTransaction: solanaWallet.signTransaction,
    sendTransaction: async (transaction: Transaction | VersionedTransaction) => {
      if (!solanaWallet.sendTransaction) {
        throw new Error('Wallet does not support sending transactions');
      }
      return await solanaWallet.sendTransaction(transaction, connection);
    },
    signMessage: solanaWallet.signMessage
  };

  useEffect(() => {
    setShowCoinFlow(true);
    if (amount > 0 && !solanaWallet.connected) {
      solanaWallet.connect().catch(console.error);
    }
  }, [amount, solanaWallet])

  const handleSuccess = async (data: any) => {
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

  if (showCoinFlow) {
    return (
      <div className="w-full" style={{ height: '950px' }}>
        {!solanaWallet.connected ? (
            <div className="flex justify-center items-center flex-col text-center space-y-2">
              <WalletModalButton />
              <p className="mt-2 text-sm text-gray-500">
                Connect your wallet to proceed with coin purchase.
              </p>
            </div>
          ) : <CoinflowPurchase
          wallet={coinflowWallet}
          connection={connection}
          env={getCoinFlowEnv() as CoinflowEnvs}
          blockchain='solana'
          email={session?.email || ''}
          onSuccess={handleSuccess}
          merchantId={getMerchantId()}
          subtotal={{
            cents: Math.floor(amount * 100),
            currency: Currency.USD
          }}
          // Force re-render when amount changes
          key={`coinflow-${amount}`}
          allowedPaymentMethods={[PaymentMethods.card]}
        />}
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
        
        <h3 className="text-xl font-semibold">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          To proceed with your purchase coins with ${amount}, please connect your wallet.
        </p>
        
        <button
          onClick={() => solanaWallet.connect().catch(console.error)}
          disabled={solanaWallet.connecting}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {solanaWallet.connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        
        {solanaWallet.wallet && (
          <p className="text-sm text-muted-foreground">
            Selected: {solanaWallet.wallet.adapter.name}
          </p>
        )}
      </div>
    </div>
  );
};