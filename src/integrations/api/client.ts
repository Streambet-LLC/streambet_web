import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { decodeIdToken } from '@/utils/helper';
import { toast } from '@/hooks/use-toast';
import Bugsnag from '@bugsnag/js';
import { WithdrawKycPayload, WithdrawKycUsPayload, WithdrawPayload } from '@/types/withdraw';
import { BetCard } from '@/types/bet';
import {
  PrizeConfiguration,
  SellerShopResponse,
  SellerShopSummary,
  PsaImportResult,
  EbayListing,
  EbayMarketSummary,
  EbayMarketHistory,
  AdminEbaySoldListing,
  AdminReportedEbaySoldListing,
  SubmitPrizeRedemptionRequest,
} from '@/types/prize';
import { PromotedBetsResponse } from '@/types/promo';
import { CurrencyType } from '@/utils/currency';
import {
  CartSummary,
  CartCountResponse,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartCheckoutRequest,
  CartCheckoutResponse,
  BundleOfferRequest,
  BundleOfferResponse,
  ValidateDiscountCodeResponse,
} from '@/types/cart';
import { SpinStatusResponse, SpinResultResponse } from '@/types/daily-spin';
import {
  CreateReviewPayload,
  ListReviewsQuery,
  PaginatedReviews,
  Review,
  ReviewableOrderSide,
  ReviewStats,
  UpdateReviewPayload,
} from '@/types/review';
import {
  Conversation,
  ConversationListResponse,
  MessageListResponse,
  UnreadCountResponse,
  InboxSettings,
  UploadedAttachment,
  ConversationTab,
  AdminConversationTab,
} from '@/types/inbox';
import { getOrCreateAnonId } from '@/utils/anonId';

// API base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Socket.io instance
let socket: Socket | null = null;

// Unique symbols for retry flags
const RETRY_REFRESH = Symbol('RETRY_REFRESH');
const RETRY_401 = Symbol('RETRY_401');

