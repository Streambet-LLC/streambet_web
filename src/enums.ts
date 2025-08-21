export enum CurrencyType {
  FREE_TOKENS = 'free_tokens',
  STREAM_COINS = 'stream_coins',
  SWEEP_COINS = 'sweep_coins',
  GOLD_COINS = 'gold_coins',
};

export enum StreamPlatform {
  Kick = 'kick',
  Youtube = 'youtube',
  Twitch = 'twitch',
  Vimeo = 'vimeo',
};

export enum BettingRoundStatus {
  CREATED = 'created',
  OPEN = 'open',
  ACTIVE = 'active',
  LOCKED = 'locked',
  CLOSED = 'closed',
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

export enum StreamStatus {
  LIVE = 'live',
  ENDED = 'ended',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled'
};

export enum StreamEventType {
  STREAM_CREATED = 'stream_created',
  STREAM_UPDATED = 'stream_updated',
  STREAM_ENDED = 'stream_ended',
  STREAM_DELETED = 'stream_deleted',
  STREAM_BET_UPDATED = 'stream_bet_updated',
};

export enum HistoryType {
  Transaction = 'transaction',
  Bet = 'bet',
};
