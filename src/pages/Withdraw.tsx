import { Card } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AmountInput } from '@/components/deposit/AmountInput';
import { useAuthContext } from '@/contexts/AuthContext';
import { CoinFlowWithdrawComponent } from '@/components/deposit/CoinFlowWithdraw';
import { MainLayout } from '@/components/layout';
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

// Mock API function to simulate profile data
const mockGetProfile = async (userId: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock profile data
  return {
    id: userId,
    email: 'user@example.com',
    tos_accepted: true,
    wallet_balance: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

const Withdraw = () => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawProcessing, setIsWithdrawProcessing] = useState(false);
  const navigate = useNavigate();
  const endpoint = "https://api.devnet.solana.com"; // Sandbox/devnet endpoint
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const { session } = useAuthContext();

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      return await mockGetProfile(session!.user.id);
    },
  });

  // Redirect if not logged in
  if (!session) {
    navigate('/login');
    return null;
  }

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold mb-8">Withdraw Funds</h1>

      <Card className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Withdraw Funds</h2>
          <p className="text-muted-foreground">
            Withdraw your funds using CoinFlow's secure withdrawal system.
          </p>
          
          <AmountInput amount={withdrawAmount} onChange={setWithdrawAmount} disabled={isWithdrawProcessing} />
          
          <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>
                <CoinFlowWithdrawComponent
                  amount={withdrawAmount}
                  isProcessing={isWithdrawProcessing}
                  onProcessingChange={setIsWithdrawProcessing}
                />
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </div>
      </Card>
    </MainLayout>
  );
};

export default Withdraw;
