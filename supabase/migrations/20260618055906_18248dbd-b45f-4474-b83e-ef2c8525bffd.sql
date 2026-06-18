ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS journey TEXT NOT NULL DEFAULT 'new_build'
CHECK (journey IN ('new_build', 'renovation', 'single_purchase', 'committee'));