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

export function DeleteUserDialog({ user, onConfirm }: { user: any; onConfirm: () => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogTrigger asChild>
        <div className="w-[18px] h-[18px]">
          <img
            src="/icons/Trash.svg"
            className="w-[100%] h-[100%] object-contain cursor-pointer"
            onClick={() => setIsDeleteDialogOpen(true)}
          />
        </div>
      </DialogTrigger>
      <DialogContent className='border-2 border-[#7AFF14]' style={{ background: '#0D0D0D',}}>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm">
          Are you sure you want to delete <strong>{user.username}</strong>?
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
