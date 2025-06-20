import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

type WalletCellProps = {
    currentBalance: number;
    username: string;
    onSave: (newBalance: number) => void;
  };
  
const AddTokens: React.FC<WalletCellProps> = ({
    currentBalance,
    username,
    onSave,
  }) => { 


  const [open, setOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string | any>('0');
  const parsedAmount = parseInt(adjustAmount) || 0;
  const newBalance = currentBalance + parsedAmount;

  const handleSave = () => {
    onSave(newBalance);
    setAdjustAmount(0);
    setOpen(false);
  };
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <div className="w-[18px] h-[18px]">
              <img
                src="/icons/wallet.svg"
                className="w-full h-full object-contain"
                alt="wallet"
                onClick={() => setOpen(true)}
              />
            </div>
        </DialogTrigger>
  
        <DialogContent className="bg-[#121212] text-white sm:rounded-xl px-6 pt-4 pb-6"  hideCloseButton>
        <DialogClose asChild>
            <button className="text-white bg-[#272727] w-[94px] h-[44px] rounded-md justify-center text-sm flex items-center">
            <div className="w-[14px] h-[14px] mr-2">
                <img
                    src="/icons/back.svg"
                    className="w-[100%] h-[100%] object-contain cursor-pointer"
                />
            </div>
              Back
            </button>
          </DialogClose>

        <div className="flex items-center justify-between mb-4 mt-6">
       

          <h2 className="text-lg font-medium">{username}</h2>

          <Button
            onClick={handleSave}
            className="bg-[#BDFF00] text-black  rounded-md text-sm font-bold w-[120px] h-[40px] "
          >
            Save changes
          </Button>
        </div>


        <div className="text-center">
          <p className="text-sm font-medium text-[#FFFFFF] mb-3">Adjust balance</p>
          <div className="flex justify-center gap-2 mb-4">
            <Button
              onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) - 100))}
              disabled={parsedAmount < 100}
              className={`bg-[#272727] px-3 text-white py-2 rounded text-sm font-normal ${
                parsedAmount < 100 ? 'opacity-50 cursor-not-allowed' : 'text-white'
                }`}
            >
              -100
            </Button>
            <Button
             onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) - 10))}
             disabled={parsedAmount < 10}
             className={`bg-[#272727] px-3 py-2 rounded text-[#FFFFFF] text-sm font-normal ${
               parsedAmount < 10 ? 'opacity-50 cursor-not-allowed' : 'text-white'
             }`}
            >
              -10
            </Button>
            <input
              placeholder='0'
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
              className="w-[100%]  bg-[#272727] px-3 py-2 rounded text-[#FFFFFF] text-sm font-normal"
            />
            <Button
             onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) + 10))}
              className="bg-[#272727] px-3 py-2 rounded text-[#FFFFFF] text-sm font-normal"
            >
              +10
            </Button>
            <Button
             onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) + 100))}
              className="bg-[#272727] px-3 py-2 rounded text-[#FFFFFF] text-sm font-normal"
            >
              +100
            </Button>
          </div>


          <div className="flex justify-between text-left mb-2">
            <div>
              <p className="text-sm text-[#FFFFFF] font-medium mb-2">Current Balance</p>
              <div className="bg-[#272727] w-[200px] px-3 py-2 rounded text-[#FFFFFF] text-sm font-normal">
              <p className="text-sm  font-normal">
                {currentBalance}
              </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#FFFFFF] font-medium mb-2">New Balance</p>
              <div className="bg-[#272727] w-[200px] px-3 py-2 rounded text-[#FFFFFF] text-sm font-normal">
              <p className="text-sm font-normal">
                {newBalance}
              </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    );
  };
  
  export default AddTokens;
  