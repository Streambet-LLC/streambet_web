import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Send, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useAnimations } from '@/hooks/useAnimations';

interface CommentInputProps {
  comment: string;
  onCommentChange: (value: string) => void;
  onEmojiSelect: (emojiData: any) => void;
  onSubmit: () => void;
  isDisabled: boolean;
}

export const CommentInput = ({
  comment,
  onCommentChange,
  onEmojiSelect,
  onSubmit,
  isDisabled,
}: CommentInputProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fadeVariants, buttonVariants } = useAnimations();

  const handleSubmit = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (comment.trim() && !isDisabled && !isSubmitting) {
      try {
        setIsSubmitting(true);
        await onSubmit();
      } catch (error) {
        console.error('Failed to submit comment:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.form
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit}
      className="flex space-x-2"
    >
      <div className="flex-1 flex space-x-2">
        <Input
          placeholder={isDisabled ? '' : 'Add a comment...'}
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isDisabled || isSubmitting}
          data-testid="comment-input"
          aria-label="Comment input"
          className="border-border bg-secondary/30 focus-visible:ring-primary/30"
        />
        <Popover>
          <PopoverTrigger asChild>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isDisabled || isSubmitting}
                className="border-border hover:bg-primary/5 hover:text-primary"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </motion.div>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="end">
            <EmojiPicker onEmojiClick={onEmojiSelect} />
          </PopoverContent>
        </Popover>
      </div>
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          type="submit"
          disabled={isDisabled || isSubmitting || !comment.trim()}
          aria-label="Send comment"
          className={`transition-all ${!comment.trim() ? 'opacity-50' : ''}`}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          <span>{isSubmitting ? 'Sending' : 'Send'}</span>
        </Button>
      </motion.div>
    </motion.form>
  );
};
