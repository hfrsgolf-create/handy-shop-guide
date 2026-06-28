
DROP FUNCTION IF EXISTS public.ensure_profile();

CREATE POLICY "Households: insert any (claimed via profile)"
ON public.households FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Profiles: insert self"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
