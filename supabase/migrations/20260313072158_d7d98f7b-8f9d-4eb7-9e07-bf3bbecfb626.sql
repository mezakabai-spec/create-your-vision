
-- Allow anon and authenticated to insert/update/select game_predictions
DROP POLICY IF EXISTS "Auth users can insert predictions" ON public.game_predictions;
DROP POLICY IF EXISTS "Auth users can read predictions" ON public.game_predictions;
DROP POLICY IF EXISTS "Auth users can update predictions" ON public.game_predictions;

CREATE POLICY "Anyone can insert predictions" ON public.game_predictions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read predictions" ON public.game_predictions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update predictions" ON public.game_predictions FOR UPDATE TO anon, authenticated USING (true);
