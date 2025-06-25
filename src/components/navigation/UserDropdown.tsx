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

type Profile = any;

interface UserDropdownProps {
  profile: Profile | null;
  user: any;
  onLogout: () => void;
}

export const UserDropdown = ({ profile, user, onLogout }: UserDropdownProps) => {
  console.log('profile user dropdown', profile)
  console.log('getImageLink(profile?.profileImageUrl)', getImageLink(profile?.profileImageUrl))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={profile?.profileImageUrl ? getImageLink(profile?.profileImageUrl) : undefined}
              alt={profile?.username}
            />
            <AvatarFallback className='bg-[#BDFF00] text-[#000000]'>
              {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || ''}
            </AvatarFallback>
          </Avatar>
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
                    {user?.email}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  {user?.email}
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
          <Link to="/faq">FAQ</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onLogout()}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
