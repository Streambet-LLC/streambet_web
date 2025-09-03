import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getImageLink } from '@/utils/helper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import React from 'react';

type Profile = any;

interface UserDropdownProps {
  profile: Profile | null;
  onLogout: () => void;
}

export const UserDropdown = ({ profile, onLogout }: UserDropdownProps) => {
  const [isImageLoading, setIsImageLoading] = React.useState(false);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={profile?.profileImageUrl ? getImageLink(profile?.profileImageUrl) : undefined}
              alt={profile?.username}
              onLoadingStatusChange={(status) => setIsImageLoading(status === 'loading')}
            />
            <AvatarFallback className='bg-[#BDFF00] text-[#000000]'>
              {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || ''}
            </AvatarFallback>
          </Avatar>
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full z-10">
              <Loader2 className="animate-spin h-5 w-5 text-[#0000ff]" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-light">
          <div className="flex flex-col space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium leading-none truncate max-w-[180px] cursor-help">
                    {profile?.username || 'User'}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  {profile?.username || 'User'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs leading-none text-muted-foreground truncate max-w-[180px] cursor-help pb-[1px]">
                    {profile?.email}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  {profile?.email}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href="https://form.jotform.com/252037370862052" target="_blank" rel="noopener noreferrer">Creator Program</a>
        </DropdownMenuItem>

        {/* <DropdownMenuItem asChild>
          <Link to="/deposit">Buy Gold Coins</Link>
        </DropdownMenuItem> */}

        {/* <DropdownMenuItem asChild>
          <Link to="/withdraw">Redeem Sweep Coins</Link>
        </DropdownMenuItem> */}

        <DropdownMenuItem asChild>
          <Link to="/betting-history">Bet history</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/transactions">Transaction history</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/faq">FAQ</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onLogout()}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
