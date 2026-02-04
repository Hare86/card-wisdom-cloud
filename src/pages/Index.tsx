import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CreditCard } from "@/components/dashboard/CreditCard";
import { BenefitTabs } from "@/components/dashboard/BenefitTabs";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { supabase } from "@/integrations/supabase/safeClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Coins, TrendingUp, Wallet, Clock, Plane, Utensils, ShoppingBag, Laptop, CreditCard as CreditCardIcon, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CardVariant = "emerald" | "gold" | "platinum";

interface CardData {
  id: string;
  bankName: string;
  cardName: string;
  lastFour: string;
  points: number;
  value: number;
  variant: CardVariant;
}

// Card-specific reward rates, benefits, rules, and Q&A
const cardBenefitsData: Record<string, {
  rates: { category: string; multiplier: string; icon: React.ReactNode }[];
  bestRedemption: string;
  benefits: { title: string; description: string; icon: "lounge" | "cashback" | "milestone" | "insurance" }[];
  rules: string[];
  qa: { question: string; answer: string }[];
}> = {
  "HDFC": {
    rates: [
      { category: "Travel", multiplier: "5x", icon: <Plane className="w-4 h-4 text-primary" /> },
      { category: "Dining", multiplier: "3x", icon: <Utensils className="w-4 h-4 text-secondary" /> },
      { category: "Online Shopping", multiplier: "2x", icon: <Laptop className="w-4 h-4 text-info" /> },
      { category: "Other", multiplier: "1x", icon: <ShoppingBag className="w-4 h-4 text-muted-foreground" /> },
    ],
    bestRedemption: "Transfer to KrisFlyer for 1.8x value on business class awards",
    benefits: [
      { title: "Airport Lounge Access", description: "Unlimited domestic + 6 international/year", icon: "lounge" },
      { title: "Milestone Benefits", description: "Bonus 2,500 points on ₹8L annual spend", icon: "milestone" },
    ],
    rules: [
      "Points expire 3 years from earn date",
      "Minimum redemption: 2,500 points",
      "No capping on reward points earning",
      "Points not earned on fuel, rent, utilities, insurance",
      "10x points on SmartBuy portal purchases",
    ],
    qa: [
      { question: "How do I transfer points to airlines?", answer: "Go to HDFC SmartBuy portal → Rewards → Transfer to Partners. KrisFlyer, Club Vistara available." },
      { question: "What's the best value redemption?", answer: "Transfer to Singapore KrisFlyer for business class awards - get 1.8x value compared to cashback." },
      { question: "Do points expire?", answer: "Yes, 3 years from the date of earning. Check your statement for exact expiry dates." },
    ],
  },
  "MoneyBack": {
    rates: [
      { category: "Groceries", multiplier: "5x", icon: <ShoppingBag className="w-4 h-4 text-primary" /> },
      { category: "Utilities", multiplier: "2x", icon: <Laptop className="w-4 h-4 text-secondary" /> },
      { category: "Fuel", multiplier: "2x", icon: <Plane className="w-4 h-4 text-info" /> },
      { category: "Other", multiplier: "1x", icon: <ShoppingBag className="w-4 h-4 text-muted-foreground" /> },
    ],
    bestRedemption: "Direct cashback to statement - no transfer needed, instant value",
    benefits: [
      { title: "Cashback Rewards", description: "Direct statement credit, no conversion hassle", icon: "cashback" },
      { title: "Fuel Surcharge Waiver", description: "1% waiver on fuel transactions (up to ₹250/month)", icon: "insurance" },
    ],
    rules: [
      "Cashback credited within 90 days of transaction",
      "Minimum cashback redemption: ₹500",
      "Maximum monthly cashback: ₹3,000",
      "Fuel surcharge waiver up to ₹250/month",
      "Not applicable on wallet loads, EMI transactions",
    ],
    qa: [
      { question: "When do I get my cashback?", answer: "Cashback is auto-credited to your statement within 90 days of the qualifying transaction." },
      { question: "Is there a cap on earnings?", answer: "Yes, maximum ₹3,000 cashback per month across all categories." },
      { question: "How does fuel surcharge waiver work?", answer: "1% surcharge waived automatically on fuel purchases between ₹400-₹5,000 (max ₹250/month)." },
    ],
  },
  "Amex": {
    rates: [
      { category: "Travel", multiplier: "4x", icon: <Plane className="w-4 h-4 text-primary" /> },
      { category: "Dining", multiplier: "4x", icon: <Utensils className="w-4 h-4 text-secondary" /> },
      { category: "Entertainment", multiplier: "3x", icon: <Laptop className="w-4 h-4 text-info" /> },
      { category: "Other", multiplier: "1x", icon: <ShoppingBag className="w-4 h-4 text-muted-foreground" /> },
    ],
    bestRedemption: "Transfer to Marriott Bonvoy for 1:1 hotel points with 5th night free",
    benefits: [
      { title: "Premium Lounge Access", description: "Priority Pass + Amex lounges worldwide", icon: "lounge" },
      { title: "Travel Insurance", description: "Complimentary travel insurance up to ₹50L", icon: "insurance" },
    ],
    rules: [
      "Points never expire as long as account is active",
      "Minimum redemption: 1,000 points",
      "Transfer ratio varies by partner (1:1 to 1:2)",
      "18,000 points for Taj voucher worth ₹10,000",
      "Annual fee waived on ₹4L annual spend",
    ],
    qa: [
      { question: "Do Amex points expire?", answer: "No! Amex Membership Rewards points never expire as long as your card account remains open and in good standing." },
      { question: "Best hotel transfer partner?", answer: "Marriott Bonvoy at 1:1 ratio. Book 5 nights, get 5th night free on award stays." },
      { question: "How to use Priority Pass?", answer: "Download Priority Pass app, register with your card number, and show the digital card at participating lounges." },
    ],
  },
};

