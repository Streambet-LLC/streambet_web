import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletHistory } from '@/components/WalletHistory';
import { HistoryType } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';

const Transactions = ({historyType}: {historyType?: HistoryType}) => {
  const navigate = useNavigate();
  const { session, isFetching } = useAuthContext();

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      const isTransaction = historyType === HistoryType.Transaction;
      navigate(isTransaction ? '/login?redirect=/transactions' : '/login?redirect=/betting-history');
    }
  }, [session, navigate, isFetching, historyType]);

  return (
    <MainLayout>
      {session && <WalletHistory searchUserQuery={''} historyType={historyType} />}
    </MainLayout>
  );
};

export default Transactions;
