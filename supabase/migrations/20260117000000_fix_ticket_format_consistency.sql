-- Migration to standardize ticket_format to 'Time-Allotted'
-- 1. Drop existing constraints (if any) to allow updates
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_ticket_type_check;
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_ticket_format_check;

-- 2. Migrate existing data
UPDATE public.templates
SET ticket_format = 'Time-Allotted'
WHERE ticket_format = 'TimeAllotted';

-- 3. Add new constraint
ALTER TABLE public.templates
ADD CONSTRAINT templates_ticket_format_check 
CHECK (ticket_format IN ('Numeric', 'Time-Allotted'));
