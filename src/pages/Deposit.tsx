import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AmountInput } from '@/components/deposit/AmountInput';
import { useAuthContext } from '@/contexts/AuthContext';
import { CoinFlowPurchaseComponent } from '@/components/deposit/CoinFlowPurchase';
import { MainLayout } from '@/components/layout';

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

const Deposit = () => {
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositProcessing, setIsDepositProcessing] = useState(false);
  const navigate = useNavigate();

  const { session } = useAuthContext();

  // Redirect if not logged in
  if (!session) {
    navigate('/login');
    return null;
  }

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold mb-8">Deposit Funds</h1>

      <Card className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Deposit Funds</h2>
          <p className="text-muted-foreground">
            Add funds to your account using CoinFlow's secure payment system.
          </p>
          
          <AmountInput amount={depositAmount} onChange={setDepositAmount} disabled={isDepositProcessing} />
          
          <CoinFlowPurchaseComponent
            amount={depositAmount}
            isProcessing={isDepositProcessing}
            onProcessingChange={setIsDepositProcessing}
          />
        </div>
      </Card>
    </MainLayout>
  );
};

export default Deposit;
