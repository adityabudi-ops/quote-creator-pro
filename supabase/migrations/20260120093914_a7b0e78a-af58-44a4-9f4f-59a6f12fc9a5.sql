-- Add line_of_business column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN line_of_business text;

-- Add comment for documentation
COMMENT ON COLUMN public.quotations.line_of_business IS 'Line of business for the insured company';