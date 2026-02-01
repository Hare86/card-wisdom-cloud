-- Create function to increment cache hit count
CREATE OR REPLACE FUNCTION public.increment_cache_hit(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE query_cache 
  SET hit_count = COALESCE(hit_count, 0) + 1
  WHERE id = cache_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.increment_cache_hit(uuid) TO service_role;