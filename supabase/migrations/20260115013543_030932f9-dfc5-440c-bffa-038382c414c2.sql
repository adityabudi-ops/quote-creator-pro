-- Create a new function to check if user is admin (either by role or is_admin flag)
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND (role = 'admin' OR is_admin = true)
  )
$$;

-- Drop and recreate RLS policies for master_insurer
DROP POLICY IF EXISTS "Admins can insert insurers" ON public.master_insurer;
DROP POLICY IF EXISTS "Admins can update insurers" ON public.master_insurer;
DROP POLICY IF EXISTS "Admins can delete insurers" ON public.master_insurer;

CREATE POLICY "Admins can insert insurers" ON public.master_insurer
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update insurers" ON public.master_insurer
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete insurers" ON public.master_insurer
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update master_coverage_rule policies
DROP POLICY IF EXISTS "Admins can insert coverage rules" ON public.master_coverage_rule;
DROP POLICY IF EXISTS "Admins can update coverage rules" ON public.master_coverage_rule;
DROP POLICY IF EXISTS "Admins can delete coverage rules" ON public.master_coverage_rule;

CREATE POLICY "Admins can insert coverage rules" ON public.master_coverage_rule
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update coverage rules" ON public.master_coverage_rule
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete coverage rules" ON public.master_coverage_rule
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update master_benefit_section policies
DROP POLICY IF EXISTS "Admins can insert benefit sections" ON public.master_benefit_section;
DROP POLICY IF EXISTS "Admins can update benefit sections" ON public.master_benefit_section;
DROP POLICY IF EXISTS "Admins can delete benefit sections" ON public.master_benefit_section;

CREATE POLICY "Admins can insert benefit sections" ON public.master_benefit_section
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update benefit sections" ON public.master_benefit_section
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete benefit sections" ON public.master_benefit_section
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update master_tier policies
DROP POLICY IF EXISTS "Admins can insert tiers" ON public.master_tier;
DROP POLICY IF EXISTS "Admins can update tiers" ON public.master_tier;
DROP POLICY IF EXISTS "Admins can delete tiers" ON public.master_tier;

CREATE POLICY "Admins can insert tiers" ON public.master_tier
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update tiers" ON public.master_tier
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete tiers" ON public.master_tier
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update master_benefit_item policies
DROP POLICY IF EXISTS "Admins can insert benefit items" ON public.master_benefit_item;
DROP POLICY IF EXISTS "Admins can update benefit items" ON public.master_benefit_item;
DROP POLICY IF EXISTS "Admins can delete benefit items" ON public.master_benefit_item;

CREATE POLICY "Admins can insert benefit items" ON public.master_benefit_item
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update benefit items" ON public.master_benefit_item
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete benefit items" ON public.master_benefit_item
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update schedule_template_section_header policies
DROP POLICY IF EXISTS "Admins can insert templates" ON public.schedule_template_section_header;
DROP POLICY IF EXISTS "Admins can update templates" ON public.schedule_template_section_header;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.schedule_template_section_header;

CREATE POLICY "Admins can insert templates" ON public.schedule_template_section_header
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update templates" ON public.schedule_template_section_header
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete templates" ON public.schedule_template_section_header
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update schedule_template_section_item policies
DROP POLICY IF EXISTS "Admins can insert template items" ON public.schedule_template_section_item;
DROP POLICY IF EXISTS "Admins can update template items" ON public.schedule_template_section_item;
DROP POLICY IF EXISTS "Admins can delete template items" ON public.schedule_template_section_item;

CREATE POLICY "Admins can insert template items" ON public.schedule_template_section_item
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update template items" ON public.schedule_template_section_item
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete template items" ON public.schedule_template_section_item
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update pricing_section_age policies
DROP POLICY IF EXISTS "Admins can insert pricing" ON public.pricing_section_age;
DROP POLICY IF EXISTS "Admins can update pricing" ON public.pricing_section_age;
DROP POLICY IF EXISTS "Admins can delete pricing" ON public.pricing_section_age;

CREATE POLICY "Admins can insert pricing" ON public.pricing_section_age
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update pricing" ON public.pricing_section_age
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete pricing" ON public.pricing_section_age
FOR DELETE USING (is_admin_user(auth.uid()));

-- Update fees_tax policies
DROP POLICY IF EXISTS "Admins can insert fees" ON public.fees_tax;
DROP POLICY IF EXISTS "Admins can update fees" ON public.fees_tax;
DROP POLICY IF EXISTS "Admins can delete fees" ON public.fees_tax;

CREATE POLICY "Admins can insert fees" ON public.fees_tax
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update fees" ON public.fees_tax
FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete fees" ON public.fees_tax
FOR DELETE USING (is_admin_user(auth.uid()));