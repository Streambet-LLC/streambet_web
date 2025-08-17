import { Card } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { CoinFlowPurchaseComponent } from '@/components/deposit/CoinFlowPurchase';
import { MainLayout } from '@/components/layout';
import BuyCoins from '@/components/deposit/BuyCoins';
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

const Deposit = () => {
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const navigate = useNavigate();
  const endpoint = "https://api.devnet.solana.com"; // Sandbox/devnet endpoint
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const { session } = useAuthContext();

  // Redirect if not logged in
  if (!session) {
    navigate('/login');
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-[584px] space-y-4 mx-auto">
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {depositAmount === 0 ? <BuyCoins setDepositAmount={setDepositAmount} /> :
                <CoinFlowPurchaseComponent
                  amount={depositAmount}
                  setDepositeAmount={setDepositAmount}
                />
              }
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </div>
    </MainLayout>
  );
};

export default Deposit;
