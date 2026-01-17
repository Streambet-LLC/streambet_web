import React from 'react';
import { Button } from '@/components/ui/button';

interface CurrencyAdjusterProps {
  currencyName: string;
  currentBalance: number;
  adjustAmount: string;
  onAdjustChange: (value: string) => void;
  newBalance: number;
}

export const CurrencyAdjuster: React.FC<CurrencyAdjusterProps> = ({
  currencyName,
  currentBalance,
  adjustAmount,
  onAdjustChange,
  newBalance,
}) => {
  const parsedAmount = Number(adjustAmount) || 0;

  return (
    <>
      <p className="text-sm font-medium text-white mb-3">Adjust {currencyName} Balance</p>
      <div className="flex justify-center gap-2 mb-4">
        <Button
          onClick={() => onAdjustChange(String(parsedAmount - 100))}
          disabled={currentBalance + parsedAmount - 100 < 0}
          className={`bg-secondary px-3 text-white py-2 rounded-lg text-sm font-normal ${
            currentBalance + parsedAmount - 100 < 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          -100
        </Button>
        <Button
          onClick={() => onAdjustChange(String(parsedAmount - 10))}
          disabled={currentBalance + parsedAmount - 10 < 0}
          className={`bg-secondary px-3 py-2 rounded-lg text-white text-sm font-normal ${
            currentBalance + parsedAmount - 10 < 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          -10
        </Button>
        <input
          placeholder='0'
          value={adjustAmount}
          onChange={e => onAdjustChange(e.target.value)}
          className="w-[100%] bg-secondary px-3 py-2 rounded-lg text-white text-sm font-normal"
        />
        <Button
          onClick={() => onAdjustChange(String(parsedAmount + 10))}
          className="bg-secondary px-3 py-2 rounded-lg text-white text-sm font-normal"
        >
          +10
        </Button>
        <Button
          onClick={() => onAdjustChange(String(parsedAmount + 100))}
          className="bg-secondary px-3 py-2 rounded-lg text-white text-sm font-normal"
        >
          +100
        </Button>
      </div>

      <div className="flex justify-between text-left mb-4">
        <div>
          <p className="text-sm text-white font-medium mb-2">Current Balance</p>
          <div className="bg-secondary w-[200px] px-3 py-2 rounded h-[35px] text-white text-sm font-light">
            <p className="text-sm font-light">
              {Number(currentBalance)?.toLocaleString('en-US')}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm text-white font-medium mb-2">New Balance</p>
          <div className="bg-secondary w-[200px] px-3 py-2 rounded h-[35px] text-white text-sm font-light">
            <p className="text-sm font-light">
              {Number(newBalance) === Number(currentBalance) ? '' : newBalance?.toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
