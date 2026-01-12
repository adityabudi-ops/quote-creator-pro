-- Add is_admin flag to profiles for users who need admin access alongside their primary role
ALTER TABLE public.profiles 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Update shanthi.tan to be Tenaga Pialang + Admin
UPDATE public.profiles 
SET role = 'tenaga_pialang', is_admin = true 
WHERE email = 'shanthi.tan@premiro.com';

-- Update aditya.budi to be Tenaga Ahli + Admin
UPDATE public.profiles 
SET role = 'tenaga_ahli', is_admin = true 
WHERE email = 'aditya.budi@premiro.com';