-- Migration to add new template configuration fields
-- Run this in Supabase SQL Editor

ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS ticket_type text CHECK (ticket_type IN ('Numeric', 'TimeAllotted')),
ADD COLUMN IF NOT EXISTS distribution_type text CHECK (distribution_type IN ('Sequential', 'NonSequential')),
ADD COLUMN IF NOT EXISTS max_numeric_tickets integer,
ADD COLUMN IF NOT EXISTS time_slots_config jsonb, -- Stores { startTime, duration, count, capacity }
ADD COLUMN IF NOT EXISTS required_user_fields jsonb; -- Stores array of { label, type }
