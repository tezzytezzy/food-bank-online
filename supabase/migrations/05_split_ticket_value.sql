-- Split assigned_value into ticket_number_str and assigned_start_time

-- 1. Add new columns
ALTER TABLE public.tickets
ADD COLUMN ticket_number_str TEXT,
ADD COLUMN assigned_start_time TIMESTAMPTZ;

-- 2. Migrate existing data (Best Effort)
-- We assume current 'assigned_value' for Numeric format works as 'ticket_number_str'.
-- For TimeAllotted, we can't easily parse date context from just time string "10:00", so we leave assigned_start_time NULL for now.
-- In a real prod scenario, we might try to join with sessions table to backfill, but plan approved data loss for time slots.
UPDATE public.tickets
SET ticket_number_str = assigned_value
WHERE assigned_value ~ '^[0-9]+$'; -- simplistic regex for numeric strings

-- 3. Drop old column
ALTER TABLE public.tickets
DROP COLUMN assigned_value;
