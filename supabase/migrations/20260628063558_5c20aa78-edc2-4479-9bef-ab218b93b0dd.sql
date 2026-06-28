
DROP POLICY "Households: insert any (claimed via profile)" ON public.households;

CREATE POLICY "Households: insert during onboarding"
ON public.households FOR INSERT TO authenticated
WITH CHECK (NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));
