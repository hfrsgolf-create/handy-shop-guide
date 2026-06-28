
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.profiles;
  new_household_id uuid;
  user_row auth.users;
  user_name text;
  household_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO existing FROM public.profiles WHERE id = auth.uid();
  IF FOUND THEN
    RETURN existing;
  END IF;

  SELECT * INTO user_row FROM auth.users WHERE id = auth.uid();
  user_name := COALESCE(user_row.raw_user_meta_data->>'name', split_part(user_row.email, '@', 1), 'You');
  household_name := COALESCE(user_row.raw_user_meta_data->>'household_name', user_name || '''s household');

  INSERT INTO public.households (name) VALUES (household_name) RETURNING id INTO new_household_id;
  INSERT INTO public.profiles (id, name, household_id)
  VALUES (auth.uid(), user_name, new_household_id)
  RETURNING * INTO existing;

  RETURN existing;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
