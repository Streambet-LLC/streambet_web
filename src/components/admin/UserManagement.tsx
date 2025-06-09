import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserBalanceAdjuster } from './UserBalanceAdjuster';
import { AdminToggle } from './AdminToggle';

export const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from('profiles').select('*');

      if (error) throw error;
      return profiles;
    },
  });

  const { data: emails } = useQuery({
    queryKey: ['user-emails'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_emails');

      if (error) throw error;
      return data;
    },
  });

  const getUserEmail = (userId: string) => {
    return emails?.find(email => email.id === userId)?.email || 'N/A';
  };

  // Wrap refetchProfiles in a function that returns Promise<void>
  const handleRefetch = async () => {
    await refetchProfiles();
  };

  // Filter profiles based on search query
  const filteredProfiles = profiles?.filter(user => {
    const userEmail = getUserEmail(user.id).toLowerCase();
    const username = (user.username || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return username.includes(query) || userEmail.includes(query);
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Management</h2>

      {/* Search input */}
      <div className="relative">
        <div className="flex gap-2 items-end mb-4">
          <div className="flex-1">
            <Label htmlFor="search-users" className="mb-2 block">
              Search Users
            </Label>
            <div className="relative">
              <Input
                id="search-users"
                type="text"
                placeholder="Search by username or email"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Coins</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No users found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            ) : (
              filteredProfiles?.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{getUserEmail(user.id)}</TableCell>
                  <TableCell>{user.wallet_balance || 0}</TableCell>
                  <TableCell>
                    <AdminToggle
                      userId={user.id}
                      isAdmin={user.is_admin || false}
                      onSuccess={handleRefetch}
                    />
                  </TableCell>
                  <TableCell>
                    <UserBalanceAdjuster userId={user.id} onSuccess={handleRefetch} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
