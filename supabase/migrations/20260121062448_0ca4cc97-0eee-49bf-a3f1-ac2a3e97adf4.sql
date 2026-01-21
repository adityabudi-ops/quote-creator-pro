-- =============================================
-- SCENARIO-BASED QUOTATION ARCHITECTURE
-- =============================================

-- 1) Create quotation_scenario table
CREATE TABLE public.quotation_scenario (
  scenario_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  scenario_number INTEGER NOT NULL DEFAULT 1,
  scenario_name TEXT NOT NULL DEFAULT 'Base',
  is_base BOOLEAN NOT NULL DEFAULT false,
  
  -- Scenario-specific configuration (can differ from base)
  coverage_rule_code TEXT NOT NULL,
  insurance_companies TEXT[] NOT NULL,
  benefits JSONB NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'resolved', 'finalized')),
  
  -- Revision tracking
  revision INTEGER NOT NULL DEFAULT 1,
  parent_revision_id UUID REFERENCES public.quotation_scenario(scenario_id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (quotation_id, scenario_number, revision)
);

-- 2) Create quotation_scenario_package table (links packages to scenarios)
CREATE TABLE public.quotation_scenario_package (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (scenario_id, package_id)
);

-- 3) Create quotation_scenario_requested_tier table
CREATE TABLE public.quotation_scenario_requested_tier (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  requested_tier_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (scenario_id, package_id, section_code)
);

-- 4) Create quotation_scenario_offer table (insurer offers per scenario)
CREATE TABLE public.quotation_scenario_offer (
  offer_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL,
  section_code TEXT NOT NULL,
  offered_tier_code TEXT,
  status TEXT NOT NULL DEFAULT 'QUOTED' CHECK (status IN ('QUOTED', 'NA', 'ERROR')),
  notes TEXT,
  template_id_used UUID,
  pricing_effective_date_used DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (scenario_id, package_id, insurer_code, section_code)
);

-- 5) Create quotation_scenario_premium_detail table
CREATE TABLE public.quotation_scenario_premium_detail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL,
  section_code TEXT NOT NULL,
  demographic demographic_type NOT NULL,
  lives INTEGER NOT NULL DEFAULT 0,
  annual_premium_per_member NUMERIC NOT NULL DEFAULT 0,
  annual_premium_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) Create quotation_scenario_premium_summary table
CREATE TABLE public.quotation_scenario_premium_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL,
  gross_premium_package NUMERIC NOT NULL DEFAULT 0,
  fees_package NUMERIC DEFAULT 0,
  tax_package NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (scenario_id, package_id, insurer_code)
);

-- 7) Create quotation_scenario_premium_overall table
CREATE TABLE public.quotation_scenario_premium_overall (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL,
  gross_total_all_packages NUMERIC NOT NULL DEFAULT 0,
  admin_fee NUMERIC DEFAULT 0,
  stamp_duty NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (scenario_id, insurer_code)
);

-- 8) Create quotation_scenario_schedule_item table
CREATE TABLE public.quotation_scenario_schedule_item (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL,
  section_code TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  sub_label TEXT,
  is_group_header BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  value_type value_type NOT NULL DEFAULT 'AMOUNT',
  value_amount NUMERIC,
  value_text TEXT,
  currency TEXT,
  limit_period TEXT,
  unit_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9) Create quotation_revision table for audit history
CREATE TABLE public.quotation_revision (
  revision_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.quotation_scenario(scenario_id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  change_description TEXT,
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  snapshot_data JSONB, -- stores complete state at revision time
  
  UNIQUE (quotation_id, scenario_id, revision_number)
);

-- Enable RLS on all new tables
ALTER TABLE public.quotation_scenario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_package ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_requested_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_premium_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_premium_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_premium_overall ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_scenario_schedule_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_revision ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotation_scenario
CREATE POLICY "Users can view scenarios" ON public.quotation_scenario FOR SELECT USING (true);
CREATE POLICY "Users can insert scenarios" ON public.quotation_scenario FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update scenarios" ON public.quotation_scenario FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenarios" ON public.quotation_scenario FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_package
CREATE POLICY "Users can view scenario packages" ON public.quotation_scenario_package FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario packages" ON public.quotation_scenario_package FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario packages" ON public.quotation_scenario_package FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_requested_tier
CREATE POLICY "Users can view scenario requested tiers" ON public.quotation_scenario_requested_tier FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario requested tiers" ON public.quotation_scenario_requested_tier FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update scenario requested tiers" ON public.quotation_scenario_requested_tier FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario requested tiers" ON public.quotation_scenario_requested_tier FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_offer
CREATE POLICY "Users can view scenario offers" ON public.quotation_scenario_offer FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario offers" ON public.quotation_scenario_offer FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update scenario offers" ON public.quotation_scenario_offer FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario offers" ON public.quotation_scenario_offer FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_premium_detail
CREATE POLICY "Users can view scenario premium details" ON public.quotation_scenario_premium_detail FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario premium details" ON public.quotation_scenario_premium_detail FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario premium details" ON public.quotation_scenario_premium_detail FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_premium_summary
CREATE POLICY "Users can view scenario premium summary" ON public.quotation_scenario_premium_summary FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario premium summary" ON public.quotation_scenario_premium_summary FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario premium summary" ON public.quotation_scenario_premium_summary FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_premium_overall
CREATE POLICY "Users can view scenario premium overall" ON public.quotation_scenario_premium_overall FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario premium overall" ON public.quotation_scenario_premium_overall FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario premium overall" ON public.quotation_scenario_premium_overall FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_scenario_schedule_item
CREATE POLICY "Users can view scenario schedule items" ON public.quotation_scenario_schedule_item FOR SELECT USING (true);
CREATE POLICY "Users can insert scenario schedule items" ON public.quotation_scenario_schedule_item FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete scenario schedule items" ON public.quotation_scenario_schedule_item FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for quotation_revision
CREATE POLICY "Users can view revisions" ON public.quotation_revision FOR SELECT USING (true);
CREATE POLICY "Users can insert revisions" ON public.quotation_revision FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete revisions" ON public.quotation_revision FOR DELETE USING (has_user_role(auth.uid(), 'admin'::user_role));

-- Update triggers for updated_at
CREATE TRIGGER update_quotation_scenario_updated_at
  BEFORE UPDATE ON public.quotation_scenario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotation_scenario_requested_tier_updated_at
  BEFORE UPDATE ON public.quotation_scenario_requested_tier
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotation_scenario_offer_updated_at
  BEFORE UPDATE ON public.quotation_scenario_offer
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_scenario_quotation ON public.quotation_scenario(quotation_id);
CREATE INDEX idx_scenario_package_scenario ON public.quotation_scenario_package(scenario_id);
CREATE INDEX idx_scenario_offer_scenario ON public.quotation_scenario_offer(scenario_id);
CREATE INDEX idx_scenario_premium_detail_scenario ON public.quotation_scenario_premium_detail(scenario_id);
CREATE INDEX idx_scenario_schedule_scenario ON public.quotation_scenario_schedule_item(scenario_id);
CREATE INDEX idx_revision_quotation ON public.quotation_revision(quotation_id);