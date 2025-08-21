import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletHistory } from '@/components/WalletHistory';
import { CurrencyType } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';

const Transactions = ({currencyType}: {currencyType?: CurrencyType}) => {
  const navigate = useNavigate();
  const { session, isFetching } = useAuthContext();

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      const isTransaction = currencyType === CurrencyType.SWEEP_COINS;
      navigate(isTransaction ? '/login?redirect=/transactions' : '/login?redirect=/betting-history');
    }
  }, [session, navigate, isFetching, currencyType]);

  return (
    <MainLayout>
      {session && <WalletHistory searchUserQuery={''} currencyType={currencyType} />}
    </MainLayout>
  );
};

export default Transactions;
