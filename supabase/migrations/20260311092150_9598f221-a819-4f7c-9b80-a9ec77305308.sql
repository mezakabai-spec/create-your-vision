
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Admins can view predictions" ON public.game_predictions;
DROP POLICY IF EXISTS "Auth users can insert predictions" ON public.game_predictions;
DROP POLICY IF EXISTS "Auth users can update predictions" ON public.game_predictions;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can view predictions"
  ON public.game_predictions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth users can read predictions"
  ON public.game_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth users can insert predictions"
  ON public.game_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth users can update predictions"
  ON public.game_predictions FOR UPDATE
  TO authenticated
  USING (true);
