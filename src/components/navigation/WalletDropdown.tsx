import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { CurrencyType } from '@/enums';

interface WalletDropdownProps {
  walletBalance: number;
}

export const WalletDropdown = ({ walletBalance }: WalletDropdownProps) => {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrencyContext();

  const handleSwitchChange = (checked: boolean) => {
    setCurrency(checked ? CurrencyType.SWEEP_COINS : CurrencyType.GOLD_COINS);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {currency === CurrencyType.GOLD_COINS ? (
          <div className="flex items-center">
            <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/transactions')}>
              <Wallet className="h-4 w-4 group-hover:text-black transition-colors" />
              <span className="text-sm text-[#B4FF39] group-hover:text-black transition-colors">{Number(walletBalance)?.toLocaleString('en-US')} Gold Coins</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="flex items-center gap-2 px-4 py-2">
              <Wallet className="h-4 w-4" />
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-green-500 group-hover:text-black transition-colors text-nowrap">{Number(walletBalance)?.toLocaleString('en-US')} Sweep Coins</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p>
                        Sweep Coins will be used for cash betting and is not a part of the private
                        beta yet.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
