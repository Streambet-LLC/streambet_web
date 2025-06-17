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
import { User } from '@supabase/supabase-js';
import { Tables } from '@/integrations/supabase/types';
import { getImageLink } from '@/utils/helper';

type Profile = Tables<'profiles'>;

interface UserDropdownProps {
  profile: Profile | null;
  user: User;
  onLogout: () => void;
}

export const UserDropdown = ({ profile, user, onLogout }: UserDropdownProps) => {
  console.log('profile', profile);
  console.log('user', user);
  console.log('getImageLink(profile?.profile_image_url)', getImageLink(profile?.profileImageUrl));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={getImageLink(profile?.profileImageUrl) || undefined}
              alt={profile?.username}
            />
            <AvatarFallback>
              {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || ''}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.username || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/faq">FAQ</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
