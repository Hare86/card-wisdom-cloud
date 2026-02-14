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
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Coins, TrendingUp, Wallet, Clock, CreditCard as CreditCardIcon, Maximize2 } from "lucide-react";
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

// Benefits, alerts, and actions now fetched from database in their respective components

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
      const sb = getSupabaseClient();
      if (!sb) return [];

      // Backfill: if statements are parsed but cards were never created (older parses),
      // create missing card rows from pdf_documents.parsed_data.
      try {
        const { data: docs } = await sb
          .from("pdf_documents")
          .select("id, parsed_data")
          .eq("user_id", user.id)
          .not("parsed_data", "is", null);

        if (docs && docs.length > 0) {
          const { data: existing } = await sb
            .from("credit_cards")
            .select("bank_name, card_name")
            .eq("user_id", user.id);

          const existingKey = new Set(
            (existing || []).map((c) => `${c.bank_name}||${c.card_name}`),
          );

          const missingCards: Array<{
            user_id: string;
            bank_name: string;
            card_name: string;
            points: number;
            point_value: number;
            variant: string;
          }> = [];

          for (const doc of docs) {
            const parsed = doc.parsed_data as any;
            const bank = parsed?.bank_name;
            const card = parsed?.card_name;
            if (!bank || !card) continue;

            const key = `${bank}||${card}`;
            if (existingKey.has(key)) continue;
            existingKey.add(key);

            const points = Number(parsed?.total_points_earned ?? 0) || 0;

            missingCards.push({
              user_id: user.id,
              bank_name: bank,
              card_name: card,
              points,
              point_value: 0.4,
              variant: "emerald",
            });
          }

          if (missingCards.length > 0) {
            await sb.from("credit_cards").insert(missingCards);
          }
        }
      } catch (e) {
        // Non-blocking backfill; dashboard should still load.
        console.warn("Card backfill skipped:", e);
      }

      const { data, error } = await sb
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
      const sb = getSupabaseClient();
      if (!sb) throw new Error("Backend not configured");
      // First delete associated transactions
      const { error: txError } = await sb
        .from("transactions")
        .delete()
        .eq("card_id", cardId);
      
      if (txError) throw txError;

      // Then delete the card
      const { error: cardError } = await sb
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
            value="—"
            subtitle="Upload statements to track"
            icon={TrendingUp}
          />
          <StatsCard
            title="Expiring Soon"
            value="—"
            subtitle="No expiry data available"
            icon={Clock}
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

            {/* Benefits Tabs - Now fetches data from card_benefits table */}
            {selectedCard && (
              <BenefitTabs
                cardName={selectedCard.cardName}
                bankName={selectedCard.bankName}
                selectedCardId={selectedCard.id}
              />
            )}

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
            <AlertsPanel 
              selectedCardId={selectedCard?.id}
              selectedCardName={selectedCard?.cardName}
            />
            <ActionCenter 
              selectedCardId={selectedCard?.id} 
              selectedCardName={selectedCard?.cardName} 
            />
            <CategoryBreakdown 
              selectedCardId={selectedCard?.id} 
              selectedCardName={selectedCard?.cardName} 
            />
            <ChatInterface 
              selectedCard={selectedCard}
              availableCards={cards}
              onSelectCard={(card) => setSelectedCard(card as CardData)}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
