import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { StreamStatus } from '@/enums';
import { formatDate, formatTime } from '@/utils/helper';

interface StreamStatusBadgeProps {
  status: StreamStatus | 'lock';
  scheduledStartTime?: string;
  lockDate?: string;
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

// Scheduled badge animation with hover effect
const SCHEDULED_ANIMATION_CONFIG = {
  initial: { opacity: 0, y: -5 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
  whileHover: {
    borderColor: 'rgb(168, 85, 247)',
    boxShadow: '0 0 16px rgba(168, 85, 247, 0.5)',
  },
} as const;

// Badge styling constants
const BADGE_STYLES = {
  LIVE: {
    container: 'bg-red-600/10 backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] w-fit border-2 border-red-500',
    dot: 'size-1.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)]',
    text: 'text-[10px] text-red-500 uppercase tracking-wider font-bold',
  },
  SCHEDULED: {
    container: 'bg-scheduled-badge-bg backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] w-fit border-2 border-scheduled-badge-border',
    icon: 'size-3 text-scheduled-badge-text',
    text: 'text-[10px] text-scheduled-badge-text font-bold tracking-wide uppercase',
  },
  LOCK: {
    container: 'bg-amber-600/10 backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] w-full border-2 border-amber-500',
    icon: 'size-3 text-amber-400',
    text: 'text-[10px] text-amber-400 font-bold tracking-wide uppercase',
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
  lockDate,
  multiline = false,
}: StreamStatusBadgeProps) => {
  const shouldReduceMotion = useReducedMotion();
  
  // LIVE badge with pulsing dot and animated border
  if (status === StreamStatus.LIVE) {
    return (
      <motion.div 
        className={BADGE_STYLES.LIVE.container}
        animate={shouldReduceMotion ? undefined : { 
          borderColor: ['rgb(239, 68, 68)', 'rgb(220, 38, 38)', 'rgb(239, 68, 68)'],
          boxShadow: ['0 0 8px rgba(239, 68, 68, 0.3)', '0 0 16px rgba(239, 68, 68, 0.6)', '0 0 8px rgba(239, 68, 68, 0.3)']
        }}
        transition={shouldReduceMotion ? undefined : { repeat: Infinity, duration: 2 }}
        role="status" 
        aria-label="Stream live"
      >
        <motion.div 
          className={BADGE_STYLES.LIVE.dot}
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={shouldReduceMotion ? undefined : { repeat: Infinity, duration: 1.5 }}
        />
        <span className={BADGE_STYLES.LIVE.text}>LIVE</span>
      </motion.div>
    );
  }

  // SCHEDULED badge with calendar icon (for streams only)
  if (status === StreamStatus.SCHEDULED) {
    const ariaLabel = scheduledStartTime 
      ? `Upcoming: ${formatDate(scheduledStartTime)} at ${formatTime(scheduledStartTime)}`
      : 'Upcoming: TBA';
    
    return (
      <motion.div 
        initial={shouldReduceMotion ? undefined : SCHEDULED_ANIMATION_CONFIG.initial}
        animate={shouldReduceMotion ? undefined : SCHEDULED_ANIMATION_CONFIG.animate}
        transition={shouldReduceMotion ? undefined : SCHEDULED_ANIMATION_CONFIG.transition}
        whileHover={shouldReduceMotion ? undefined : SCHEDULED_ANIMATION_CONFIG.whileHover}
        className={BADGE_STYLES.SCHEDULED.container}
        role="status" 
        aria-label={ariaLabel}
      >
        <Calendar className={BADGE_STYLES.SCHEDULED.icon} strokeWidth={2.5} />
        <span className={BADGE_STYLES.SCHEDULED.text}>
          {scheduledStartTime ? (
            <>
              Upcoming: {multiline && <br />}{formatDate(scheduledStartTime)} at{' '}
              {formatTime(scheduledStartTime)}
            </>
          ) : (
            'Upcoming: TBA'
          )}
        </span>
      </motion.div>
    );
  }

  // LOCK badge with clock icon and datetime
  if (status === 'lock') {
    const ariaLabel = lockDate 
      ? `Picks Lock: ${lockDate}`
      : 'Picks Lock: TBA';
    
    return (
      <motion.div 
        className={BADGE_STYLES.LOCK.container}
        animate={shouldReduceMotion ? undefined : { 
          borderColor: ['rgb(245, 158, 11)', 'rgb(217, 119, 6)', 'rgb(245, 158, 11)'],
          boxShadow: ['0 0 6px rgba(245, 158, 11, 0.3)', '0 0 16px rgba(245, 158, 11, 0.6)', '0 0 8px rgba(245, 158, 11, 0.3)']
        }}
        transition={shouldReduceMotion ? undefined : { repeat: Infinity, duration: 4.5 }}
        role="status" 
        aria-label={ariaLabel}
      >
        <Clock className={BADGE_STYLES.LOCK.icon} strokeWidth={2.5} />
        <span className={BADGE_STYLES.LOCK.text}>
          Picks Lock: {lockDate || 'TBA'}
        </span>
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
