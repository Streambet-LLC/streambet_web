// CoinFlow Configuration
export const COINFLOW_CONFIG = {
  // Environment
  ENV: 'sandbox', // or 'production'
  
  // Credentials (provided by backend team)
  MERCHANT_ID: 'sbtestaccount',
  SECRET_KEY: 'coinflow_sandbox_008c12a1604e4bcc83733730715c95dd_95dee748645f43b2a910bf0288e144ec',
  
  // Blockchain settings
  BLOCKCHAIN: 'eth',
  
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