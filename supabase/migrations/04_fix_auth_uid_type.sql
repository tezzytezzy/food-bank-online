-- Migration to fix RLS function to compatibility with Clerk IDs (Text)
-- Use auth.jwt() ->> 'sub' instead of auth.uid()

CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS TABLE (org_id uuid) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = (auth.jwt() ->> 'sub');
$$;

-- Policy remains valid as it uses the function interface
