
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create balances table
CREATE TABLE public.balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance" ON public.balances
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON public.balances
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance" ON public.balances
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create bet_history table
CREATE TABLE public.bet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bet_amount numeric NOT NULL,
  cashout_multiplier numeric,
  crashed boolean DEFAULT false,
  profit numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.bet_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bets" ON public.bet_history
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets" ON public.bet_history
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bets" ON public.bet_history
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create leaderboard_entries table
CREATE TABLE public.leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  best_multiplier numeric NOT NULL DEFAULT 0,
  total_winnings numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard_entries
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own entries" ON public.leaderboard_entries
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON public.leaderboard_entries
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Add username column to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Now create admin_crash_settings
CREATE TABLE public.admin_crash_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  next_crash_point numeric NULL,
  set_by uuid NULL,
  set_at timestamp with time zone DEFAULT now(),
  consumed boolean DEFAULT false
);
ALTER TABLE public.admin_crash_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crash settings" ON public.admin_crash_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
