import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { decodeIdToken } from '@/utils/helper';
import { toast } from '@/hooks/use-toast';
import Bugsnag from '@bugsnag/js';
import { WithdrawPayload } from '@/types/withdraw';

// API base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
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
    if (token)
    {
      try
      {
        const decoded = decodeIdToken(token);
        // Check expiry (exp is in seconds)
        if (decoded.exp && Date.now() / 1000 > decoded.exp)
        {
          // Token expired, do not attach token, let the request fail and response interceptor handle refresh
          // No refresh logic here
        } else
        {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e)
      {
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

    if (error.response?.data?.isForcedLogout) {
      toast({
        id: 'vpn-proxy',
        variant: 'destructive',
        description: error.response?.data?.message,
        duration: 7000,
      });
      // Dispatch custom event for logout handling
      window.dispatchEvent(new CustomEvent('vpnProxyDetected'));
    }

    const originalRequest = error.config;

    // Prevent infinite loop: do not refresh for /auth/refresh itself
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest.url &&
      originalRequest.url.endsWith('/auth/refresh')
    )
    {
      toast({
        id: 'session-expired',
        title: 'Session Expired',
        description: 'Session has been expired! Please relogin',
        variant: 'destructive'
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
    )
    {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // If no accessToken is present, do nothing
      if (!accessToken)
      {
        return Promise.reject(error);
      }

      // If this is the first 401 for this request, try refresh
      if (refreshToken && !(originalRequest as any)[RETRY_401])
      {
        (originalRequest as any)[RETRY_401] = true;
        try
        {
          const refreshResponse = await apiClient.post('/auth/refresh', { refreshToken }, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
            },
          });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse?.data?.data || {};
          if (newAccessToken)
          {
            localStorage.setItem('accessToken', newAccessToken);
            if (newRefreshToken)
            {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError)
        {
          // If refresh fails, show toast and logout
          toast({
            id: 'session-expired',
            title: 'Session Expired',
            description: 'Session has been expired! Please relogin',
            variant: 'destructive'
          });
          await authAPI.signOut();
          // Dispatch custom event for navigation without page refresh
          window.dispatchEvent(new CustomEvent('navigateToLogin'));
          return Promise.reject(refreshError);
        }
      } else
      {
        // If already retried once, or no refreshToken, show toast and logout
        toast({
          id: 'session-expired',
          title: 'Session Expired',
          description: 'Session has been expired! Please relogin',
          variant: 'destructive'
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
  }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials: { identifier: string; password: string, remember_me?: boolean, redirect?: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    // Store the tokens
    if (response?.data?.data?.accessToken)
    {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    if (response?.data?.data?.refreshToken)
    {
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
    if (response?.data?.data?.accessToken)
    {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    if (response?.data?.data?.refreshToken)
    {
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
    }
    return response.data;
  },

  // Upload Image
  uploadImage: async (filePayload: File, type?: string) => {
    const formData = new FormData();
    formData.append('file', filePayload);
    const response = await apiClient.post(`/assets/file/upload/image/${type || 'avatar'}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get current session
  getSession: async () => {
    try
    {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error)
    {
      return { data: null };
    }
  },

  // Refresh access token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const response = await apiClient.post('/auth/refresh', { refreshToken }, {
      headers: {
        'refresh-token': refreshToken,
      },
    });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data || {};
    if (accessToken)
    {
      localStorage.setItem('accessToken', accessToken);
    }
    if (newRefreshToken)
    {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    return response.data;
  },

  // Get username availability
  getUsernameAvailability: async (userName: string) => {
    try
    {
      const response = await apiClient.get(`/auth/username?username=${userName}`);
      return response;
    } catch (error)
    {
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
  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get('/users/me');
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
};

// Wallet API
export const walletAPI = {
  // Get wallet balance
  getBalance: async () => {
    const response = await apiClient.get('/wallets/balance');
    return response.data;
  },

  // Get transaction history
  getTransactions: async (params) => {
    const response = await apiClient.get(`/wallets/transactions`,{
      params,
    });
    return response.data;
  },

  // Get redeemable amount from sweep coins
  getRedeemableAmount: async (coins: number ) => {
    const response = await apiClient.get(`/wallets/convert-sweep`, {
      params: { coins },
    });
    return response.data;
  },

  // Check if the user has a payment method saved
  hasPaymentMethod: async () => {
    try
    {
      const response = await apiClient.get('/wallets/payment-methods');
      return { hasPaymentMethod: response.data.length > 0 };
    } catch (error)
    {
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
      params
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
  getBettingData: async (streamId: string, userId?:string) => {
    const response = await apiClient.get(`/stream/bet-round/${streamId}?userId=${userId}`);
    return response.data;
  },

  // Get data for selected betting round
  getBettingRoundData: async (roundId: string) => {
    const response = await apiClient.get(`/betting/potentialAmount/${roundId}`);
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

  cancelUserBet: async (betData: {
    betId: string;
    currencyType: string;
  }) => {
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
      params
    });
    return response.data;
  },

  // Get all ended streams
  getEndedStreams: async (params?: any) => {
    const response = await apiClient.get(`/stream/home`, {
      params
    });
    return response.data;
  },
};

// WebSocket handling
export const socketAPI = {
  // Connect to WebSocket
  connect: () => {
    const token = localStorage.getItem('refreshToken');
    console.log("socket connection iniiated")
    if (!token) return null;
    console.log("socket connected confirmed")
    // Only create a new socket if one does not already exist or is disconnected
    if (!socket || (socket && socket.disconnected)) {

      socket = io(API_URL.replace(/\/api(?!.*\/api)/, ''), {
        transports: ["websocket"],
        //  reconnection: false,   // reconnection default true
        auth: { token }
      });


      socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected', reason);
      });

      socket.on("connect_error", (err) => {
        console.log("Connection error:", err);
      });
    }
    return socket;
  },
  // getSocket: () => socket,
  // Disconnect WebSocket
  disconnect: () => {
    if (socket)
    {
      console.log("socket disconnection called")
      socket.disconnect();
      socket = null;
    }
  },

  // Join a stream room
  joinStream: (streamId: string,socket:any) => {
 
    if (socket) {
       console.log(socket,'client socket in joinStream')
      socket.emit('joinStream', streamId);
    }
  },

  // Leave a stream room
  leaveStream: (streamId: string,socket:any) => {
   console.log(streamId,"leave stream with id",socket)
    if (socket) {
 console.log("leave stream initiated")
      socket.emit('leaveStream', streamId);
    }
  },

  // Send a chat message
  sendChatMessage: (streamId: string, message: string) => {
    if (socket)
    {
      socket.emit('sendChatMessage', { streamId, message });
    }
  },

  // To get all betting updates
  joinCommonStream: (socket:any) => {
  console.log(socket,'joinCommonStream joined')
    if (socket) {
      socket.emit('joinStreamBet','streambet');
    }
  },

  // Subscribe to chat messages
  onChatMessage: (callback: (data: any) => void) => {
    if (socket)
    {
      socket.on('chatMessage', callback);
    }
  },

  // Subscribe to betting locked events
  onBettingLocked: (callback: (data: any) => void) => {
    if (socket)
    {
      socket.on('bettingLocked', callback);
    }
  },

  // Subscribe to winner declared events
  onWinnerDeclared: (callback: (data: any) => void) => {
    if (socket)
    {
      socket.on('winnerDeclared', callback);
    }
  },

  // Get the socket instance
  getSocket: () => socket,


// Get all messages for a stream
  getChatMessages: async (streamId?: any,page?:any) => {
    const response = await apiClient.get(`/chat/messages?streamId=${streamId}&range=${page}&sort=["createdAt","DESC"]`);
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

  updateUsersStatus: async (userId?: any, userStatus?: any) => {
    const response = await apiClient.patch(`/admin/users`, userId, userStatus);
    return response.data;
  },

  updateUserCoins: async (payload: { userId: string; amount: number }) => {
    const response = await apiClient.patch(`/admin/gold-coins`, payload);
    return response.data;
  },

  deleteUser: async (userId: any) => {
    const response = await apiClient.delete(`/admin/users/soft-delete/{userId}?userId=${userId}`);
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

  // Get stream details based on stream ID
  getStream: async (id: string) => {
    const response = await apiClient.get(`/admin/stream/${id}`);
    return response.data;
  },

  // Get stream bet details based on stream ID
  getStreamBetData: async (id: string) => {
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
    const response = await apiClient.get('/payments/coinflow/withdrawer');
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
    const response = await apiClient.delete(`/payments/coinflow/delete-withdrawer-account?token=${bankToken}`);
    return response.data;
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
};

export default api;
