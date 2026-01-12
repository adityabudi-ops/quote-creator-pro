-- Create table for coverage items (e.g., "Biaya Kamar dan Menginap", "Biaya Dokter Umum", etc.)
CREATE TABLE public.coverage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier_id UUID NOT NULL REFERENCES public.plan_tiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for coverage values (linking coverage item + benefits option to a value)
CREATE TABLE public.coverage_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_item_id UUID NOT NULL REFERENCES public.coverage_items(id) ON DELETE CASCADE,
  benefits_option_id UUID NOT NULL REFERENCES public.benefits_options(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  value_type TEXT NOT NULL DEFAULT 'amount', -- 'amount', 'percentage', 'as_charged', 'not_covered'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coverage_item_id, benefits_option_id)
);

-- Enable RLS
ALTER TABLE public.coverage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coverage_items
CREATE POLICY "Anyone can view coverage items"
ON public.coverage_items FOR SELECT
USING (true);

CREATE POLICY "Admins can insert coverage items"
ON public.coverage_items FOR INSERT
WITH CHECK (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update coverage items"
ON public.coverage_items FOR UPDATE
USING (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete coverage items"
ON public.coverage_items FOR DELETE
USING (has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for coverage_values
CREATE POLICY "Anyone can view coverage values"
ON public.coverage_values FOR SELECT
USING (true);

CREATE POLICY "Admins can insert coverage values"
ON public.coverage_values FOR INSERT
WITH CHECK (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update coverage values"
ON public.coverage_values FOR UPDATE
USING (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete coverage values"
ON public.coverage_values FOR DELETE
USING (has_user_role(auth.uid(), 'admin'::user_role));

-- Create updated_at triggers
CREATE TRIGGER update_coverage_items_updated_at
BEFORE UPDATE ON public.coverage_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coverage_values_updated_at
BEFORE UPDATE ON public.coverage_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();