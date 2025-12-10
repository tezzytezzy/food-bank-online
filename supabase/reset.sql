-- !!! WARNING: THIS WILL DELETE ALL DATA IN THESE TABLES !!! --
-- Run this script in the Supabase SQL Editor to reset your schema to the correct state.

-- 1. Drop existing objects
DROP FUNCTION IF EXISTS create_new_organisation;
DROP POLICY IF EXISTS "sessions_manage_policy" ON public.sessions;
DROP POLICY IF EXISTS "templates_manage_policy" ON public.templates;
DROP POLICY IF EXISTS "org_members_insert_policy" ON public.org_members;
DROP POLICY IF EXISTS "org_members_select_policy" ON public.org_members;
DROP POLICY IF EXISTS "organisation_insert_policy" ON public.organisations;
DROP POLICY IF EXISTS "organisation_select_policy" ON public.organisations;

DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.templates;
DROP TABLE IF EXISTS public.org_members;
DROP TABLE IF EXISTS public.organisations;

-- 2. Re-create Tables
begin;

CREATE TABLE public.organisations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    country text NOT NULL,
    state text NOT NULL,
    city text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.org_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES public.organisations (id) NOT NULL,
    user_id text NOT NULL, 
    role text CHECK (role IN ('Admin', 'Editor', 'Viewer')) DEFAULT 'Viewer' NOT NULL,
    UNIQUE (org_id, user_id)
);

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES public.organisations (id) NOT NULL,
    name text NOT NULL,
    
    -- New Fields Integrated directly
    ticket_type text CHECK (ticket_type IN ('Numeric', 'TimeAllotted')),
    distribution_type text CHECK (distribution_type IN ('Sequential', 'NonSequential')),
    
    start_time time without time zone, -- Renamed from default_time, applies to all types?
    -- Actually user said "Regardless of Ticket Type, the form should display and ask for Session Start Time."
    
    -- Config for specific types
    max_numeric_tickets integer,
    time_slots_config jsonb, -- { duration, count, capacity } (Removed start_time from here)
    required_user_fields jsonb, -- Array of { label, type }
    
    dietary_info text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES public.organisations (id) NOT NULL,
    template_id uuid REFERENCES public.templates (id) NOT NULL,
    session_date date NOT NULL,
    start_time time without time zone NOT NULL, -- Override or copy from template
    status text CHECK (status IN ('Draft', 'Scheduled', 'Complete', 'Cancelled')) DEFAULT 'Scheduled' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. RLS Policies
-- Note: We use (auth.jwt() ->> 'sub') for secure, verified Clerk User IDs.

-- Organisations
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organisation_select_policy"
ON public.organisations FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.org_members
        WHERE org_members.org_id = organisations.id
          AND org_members.user_id = (auth.jwt() ->> 'sub')
    )
);

-- Org Members
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_policy"
ON public.org_members FOR SELECT USING (user_id = (auth.jwt() ->> 'sub'));

-- Templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_manage_policy"
ON public.templates FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.org_members
        WHERE org_members.org_id = templates.org_id
          AND org_members.user_id = (auth.jwt() ->> 'sub')
          AND org_members.role IN ('Admin', 'Editor')
    )
);

-- Sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_manage_policy"
ON public.sessions FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.org_members
        WHERE org_members.org_id = sessions.org_id
          AND org_members.user_id = (auth.jwt() ->> 'sub')
          AND org_members.role IN ('Admin', 'Editor')
    )
);

commit;

-- 4. Create Atomic RPC for Onboarding
-- This function runs as the database owner (SECURITY DEFINER), allowing it to
-- insert into organisations and org_members even if the user doesn't have permissions yet.
CREATE OR REPLACE FUNCTION create_new_organisation(
  org_name text,
  org_country text,
  org_state text,
  org_city text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  current_user_id text;
BEGIN
  -- Get the User ID from the JWT
  current_user_id := auth.jwt() ->> 'sub';
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert Organisation
  INSERT INTO public.organisations (name, country, state, city)
  VALUES (org_name, org_country, org_state, org_city)
  RETURNING id INTO new_org_id;
  
  -- Insert Admin Member
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'Admin');
  
  RETURN new_org_id;
END;
$$;
