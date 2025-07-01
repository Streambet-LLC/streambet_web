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
}

export function DeleteBettingDialog({ onConfirm, message, title, trigger }: DeleteBettingDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="w-[18px] h-[18px]">
            <Trash2 className="cursor-pointer" onClick={() => setIsDeleteDialogOpen(true)} />
          </div>
        )}
      </DialogTrigger>
      <DialogContent className='border-2 border-[#7AFF14]' style={{ background: '#0D0D0D' }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm">
          {message}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setIsDeleteDialogOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
