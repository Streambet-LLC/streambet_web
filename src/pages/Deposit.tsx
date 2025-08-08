import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AmountInput } from '@/components/deposit/AmountInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { CoinFlowPurchaseComponent } from '@/components/deposit/CoinFlowPurchase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoinFlowWithdrawComponent } from '@/components/deposit/CoinFlowWithdraw';
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

// Mock API function to simulate updating TOS acceptance
const mockUpdateTosAccepted = async (userId: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return success
  return { success: true };
};

const Deposit = () => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositProcessing, setIsDepositProcessing] = useState(false);
  const [isWithdrawProcessing, setIsWithdrawProcessing] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        <h1 className="text-3xl font-bold mb-8">CoinFlow Payment</h1>

        <Card className="max-w-2xl mx-auto p-6 space-y-6">
          <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposit" className="space-y-6">
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
            </TabsContent>
            
            <TabsContent value="withdraw" className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Withdraw Funds</h2>
                <p className="text-muted-foreground">
                  Withdraw your funds using CoinFlow's secure withdrawal system.
                </p>
                
                <AmountInput amount={withdrawAmount} onChange={setWithdrawAmount} disabled={isWithdrawProcessing} />
                
                <CoinFlowWithdrawComponent
                  amount={withdrawAmount}
                  isProcessing={isWithdrawProcessing}
                  onProcessingChange={setIsWithdrawProcessing}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </MainLayout>
  );
};

export default Deposit;
