-- Add 'Completed' as a valid status option
-- First, let's ensure the status column can hold 'Completed' value
-- Since it's a text column, we just need to document this change

-- Add a comment to document the valid status values
COMMENT ON COLUMN public.bookings.status IS 'Valid values: Booked, Canceled, Deleted, Completed';