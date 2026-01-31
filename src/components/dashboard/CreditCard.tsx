import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Wifi } from "lucide-react";

interface CreditCardProps {
  bankName: string;
  cardName: string;
  lastFour: string;
  points: number;
  value: number;
  variant?: "emerald" | "gold" | "platinum";
  isSelected?: boolean;
  onClick?: () => void;
}

export function CreditCard({
  bankName,
  cardName,
  lastFour,
  points,
  value,
  variant = "emerald",
  isSelected = false,
  onClick,
}: CreditCardProps) {
  const variants = {
    emerald: "credit-card-gradient",
    gold: "credit-card-gold",
    platinum: "credit-card-platinum",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-full max-w-sm p-6 rounded-2xl cursor-pointer transition-all duration-500 card-shine",
        variants[variant],
        isSelected
          ? "ring-2 ring-primary scale-105 glow-primary"
          : "hover:scale-[1.02] hover:shadow-lg"
      )}
    >
      {/* Card chip and contactless */}
      <div className="flex items-center justify-between mb-8">
        <div className="w-12 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md flex items-center justify-center">
          <div className="w-8 h-6 border-2 border-yellow-600/50 rounded-sm" />
        </div>
        <Wifi className="w-6 h-6 text-white/60 rotate-90" />
      </div>

      {/* Card number */}
      <div className="mb-6">
        <p className="text-lg font-mono text-white/90 tracking-widest">
          •••• •••• •••• {lastFour}
        </p>
      </div>

      {/* Card details */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
            {bankName}
          </p>
          <p className="text-sm font-semibold text-white">{cardName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
            Points
          </p>
          <p className="text-lg font-bold text-white">
            {points.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Value badge */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-xs font-medium text-white/90">
            ₹{value.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Card network logo placeholder */}
      <div className="absolute bottom-6 right-6">
        <CreditCardIcon className="w-8 h-8 text-white/30" />
      </div>
    </div>
  );
}
