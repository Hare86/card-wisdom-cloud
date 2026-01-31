import { useEffect } from "react";
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
import { useState } from "react";
import { Loader2, Coins, TrendingUp, Wallet, Clock, Plane, Utensils, ShoppingBag, Laptop } from "lucide-react";

// Mock data
const cards = [
  { id: 1, bankName: "HDFC Bank", cardName: "Infinia", lastFour: "4582", points: 18000, value: 7200, variant: "emerald" as const },
];

const rewardRates = [
  { category: "Travel", multiplier: "5x", icon: <Plane className="w-4 h-4 text-primary" /> },
  { category: "Dining", multiplier: "3x", icon: <Utensils className="w-4 h-4 text-secondary" /> },
  { category: "Online Shopping", multiplier: "2x", icon: <Laptop className="w-4 h-4 text-info" /> },
  { category: "Other", multiplier: "1x", icon: <ShoppingBag className="w-4 h-4 text-muted-foreground" /> },
];

const actions = [
  { type: "warning" as const, title: "1,250 points expiring soon", description: "Axis Atlas points expire in 15 days", actionLabel: "View Options" },
  { type: "success" as const, title: "Milestone achieved!", description: "Reached ₹2L annual spend on Infinia", actionLabel: "Claim Bonus" },
  { type: "info" as const, title: "New transfer partner added", description: "Turkish Airlines now available for Infinia", actionLabel: "Learn More" },
];

const recommendations = [
  { title: "Transfer to KrisFlyer", description: "Your Infinia points get 1.8x value when transferred to Singapore Airlines", savings: "₹5,400", confidence: 94 },
  { title: "Book Business Class to Singapore", description: "Sweet spot: BLR → SIN business class for 35,000 miles", savings: "₹45,000", confidence: 87 },
  { title: "Combine points for hotel stay", description: "Transfer to Marriott for a 5-night stay at W Maldives", savings: "₹1,20,000", confidence: 72 },
];

const categories = [
  { name: "Travel", value: 45000, color: "hsl(160, 84%, 39%)" },
  { name: "Dining", value: 28000, color: "hsl(43, 96%, 56%)" },
  { name: "Shopping", value: 22000, color: "hsl(199, 89%, 48%)" },
  { name: "Other", value: 15000, color: "hsl(222, 40%, 40%)" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [selectedCard, setSelectedCard] = useState(cards[0]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
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
            value={totalPoints.toLocaleString()}
            subtitle="Across 1 card"
            icon={Coins}
            trend={{ value: "12%", positive: true }}
            variant="primary"
          />
          <StatsCard
            title="Total Value"
            value={`₹${totalValue.toLocaleString()}`}
            subtitle="At 1:0.40 rate"
            icon={Wallet}
            trend={{ value: "8%", positive: true }}
            variant="secondary"
          />
          <StatsCard
            title="Monthly Earned"
            value="4,350"
            subtitle="pts this month"
            icon={TrendingUp}
            trend={{ value: "23%", positive: true }}
          />
          <StatsCard
            title="Expiring Soon"
            value="1,250"
            subtitle="pts in 15 days"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left Column - Cards & Benefits */}
          <div className="lg:col-span-8 space-y-4 lg:space-y-6">
            {/* Cards Carousel */}
            <div className="glass-card rounded-xl p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4">Your Cards</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                {cards.map((card) => (
                  <div key={card.id} className="flex-shrink-0">
                    <CreditCard
                      {...card}
                      isSelected={selectedCard.id === card.id}
                      onClick={() => setSelectedCard(card)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits Tabs */}
            <BenefitTabs
              cardName={selectedCard.cardName}
              rates={rewardRates}
              bestRedemption="Transfer to KrisFlyer for 1.8x value on business class awards"
            />

            {/* Recommendations */}
            <RecommendationCard recommendations={recommendations} />
          </div>

          {/* Right Column - Alerts, Actions, Chat, Analytics */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-6">
            <AlertsPanel />
            <ActionCenter actions={actions} />
            <CategoryBreakdown categories={categories} totalSpend={110000} />
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
