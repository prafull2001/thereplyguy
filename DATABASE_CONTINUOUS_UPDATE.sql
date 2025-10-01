-- Update database for continuous tracking system
-- Run this in your Supabase SQL Editor

-- Remove the unique constraint on user_id, log_date since we want to update the same day's record
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_user_id_log_date_key;

-- Add a column to track when the record was last updated
ALTER TABLE logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_logs_updated_at ON logs;
CREATE TRIGGER update_logs_updated_at
    BEFORE UPDATE ON logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();