// Add request interceptor to include the token in every request and check expiry
apiClient.interceptors.request.use(
  config => {
    // Always attach the anonymous viewer id so the backend can dedupe
    // item-view events for non-logged-in users without leaking PII.
    try {
      config.headers['x-anon-id'] = getOrCreateAnonId();
    } catch {
      // ignore – best-effort header
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = decodeIdToken(token);
        // Check expiry (exp is in seconds)
        if (decoded.exp && Date.now() / 1000 > decoded.exp) {
          // Token expired, do not attach token, let the request fail and response interceptor handle refresh
          // No refresh logic here
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        // If decode fails, treat as invalid/expired, do not attach token
        // No refresh logic here
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor to handle 401 errors and refresh token
apiClient.interceptors.response.use(
  response => response,
  async error => {
    // Report error to Bugsnag
    Bugsnag.notify(error);
    // Report unexpected errors to Bugsnag (exclude expected 401s which trigger refresh)-code rabbit suggestion
    if (!(error?.response?.status === 401)) {
      Bugsnag.notify(error instanceof Error ? error : new Error(String(error)));
    }

    // if (error.response?.data?.isForcedLogout) {
    //   toast({
    //     id: 'vpn-proxy',
    //     variant: 'destructive',
    //     description: error.response?.data?.message,
    //     duration: 7000,
    //   });
    //   // Dispatch custom event for logout handling
    //   window.dispatchEvent(new CustomEvent('vpnProxyDetected'));
    // }

    const originalRequest = error.config;

    // Prevent infinite loop: do not refresh for /auth/refresh itself
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest.url &&
      originalRequest.url.endsWith('/auth/refresh')
    ) {
      toast({
        id: 'session-expired',
        title: 'Session Expired',
        description: 'Session has been expired! Please relogin',
        variant: 'destructive',
      });
      await authAPI.signOut();
      // Dispatch custom event for navigation without page refresh
      window.dispatchEvent(new CustomEvent('navigateToLogin'));
      return Promise.reject(error);
    }

    // Prevent infinite loop: only allow one refresh attempt per original request
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest.url &&
      !originalRequest.url.endsWith('/payments/coinflow/withdrawer')
    ) {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // If no accessToken is present, do nothing
      if (!accessToken) {
        return Promise.reject(error);
      }

      // If this is the first 401 for this request, try refresh
      if (refreshToken && !(originalRequest as any)[RETRY_401]) {
        (originalRequest as any)[RETRY_401] = true;
        try {
          const refreshResponse = await apiClient.post(
            '/auth/refresh',
            { refreshToken },
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            refreshResponse?.data?.data || {};
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, show toast and logout
          toast({
            id: 'session-expired',
            title: 'Session Expired',
            description: 'Session has been expired! Please relogin',
            variant: 'destructive',
          });
          await authAPI.signOut();
          // Dispatch custom event for navigation without page refresh
          window.dispatchEvent(new CustomEvent('navigateToLogin'));
          return Promise.reject(refreshError);
        }
      } else {
        // If already retried once, or no refreshToken, show toast and logout
        toast({
          id: 'session-expired',
          title: 'Session Expired',
          description: 'Session has been expired! Please relogin',
          variant: 'destructive',
        });
        await authAPI.signOut();
        // Dispatch custom event for navigation without page refresh
        window.dispatchEvent(new CustomEvent('navigateToLogin'));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Public API (no authentication required)
export const publicAPI = {
  // Get public platform statistics
  getPlatformStats: async () => {
    const response = await apiClient.get('/stats');
    return response.data;
  },
};

// Auth API
export const authAPI = {
  // Register a new user
  register: async (userData: {
    email: string;
    password: string;
    username: string;
    tosAccepted: boolean;
    profileImageUrl: string;
    lastKnownIp: string;
    redirect?: string;
    promoCode?: string;
    refLink?: string;
  }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials: {
    identifier: string;
    password: string;
    remember_me?: boolean;
    redirect?: string;
  }) => {
    const response = await apiClient.post('/auth/login', credentials);
    // Store the tokens
    if (response?.data?.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    if (response?.data?.data?.refreshToken) {
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
    }
    return response.data;
  },

  // Google Callback user
  googleCallback: async (googleToken: string) => {
    // const headers = {
    //   'Authorization': `Bearer ${googleToken}`,
    //   'Content-Type': 'application/json',
    // };
    const response = await apiClient.get('/auth/google');

    // const response = await apiClient.get(`/auth/google/callback?token=${googleToken}`);
    // Store the tokens
    if (response?.data?.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    if (response?.data?.data?.refreshToken) {
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
    }
    return response.data;
  },

  // Upload Image
  uploadImage: async (filePayload: File, type?: string) => {
    const formData = new FormData();
    formData.append('file', filePayload);
    const response = await apiClient.post(
      `/assets/file/upload/image/${type || 'avatar'}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get current session
  getSession: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      return { data: null };
    }
  },

  // Refresh access token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const response = await apiClient.post(
      '/auth/refresh',
      { refreshToken },
      {
        headers: {
          'refresh-token': refreshToken,
        },
      }
    );
    const { accessToken, refreshToken: newRefreshToken } = response.data.data || {};
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    return response.data;
  },

  // Get username availability
  getUsernameAvailability: async (userName: string) => {
    try {
      const response = await apiClient.get(`/auth/username?username=${userName}`);
      return response;
    } catch (error) {
      return { data: { session: null } };
    }
  },

  // Sign out
  signOut: async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return { error: null };
  },

  // Handle OAuth
  googleAuth: async () => {
    window.location.href = `${API_URL}/auth/google`;
  },

  // Forgot password (send reset link)
  forgotPassword: async (identifier: string, redirect?: string) => {
    const response = await apiClient.post('/auth/forgot-password', { identifier, redirect });
    return response.data;
  },

  // Reset password (with token)
  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};

// User API
export const userAPI = {
  // Get platform stats (public endpoint)
  getPlatformStats: async () => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },

  // Get user profile of logged in user
  getProfile: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  // Get user profile of any user
  getUserProfile: async (username: string) => {
    const response = await apiClient.get(`/users/profile/${username}`);
    return response.data;
  },

  followUser: async (username: string) => {
    const response = await apiClient.get(`/users/profile/${username}/follow`);
    return response.data;
  },

  unfollowUser: async (username: string) => {
    const response = await apiClient.get(`/users/profile/${username}/unfollow`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData: any) => {
    const response = await apiClient.patch('/users/me', userData);
    return response.data;
  },

  // Send email notification
  sendEmailNotification: async (options: any) => {
    const response = await apiClient.post('/users/notifications/email', options);
    return response.data;
  },

  createNewReferralLink: async (code: string) => {
    const response = await apiClient.post('/users/referral-link', {
      code,
    });
    return response.data;
  },

  getReferralLinks: async () => {
    const response = await apiClient.get('/users/referral-link');
    return response.data;
  },

  // Get notification preferences
  getNotificationPreferences: async (userId?: string) => {
    const endpoint = userId
      ? `/users/${userId}/notification-preferences`
      : '/users/me/notification-preferences';
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  // Update notification preferences
  updateNotificationPreferences: async (preferences: any) => {
    const response = await apiClient.patch('/users/notification-settings', preferences);
    return response.data;
  },

  getCreators: async () => {
    const response = await apiClient.get('/users/creators');
    return response.data;
  },

  getSellers: async (): Promise<
    { id: string; username: string; displayName: string; profileImageUrl: string | null }[]
  > => {
    const response = await apiClient.get('/users/sellers');
    return response.data?.data ?? [];
  },

  getLeaderboard: async () => {
    const response = await apiClient.get('/users/leaderboard');
    return response.data;
  },
};

// Wallet API
export const walletAPI = {
  // Get wallet balance
  getBalance: async () => {
    const response = await apiClient.get('/wallets/balance');
    return response.data;
  },

  // Get transaction history
  getTransactions: async params => {
    const response = await apiClient.get(`/wallets/transactions`, {
      params,
    });
    return response.data;
  },

  // Get redeemable amount from sweep coins
  getRedeemableAmount: async (coins: number) => {
    const response = await apiClient.get(`/wallets/convert-sweep`, {
      params: { coins },
    });
    return response.data;
  },

  // Check if the user has a payment method saved
  hasPaymentMethod: async () => {
    try {
      const response = await apiClient.get('/wallets/payment-methods');
      return { hasPaymentMethod: response.data.length > 0 };
    } catch (error) {
      console.error('Error checking payment methods:', error);
      return { hasPaymentMethod: false };
    }
  },

  // Process auto-reload
  processAutoReload: async (amount: number) => {
    const response = await apiClient.post('/wallets/auto-reload', { amount });
    return response.data;
  },

  // Add a new payment method
  addPaymentMethod: async (paymentMethodData: any) => {
    const response = await apiClient.post('/wallets/payment-methods', paymentMethodData);
    return response.data;
  },

  // Get saved payment methods
  getPaymentMethods: async () => {
    const response = await apiClient.get('/wallets/payment-methods');
    return response.data;
  },

  // Create a checkout session for purchasing coins
  createCheckoutSession: async (params: {
    priceId: string;
    coinAmount: number;
    successUrl: string;
    cancelUrl: string;
  }) => {
    const response = await apiClient.post('/wallets/create-checkout-session', params);
    return response.data;
  },

  // Create a customer portal session for managing billing
  createCustomerPortalSession: async (params: { returnUrl: string }) => {
    const response = await apiClient.post('/wallets/create-portal-session', params);
    return response.data;
  },

  // Create a setup intent for saving a payment method
  createSetupIntent: async () => {
    const response = await apiClient.post('/wallets/create-setup-intent');
    return response.data;
  },

  // Save a payment method to the user's account
  savePaymentMethod: async (params: { setupIntentId: string; paymentMethodId: string }) => {
    const response = await apiClient.post('/wallets/save-payment-method', params);
    return response.data;
  },

  // Get coin packages
  getCoinPackages: async () => {
    const response = await apiClient.get('/coin-package');
    return response.data;
  },
};

// Betting API
export const bettingAPI = {
  // Get all streams
  getStreams: async (includeEnded = false, params?: any) => {
    const response = await apiClient.get(`/betting/streams?includeEnded=${includeEnded}`, {
      params,
    });
    return response.data;
  },

  // Get stream by ID
  getStream: async (streamId: string) => {
    const response = await apiClient.get(`/stream/${streamId}`);
    return response.data;
  },

  // Get betting options for a stream
  getBettingOptions: async (streamId: string) => {
    const response = await apiClient.get(`/betting/streams/${streamId}/betting-variables`);
    return response.data;
  },

  // Get betting options for a stream
  getBettingData: async (streamId: string, userId?: string, roundId?: string) => {
    const params = new URLSearchParams();
    if (userId && userId !== 'undefined') {
      params.append('userId', userId);
    }
    if (roundId && roundId !== 'null') {
      params.append('roundId', roundId);
    }
    const queryString = params.toString();
    const response = await apiClient.get(
      `/stream/bet-round/${streamId}${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  // Get data for selected betting round
  getBettingRoundData: async (roundId: string) => {
    const response = await apiClient.get(`/betting/potentialAmount/${roundId}`);
    return response.data;
  },

  getBettingCardRoundData: async (roundId: string) => {
    const response = await apiClient.get(`/betting/round/${roundId}`);
    return response.data;
  },

  // Edit a bet
  EditBet: async (betData: {
    betId: string;
    newBettingVariableId: string;
    newAmount: number;
    newCurrencyType: string;
  }) => {
    const response = await apiClient.patch('/betting/edit-bet', betData);
    return response.data;
  },

  // Place a bet
  placeBet: async (betData: {
    bettingVariableId: string;
    amount: number;
    currencyType: string;
  }) => {
    const response = await apiClient.post('/betting/place-bet', betData);
    return response.data;
  },

  cancelUserBet: async (betData: { betId: string; currencyType: string }) => {
    const response = await apiClient.delete('/betting/bets/cancel', { data: betData });
    return response.data;
  },

  // Cancel a bet
  cancelBet: async (betId: string) => {
    const response = await apiClient.delete(`/betting/bets/cancel${betId}`);
    return response.data;
  },

  // Get user's betting history
  getUserBets: async (params: any) => {
    const response = await apiClient.get('/betting/history', { params });
    return response.data;
  },

  // Notify stream subscribers
  notifyStreamSubscribers: async (streamId: string, notification: any) => {
    const response = await apiClient.post(`/betting/streams/${streamId}/notify`, notification);
    return response.data;
  },

  // Subscribe to stream notifications
  subscribeToStream: async (streamId: string) => {
    const response = await apiClient.post(`/betting/streams/${streamId}/subscribe`);
    return response.data;
  },

  // Unsubscribe from stream notifications
  unsubscribeFromStream: async (streamId: string) => {
    const response = await apiClient.delete(`/betting/streams/${streamId}/subscribe`);
    return response.data;
  },
};

// User stream API
export const userStreamAPI = {
  // Get all streams
  getStreams: async (params?: any) => {
    const response = await apiClient.get(`/stream`, {
      params,
    });
    return response.data;
  },

  getHomepageLiveStreams: async (params?: any) => {
    const response = await apiClient.get(`/stream/home`, {
      params,
    });
    return response.data;
  },

  getTopLiveStreams: async () => {
    const response = await apiClient.get(`/stream/top`);
    return response.data;
  },
};

// Bets API Types
interface TimelineOption {
  id: string;
  name: string;
  userCount: number;
}

interface TimelinePoint {
  timestamp: string;
  [key: string]: number | string; // Dynamic keys for option values and user counts
}

interface RoundPickTimelineResponse {
  options: TimelineOption[];
  timeline: TimelinePoint[];
}

// Bets API
export const betsAPI = {
  getLatestLiveFeed: async () => {
    const response = await apiClient.get(`/stream/last-live-feeds`);
    return response.data;
  },

  // Get all promoted bets
  getPromotedBets: async (params?: any): Promise<{ data: PromotedBetsResponse }> => {
    const response = await apiClient.get(`/stream/promoted-bets`, {
      params,
    });

    return response.data;
  },

  getBets: async (params?: any) => {
    const { page } = params;
    const { data: response } = await apiClient.get(`/stream/displayed-bets`, {
      params,
    });

    return response.data;
  },

  getCreatorProfileNonVideoBets: async (params?: any) => {
    const { page } = params;
    const { data: response } = await apiClient.get(`/stream/creator-non-video-bets`, {
      params,
    });

    return response.data;
  },

  getUpcomingBets: async (params?: any) => {
    const { page } = params;
    const { data: response } = await apiClient.get(`/stream/displayed-upcoming-bets`, {
      params,
    });

    return response.data;
  },

  // Get pick timeline for a round
  getRoundPickTimeline: async (roundId: string): Promise<{ data: RoundPickTimelineResponse }> => {
    try {
      const response = await apiClient.get(`/betting/round/${roundId}/pick-timeline`);

      // Validate response structure
      if (!response.data?.data?.options || !response.data?.data?.timeline) {
        if (import.meta.env.DEV) {
          console.error('Invalid response structure from pick timeline API:', response.data);
        }
        throw new Error('Invalid response structure from pick timeline API');
      }

      return response.data;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch round pick timeline:', error);
      }

      // Re-throw with more context
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to fetch pick timeline data'
      );
    }
  },
};

// WebSocket handling
export const socketAPI = {
  // Connect to WebSocket
  connect: (withAuth = true) => {
    const token = localStorage.getItem('refreshToken');
    if (!token && withAuth) return null;
    // Only create a new socket if one does not already exist or is disconnected
    if (!socket || (socket && socket.disconnected)) {
      socket = io(API_URL.replace(/\/api(?!.*\/api)/, ''), {
        transports: ['websocket'],
        //  reconnection: false,   // reconnection default true
        auth: { token },
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      socket.on('disconnect', reason => {
        console.log('WebSocket disconnected', reason);
      });

      socket.on('connect_error', err => {
        console.log('Connection error:', err);
      });
    }
    return socket;
  },
  // getSocket: () => socket,
  // Disconnect WebSocket
  disconnect: () => {
    if (socket) {
      console.log('socket disconnection called');
      socket.disconnect();
      socket = null;
    }
  },

  // Join a stream room
  joinStream: (streamId: string, socket: any) => {
    if (socket) {
      console.log(socket, 'client socket in joinStream');
      socket.emit('joinStream', streamId);
    }
  },

  // Leave a stream room
  leaveStream: (streamId: string, socket: any) => {
    console.log(streamId, 'leave stream with id', socket);
    if (socket) {
      console.log('leave stream initiated');
      socket.emit('leaveStream', streamId);
    }
  },

  // Send a chat message
  sendChatMessage: (streamId: string, message: string) => {
    if (socket) {
      socket.emit('sendChatMessage', { streamId, message });
    }
  },

  // To get all betting updates
  joinCommonStream: (socket: any) => {
    console.log(socket, 'joinCommonStream joined');
    if (socket) {
      socket.emit('joinCardCade', 'streambet');
    }
  },

  joinLiveFeed: (socket: any) => {
    console.log(socket, 'joinLiveFeed joined');
    if (socket) {
      socket.emit('joinLiveFeed');
    }
  },

  // Subscribe to chat messages
  onChatMessage: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('chatMessage', callback);
    }
  },

  // Subscribe to betting locked events
  onBettingLocked: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('bettingLocked', callback);
    }
  },

  // Subscribe to winner declared events
  onWinnerDeclared: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('winnerDeclared', callback);
    }
  },

  // Get the socket instance
  getSocket: () => socket,

  // Get all messages for a stream
  getChatMessages: async (streamId?: any, page?: any) => {
    const response = await apiClient.get(
      `/chat/messages?streamId=${streamId}&range=${page}&sort=["createdAt","DESC"]`
    );
    return response.data;
  },
};

// Collector Analytics API (admin-only, real buy/sell + socials)
import type {
  ApiCollectorAnalyticsOverview,
  ApiCollectorListParams,
  ApiCollectorProfileDetail,
  ApiCollectorProfilesList,
} from '@/types/analytics-api';

export const analyticsAPI = {
  /** Aggregated overview: stats, category affinity, top assets, 12w trend. */
  getCollectorsOverview: async (): Promise<ApiCollectorAnalyticsOverview> => {
    const response = await apiClient.get(
      `/admin/analytics/collectors/overview`,
    );
    return response.data.data as ApiCollectorAnalyticsOverview;
  },

  /** Paginated profile list with spend + socials + top categories. */
  listCollectorProfiles: async (
    params: ApiCollectorListParams = {},
  ): Promise<ApiCollectorProfilesList> => {
    const response = await apiClient.get(`/admin/analytics/collectors`, {
      params: {
        limit: params.limit,
        offset: params.offset,
        search: params.search || undefined,
        onlySellers: params.onlySellers ? 'true' : undefined,
      },
    });
    return response.data.data as ApiCollectorProfilesList;
  },

  /** Single profile detail with category breakdown + recent orders. */
  getCollectorProfile: async (
    userId: string,
  ): Promise<ApiCollectorProfileDetail> => {
    const response = await apiClient.get(
      `/admin/analytics/collectors/${userId}`,
    );
    return response.data.data as ApiCollectorProfileDetail;
  },
};

// Admin API
export const adminAPI = {
  // Get all users
  getUsers: async (params?: any) => {
    const response = await apiClient.get(`/admin/users`, {
      params,
    });
    return response.data;
  },

  getCreators: async () => {
    const response = await apiClient.get(`/admin/creators`);
    return response.data.data;
  },

  getSellers: async () => {
    const response = await apiClient.get(`/admin/sellers`);
    return response.data.data;
  },

  updateUsersStatus: async (userId?: any, userStatus?: any) => {
    const response = await apiClient.patch(`/admin/users`, userId, userStatus);
    return response.data;
  },

  updateUserCreatorStatus: async (payload: { userId: string; isCreator: boolean }) => {
    const response = await apiClient.patch(`/admin/users/creator-role`, payload);
    return response.data;
  },

  updateSellerFeeOverride: async (payload: { userId: string; feePercent: number }) => {
    const response = await apiClient.patch(`/admin/users/${payload.userId}/fee-override`, {
      feePercent: payload.feePercent,
    });
    return response.data;
  },

  clearSellerFeeOverride: async (userId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}/fee-override`);
    return response.data;
  },

  updateUserCoins: async (payload: { userId: string; amount: number }) => {
    const response = await apiClient.patch(`/admin/gold-coins`, payload);
    return response.data;
  },

  updateUserCurrency: async (payload: {
    userId: string;
    amount: number;
    currencyType: CurrencyType;
  }) => {
    const response = await apiClient.patch(`/admin/coins`, payload);
    return response.data;
  },

  deleteUser: async (userId: any) => {
    const response = await apiClient.delete(`/admin/users/soft-delete/{userId}?userId=${userId}`);
    return response.data;
  },

  // Get all prize orders
  getPrizeOrders: async (params?: { status?: string; range?: string }) => {
    const response = await apiClient.get('/admin/prizes/orders', { params });
    return response.data;
  },

  // Counter a prize offer
  counterPrizeOffer: async (
    orderId: string,
    data: { counterOfferAmount: number; offerNotes?: string }
  ) => {
    const response = await apiClient.patch(`/admin/prizes/orders/${orderId}/counter`, data);
    return response.data;
  },

  // Accept a prize offer
  acceptPrizeOffer: async (orderId: string) => {
    const response = await apiClient.patch(`/admin/prizes/orders/${orderId}/accept-offer`);
    return response.data;
  },

  // Reject a prize offer
  rejectPrizeOffer: async (orderId: string) => {
    const response = await apiClient.patch(`/admin/prizes/orders/${orderId}/reject-offer`);
    return response.data;
  },

  // Sales history (admin) -- paginated transactions across the whole platform
  getSalesHistory: async (params?: {
    from?: string;
    to?: string;
    paymentMethod?: 'crypto' | 'noncrypto' | 'all';
    range?: string;
    q?: string;
  }) => {
    const response = await apiClient.get('/admin/prizes/sales-history', { params });
    return response.data as {
      data: Array<{
        id: string;
        createdAt: string;
        itemName: string;
        totalPrice: number;
        usdCharged: number;
        coinsDeducted: number;
        paymentMethod: 'coins' | 'usd' | 'combined' | 'crypto';
        status: string;
        buyerUsername: string;
        buyerEmail: string | null;
        sellerUsername: string;
        cryptoTxSignature: string | null;
        cryptoBuyerWallet: string | null;
      }>;
      total: number;
    };
  },

  // Sales summary (admin) -- monthly aggregate with crypto vs non-crypto split
  getSalesSummary: async (params?: { months?: number }) => {
    const response = await apiClient.get('/admin/prizes/sales-summary', { params });
    return response.data as {
      months: Array<{
        month: string;
        totalRevenue: number;
        cryptoRevenue: number;
        nonCryptoRevenue: number;
        platformFees: number;
        cryptoPlatformFees: number;
        nonCryptoPlatformFees: number;
        orderCount: number;
        cryptoOrderCount: number;
        nonCryptoOrderCount: number;
      }>;
      totals: {
        totalRevenue: number;
        cryptoRevenue: number;
        nonCryptoRevenue: number;
        platformFees: number;
        cryptoPlatformFees: number;
        nonCryptoPlatformFees: number;
        orderCount: number;
        cryptoOrderCount: number;
        nonCryptoOrderCount: number;
      };
      feeAssumptions: {
        nonCryptoBuyerFeePercent: number;
        nonCryptoSellerFeePercent: number;
        cryptoCombinedBps: number;
      };
    };
  },

  // eBay sold listing moderation queue
  getReportedEbaySoldListings: async (
    limit: number = 240
  ): Promise<AdminReportedEbaySoldListing[]> => {
    const response = await apiClient.get('/admin/prizes/ebay-sold-listings/reported', {
      params: { limit },
    });
    return response.data;
  },

  moderateEbaySoldListing: async (
    listingId: string,
    payload: { isInaccurate: boolean; reason?: string }
  ) => {
    const response = await apiClient.patch(
      `/admin/prizes/ebay-sold-listings/${listingId}/moderation`,
      payload
    );
    return response.data;
  },

  deleteEbaySoldListing: async (
    listingId: string
  ): Promise<{ success: true; listingId: string }> => {
    const response = await apiClient.delete(`/admin/prizes/ebay-sold-listings/${listingId}`);
    return response.data;
  },

  approveEbaySoldListingReport: async (listingId: string, reason?: string) => {
    const response = await apiClient.post(
      `/admin/prizes/ebay-sold-listings/${listingId}/report/approve`,
      { reason }
    );
    return response.data;
  },

  rejectEbaySoldListingReports: async (
    listingId: string,
    reason?: string
  ): Promise<{ success: true; rejectedCount: number }> => {
    const response = await apiClient.post(
      `/admin/prizes/ebay-sold-listings/${listingId}/report/reject`,
      { reason }
    );
    return response.data;
  },

  getItemEbaySoldListings: async (
    itemId: string,
    limit: number = 240
  ): Promise<AdminEbaySoldListing[]> => {
    const response = await apiClient.get(`/admin/prizes/items/${itemId}/ebay-sold-listings`, {
      params: { limit },
    });
    return response.data;
  },

  updateItemEbaySearchQuery: async (
    itemId: string,
    ebaySearchQuery: string | null
  ): Promise<{ id: string; ebaySearchQuery: string | null }> => {
    const response = await apiClient.patch(`/admin/prizes/items/${itemId}/ebay-search-query`, {
      ebaySearchQuery,
    });
    return response.data;
  },

  deleteAllItemEbaySoldListings: async (itemId: string): Promise<{ deleted: number }> => {
    const response = await apiClient.delete(`/admin/prizes/items/${itemId}/ebay-sold-listings`);
    return response.data;
  },

  bulkDeleteEbaySoldListings: async (listingIds: string[]): Promise<{ deleted: number }> => {
    const response = await apiClient.delete('/admin/prizes/ebay-sold-listings/bulk', {
      data: { listingIds },
    });
    return response.data;
  },

  bulkModerateEbaySoldListings: async (
    listingIds: string[],
    isInaccurate: boolean,
    reason?: string
  ): Promise<{ updated: number }> => {
    const response = await apiClient.patch('/admin/prizes/ebay-sold-listings/bulk-moderate', {
      listingIds,
      isInaccurate,
      reason,
    });
    return response.data;
  },

  bulkUpdateEbayPublicVisibility: async (
    itemIds: string[],
    showPublicly: boolean
  ): Promise<{ updated: number }> => {
    console.log('[API Client] bulkUpdateEbayPublicVisibility request:', {
      endpoint: '/admin/prizes/items/bulk-update-ebay-visibility',
      itemIds,
      showPublicly,
    });
    const response = await apiClient.patch('/admin/prizes/items/bulk-update-ebay-visibility', {
      itemIds,
      showPublicly,
    });
    console.log('[API Client] bulkUpdateEbayPublicVisibility response:', response.data);
    return response.data;
  },

  syncAllEbayData: async (): Promise<{
    alreadyRunning: boolean;
    queued: number;
    itemIds: string[];
  }> => {
    const response = await apiClient.post('/admin/ebay-market/sync-all');
    return response.data;
  },

  migratePsaGradeFlags: async (): Promise<{
    jobId: string;
    message: string;
    estimatedItems: number;
  }> => {
    const response = await apiClient.post('/admin/ebay-market/migrate-psa-grade-flags');
    return response.data;
  },

  getMigratePsaGradeFlagsStatus: async (
    jobId: string
  ): Promise<{
    jobId: string;
    state: string;
    progress: number;
    processedItems: number;
    totalItems: number;
    result?: any;
  }> => {
    const response = await apiClient.get(
      `/admin/ebay-market/migrate-psa-grade-flags/${jobId}/status`
    );
    return response.data;
  },

  // Update stream
  updateStream: async (streamId: string, streamData: any) => {
    const response = await apiClient.patch(`/admin/streams/${streamId}`, streamData);
    return response.data;
  },

  // Create stream
  createStream: async (streamData: any) => {
    const response = await apiClient.post('/admin/streams', streamData);
    return response.data;
  },

  // Get all streams
  getStreams: async (params?: any) => {
    const response = await apiClient.get(`/admin/streams`, {
      params,
    });
    return response.data;
  },

  getBetsPerRound: async (params?: any) => {
    const response = await apiClient.get(`/admin/view-bets`, {
      params,
    });
    return response.data;
  },

  // Get stream details based on stream ID
  getStream: async (id: string) => {
    const response = await apiClient.get(`/admin/stream/${id}`);
    return response.data;
  },

  // Get stream bet details based on stream ID
  getCardCadeData: async (id: string) => {
    const response = await apiClient.get(`/admin/streams/${id}/rounds`);
    return response;
  },

  // Update bet status
  updateBetStatus: async (streamId: string, betStatusData: any) => {
    const response = await apiClient.patch(`/admin/rounds/${streamId}/status`, betStatusData);
    return response.data;
  },

  // Declare winner for a betting variable
  declareWinner: async (optionId: string) => {
    const response = await apiClient.post(`/admin/betting-variables/${optionId}/declare-winner`);
    return response.data;
  },

  // Update bet status
  cancelBetRound: async (roundId: string) => {
    const response = await apiClient.patch(`/admin/rounds/${roundId}/cancel`);
    return response.data;
  },

  // End the stream
  endStream: async (streamId: string) => {
    const response = await apiClient.patch(`/admin/streams/${streamId}/end`);
    return response.data;
  },

  // Delete stream
  deleteStream: async (streamId: string) => {
    const response = await apiClient.delete(`/admin/stream/scheduled/delete/${streamId}`);
    return response.data;
  },

  // Get analytics data for admin dashboard
  getAdminAnalyticsData: async () => {
    const response = await apiClient.get(`/admin/analytics/summary`);
    return response.data;
  },

  // Get stream analytics based on stream ID
  getStreamAnalytics: async (streamId: string) => {
    const response = await apiClient.get(`/admin/analytics/stream/${streamId}`);
    return response.data;
  },

  // Create betting options for stream
  createBettingData: async (payload: any) => {
    const response = await apiClient.post(`/admin/betting-variables`, payload);
    return response.data;
  },

  // Edit betting options for stream
  updateBettingData: async (payload: any) => {
    const response = await apiClient.patch(`/admin/betting-variables`, payload);
    return response.data;
  },

  // Lock betting for a stream
  lockBetting: async (streamId: string) => {
    const response = await apiClient.post(`/admin/streams/${streamId}/lock-betting`);
    return response.data;
  },

  // Edit betting options for stream
  updateBetRoundLandingPageVisibility: async (roundId: string, hidden: boolean) => {
    const response = await apiClient.patch(`/admin/rounds/${roundId}/landing-visiblity`, {
      hidden,
    });
    return response.data;
  },

  // Adjust user balance
  adjustUserBalance: async (userId: string, amount: number, reason: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/adjust-balance`, {
      amount,
      reason,
    });
    return response.data;
  },

  // Analytics
  getAnalytics: async (timeframe: 'day' | 'week' | 'month' | 'year' = 'week') => {
    const response = await apiClient.get(`/admin/analytics?timeframe=${timeframe}`);
    return response.data;
  },

  // Get platform metrics
  getPlatformMetrics: async () => {
    const response = await apiClient.get('/admin/metrics');
    return response.data;
  },

  // Get revenue reports
  getRevenueReports: async (startDate: string, endDate: string) => {
    const response = await apiClient.get(
      `/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  // Get betting activity reports
  getBettingReports: async (startDate: string, endDate: string) => {
    const response = await apiClient.get(
      `/admin/reports/betting?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  // Get user growth reports
  getUserGrowthReports: async (startDate: string, endDate: string) => {
    const response = await apiClient.get(
      `/admin/reports/users?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  // Get user profile of any user
  updateUserProfile: async ({ userId, userData }: { userId: string; userData: any }) => {
    const response = await apiClient.patch(`/admin/user/${userId}/profile`, userData);
    return response.data;
  },

  // Prize redemption management
  getPrizeRedemptions: async (params?: {
    status?: string;
    userId?: string;
    prizeTier?: number;
  }) => {
    const response = await apiClient.get('/admin/prizes/redemptions', { params });
    return response;
  },

  getRedemptionById: async (id: string) => {
    const response = await apiClient.get(`/admin/prizes/redemptions/${id}`);
    return response;
  },

  updateRedemptionStatus: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/admin/prizes/redemptions/${id}/status`, payload);
    return response;
  },

  // Application Management
  getAllApplications: async (_params?: {
    applicationType?: 'creator' | 'seller';
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
  }) => {
    // Endpoint removed when sellers became self-serve. Stub kept so any
    // stale callers compile but get an empty result.
    return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
  },

  approveApplication: async (_id: string) => {
    return null;
  },

  rejectApplication: async (_id: string) => {
    return null;
  },

  getPendingOnboardingSellers: async () => {
    const response = await apiClient.get(`/admin/sellers/pending-onboarding`);
    return response.data;
  },

  markSellerAsOnboarded: async id => {
    const response = await apiClient.patch(`/admin/sellers/${id}/complete-onboarding`);
    return response.data;
  },

  getSellerStripeStatus: async () => {
    const response = await apiClient.get(`/admin/sellers/stripe-status`);
    return response.data;
  },

  // CardCade Pro admin
  grantPro: async (userId: string, plan?: 'monthly' | 'yearly') => {
    const response = await apiClient.post(`/admin/pro/grant/${userId}`, {
      plan: plan || 'monthly',
    });
    return response.data;
  },

  revokePro: async (userId: string) => {
    const response = await apiClient.post(`/admin/pro/revoke/${userId}`);
    return response.data;
  },

  // Auctions feature flag (per-user)
  setAuctionsEnabled: async (userId: string, enabled: boolean) => {
    const response = await apiClient.patch(`/admin/users/${userId}/auctions-enabled`, { enabled });
    return response.data;
  },

  // Discount Codes
  getDiscountCodes: async () => {
    const response = await apiClient.get('/admin/discount-codes');
    return response.data;
  },

  createDiscountCode: async (data: {
    code: string;
    discountType: 'percent' | 'fixed_amount';
    discountPercent?: number;
    discountAmountCents?: number;
    usageType: 'per_account' | 'single_use';
    maxUses?: number;
    scope: 'cart' | 'cheapest_item';
    expiresAt?: string;
  }) => {
    const response = await apiClient.post('/admin/discount-codes', data);
    return response.data;
  },

  updateDiscountCode: async (
    id: string,
    data: {
      discountType?: 'percent' | 'fixed_amount';
      discountPercent?: number;
      discountAmountCents?: number;
      usageType?: 'per_account' | 'single_use';
      maxUses?: number | null;
      scope?: 'cart' | 'cheapest_item';
      isActive?: boolean;
      expiresAt?: string | null;
    }
  ) => {
    const response = await apiClient.patch(`/admin/discount-codes/${id}`, data);
    return response.data;
  },

  // Promo Codes (signup-bonus coin codes)
  getPromoCodes: async () => {
    const response = await apiClient.get('/admin/promo-codes');
    return response.data;
  },

  createPromoCode: async (data: {
    code: string;
    amount: number;
    isActive?: boolean;
    expiresAt?: string;
  }) => {
    const response = await apiClient.post('/admin/promo-codes', data);
    return response.data;
  },

  updatePromoCode: async (
    id: string,
    data: {
      amount?: number;
      isActive?: boolean;
      expiresAt?: string | null;
    }
  ) => {
    const response = await apiClient.patch(`/admin/promo-codes/${id}`, data);
    return response.data;
  },
};

// Creator API (Stripe Connect link only — seller application + creator role removed)
export const creatorAPI = {
  generateAccountLink: async () => {
    const response = await apiClient.post('/creator/create-connect-link');

    return response.data;
  },
  getMyStripeStatus: async () => {
    const response = await apiClient.get('/creator/stripe-status');
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  // Get session key for purchase and withdraw
  getSessionKey: async () => {
    const response = await apiClient.get('/payments/coinflow/session-key');
    return response.data;
  },

  // Get withdrawer data
  getWithdrawerData: async () => {
    const response = await apiClient.get('/payments/coinflow/withdrawer', {
      params: {
        redirectLink: `${import.meta.env.VITE_APP_HOST_URL}/withdraw`,
      },
    });
    return response;
  },

  // Get withdraw quote
  getWithdrawQuote: async (amount: number) => {
    const response = await apiClient.get('/payments/coinflow/withdrawer/quote', {
      params: { amount },
    });
    return response.data;
  },

  // Perform funds withdraw
  redeemSweepCoins: async (payload: WithdrawPayload) => {
    const response = await apiClient.post(`/payments/coinflow/withdraw`, payload);
    return response.data;
  },

  // Delete bank account
  deleteBankAccount: async (bankToken: string) => {
    const response = await apiClient.delete(
      `/payments/coinflow/delete-withdrawer-account?token=${bankToken}`
    );
    return response.data;
  },

  // Register non-US user as withdrawer
  registerKyc: async (payload: WithdrawKycPayload) => {
    const response = await apiClient.post(`/payments/coinflow/withdraw/kyc`, {
      redirectLink: `${import.meta.env.VITE_APP_HOST_URL}/withdraw`,
      ...payload,
    });
    return response;
  },

  // Register US-based user as withdrawer
  registerKycUs: async (payload: WithdrawKycUsPayload) => {
    const response = await apiClient.post(`/payments/coinflow/withdraw/kyc-us`, {
      redirectLink: `${import.meta.env.VITE_APP_HOST_URL}/withdraw`,
      ...payload,
    });
    return response;
  },
};

// Daily Spin API
export const dailySpinAPI = {
  // Get daily spin status
  getStatus: async (): Promise<SpinStatusResponse> => {
    const response = await apiClient.get('/daily-spin/status');
    return response.data;
  },

  // Execute daily spin
  executeSpin: async (): Promise<SpinResultResponse> => {
    const response = await apiClient.post('/daily-spin/spin');
    return response.data;
  },
};

// Prize API
export const prizeAPI = {
  // Get all active prize tiers (public endpoint)
  getActivePrizeTiers: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/prizes/config');
    return response.data;
  },

  // Get all shop items across all sellers (for main Shop page)
  getAllShopItems: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/prizes/shop-items');
    return response.data;
  },

  getShopItemById: async (id: string): Promise<PrizeConfiguration> => {
    const response = await apiClient.get(`/prizes/shop-items/${id}`);
    return response.data;
  },

  getEbayMarketSummary: async (id: string): Promise<EbayMarketSummary> => {
    try {
      const response = await apiClient.get(`/prizes/shop-items/${id}/ebay-market-summary`);
      return response.data;
    } catch (error: any) {
      console.error('[API Client] getEbayMarketSummary error:', {
        itemId: id,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        fullError: error,
      });
      throw error;
    }
  },

  getEbayFeatureFlags: async (): Promise<{
    ebaySoldAvgEnabled: boolean;
    ebaySoldAvgAdminOnly: boolean;
    ebayManualSyncEnabled: boolean;
    ebayItemCardButtonPublic: boolean;
  }> => {
    const response = await apiClient.get('/prizes/ebay-feature-flags');
    return response.data;
  },

  getEbayMarketHistory: async (id: string, limit: number = 120): Promise<EbayMarketHistory> => {
    const response = await apiClient.get(`/prizes/shop-items/${id}/ebay-market-history`, {
      params: { limit },
    });
    return response.data;
  },

  reportEbaySoldListing: async (
    listingId: string,
    payload?: { reason?: string }
  ): Promise<{ success: true; listingId: string }> => {
    const response = await apiClient.post(
      `/prizes/ebay-sold-listings/${listingId}/report`,
      payload
    );
    return response.data;
  },

  syncEbaySoldListingsNow: async (
    itemId: string
  ): Promise<{
    itemId: string;
    fetched: number;
    inserted: number;
    deduped: number;
    autoFlagged: number;
    query: string;
    calculatedAt: string;
  }> => {
    const response = await apiClient.patch(`/admin/ebay-market/items/${itemId}/sync-now`, {});
    return response.data;
  },

  // Get all public seller shops with active inventory
  getSellerShops: async (limit?: number): Promise<SellerShopSummary[]> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get(`/prizes/shops${params}`);
    return response.data;
  },

  // Get one seller's public shop items
  getShopItemsByUsername: async (username: string): Promise<SellerShopResponse> => {
    const response = await apiClient.get(`/prizes/shops/${username}/items`);
    return response.data;
  },

  // Get recent purchases by username (public)
  getRecentPurchasesByUsername: async (username: string, limit: number = 6) => {
    const response = await apiClient.get(`/prizes/purchases/${username}?limit=${limit}`);
    return response.data;
  },

  // Seller: manage own shop inventory
  getMyShopItems: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/seller/prizes/items');
    return response.data;
  },

  createMyShopItem: async (payload: {
    prizeTier?: number;
    amount?: number;
    name: string;
    description?: string;
    imageUrl?: string;
    imageUrls?: string[];
    coverImageIndex?: number;
    category?: 'raw' | 'slab' | 'sealed' | 'other';
    grade?: string | null;
    stock?: number;
    purchaseOption?: 'offers_only' | 'buy_only' | 'both';
    brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
    sellerDisplayOrderShop?: number;
    profileFeatured?: boolean;
    saleType?: 'fixed_price' | 'auction';
    /** Per-item shipping fee in USD. Server defaults to $5 if omitted. 0 = Free Shipping. */
    shippingCostUsd?: number;
    /** When true, item is in-person pickup (forces shipping to $0, skips address). */
    isInPerson?: boolean;
  }): Promise<PrizeConfiguration> => {
    const response = await apiClient.post('/seller/prizes/items', payload);
    return response.data;
  },

  updateMyShopItem: async (
    id: string,
    payload: {
      prizeTier?: number;
      amount?: number;
      name: string;
      description?: string;
      imageUrl?: string;
      imageUrls?: string[];
      coverImageIndex?: number;
      category?: 'raw' | 'slab' | 'sealed' | 'other';
      grade?: string | null;
      stock?: number;
      purchaseOption?: 'offers_only' | 'buy_only' | 'both';
      brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
      sellerDisplayOrderShop?: number;
      profileFeatured?: boolean;
      /** Per-item shipping fee in USD. 0 = Free Shipping. */
      shippingCostUsd?: number;
      /** When true, item is in-person pickup. */
      isInPerson?: boolean;
    }
  ): Promise<PrizeConfiguration> => {
    const response = await apiClient.put(`/seller/prizes/items/${id}`, payload);
    return response.data;
  },

  deleteMyShopItem: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/seller/prizes/items/${id}`);
    return response.data;
  },

  updateProfileFeaturedItems: async (
    featuredItemIds: string[]
  ): Promise<{ featuredCount: number }> => {
    const response = await apiClient.patch('/seller/prizes/profile-featured', { featuredItemIds });
    return response.data;
  },

  getMyShopOffers: async (params?: { status?: string; range?: string }) => {
    const response = await apiClient.get('/seller/prizes/offers', { params });
    return response.data;
  },

  counterMyShopOffer: async (
    orderId: string,
    data: { counterOfferAmount: number; offerNotes?: string }
  ) => {
    const response = await apiClient.patch(`/seller/prizes/offers/${orderId}/counter`, data);
    return response.data;
  },

  acceptMyShopOffer: async (orderId: string) => {
    const response = await apiClient.patch(`/seller/prizes/offers/${orderId}/accept-offer`);
    return response.data;
  },

  rejectMyShopOffer: async (orderId: string) => {
    const response = await apiClient.patch(`/seller/prizes/offers/${orderId}/reject-offer`);
    return response.data;
  },

  importPsaCert: async (certNumber: string): Promise<PsaImportResult> => {
    const response = await apiClient.post('/seller/prizes/psa/import-cert', {
      certNumber,
    });
    return response.data;
  },

  searchEbayListings: async (title: string, limit = 5): Promise<EbayListing[]> => {
    const response = await apiClient.post('/seller/prizes/ebay/search', { title, limit });
    return response.data?.listings ?? [];
  },

  searchEbayListingsByImage: async (imageBase64: string, limit = 5): Promise<EbayListing[]> => {
    const response = await apiClient.post('/seller/prizes/ebay/search-by-image', {
      imageBase64,
      limit,
    });
    return response.data?.listings ?? [];
  },

  // Get seller's purchased orders
  getMyShopOrders: async (params?: { status?: string; range?: string }) => {
    const response = await apiClient.get('/seller/prizes/orders', { params });
    return response.data;
  },

  // Mark seller order as shipped
  markMyOrderAsShipped: async (
    orderId: string,
    data: { trackingNumber?: string; shippingCarrier?: string }
  ) => {
    const response = await apiClient.patch(`/seller/prizes/orders/${orderId}/mark-shipped`, data);
    return response.data;
  },

  // Get all active prize tiers (admin only)
  getAdminPrizeTiers: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/admin/prizes');
    return response.data;
  },

  // Create a new prize tier (admin only)
  createPrizeTier: async (payload: {
    prizeTier?: number;
    amount?: number;
    name: string;
    description?: string;
    imageUrl?: string;
    imageUrls?: string[];
    coverImageIndex?: number;
    category?: 'raw' | 'slab' | 'sealed' | 'other';
    stock?: number;
    purchaseOption?: 'offers_only' | 'buy_only' | 'both';
    brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
    /** Per-item shipping fee in USD. Server defaults to $5 if omitted. */
    shippingCostUsd?: number;
    /** When true, item is in-person pickup. */
    isInPerson?: boolean;
  }): Promise<PrizeConfiguration> => {
    const response = await apiClient.post('/admin/prizes', payload);
    return response.data;
  },

  // Update a prize tier (admin only)
  updatePrizeTier: async (
    id: string,
    payload: {
      prizeTier?: number;
      amount?: number;
      name: string;
      description?: string;
      imageUrl?: string;
      imageUrls?: string[];
      coverImageIndex?: number;
      category?: 'raw' | 'slab' | 'sealed' | 'other';
      stock?: number;
      purchaseOption?: 'offers_only' | 'buy_only' | 'both';
      brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
      createdBy?: string | null;
      showOnShop?: boolean;
      showOnRedemptions?: boolean;
      /** Per-item shipping fee in USD. */
      shippingCostUsd?: number;
      /** When true, item is in-person pickup. */
      isInPerson?: boolean;
    }
  ): Promise<PrizeConfiguration> => {
    const response = await apiClient.put(`/admin/prizes/${id}`, payload);
    return response.data;
  },

  // Delete (soft delete) a prize tier (admin only)
  deletePrizeTier: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/prizes/${id}`);
    return response.data;
  },

  // Bulk update display orders (admin only)
  bulkUpdateDisplayOrder: async (payload: {
    updates: Array<{
      id: string;
      displayOrderShop: number;
      displayOrderRedemptions: number;
      featuredDisplayOrder: number | null;
    }>;
  }): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.patch('/admin/prizes/bulk-display-order', payload);
    return response.data;
  },

  // Get all prize tiers including inactive (admin only, for history/audit)
  getPrizeHistory: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/admin/prizes/history');
    return response.data;
  },

  // Get shop settings for a virtual shop (admin only)
  getShopSettings: async (shopKey: string) => {
    const response = await apiClient.get(`/admin/prizes/shop-settings/${shopKey}`);
    return response.data;
  },

  // Update shop settings for a virtual shop (admin only)
  updateShopSettings: async (
    shopKey: string,
    payload: {
      shopName?: string;
      profileImageUrl?: string | null;
      socials?: Record<string, string>;
      sellerTradingExperience?: string;
      city?: string;
      state?: string;
      country?: string;
      cryptoPaymentsEnabled?: boolean;
      cryptoWalletAddress?: string | null;
    }
  ) => {
    const response = await apiClient.patch(`/admin/prizes/shop-settings/${shopKey}`, payload);
    return response.data;
  },

  // Submit prize redemption request
  submitRedemption: async (redemptionData: SubmitPrizeRedemptionRequest) => {
    const response = await apiClient.post('/prizes/redeem', redemptionData);
    return response.data;
  },

  // Get user's redemptions
  getMyRedemptions: async () => {
    const response = await apiClient.get('/prizes/my-redemptions');
    return response.data;
  },

  // Create a prize purchase order (coins + USD combined payment)
  createPrizeOrder: async (orderData: any) => {
    const response = await apiClient.post('/prizes/purchase', orderData);
    return response.data;
  },

  // Confirm prize order after Stripe success redirect
  confirmPrizeOrder: async (orderId: string) => {
    const response = await apiClient.post(`/prizes/webhook/stripe-success/${orderId}`);
    return response.data;
  },

  // Get user's prize orders
  getMyOrders: async () => {
    const response = await apiClient.get('/prizes/my-orders');
    return response.data;
  },

  getShopOrders: async () => {
    const response = await apiClient.get('/prizes/my-shop-orders');
    return response.data;
  },

  // Get global sales feed (all completed sales across the platform)
  getGlobalSales: async (params?: { range?: string; q?: string }) => {
    const response = await apiClient.get('/prizes/global-sales', { params });
    return response.data;
  },

  // Get user's address (secure endpoint)
  // Note: Lives in users API since address is user data, but primarily used
  // by prize redemption feature for shipping address pre-population
  getMyAddress: async () => {
    const response = await apiClient.get('/users/me/address');
    return response.data.data; // Extract nested data object
  },

  // Accept a counter offer on a prize order
  acceptCounterOffer: async (orderId: string) => {
    const response = await apiClient.post(`/prizes/orders/${orderId}/accept-counter`);
    return response.data;
  },

  // Make an offer on a prize
  makeOffer: async (offerData: {
    prizeConfigId: string;
    shippingAddress: any;
    offerAmount: number;
    offerNotes?: string;
    // Stripe method the buyer agrees to pay with if the offer is
    // accepted. Locked in now so the buyer fee at acceptance is the
    // rate the buyer was quoted (card = 3%, ACH = 0.8%).
    stripePaymentMethod: 'card' | 'us_bank_account';
  }) => {
    const response = await apiClient.post('/prizes/make-offer', offerData);
    return response.data;
  },

  // Get order success details for purchase confirmation page
  getOrderSuccessDetails: async (orderId: string) => {
    const response = await apiClient.get(`/prizes/orders/${orderId}/success-details`);
    return response.data;
  },

  // ---- Item engagement: views & watchers ----

  /**
   * Record one or more item view events. The backend dedupes by
   * (item, viewer, day) so calling this many times is cheap. Anonymous
   * viewers are identified by the `x-anon-id` header which is attached
   * automatically by the request interceptor.
   */
  trackItemViews: async (itemIds: string[]): Promise<void> => {
    if (!itemIds || itemIds.length === 0) return;
    await apiClient.post('/prizes/views', { itemIds });
  },

  /** Add an item to the current user's watchlist (login required). */
  watchItem: async (itemId: string): Promise<{ watching: boolean; watcherCount: number }> => {
    const response = await apiClient.post(`/prizes/${itemId}/watch`);
    return response.data;
  },

  /** Remove an item from the current user's watchlist (login required). */
  unwatchItem: async (itemId: string): Promise<{ watching: boolean; watcherCount: number }> => {
    const response = await apiClient.delete(`/prizes/${itemId}/watch`);
    return response.data;
  },

  /** Get the current user's full watchlist (login required). */
  getWatchlist: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/prizes/watchlist');
    return response.data;
  },

  /**
   * Get the prizes the current user has placed at least one bid on,
   * ordered by most-recent bid (login required). Each item's `auction`
   * summary includes `isLeader` and `currentUserProxyMaxUsd` for the
   * requesting user.
   */
  getMyBids: async (): Promise<PrizeConfiguration[]> => {
    const response = await apiClient.get('/prizes/my-bids');
    return response.data;
  },
};

