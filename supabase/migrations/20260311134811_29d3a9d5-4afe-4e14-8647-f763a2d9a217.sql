
CREATE TABLE public.pending_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_tracking_id text NOT NULL UNIQUE,
  merchant_reference text NOT NULL,
  amount numeric NOT NULL,
  phone_number text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.pending_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposits"
  ON public.pending_deposits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage deposits"
  ON public.pending_deposits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
