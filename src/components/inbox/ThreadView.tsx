import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Shield,
  MoreVertical,
  Ban,
  Unlock,
  Check,
  CheckCheck,
  ImageIcon,
} from 'lucide-react';
import { ComposeMessage } from './ComposeMessage';
import { LinkifiedText } from '@/components/LinkifiedText';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import type { Message, Conversation } from '@/types/inbox';
import { format, isToday, isYesterday } from 'date-fns';

interface ThreadViewProps {
  conversationId: string;
  currentUserId?: string;
  onBack: () => void;
}

export const ThreadView = ({ conversationId, currentUserId, onBack }: ThreadViewProps) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  // Snapshot of the user's lastReadAt timestamp captured the FIRST time we
  // see the conversation in this mount. We freeze it on purpose so that
  // calling markAsRead (which advances lastReadAt to now) doesn't
  // immediately erase the unread indicator on the messages the user just
  // opened the thread to see.
  const initialLastReadAtRef = useRef<string | null | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['inbox-messages', conversationId],
    queryFn: () => api.inbox.getConversationMessages(conversationId, { limit: 100 }),
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Get conversation details from the API response directly
  const conversation: Conversation | undefined = (data as any)?.conversation ?? undefined;

  // Mark as read when opening
  const markReadMutation = useMutation({
    mutationFn: () => api.inbox.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-unread-count'] });
    },
  });

  useEffect(() => {
    // New thread opened — reset the unread snapshot so it gets recaptured
    // from the next data payload, and re-arm auto-scroll to the bottom.
    initialLastReadAtRef.current = undefined;
    setShouldAutoScroll(true);
    markReadMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll to bottom on new messages. The radix <ScrollArea> wraps its
  // children in an inner viewport element — mutating scrollTop on the outer
  // wrapper has no visible effect, which is why scroll-on-open felt broken.
  // We query the viewport via its data attribute and scroll that instead.
  useEffect(() => {
    if (!shouldAutoScroll) return;
    const root = scrollRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    );
    const target = viewport ?? root;
    // Defer one frame so freshly-rendered messages are measured before we
    // jump to the bottom; otherwise scrollHeight is the pre-render value.
    requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
  }, [data?.data, shouldAutoScroll]);

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: (userId: string) => api.inbox.blockUser(userId),
    onSuccess: () => {
      toast({ title: 'User blocked', description: 'They have been notified.' });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: err => handleMutationError(err, 'Failed to block user'),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.inbox.unblockUser(userId),
    onSuccess: () => {
      toast({ title: 'User unblocked' });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: err => handleMutationError(err, 'Failed to unblock user'),
  });

  const handleMessageSent = () => {
    queryClient.invalidateQueries({ queryKey: ['inbox-messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    setShouldAutoScroll(true);
  };

  const messages = data?.data ?? [];
  const isSupport = conversation?.type === 'support';
  const isBlocked = conversation?.isBlocked;

  // For support: if we're the requester, show "Support"; if we're the admin, show the requester's name
  // For direct: find the other participant (not the current user)
  const otherParticipant = isSupport
    ? conversation?.participants.find(
        p => p.user?.role !== 'admin' && String(p.userId ?? p.user?.id) !== String(currentUserId)
      ) || conversation?.participants.find(p => p.user?.role !== 'admin')
    : conversation?.participants.find(
        p => String(p.userId ?? p.user?.id ?? p.id) !== String(currentUserId)
      );

  // For support: check if we are the requester (non-admin) — if so, show "Support" as the display name
  const iAmRequester =
    isSupport &&
    conversation?.participants.some(
      p => p.user?.role !== 'admin' && String(p.userId ?? p.user?.id) === String(currentUserId)
    );

  const displayName =
    isSupport && iAmRequester
      ? 'Support'
      : otherParticipant?.user?.username ||
        otherParticipant?.user?.name ||
        (isSupport ? 'Support' : 'User');

  // System / automated CardCade notification thread — the bot does not read
  // replies, so we hide the compose box and show a notice instead.
  const isSystemBotThread =
    !isSupport && (otherParticipant?.user?.username || '').toLowerCase() === 'cardcade';

  // Capture the user's lastReadAt ONCE per thread mount so that the unread
  // dots remain visible on messages that were unread when the thread
  // opened, even after our markAsRead call advances the server-side cursor.
  const myParticipant = conversation?.participants.find(
    p => String(p.userId ?? p.user?.id) === String(currentUserId),
  );
  if (conversation && initialLastReadAtRef.current === undefined) {
    initialLastReadAtRef.current = myParticipant?.lastReadAt ?? null;
  }
  const initialLastReadAt = initialLastReadAtRef.current;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={isSupport ? undefined : otherParticipant?.user?.profileImageUrl || undefined}
            />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {isSupport ? <Shield className="h-4 w-4" /> : displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-white">{displayName}</span>
              {otherParticipant?.user?.isSeller && !isSupport && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-primary/40 text-primary"
                >
                  Seller
                </Badge>
              )}
            </div>
            {conversation?.subject && (
              <p className="text-xs text-muted-foreground">{conversation.subject}</p>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        {!isSupport && otherParticipant && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isBlocked ? (
                <DropdownMenuItem onClick={() => unblockMutation.mutate(otherParticipant.userId)}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unblock User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => blockMutation.mutate(otherParticipant.userId)}
                  className="text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Blocked notice */}
      {isBlocked && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center shrink-0">
          <p className="text-sm text-destructive flex items-center justify-center gap-1.5">
            <Ban className="h-3.5 w-3.5" />
            This conversation is blocked
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUserId;
            const showDateSeparator =
              index === 0 ||
              new Date(message.createdAt).toDateString() !==
                new Date(messages[index - 1].createdAt).toDateString();

            // An incoming message is "unread" (visually) if it was created
            // after the last-read cursor we snapshotted on mount. Own
            // messages never get the dot.
            const isUnread =
              !isOwn &&
              (initialLastReadAt === null ||
                (initialLastReadAt !== undefined &&
                  new Date(message.createdAt).getTime() >
                    new Date(initialLastReadAt).getTime()));

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[11px] text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/40">
                      {formatDateSeparator(message.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  currentUserId={currentUserId}
                  isUnread={isUnread}
                  onImageClick={setLightboxImage}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Compose (hidden for one-way system / CardCade notification threads) */}
      {!isBlocked && !isSystemBotThread && (
        <div className="shrink-0">
          <ComposeMessage conversationId={conversationId} onMessageSent={handleMessageSent} />
        </div>
      )}
      {isSystemBotThread && (
        <div className="shrink-0 border-t border-border/40 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            CardCade notifications — replies are disabled
          </p>
        </div>
      )}

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent"
          aria-describedby={undefined}
        >
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Full size"
              className="w-full h-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  isUnread?: boolean;
  onImageClick?: (url: string) => void;
}

const MessageBubble = ({ message, isOwn, currentUserId, isUnread, onImageClick }: MessageBubbleProps) => {
  return (
    <div className={`flex items-start gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Unread dot — only on incoming messages the user hasn't seen yet. */}
      {!isOwn && isUnread && (
        <span
          aria-label="Unread message"
          className="mt-3 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(189,255,0,0.7)]"
        />
      )}
      <div
        className={`max-w-[75%] ${
          isOwn
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-[rgba(30,30,30,1)] text-white rounded-2xl rounded-bl-md'
        } px-4 py-2.5`}
      >
        {/* Admin badge */}
        {message.isAdminMessage && (
          <div className="flex items-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-blue-400" />
            <span className="text-[11px] font-medium text-blue-400">
              {message.adminName || 'Admin'}
            </span>
          </div>
        )}

        {/* Sender name for non-own messages (only in support threads) */}
        {!isOwn && !message.isAdminMessage && (
          <p className="text-[11px] font-medium text-primary/80 mb-0.5">
            {message.sender?.username}
          </p>
        )}

        {/* Content */}
        {message.content && (
          <LinkifiedText className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </LinkifiedText>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map(att => (
              <button
                key={att.id}
                type="button"
                onClick={() => onImageClick?.(att.fileUrl)}
                className="block cursor-zoom-in"
              >
                <img
                  src={att.fileUrl}
                  alt={att.fileName}
                  className="max-w-full rounded-lg max-h-[300px] object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span
            className={`text-[10px] ${
              isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
            }`}
          >
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
          {isOwn && message.hasReadReceipt && (
            <span className="text-[10px]">
              {message.readAt ? (
                <CheckCheck className="h-3 w-3 text-blue-400" />
              ) : (
                <Check className="h-3 w-3 text-primary-foreground/60" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}
