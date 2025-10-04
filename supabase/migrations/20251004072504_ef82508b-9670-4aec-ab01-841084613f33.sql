-- Add position column to partner_likes table
ALTER TABLE public.partner_likes
ADD COLUMN position INTEGER DEFAULT 0;

-- Add position column to partner_dislikes table
ALTER TABLE public.partner_dislikes
ADD COLUMN position INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_partner_likes_position ON public.partner_likes(partner_id, position);
CREATE INDEX idx_partner_dislikes_position ON public.partner_dislikes(partner_id, position);