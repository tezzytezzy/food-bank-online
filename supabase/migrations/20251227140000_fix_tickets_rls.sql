-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "tickets_manage_policy" ON public.tickets;

-- Create a new policy that aligns with the sessions table policy
-- trusted the org_id claim in the JWT.
CREATE POLICY "tickets_manage_policy"
ON public.tickets
FOR ALL
USING (
  org_id = (auth.jwt() ->> 'org_id')::text
);
