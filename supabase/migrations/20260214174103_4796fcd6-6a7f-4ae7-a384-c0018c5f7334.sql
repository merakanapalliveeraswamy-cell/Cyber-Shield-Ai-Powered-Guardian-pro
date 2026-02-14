-- Add 'individual' to the profile_type enum
ALTER TYPE public.profile_type ADD VALUE IF NOT EXISTS 'individual';
