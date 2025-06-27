import * as React from 'react';
import { Input } from './input';
import { Copy, Check } from 'lucide-react';
import { toast } from './use-toast';

interface CopyableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  toastMessage?: string;
}

export const CopyableInput = React.forwardRef<HTMLInputElement, CopyableInputProps>(
  ({ value, toastMessage = 'Link copied!', className, style, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: toastMessage });
      setTimeout(() => setCopied(false), 1500);
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
            'pr-10 cursor-pointer select-all bg-[#272727] h-10 ' +
            (className ? className : '')
          }
          onClick={handleCopy}
          style={{ cursor: 'pointer' }}
          {...props}
        />
        <span
          className="absolute inset-y-0 right-2 flex items-center cursor-pointer"
          onClick={handleCopy}
          tabIndex={0}
          role="button"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </span>
      </div>
    );
  }
);
CopyableInput.displayName = 'CopyableInput'; 
