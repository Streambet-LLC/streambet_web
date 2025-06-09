# Supabase Business Logic and Features

The application is a **streaming and betting platform**.

## Core Features

### 1. Live Streaming (Livepeer)

- **Stream Creation**: Creates Livepeer streams for users.
- **Status Updates**: Uses webhooks (`stream.started`, `stream.idle`) to update stream status in the database.
- **Manual Check**: Provides a function to manually check stream status.

### 2. Betting System

- **Pari-Mutuel Betting**: Handles user bets on streams via the `stream_bets` table. The `process-payouts` function manages a pari-mutuel betting system where winners share the losers' pool.
- **Platform Fee**: A 5% platform fee is deducted from all bets.
- **Payouts**: Winnings from the losing pool are distributed proportionally among winners.
- **Ledger**: The system updates user wallets and logs transactions.

### 3. Wallet and Transactions

- **Fund Management**: Manages user funds in wallets.
- **Balance Updates**: Uses a Supabase RPC function (`increment`) for secure balance updates.
- **Transaction Log**: Records all winning payouts as transactions.

### 4. Payments (PayPal)

- **Withdrawals**: Processes user payout requests via the PayPal API (currently using the sandbox).
- **Authentication**: Requires user authentication for processing payouts.

### 5. Thumbnail/Screenshot Management

- **Stream Thumbnails**: Includes functions (`screenshot-stream`, `capture-thumbnail`, `update-thumbnail`) for managing stream thumbnails.

## Inferred Database Schema

- `streams`: Contains stream info like `livepeer_stream_id`, `is_live`, `playback_id`, `betting_locked`, and `betting_outcome`.
- `stream_bets`: Stores bet details: `stream_id`, `user_id`, `bet_option`, `amount`, and `status` (`pending`, `won`, `lost`).
- `wallets`: Implied by the `increment` RPC call to manage user balances.
- `wallet_transactions`: Logs financial transactions, including winnings.

## Security Notes

- **CRITICAL**: JWT verification is disabled (`verify_jwt = false`) for all Supabase functions. This is a major security risk and must be enabled for production.
- **Webhook Verification**: Livepeer webhooks use signature verification for security.
- **Payment Authentication**: PayPal payouts are authenticated to ensure only authorized users can withdraw funds.
