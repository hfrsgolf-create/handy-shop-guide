
-- Households
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My household',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's household_id without RLS recursion
CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Profiles policies
CREATE POLICY "Profiles: view own household members" ON public.profiles
  FOR SELECT TO authenticated
  USING (household_id = public.current_household_id());
CREATE POLICY "Profiles: update self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Households policies
CREATE POLICY "Households: view own" ON public.households
  FOR SELECT TO authenticated
  USING (id = public.current_household_id());
CREATE POLICY "Households: update own" ON public.households
  FOR UPDATE TO authenticated
  USING (id = public.current_household_id())
  WITH CHECK (id = public.current_household_id());

-- Items
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  preferred_store text NOT NULL DEFAULT 'any',
  is_locked boolean NOT NULL DEFAULT false,
  notes text,
  favorite boolean NOT NULL DEFAULT false,
  checked boolean NOT NULL DEFAULT false,
  deal_store text,
  deal_price numeric,
  deal_expiry timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items: household access" ON public.items
  FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE INDEX items_household_created_idx ON public.items(household_id, created_at DESC);

-- Activity
CREATE TABLE public.activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity TO authenticated;
GRANT ALL ON public.activity TO service_role;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity: household access" ON public.activity
  FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE INDEX activity_household_created_idx ON public.activity(household_id, created_at DESC);

-- New-user trigger: create household + profile from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id uuid;
  user_name text;
  household_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  household_name := COALESCE(NEW.raw_user_meta_data->>'household_name', user_name || '''s household');

  INSERT INTO public.households (name) VALUES (household_name) RETURNING id INTO new_household_id;
  INSERT INTO public.profiles (id, name, household_id) VALUES (NEW.id, user_name, new_household_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
