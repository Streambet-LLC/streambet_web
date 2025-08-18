# Coinflow Integration for StreamBet

This document outlines the implementation of Coinflow payment integration for one-time purchases in StreamBet.

## Overview

The integration follows the [Coinflow One-Time Purchase Integration guide](https://docs.coinflow.cash/docs/one-time-purchase-integration-usdc-settlement-to-coinflow-wallet-or-byo-wallet#react-sdk-implementation) for USDC settlement to Coinflow wallet or BYO wallet.

## Current Implementation

### Frontend Component
- **File**: `src/components/deposit/CoinFlowPurchase.tsx`
- **Purpose**: Handles the Coinflow checkout flow for purchasing StreamBet coins
- **Features**: 
  - Card-only payments (no wallet required)
  - USDC settlement
  - Chargeback protection
  - Webhook integration

### Service Layer
- **File**: `src/services/coinflow.ts`
- **Purpose**: Provides API integration with Coinflow services
- **Features**:
  - JWT token generation
  - Session key management
  - Parameter preparation

## Required Backend Implementation

### 1. Environment Variables
```bash
REACT_APP_COINFLOW_API_KEY=your_sandbox_or_production_api_key
```

### 2. API Endpoints
The frontend expects these endpoints to be implemented on your backend:

#### Generate Checkout JWT Token
```typescript
POST /api/coinflow/checkout-jwt
Body: {
  webhookInfo: Record<string, any>;
  subtotal: { currency: string; cents: number; };
  email: string;
  blockchain: string;
  chargebackProtectionData: Array<{
    productType: string;
    rawProductData: Record<string, any>;
    productName: string;
    quantity: number;
  }>;
  settlementType: string;
}
```

#### Generate Session Key
```typescript
POST /api/coinflow/session
Body: {
  customerId: string;
  merchantId: string;
}
```

### 3. Backend Implementation Example

```typescript
// Example using Express.js
import { CoinflowService } from './services/coinflow';

app.post('/api/coinflow/checkout-jwt', async (req, res) => {
  try {
    const jwtToken = await CoinflowService.generateCheckoutJWT(req.body);
    res.json({ checkoutJwtToken: jwtToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate JWT token' });
  }
});

app.post('/api/coinflow/session', async (req, res) => {
  try {
    const sessionKey = await CoinflowService.generateSessionKey(req.body);
    res.json({ sessionKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate session key' });
  }
});
```

## Security Considerations

### 1. API Key Protection
- Never expose your Coinflow API key in frontend code
- All Coinflow API calls should go through your backend
- Use environment variables for sensitive data

### 2. JWT Token Security
- JWT tokens are valid for 30 minutes
- Tokens should be generated server-side to prevent tampering
- Implement proper error handling for expired tokens

### 3. Domain Whitelisting
- Whitelist your domain in Coinflow dashboard
- This prevents checkout links from being used on unauthorized domains

## Testing

### Sandbox Environment
- Use sandbox API keys for development
- Test with sandbox payment methods
- Verify webhook delivery in sandbox

### Production Environment
- Switch to production API keys
- Update environment configuration
- Test with real payment methods

## Webhook Implementation

### Required Webhook Events
- Payment success
- Payment failure
- Refund events
- Chargeback events

### Webhook Security
- Verify webhook signatures
- Implement idempotency
- Handle webhook failures gracefully

## Error Handling

### Common Errors
- Invalid API key
- Expired JWT token
- Invalid session key
- Payment method not supported
- Insufficient funds

### User Experience
- Clear error messages
- Retry mechanisms
- Fallback options
- Support contact information

## Monitoring and Logging

### What to Monitor
- Payment success rates
- Error frequencies
- Webhook delivery status
- API response times

### Logging
- Log all Coinflow API calls
- Track payment flow steps
- Monitor for suspicious activity
- Maintain audit trails

## Next Steps

1. **Backend Implementation**: Implement the required API endpoints
2. **Environment Setup**: Configure API keys and environment variables
3. **Testing**: Test the integration in sandbox environment
4. **Webhook Setup**: Implement webhook handling for payment events
5. **Production Deployment**: Deploy with production API keys
6. **Monitoring**: Set up monitoring and alerting

## Resources

- [Coinflow Documentation](https://docs.coinflow.cash/)
- [React SDK Reference](https://docs.coinflow.cash/docs/one-time-purchase-integration-usdc-settlement-to-coinflow-wallet-or-byo-wallet#react-sdk-implementation)
- [API Reference](https://docs.coinflow.cash/api-reference)
- [Webhook Guide](https://docs.coinflow.cash/docs/webhook-implementation) 