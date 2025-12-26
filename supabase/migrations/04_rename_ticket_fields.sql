-- Rename columns in tickets table
ALTER TABLE public.tickets 
RENAME COLUMN ticket_id TO id;

ALTER TABLE public.tickets 
RENAME COLUMN ticket_key TO qr_code;

ALTER TABLE public.tickets 
RENAME COLUMN ticket_desc TO assigned_value;

ALTER TABLE public.tickets 
RENAME COLUMN required_user_fields TO user_data;

-- Usage of 'required_user_fields' in 'templates' table remains unchanged as it defines the schema, 
-- while 'user_data' in 'tickets' table holds the actual values.

-- Rename indices if necessary (Supabase/Postgres might handle some automatically, but being explicit is good)
ALTER INDEX IF EXISTS tickets_ticket_key_idx RENAME TO tickets_qr_code_idx;