// Default fallback for unknown cards
const defaultCardBenefits = {
  rates: [
    { category: "All Purchases", multiplier: "1x", icon: <ShoppingBag className="w-4 h-4 text-primary" /> },
  ],
  bestRedemption: "Redeem points for statement credit or gift vouchers",
  benefits: [
    { title: "Standard Rewards", description: "Earn points on all purchases", icon: "milestone" as const },
  ],
  rules: [
    "Points validity varies by issuer",
    "Check your statement for specific terms",
    "Standard reward rate applies to all purchases",
  ],
  qa: [
    { question: "How do I redeem points?", answer: "Visit your card issuer's rewards portal or call customer service to explore redemption options." },
    { question: "Do my points expire?", answer: "Check your monthly statement or contact your bank for expiry details specific to your card." },
  ],
};

// Helper to get card benefits based on card name or bank
const getCardBenefits = (cardName: string, bankName: string) => {
  // Check card name first, then bank name
  if (cardName.toLowerCase().includes("moneyback")) return cardBenefitsData["MoneyBack"];
  if (cardName.toLowerCase().includes("amex") || bankName.toLowerCase().includes("amex") || bankName.toLowerCase().includes("american express")) return cardBenefitsData["Amex"];
  if (bankName.toLowerCase().includes("hdfc")) return cardBenefitsData["HDFC"];
  return defaultCardBenefits;
};

// Static actions removed - now fetched from database in ActionCenter component

// Recommendations are now generated dynamically in RecommendationCard component based on selected card

