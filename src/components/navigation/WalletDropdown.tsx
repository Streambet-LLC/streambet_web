import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { CurrencyType } from '@/enums';

interface WalletDropdownProps {
  walletBalance: number;
}

export const WalletDropdown = ({ walletBalance }: WalletDropdownProps) => {
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrencyContext();

  const handleSwitchChange = (checked: boolean) => {
    setCurrency(checked ? CurrencyType.STREAM_COINS : CurrencyType.FREE_TOKENS);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {currency === CurrencyType.FREE_TOKENS ? (
          <div className="flex items-center">
            <Button variant="ghost" className="gap-2 group" onClick={() => navigate('/transactions')}>
              <Wallet className="h-4 w-4 group-hover:text-black transition-colors" />
              <span className="text-[#B4FF39] group-hover:text-black transition-colors">{(walletBalance || 0).toLocaleString('en-US')} Free Coins</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="flex items-center gap-2 px-4 py-2">
              <Wallet className="h-4 w-4" />
              <div className="flex items-center">
                <span className="text-green-500">0 Stream Coins</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="ml-1 inline-flex items-center cursor-help"
                        onClick={e => e.stopPropagation()}
                      >
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p>
                        Stream Coins will be used for cash betting and is not a part of the private
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
          checked={currency === CurrencyType.STREAM_COINS}
          onCheckedChange={handleSwitchChange}
          className="data-[state=checked]:bg-[#c3f53b] data-[state=unchecked]:bg-muted hover:data-[state=unchecked]:bg-muted/80 border-2 border-[#c3f53b]/30"
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
