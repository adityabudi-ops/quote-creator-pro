
-- ============================================
-- PHASE 1: Drop existing tables (cascade)
-- ============================================
DROP TABLE IF EXISTS public.coverage_values CASCADE;
DROP TABLE IF EXISTS public.coverage_items CASCADE;
DROP TABLE IF EXISTS public.plan_tier_options CASCADE;
DROP TABLE IF EXISTS public.plan_tiers CASCADE;
DROP TABLE IF EXISTS public.benefit_types CASCADE;
DROP TABLE IF EXISTS public.benefits_options CASCADE;

-- ============================================
-- PHASE 2: Create ENUM types
-- ============================================
CREATE TYPE public.demographic_type AS ENUM ('M_0_59', 'F_0_59', 'C_0_59', 'M_60_64', 'F_60_64');
CREATE TYPE public.value_type AS ENUM ('AMOUNT', 'TEXT', 'BOOLEAN', 'NONE');
CREATE TYPE public.template_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE public.offer_status AS ENUM ('QUOTED', 'NA', 'ERROR');

-- ============================================
-- PHASE 3: Master Tables
-- ============================================

-- master_coverage_rule
CREATE TABLE public.master_coverage_rule (
  coverage_rule_code TEXT PRIMARY KEY,
  coverage_rule_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- master_insurer
CREATE TABLE public.master_insurer (
  insurer_code TEXT PRIMARY KEY,
  insurer_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- master_benefit_section
CREATE TABLE public.master_benefit_section (
  section_code TEXT PRIMARY KEY,
  section_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- master_tier
CREATE TABLE public.master_tier (
  tier_code TEXT PRIMARY KEY,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  tier_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- master_benefit_item
CREATE TABLE public.master_benefit_item (
  item_code TEXT PRIMARY KEY,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  unit_text TEXT,
  limit_period TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_group_header BOOLEAN NOT NULL DEFAULT false,
  parent_item_code TEXT REFERENCES public.master_benefit_item(item_code) ON DELETE SET NULL,
  sub_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PHASE 4: Admin Template Tables
-- ============================================

-- schedule_template_section_header
CREATE TABLE public.schedule_template_section_header (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_rule_code TEXT NOT NULL REFERENCES public.master_coverage_rule(coverage_rule_code) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  tier_code TEXT NOT NULL REFERENCES public.master_tier(tier_code) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  status public.template_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coverage_rule_code, insurer_code, section_code, tier_code, effective_date)
);

-- schedule_template_section_item
CREATE TABLE public.schedule_template_section_item (
  template_id UUID NOT NULL REFERENCES public.schedule_template_section_header(template_id) ON DELETE CASCADE,
  item_code TEXT NOT NULL REFERENCES public.master_benefit_item(item_code) ON DELETE CASCADE,
  value_type public.value_type NOT NULL DEFAULT 'AMOUNT',
  value_amount NUMERIC,
  value_text TEXT,
  currency TEXT DEFAULT 'IDR',
  unit_text TEXT,
  limit_period TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, item_code)
);

-- ============================================
-- PHASE 5: Admin Pricing Tables
-- ============================================

-- pricing_section_age
CREATE TABLE public.pricing_section_age (
  coverage_rule_code TEXT NOT NULL REFERENCES public.master_coverage_rule(coverage_rule_code) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  tier_code TEXT NOT NULL REFERENCES public.master_tier(tier_code) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  demographic public.demographic_type NOT NULL,
  annual_premium NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (coverage_rule_code, insurer_code, section_code, tier_code, effective_date, demographic)
);

-- fees_tax
CREATE TABLE public.fees_tax (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  admin_fee NUMERIC NOT NULL DEFAULT 0,
  stamp_duty NUMERIC NOT NULL DEFAULT 0,
  vat_percent NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (insurer_code, effective_date)
);

-- ============================================
-- PHASE 6: Quotation Transactional Tables
-- ============================================

-- Update existing quotation table (add coverage_rule_code)
ALTER TABLE public.quotations 
  ADD COLUMN IF NOT EXISTS coverage_rule_code TEXT REFERENCES public.master_coverage_rule(coverage_rule_code);

-- quotation_package
CREATE TABLE public.quotation_package (
  package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL, -- A, B, etc.
  package_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- quotation_package_census
CREATE TABLE public.quotation_package_census (
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  demographic public.demographic_type NOT NULL,
  lives INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (package_id, demographic)
);

-- quotation_package_requested_tier
CREATE TABLE public.quotation_package_requested_tier (
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  requested_tier_code TEXT REFERENCES public.master_tier(tier_code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (package_id, section_code)
);

-- quotation_package_insurer_offer
CREATE TABLE public.quotation_package_insurer_offer (
  offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  offered_tier_code TEXT REFERENCES public.master_tier(tier_code) ON DELETE SET NULL,
  template_id_used UUID REFERENCES public.schedule_template_section_header(template_id) ON DELETE SET NULL,
  pricing_effective_date_used DATE,
  status public.offer_status NOT NULL DEFAULT 'QUOTED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, insurer_code, section_code)
);

-- quotation_benefit_schedule_item (frozen copy)
CREATE TABLE public.quotation_benefit_schedule_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  value_type public.value_type NOT NULL DEFAULT 'AMOUNT',
  value_amount NUMERIC,
  value_text TEXT,
  currency TEXT,
  unit_text TEXT,
  limit_period TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_group_header BOOLEAN NOT NULL DEFAULT false,
  sub_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, package_id, insurer_code, section_code, item_code)
);

-- quotation_premium_detail
CREATE TABLE public.quotation_premium_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  section_code TEXT NOT NULL REFERENCES public.master_benefit_section(section_code) ON DELETE CASCADE,
  demographic public.demographic_type NOT NULL,
  annual_premium_per_member NUMERIC NOT NULL DEFAULT 0,
  lives INTEGER NOT NULL DEFAULT 0,
  annual_premium_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, package_id, insurer_code, section_code, demographic)
);

-- quotation_premium_summary
CREATE TABLE public.quotation_premium_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.quotation_package(package_id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  gross_premium_package NUMERIC NOT NULL DEFAULT 0,
  fees_package NUMERIC DEFAULT 0,
  tax_package NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, package_id, insurer_code)
);

