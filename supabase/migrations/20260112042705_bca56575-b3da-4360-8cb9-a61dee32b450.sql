-- Create table for benefit types (IP, OP, DE, MA)
CREATE TABLE public.benefit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for plan tiers (e.g., IP 300, IP 500, DE 1500, etc.)
CREATE TABLE public.plan_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_type_id UUID NOT NULL REFERENCES public.benefit_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  limit_value INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(benefit_type_id, name)
);

-- Create table for benefits options (the 4 coverage configurations)
CREATE TABLE public.benefits_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.benefit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for benefit_types
CREATE POLICY "Anyone can view active benefit types"
ON public.benefit_types FOR SELECT
USING (true);

CREATE POLICY "Admins can insert benefit types"
ON public.benefit_types FOR INSERT
WITH CHECK (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update benefit types"
ON public.benefit_types FOR UPDATE
USING (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete benefit types"
ON public.benefit_types FOR DELETE
USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for plan_tiers
CREATE POLICY "Anyone can view active plan tiers"
ON public.plan_tiers FOR SELECT
USING (true);

CREATE POLICY "Admins can insert plan tiers"
ON public.plan_tiers FOR INSERT
WITH CHECK (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update plan tiers"
ON public.plan_tiers FOR UPDATE
USING (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete plan tiers"
ON public.plan_tiers FOR DELETE
USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for benefits_options
CREATE POLICY "Anyone can view active benefits options"
ON public.benefits_options FOR SELECT
USING (true);

CREATE POLICY "Admins can insert benefits options"
ON public.benefits_options FOR INSERT
WITH CHECK (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update benefits options"
ON public.benefits_options FOR UPDATE
USING (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete benefits options"
ON public.benefits_options FOR DELETE
USING (has_user_role(auth.uid(), 'admin'::user_role));

-- Create updated_at triggers
CREATE TRIGGER update_benefit_types_updated_at
BEFORE UPDATE ON public.benefit_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_tiers_updated_at
BEFORE UPDATE ON public.plan_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_benefits_options_updated_at
BEFORE UPDATE ON public.benefits_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default benefit types
INSERT INTO public.benefit_types (code, name, description, is_mandatory, display_order) VALUES
('IP', 'In-Patient', 'Hospital and inpatient care coverage', true, 1),
('OP', 'Out-Patient', 'Outpatient consultation and treatment', false, 2),
('DE', 'Dental', 'Dental care coverage', false, 3),
('MA', 'Maternity', 'Maternity and childbirth coverage', false, 4);

-- Insert default plan tiers for In-Patient
INSERT INTO public.plan_tiers (benefit_type_id, name, limit_value, display_order)
SELECT id, 'IP 300', 300, 1 FROM public.benefit_types WHERE code = 'IP'
UNION ALL
SELECT id, 'IP 500', 500, 2 FROM public.benefit_types WHERE code = 'IP'
UNION ALL
SELECT id, 'IP 700', 700, 3 FROM public.benefit_types WHERE code = 'IP'
UNION ALL
SELECT id, 'IP 1000', 1000, 4 FROM public.benefit_types WHERE code = 'IP'
UNION ALL
SELECT id, 'IP 1500', 1500, 5 FROM public.benefit_types WHERE code = 'IP'
UNION ALL
SELECT id, 'IP 2000', 2000, 6 FROM public.benefit_types WHERE code = 'IP'
UNION ALL
SELECT id, 'IP 3000', 3000, 7 FROM public.benefit_types WHERE code = 'IP';

-- Insert default plan tiers for Out-Patient
INSERT INTO public.plan_tiers (benefit_type_id, name, limit_value, display_order)
SELECT id, 'OP 150', 150, 1 FROM public.benefit_types WHERE code = 'OP'
UNION ALL
SELECT id, 'OP 200', 200, 2 FROM public.benefit_types WHERE code = 'OP'
UNION ALL
SELECT id, 'OP 250', 250, 3 FROM public.benefit_types WHERE code = 'OP'
UNION ALL
SELECT id, 'OP 300', 300, 4 FROM public.benefit_types WHERE code = 'OP'
UNION ALL
SELECT id, 'OP 400', 400, 5 FROM public.benefit_types WHERE code = 'OP'
UNION ALL
SELECT id, 'OP 550', 550, 6 FROM public.benefit_types WHERE code = 'OP';

-- Insert default plan tiers for Dental
INSERT INTO public.plan_tiers (benefit_type_id, name, limit_value, display_order)
SELECT id, 'DE 1500', 1500, 1 FROM public.benefit_types WHERE code = 'DE'
UNION ALL
SELECT id, 'DE 2000', 2000, 2 FROM public.benefit_types WHERE code = 'DE'
UNION ALL
SELECT id, 'DE 3000', 3000, 3 FROM public.benefit_types WHERE code = 'DE'
UNION ALL
SELECT id, 'DE 4500', 4500, 4 FROM public.benefit_types WHERE code = 'DE'
UNION ALL
SELECT id, 'DE 5500', 5500, 5 FROM public.benefit_types WHERE code = 'DE'
UNION ALL
SELECT id, 'DE 7000', 7000, 6 FROM public.benefit_types WHERE code = 'DE';

-- Insert default plan tiers for Maternity
INSERT INTO public.plan_tiers (benefit_type_id, name, limit_value, display_order)
SELECT id, 'MA 4000', 4000, 1 FROM public.benefit_types WHERE code = 'MA'
UNION ALL
SELECT id, 'MA 5000', 5000, 2 FROM public.benefit_types WHERE code = 'MA'
UNION ALL
SELECT id, 'MA 6000', 6000, 3 FROM public.benefit_types WHERE code = 'MA'
UNION ALL
SELECT id, 'MA 7000', 7000, 4 FROM public.benefit_types WHERE code = 'MA'
UNION ALL
SELECT id, 'MA 8500', 8500, 5 FROM public.benefit_types WHERE code = 'MA'
UNION ALL
SELECT id, 'MA 10000', 10000, 6 FROM public.benefit_types WHERE code = 'MA';

-- Insert default benefits options
INSERT INTO public.benefits_options (code, name, description, display_order) VALUES
('inner_limit_all', 'Inner Limit For All Benefits', 'Apply inner limits to all benefit types', 1),
('inner_limit_ip_ma_as_charge_op_de', 'Inner Limit for In-Patients and Maternity, Outpatient and Dentals As Charge', 'Inner limits for IP and MA, as charged for OP and DE', 2),
('semi_as_charge_ip_inner_limit_ma_as_charge_op_de', 'Semi As Charge for In-Patients, Maternity Inner Limit, Outpatient and Dentals As Charge', 'Semi as charge for IP, inner limit for MA, as charge for OP and DE', 3),
('as_charge_ip_op_de_inner_limit_ma', 'As Charge For In-Patients, Outpatient and Dentals, Maternity Inner Limit', 'As charged for IP, OP, DE with inner limit only for MA', 4);