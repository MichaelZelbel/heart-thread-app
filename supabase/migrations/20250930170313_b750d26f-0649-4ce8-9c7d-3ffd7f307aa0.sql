-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create partners table
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  social_media JSONB DEFAULT '{}',
  love_language_physical INT DEFAULT 20 CHECK (love_language_physical >= 0 AND love_language_physical <= 100),
  love_language_words INT DEFAULT 20 CHECK (love_language_words >= 0 AND love_language_words <= 100),
  love_language_quality INT DEFAULT 20 CHECK (love_language_quality >= 0 AND love_language_quality <= 100),
  love_language_acts INT DEFAULT 20 CHECK (love_language_acts >= 0 AND love_language_acts <= 100),
  love_language_gifts INT DEFAULT 20 CHECK (love_language_gifts >= 0 AND love_language_gifts <= 100),
  chat_history TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partners policies
CREATE POLICY "Users can view their own partners"
  ON public.partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partners"
  ON public.partners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partners"
  ON public.partners FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partners"
  ON public.partners FOR DELETE
  USING (auth.uid() = user_id);

-- Create partner_nicknames table
CREATE TABLE public.partner_nicknames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on partner_nicknames
ALTER TABLE public.partner_nicknames ENABLE ROW LEVEL SECURITY;

-- Partner nicknames policies
CREATE POLICY "Users can view nicknames for their partners"
  ON public.partner_nicknames FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_nicknames.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can create nicknames for their partners"
  ON public.partner_nicknames FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_nicknames.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can update nicknames for their partners"
  ON public.partner_nicknames FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_nicknames.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete nicknames for their partners"
  ON public.partner_nicknames FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_nicknames.partner_id
    AND partners.user_id = auth.uid()
  ));

-- Create partner_likes table
CREATE TABLE public.partner_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners ON DELETE CASCADE,
  item TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on partner_likes
ALTER TABLE public.partner_likes ENABLE ROW LEVEL SECURITY;

-- Partner likes policies
CREATE POLICY "Users can view likes for their partners"
  ON public.partner_likes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_likes.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can create likes for their partners"
  ON public.partner_likes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_likes.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can update likes for their partners"
  ON public.partner_likes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_likes.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete likes for their partners"
  ON public.partner_likes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_likes.partner_id
    AND partners.user_id = auth.uid()
  ));

-- Create partner_dislikes table
CREATE TABLE public.partner_dislikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners ON DELETE CASCADE,
  item TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on partner_dislikes
ALTER TABLE public.partner_dislikes ENABLE ROW LEVEL SECURITY;

-- Partner dislikes policies (same as likes)
CREATE POLICY "Users can view dislikes for their partners"
  ON public.partner_dislikes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_dislikes.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can create dislikes for their partners"
  ON public.partner_dislikes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_dislikes.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can update dislikes for their partners"
  ON public.partner_dislikes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_dislikes.partner_id
    AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete dislikes for their partners"
  ON public.partner_dislikes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_dislikes.partner_id
    AND partners.user_id = auth.uid()
  ));

-- Create events table for calendar
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- Create moments table for memories
CREATE TABLE public.moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  partner_ids UUID[] DEFAULT '{}',
  title TEXT NOT NULL,
  description TEXT,
  moment_date DATE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on moments
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

-- Moments policies
CREATE POLICY "Users can view their own moments"
  ON public.moments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own moments"
  ON public.moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moments"
  ON public.moments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moments"
  ON public.moments FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moments_updated_at
  BEFORE UPDATE ON public.moments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();