-- quotation_premium_overall
CREATE TABLE public.quotation_premium_overall (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  insurer_code TEXT NOT NULL REFERENCES public.master_insurer(insurer_code) ON DELETE CASCADE,
  gross_total_all_packages NUMERIC NOT NULL DEFAULT 0,
  admin_fee NUMERIC DEFAULT 0,
  stamp_duty NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, insurer_code)
);

-- ============================================
-- PHASE 7: Enable RLS on all tables
-- ============================================
ALTER TABLE public.master_coverage_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_insurer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_benefit_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_benefit_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_template_section_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_template_section_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_section_age ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_package ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_package_census ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_package_requested_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_package_insurer_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_benefit_schedule_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_premium_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_premium_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_premium_overall ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 8: RLS Policies for Master Tables (Read: All, Write: Admin)
-- ============================================

-- master_coverage_rule
CREATE POLICY "Anyone can view coverage rules" ON public.master_coverage_rule FOR SELECT USING (true);
CREATE POLICY "Admins can insert coverage rules" ON public.master_coverage_rule FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update coverage rules" ON public.master_coverage_rule FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete coverage rules" ON public.master_coverage_rule FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- master_insurer
CREATE POLICY "Anyone can view insurers" ON public.master_insurer FOR SELECT USING (true);
CREATE POLICY "Admins can insert insurers" ON public.master_insurer FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update insurers" ON public.master_insurer FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete insurers" ON public.master_insurer FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- master_benefit_section
CREATE POLICY "Anyone can view benefit sections" ON public.master_benefit_section FOR SELECT USING (true);
CREATE POLICY "Admins can insert benefit sections" ON public.master_benefit_section FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update benefit sections" ON public.master_benefit_section FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete benefit sections" ON public.master_benefit_section FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- master_tier
CREATE POLICY "Anyone can view tiers" ON public.master_tier FOR SELECT USING (true);
CREATE POLICY "Admins can insert tiers" ON public.master_tier FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tiers" ON public.master_tier FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tiers" ON public.master_tier FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- master_benefit_item
CREATE POLICY "Anyone can view benefit items" ON public.master_benefit_item FOR SELECT USING (true);
CREATE POLICY "Admins can insert benefit items" ON public.master_benefit_item FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update benefit items" ON public.master_benefit_item FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete benefit items" ON public.master_benefit_item FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- ============================================
-- PHASE 9: RLS Policies for Template Tables
-- ============================================

