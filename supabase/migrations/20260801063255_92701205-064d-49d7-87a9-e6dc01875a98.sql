-- 1. Prevent household hijacking + self-granted premium via a guard trigger
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.household_id IS DISTINCT FROM OLD.household_id THEN
    RAISE EXCEPTION 'household_id cannot be changed';
  END IF;
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    RAISE EXCEPTION 'is_premium cannot be changed by users';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_updates ON public.profiles;
CREATE TRIGGER guard_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_updates();

-- 2. Insert: only into an empty household, never premium
DROP POLICY IF EXISTS "Profiles: insert self" ON public.profiles;
CREATE POLICY "Profiles: insert self"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND is_premium = false
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.household_id = profiles.household_id
  )
);

DROP POLICY IF EXISTS "Profiles: update self" ON public.profiles;
CREATE POLICY "Profiles: update self"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Scope all household policies to authenticated only
DROP POLICY IF EXISTS "Profiles: view own household members" ON public.profiles;
CREATE POLICY "Profiles: view own household members"
ON public.profiles FOR SELECT TO authenticated
USING (household_id = private.current_household_id());

DROP POLICY IF EXISTS "Households: update own" ON public.households;
CREATE POLICY "Households: update own"
ON public.households FOR UPDATE TO authenticated
USING (id = private.current_household_id())
WITH CHECK (id = private.current_household_id());

DROP POLICY IF EXISTS "Households: view own" ON public.households;
CREATE POLICY "Households: view own"
ON public.households FOR SELECT TO authenticated
USING (id = private.current_household_id());

DROP POLICY IF EXISTS "Activity: household access" ON public.activity;
CREATE POLICY "Activity: household access"
ON public.activity FOR ALL TO authenticated
USING (household_id = private.current_household_id())
WITH CHECK (household_id = private.current_household_id());

DROP POLICY IF EXISTS "Items: household access" ON public.items;
CREATE POLICY "Items: household access"
ON public.items FOR ALL TO authenticated
USING (household_id = private.current_household_id())
WITH CHECK (household_id = private.current_household_id());

DROP POLICY IF EXISTS "Shops: household access" ON public.shops;
CREATE POLICY "Shops: household access"
ON public.shops FOR ALL TO authenticated
USING (household_id = private.current_household_id())
WITH CHECK (household_id = private.current_household_id());

-- 4. Remove anonymous privileges on household tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.households FROM anon;
REVOKE ALL ON public.items FROM anon;
REVOKE ALL ON public.activity FROM anon;
REVOKE ALL ON public.shops FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.households TO service_role;
GRANT ALL ON public.items TO service_role;
GRANT ALL ON public.activity TO service_role;
GRANT ALL ON public.shops TO service_role;