// Inbox API
export const inboxAPI = {
  // Create a new conversation
  createConversation: async (data: {
    recipientId?: string;
    type: 'direct' | 'support';
    subject?: string;
    initialMessage: string;
  }): Promise<Conversation> => {
    const response = await apiClient.post('/inbox/conversations', data);
    return response.data;
  },

  // List conversations
  listConversations: async (params?: {
    tab?: ConversationTab;
    page?: number;
    limit?: number;
  }): Promise<ConversationListResponse> => {
    const response = await apiClient.get('/inbox/conversations', { params });
    return response.data;
  },

  // Get conversation messages
  getConversationMessages: async (
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<MessageListResponse> => {
    const response = await apiClient.get(`/inbox/conversations/${conversationId}`, { params });
    return response.data;
  },

  // Send a message
  sendMessage: async (
    conversationId: string,
    data: {
      content: string;
      attachments?: UploadedAttachment[];
    }
  ) => {
    const response = await apiClient.post(`/inbox/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId: string) => {
    const response = await apiClient.post(`/inbox/conversations/${conversationId}/read`);
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get('/inbox/unread-count');
    return response.data;
  },

  // Block a user
  blockUser: async (userId: string) => {
    const response = await apiClient.post(`/inbox/block/${userId}`);
    return response.data;
  },

  // Unblock a user
  unblockUser: async (userId: string) => {
    const response = await apiClient.delete(`/inbox/block/${userId}`);
    return response.data;
  },

  // Get inbox settings
  getSettings: async (): Promise<InboxSettings> => {
    const response = await apiClient.get('/inbox/settings');
    return response.data;
  },

  // Update inbox settings
  updateSettings: async (data: InboxSettings): Promise<InboxSettings> => {
    const response = await apiClient.patch('/inbox/settings', data);
    return response.data;
  },

  // Upload a photo attachment
  uploadPhoto: async (file: File): Promise<UploadedAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/inbox/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Admin: list conversations
  adminListConversations: async (params?: {
    tab?: AdminConversationTab;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ConversationListResponse> => {
    const response = await apiClient.get('/admin/inbox/conversations', {
      params,
    });
    return response.data;
  },

  // Admin: get conversation messages
  adminGetConversationMessages: async (
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<MessageListResponse> => {
    const response = await apiClient.get(`/admin/inbox/conversations/${conversationId}`, {
      params,
    });
    return response.data;
  },

  // Admin: send message
  adminSendMessage: async (conversationId: string, content: string) => {
    const response = await apiClient.post(`/admin/inbox/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data;
  },
};

// ─── Subscription API ────────────────────────────────────────
const subscriptionAPI = {
  createCheckoutSession: async (plan: 'monthly' | 'yearly') => {
    const response = await apiClient.post('/subscription/checkout', { plan });
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get('/subscription/status');
    return response.data;
  },

  upgradeToYearly: async () => {
    const response = await apiClient.patch('/subscription/upgrade');
    return response.data;
  },
};

// ─── Concierge API ──────────────────────────────────────────
const conciergeAPI = {
  createRequest: async () => {
    const response = await apiClient.post('/concierge/request');
    return response.data;
  },

  getMyRequest: async () => {
    const response = await apiClient.get('/concierge/my-request');
    return response.data;
  },

  // Admin
  getAllRequests: async () => {
    const response = await apiClient.get('/concierge/admin/requests');
    return response.data;
  },

  claimRequest: async (requestId: string) => {
    const response = await apiClient.post(`/concierge/admin/claim/${requestId}`);
    return response.data;
  },
};

// ==================== Cart API ====================
export const cartAPI = {
  /** Get cart summary grouped by seller with pricing */
  getCartSummary: async (): Promise<CartSummary> => {
    const response = await apiClient.get('/cart');
    const raw = response.data?.data ?? response.data;

    // Transform backend response shape to frontend CartSummary type
    return {
      cart: {
        id: raw.cartId ?? '',
        userId: '',
        createdAt: '',
        updatedAt: '',
        items: (raw.sellerGroups ?? []).flatMap((g: any) =>
          (g.items ?? []).map((item: any) => ({
            id: item.id,
            cartId: raw.cartId ?? '',
            prizeConfigurationId: item.prizeConfiguration?.id ?? '',
            quantity: item.quantity,
            createdAt: '',
            updatedAt: '',
            prizeConfiguration: item.prizeConfiguration,
          }))
        ),
      },
      sellerGroups: (raw.sellerGroups ?? []).map((g: any) => ({
        sellerId: g.sellerId,
        sellerName: g.sellerName,
        shopName: g.shopName,
        stripeAccountId: g.stripeAccountId ?? null,
        items: (g.items ?? []).map((item: any) => ({
          id: item.id,
          cartId: raw.cartId ?? '',
          prizeConfigurationId: item.prizeConfiguration?.id ?? '',
          quantity: item.quantity,
          createdAt: '',
          updatedAt: '',
          prizeConfiguration: item.prizeConfiguration,
        })),
        itemSubtotalCents: Math.round(parseFloat(g.itemSubtotal ?? '0') * 100),
        shippingCents: Math.round(parseFloat(g.shipping ?? '0') * 100),
        buyerFeeCents: Math.round(parseFloat(g.buyerFee ?? '0') * 100),
        sellerFeeCents: 0,
        sellerFeePercent: 0,
        totalCents: Math.round(parseFloat(g.total ?? '0') * 100),
      })),
      cartTotals: {
        itemSubtotalCents: Math.round(parseFloat(raw.totals?.itemSubtotal ?? '0') * 100),
        shippingCents: Math.round(parseFloat(raw.totals?.shipping ?? '0') * 100),
        buyerFeeCents: Math.round(parseFloat(raw.totals?.buyerFee ?? '0') * 100),
        totalCents: Math.round(parseFloat(raw.totals?.total ?? '0') * 100),
        itemCount: raw.totals?.itemCount ?? 0,
      },
      removedItems: raw.removedItems ?? [],
    };
  },

  /** Get cart item count for nav badge */
  getCartCount: async (): Promise<CartCountResponse> => {
    const response = await apiClient.get('/cart/count');
    const raw = response.data?.data ?? response.data;
    return { count: raw.count ?? 0 };
  },

  /** Add an item to cart */
  addToCart: async (dto: AddToCartRequest): Promise<void> => {
    await apiClient.post('/cart/items', dto);
  },

  /** Update cart item quantity */
  updateCartItem: async (cartItemId: string, dto: UpdateCartItemRequest): Promise<void> => {
    await apiClient.patch(`/cart/items/${cartItemId}`, dto);
  },

  /** Remove item from cart */
  removeCartItem: async (cartItemId: string): Promise<void> => {
    await apiClient.delete(`/cart/items/${cartItemId}`);
  },

  /** Empty entire cart */
  clearCart: async (): Promise<void> => {
    await apiClient.delete('/cart');
  },

  /** Validate a discount code */
  validateDiscountCode: async (code: string): Promise<ValidateDiscountCodeResponse> => {
    const response = await apiClient.post('/cart/validate-discount-code', { code });
    return response.data?.data ?? response.data;
  },

  /** Checkout cart - returns Stripe session URL for USD items */
  checkout: async (dto: CartCheckoutRequest): Promise<CartCheckoutResponse> => {
    const response = await apiClient.post('/cart/checkout', dto);
    const raw = response.data?.data ?? response.data;
    return {
      stripeSessionUrl: raw.stripeSessionUrl,
      coinOnlyOrderIds: raw.coinOnlyOrderIds,
      message: response.data?.message ?? 'Checkout complete',
    };
  },

  /** Submit a bundle offer for items from the same seller */
  submitBundleOffer: async (dto: BundleOfferRequest): Promise<BundleOfferResponse> => {
    const response = await apiClient.post('/cart/bundle-offer', dto);
    const raw = response.data?.data ?? response.data;
    return {
      bundleId: raw.bundleId ?? '',
      orderIds: raw.orderIds ?? [],
      message: response.data?.message ?? 'Bundle offer submitted',
    };
  },
};

export const reviewAPI = {
  /** Aggregate buyer/seller stats for a user. Public. */
  getUserStats: async (username: string): Promise<ReviewStats> => {
    const response = await apiClient.get(`/reviews/user/${encodeURIComponent(username)}/stats`);
    return response.data?.data ?? response.data;
  },

  /** Paginated list of reviews about a user with optional filters/sort. Public. */
  listReviewsForUser: async (
    username: string,
    query: ListReviewsQuery = {}
  ): Promise<PaginatedReviews> => {
    const params: Record<string, string | number> = {};
    if (query.role) params.role = query.role;
    if (query.sort) params.sort = query.sort;
    if (query.page) params.page = query.page;
    if (query.perPage) params.perPage = query.perPage;
    const response = await apiClient.get(`/reviews/user/${encodeURIComponent(username)}`, {
      params,
    });
    return response.data?.data ?? response.data;
  },

  /** Create a new review for one of my orders. */
  createReview: async (payload: CreateReviewPayload): Promise<Review> => {
    const response = await apiClient.post('/reviews', payload);
    return response.data?.data ?? response.data;
  },

  /** Edit one of my own reviews (within 7 days of posting). */
  updateReview: async (id: string, payload: UpdateReviewPayload): Promise<Review> => {
    const response = await apiClient.patch(`/reviews/${id}`, payload);
    return response.data?.data ?? response.data;
  },

  /** Delete one of my own reviews (within 14 days of posting). */
  deleteReview: async (id: string): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },

  /** All of my orders that are reviewable (with any review I've left). */
  getMyReviewable: async (): Promise<ReviewableOrderSide[]> => {
    const response = await apiClient.get('/reviews/me/reviewable');
    return response.data?.data ?? response.data;
  },

  /** My review (and counterparty info) for a specific order. */
  getReviewForOrder: async (orderId: string): Promise<ReviewableOrderSide> => {
    const response = await apiClient.get(`/reviews/order/${encodeURIComponent(orderId)}`);
    return response.data?.data ?? response.data;
  },
};

/**
 * Auctions API.
 *
 * The auction lifecycle:
 *  1. Admin creates an auction via `create()` (item must already exist
 *     with `saleType === 'auction'`).
 *  2. First-time bidder calls `createSetupIntent()`, then mounts Stripe
 *     Elements to attach a card.
 *  3. Subsequent bids call `placeBid()` directly using a saved card
 *     (returned by `listSavedCards()`).
 */
export const auctionAPI = {
  list: async (): Promise<import('@/types/prize').AuctionSummary[]> => {
    const response = await apiClient.get('/auctions');
    return response.data;
  },

  getById: async (id: string): Promise<import('@/types/prize').AuctionSummary> => {
    const response = await apiClient.get(`/auctions/${id}`);
    return response.data;
  },

  /**
   * Place a bid. Pass `proxyMaxUsd` (the bidder's max-willing-to-pay) and
   * either an explicit `stripePaymentMethodId` (first bid after SetupIntent
   * confirmation) or omit it to reuse the most recent saved card.
   */
  placeBid: async (
    auctionId: string,
    payload: { proxyMaxUsd: number; stripePaymentMethodId?: string }
  ): Promise<import('@/types/prize').AuctionSummary> => {
    const response = await apiClient.post(`/auctions/${auctionId}/bid`, payload);
    return response.data;
  },

  /** Create a SetupIntent so the bidder can collect & save a card. */
  createSetupIntent: async (): Promise<{ clientSecret: string; customerId: string }> => {
    const response = await apiClient.post('/auctions/setup-intent');
    return response.data;
  },

  /**
   * Create a hosted Stripe Checkout setup session. Returns a URL the
   * frontend should redirect to. On return the bidder's card is saved
   * to their Stripe customer and they can place a bid.
   */
  createSetupCheckout: async (returnUrl: string): Promise<{ url: string }> => {
    const response = await apiClient.post('/auctions/setup-checkout', { returnUrl });
    return response.data;
  },

  /** List the bidder's saved cards (used for the "use saved card" chip). */
  listSavedCards: async (): Promise<
    Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number }>
  > => {
    const response = await apiClient.get('/auctions/me/cards');
    return response.data;
  },

  /**
   * Read-only summary of an auction the current user won, used by the
   * retry-payment page when the autopay charge declined. Returns 403
   * if the caller is not the winner.
   */
  getPaymentStatus: async (
    auctionId: string
  ): Promise<{
    auctionId: string;
    status: string;
    canRetry: boolean;
    itemName: string;
    prizeConfigurationId: string;
    winningBidUsd: number;
    buyerProcessingFeeUsd: number;
    shippingUsd: number;
    totalDueUsd: number;
    graceDeadline: string | null;
    paymentIntentId: string | null;
  }> => {
    const response = await apiClient.get(`/auctions/${auctionId}/payment-status`);
    return response.data;
  },

  /**
   * Build a hosted Stripe Checkout (mode=payment) URL the winner can
   * redirect to in order to retry the failed auction charge or pay
   * with a different card. Saved cards on the customer record are
   * surfaced inside the Stripe-hosted page; new cards are saved for
   * future auctions automatically.
   */
  createRetryCheckout: async (
    auctionId: string,
    returnUrl: string,
    stripePaymentMethod: 'card' | 'us_bank_account',
  ): Promise<{ url: string }> => {
    const response = await apiClient.post(`/auctions/${auctionId}/retry-checkout`, {
      returnUrl,
      stripePaymentMethod,
    });
    return response.data;
  },

  // ── Admin ────────────────────────────────────────────────────────────
  create: async (payload: {
    prizeConfigurationId: string;
    durationDays: 1 | 3 | 5 | 7;
    startingPriceUsd: number;
    reservePriceUsd?: number;
    cardValueUsd?: number;
    startsAt?: string;
  }) => {
    const response = await apiClient.post('/admin/auctions', payload);
    return response.data;
  },

  /**
   * Seller-facing auction creation. Backend verifies (a) the prize
   * belongs to the caller and (b) the caller has `auctionsEnabled=true`
   * (set by an admin via the Users tab). Returns 403 otherwise.
   */
  createAsSeller: async (payload: {
    prizeConfigurationId: string;
    durationDays: 1 | 3 | 5 | 7;
    startingPriceUsd: number;
    reservePriceUsd?: number;
    cardValueUsd?: number;
    startsAt?: string;
  }) => {
    const response = await apiClient.post('/seller/auctions', payload);
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await apiClient.post(`/admin/auctions/${id}/cancel`);
    return response.data;
  },

  /**
   * Force the close-flow to run for a given auction. Charges the winner
   * and creates the order if applicable. Used by ops to recover stuck
   * auctions where the BullMQ close job got out of sync with the DB.
   */
  forceClose: async (id: string): Promise<import('@/types/prize').AuctionSummary> => {
    const response = await apiClient.post(`/admin/auctions/${id}/force-close`);
    return response.data;
  },

  /** Admin listing of every auction (any status) with ops metadata. */
  listAdmin: async (): Promise<AdminAuctionRow[]> => {
    const response = await apiClient.get('/admin/auctions');
    return response.data;
  },

  /**
   * Per-auction admin detail: winner identity + shipping address from
   * the linked PrizeOrder. Returns winner/shipping as null until the
   * auction has resolved with a successful charge.
   */
  getAdminDetails: async (id: string): Promise<AdminAuctionDetails> => {
    const response = await apiClient.get(`/admin/auctions/${id}/details`);
    return response.data;
  },

  /**
   * Full bid history (newest first) for an auction. Powers the bid
   * history table inside the admin auction detail dialog.
   */
  listAdminBids: async (id: string): Promise<AdminAuctionBidRow[]> => {
    const response = await apiClient.get(`/admin/auctions/${id}/bids`);
    return response.data;
  },
};

