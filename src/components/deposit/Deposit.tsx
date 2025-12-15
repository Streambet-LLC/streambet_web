import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { CoinFlowPurchaseComponent } from '@/components/deposit/CoinFlowPurchase';
import BuyCoins from '@/components/deposit/BuyCoins';
import { Dialog, DialogClose, DialogContent, DialogHeader } from '../ui/dialog';
import { useDepositContext } from '@/contexts/DepositContext';

const Deposit = () => {
  const [packageId, setPackageId] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const { open, setOpen } = useDepositContext();

  const { session, isFetching } = useAuthContext();

  const handleClose = () => {
    setDepositAmount(0);
    setOpen(false);
  };

  // Redirect if not logged in
  if (!isFetching && !session) {
    return null;
  }

  if (!open) return;

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogHeader>
        <DialogClose />
      </DialogHeader>
      <DialogContent className='max-h-[90vh] overflow-auto'>
        {depositAmount === 0 ? <BuyCoins 
          setDepositAmount={setDepositAmount}
          setPackageId={setPackageId}
        /> :
          <CoinFlowPurchaseComponent
            packageId={packageId}
            amount={depositAmount}
            setDepositeAmount={setDepositAmount}
            onClose={handleClose}
          />
        }
      </DialogContent>
    </Dialog>
  );
};

export default Deposit;
