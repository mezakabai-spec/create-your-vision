import { useState, useEffect } from "react";
import { Rocket, Shield, Volume2, VolumeX, LogIn, LogOut, User, Wallet, ShieldCheck } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import WalletModal from "@/components/WalletModal";
import AuthSheet from "@/components/AuthSheet";
import { supabase } from "@/integrations/supabase/client";

const GameHeader = () => {
  const { muted, toggleMute } = useSound();
  const { user, balance, signOut } = useAuth();
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdminUser(false); return; }
    const check = async () => {
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      setIsAdminUser(!!data);
    };
    check();
  }, [user]);

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center glow-primary">
            <Rocket className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground tracking-tight">bronzebet</span>
            <span className="text-[10px] text-muted-foreground leading-none">Provably Fair</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border">
            <Shield className="w-3.5 h-3.5 text-gaming-green" />
            <span className="text-xs text-secondary-foreground font-medium">Provably Fair</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-foreground" />}
          </button>

          {user ? (
            <>
              <button
                onClick={() => setWalletOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-muted-foreground leading-none">Balance</span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    KES {balance.toLocaleString()}
                  </span>
                </div>
              </button>

              {isAdminUser && (
                <button
                  onClick={() => navigate("/admin")}
                  className="w-8 h-8 rounded-full bg-gaming-gold/20 border border-gaming-gold/30 flex items-center justify-center hover:bg-gaming-gold/30 transition-colors"
                  title="Admin Panel"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gaming-gold" />
                </button>
              )}
              <button
                onClick={() => navigate("/profile")}
                className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors"
                title="Profile"
              >
                <User className="w-3.5 h-3.5 text-primary" />
              </button>
              <button
                onClick={signOut}
                className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>
      </header>

      {user && <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />}
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default GameHeader;
