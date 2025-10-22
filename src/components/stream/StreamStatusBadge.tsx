import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { StreamStatus } from '@/enums';
import { formatDate, formatTime } from '@/utils/helper';

interface StreamStatusBadgeProps {
  status: StreamStatus;
  scheduledStartTime?: string;
  multiline?: boolean;
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
    container: 'flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded-md shadow-lg',
    text: 'font-bold text-xs tracking-wider',
  },
  SCHEDULED: {
    container: 'flex items-center gap-2 bg-purple-700 text-white px-2 py-1 rounded-md shadow-lg',
    text: 'font-medium text-xs',
  },
  ENDED: {
    container: 'flex items-center gap-2 px-3 py-1.5 bg-zinc-600/90 backdrop-blur-sm rounded-md text-xs font-bold uppercase tracking-wider shadow-lg',
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
    const ariaLabel = scheduledStartTime 
      ? `Stream upcoming: ${formatDate(scheduledStartTime)} at ${formatTime(scheduledStartTime)}`
      : 'Stream upcoming: TBA';
    
    return (
      <motion.div {...ANIMATION_CONFIG} role="status" aria-label={ariaLabel}>
        <div className={BADGE_STYLES.SCHEDULED.container}>
          <Calendar className="h-3 w-3" />
          <span className={BADGE_STYLES.SCHEDULED.text}>
            {scheduledStartTime ? (
              <>
                Stream Upcoming: {multiline && <br />}{formatDate(scheduledStartTime)} at{' '}
                {formatTime(scheduledStartTime)}
              </>
            ) : (
              'Stream Upcoming: TBA'
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
