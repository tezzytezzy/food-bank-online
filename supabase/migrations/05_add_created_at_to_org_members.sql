-- Add created_at column to org_members
ALTER TABLE org_members ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
