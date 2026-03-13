import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Rocket, Phone, Eye, EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TermsAndConditions from "@/components/TermsAndConditions";

const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();
  return !!data;
};

type AuthMode = "login" | "signup";

const phoneToEmail = (phone: string) => {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return `${cleaned}@bronzebet.app`;
};

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
}

const AuthSheet = ({ open, onClose }: AuthSheetProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Enter a valid phone number");
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
          });
          await supabase.from("balances").insert({
            user_id: userId,
            amount: 0,
          });
        }
        const isAdmin = userId ? await checkIsAdmin(userId) : false;
        onClose();
        if (isAdmin) navigate("/admin");
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const isAdmin = signInData.user ? await checkIsAdmin(signInData.user.id) : false;
        onClose();
        if (isAdmin) navigate("/admin");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-background border-border p-0">
        <div className="flex flex-col h-full px-6 py-8">
          <SheetHeader className="mb-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-primary">
                <Rocket className="w-6 h-6 text-primary-foreground" />
              </div>
              <SheetTitle className="text-xl font-bold text-foreground">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Sign in to play." : "Sign up to start playing."}
              </p>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
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

            <Button type="submit" disabled={loading} className="w-full py-3 text-sm font-bold uppercase tracking-wider">
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AuthSheet;
