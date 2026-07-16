-- Add Google Business Profile Place ID to the therapist public page — used
-- to fetch Google reviews server-side via Google Places API (New).
ALTER TABLE "therapist_web_pages"
  ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT;
