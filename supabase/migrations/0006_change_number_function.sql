-- migration: 0006_change_number_function.sql

CREATE OR REPLACE FUNCTION public.get_next_change_number()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  year_suffix TEXT;
BEGIN
  UPDATE public.change_number_counters
  SET current_value = current_value + 1, updated_at = now()
  WHERE id = 'global'
  RETURNING current_value INTO next_val;

  year_suffix := TO_CHAR(NOW(), 'YY');

  RETURN 'FNR/CR/' || LPAD(next_val::TEXT, 3, '0') || '/' || year_suffix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_next_change_number() TO authenticated;
