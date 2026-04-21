import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';
import PurchaseTransactionHistory from '@/components/PurchaseTransactionHistory';
import ShopPurchaseTransactionHistory from '@/components/ShopPurchaseTransactionHistory';
import GlobalSalesHistory from '@/components/GlobalSalesHistory';
import CadeCoinHistory from '@/components/CadeCoinHistory';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import LeaveReviewDialog from '@/components/reviews/LeaveReviewDialog';

const Transactions = () => {
  const navigate = useNavigate();
  const { session, isFetching } = useAuthContext();
  const [activeTab, setActiveTab] = useState('purchases');
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      navigate('/login?redirect=/transactions');
    }
  }, [session, navigate, isFetching]);

  // Honor ?leave=<orderId> to auto-open the review dialog (used by the
  // reminder emails). Strip the param once consumed.
  useEffect(() => {
    const leave = searchParams.get('leave');
    if (session && leave) {
      setReviewOrderId(leave);
      const next = new URLSearchParams(searchParams);
      next.delete('leave');
      setSearchParams(next, { replace: true });
    }
  }, [session, searchParams, setSearchParams]);

  const openReview = (orderId: string) => setReviewOrderId(orderId);

  const tabs = [
    { key: 'purchases', label: 'My Purchases' },
    ...(session?.isSeller ? [{ key: 'sales', label: 'My Sales' }] : []),
    { key: 'cadecoins', label: 'My CadeCoins' },
    {
      key: 'global',
      label: 'Public Sales',
      tooltip: 'All transactions for all users on CardCade.',
    },
  ];

  return (
    <MainLayout>
      {session && (
        <>
          <TabSwitch tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} scrollable />
          {activeTab === 'purchases' && <PurchaseTransactionHistory onOpenReview={openReview} />}
          {activeTab === 'sales' && <ShopPurchaseTransactionHistory onOpenReview={openReview} />}
          {activeTab === 'global' && <GlobalSalesHistory />}
          {activeTab === 'cadecoins' && <CadeCoinHistory />}
          <LeaveReviewDialog
            open={!!reviewOrderId}
            orderId={reviewOrderId}
            onOpenChange={open => {
              if (!open) setReviewOrderId(null);
            }}
            invalidateQueryKeys={[['my-reviewable-orders']]}
          />
        </>
      )}
    </MainLayout>
  );
};

export default Transactions;
