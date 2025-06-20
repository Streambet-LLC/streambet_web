import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// API base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
  },
});

// Socket.io instance
let socket: Socket | null = null;

// Add request interceptor to include the token in every request
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor to handle 401 errors and refresh token
// apiClient.interceptors.response.use(
//   response => response,
//   async error => {
//     const originalRequest = error.config;
//     // Prevent infinite loop
//     if (error.response && error.response.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//       try {
//         const refreshToken = localStorage.getItem('refreshToken');
//         if (!refreshToken) throw new Error('No refresh token');
//         // Call refresh endpoint
//         const refreshResponse = await apiClient.post('/auth/refresh', { refreshToken });
//         const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data || {};
//         if (accessToken) {
//           localStorage.setItem('accessToken', accessToken);
//         }
//         if (newRefreshToken) {
//           localStorage.setItem('refreshToken', newRefreshToken);
//         }
//         // Update the Authorization header and retry the original request
//         originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
//         return apiClient(originalRequest);
//       } catch (refreshError) {
//         // If refresh fails, log out
//         console.log('refreshError', refreshError);
//         localStorage.removeItem('accessToken');
//         localStorage.removeItem('refreshToken');
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

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
  }) => {
    const response = await apiClient.post('/auth/register', userData);
    // Store the tokens
    // if (response?.data?.data?.accessToken) {
    //   localStorage.setItem('accessToken', response.data.data.accessToken);
    // }
    // if (response?.data?.data?.refreshToken) {
    //   localStorage.setItem('refreshToken', response.data.data.refreshToken);
    // }
    return response.data;
  },

  // Login user
  login: async (credentials: { identifier: string; password: string }) => {
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
    console.log('response?.data', response);
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

  // Upload Profile Image
  uploadProfilePicture: async (filePayload: File) => {
    const formData = new FormData();
    formData.append('file', filePayload);
    const response = await apiClient.post('/assets/file/upload/image/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
    const response = await apiClient.post('/auth/refresh', { refreshToken });
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
    // const response = await apiClient.get('/auth/google');
    // console.log('response', response?.data);
    // return response.data;
    window.location.href = `${API_URL}/auth/google`;
  },

  // Forgot password (send reset link)
  forgotPassword: async (identifier: string) => {
    const response = await apiClient.post('/auth/forgot-password', { identifier });
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
    const response = await apiClient.patch('/users/me/notification-preferences', preferences);
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
  getTransactions: async (limit = 20, offset = 0) => {
    const response = await apiClient.get(`/wallets/transactions?limit=${limit}&offset=${offset}`);
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

  // Delete a payment method
  deletePaymentMethod: async (paymentMethodId: string) => {
    const response = await apiClient.delete(`/wallets/payment-methods/${paymentMethodId}`);
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
};

// Betting API
export const bettingAPI = {
  // Get all streams
  getStreams: async (includeEnded = false) => {
    const response = await apiClient.get(`/betting/streams?includeEnded=${includeEnded}`);
    return response.data;
  },

  // Get stream by ID
  getStream: async (streamId: string) => {
    const response = await apiClient.get(`/betting/streams/${streamId}`);
    return response.data;
  },

  // Get betting options for a stream
  getBettingOptions: async (streamId: string) => {
    const response = await apiClient.get(`/betting/streams/${streamId}/betting-variables`);
    return response.data;
  },

  // Place a bet
  placeBet: async (betData: {
    streamId: string;
    bettingVariableId: string;
    amount: number;
    option: string;
  }) => {
    const response = await apiClient.post('/betting/place-bet', betData);
    return response.data;
  },

  // Cancel a bet
  cancelBet: async (betId: string) => {
    const response = await apiClient.delete(`/betting/bets/${betId}`);
    return response.data;
  },

  // Get user's betting history
  getUserBets: async (active = false) => {
    const response = await apiClient.get(`/betting/user-bets?active=${active}`);
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

// WebSocket handling
export const socketAPI = {
  // Connect to WebSocket
  connect: () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    socket = io(API_URL.replace('/api', ''), {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return socket;
  },

  // Disconnect WebSocket
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Join a stream room
  joinStream: (streamId: string) => {
    if (socket) {
      socket.emit('joinStream', streamId);
    }
  },

  // Leave a stream room
  leaveStream: (streamId: string) => {
    if (socket) {
      socket.emit('leaveStream', streamId);
    }
  },

  // Send a chat message
  sendChatMessage: (streamId: string, message: string) => {
    if (socket) {
      socket.emit('sendChatMessage', { streamId, message });
    }
  },

  // Subscribe to betting updates
  onBettingUpdate: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('bettingUpdate', callback);
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

  // Delete stream
  deleteStream: async (streamId: string) => {
    const response = await apiClient.delete(`/admin/streams/${streamId}`);
    return response.data;
  },

  // Lock betting for a stream
  lockBetting: async (streamId: string) => {
    const response = await apiClient.post(`/admin/streams/${streamId}/lock-betting`);
    return response.data;
  },

  // Declare winner for a betting variable
  declareWinner: async (bettingVariableId: string, winnerOption: string) => {
    const response = await apiClient.post(
      `/admin/betting-variables/${bettingVariableId}/declare-winner`,
      {
        winnerOption,
      }
    );
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

// Export a single API object with all the services
export const api = {
  auth: authAPI,
  user: userAPI,
  wallet: walletAPI,
  betting: bettingAPI,
  socket: socketAPI,
  admin: adminAPI,
};

export default api;
