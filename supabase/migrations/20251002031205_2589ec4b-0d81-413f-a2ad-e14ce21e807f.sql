-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;

-- Create a restricted policy: Only admins can view full booking details
CREATE POLICY "Only admins can view bookings"
ON public.bookings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a secure function to check time slot availability without exposing PII
CREATE OR REPLACE FUNCTION public.is_time_slot_available(
  check_date DATE,
  check_time_slot TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE date = check_date
      AND time_slot = check_time_slot
      AND status = 'Booked'
  );
$$;

-- Grant execute permission to anonymous users for the availability check
GRANT EXECUTE ON FUNCTION public.is_time_slot_available(DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_time_slot_available(DATE, TEXT) TO authenticated;