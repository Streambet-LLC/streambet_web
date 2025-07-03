export enum CurrencyType {
  FREE_TOKENS = 'free_tokens',
  STREAM_COINS = 'stream_coins',
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
};

export enum StreamStatus {
  LIVE = 'live',
  ENDED = 'ended',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled'
};
