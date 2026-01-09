-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can create quotations" ON public.quotations;

-- Create more specific policy - users can only insert quotations where created_by is their profile id
CREATE POLICY "Users can create quotations" ON public.quotations
  FOR INSERT TO authenticated 
  WITH CHECK (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );