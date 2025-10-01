-- Add current_follower_count and onboarding_completed to profiles table
-- Run this in your Supabase SQL Editor

-- First, check if columns already exist to avoid errors
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