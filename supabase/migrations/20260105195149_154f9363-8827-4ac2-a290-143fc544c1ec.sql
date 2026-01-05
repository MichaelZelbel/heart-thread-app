-- Create table for cherished connections
CREATE TABLE public.partner_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  connected_partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a pair can only be connected once (in one direction)
  CONSTRAINT unique_connection UNIQUE (partner_id, connected_partner_id),
  -- Prevent self-connections
  CONSTRAINT no_self_connection CHECK (partner_id != connected_partner_id)
);

-- Enable Row Level Security
ALTER TABLE public.partner_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own connections" 
ON public.partner_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
ON public.partner_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.partner_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.partner_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_partner_connections_updated_at
BEFORE UPDATE ON public.partner_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();