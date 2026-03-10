
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can upsert predictions" ON public.game_predictions;

-- Only allow authenticated users to insert/update (game leader writes)
CREATE POLICY "Auth users can insert predictions" ON public.game_predictions
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Auth users can update predictions" ON public.game_predictions
FOR UPDATE TO authenticated
USING (true);
