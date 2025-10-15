import { Button } from '@/components/ui/button';
import { Banknote, BanknoteArrowUp, Coins, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { CurrencyType } from '@/enums';
import { useEffect } from 'react';

interface WalletDropdownProps {
  walletBalance: number;
}

export const WalletDropdown = ({ walletBalance }: WalletDropdownProps) => {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrencyContext();

  const handleSwitchChange = (checked: boolean) => {
    setCurrency(checked ? CurrencyType.SWEEP_COINS : CurrencyType.GOLD_COINS);
  };

  useEffect(() => {
    setCurrency(CurrencyType.SWEEP_COINS);
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {currency === CurrencyType.GOLD_COINS ? (
          <div className="flex items-center">
            <Button variant="ghost" className="gap-2 group">
              <img
                src="/icons/gold-coins.png"
                alt="gold-coins"
                className="h-6 w-6"
              />
              {/* <Coins className="h-4 w-4 text-[#ffd700] group-hover:text-black transition-colors" /> */}
              <Link to="/deposit" className="text-sm text-[#B4FF39] group-hover:text-black transition-colors hover:text-green-400">{Number(walletBalance)?.toLocaleString('en-US')} Gold Coins</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="gap-2 group items-center">
                      <img
                        src="/icons/sweep-coins.png"
                        alt="Stream Coins"
                        className="h-4 w-6"
                      />
                      {/* <BanknoteArrowUp className="h-4 w-4 text-[#BDFF00] group-hover:text-black transition-colors" /> */}
                      <Link to="/deposit" className="text-sm text-green-500 group-hover:text-black transition-colors text-nowrap hover:text-green-400">{Number(walletBalance)?.toLocaleString('en-US')} Stream Coins</Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent hidden side="bottom" className="max-w-[250px]">
                    <p>
                      Stream Coins will be used for cash picks and is not a part of the private
                      beta yet.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        <Switch
          checked={currency === CurrencyType.SWEEP_COINS}
          onCheckedChange={handleSwitchChange}
          className="data-[state=checked]:bg-[#c3f53b] data-[state=unchecked]:bg-muted hover:data-[state=unchecked]:bg-muted/80 border-2 border-[#c3f53b]/30"
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
