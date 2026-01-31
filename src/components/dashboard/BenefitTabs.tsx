import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Utensils, ShoppingBag, Gift, HelpCircle, CreditCard, Shield } from "lucide-react";

interface BenefitRate {
  category: string;
  multiplier: string;
  icon: React.ReactNode;
}

interface BenefitItem {
  title: string;
  description: string;
  icon: "lounge" | "cashback" | "milestone" | "insurance";
}

interface BenefitTabsProps {
  cardName: string;
  rates: BenefitRate[];
  bestRedemption: string;
  benefits?: BenefitItem[];
}

const benefitIcons = {
  lounge: <Plane className="w-5 h-5 text-primary" />,
  cashback: <CreditCard className="w-5 h-5 text-primary" />,
  milestone: <Gift className="w-5 h-5 text-secondary" />,
  insurance: <Shield className="w-5 h-5 text-info" />,
};

export function BenefitTabs({ cardName, rates, bestRedemption, benefits }: BenefitTabsProps) {
  const defaultBenefits: BenefitItem[] = [
    { title: "Airport Lounge Access", description: "Unlimited domestic + 6 international/year", icon: "lounge" },
    { title: "Milestone Benefits", description: "Bonus points on annual spend targets", icon: "milestone" },
  ];

  const displayBenefits = benefits || defaultBenefits;
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">{cardName} Benefits</h3>
      
      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger 
            value="benefits" 
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Benefits
          </TabsTrigger>
          <TabsTrigger 
            value="rates"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Rates
          </TabsTrigger>
          <TabsTrigger 
            value="redemption"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Redeem
          </TabsTrigger>
          <TabsTrigger 
            value="rules"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Rules
          </TabsTrigger>
          <TabsTrigger 
            value="qa"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Q&A
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="mt-4 space-y-3">
          <div className="grid gap-3">
            {displayBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                {benefitIcons[benefit.icon]}
                <div>
                  <p className="font-medium text-sm">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <div className="grid gap-2">
            {rates.map((rate, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {rate.icon}
                  <span className="text-sm font-medium">{rate.category}</span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {rate.multiplier}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="redemption" className="mt-4">
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Best Redemption Option</p>
                  <p className="text-sm text-muted-foreground mt-1">{bestRedemption}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Air Miles</p>
                <p className="text-lg font-bold">1.8x</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Cashback</p>
                <p className="text-lg font-bold">0.5x</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• Points expire 3 years from earn date</p>
            <p>• Minimum redemption: 500 points</p>
            <p>• No capping on reward points earning</p>
            <p>• Points not earned on fuel, rent, utilities</p>
          </div>
        </TabsContent>

        <TabsContent value="qa" className="mt-4">
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <HelpCircle className="w-5 h-5 text-info" />
            <p className="text-sm text-muted-foreground">
              Ask the AI assistant about this card's benefits
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
