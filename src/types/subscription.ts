export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'expired';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConciergeRequest {
  id: string;
  userId: string;
  status: 'pending' | 'claimed';
  claimedBy: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    profileImageUrl: string | null;
    shopName: string | null;
    isProSubscriber: boolean;
  };
  claimedByUser?: {
    id: string;
    username: string;
    name: string;
  };
}
