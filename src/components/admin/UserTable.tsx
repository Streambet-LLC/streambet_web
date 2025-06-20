import { useState } from 'react';
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
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import api from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { DeleteUserDialog } from './DeleteUserDialog';

interface Props {
  searchUserQuery: string;
}

export const UserTable: React.FC<Props> = ({ searchUserQuery }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = rangeStart + itemsPerPage - 1;

  const { data: profiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['profiles', currentPage, searchUserQuery],
    queryFn: async () => {
      const data = await api.admin.getUsers({
        range: `[${rangeStart},${rangeEnd}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchUserQuery }),
        pagination: true,
      });
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ userId, userStatus }: { userId: string; userStatus: boolean }) => {
      return await api.admin.updateUsersStatus({ userId, userStatus });
    },
    onSuccess: () => {
      refetchProfiles();
    },
  });

  const totalPages = Math.ceil((profiles?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  console.log(profiles?.data, 'profiles');

  const paginatedUsers = profiles?.data;

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log(userId, 'userId');
      await api.admin.deleteUser(userId);
    },
    onSuccess: () => {
      refetchProfiles();
    },
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Token Balance</TableHead>
              <TableHead>status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Email</TableHead>
              <TableHead></TableHead>
              <TableHead></TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No users found matching
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers?.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="truncate whitespace-nowrap overflow-hidden max-w-[180px]">
                    {user.username}
                  </TableCell>
                  <TableCell>{user?.wallet?.freeTokens ? user?.wallet?.freeTokens : '-'}</TableCell>
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
                  <TableCell>{new Date(user.createdAt).toLocaleDateString('en-US')}</TableCell>
                  <TableCell className="truncate whitespace-nowrap overflow-hidden max-w-[180px]">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      style={{ backgroundColor: user.isActive ? '#7AFF14' : '#FF1418' }}
                      onCheckedChange={() => {
                        mutation.mutate({ userId: user.id, userStatus: !user.isActive });
                      }}
                    />
                  </TableCell>
                  <TableCell className="cursor-pointer">
                    <div className="w-[18px] h-[18px]">
                      <img
                        src="/icons/wallet.svg"
                        className="w-[100%] h-[100%] object-contain cursor-pointer"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="cursor-pointer">
                    <DeleteUserDialog
                      user={user?.username}
                      onConfirm={() => {
                        deleteMutation.mutate(user?.id);
                      }}
                      // isDeleteDialogOpen={isDeleteDialogOpen}
                      // setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
                  currentPage === profiles?.total && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
