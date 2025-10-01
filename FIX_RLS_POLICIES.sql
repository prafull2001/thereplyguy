-- Fix RLS policies for Reply Guy Tracker
-- Run this in your Supabase SQL Editor

-- 1. Drop existing policies that might be blocking profile creation
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. Create comprehensive RLS policies for profiles table
CREATE POLICY "Enable read access for users to their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert access for users to create their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update access for users to their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Also fix RLS policies for logs table to ensure tracking works
DROP POLICY IF EXISTS "Users can view own logs" ON logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON logs;
DROP POLICY IF EXISTS "Users can update own logs" ON logs;

CREATE POLICY "Enable read access for users to their own logs" ON logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users to create their own logs" ON logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for users to their own logs" ON logs
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Ensure RLS is enabled on logs table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- 6. Also disable email confirmations for easier development
-- (You'll need to do this manually in the Supabase Dashboard under Authentication → Settings)

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS policies updated successfully! Onboarding should now work.';
END $$;