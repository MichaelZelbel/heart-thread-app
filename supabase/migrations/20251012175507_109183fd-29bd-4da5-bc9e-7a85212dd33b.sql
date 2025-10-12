-- Add Message Coach fields to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS message_coach_transcript TEXT,
ADD COLUMN IF NOT EXISTS message_coach_notes TEXT,
ADD COLUMN IF NOT EXISTS message_coach_preset_tone TEXT,
ADD COLUMN IF NOT EXISTS message_coach_custom_tone TEXT,
ADD COLUMN IF NOT EXISTS message_coach_use_default_tone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_coach_updated_at TIMESTAMP WITH TIME ZONE;

-- Add check constraints for character limits
ALTER TABLE partners 
ADD CONSTRAINT message_coach_transcript_length CHECK (LENGTH(message_coach_transcript) <= 3000),
ADD CONSTRAINT message_coach_notes_length CHECK (LENGTH(message_coach_notes) <= 800);