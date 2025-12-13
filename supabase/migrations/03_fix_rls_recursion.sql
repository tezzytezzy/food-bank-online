-- Migration to fix RLS infinite recursion bug
-- Create a helper function to get user's org IDs avoiding RLS loop
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS TABLE (org_id uuid) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid()::text;
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "org_members_view_team" ON "public"."org_members";

-- Create new policy using the helper function
CREATE POLICY "org_members_view_team" ON "public"."org_members"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  org_id IN ( SELECT org_id FROM get_my_org_ids() )
);
