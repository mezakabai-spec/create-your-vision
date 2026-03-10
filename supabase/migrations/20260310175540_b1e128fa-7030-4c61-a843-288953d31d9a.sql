
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Update handle_new_user to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
    RETURN NEW;
END;
$function$;

-- Create game_predictions table for leader to broadcast upcoming crash points
CREATE TABLE IF NOT EXISTS public.game_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_crash_point numeric,
  upcoming_crash_points numeric[] DEFAULT '{}',
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.game_predictions ENABLE ROW LEVEL SECURITY;

-- Admins can read predictions
CREATE POLICY "Admins can view predictions" ON public.game_predictions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can upsert predictions (leader writes)
CREATE POLICY "Authenticated can upsert predictions" ON public.game_predictions
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