// Categories are now fetched dynamically in CategoryBreakdown component

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const queryClient = useQueryClient();

  // Fetch credit cards from database
  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((card) => ({
        id: card.id,
        bankName: card.bank_name,
        cardName: card.card_name,
        lastFour: card.last_four || "****",
        points: card.points || 0,
        value: Math.round((card.points || 0) * (card.point_value || 0.4)),
        variant: (card.variant as CardVariant) || "emerald",
      }));
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      // First delete associated transactions
      const { error: txError } = await supabase
        .from("transactions")
        .delete()
        .eq("card_id", cardId);
      
      if (txError) throw txError;

      // Then delete the card
      const { error: cardError } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", cardId);
      
      if (cardError) throw cardError;
    },
    onSuccess: () => {
      toast.success("Card deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete card");
    },
  });

  // Set selected card when cards load - also reset if cards change
  useEffect(() => {
    if (cards.length > 0) {
      // Check if current selected card is still in the list
      const currentCardStillExists = selectedCard && cards.some(c => c.id === selectedCard.id);
      if (!currentCardStillExists) {
        setSelectedCard(cards[0]);
      }
    } else {
      setSelectedCard(null);
    }
  }, [cards, selectedCard]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || cardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPoints = cards.reduce((sum, card) => sum + card.points, 0);
  const totalValue = cards.reduce((sum, card) => sum + card.value, 0);
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            Welcome back, <span className="gradient-text">{userName}</span>
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Here's an overview of your credit card rewards portfolio
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <StatsCard
            title="Total Points"
            value={cards.length > 0 ? totalPoints.toLocaleString() : "—"}
            subtitle={cards.length > 0 ? `Across ${cards.length} card${cards.length !== 1 ? 's' : ''}` : "No cards added"}
            icon={Coins}
            trend={cards.length > 0 ? { value: "12%", positive: true } : undefined}
            variant="primary"
          />
          <StatsCard
            title="Total Value"
            value={cards.length > 0 ? `₹${totalValue.toLocaleString()}` : "—"}
            subtitle={cards.length > 0 ? "At 1:0.40 rate" : "Add a card to start"}
            icon={Wallet}
            trend={cards.length > 0 ? { value: "8%", positive: true } : undefined}
            variant="secondary"
          />
          <StatsCard
            title="Monthly Earned"
            value={cards.length > 0 ? "4,350" : "—"}
            subtitle={cards.length > 0 ? "pts this month" : "No activity"}
            icon={TrendingUp}
            trend={cards.length > 0 ? { value: "23%", positive: true } : undefined}
          />
          <StatsCard
            title="Expiring Soon"
            value={cards.length > 0 ? "1,250" : "—"}
            subtitle={cards.length > 0 ? "pts in 15 days" : "Nothing expiring"}
            icon={Clock}
            variant={cards.length > 0 ? "warning" : "default"}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left Column - Cards & Benefits */}
          <div className="lg:col-span-8 space-y-4 lg:space-y-6">
            {/* Cards Carousel */}
            <div className="glass-card rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Your Cards</h3>
                {cards.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Your Cards</DialogTitle>
                        <DialogDescription>
                          View and manage all your credit cards
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {cards.map((card) => (
                            <CreditCard
                              key={card.id}
                              {...card}
                              isSelected={selectedCard?.id === card.id}
                              onClick={() => setSelectedCard(card)}
                              showDelete={true}
                              onDelete={() => deleteCardMutation.mutate(card.id)}
                              isDeleting={deleteCardMutation.isPending}
                            />
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CreditCardIcon className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No cards yet. Upload a statement to get started.</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                  {cards.map((card) => (
                    <div key={card.id} className="flex-shrink-0">
                      <CreditCard
                        {...card}
                        isSelected={selectedCard?.id === card.id}
                        onClick={() => setSelectedCard(card)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Benefits Tabs */}
            {selectedCard && (() => {
              const cardBenefits = getCardBenefits(selectedCard.cardName, selectedCard.bankName);
              return (
                <BenefitTabs
                  cardName={selectedCard.cardName}
                  rates={cardBenefits.rates}
                  bestRedemption={cardBenefits.bestRedemption}
                  benefits={cardBenefits.benefits}
                  rules={cardBenefits.rules}
                  qa={cardBenefits.qa}
                />
              );
            })()}

            {/* Recommendations */}
            <RecommendationCard 
              cardName={selectedCard?.cardName}
              bankName={selectedCard?.bankName}
              points={selectedCard?.points}
              pointValue={0.4}
              loading={cardsLoading}
            />
          </div>

          {/* Right Column - Alerts, Actions, Chat, Analytics */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-6">
            <AlertsPanel />
            <ActionCenter 
              selectedCardId={selectedCard?.id} 
              selectedCardName={selectedCard?.cardName} 
            />
            <CategoryBreakdown 
              selectedCardId={selectedCard?.id} 
              selectedCardName={selectedCard?.cardName} 
            />
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
