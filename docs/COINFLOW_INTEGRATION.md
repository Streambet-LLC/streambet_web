# CoinFlow Integration

This document explains how CoinFlow payment integration has been implemented in the StreamBet web application.

## Overview

CoinFlow has been integrated to replace PayPal for both deposit and withdrawal functionality. The integration includes:

- **CoinFlowPurchase**: For depositing funds into user accounts
- **CoinFlowWithdraw**: For withdrawing funds from user accounts
- **Backend API Integration**: Frontend calls backend APIs which handle CoinFlow integration
- **Webhook Handlers**: Backend processes CoinFlow webhooks for payment confirmations

## Components

### 1. CoinFlowPurchase Component
Location: `src/components/deposit/CoinFlowPurchase.tsx`

This component handles deposit functionality:
- Calls backend API to create CoinFlow purchase session
- Opens CoinFlow payment window in a new tab
- Handles success/error states
- Backend updates user balance upon successful payment

### 2. CoinFlowWithdraw Component
Location: `src/components/deposit/CoinFlowWithdraw.tsx`

This component handles withdrawal functionality:
- Calls backend API to create CoinFlow withdrawal session
- Opens CoinFlow withdrawal window in a new tab
- Handles success/error states
- Backend updates user balance upon successful withdrawal

### 3. Updated Deposit Page
Location: `src/pages/Deposit.tsx`

The deposit page has been completely updated to:
- Remove PayPal integration
- Add tabbed interface for deposit/withdraw
- Integrate CoinFlow components
- Maintain existing Terms of Service flow
- Call backend APIs for payment processing

## Backend API Integration

### 1. Purchase API Call
```typescript
const createCoinFlowPurchase = async (amount: number, email: string, userId: string) => {
  const response = await fetch('/api/coinflow/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      amount: amount,
      email: email,
      userId: userId,
      type: 'deposit'
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.statusText}`);
  }

  return response.json();
};
```

### 2. Withdrawal API Call
```typescript
const createCoinFlowWithdraw = async (amount: number, email: string, userId: string) => {
  const response = await fetch('/api/coinflow/withdraw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      amount: amount,
      email: email,
      userId: userId,
      type: 'withdrawal'
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.statusText}`);
  }

  return response.json();
};
```

## Setup Instructions

### 1. Frontend Setup
The frontend is ready to work with your backend APIs. No additional setup required.

### 2. Backend Requirements
Your backend team needs to implement these endpoints:
- `POST /api/coinflow/purchase` - For creating purchase sessions
- `POST /api/coinflow/withdraw` - For creating withdrawal sessions
- `POST /api/coinflow/webhook` - For processing CoinFlow webhooks

### 3. Backend Documentation
See `docs/BACKEND_API_SPEC.md` for complete backend implementation details.

## Usage

### For Users
1. Navigate to the Deposit page
2. Choose between "Deposit" or "Withdraw" tabs
3. Enter the amount
4. Click the CoinFlow payment button
5. Complete payment in the opened window
6. Return to the application to see updated balance

### For Developers
The integration is designed to be non-intrusive and doesn't affect existing functionality outside of the deposit page. The components can be easily modified or extended as needed.

## Backend API Endpoints

### Create Purchase
```typescript
// Backend API call
const data = await createCoinFlowPurchase(100, 'user@example.com', 'user-id');
// Returns: { success: true, url: 'https://coinflow.com/payment/abc123', purchaseId: 'purchase_abc123' }
```

### Create Withdrawal
```typescript
// Backend API call
const data = await createCoinFlowWithdraw(50, 'user@example.com', 'user-id');
// Returns: { success: true, url: 'https://coinflow.com/withdraw/xyz789', withdrawId: 'withdraw_xyz789' }
```

## Error Handling

The integration includes comprehensive error handling:
- Invalid amounts
- Network errors
- API errors
- User authentication errors

All errors are displayed to users via toast notifications.

## Security Considerations

- Backend handles all CoinFlow API keys securely
- Frontend uses authentication tokens for API calls
- Backend validates user authentication and permissions
- Transaction records are maintained for audit purposes
- Backend verifies webhook signatures for security

## Testing

### **Backend Integration Testing**
The integration works with your backend APIs for payment processing:

1. **Features:**
   - Backend handles CoinFlow API communication
   - Secure authentication via backend
   - Webhook processing by backend
   - Transaction tracking and balance updates
   - Error handling and validation

2. **Testing Flow:**
   - Click "Pay with CoinFlow" button
   - Frontend calls backend API
   - Backend creates CoinFlow session
   - CoinFlow payment page opens
   - Backend processes webhook and updates balance

3. **API Integration:**
   - Frontend calls backend APIs
   - Backend handles CoinFlow communication
   - Proper authentication and validation
   - Webhook processing

### **Testing Steps:**
1. Ensure backend APIs are implemented and running
2. Start development server: `npm run dev`
3. Navigate to `/deposit` page
4. Enter an amount and click payment button
5. Backend should return CoinFlow URL
6. CoinFlow payment page opens
7. Complete payment process
8. Backend processes webhook and updates user balance

## Production Deployment

For production:
1. Backend uses production CoinFlow API credentials
2. Configure production webhook URLs in backend
3. Implement proper webhook signature verification
4. Test thoroughly with real payments
5. Monitor webhook events and transaction logs
6. Ensure proper error handling and logging

## Support

For issues with the CoinFlow integration:
1. Check the browser console for frontend errors
2. Verify backend APIs are working correctly
3. Test both purchase and withdrawal flows
4. Check backend logs for API errors
5. Monitor webhook events in backend
6. Contact CoinFlow support for API issues 