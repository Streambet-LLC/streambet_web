import { useState } from 'react';
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
import { Trash2 } from 'lucide-react';

interface DeleteBettingDialogProps {
  onConfirm: () => void;
  message: string;
  title: string;
  trigger?: React.ReactNode;
  isNotCreatedStatus?: boolean;
}

export function DeleteBettingDialog({ onConfirm, message, title, trigger, isNotCreatedStatus }: DeleteBettingDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    if (isNotCreatedStatus) {
      // Show error message instead of delete dialog
      setIsDeleteDialogOpen(true);
    } else {
      // Show normal delete confirmation
      setIsDeleteDialogOpen(true);
    }
  };

  const getDialogContent = () => {
    if (isNotCreatedStatus) {
      return {
        title: "Cannot Delete",
        message: "Cannot delete this field as this round already started by admin",
        showConfirmButton: false
      };
    }
    return {
      title,
      message,
      showConfirmButton: true
    };
  };

  const dialogContent = getDialogContent();

  return (
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="w-[18px] h-[18px]">
            <Trash2 className="cursor-pointer" onClick={handleDeleteClick} />
          </div>
        )}
      </DialogTrigger>
      <DialogContent className='border-2 border-[#7AFF14]' style={{ background: '#0D0D0D' }}>
        <DialogHeader>
          <DialogTitle>{dialogContent.title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm">
          {dialogContent.message}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {dialogContent.showConfirmButton && (
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm();
                setIsDeleteDialogOpen(false);
              }}
            >
              Confirm
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
