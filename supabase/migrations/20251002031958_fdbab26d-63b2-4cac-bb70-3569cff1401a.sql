-- Drop the old check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Create a new check constraint that includes 'Completed'
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['Booked'::text, 'Completed'::text, 'Canceled'::text, 'Deleted'::text]));