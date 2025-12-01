import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { StreamStatus } from '@/enums';
import { formatDate, formatTime } from '@/utils/helper';

interface StreamStatusBadgeProps {
  status: StreamStatus;
  scheduledStartTime?: string;
  multiline?: boolean;
  isStreamType?: boolean;
}

// Animation configuration - consistent across all badges
const ANIMATION_CONFIG = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
  },
} as const;

// Badge styling constants
const BADGE_STYLES = {
  LIVE: {
    container: 'flex items-center gap-2 bg-badge-live text-white px-2 py-1 rounded-md shadow-lg',
    text: 'font-bold text-xs tracking-wider',
  },
  SCHEDULED_STREAM: {
    container: 'flex items-center gap-2 bg-badge-scheduled-stream text-white px-2 py-1 rounded-md shadow-lg',
    text: 'font-medium text-xs',
  },
  SCHEDULED_NON_VIDEO: {
    container: 'flex items-center gap-2 bg-badge-scheduled-non-video text-white px-2 py-1 rounded-md shadow-lg',
    text: 'font-medium text-xs',
  },
  ENDED: {
    container: 'flex items-center gap-2 px-3 py-1.5 bg-badge-ended/90 backdrop-blur-sm rounded-md text-xs font-bold uppercase tracking-wider shadow-lg',
  },
} as const;

/**
 * StreamStatusBadge - Reusable animated badge for stream status
 * 
 * Displays visual indicators for stream states:
 * - LIVE: Red badge with pulsing dot animation
 * - SCHEDULED: Purple badge with calendar icon and date/time
 * - ENDED: Gray badge
 * 
 * @param status - The current stream status (LIVE, SCHEDULED, ENDED)
 * @param scheduledStartTime - ISO date string for scheduled streams
 * @param multiline - Whether scheduled text should break into multiple lines (default: false)
 */
export const StreamStatusBadge = ({
  status,
  scheduledStartTime,
  multiline = false,
  isStreamType = true,
}: StreamStatusBadgeProps) => {
  // LIVE badge with pulsing dot
  if (status === StreamStatus.LIVE) {
    return (
      <motion.div {...ANIMATION_CONFIG} role="status" aria-label="Stream live">
        <div className={BADGE_STYLES.LIVE.container}>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className={BADGE_STYLES.LIVE.text}>Stream Live</span>
        </div>
      </motion.div>
    );
  }

  // SCHEDULED badge with calendar icon
  if (status === StreamStatus.SCHEDULED) {
    const labelPrefix = isStreamType ? 'Stream Upcoming' : 'Picks Close';
    const ariaLabel = scheduledStartTime 
      ? `${labelPrefix}: ${formatDate(scheduledStartTime)} at ${formatTime(scheduledStartTime)}`
      : `${labelPrefix}: TBA`;
    
    // Select appropriate badge style based on bet type
    const badgeStyle = isStreamType ? BADGE_STYLES.SCHEDULED_STREAM : BADGE_STYLES.SCHEDULED_NON_VIDEO;
    
    return (
      <motion.div {...ANIMATION_CONFIG} role="status" aria-label={ariaLabel}>
        <div className={badgeStyle.container}>
          <Calendar className="h-3 w-3" />
          <span className={badgeStyle.text}>
            {scheduledStartTime ? (
              <>
                {isStreamType ? 'Stream Upcoming' : 'Picks Close'}: {multiline && <br />}{formatDate(scheduledStartTime)} at{' '}
                {formatTime(scheduledStartTime)}
              </>
            ) : (
              isStreamType ? 'Stream Upcoming: TBA' : 'Picks Close: TBA'
            )}
          </span>
        </div>
      </motion.div>
    );
  }

  // ENDED badge
  if (status === StreamStatus.ENDED) {
    return (
      <motion.div {...ANIMATION_CONFIG} role="status" aria-label="Stream ended">
        <span className={BADGE_STYLES.ENDED.container}>
          Ended
        </span>
      </motion.div>
    );
  }

  // Fallback for unknown status - log warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`StreamStatusBadge: Unknown or unhandled status: ${status}`);
  }
  
  return null;
};
