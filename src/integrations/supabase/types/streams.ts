import { Database } from './database';

export type Stream = Database['public']['Tables']['streams']['Row'] & {
  profiles?: {
    username: string;
  };
};
