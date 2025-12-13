-- Migration to fix RLS policy for org_members to allow team visibility
-- Drop the existing restrictive policy (assuming name 'org_members_select_policy' from standard or checked state)
DROP POLICY IF EXISTS "org_members_select_policy" ON "public"."org_members";

-- Create new policy to allow viewing all members of user's organisations
CREATE POLICY "org_members_view_team" ON "public"."org_members"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id 
    FROM org_members 
    WHERE user_id = auth.uid()
  )
);
