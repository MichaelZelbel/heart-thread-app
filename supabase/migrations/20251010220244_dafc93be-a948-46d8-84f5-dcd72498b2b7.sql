-- Add position column to partners table for sortable order
ALTER TABLE public.partners 
ADD COLUMN display_order integer DEFAULT 0 NOT NULL;

-- Create index for better query performance
CREATE INDEX idx_partners_display_order ON public.partners(user_id, display_order);

-- Set initial display_order values based on created_at
UPDATE public.partners
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS row_num
  FROM public.partners
) AS subquery
WHERE partners.id = subquery.id;