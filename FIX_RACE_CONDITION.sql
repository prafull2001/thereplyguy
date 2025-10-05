-- Fix race condition by adding unique constraint to prevent duplicate log entries
-- This ensures that only one log entry can exist per user per day

-- Add unique constraint on user_id and log_date combination
ALTER TABLE logs ADD CONSTRAINT logs_user_id_log_date_unique 
UNIQUE (user_id, log_date);

-- Optional: Clean up any existing duplicates before adding constraint
-- (Run this first if constraint fails due to existing duplicates)
/*
WITH duplicates AS (
  SELECT user_id, log_date, MIN(id) as keep_id
  FROM logs 
  GROUP BY user_id, log_date 
  HAVING COUNT(*) > 1
)
DELETE FROM logs 
WHERE id NOT IN (SELECT keep_id FROM duplicates)
  AND (user_id, log_date) IN (
    SELECT user_id, log_date FROM duplicates
  );
*/