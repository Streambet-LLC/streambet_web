import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteUserDialog } from './DeleteUserDialog';
import AddTokens from './AddTokens';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthContext } from '@/contexts/AuthContext';
import { EditUserDialog } from './EditUserDialog';

interface Props {
  searchUserQuery: string;
}

export const UserTable: React.FC<Props> = ({ searchUserQuery }) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const { refetchSession } = useAuthContext();

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = itemsPerPage;

  const { data: profiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['userList'],
    queryFn: async () => {
      const data = await api.admin.getUsers({
        range: `[${rangeStart},${rangeEnd}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchUserQuery }),
        pagination: true,
      });
      return data;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchProfiles();
  }, [currentPage, searchUserQuery, refetchProfiles]);

  const mutation = useMutation({
    mutationFn: async ({ userId, userStatus }: { userId: string; userStatus: boolean }) => {
      return await api.admin.updateUsersStatus({ userId, userStatus });
    },
    onSuccess: () => {
      refetchProfiles();
    },
  });

  const mutationCurrency = useMutation({
    mutationFn: async ({ userId, amount, currencyType }: { 
      userId: string; 
      amount: number; 
      currencyType: string 
    }) => {
      return await api.admin.updateUserCurrency({ userId, amount, currencyType });
    },
    onSuccess: () => {
      refetchProfiles();
      refetchSession();
    },
  });

  const updateCreatorStatusMutation = useMutation({
    mutationFn: async ({ userId, isCreator }: { userId: string; isCreator: boolean }) => {
      return await api.admin.updateUserCreatorStatus({ userId, isCreator });
    },
    onSuccess: () => {
      refetchProfiles();
      toast({
        description: 'User role updated successfully',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update user role',
        variant: 'destructive',
      });
      refetchProfiles();
    },
  });

  const totalPages = Math.ceil((profiles?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedUsers = profiles?.data;

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.admin.deleteUser(userId);
    },
    onSuccess: () => {
      refetchProfiles();
      toast({
        description: 'User deleted successfuly',
        variant: 'default',
      });
    },
  });

  const handleEditUser = () => {
    refetchProfiles();
  };

  return (
    <div>
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {paginatedUsers?.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No users found</div>
          ) : (
            paginatedUsers?.map(user => (
              <Card key={user.id} className="bg-[#0D0D0D] border-gray-800">
                <CardContent className="p-4 space-y-3">
                  {/* User Info Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium capitalize truncate max-w-[120px]">
                        {user.username}
                      </span>
                      {user.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}

                      {user.role === 'creator' && (
                        <Badge variant="secondary" className="text-xs">
                          Creator
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={user.isActive}
                      style={{ backgroundColor: user.isActive ? '#7AFF14' : '#FF1418' }}
                      onCheckedChange={() => {
                        mutation.mutate({ userId: user.id, userStatus: !user.isActive });
                      }}
                    />
                  </div>

                  {/* Gold Coin Balance */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gold Balance:</span>
                    <span className="font-medium">
                      {user?.wallet?.goldCoins
                        ? user?.wallet?.goldCoins?.toLocaleString('en-US')
                        : '-'}
                    </span>
                  </div>

                  {/* CadeCoins Balance */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">CadeCoins:</span>
                    <span className="font-medium">
                      {user?.wallet?.cadeCoins
                        ? user?.wallet?.cadeCoins?.toLocaleString('en-US')
                        : '-'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span
                      className="px-2 py-1 rounded-md font-bold text-xs"
                      style={{
                        backgroundColor: user.isActive ? '#7AFF14' : '#FF1418',
                        color: user.isActive ? '#000' : '#FFFFFF',
                      }}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm truncate max-w-[150px]">{user.email}</span>
                  </div>

                  {/* Verification */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Verification:</span>
                    {user.isVerify ? (
                      <Badge variant="secondary" className="text-xs">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not Verified
                      </Badge>
                    )}
                  </div>

                  {/* Created Date */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <span className="text-sm">
                      {new Date(user?.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>

                  {/* Creator */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Creator:</span>
                    <Checkbox
                      checked={user?.role === 'creator'}
                      disabled={user?.role === 'admin'}
                      onCheckedChange={() => {
                        updateCreatorStatusMutation.mutate({
                          userId: user.id,
                          isCreator: user?.role !== 'creator',
                        });
                      }}
                    />
                  </div>

                  {/* Actions Row */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <AddTokens
                      goldCoinsBalance={user?.wallet?.goldCoins}
                      cadeCoinsBalance={user?.wallet?.cadeCoins}
                      username={user.username}
                      onSaveGold={newBalance => {
                        mutationCurrency.mutate({ 
                          userId: user.id, 
                          amount: newBalance, 
                          currencyType: 'gold_coins' 
                        });
                      }}
                      onSaveCade={newBalance => {
                        mutationCurrency.mutate({ 
                          userId: user.id, 
                          amount: newBalance, 
                          currencyType: 'cade_coins' 
                        });
                      }}
                    />
                    <DeleteUserDialog
                      user={user?.username}
                      onConfirm={() => {
                        deleteMutation.mutate(user?.id);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Gold Coins</TableHead>
                <TableHead>Stream Coins</TableHead>
                <TableHead>CadeCoins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Promo Code</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-6 text-muted-foreground">
                    No users found matching
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="truncate whitespace-nowrap overflow-hidden max-w-[180px] capitalize">
                      {user.username}

                      {user.role === 'admin' && (
                        <span className="bg-[Grays] font-medium text-white text-xs border border-[#FFFFFF] px-2 py-[4px] rounded-md ml-2">
                          Admin
                        </span>
                      )}

                      {user.role === 'creator' && (
                        <span className="bg-[Grays] font-medium text-white text-xs border border-[#FFFFFF] px-2 py-[4px] rounded-md ml-2">
                          Creator
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user?.wallet?.goldCoins
                        ? Number(user?.wallet?.goldCoins)?.toLocaleString('en-US')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {user?.wallet?.sweepCoins
                        ? Number(user?.wallet?.sweepCoins)?.toLocaleString('en-US')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {user?.wallet?.cadeCoins
                        ? Number(user?.wallet?.cadeCoins)?.toLocaleString('en-US')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className="px-2 py-1 rounded-md font-bold text-sm"
                        style={{
                          backgroundColor: user.isActive ? '#7AFF14' : '#FF1418',
                          color: user.isActive ? '#000' : '#FFFFFF',
                        }}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(user?.createdAt).toLocaleDateString('en-US')}</TableCell>
                    <TableCell className="truncate whitespace-nowrap overflow-hidden max-w-[180px]">
                      {user.email}
                    </TableCell>
                    <TableCell className="truncate whitespace-nowrap overflow-hidden max-w-[180px]">
                      {user.isVerify ? (
                        <span className="bg-[Grays] font-medium text-white text-xs border border-[#FFFFFF] px-2 py-[4px] rounded-md ml-2">
                          Verified
                        </span>
                      ) : (
                        <span className="bg-[Grays] font-medium text-white text-xs border border-[#FFFFFF] px-2 py-[4px] rounded-md ml-2">
                          Not Verified
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px]">{user.promoCode}</TableCell>
                    <TableCell className="cursor-pointer" title="Set User Account Active/Inactive">
                      <Switch
                        checked={user.isActive}
                        style={{ backgroundColor: user.isActive ? '#7AFF14' : '#FF1418' }}
                        onCheckedChange={() => {
                          mutation.mutate({ userId: user.id, userStatus: !user.isActive });
                        }}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer" title="Edit Wallet Balances">
                      <AddTokens
                        goldCoinsBalance={user?.wallet?.goldCoins}
                        cadeCoinsBalance={user?.wallet?.cadeCoins}
                        username={user.username}
                        onSaveGold={newBalance => {
                          mutationCurrency.mutate({ 
                            userId: user.id, 
                            amount: newBalance, 
                            currencyType: 'gold_coins' 
                          });
                        }}
                        onSaveCade={newBalance => {
                          mutationCurrency.mutate({ 
                            userId: user.id, 
                            amount: newBalance, 
                            currencyType: 'cade_coins' 
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer" title="Edit User Profile">
                      <EditUserDialog profile={user} onUpdate={handleEditUser} />
                    </TableCell>
                    <TableCell className="cursor-pointer" title="Toggle Creator Role">
                      <Checkbox
                        checked={user?.role === 'creator'}
                        disabled={user?.role === 'admin'}
                        onCheckedChange={() => {
                          updateCreatorStatusMutation.mutate({
                            userId: user.id,
                            isCreator: user?.role !== 'creator',
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer" title="Delete">
                      <DeleteUserDialog
                        user={user?.username}
                        onConfirm={() => {
                          deleteMutation.mutate(user?.id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex w-full justify-between bg-black rounded-md mt-4">
        <div className="text-sm w-full ml-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
          Page {currentPage} of {totalPages}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                className={cn(
                  'text-white border-white hover:bg-white/10',
                  currentPage === 1 && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                className={cn(
                  'text-white border-white hover:bg-white/10',
                  currentPage === totalPages && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
