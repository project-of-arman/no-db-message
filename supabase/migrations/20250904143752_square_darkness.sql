/*
  # Create users table for secure messaging app

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches Supabase auth.users.id
      - `username` (text, unique) - for username-based login
      - `email` (text, nullable) - optional recovery email
      - `created_at` (timestamp) - account creation time
      - `last_seen` (timestamp) - last activity
      - `is_online` (boolean) - online status

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read user data for messaging
    - Add policy for users to update their own profile

  3. Indexes
    - Create indexes on username and email for efficient searching
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  is_online boolean DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can read all user profiles for messaging"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS trigger AS $$
BEGIN
  UPDATE users SET last_seen = now() WHERE id = auth.uid();
  RETURN NULL;
END;
$$ language plpgsql;

-- Note: Messages are intentionally NOT stored in the database for security
-- All messages are encrypted and stored only on the client side