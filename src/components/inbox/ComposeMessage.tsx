import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import type { UploadedAttachment } from '@/types/inbox';

interface ComposeMessageProps {
  conversationId: string;
  onMessageSent: () => void;
}

export const ComposeMessage = ({
  conversationId,
  onMessageSent,
}: ComposeMessageProps) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      api.inbox.sendMessage(conversationId, {
        content: content.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    onSuccess: () => {
      setContent('');
      setAttachments([]);
      onMessageSent();
    },
    onError: (err) => handleMutationError(err, 'Failed to send message'),
  });

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    sendMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 15 MB',
        variant: 'destructive',
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only JPEG, PNG, WebP, and GIF images are allowed',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await api.inbox.uploadPhoto(file);
      setAttachments((prev) => [...prev, uploaded]);
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border/40 p-3">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="relative group rounded-lg overflow-hidden border border-border/40"
            >
              <img
                src={att.fileUrl}
                alt={att.fileName}
                className="h-16 w-16 object-cover"
              />
              <button
                onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </Button>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[120px] resize-none bg-[rgba(30,30,30,1)] border-border/40"
          rows={1}
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={
            sendMutation.isPending ||
            (!content.trim() && attachments.length === 0)
          }
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
