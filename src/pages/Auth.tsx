import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Phone, Eye, EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TermsAndConditions from "@/components/TermsAndConditions";

const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
};

type AuthMode = "login" | "signup";

const phoneToEmail = (phone: string) => {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return `${cleaned}@bronzebet.app`;
};

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (mode === "signup" && !termsAccepted) {
      toast.error("You must accept the Terms & Conditions to create an account");
      return;
    }
    setLoading(true);
    const email = phoneToEmail(phone);
    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: username,
              phone_number: phone,
              referral_code: referralCode || undefined,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Signing you in...");
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        const userId = signUpData.user?.id;
        if (userId) {
          await supabase.from("profiles").insert({
            user_id: userId,
            username,
            display_name: username,
            phone_number: phone,
            terms_accepted: true,
          } as any);
          await supabase.from("balances").insert({
            user_id: userId,
            amount: 0,
          });
        }
        const isAdmin = userId ? await checkIsAdmin(userId) : false;
        navigate(isAdmin ? "/admin" : "/");
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const isAdmin = signInData.user ? await checkIsAdmin(signInData.user.id) : false;
        navigate(isAdmin ? "/admin" : "/");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Rocket className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">bronzebet</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Welcome back! Sign in to play." : "Create your account to start playing."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Choose a username"
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Referral Code
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code (optional)"
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+254700000000"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 pr-10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <TermsAndConditions accepted={termsAccepted} onAcceptChange={setTermsAccepted} />
          )}

          <Button
            type="submit"
            disabled={loading || (mode === "signup" && !termsAccepted)}
            className="w-full py-3 text-sm font-bold uppercase tracking-wider"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-primary font-semibold hover:underline"
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
