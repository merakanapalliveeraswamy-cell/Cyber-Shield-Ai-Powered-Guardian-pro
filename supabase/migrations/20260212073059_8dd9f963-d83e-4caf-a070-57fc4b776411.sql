
-- Profile type enum
CREATE TYPE public.profile_type AS ENUM ('parent', 'child', 'elderly');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  profile_type public.profile_type NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Scan history table
CREATE TABLE public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  input_text TEXT,
  input_url TEXT,
  verdict TEXT NOT NULL DEFAULT 'safe',
  risk_level TEXT NOT NULL DEFAULT 'low',
  category TEXT,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Family members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_name TEXT NOT NULL,
  member_type public.profile_type NOT NULL,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own family" ON public.family_members FOR SELECT USING (auth.uid() = parent_user_id);
CREATE POLICY "Parents can add family" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = parent_user_id);
CREATE POLICY "Parents can update family" ON public.family_members FOR UPDATE USING (auth.uid() = parent_user_id);
CREATE POLICY "Parents can delete family" ON public.family_members FOR DELETE USING (auth.uid() = parent_user_id);

-- Alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Wellbeing checkins table
CREATE TABLE public.wellbeing_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  screen_time_hours NUMERIC,
  mood TEXT,
  ai_tips TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wellbeing_checkins ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is parent of target
CREATE OR REPLACE FUNCTION public.is_parent_of(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE parent_user_id = auth.uid()
      AND linked_user_id = target_user_id
  )
$$;

-- Scan history RLS: own + parent access
CREATE POLICY "Users can view own scans" ON public.scan_history FOR SELECT USING (auth.uid() = user_id OR public.is_parent_of(user_id));
CREATE POLICY "Users can insert own scans" ON public.scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Alerts RLS: own + parent access
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id OR public.is_parent_of(user_id));
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id OR public.is_parent_of(user_id));
CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wellbeing RLS: own + parent access
CREATE POLICY "Users can view own checkins" ON public.wellbeing_checkins FOR SELECT USING (auth.uid() = user_id OR public.is_parent_of(user_id));
CREATE POLICY "Users can insert own checkins" ON public.wellbeing_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
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
