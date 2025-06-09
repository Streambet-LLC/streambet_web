export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          stream_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          stream_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          stream_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_stream_id_fkey';
            columns: ['stream_id'];
            isOneToOne: false;
            referencedRelation: 'streams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      paypal_orders: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          order_id: string;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          order_id: string;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          order_id?: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'paypal_orders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          date_of_birth: string | null;
          id: string;
          is_admin: boolean | null;
          paypal_email: string | null;
          tos_accepted: boolean | null;
          updated_at: string;
          username: string;
          wallet_balance: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          id: string;
          is_admin?: boolean | null;
          paypal_email?: string | null;
          tos_accepted?: boolean | null;
          updated_at?: string;
          username: string;
          wallet_balance?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          id?: string;
          is_admin?: boolean | null;
          paypal_email?: string | null;
          tos_accepted?: boolean | null;
          updated_at?: string;
          username?: string;
          wallet_balance?: number | null;
        };
        Relationships: [];
      };
      stream_bets: {
        Row: {
          amount: number;
          bet_option: string;
          created_at: string | null;
          id: string;
          status: string | null;
          stream_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          bet_option: string;
          created_at?: string | null;
          id?: string;
          status?: string | null;
          stream_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          bet_option?: string;
          created_at?: string | null;
          id?: string;
          status?: string | null;
          stream_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stream_bets_stream_id_fkey';
            columns: ['stream_id'];
            isOneToOne: false;
            referencedRelation: 'streams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stream_bets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      streams: {
        Row: {
          betting_locked: boolean | null;
          betting_options: string[] | null;
          betting_outcome: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          embed_url: string | null;
          historical_total_bets: number | null;
          id: string;
          is_live: boolean | null;
          livepeer_stream_id: string | null;
          platform: string;
          platform_channel_id: string | null;
          playback_id: string | null;
          prize_pool: number | null;
          stream_key: string | null;
          thumbnail_url: string | null;
          title: string;
          total_bets: number | null;
          updated_at: string;
          viewer_count: number | null;
        };
        Insert: {
          betting_locked?: boolean | null;
          betting_options?: string[] | null;
          betting_outcome?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          embed_url?: string | null;
          historical_total_bets?: number | null;
          id?: string;
          is_live?: boolean | null;
          livepeer_stream_id?: string | null;
          platform?: string;
          platform_channel_id?: string | null;
          playback_id?: string | null;
          prize_pool?: number | null;
          stream_key?: string | null;
          thumbnail_url?: string | null;
          title: string;
          total_bets?: number | null;
          updated_at?: string;
          viewer_count?: number | null;
        };
        Update: {
          betting_locked?: boolean | null;
          betting_options?: string[] | null;
          betting_outcome?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          embed_url?: string | null;
          historical_total_bets?: number | null;
          id?: string;
          is_live?: boolean | null;
          livepeer_stream_id?: string | null;
          platform?: string;
          platform_channel_id?: string | null;
          playback_id?: string | null;
          prize_pool?: number | null;
          stream_key?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          total_bets?: number | null;
          updated_at?: string;
          viewer_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'streams_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          amount: number;
          created_at: string;
          description: string | null;
          id: string;
          payout_id: string | null;
          status: string;
          type: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          payout_id?: string | null;
          status?: string;
          type: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          payout_id?: string | null;
          status?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment: {
        Args: {
          p_user_id: string;
          p_amount: number;
        };
        Returns: number;
      };
      get_user_emails: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
        }[];
      };
      decrement_stream_total_bets: {
        Args: {
          p_stream_id: string;
          p_amount: number;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