-- schedule_template_section_header
CREATE POLICY "Anyone can view templates" ON public.schedule_template_section_header FOR SELECT USING (true);
CREATE POLICY "Admins can insert templates" ON public.schedule_template_section_header FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update templates" ON public.schedule_template_section_header FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete templates" ON public.schedule_template_section_header FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- schedule_template_section_item
CREATE POLICY "Anyone can view template items" ON public.schedule_template_section_item FOR SELECT USING (true);
CREATE POLICY "Admins can insert template items" ON public.schedule_template_section_item FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update template items" ON public.schedule_template_section_item FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete template items" ON public.schedule_template_section_item FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- ============================================
-- PHASE 10: RLS Policies for Pricing Tables
-- ============================================

-- pricing_section_age
CREATE POLICY "Anyone can view pricing" ON public.pricing_section_age FOR SELECT USING (true);
CREATE POLICY "Admins can insert pricing" ON public.pricing_section_age FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pricing" ON public.pricing_section_age FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pricing" ON public.pricing_section_age FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- fees_tax
CREATE POLICY "Anyone can view fees" ON public.fees_tax FOR SELECT USING (true);
CREATE POLICY "Admins can insert fees" ON public.fees_tax FOR INSERT WITH CHECK (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update fees" ON public.fees_tax FOR UPDATE USING (has_user_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete fees" ON public.fees_tax FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- ============================================
-- PHASE 11: RLS Policies for Quotation Tables
-- ============================================

-- quotation_package
CREATE POLICY "Users can view packages" ON public.quotation_package FOR SELECT USING (true);
CREATE POLICY "Users can insert packages" ON public.quotation_package FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update packages" ON public.quotation_package FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete packages" ON public.quotation_package FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_package_census
CREATE POLICY "Users can view census" ON public.quotation_package_census FOR SELECT USING (true);
CREATE POLICY "Users can insert census" ON public.quotation_package_census FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update census" ON public.quotation_package_census FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete census" ON public.quotation_package_census FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_package_requested_tier
CREATE POLICY "Users can view requested tiers" ON public.quotation_package_requested_tier FOR SELECT USING (true);
CREATE POLICY "Users can insert requested tiers" ON public.quotation_package_requested_tier FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update requested tiers" ON public.quotation_package_requested_tier FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete requested tiers" ON public.quotation_package_requested_tier FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_package_insurer_offer
CREATE POLICY "Users can view offers" ON public.quotation_package_insurer_offer FOR SELECT USING (true);
CREATE POLICY "Users can insert offers" ON public.quotation_package_insurer_offer FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update offers" ON public.quotation_package_insurer_offer FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete offers" ON public.quotation_package_insurer_offer FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_benefit_schedule_item
CREATE POLICY "Users can view schedule items" ON public.quotation_benefit_schedule_item FOR SELECT USING (true);
CREATE POLICY "Users can insert schedule items" ON public.quotation_benefit_schedule_item FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete schedule items" ON public.quotation_benefit_schedule_item FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_premium_detail
CREATE POLICY "Users can view premium details" ON public.quotation_premium_detail FOR SELECT USING (true);
CREATE POLICY "Users can insert premium details" ON public.quotation_premium_detail FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete premium details" ON public.quotation_premium_detail FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_premium_summary
CREATE POLICY "Users can view premium summary" ON public.quotation_premium_summary FOR SELECT USING (true);
CREATE POLICY "Users can insert premium summary" ON public.quotation_premium_summary FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete premium summary" ON public.quotation_premium_summary FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- quotation_premium_overall
CREATE POLICY "Users can view premium overall" ON public.quotation_premium_overall FOR SELECT USING (true);
CREATE POLICY "Users can insert premium overall" ON public.quotation_premium_overall FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete premium overall" ON public.quotation_premium_overall FOR DELETE USING (has_user_role(auth.uid(), 'admin'));

-- ============================================
-- PHASE 12: Triggers for updated_at
-- ============================================
CREATE TRIGGER update_master_coverage_rule_updated_at BEFORE UPDATE ON public.master_coverage_rule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_insurer_updated_at BEFORE UPDATE ON public.master_insurer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_benefit_section_updated_at BEFORE UPDATE ON public.master_benefit_section FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_tier_updated_at BEFORE UPDATE ON public.master_tier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_benefit_item_updated_at BEFORE UPDATE ON public.master_benefit_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_template_section_header_updated_at BEFORE UPDATE ON public.schedule_template_section_header FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_template_section_item_updated_at BEFORE UPDATE ON public.schedule_template_section_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_section_age_updated_at BEFORE UPDATE ON public.pricing_section_age FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fees_tax_updated_at BEFORE UPDATE ON public.fees_tax FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotation_package_updated_at BEFORE UPDATE ON public.quotation_package FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotation_package_census_updated_at BEFORE UPDATE ON public.quotation_package_census FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotation_package_requested_tier_updated_at BEFORE UPDATE ON public.quotation_package_requested_tier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotation_package_insurer_offer_updated_at BEFORE UPDATE ON public.quotation_package_insurer_offer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 13: Seed initial data
-- ============================================

-- Coverage Rules (the 4 options)
INSERT INTO public.master_coverage_rule (coverage_rule_code, coverage_rule_name) VALUES
  ('inner_limit_all', 'Inner Limit For All Benefits'),
  ('inner_ip_ma_as_charge_op_de', 'Inner Limit for IP/MA, OP/DE As Charge'),
  ('semi_ip_inner_ma_as_charge_op_de', 'Semi As Charge for IP, MA Inner Limit, OP/DE As Charge'),
  ('as_charge_ip_op_de_inner_ma', 'As Charge for IP/OP/DE, MA Inner Limit');

-- Benefit Sections
INSERT INTO public.master_benefit_section (section_code, section_name, display_order) VALUES
  ('IP', 'In-Patient', 1),
  ('OP', 'Out-Patient', 2),
  ('DE', 'Dental', 3),
  ('MA', 'Maternity', 4);

-- Sample Tiers (based on existing plan structures)
INSERT INTO public.master_tier (tier_code, section_code, tier_label) VALUES
  ('IP300', 'IP', 'IP 300'),
  ('IP500', 'IP', 'IP 500'),
  ('IP750', 'IP', 'IP 750'),
  ('IP1000', 'IP', 'IP 1000'),
  ('IP1500', 'IP', 'IP 1500'),
  ('IP2000', 'IP', 'IP 2000'),
  ('IP3000', 'IP', 'IP 3000'),
  ('OP150', 'OP', 'OP 150'),
  ('OP200', 'OP', 'OP 200'),
  ('OP250', 'OP', 'OP 250'),
  ('OP350', 'OP', 'OP 350'),
  ('OP450', 'OP', 'OP 450'),
  ('OP550', 'OP', 'OP 550'),
  ('DE1500', 'DE', 'DE 1500'),
  ('DE2000', 'DE', 'DE 2000'),
  ('DE3000', 'DE', 'DE 3000'),
  ('DE4000', 'DE', 'DE 4000'),
  ('DE5000', 'DE', 'DE 5000'),
  ('DE6000', 'DE', 'DE 6000'),
  ('DE7000', 'DE', 'DE 7000'),
  ('MA4000', 'MA', 'MA 4000'),
  ('MA5000', 'MA', 'MA 5000'),
  ('MA6000', 'MA', 'MA 6000'),
  ('MA7000', 'MA', 'MA 7000'),
  ('MA8000', 'MA', 'MA 8000'),
  ('MA10000', 'MA', 'MA 10000');
