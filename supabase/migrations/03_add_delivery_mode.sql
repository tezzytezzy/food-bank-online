-- Rename delivery_model to delivery_mode and add check constraint
ALTER TABLE public.templates RENAME COLUMN delivery_model TO delivery_mode;

ALTER TABLE public.templates 
ADD CONSTRAINT templates_delivery_mode_check 
CHECK (delivery_mode IN ('Digital', 'Paper', 'Hybrid'));
