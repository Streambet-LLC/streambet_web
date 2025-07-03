import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRef, useEffect, useState } from 'react';
import { CommentList } from './comments/CommentList';
import { CommentInput } from './comments/CommentInput';
import { useComments } from '@/hooks/useComments';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './ui/button';
import { ArrowDown, MessageSquare, RefreshCw, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimations } from '@/hooks/useAnimations';

interface CommentSectionProps {
  session: any;
  streamId: string;
  showInputOnly?: boolean;
}

export const CommentSection = ({
  session,
  streamId,
  showInputOnly = false,
}: CommentSectionProps) => {
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [userKey, setUserKey] = useState<string>(session?.id || 'anonymous');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showBounce, setShowBounce] = useState(false);
  const { fadeVariants, pulseVariants, scaleVariants } = useAnimations();

  useEffect(() => {
    const newUserKey = session?.id || 'anonymous';
    if (newUserKey !== userKey) {
      setUserKey(newUserKey);
    }
  }, [session?.id, userKey]);

  const {
    comment,
    setComment,
    comments = [],
    handleComment,
    refetchComments,
    isLoading,
    isSubmitting,
  } = useComments(streamId, session);

  // Force refresh on component mount and user change
  useEffect(() => {
    refetchComments();
  }, [userKey, refetchComments]);

  // Keep track of previous comments length to detect new comments
  const prevCommentsLengthRef = useRef(comments.length);

  // Initial scroll to bottom when component mounts or stream changes
  useEffect(() => {
    if (!showInputOnly && !hasInitialScrolled) {
      // Ensure the scroll happens after comments are loaded
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'auto' });
        setHasInitialScrolled(true);
      }, 500);
    }
  }, [comments.length, showInputOnly, hasInitialScrolled]);

  // Scroll to bottom when new comments arrive if autoScroll is enabled
  useEffect(() => {
    if (!showInputOnly) {
      // Only act if there are new comments
      if (comments.length > prevCommentsLengthRef.current) {
        if (autoScroll) {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          // If not auto-scrolling, increment new message count
          setNewMessageCount(prev => prev + (comments.length - prevCommentsLengthRef.current));
          // Show bounce animation
          setShowBounce(true);
          setTimeout(() => setShowBounce(false), 1000);
        }
      }
      // Update previous length reference
      prevCommentsLengthRef.current = comments.length;
    }
  }, [comments, showInputOnly, autoScroll]);

  // Force scroll to bottom when a user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset autoScroll when returning to the page
        setAutoScroll(true);
        setNewMessageCount(0);

        // Force scroll to bottom after a small delay to ensure DOM is updated
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleEmojiSelect = (emojiData: any) => {
    setComment(prev => prev + emojiData.emoji);
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
  };

  const handleSubmitComment = async () => {
    try {
      // Enable autoscroll when submitting a comment
      setAutoScroll(true);
      setNewMessageCount(0);
      await handleComment();

      // Force scroll after submission
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleManualRefresh = () => {
    refetchComments();
    // Also enable auto-scroll on manual refresh
    setAutoScroll(true);
    setNewMessageCount(0);
    // Reset initial scroll state to force a scroll to bottom
    setHasInitialScrolled(false);
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
    setNewMessageCount(0);
  };

  if (showInputOnly) {
    return (
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className="border border-border rounded-lg p-4 bg-card"
      >
        <div className="flex items-center space-x-2 mb-2">
          <Avatar className="h-8 w-8">
            {session?.avatar_url ? (
              <AvatarImage src={session.avatar_url} alt="Avatar" />
            ) : (
              <AvatarFallback>
                <User size={16} />
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">
            {session ? session.username || 'You' : 'Sign in to comment'}
          </span>
        </div>
        <CommentInput
          comment={comment}
          onCommentChange={handleCommentChange}
          onEmojiSelect={handleEmojiSelect}
          onSubmit={handleSubmitComment}
          isDisabled={!session || isSubmitting}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full border border-border rounded-[16px] bg-card overflow-hidden"
      style={{ borderRadius: 16 }}
    >
      <div className="flex items-center justify-between border-b border-border" style={{ background: '#000000B2', height: 52, minHeight: 52, padding: '0 24px' }}>
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-white">Live chat</h3>
          {isLoading && (
            <motion.div
              variants={pulseVariants}
              initial="initial"
              animate="pulse"
              className="ml-2 h-1.5 w-1.5 rounded-full bg-primary"
            />
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleManualRefresh} variant="ghost" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh comments</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden max-h-[calc(100vh-350px)] lg:max-h-[calc(100vh-300px)] relative">
        <ScrollArea
          className="flex-1 p-4 pb-0"
          ref={scrollAreaRef}
          onScroll={e => {
            // Check if user has manually scrolled up
            if (scrollAreaRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold

              // Update auto-scroll state
              setAutoScroll(isAtBottom);

              // Show or hide scroll to bottom button
              setShowScrollToBottom(!isAtBottom);

              // Reset new message count if at bottom
              if (isAtBottom) {
                setNewMessageCount(0);
              }
            }
          }}
        >
          <AnimatePresence mode="wait">
            {isLoading && comments.length === 0 ? (
              <motion.div
                variants={fadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-center justify-center py-10 space-y-4"
              >
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  className="text-primary/50"
                >
                  <MessageSquare size={40} />
                </motion.div>
                <p className="text-muted-foreground">Loading chat messages...</p>
              </motion.div>
            ) : comments.length === 0 ? (
              <motion.div
                variants={fadeVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center justify-center py-10 space-y-4 text-center"
              >
                <MessageSquare size={40} className="text-muted" />
                <div>
                  <p className="text-muted-foreground">Coming Soon!</p>
                  <p className="text-sm text-muted-foreground/70">
                    Yet to develop :)
                  </p>
                </div>
              </motion.div>
            ) : (
              <CommentList comments={comments} commentsEndRef={commentsEndRef} />
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.div
              variants={scaleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute bottom-2 right-4 z-10"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full shadow-lg p-2 h-auto"
                      onClick={scrollToBottom}
                    >
                      <motion.div
                        animate={showBounce ? { y: [0, -5, 0, -3, 0] } : {}}
                        transition={{ duration: 0.6 }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </motion.div>
                      {newMessageCount > 0 && (
                        <motion.div
                          variants={scaleVariants}
                          initial="hidden"
                          animate="visible"
                          className="absolute -top-2 -right-2 bg-primary text-xs font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                        >
                          {newMessageCount}
                        </motion.div>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {newMessageCount > 0
                        ? `${newMessageCount} new message${newMessageCount > 1 ? 's' : ''}`
                        : 'Scroll to bottom'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className="p-4 border-t border-border mt-auto bg-card/50 backdrop-blur-sm"
      >
        <CommentInput
          comment={comment}
          onCommentChange={handleCommentChange}
          onEmojiSelect={handleEmojiSelect}
          onSubmit={handleSubmitComment}
          isDisabled={true}
        />
      </motion.div>
    </motion.div>
  );
};
