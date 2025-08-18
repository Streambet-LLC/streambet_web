import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { CoinFlowPurchaseComponent } from '@/components/deposit/CoinFlowPurchase';
import { MainLayout } from '@/components/layout';
import BuyCoins from '@/components/deposit/BuyCoins';

const Deposit = () => {
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const navigate = useNavigate();

  const { session, isFetching } = useAuthContext();

  // Redirect if not logged in
  if (!isFetching && !session) {
    navigate('/login');
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-[584px] space-y-4 mx-auto">
        {depositAmount === 0 ? <BuyCoins setDepositAmount={setDepositAmount} /> :
          <CoinFlowPurchaseComponent
            amount={depositAmount}
            setDepositeAmount={setDepositAmount}
          />
        }
      </div>
    </MainLayout>
  );
};

export default Deposit;
