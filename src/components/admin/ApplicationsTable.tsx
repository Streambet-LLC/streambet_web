import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/components/ui/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { ApplicationDetailsDialog } from './ApplicationDetailsDialog';
import { getMessage } from '@/utils/helper';

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationType: 'creator' | 'seller';
  applicationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  socials?: string;
  message?: string;
  collectorBackground?: string;
  cityState?: string;
  cardsCollected?: string;
  cardPreference?: string;
  user?: any;
}

export function ApplicationsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const itemsPerPage = 25;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['applications', typeFilter, statusFilter, currentPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };
      
      if (typeFilter !== 'all') {
        params.applicationType = typeFilter;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.admin.getAllApplications(params);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveApplication(id),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Application approved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDetailsDialogOpen(false);
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to approve application',
        variant: 'destructive',
      });
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.admin.rejectApplication(id),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Application rejected',
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDetailsDialogOpen(false);
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to reject application',
        variant: 'destructive',
      });
      setProcessingId(null);
    },
  });

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setDetailsDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedApplication) {
      setProcessingId(selectedApplication.id);
      approveMutation.mutate(selectedApplication.id);
    }
  };

  const handleReject = () => {
    if (selectedApplication) {
      setProcessingId(selectedApplication.id);
      rejectMutation.mutate(selectedApplication.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'creator' ? (
      <Badge className="bg-blue-500 hover:bg-blue-600">Creator</Badge>
    ) : (
      <Badge className="bg-green-500 hover:bg-green-600">Seller</Badge>
    );
  };

  const applications = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white">Type:</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] bg-[#272727] border-[#272727] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-white">Status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-[#272727] border-[#272727] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-[rgba(22,22,22,1)] border-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No applications found
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#2D343E] hover:bg-transparent">
                      <TableHead className="text-[#9CA3AF]">Name</TableHead>
                      <TableHead className="text-[#9CA3AF]">Email</TableHead>
                      <TableHead className="text-[#9CA3AF]">Type</TableHead>
                      <TableHead className="text-[#9CA3AF]">Status</TableHead>
                      <TableHead className="text-[#9CA3AF]">Submitted</TableHead>
                      <TableHead className="text-[#9CA3AF]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application: Application) => (
                      <TableRow
                        key={application.id}
                        className="border-b border-[#2D343E] hover:bg-[#1a1a1a]"
                      >
                        <TableCell className="text-white">
                          {application.firstName} {application.lastName}
                        </TableCell>
                        <TableCell className="text-white">{application.email}</TableCell>
                        <TableCell>{getTypeBadge(application.applicationType)}</TableCell>
                        <TableCell>{getStatusBadge(application.applicationStatus)}</TableCell>
                        <TableCell className="text-white">
                          {format(new Date(application.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(application)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center py-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-white px-4">
                            Page {currentPage} of {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <ApplicationDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        application={selectedApplication}
        onApprove={handleApprove}
        onReject={handleReject}
        isProcessing={processingId === selectedApplication?.id}
      />
    </>
  );
}
