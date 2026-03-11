
DROP POLICY IF EXISTS "Service can manage deposits" ON public.pending_deposits;

-- Only the service role (edge functions) will insert/update via service_role key,
-- so we don't need permissive policies for authenticated users.
-- Users can only read their own deposits.
