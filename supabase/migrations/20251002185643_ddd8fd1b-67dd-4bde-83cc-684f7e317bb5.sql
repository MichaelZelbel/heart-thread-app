-- Add birthdate column to partners table
ALTER TABLE public.partners
ADD COLUMN birthdate date;

COMMENT ON COLUMN public.partners.birthdate IS 'Partner birthdate (day and month required, year optional)';
