-- Create table for partner profile details
CREATE TABLE public.partner_profile_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.partner_profile_details ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view profile details for their partners"
ON public.partner_profile_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = partner_profile_details.partner_id
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create profile details for their partners"
ON public.partner_profile_details
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = partner_profile_details.partner_id
    AND partners.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

CREATE POLICY "Users can update profile details for their partners"
ON public.partner_profile_details
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = partner_profile_details.partner_id
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete profile details for their partners"
ON public.partner_profile_details
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = partner_profile_details.partner_id
    AND partners.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_partner_profile_details_updated_at
BEFORE UPDATE ON public.partner_profile_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();