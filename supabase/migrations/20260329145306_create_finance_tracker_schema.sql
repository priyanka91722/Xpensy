/*
  # Finance Tracker Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key) - Unique identifier for each category
      - `name` (text) - Category name (e.g., Food, Transport, Salary)
      - `type` (text) - Transaction type: 'expense' or 'income'
      - `icon` (text) - Icon name for the category
      - `color` (text) - Color hex code for visual identification
      - `created_at` (timestamptz) - Timestamp of creation
    
    - `transactions`
      - `id` (uuid, primary key) - Unique identifier for each transaction
      - `user_id` (uuid) - Reference to authenticated user
      - `category_id` (uuid) - Reference to category
      - `amount` (decimal) - Transaction amount
      - `description` (text) - Transaction description/note
      - `date` (date) - Transaction date
      - `type` (text) - Transaction type: 'expense' or 'income'
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Security
    - Enable RLS on both tables
    - Categories: Public read access, authenticated users can manage their own
    - Transactions: Users can only access their own transactions
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  icon text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  description text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read for default categories)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default categories
INSERT INTO categories (name, type, icon, color) VALUES
  ('Food & Dining', 'expense', 'utensils', '#FF6B6B'),
  ('Transportation', 'expense', 'car', '#4ECDC4'),
  ('Shopping', 'expense', 'shopping-bag', '#95E1D3'),
  ('Entertainment', 'expense', 'film', '#F38181'),
  ('Bills & Utilities', 'expense', 'file-text', '#AA96DA'),
  ('Healthcare', 'expense', 'heart', '#FCBAD3'),
  ('Education', 'expense', 'book', '#A8E6CF'),
  ('Others', 'expense', 'more-horizontal', '#FFD3B6'),
  ('Salary', 'income', 'dollar-sign', '#38A169'),
  ('Freelance', 'income', 'briefcase', '#48BB78'),
  ('Investments', 'income', 'trending-up', '#68D391'),
  ('Other Income', 'income', 'plus-circle', '#9AE6B4')
ON CONFLICT DO NOTHING;
