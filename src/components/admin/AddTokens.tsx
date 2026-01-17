import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CurrencyAdjuster } from './CurrencyAdjuster';
import { useToast } from '@/hooks/use-toast';


type WalletCellProps = {
  goldCoinsBalance: number;
  cadeCoinsBalance: number;
  username: string;
  onSaveGold: (newBalance: number) => void;
  onSaveCade: (newBalance: number) => void;
};
  
const AddTokens: React.FC<WalletCellProps> = ({
  goldCoinsBalance = 0,
  cadeCoinsBalance = 0,
  username,
  onSaveGold,
  onSaveCade,
}) => { 

  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [goldAdjust, setGoldAdjust] = useState<string>('0');
  const [cadeAdjust, setCadeAdjust] = useState<string>('0');

  const newGoldBalance = Number(goldCoinsBalance) + (Number(goldAdjust) || 0);
  const newCadeBalance = Number(cadeCoinsBalance) + (Number(cadeAdjust) || 0);

  const handleSave = () => {
    // Validate that new balances are not negative
    if (newGoldBalance < 0) {
      toast({
        title: 'Invalid Gold Coins Amount',
        description: 'Gold Coins balance cannot be negative',
        variant: 'destructive',
      });
      return;
    }
    
    if (newCadeBalance < 0) {
      toast({
        title: 'Invalid CadeCoins Amount',
        description: 'CadeCoins balance cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    // Check if any changes were made
    if (Number(goldAdjust) === 0 && Number(cadeAdjust) === 0) {
      toast({
        title: 'No Changes',
        description: 'Please adjust at least one currency before saving',
        variant: 'destructive',
      });
      return;
    }

    if (Number(goldAdjust) !== 0) onSaveGold(newGoldBalance);
    if (Number(cadeAdjust) !== 0) onSaveCade(newCadeBalance);
    
    toast({
      title: 'Success',
      description: 'Currency balance updated successfully',
      variant: 'default',
    });
    
    handleClose();
  };

  const handleClose = () => {
    setGoldAdjust('0');
    setCadeAdjust('0');
    setOpen(false);
  };
  
    return (
      <Dialog open={open} onOpenChange={(open) => { setOpen(open); if (!open) handleClose(); }}>
        <DialogTrigger asChild>
            <div className="w-[18px] h-[18px]">
              <img
                src="/icons/wallet.svg"
                className="w-full h-full object-contain"
                alt="wallet"
              />
            </div>
        </DialogTrigger>
  
        <DialogContent className="bg-card text-white sm:rounded-xl px-6 pt-4 pb-6 border-2 border-creator-green" hideCloseButton>
        <DialogClose asChild>
            <button className="text-white bg-secondary w-[90px] h-[44px] rounded-md justify-center text-sm flex items-center">
            <div className="w-[14px] h-[14px] mr-3">
                <img
                    src="/icons/back.svg"
                    className="w-[100%] h-[100%] object-contain cursor-pointer"
                />
            </div>
              Back
            </button>
          </DialogClose>

        <div className="flex items-center justify-between  mt-0">
       

          <h2 className="text-lg font-medium truncate max-w-[180px] capitalize">{username}</h2>

          <Button
            onClick={handleSave}
            className="bg-electric-lime text-black rounded-md text-sm font-bold w-[120px] h-[40px]"
          >
            Save changes
          </Button>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid rgba(25, 29, 36, 1)', margin: '0 0 20px 0' }} />


        <div className="text-center">
          <CurrencyAdjuster
            currencyName="Gold Coins"
            currentBalance={goldCoinsBalance}
            adjustAmount={goldAdjust}
            onAdjustChange={setGoldAdjust}
            newBalance={newGoldBalance}
          />

          <hr style={{ border: 0, borderTop: '1px solid rgba(25, 29, 36, 1)', margin: '20px 0' }} />

          <CurrencyAdjuster
            currencyName="CadeCoins"
            currentBalance={cadeCoinsBalance}
            adjustAmount={cadeAdjust}
            onAdjustChange={setCadeAdjust}
            newBalance={newCadeBalance}
          />
        </div>
      </DialogContent>
      </Dialog>
    );
  };
  
  export default AddTokens;
