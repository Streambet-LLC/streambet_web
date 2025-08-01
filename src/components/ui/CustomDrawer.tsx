import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CustomDrawer: React.FC<CustomDrawerProps> = ({
  isOpen,
  onClose,
  children,
  className,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }

    // Cleanup on component unmount
    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [isOpen]);

  // Handle clicks outside the drawer to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Use timeout to prevent immediate close on trigger click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const drawerVariants = {
    visible: { x: 0 },
    hidden: { x: '-100%' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[99] bg-black/80"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            transition={{ duration: 0.3 }}
            onClick={onClose} // Also close on overlay click
          />
          <motion.div
            ref={drawerRef}
            className={cn(
              'fixed left-0 top-0 z-[100] h-screen w-1/2 flex-col border-r bg-background',
              className
            )}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={drawerVariants}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
