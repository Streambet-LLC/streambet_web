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
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import type { Message, Conversation } from '@/types/inbox';
import { format, isToday, isYesterday } from 'date-fns';

interface ThreadViewProps {
  conversationId: string;
  currentUserId?: string;
  onBack: () => void;
}

export const ThreadView = ({
  conversationId,
  currentUserId,
  onBack,
}: ThreadViewProps) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['inbox-messages', conversationId],
    queryFn: () => api.inbox.getConversationMessages(conversationId, { limit: 100 }),
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Get conversation details from the conversation list cache
  const conversationsData = queryClient.getQueryData<any>(['inbox-conversations', 'all']);
  const conversation: Conversation | undefined = conversationsData?.data?.find(
    (c: Conversation) => c.id === conversationId
  );

  // Mark as read when opening
  const markReadMutation = useMutation({
    mutationFn: () => api.inbox.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-unread-count'] });
    },
  });

  useEffect(() => {
    markReadMutation.mutate();
  }, [conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.data, shouldAutoScroll]);

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: (userId: string) => api.inbox.blockUser(userId),
    onSuccess: () => {
      toast({ title: 'User blocked', description: 'They have been notified.' });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: (err) => handleMutationError(err, 'Failed to block user'),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.inbox.unblockUser(userId),
    onSuccess: () => {
      toast({ title: 'User unblocked' });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: (err) => handleMutationError(err, 'Failed to unblock user'),
  });

  const handleMessageSent = () => {
    queryClient.invalidateQueries({ queryKey: ['inbox-messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    setShouldAutoScroll(true);
  };

  const messages = data?.data ?? [];
  const otherParticipant = conversation?.participants.find(
    (p) => p.userId !== currentUserId
  );
  const isSupport = conversation?.type === 'support';
  const isBlocked = conversation?.isBlocked;
  const displayName = isSupport
    ? 'Support'
    : otherParticipant?.user?.username || 'User';

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                isSupport
                  ? undefined
                  : otherParticipant?.user?.profileImageUrl || undefined
              }
            />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {isSupport ? (
                <Shield className="h-4 w-4" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-white">
                {displayName}
              </span>
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
              <p className="text-xs text-muted-foreground">
                {conversation.subject}
              </p>
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
                <DropdownMenuItem
                  onClick={() => unblockMutation.mutate(otherParticipant.userId)}
                >
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
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center">
          <p className="text-sm text-destructive flex items-center justify-center gap-1.5">
            <Ban className="h-3.5 w-3.5" />
            This conversation is blocked
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUserId;
            const showDateSeparator =
              index === 0 ||
              new Date(message.createdAt).toDateString() !==
                new Date(messages[index - 1].createdAt).toDateString();

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
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Compose */}
      {!isBlocked && (
        <ComposeMessage
          conversationId={conversationId}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
}

const MessageBubble = ({ message, isOwn, currentUserId }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={att.fileUrl}
                  alt={att.fileName}
                  className="max-w-full rounded-lg max-h-[300px] object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {/* Timestamp + read receipt */}
        <div
          className={`flex items-center gap-1 mt-1 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
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
