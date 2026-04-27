import { useState } from 'react';
import { Link as LinkIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ShareItemButtonProps {
  itemId: string;
  shopUsername?: string | null;
  overlay?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ShareItemButton({
  itemId,
  shopUsername,
  overlay = false,
  size = 'md',
  className,
}: ShareItemButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const origin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const isSellerShop = !!shopUsername && shopUsername.toLowerCase() !== 'cardcade';
    const path = isSellerShop ? `/shop/${shopUsername}` : '/shop';
    const url = `${origin}${path}?highlight=${encodeURIComponent(itemId)}`;

    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      ok = false;
    }

    if (ok) {
      setCopied(true);
      toast({ title: 'Link copied', description: 'Share it anywhere.' });
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast({
        title: "Couldn't copy link",
        description: url,
        variant: 'destructive',
      });
    }
  };

  const dim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Copy link to this item"
      title="Copy link"
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        dim,
        overlay
          ? 'bg-black/55 text-white backdrop-blur hover:bg-black/75'
          : 'bg-muted text-foreground hover:bg-muted/80',
        className
      )}
    >
      {copied ? <Check className={icon} /> : <LinkIcon className={icon} />}
    </button>
  );
}
