import { useState } from "react";
import { X, ArrowDownToLine, ArrowUpFromLine, Phone, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "deposit" | "withdraw";
type Status = "idle" | "loading" | "success";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 5000];

const WalletModal = ({ open, onClose }: WalletModalProps) => {
  const { balance, session } = useAuth();
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 10) {
      toast.error("Minimum amount is KES 10");
      return;
    }
    if (!phone || phone.length < 10) {
      toast.error("Enter a valid M-Pesa phone number");
      return;
    }
    if (tab === "withdraw") {
      if (balance <= 0) {
        toast.error("Your balance is KES 0. Deposit funds first.");
        return;
      }
      if (numAmount > balance) {
        toast.error("Amount exceeds your real balance");
        return;
      }
    }

    setStatus("loading");

    if (tab === "deposit") {
      try {
        const { data, error } = await supabase.functions.invoke("pesapal-create-order", {
          body: { amount: numAmount, phoneNumber: phone },
        });

        if (error || !data?.success) {
          toast.error(data?.error || "Failed to initiate deposit. Try again.");
          setStatus("idle");
          return;
        }

        // Open PesaPal payment page in new tab
        if (data.redirect_url) {
          window.open(data.redirect_url, "_blank");
          toast.success("Payment page opened. Complete payment on M-Pesa to deposit.");
          setStatus("success");
          setTimeout(() => {
            setStatus("idle");
            setAmount("");
            setPhone("");
            onClose();
          }, 2000);
        }
      } catch (err) {
        console.error("Deposit error:", err);
        toast.error("Something went wrong. Please try again.");
        setStatus("idle");
      }
    } else {
      // Withdraw flow (still simulated for now)
      await new Promise((r) => setTimeout(r, 2500));
      setStatus("success");
      toast.success(`KES ${numAmount.toLocaleString()} withdrawal requested!`);
      setTimeout(() => {
        setStatus("idle");
        setAmount("");
        setPhone("");
        onClose();
      }, 1500);
    }
  };

  const canWithdraw = balance > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Wallet</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance display */}
        <div className="px-5 py-4 border-b border-border bg-secondary/50 space-y-2">
          {/* Real balance */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Real Balance</p>
            <p className="text-2xl font-mono font-bold text-foreground">KES {balance.toLocaleString()}</p>
            {balance === 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Deposit to start playing</p>
            )}
          </div>
          
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("deposit")}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === "deposit"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setTab("withdraw")}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === "withdraw"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw
          </button>
        </div>

        {tab === "withdraw" && !canWithdraw ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Withdrawal Not Available</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[250px]">
              Your real balance is KES 0. Deposit and play to build a withdrawable balance.
            </p>
            <Button
              onClick={() => setTab("deposit")}
              className="w-full py-3 text-sm font-bold uppercase tracking-wider mt-2"
            >
              Deposit Now
            </Button>
          </div>
        ) : status === "success" ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-gaming-green animate-scale-in" />
            <p className="text-sm font-semibold text-foreground">
              {tab === "deposit" ? "Deposit Successful!" : "Withdrawal Requested!"}
            </p>
            <p className="text-xs text-muted-foreground">
              {tab === "deposit" ? "Funds added to your account." : "You'll receive your funds shortly."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {tab === "withdraw" && (
              <div className="bg-gaming-green/10 border border-gaming-green/30 rounded-lg p-3 text-center">
                <p className="text-[11px] text-gaming-green font-medium">
                  Withdrawable: <strong>KES {balance.toLocaleString()}</strong>
                </p>
              </div>
            )}

            {/* Quick amounts */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Quick Amount</label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(String(amt))}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                      amount === String(amt)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                    }`}
                  >
                    KES {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Amount (KES)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={10}
                placeholder="Enter amount"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="0700000000"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <Button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 text-sm font-bold uppercase tracking-wider"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tab === "deposit" ? "Sending STK Push..." : "Processing..."}
                </span>
              ) : tab === "deposit" ? (
                "Deposit via M-Pesa"
              ) : (
                "Withdraw via M-Pesa"
              )}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">
              {tab === "deposit"
                ? "You'll receive an M-Pesa prompt on your phone to confirm payment."
                : "Funds will be sent to your M-Pesa account within minutes."
              }
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default WalletModal;
