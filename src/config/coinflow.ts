// CoinFlow Configuration
export const COINFLOW_CONFIG = {
  // Environment
  ENV: 'sandbox', // or 'production'
  
  // Credentials (provided by backend team)
  MERCHANT_ID: 'streambet',
  
  // Blockchain settings
  BLOCKCHAIN: 'solana',
  
  // Supported payment methods
  SUPPORTED_PAYMENT_METHODS: ['card', 'bank'],
  
  // Theme settings
  THEME: 'dark',
  
  // API endpoints (if needed)
  API_BASE_URL: 'https://api-sandbox.coinflow.cash',
  
  // Webhook settings
  WEBHOOK_URL: '/api/coinflow/webhook',
  
  // Redirect settings
  REDIRECT_URL: '/deposit',
  
  // Additional CoinFlow specific settings
  DEFAULT_CURRENCY: 'USD',
  SUPPORTED_CURRENCIES: ['USD'],
  SUPPORTED_BLOCKCHAINS: ['solana'],
};

// Helper function to get CoinFlow environment
export const getCoinFlowEnv = () => {
  return COINFLOW_CONFIG.ENV;
};

// Helper function to get merchant ID
export const getMerchantId = () => {
  return COINFLOW_CONFIG.MERCHANT_ID;
};

// Helper function to get blockchain
export const getBlockchain = () => {
  return COINFLOW_CONFIG.BLOCKCHAIN;
};

// Helper function to get default currency
export const getDefaultCurrency = () => {
  return COINFLOW_CONFIG.DEFAULT_CURRENCY;
}; 