
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    date_of_birth,
    tos_accepted,
    wallet_balance,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    (new.raw_user_meta_data->>'date_of_birth')::date,
    (new.raw_user_meta_data->>'tos_accepted')::boolean,
    1000, -- Initial 1000 coins for new users
    now(),
    now()
  );
  RETURN new;
END;
$function$
