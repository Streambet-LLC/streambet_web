import { api } from '@/integrations/api/client';

interface EmailNotificationOptions {
  subject: string;
  message: string;
  recipientId?: string; // Optional - if not provided, send to current user
  templateId?: string; // Optional - use a specific email template
  data?: Record<string, any>; // Optional - template data
}

interface NotificationPreferences {
  betResults: boolean;
  streamUpdates: boolean;
  balanceChanges: boolean;
  promotions: boolean;
  systemAnnouncements: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  betResults: true,
  streamUpdates: true,
  balanceChanges: true,
  promotions: true,
  systemAnnouncements: true,
};

/**
 * Send an email notification
 */
export async function sendEmailNotification(options: EmailNotificationOptions) {
  try {
    const response = await api.user.sendEmailNotification(options);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return { success: false, error };
  }
}

/**
 * Send a bet result notification
 */
export async function sendBetResultNotification(
  userId: string,
  streamTitle: string,
  betAmount: number,
  betOption: string,
  didWin: boolean,
  winAmount?: number
) {
  // First check if user has enabled these notifications
  const preferences = await getUserNotificationPreferences(userId);
  if (!preferences.betResults) return { success: true, skipped: true };

  const subject = didWin ? `You won your bet on ${streamTitle}!` : `Bet result for ${streamTitle}`;

  const message = didWin
    ? `Congratulations! Your bet of ${betAmount} on "${betOption}" for "${streamTitle}" won. You've been credited with ${winAmount} coins.`
    : `Your bet of ${betAmount} on "${betOption}" for "${streamTitle}" didn't win this time. Better luck next time!`;

  return sendEmailNotification({
    subject,
    message,
    recipientId: userId,
    templateId: 'bet-result',
    data: {
      streamTitle,
      betAmount,
      betOption,
      didWin,
      winAmount: winAmount || 0,
    },
  });
}

/**
 * Send a balance change notification
 */
export async function sendBalanceChangeNotification(
  userId: string,
  amount: number,
  reason: string
) {
  // First check if user has enabled these notifications
  const preferences = await getUserNotificationPreferences(userId);
  if (!preferences.balanceChanges) return { success: true, skipped: true };

  const action = amount > 0 ? 'added to' : 'deducted from';
  const subject = `Wallet Balance Update`;
  const message = `${Math.abs(amount)} coins have been ${action} your wallet. Reason: ${reason}`;

  return sendEmailNotification({
    subject,
    message,
    recipientId: userId,
    templateId: 'balance-change',
    data: {
      amount,
      reason,
      isPositive: amount > 0,
    },
  });
}

/**
 * Send a stream update notification
 */
export async function sendStreamUpdateNotification(
  streamId: string,
  streamTitle: string,
  updateType: 'started' | 'ended' | 'betting_opened' | 'betting_closed'
) {
  try {
    // This would be an API call to send notifications to all subscribed users
    const response = await api.betting.notifyStreamSubscribers(streamId, {
      type: updateType,
      streamTitle,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send stream update notification:', error);
    return { success: false, error };
  }
}

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const response = await api.user.getNotificationPreferences(userId);
    return response.preferences;
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    // Return default preferences if we can't get the user's
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(preferences: Partial<NotificationPreferences>) {
  try {
    const response = await api.user.updateNotificationPreferences(preferences);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return { success: false, error };
  }
}
