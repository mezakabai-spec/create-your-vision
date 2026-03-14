import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Trophy, Wallet, ArrowDownToLine, ArrowUpFromLine, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BetRecord {
  id: string;
  bet_amount: number;
  cashout_multiplier: number | null;
  crashed: boolean;
  profit: number;
  created_at: string;
}

const Profile = () => {
  const { user, balance, refreshBalance, loading } = useAuth();
  const navigate = useNavigate();
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchBets = async () => {
      const { data } = await supabase
        .from("bet_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setBets(data);
      setLoadingBets(false);
    };
    fetchBets();
  }, [user]);

  const totalBets = bets.length;
  const wins = bets.filter((b) => !b.crashed && b.cashout_multiplier).length;
  const losses = bets.filter((b) => b.crashed).length;
  const totalWagered = bets.reduce((s, b) => s + Number(b.bet_amount), 0);
  const totalProfit = bets.reduce((s, b) => s + Number(b.profit), 0);
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0";

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (amount < 100) {
      toast.error("Minimum deposit is KES 100");
      return;
    }
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error("Please enter a valid M-Pesa phone number");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("pesapal-create-order", {
        body: { phoneNumber, amount },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || "Deposit failed");
        return;
      }

      if (data.redirect_url) {
        window.open(data.redirect_url, "_blank");
      }

      toast.success("Checkout opened. Complete payment on M-Pesa to finish your deposit.");
      setDepositAmount("");
      setShowDeposit(false);
      setTimeout(() => refreshBalance(), 10000);
      setTimeout(() => refreshBalance(), 20000);
      setTimeout(() => refreshBalance(), 30000);
    } catch {
      toast.error("Failed to initiate deposit");
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (balance <= 0) {
      toast.error("Your balance is KES 0. Deposit funds first.");
      return;
    }
    const amount = Number(withdrawAmount);
    if (amount < 100) {
      toast.error("Minimum withdrawal is KES 100");
      return;
    }
    if (amount > balance) {
      toast.error("Amount exceeds your real balance");
      return;
    }
    setProcessing(true);
    const { error } = await supabase
      .from("balances")
      .update({ amount: balance - amount })
      .eq("user_id", user!.id);
    if (error) {
      toast.error("Withdrawal failed");
    } else {
      toast.success(`KES ${amount.toLocaleString()} withdrawal requested!`);
      await refreshBalance();
      setWithdrawAmount("");
      setShowWithdraw(false);
    }
    setProcessing(false);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80">
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-sm font-bold text-foreground">My Profile</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Real Balance</p>
          <p className="font-mono text-3xl font-bold text-foreground">KES {balance.toLocaleString()}</p>
          {balance === 0 && (
            <p className="text-[10px] text-muted-foreground">Deposit via M-Pesa to start playing</p>
          )}
          {/* Demo balance info removed - logged in users only see real balance */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => { setShowDeposit(!showDeposit); setShowWithdraw(false); }} variant="default" className="gap-2">
              <ArrowDownToLine className="w-4 h-4" /> Deposit
            </Button>
            <Button onClick={() => { setShowWithdraw(!showWithdraw); setShowDeposit(false); }} variant="outline" className="gap-2">
              <ArrowUpFromLine className="w-4 h-4" /> Withdraw
            </Button>
          </div>

          {/* Deposit panel */}
          {showDeposit && (
            <div className="space-y-2 pt-2 border-t border-border">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="M-Pesa phone (07XXXXXXXX)"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount (KES)"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-[10px] text-muted-foreground">You'll be redirected to secure PesaPal checkout to confirm payment</p>
              <Button onClick={handleDeposit} disabled={processing} className="w-full">
                {processing ? "Opening Checkout..." : "Deposit via M-Pesa"}
              </Button>
            </div>
          )}

          {/* Withdraw panel */}
          {showWithdraw && (
            <div className="space-y-2 pt-2 border-t border-border">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (min KES 100)"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button onClick={handleWithdraw} disabled={processing} className="w-full">
                {processing ? "Processing..." : "Confirm Withdrawal"}
              </Button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-gaming-gold" />
              <span className="text-[10px] text-muted-foreground uppercase">Win Rate</span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground">{wins}W / {losses}L</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-gaming-blue" />
              <span className="text-[10px] text-muted-foreground uppercase">Wagered</span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground">KES {totalWagered.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 col-span-2">
            <div className="flex items-center gap-2 mb-1">
              {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 text-gaming-green" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
              <span className="text-[10px] text-muted-foreground uppercase">Net Profit</span>
            </div>
            <p className={`font-mono text-xl font-bold ${totalProfit >= 0 ? "text-gaming-green" : "text-destructive"}`}>
              {totalProfit >= 0 ? "+" : ""}KES {totalProfit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* View All Transactions */}
        <Button
          onClick={() => navigate("/transactions")}
          variant="outline"
          className="w-full gap-2"
        >
          <Clock className="w-4 h-4" /> View Full Transaction History
        </Button>

        {/* Bet History */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Bet History</h3>
          </div>
          {loadingBets ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : bets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No bets yet. Start playing!</div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
              {bets.map((bet) => (
                <div key={bet.id} className={`px-4 py-3 flex items-center justify-between ${bet.crashed ? "bg-destructive/5" : "bg-gaming-green/5"}`}>
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">KES {Number(bet.bet_amount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(bet.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    {bet.crashed ? (
                      <span className="text-destructive font-mono text-sm font-semibold">Crashed</span>
                    ) : (
                      <span className="text-gaming-green font-mono text-sm font-semibold">{Number(bet.cashout_multiplier).toFixed(2)}x</span>
                    )}
                    <p className={`text-[10px] font-mono ${Number(bet.profit) >= 0 ? "text-gaming-green" : "text-destructive"}`}>
                      {Number(bet.profit) >= 0 ? "+" : ""}KES {Number(bet.profit).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
