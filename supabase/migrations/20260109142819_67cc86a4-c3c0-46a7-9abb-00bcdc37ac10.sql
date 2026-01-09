-- Create enum for approval roles
CREATE TYPE public.approval_role AS ENUM ('tenaga_pialang', 'tenaga_ahli');

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('sales', 'tenaga_pialang', 'tenaga_ahli', 'admin');

-- Create enum for quotation status
CREATE TYPE public.quotation_status AS ENUM ('draft', 'pending_pialang', 'pending_ahli', 'approved', 'rejected', 'locked');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'sales',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance_companies table
CREATE TABLE public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  insured_name TEXT NOT NULL,
  insured_address TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  benefits_option TEXT NOT NULL,
  insurance_companies TEXT[] NOT NULL,
  benefits JSONB NOT NULL,
  insured_groups JSONB NOT NULL,
  status quotation_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

-- Create approval_history table for multi-layer approvals
CREATE TABLE public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  approval_role approval_role NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL, -- 'approved' or 'rejected'
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- Create function to check user role (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_user_role(_user_id UUID, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_user_role(auth.uid(), 'admin') OR NOT EXISTS (SELECT 1 FROM public.profiles));

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_user_role(auth.uid(), 'admin'));

-- Insurance companies policies (anyone can view, admin can manage)
CREATE POLICY "Anyone can view active insurance companies" ON public.insurance_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert insurance companies" ON public.insurance_companies
  FOR INSERT TO authenticated WITH CHECK (public.has_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update insurance companies" ON public.insurance_companies
  FOR UPDATE TO authenticated USING (public.has_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete insurance companies" ON public.insurance_companies
  FOR DELETE TO authenticated USING (public.has_user_role(auth.uid(), 'admin'));

-- Quotations policies
CREATE POLICY "Users can view quotations" ON public.quotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create quotations" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own quotations" ON public.quotations
  FOR UPDATE TO authenticated USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_user_role(auth.uid(), 'tenaga_pialang')
    OR public.has_user_role(auth.uid(), 'tenaga_ahli')
    OR public.has_user_role(auth.uid(), 'admin')
  );

-- Approval history policies
CREATE POLICY "Users can view approval history" ON public.approval_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Approvers can insert approval history" ON public.approval_history
  FOR INSERT TO authenticated WITH CHECK (
    public.has_user_role(auth.uid(), 'tenaga_pialang')
    OR public.has_user_role(auth.uid(), 'tenaga_ahli')
    OR public.has_user_role(auth.uid(), 'admin')
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_companies_updated_at
  BEFORE UPDATE ON public.insurance_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default insurance companies
INSERT INTO public.insurance_companies (code, name) VALUES
  ('aca', 'PT Asuransi Central Asia (ACA)'),
  ('asm', 'PT Asuransi Sinarmas (ASM)'),
  ('sompo', 'PT Sompo Insurance Indonesia');

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();