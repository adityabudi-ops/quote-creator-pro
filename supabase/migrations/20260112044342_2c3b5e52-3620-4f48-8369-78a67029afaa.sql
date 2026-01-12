-- Create junction table linking plan tiers to applicable benefits options
CREATE TABLE public.plan_tier_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_tier_id UUID NOT NULL REFERENCES public.plan_tiers(id) ON DELETE CASCADE,
  benefits_option_id UUID NOT NULL REFERENCES public.benefits_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_tier_id, benefits_option_id)
);

-- Enable RLS
ALTER TABLE public.plan_tier_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view plan tier options" 
ON public.plan_tier_options 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert plan tier options" 
ON public.plan_tier_options 
FOR INSERT 
WITH CHECK (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update plan tier options" 
ON public.plan_tier_options 
FOR UPDATE 
USING (has_user_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete plan tier options" 
ON public.plan_tier_options 
FOR DELETE 
USING (has_user_role(auth.uid(), 'admin'::user_role));