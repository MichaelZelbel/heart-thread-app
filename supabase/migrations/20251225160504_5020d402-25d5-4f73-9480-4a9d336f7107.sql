-- Update the transcript length constraint from 3000 to 5000 characters
ALTER TABLE public.partners DROP CONSTRAINT message_coach_transcript_length;
ALTER TABLE public.partners ADD CONSTRAINT message_coach_transcript_length CHECK (length(message_coach_transcript) <= 5000);