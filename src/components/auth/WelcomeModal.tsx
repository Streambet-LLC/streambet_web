import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WelcomeModal = ({ open, onOpenChange }: WelcomeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#B4FF39]" />
            Welcome to Streambet!
          </DialogTitle>
          <DialogDescription>
            We're excited to have you join our beta. To get you started, we've added 1,000 free
            tokens to your account.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="bg-muted p-4 rounded-md text-center">
            <p className="text-lg font-semibold">1,000 Free Coins</p>
            <p className="text-sm text-muted-foreground">have been added to your wallet</p>
          </div>
          <p className="text-sm">
            Use these tokens to place bets on streams and win more! Explore the platform and enjoy
            the experience.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
