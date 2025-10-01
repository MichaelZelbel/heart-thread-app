-- First, update existing percentage values to 0-5 scale
-- Map 0-20% -> 1, 21-40% -> 2, 41-60% -> 3, 61-80% -> 4, 81-100% -> 5
UPDATE partners 
SET 
  love_language_physical = CASE 
    WHEN love_language_physical <= 20 THEN 1
    WHEN love_language_physical <= 40 THEN 2
    WHEN love_language_physical <= 60 THEN 3
    WHEN love_language_physical <= 80 THEN 4
    ELSE 5
  END,
  love_language_words = CASE 
    WHEN love_language_words <= 20 THEN 1
    WHEN love_language_words <= 40 THEN 2
    WHEN love_language_words <= 60 THEN 3
    WHEN love_language_words <= 80 THEN 4
    ELSE 5
  END,
  love_language_quality = CASE 
    WHEN love_language_quality <= 20 THEN 1
    WHEN love_language_quality <= 40 THEN 2
    WHEN love_language_quality <= 60 THEN 3
    WHEN love_language_quality <= 80 THEN 4
    ELSE 5
  END,
  love_language_acts = CASE 
    WHEN love_language_acts <= 20 THEN 1
    WHEN love_language_acts <= 40 THEN 2
    WHEN love_language_acts <= 60 THEN 3
    WHEN love_language_acts <= 80 THEN 4
    ELSE 5
  END,
  love_language_gifts = CASE 
    WHEN love_language_gifts <= 20 THEN 1
    WHEN love_language_gifts <= 40 THEN 2
    WHEN love_language_gifts <= 60 THEN 3
    WHEN love_language_gifts <= 80 THEN 4
    ELSE 5
  END;

-- Now add check constraints to ensure values are between 0 and 5
ALTER TABLE partners 
  ADD CONSTRAINT love_language_physical_range CHECK (love_language_physical >= 0 AND love_language_physical <= 5),
  ADD CONSTRAINT love_language_words_range CHECK (love_language_words >= 0 AND love_language_words <= 5),
  ADD CONSTRAINT love_language_quality_range CHECK (love_language_quality >= 0 AND love_language_quality <= 5),
  ADD CONSTRAINT love_language_acts_range CHECK (love_language_acts >= 0 AND love_language_acts <= 5),
  ADD CONSTRAINT love_language_gifts_range CHECK (love_language_gifts >= 0 AND love_language_gifts <= 5);

-- Update defaults to 3 (middle value) for new partners
ALTER TABLE partners 
  ALTER COLUMN love_language_physical SET DEFAULT 3,
  ALTER COLUMN love_language_words SET DEFAULT 3,
  ALTER COLUMN love_language_quality SET DEFAULT 3,
  ALTER COLUMN love_language_acts SET DEFAULT 3,
  ALTER COLUMN love_language_gifts SET DEFAULT 3;