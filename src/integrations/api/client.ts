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
  Conversation,
  ConversationListResponse,
  MessageListResponse,
  UnreadCountResponse,
  InboxSettings,
  UploadedAttachment,
  ConversationTab,
  AdminConversationTab,
} from '@/types/inbox';

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
    console.log('socket connection iniiated');
    if (!token && withAuth) return null;
    console.log('socket connected confirmed');
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

  getStreamPayoutReport: async (params?: any) => {
    const response = await apiClient.get(`/admin/stream-payout-report`, {
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
  getAllApplications: async (params?: {
    applicationType?: 'creator' | 'seller';
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/admin/applications', { params });
    return response.data;
  },

  approveApplication: async (id: string) => {
    const response = await apiClient.patch(`/admin/applications/${id}/approve`);
    return response.data;
  },

  rejectApplication: async (id: string) => {
    const response = await apiClient.patch(`/admin/applications/${id}/reject`);
    return response.data;
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
};

// Creator API
export const creatorAPI = {
  // Get analytics data for admin dashboard
  getCreatorAnalyticsData: async () => {
    const response = await apiClient.get(`/creator/analytics/summary`);
    return response.data;
  },

  generateAccountLink: async () => {
    const response = await apiClient.post('/creator/create-connect-link');

    return response.data;
  },

  // Create stream
  createStream: async (streamData: any) => {
    const response = await apiClient.post('/creator/streams', streamData);
    return response.data;
  },

  // Create betting options for stream
  createBettingData: async (payload: any) => {
    const response = await apiClient.post(`/creator/betting-variables`, payload);
    return response.data;
  },

  // Get all streams
  getStreams: async (params?: any) => {
    const response = await apiClient.get(`/creator/streams`, {
      params,
    });
    return response.data;
  },

  // Get stream details based on stream ID
  getStream: async (id: string) => {
    const response = await apiClient.get(`/creator/stream/${id}`);
    return response.data;
  },

  // Get stream details based on stream ID
  getCreatorPayoutsHistory: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(`/creator/payoutsHistory`, { params });
    return response.data;
  },

  createCreatorApplication: async (payload: any) => {
    const response = await apiClient.post(`/creator/application`, payload);
    return response.data;
  },

  updateCreatorApplication: async (payload: any) => {
    const response = await apiClient.patch(`/creator/application`, payload);
    return response.data;
  },

  getCreatorApplication: async () => {
    const response = await apiClient.get(`/creator/application`);
    return response.data;
  },

  cancelCreatorApplication: async () => {
    const response = await apiClient.delete(`/creator/application`);
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
    category?: 'slab' | 'sealed';
    stock?: number;
    purchaseOption?: 'offers_only' | 'buy_only' | 'both';
    brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
    sellerDisplayOrderShop?: number;
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
      category?: 'slab' | 'sealed';
      stock?: number;
      purchaseOption?: 'offers_only' | 'buy_only' | 'both';
      brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
      sellerDisplayOrderShop?: number;
    }
  ): Promise<PrizeConfiguration> => {
    const response = await apiClient.put(`/seller/prizes/items/${id}`, payload);
    return response.data;
  },

  deleteMyShopItem: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/seller/prizes/items/${id}`);
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
    category?: 'slab' | 'sealed';
    stock?: number;
    purchaseOption?: 'offers_only' | 'buy_only' | 'both';
    brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
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
      category?: 'slab' | 'sealed';
      stock?: number;
      purchaseOption?: 'offers_only' | 'buy_only' | 'both';
      brand?: 'pokemon' | 'one_piece' | 'sports' | 'other';
      createdBy?: string | null;
      showOnShop?: boolean;
      showOnRedemptions?: boolean;
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
  }) => {
    const response = await apiClient.post('/prizes/make-offer', offerData);
    return response.data;
  },

  // Get order success details for purchase confirmation page
  getOrderSuccessDetails: async (orderId: string) => {
    const response = await apiClient.get(`/prizes/orders/${orderId}/success-details`);
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

// Export a single API object with all the services
export const api = {
  auth: authAPI,
  user: userAPI,
  wallet: walletAPI,
  betting: bettingAPI,
  socket: socketAPI,
  admin: adminAPI,
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
};

export default api;
