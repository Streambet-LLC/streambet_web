import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from './ui/use-toast';

interface CopyableCodeProps {
  value: string;
  description: string;
  label?: string;
}

export const CopyableCode = ({ value, description, label }: CopyableCodeProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: `${description} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex items-center gap-2">
        <code className="bg-muted p-2 rounded text-sm flex-1">{value}</code>
        <Button variant="outline" size="icon" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
