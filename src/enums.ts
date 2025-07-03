export enum CurrencyType {
  FREE_TOKENS = 'free_tokens',
  STREAM_COINS = 'stream_coins',
}

export enum StreamPlatform {
  Kick = 'kick',
  Youtube = 'youtube',
  Twitch = 'twitch',
  Vimeo = 'vimeo',
}

export enum BettingRoundStatus {
  CREATED = 'created',
  OPEN = 'open',
  ACTIVE = 'active',
  LOCKED = 'locked',
  WINNER = 'winner',
  LOSER = 'loser',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BET_PLACEMENT = 'bet_placement',
  BET_WINNINGS = 'bet_winnings',
  PURCHASE = 'purchase',
  SYSTEM_ADJUSTMENT = 'system_adjustment',
  INITIAL_CREDIT = 'initial_credit',
  ADMIN_CREDIT = 'admin_credit',
}
