
-- Move SECURITY DEFINER helper out of the API-exposed public schema
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_household_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION private.current_household_id() FROM PUBLIC, anon, authenticated;

-- Recreate policies to reference the private function
DROP POLICY IF EXISTS "Profiles: view own household members" ON public.profiles;
CREATE POLICY "Profiles: view own household members" ON public.profiles
  FOR SELECT USING (household_id = private.current_household_id());

DROP POLICY IF EXISTS "Households: view own" ON public.households;
CREATE POLICY "Households: view own" ON public.households
  FOR SELECT USING (id = private.current_household_id());

DROP POLICY IF EXISTS "Households: update own" ON public.households;
CREATE POLICY "Households: update own" ON public.households
  FOR UPDATE USING (id = private.current_household_id())
  WITH CHECK (id = private.current_household_id());

DROP POLICY IF EXISTS "Items: household access" ON public.items;
CREATE POLICY "Items: household access" ON public.items
  FOR ALL USING (household_id = private.current_household_id())
  WITH CHECK (household_id = private.current_household_id());

DROP POLICY IF EXISTS "Activity: household access" ON public.activity;
CREATE POLICY "Activity: household access" ON public.activity
  FOR ALL USING (household_id = private.current_household_id())
  WITH CHECK (household_id = private.current_household_id());

-- Drop the public-schema function now that nothing references it
DROP FUNCTION IF EXISTS public.current_household_id();
