import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationType: 'creator' | 'seller';
  applicationStatus: 'pending' | 'approved' | 'rejected';
  socials?: string;
  message?: string;
  collectorBackground?: string;
  cityState?: string;
  cardsCollected?: string;
  cardPreference?: string;
  createdAt: string;
  reviewedAt?: string;
  user?: any;
}

interface ApplicationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

export function ApplicationDetailsDialog({
  open,
  onOpenChange,
  application,
  onApprove,
  onReject,
  isProcessing,
}: ApplicationDetailsDialogProps) {
  if (!application) return null;

  const isPending = application.applicationStatus === 'pending';
  const isCreator = application.applicationType === 'creator';
  const isSeller = application.applicationType === 'seller';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-2 border-[#7AFF14]" style={{ background: '#0D0D0D' }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Application Details</DialogTitle>
            <div className="flex gap-2">
              {getTypeBadge(application.applicationType)}
              {getStatusBadge(application.applicationStatus)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-400">First Name</label>
              <p className="text-white mt-1">{application.firstName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400">Last Name</label>
              <p className="text-white mt-1">{application.lastName}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Email</label>
            <p className="text-white mt-1">{application.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Submitted</label>
            <p className="text-white mt-1">
              {format(new Date(application.createdAt), 'MMM dd, yyyy h:mm a')}
            </p>
          </div>

          {/* Creator-specific fields */}
          {isCreator && (
            <>
              {application.socials && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Socials</label>
                  <p className="text-white mt-1 whitespace-pre-wrap">{application.socials}</p>
                </div>
              )}
              {application.message && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Message</label>
                  <p className="text-white mt-1 whitespace-pre-wrap">{application.message}</p>
                </div>
              )}
            </>
          )}

          {/* Seller-specific fields */}
          {isSeller && (
            <>
              {application.collectorBackground && (
                <div>
                  <label className="text-sm font-medium text-gray-400">
                    Collector Background
                  </label>
                  <p className="text-white mt-1 whitespace-pre-wrap">
                    {application.collectorBackground}
                  </p>
                </div>
              )}
              {application.cityState && (
                <div>
                  <label className="text-sm font-medium text-gray-400">City/State</label>
                  <p className="text-white mt-1">{application.cityState}</p>
                </div>
              )}
              {application.cardsCollected && (
                <div>
                  <label className="text-sm font-medium text-gray-400">
                    Cards Collected
                  </label>
                  <p className="text-white mt-1 whitespace-pre-wrap">
                    {application.cardsCollected}
                  </p>
                </div>
              )}
              {application.cardPreference && (
                <div>
                  <label className="text-sm font-medium text-gray-400">
                    Card Preference
                  </label>
                  <p className="text-white mt-1 capitalize">{application.cardPreference}</p>
                </div>
              )}
              {application.socials && (
                <div>
                  <label className="text-sm font-medium text-gray-400">
                    Social Media (Optional)
                  </label>
                  <p className="text-white mt-1 whitespace-pre-wrap">{application.socials}</p>
                </div>
              )}
            </>
          )}

          {/* Reviewed info */}
          {application.reviewedAt && (
            <div>
              <label className="text-sm font-medium text-gray-400">Reviewed</label>
              <p className="text-white mt-1">
                {format(new Date(application.reviewedAt), 'MMM dd, yyyy h:mm a')}
              </p>
            </div>
          )}
        </div>

        {isPending && (
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Reject
            </Button>
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
