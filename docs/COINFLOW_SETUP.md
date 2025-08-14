# CoinFlow Real API Setup

This guide explains how to set up the real CoinFlow API integration.

## Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# CoinFlow API Configuration
REACT_APP_COINFLOW_API_KEY=your_coinflow_api_key_here
REACT_APP_COINFLOW_MERCHANT_ID=your_coinflow_merchant_id_here

# Environment (sandbox or production)
REACT_APP_COINFLOW_ENV=sandbox
```

## Getting CoinFlow Credentials

1. **Sign up for CoinFlow:**
   - Visit [CoinFlow Labs](https://coinflowlabs.com/)
   - Create a merchant account
   - Complete KYC/AML verification

2. **Get API Credentials:**
   - Access your CoinFlow dashboard
   - Navigate to API settings
   - Generate API key
   - Copy your Merchant ID

3. **Configure Webhooks:**
   - Set webhook URL to: `https://yourdomain.com/api/coinflow-webhook`
   - Enable webhook notifications for payment events

## API Endpoints

The integration uses these CoinFlow API endpoints:

### Purchase Endpoint
```
POST https://api.coinflow.com/v1/purchase
```

### Withdrawal Endpoint
```
POST https://api.coinflow.com/v1/withdraw
```

## Request Format

### Purchase Request
```json
{
  "merchantId": "your_merchant_id",
  "amount": 100,
  "currency": "USD",
  "email": "user@example.com",
  "blockchain": "eth",
  "walletAddress": "user_id",
  "redirectUrl": "https://yourdomain.com/deposit",
  "webhookUrl": "https://yourdomain.com/api/coinflow-webhook",
  "metadata": {
    "userId": "user_id",
    "type": "deposit"
  }
}
```

### Withdrawal Request
```json
{
  "merchantId": "your_merchant_id",
  "amount": 50,
  "currency": "USD",
  "email": "user@example.com",
  "blockchain": "eth",
  "walletAddress": "user_id",
  "redirectUrl": "https://yourdomain.com/deposit",
  "webhookUrl": "https://yourdomain.com/api/coinflow-webhook",
  "metadata": {
    "userId": "user_id",
    "type": "withdrawal"
  }
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "url": "https://coinflow.com/payment/abc123",
  "id": "purchase_abc123"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid amount"
}
```

## Testing

1. **Sandbox Testing:**
   - Use sandbox API credentials
   - Test with small amounts
   - Verify webhook notifications

2. **Production Testing:**
   - Use production API credentials
   - Test with real payments
   - Monitor webhook events

## Security Considerations

1. **API Key Security:**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Webhook Security:**
   - Verify webhook signatures
   - Use HTTPS endpoints
   - Implement idempotency

3. **Error Handling:**
   - Handle API errors gracefully
   - Log failed requests
   - Implement retry logic

## Support

For CoinFlow API support:
- [CoinFlow Documentation](https://docs.coinflowlabs.com/)
- [CoinFlow Support](https://coinflowlabs.com/support)
- [API Status](https://status.coinflowlabs.com/) 