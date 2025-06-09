
CREATE OR REPLACE FUNCTION update_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;
