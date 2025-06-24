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

interface WalletDropdownProps {
  walletBalance: number;
}

export const WalletDropdown = ({ walletBalance }: WalletDropdownProps) => {
  const navigate = useNavigate();
  const [showStreamCoins, setShowStreamCoins] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Reset to Free Coins after a short delay
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (showStreamCoins) {
      timeout = setTimeout(() => {
        setShowStreamCoins(false);
      }, 1500);
    }

    return () => clearTimeout(timeout);
  }, [showStreamCoins]);

  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      setShowStreamCoins(true);
      setShowAlert(true);
    } else {
      setShowStreamCoins(false);
    }
    // Prevent event propagation
    event?.stopPropagation();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {!showStreamCoins ? (
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
          checked={showStreamCoins}
          onCheckedChange={handleSwitchChange}
          className="data-[state=checked]:bg-[#c3f53b] data-[state=unchecked]:bg-muted hover:data-[state=unchecked]:bg-muted/80 border-2 border-[#c3f53b]/30"
          onClick={e => e.stopPropagation()}
        />
      </div>

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="border-[#c3f53b]/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Coming Soon: Stream Coins</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Stream Coins will be worth 1:1 USD and can be used for real money betting.
              <br />
              <br />
              While in private beta, we are only providing Free Coins for testing purposes.
              <br />
              <br />
              Stay tuned for the full release!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <AlertDialogAction className="bg-[#c3f53b] text-black hover:bg-[#a6d42e]">
              Got it!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
