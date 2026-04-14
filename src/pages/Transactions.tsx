import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';
import PurchaseTransactionHistory from '@/components/PurchaseTransactionHistory';
import ShopPurchaseTransactionHistory from '@/components/ShopPurchaseTransactionHistory';
import GlobalSalesHistory from '@/components/GlobalSalesHistory';
import CadeCoinHistory from '@/components/CadeCoinHistory';
import { TabSwitch } from '@/components/navigation/TabSwitch';

const Transactions = () => {
  const navigate = useNavigate();
  const { session, isFetching } = useAuthContext();
  const [activeTab, setActiveTab] = useState('purchases');

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      navigate('/login?redirect=/transactions');
    }
  }, [session, navigate, isFetching]);

  const tabs = [
    { key: 'purchases', label: 'My Purchases' },
    ...(session?.isSeller ? [{ key: 'sales', label: 'My Sales' }] : []),
    { key: 'cadecoins', label: 'My CadeCoins' },
    { key: 'global', label: 'Public Sales', tooltip: 'All transactions for all users on CardCade.' },
  ];

  return (
    <MainLayout>
      {session && (
        <>
          <TabSwitch tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} scrollable />
          {activeTab === 'purchases' && <PurchaseTransactionHistory />}
          {activeTab === 'sales' && <ShopPurchaseTransactionHistory />}
          {activeTab === 'global' && <GlobalSalesHistory />}
          {activeTab === 'cadecoins' && <CadeCoinHistory />}
        </>
      )}
    </MainLayout>
  );
};

export default Transactions;
