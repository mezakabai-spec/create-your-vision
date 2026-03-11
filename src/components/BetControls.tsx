import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogIn, X } from "lucide-react";

type GameState = "waiting" | "running" | "crashed";

interface BetControlsProps {
  gameState: GameState;
  onPlaceBet: (amount: number, autoCashout: number | null) => void;
  onCashout: () => void;
  hasBet: boolean;
}

const QUICK_STAKES = [50, 100, 200, 500];

type BetPhase = "idle" | "pending" | "queued";

const BetControls = ({ gameState, onPlaceBet, onCashout, hasBet }: BetControlsProps) => {
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState<string>("2.00");
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [betPhase, setBetPhase] = useState<BetPhase>("idle");
  const pendingBetRef = useRef<{ amount: number; cashout: number | null } | null>(null);
  const { user, balance } = useAuth();
  const navigate = useNavigate();

  const handleBet = () => {
    if (!user) { navigate("/auth"); return; }
    const cashout = autoCashoutEnabled ? parseFloat(autoCashout) : null;
    pendingBetRef.current = { amount: betAmount, cashout };

    if (gameState === "waiting") {
      onPlaceBet(betAmount, cashout);
      setBetPhase("pending");
    } else if (gameState === "running") {
      setBetPhase("queued");
    }
  };

  const handleCancel = () => {
    pendingBetRef.current = null;
    setBetPhase("idle");
  };

  useEffect(() => {
    if (gameState === "waiting" && betPhase === "queued" && pendingBetRef.current) {
      onPlaceBet(pendingBetRef.current.amount, pendingBetRef.current.cashout);
      pendingBetRef.current = null;
      setBetPhase("pending");
    }
    // Reset pending to idle when game starts running (bet is locked in)
    if (gameState === "running" && betPhase === "pending") {
      setBetPhase("idle");
    }
  }, [gameState, betPhase, onPlaceBet]);

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Place Bet</h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground">Bet Amount (KES)</label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          disabled={betPhase !== "idle"}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground font-mono text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />

        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_STAKES.map((stake) => (
            <button
              key={stake}
              onClick={() => setBetAmount(stake)}
              disabled={betPhase !== "idle"}
              className={`py-1 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                betAmount === stake
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground border border-border hover:bg-secondary/80"
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setBetAmount(Math.max(50, Math.floor(betAmount / 2)))}
            disabled={betPhase !== "idle"}
            className="py-1 rounded-md text-[11px] font-semibold bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors disabled:opacity-50"
          >
            ½
          </button>
          <button
            onClick={() => setBetAmount(betAmount * 2)}
            disabled={betPhase !== "idle"}
            className="py-1 rounded-md text-[11px] font-semibold bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors disabled:opacity-50"
          >
            2×
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground">Auto Cash Out</label>
          <button
            onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
            disabled={betPhase !== "idle"}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              autoCashoutEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-foreground transition-transform ${
                autoCashoutEnabled ? "left-[16px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {autoCashoutEnabled && (
          <div className="relative">
            <input
              type="text"
              value={autoCashout}
              onChange={(e) => setAutoCashout(e.target.value)}
              disabled={betPhase !== "idle"}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground font-mono font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">x</span>
          </div>
        )}
      </div>

      {!user ? (
        <div className="text-center space-y-2">
          <p className="text-[10px] text-muted-foreground">Sign in to place bets</p>
          <Button onClick={() => navigate("/auth")} className="w-full py-3 text-xs font-bold uppercase tracking-wider gap-2" size="sm">
            <LogIn className="w-3.5 h-3.5" /> Sign In to Play
          </Button>
        </div>
      ) : gameState === "running" && hasBet ? (
        <button
          onClick={onCashout}
          className="w-full py-3 rounded-xl font-bold text-base uppercase tracking-wider bg-gaming-green text-primary-foreground glow-green transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Cash Out
        </button>
      ) : betPhase === "pending" ? (
        <button
          onClick={handleCancel}
          className="w-full py-3 rounded-xl font-bold text-base uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/30 transition-all hover:bg-destructive/30 active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" /> Cancel Bet
        </button>
      ) : betPhase === "queued" ? (
        <div className="space-y-1.5">
          <div className="bg-gaming-green/10 border border-gaming-green/30 rounded-xl p-3 text-center space-y-0.5">
            <p className="text-[10px] text-gaming-green uppercase tracking-wider font-semibold animate-pulse">Bet Queued</p>
            <p className="text-sm text-foreground font-mono font-bold">KES {betAmount.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Next round</p>
          </div>
          <button
            onClick={handleCancel}
            className="w-full py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/30 transition-all hover:bg-destructive/30 active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={handleBet}
          disabled={betAmount > balance || gameState === "crashed"}
          className="w-full py-3 rounded-xl font-bold text-base uppercase tracking-wider bg-primary text-primary-foreground glow-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {betAmount > balance
            ? "Insufficient Balance"
            : gameState === "running"
            ? "Bet Next Round"
            : gameState === "crashed"
            ? "Round Ending..."
            : "Place Bet"}
        </button>
      )}

      {user && (
        <div className="flex items-center justify-between pt-1.5 border-t border-border">
          <span className="text-[10px] text-muted-foreground">Balance</span>
          <span className="font-mono text-xs font-semibold text-foreground">KES {balance.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default BetControls;
