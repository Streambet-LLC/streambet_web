import * as React from 'react';
import { Input } from './input';
import { Copy, Check } from 'lucide-react';
import { toast } from './use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import Bugsnag from '@bugsnag/js';

interface CopyableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  toastMessage?: string;
}

export const CopyableInput = React.forwardRef<HTMLInputElement, CopyableInputProps>(
  ({ value, toastMessage = 'Link copied!', className, style, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);
    const isMobile = useIsMobile();

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: toastMessage });
        setTimeout(() => setCopied(false), 1500);
      } catch (error) {
        Bugsnag.notify(error); 
        // Fallback for older browsers or mobile devices
        const textArea = document.createElement('textarea');
        textArea.value = value;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          toast({ title: toastMessage });
          setTimeout(() => setCopied(false), 1500);
        } catch (err) {
          Bugsnag.notify(err); 
          toast({ title: 'Failed to copy', variant: 'destructive' });
        }
        document.body.removeChild(textArea);
      }
    };

    return (
      <div
        className="relative w-full"
        style={style}
      >
        <Input
          ref={ref}
          value={value}
          readOnly
          className={
            'pr-12 cursor-pointer select-all bg-[#272727] h-10 ' +
            (className ? className : '')
          }
          onClick={handleCopy}
          style={{ cursor: 'pointer' }}
          {...props}
        />
        <span
          className={`absolute inset-y-0 right-2 flex items-center cursor-pointer ${
            isMobile ? 'p-2' : ''
          }`}
          onClick={handleCopy}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleCopy();
          }}
          tabIndex={0}
          role="button"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-green-500`} />
          ) : (
            <Copy className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
          )}
        </span>
      </div>
    );
  }
);
CopyableInput.displayName = 'CopyableInput'; 
