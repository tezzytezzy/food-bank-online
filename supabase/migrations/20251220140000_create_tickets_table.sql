-- Create tickets table
create table public.tickets (
  ticket_id bigint generated always as identity primary key,
  org_id text not null, -- Changed to text to match organisations.id (if Clerk ID)
  session_id uuid not null references public.sessions(id),
  template_id uuid not null references public.templates(id),
  ticket_key text not null,
  ticket_desc text not null,
  status text check (status in ('generated', 'redeemed')) not null default 'generated',
  required_user_fields jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

-- Note: We removed the FK constraint on org_id explicitly if the types mismatch or if organisations.id is not reliably consistent in this env.
-- But usually it is better to cast if possible, or just change type.
-- If organisations.id IS text, then `references public.organisations(id)` works if `org_id` is text.
-- Let's try adding the reference back but with text type.
-- However, if existing `organisations` has UUIDs as seen in schema.sql, but user says it fails...
-- The error "Key columns "org_id" and "id" are of incompatible types: uuid and text" means one is uuid and one is text.
-- If tickets.org_id was uuid (my previous code), then organisations.id must be text.
-- So yes, organisations.id is text.
-- Thus tickets.org_id should be text and can reference it.

-- Enable RLS
alter table public.tickets enable row level security;

-- RLS Policies
-- create policy "tickets_manage_policy"
-- on public.tickets
-- for all
-- using (
--   exists (
--     select 1
--     from public.org_members
--     where org_members.org_id::text = tickets.org_id -- Cast if necessary, or if org_id is text, direct comparison
--     and org_members.user_id = (auth.jwt() ->> 'sub')
--     and org_members.role in ('Admin', 'Editor')
--   )
-- );
create policy "tickets_manage_policy"
on public.tickets
for all
using (
  -- 1. Must belong to the organization the ticket is for
  (tickets.org_id::text = (auth.jwt() ->> 'org_id'))
  
  -- 2. Must have the required role in that organization (Admin or Member)
  and (auth.jwt() ->> 'org_role') in ('Admin', 'Member')
);


-- Index for faster lookups during scan/sync
create index tickets_session_id_idx on public.tickets(session_id);
create index tickets_ticket_key_idx on public.tickets(ticket_key);
