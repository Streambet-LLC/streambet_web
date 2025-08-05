import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteStreamDialogProps {
  streamName: string;
  onConfirm: () => void;
  isDeleting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteStreamDialog({ streamName, onConfirm, isDeleting, isOpen, onOpenChange }: DeleteStreamDialogProps) {
  // Close dialog when deletion is complete (no longer in progress)
  useEffect(() => {
      onOpenChange(isOpen);
  }, [isDeleting, isOpen, onOpenChange]);

  const handleConfirm = () => {
    onConfirm();
    // Don't close dialog immediately - let the parent component handle closing after success
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='border-2 border-[#7AFF14]' style={{ background: '#0D0D0D' }}>
        <DialogHeader>
          <DialogTitle>Delete Stream</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm">
          Are you sure to delete <strong>'{streamName}'</strong>?
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 