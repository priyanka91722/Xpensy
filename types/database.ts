export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          type: 'expense' | 'income';
          icon: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'expense' | 'income';
          icon: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'expense' | 'income';
          icon?: string;
          color?: string;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: string;
          description: string;
          date: string;
          type: 'expense' | 'income';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: string;
          description?: string;
          date?: string;
          type: 'expense' | 'income';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: string;
          description?: string;
          date?: string;
          type?: 'expense' | 'income';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
