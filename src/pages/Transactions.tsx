import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletHistory } from '@/components/WalletHistory';
import { HistoryType } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';
import PurchaseTransactionHistory from '@/components/PurchaseTransactionHistory';
import ShopPurchaseTransactionHistory from '@/components/ShopPurchaseTransactionHistory';
import { TabSwitch } from '@/components/navigation/TabSwitch';

const Transactions = ({ historyType }: { historyType?: HistoryType }) => {
  const navigate = useNavigate();
  const { session, isFetching } = useAuthContext();
  const [activeTab, setActiveTab] = useState('transactions');

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      const isTransaction = historyType === HistoryType.Transaction;
      navigate(
        isTransaction ? '/login?redirect=/transactions' : '/login?redirect=/betting-history'
      );
    }
  }, [session, navigate, isFetching, historyType]);

  const tabs = [
    { key: 'transactions', label: 'Transaction History' },
    { key: 'my-orders', label: 'My Purchases/Prize History' },
    ...(session.isSeller ? [{ key: 'shop-orders', label: 'Shop Purchase History' }] : []),
  ];

  return (
    <MainLayout>
      {session && (
        <>
          <TabSwitch tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
          {activeTab === 'transactions' && (
            <WalletHistory searchUserQuery={''} historyType={historyType} />
          )}
          {activeTab === 'my-orders' && <PurchaseTransactionHistory />}
          {activeTab === 'shop-orders' && <ShopPurchaseTransactionHistory />}
        </>
      )}
    </MainLayout>
  );
};

export default Transactions;
