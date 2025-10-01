-- Simple RLS fix for Reply Guy Tracker
-- Run this in your Supabase SQL Editor

-- Temporarily disable RLS to allow profile creation
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS disabled - onboarding should now work!' as status;