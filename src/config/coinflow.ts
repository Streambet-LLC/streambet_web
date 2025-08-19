import { PaymentMethods } from "@coinflowlabs/react";

// CoinFlow Configuration
export const COINFLOW_CONFIG = {
  // Environment
  ENV: import.meta.env.VITE_COINFLOW_ENV,
  
  // Credentials (provided by backend team)
  MERCHANT_ID: import.meta.env.VITE_COINFLOW_MERCHANT_ID,
  
  // Blockchain settings
  BLOCKCHAIN: import.meta.env.VITE_COINFLOW_BLOCKCHAIN,
  
  // Supported payment methods
  SUPPORTED_PAYMENT_METHODS: [PaymentMethods.card],
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

// Helper function to get supported payment methods
export const getSupportedPaymentMethods = () => {
  return COINFLOW_CONFIG.SUPPORTED_PAYMENT_METHODS;
};