/** Shipping address shape stored on PrizeOrder.shippingAddress. */
export interface AdminAuctionShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/** Shape returned by GET /admin/auctions/:id/details. */
export interface AdminAuctionDetails {
  id: string;
  status: AdminAuctionRow['status'];
  winnerUserId: string | null;
  winner: { id: string; username: string; email: string | null } | null;
  paidAt: string | null;
  paymentIntentId: string | null;
  prizeOrderId: string | null;
  winningBidUsd: number | null;
  shippingAddress: AdminAuctionShippingAddress | null;
  orderStatus: string | null;
}

/** A single row in the bid history (returned by GET /admin/auctions/:id/bids). */
export interface AdminAuctionBidRow {
  id: string;
  userId: string;
  username: string | null;
  amountUsd: number;
  proxyMaxUsd: number;
  isProxyAuto: boolean;
  createdAt: string;
}

/**
 * Row shape returned by GET /admin/auctions.
 */
export interface AdminAuctionRow {
  id: string;
  prizeConfigurationId: string;
  prizeName: string;
  status:
    | 'scheduled'
    | 'active'
    | 'ended'
    | 'paid'
    | 'unsold'
    | 'failed'
    | 'cancelled';
  startsAt: string;
  endsAt: string;
  durationDays: number;
  startingPriceUsd: number;
  reservePriceUsd: number | null;
  currentBidUsd: number | null;
  bidCount: number;
  extensionCount: number;
  winnerUserId: string | null;
  winnerUsername: string | null;
  paidAt: string | null;
  prizeOrderId: string | null;
  paymentIntentId: string | null;
  isOverdue: boolean;
}

// Export a single API object with all the services
export const api = {
  auth: authAPI,
  user: userAPI,
  wallet: walletAPI,
  betting: bettingAPI,
  socket: socketAPI,
  admin: adminAPI,
  analytics: analyticsAPI,
  userStream: userStreamAPI,
  payment: paymentAPI,
  bets: betsAPI,
  creator: creatorAPI,
  prize: prizeAPI,
  dailySpin: dailySpinAPI,
  inbox: inboxAPI,
  subscription: subscriptionAPI,
  concierge: conciergeAPI,
  cart: cartAPI,
  review: reviewAPI,
  auction: auctionAPI,
};

export default api;
