import api from '@/integrations/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getMessage } from '@/utils/helper';

const PendingOnboardingTable = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-onboarding'],
    queryFn: async () => {
      const response = await api.admin.getPendingOnboardingSellers();
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.markSellerAsOnboarded(id),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Seller mark as onboarded',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-onboarding'] });
      setShowConfirmationDialog(false);
      setSelectedId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to mark as onboarded',
        variant: 'destructive',
      });
      setShowConfirmationDialog(false);
      setSelectedId(null);
    },
  });

  const handleViewDialog = item => {
    setShowConfirmationDialog(true);
    setSelectedId(item.id);
  };

  const handleConfirm = () => {
    approveMutation.mutate(selectedId);
  };

  return (
    <>
      {' '}
      <Card className="bg-[rgba(22,22,22,1)] border-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No sellers found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#2D343E] hover:bg-transparent">
                    <TableHead className="text-[#9CA3AF]">Name</TableHead>
                    <TableHead className="text-[#9CA3AF]">Email</TableHead>
                    <TableHead className="text-[#9CA3AF]">Shop Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map(item => (
                    <TableRow
                      key={item.id}
                      className="border-b border-[#2D343E] hover:bg-[#1a1a1a]"
                    >
                      <TableCell className="text-white">{item.username}</TableCell>
                      <TableCell className="text-white">{item.email}</TableCell>
                      <TableCell className="text-white">{item.shopName}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleViewDialog(item)}>
                          Mark as Onboarded
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
        <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
          <DialogContent className="max-w-xs text-center border border-primary bg-[#000]">
            <div className="pt-6 text-lg font-semibold">Confirm mark as onboarded?</div>
            <div className="flex justify-center gap-4 mt-4">
              <Button
                variant="default"
                className="px-6 font-bold"
                onClick={() => {
                  handleConfirm();
                }}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                className="px-6"
                onClick={() => setShowConfirmationDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </>
  );
};

export default PendingOnboardingTable;
