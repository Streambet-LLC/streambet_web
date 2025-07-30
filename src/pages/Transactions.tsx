import { Navigation } from '@/components/Navigation';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletHistory } from '@/components/WalletHistory';
import { CurrencyType } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';

const Transactions = ({currencyType}: {currencyType?: CurrencyType}) => {
  const navigate = useNavigate();
  const { session, isFetching } = useAuthContext();

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      const isTransaction = currencyType === CurrencyType.STREAM_COINS;
      navigate(isTransaction ? '/login?redirect=/transactions' : '/login?redirect=/betting-history');
    }
  }, [session, navigate, isFetching, currencyType]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container pt-24 pb-8">
        {session && <WalletHistory searchUserQuery={''} currencyType={currencyType} />}
      </main>
    </div>
  );
};

export default Transactions;
