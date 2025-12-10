-- Create tables
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
    default_time time without time zone,
    default_duration integer,
    dietary_info text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES public.organisations (id) NOT NULL,
    template_id uuid REFERENCES public.templates (id) NOT NULL,
    session_date date NOT NULL,
    start_time time without time zone NOT NULL,
    status text CHECK (status IN ('Draft', 'Scheduled', 'Complete', 'Cancelled')) DEFAULT 'Scheduled' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS Policies
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

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_policy"
ON public.org_members FOR SELECT USING (user_id = (auth.jwt() ->> 'sub'));

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

-- Helper RPC for Onboarding
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
  current_user_id := auth.jwt() ->> 'sub';
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.organisations (name, country, state, city)
  VALUES (org_name, org_country, org_state, org_city)
  RETURNING id INTO new_org_id;
  
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'Admin');
  
  RETURN new_org_id;
END;
$$;
