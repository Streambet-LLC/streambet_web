import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


type WalletCellProps = {
    currentBalance: number;
    username: string;
    onSave: (newBalance: number) => void;
  };
  
const AddTokens: React.FC<WalletCellProps> = ({
    currentBalance = 0,
    username,
    onSave,
  }) => { 


  const [open, setOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string | any>('0');
  // Always parse as number for calculation
  const parsedAmount = Number(adjustAmount) || 0;
  const newBalance = Number(currentBalance) + parsedAmount;

  const handleSave = () => {
    onSave(newBalance);
    setAdjustAmount(0);
    setOpen(false);
  };

  const handleDialogChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setAdjustAmount(0);
    }
  };
  
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
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
  
        <DialogContent className="bg-[#0D0D0D] text-white sm:rounded-xl px-6 pt-4 pb-6 border-2 border-[#7AFF14]"  hideCloseButton style={{ background: '#0D0D0D',}}>
        <DialogClose asChild>
            <button className="text-white bg-[#272727] w-[90px] h-[44px] rounded-md justify-center text-sm flex items-center">
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
            className="bg-[#BDFF00] text-black  rounded-md text-sm font-bold w-[120px] h-[40px] "
          >
            Save changes
          </Button>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid rgba(25, 29, 36, 1)', margin: '0 0 0px 0' }} />


        <div className="text-center">
          <p className="text-sm font-medium text-[#FFFFFF] mb-3">Adjust balance</p>
          <div className="flex justify-center gap-2 mb-4">
            <Button
              onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) - 100))}
              disabled={parsedAmount < 100}
              className={`bg-[#272727] px-3 text-white py-2 rounded-lg text-sm font-normal ${
                parsedAmount < 100 ? 'opacity-50 cursor-not-allowed' : 'text-white'
                }`}
            >
              -100
            </Button>
            <Button
             onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) - 10))}
             disabled={parsedAmount < 10}
             className={`bg-[#272727] px-3 py-2 rounded-lg text-[#FFFFFF] text-sm font-normal ${
               parsedAmount < 10 ? 'opacity-50 cursor-not-allowed' : 'text-white'
             }`}
            >
              -10
            </Button>
            <input
              placeholder='0'
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
              className="w-[100%]  bg-[#272727] px-3 py-2 rounded-lg text-[#FFFFFF] text-sm font-normal"
            />
            <Button
             onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) + 10))}
              className="bg-[#272727] px-3 py-2 rounded-lg text-[#FFFFFF] text-sm font-normal"
            >
              +10
            </Button>
            <Button
             onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) + 100))}
              className="bg-[#272727] px-3 py-2 rounded-lg text-[#FFFFFF] text-sm font-normal"
            >
              +100
            </Button>
          </div>


          <div className="flex justify-between text-left mb-2">
            <div>
              <p className="text-sm text-[#FFFFFF] font-medium mb-2">Current Balance</p>
              <div className="bg-[#272727] w-[200px] px-3 py-2 rounded h-[35px] text-[#FFFFFF] text-sm font-light">
              <p className="text-sm  font-light">
                {Number(currentBalance)?.toLocaleString('en-US')}
              </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#FFFFFF] font-medium mb-2">New Balance</p>
              <div className="bg-[#272727] w-[200px] px-3 py-2 rounded h-[35px] text-[#FFFFFF] text-sm font-light">
              <p className="text-sm font-light">
                {Number(newBalance) === Number(currentBalance) ? '' : newBalance?.toLocaleString('en-US')}
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
