
-- Function to decrement the total bets amount for a stream
CREATE OR REPLACE FUNCTION public.decrement_stream_total_bets(
  p_stream_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  new_total NUMERIC;
BEGIN
  -- First calculate the sum of all current bets to ensure accuracy
  SELECT COALESCE(SUM(amount), 0) INTO new_total
  FROM stream_bets
  WHERE stream_id = p_stream_id;
  
  -- Update with the correct total rather than just decrementing
  UPDATE streams
  SET total_bets = new_total
  WHERE id = p_stream_id;
  
  -- Log the update
  RAISE NOTICE 'Updated stream % total_bets to %', p_stream_id, new_total;
END;
$$;
