import React, { RefObject } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { DollarSign, User, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnimations } from '@/hooks/useAnimations';
import { formatRelativeTime } from '@/utils/format';

interface CommentListProps {
  comments: any[];
  commentsEndRef: RefObject<HTMLDivElement>;
}

export const CommentList = ({ comments, commentsEndRef }: CommentListProps) => {
  const { containerVariants, itemVariants } = useAnimations();

  // Function to check if a comment is a bet notification
  const isBetNotification = (content: string, isSystemMessage: boolean) => {
    // Only consider it a bet notification if it's from a system account AND has bet-related content
    return (
      isSystemMessage &&
      (content.includes('placed a') ||
        content.includes('bet on') ||
        content.includes('updated bet to'))
    );
  };

  // Function to check if a comment is a bet cancellation
  const isBetCancellation = (content: string, isSystemMessage: boolean) => {
    // Only consider it a cancellation if it's from a system account AND has cancellation content
    return isSystemMessage && content.includes('cancelled their bet');
  };

  // Function to check if comment is from system account
  const isSystemAccount = (userId: string | null, username: string | null) => {
    // Check for system user ID or username "Bet Bot"
    return userId === null || userId === 'system' || username === 'Bet Bot';
  };

  return (
    <motion.div
      className="space-y-4 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        comments.map((comment, index) => {
          const isSystemMessage = isSystemAccount(comment.user_id, comment.user?.username);
          const isBet = isBetNotification(comment.content, isSystemMessage);
          const isCancellation = isBetCancellation(comment.content, isSystemMessage);

          // Determine if this is a new comment (within the last 30 seconds)
          const isNew = new Date().getTime() - new Date(comment.created_at).getTime() < 30000;

          return (
            <motion.div
              key={comment.id}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                isBet
                  ? 'bg-green-500/5'
                  : isCancellation
                    ? 'bg-red-500/5'
                    : isNew
                      ? 'bg-primary/5'
                      : ''
              }`}
              variants={itemVariants}
              initial={index > comments.length - 4 ? 'hidden' : 'show'} // Only animate the last few comments
              animate="show"
              data-comment-id={comment.id}
              data-comment-type={isBet ? 'bet' : isCancellation ? 'cancellation' : 'regular'}
            >
              {isBet ? (
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center text-green-600 dark:text-green-300 shadow-sm">
                  <DollarSign className="h-4 w-4" />
                </div>
              ) : isCancellation ? (
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center text-red-600 dark:text-red-300 shadow-sm">
                  <X className="h-4 w-4" />
                </div>
              ) : (
                <Avatar className="h-8 w-8 border border-border shadow-sm">
                  {comment.user?.avatar_url ? (
                    <AvatarImage src={comment.user.avatar_url} alt="Avatar" />
                  ) : (
                    <AvatarFallback className="bg-secondary">
                      {comment.user?.username?.charAt(0)?.toUpperCase() || <User size={14} />}
                    </AvatarFallback>
                  )}
                </Avatar>
              )}

              <div className="flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {isBet ? (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Bet Bot 🎉
                      </span>
                    ) : isCancellation ? (
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Bet Cancelled
                      </span>
                    ) : (
                      <span className="text-sm font-medium">
                        {comment.user?.username || 'Anonymous'}
                      </span>
                    )}
                    {/* Only show date/time for regular comments, not for bet notifications */}
                    {!isBet && !isCancellation && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 break-words ${
                      isBet
                        ? 'text-green-700 dark:text-green-300 font-medium'
                        : isCancellation
                          ? 'text-red-700 dark:text-red-300 font-medium'
                          : ''
                    }`}
                  >
                    {comment.content}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
      <div ref={commentsEndRef} className="h-1 py-1" />
    </motion.div>
  );
};
