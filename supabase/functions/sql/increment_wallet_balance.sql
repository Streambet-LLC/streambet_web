CREATE OR REPLACE FUNCTION increment(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO new_balance;
  
  RETURN new_balance;
END;
$$;