import { Sparkles, ArrowRight, CheckCircle, Loader2, Plane, Hotel, Gift, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  title: string;
  description: string;
  savings: string;
  confidence: number;
  type: "transfer" | "redemption" | "cashback" | "booking";
}

interface RecommendationCardProps {
  cardName?: string;
  bankName?: string;
  points?: number;
  pointValue?: number;
  loading?: boolean;
}

// Card-specific recommendation templates
const cardRecommendations: Record<string, (points: number, pointValue: number) => Recommendation[]> = {
  "HDFC": (points, pointValue) => {
    const baseValue = points * pointValue;
    const krisValue = baseValue * 1.8;
    const marriottValue = baseValue * 1.5;
    
    return [
      {
        title: "Transfer to Singapore KrisFlyer",
        description: `Your ${points.toLocaleString()} points convert to ${Math.round(points * 0.5).toLocaleString()} KrisFlyer miles - great for business class redemptions`,
        savings: `₹${Math.round(krisValue - baseValue).toLocaleString()}`,
        confidence: 94,
        type: "transfer",
      },
      {
        title: "Book via SmartBuy Portal",
        description: "Earn 10x reward points on flights, hotels & shopping through HDFC SmartBuy",
        savings: `₹${Math.round(pointValue * 500).toLocaleString()}/month`,
        confidence: 88,
        type: "booking",
      },
      {
        title: "Transfer to Marriott Bonvoy",
        description: `Convert to ${Math.round(points * 1.5).toLocaleString()} Marriott points - 5th night free on award stays`,
        savings: `₹${Math.round(marriottValue - baseValue).toLocaleString()}`,
        confidence: 82,
        type: "transfer",
      },
    ];
  },
  
  "MoneyBack": (points, pointValue) => {
    const cashbackValue = points * pointValue;
    
    return [
      {
        title: "Direct Statement Cashback",
        description: `Redeem ${points.toLocaleString()} points for ₹${Math.round(cashbackValue).toLocaleString()} statement credit - instant value, no conversion`,
        savings: `₹${Math.round(cashbackValue).toLocaleString()}`,
        confidence: 98,
        type: "cashback",
      },
      {
        title: "Maximize Grocery Rewards",
        description: "Use this card for all grocery purchases to earn 5x points - highest category multiplier",
        savings: `₹${Math.round(pointValue * 200).toLocaleString()}/month`,
        confidence: 90,
        type: "redemption",
      },
      {
        title: "Fuel Surcharge Savings",
        description: "1% fuel surcharge waiver on purchases ₹400-₹5,000 - use exclusively for fuel",
        savings: "₹250/month",
        confidence: 85,
        type: "cashback",
      },
    ];
  },
  
  "Amex": (points, pointValue) => {
    const baseValue = points * pointValue;
    const marriottValue = points * 0.7; // 1:1 transfer, ~₹0.70/point value
    const tajValue = (points / 18000) * 10000;
    
    return [
      {
        title: "Transfer to Marriott Bonvoy",
        description: `1:1 transfer ratio - ${points.toLocaleString()} Amex MR = ${points.toLocaleString()} Marriott points. Book 5 nights, get 5th free!`,
        savings: `₹${Math.round(marriottValue).toLocaleString()}`,
        confidence: 92,
        type: "transfer",
      },
      {
        title: "Taj Hotels Voucher",
        description: `Redeem 18,000 points for ₹10,000 Taj voucher - ${Math.floor(points / 18000)} vouchers available`,
        savings: `₹${Math.round(tajValue).toLocaleString()}`,
        confidence: 88,
        type: "redemption",
      },
      {
        title: "Premium Dining Rewards",
        description: "Use for all dining - 4x points on restaurants is your highest earning category",
        savings: `₹${Math.round(pointValue * 400).toLocaleString()}/month`,
        confidence: 85,
        type: "booking",
      },
    ];
  },
};

// Default recommendations for unknown cards
const defaultRecommendations = (points: number, pointValue: number): Recommendation[] => {
  const value = points * pointValue;
  return [
    {
      title: "Statement Credit Redemption",
      description: `Redeem ${points.toLocaleString()} points for ₹${Math.round(value).toLocaleString()} statement credit`,
      savings: `₹${Math.round(value).toLocaleString()}`,
      confidence: 95,
      type: "cashback",
    },
    {
      title: "Gift Voucher Options",
      description: "Check your bank's reward portal for Amazon, Flipkart, and other gift vouchers",
      savings: "Varies",
      confidence: 80,
      type: "redemption",
    },
  ];
};

// Get recommendations based on card type
const getRecommendations = (cardName: string, bankName: string, points: number, pointValue: number): Recommendation[] => {
  const normalizedCardName = cardName.toLowerCase();
  const normalizedBankName = bankName.toLowerCase();
  
  if (normalizedCardName.includes("moneyback")) {
    return cardRecommendations["MoneyBack"](points, pointValue);
  }
  if (normalizedCardName.includes("amex") || normalizedBankName.includes("amex") || normalizedBankName.includes("american express")) {
    return cardRecommendations["Amex"](points, pointValue);
  }
  if (normalizedBankName.includes("hdfc")) {
    return cardRecommendations["HDFC"](points, pointValue);
  }
  
  return defaultRecommendations(points, pointValue);
};

const typeIcons = {
  transfer: <Plane className="w-4 h-4 text-primary" />,
  redemption: <Gift className="w-4 h-4 text-secondary" />,
  cashback: <CreditCard className="w-4 h-4 text-success" />,
  booking: <Hotel className="w-4 h-4 text-info" />,
};

export function RecommendationCard({ 
  cardName = "", 
  bankName = "", 
  points = 0, 
  pointValue = 0.4,
  loading = false 
}: RecommendationCardProps) {
  const { toast } = useToast();
  
  const recommendations = getRecommendations(cardName, bankName, points, pointValue);

  const handleApply = (rec: Recommendation) => {
    toast({
      title: "Recommendation Applied",
      description: `Opening details for: ${rec.title}`,
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Recommendations</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!cardName) {
    return (
      <div className="glass-card rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Recommendations</h3>
        </div>
        <p className="text-center text-muted-foreground py-8 text-sm">
          Select a card to see personalized recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Recommendations</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            For {cardName}
          </span>
        </div>

        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {typeIcons[rec.type]}
                    <h4 className="font-medium text-sm">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold gradient-text">{rec.savings}</p>
                  <p className="text-xs text-muted-foreground">potential value</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${rec.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {rec.confidence}% confidence
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleApply(rec)}
                >
                  Apply
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Points Summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Points Balance</span>
            <span className="font-bold">{points.toLocaleString()} pts (₹{Math.round(points * pointValue).toLocaleString()})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
