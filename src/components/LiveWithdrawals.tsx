import { useState, useEffect } from "react";
import { ArrowUpFromLine } from "lucide-react";

const NAMES = [
  "James K.", "Mary W.", "Peter M.", "Grace N.", "David O.", "Faith A.", "John M.", "Rose K.",
  "Brian O.", "Lucy W.", "Kevin N.", "Anne M.", "Samuel K.", "Joy A.", "Daniel W.", "Mercy N.",
  "Victor O.", "Esther M.", "Collins K.", "Cynthia W.", "Dennis N.", "Irene A.", "George M.",
  "Florence K.", "Patrick O.", "Lilian W.", "Charles N.", "Agnes M.", "Moses K.", "Winnie A.",
];

const randomAmount = () => {
  const ranges = [
    { min: 500, max: 2000, weight: 40 },
    { min: 2000, max: 10000, weight: 35 },
    { min: 10000, max: 50000, weight: 20 },
    { min: 50000, max: 150000, weight: 5 },
  ];
  const r = Math.random() * 100;
  let cumulative = 0;
  for (const range of ranges) {
    cumulative += range.weight;
    if (r <= cumulative) {
      return Math.round((Math.random() * (range.max - range.min) + range.min) / 100) * 100;
    }
  }
  return 1000;
};

const generateWithdrawal = () => ({
  id: Math.random().toString(36).slice(2),
  name: NAMES[Math.floor(Math.random() * NAMES.length)],
  amount: randomAmount(),
  time: Date.now(),
});

const LiveWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState(() =>
    Array.from({ length: 5 }, generateWithdrawal)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setWithdrawals((prev) => [generateWithdrawal(), ...prev.slice(0, 9)]);
    }, Math.random() * 30000 + 30000); // every 30-60s

    return () => clearInterval(interval);
  }, []);

  // Also add one quickly on mount after a short delay
  useEffect(() => {
    const t = setTimeout(() => {
      setWithdrawals((prev) => [generateWithdrawal(), ...prev.slice(0, 9)]);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-none border-b border-border bg-card/50">
      <div className="flex items-center gap-1.5 shrink-0">
        <ArrowUpFromLine className="w-3 h-3 text-gaming-green" />
        <span className="text-[10px] text-gaming-green font-semibold uppercase tracking-wider">Live</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {withdrawals.map((w) => (
          <span
            key={w.id}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-gaming-green/10 border border-gaming-green/20 text-gaming-green animate-fade-in"
          >
            <span className="text-muted-foreground">{w.name}</span>
            <span className="font-mono font-bold">KES {w.amount.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default LiveWithdrawals;
