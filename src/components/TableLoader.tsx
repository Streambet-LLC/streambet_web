import { Loader2 } from 'lucide-react';

/**
 * Centered spinner used while a transactions/sales table is fetching.
 * Mirrors the surrounding card chrome so the loader doesn't visually
 * jump when results land.
 */
const TableLoader = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 bg-[#0D0D0D] border-l border-r border-[#191D24] text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin text-[#7AFF14]" />
      <span className="text-xs">{label}</span>
    </div>
  );
};

export default TableLoader;
