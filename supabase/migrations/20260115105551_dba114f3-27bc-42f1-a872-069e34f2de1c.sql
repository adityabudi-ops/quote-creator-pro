-- Add insurer_code to master_tier to make tiers insurer-specific
ALTER TABLE public.master_tier 
ADD COLUMN insurer_code text REFERENCES public.master_insurer(insurer_code);

-- Create index for efficient lookups
CREATE INDEX idx_master_tier_insurer_section ON public.master_tier(insurer_code, section_code);

-- Add comment for documentation
COMMENT ON COLUMN public.master_tier.insurer_code IS 'Each insurer defines their own set of tiers per section. NULL means legacy/universal tier.';