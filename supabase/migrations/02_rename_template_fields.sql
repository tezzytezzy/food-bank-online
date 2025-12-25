-- Rename columns in templates table
ALTER TABLE public.templates RENAME COLUMN ticket_type TO ticket_format;
ALTER TABLE public.templates RENAME COLUMN distribution_type TO issuance_order;
