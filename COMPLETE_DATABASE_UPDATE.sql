-- Complete Database Update for Reply Guy Tracker
-- Run this entire script in your Supabase SQL Editor

-- 1. Add new columns to profiles table (if they don't exist)
DO $$ 
BEGIN
    -- Add current_follower_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'current_follower_count') THEN
        ALTER TABLE profiles ADD COLUMN current_follower_count INT DEFAULT 0;
    END IF;
    
    -- Add onboarding_completed if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Remove the unique constraint on user_id, log_date to allow continuous updates
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_user_id_log_date_key;

-- 3. Add updated_at column for tracking when records are modified
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'logs' AND column_name = 'updated_at') THEN
        ALTER TABLE logs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 4. Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_logs_updated_at ON logs;
CREATE TRIGGER update_logs_updated_at
    BEFORE UPDATE ON logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Update existing logs to have updated_at timestamps
UPDATE logs SET updated_at = NOW() WHERE updated_at IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database update completed successfully! Your Reply Guy Tracker is now ready for continuous tracking.';
END $$;