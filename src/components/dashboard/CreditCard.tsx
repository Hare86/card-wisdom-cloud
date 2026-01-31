import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Wifi, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CreditCardProps {
  bankName: string;
  cardName: string;
  lastFour: string;
  points: number;
  value: number;
  variant?: "emerald" | "gold" | "platinum";
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  isDeleting?: boolean;
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
  onDelete,
  showDelete = false,
  isDeleting = false,
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
      {/* Delete button */}
      {showDelete && onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 h-8 w-8 bg-black/30 hover:bg-destructive/80 text-white/70 hover:text-white backdrop-blur-sm rounded-full z-10"
              onClick={(e) => e.stopPropagation()}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {cardName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this card and all its associated transactions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Card"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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