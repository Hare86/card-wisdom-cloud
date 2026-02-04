import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Utensils, ShoppingBag, Gift, HelpCircle, CreditCard, Shield, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";

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

interface QAItem {
  question: string;
  answer: string;
}

interface BenefitTabsProps {
  cardName: string;
  bankName: string;
  selectedCardId?: string | null;
}

const benefitIcons = {
  lounge: <Plane className="w-5 h-5 text-primary" />,
  cashback: <CreditCard className="w-5 h-5 text-primary" />,
  milestone: <Gift className="w-5 h-5 text-secondary" />,
  insurance: <Shield className="w-5 h-5 text-info" />,
};

// Map benefit categories to icons
const categoryToIcon = (category: string): "lounge" | "cashback" | "milestone" | "insurance" => {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes("lounge") || lowerCat.includes("travel")) return "lounge";
  if (lowerCat.includes("cashback") || lowerCat.includes("rewards") || lowerCat.includes("points")) return "cashback";
  if (lowerCat.includes("milestone") || lowerCat.includes("bonus")) return "milestone";
  if (lowerCat.includes("insurance") || lowerCat.includes("protection")) return "insurance";
  return "milestone";
};

// Map category to rate icon
const getCategoryRateIcon = (category: string): React.ReactNode => {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes("travel") || lowerCat.includes("lounge")) return <Plane className="w-4 h-4 text-primary" />;
  if (lowerCat.includes("dining") || lowerCat.includes("food")) return <Utensils className="w-4 h-4 text-secondary" />;
  if (lowerCat.includes("shopping") || lowerCat.includes("retail")) return <ShoppingBag className="w-4 h-4 text-info" />;
  if (lowerCat.includes("reward") || lowerCat.includes("point")) return <Gift className="w-4 h-4 text-primary" />;
  return <CreditCard className="w-4 h-4 text-muted-foreground" />;
};

// Generate Q&A based on card and benefits
const generateQA = (cardName: string, bankName: string): QAItem[] => {
  return [
    { 
      question: `How do I redeem ${bankName} points?`, 
      answer: `Visit the ${bankName} rewards portal or mobile app. You can redeem points for cashback, gift vouchers, air miles, or partner transfers.` 
    },
    { 
      question: `Do points expire on ${cardName}?`, 
      answer: `Check your monthly statement for point expiry dates. Generally, points are valid for 2-3 years from the earn date.` 
    },
    { 
      question: "What's the best redemption value?", 
      answer: "Transfer to airline partners typically gives the best value (1.5-2x). Cashback redemption gives 0.25-0.5x value. Gift vouchers vary by partner." 
    },
    { 
      question: "How do I access airport lounges?", 
      answer: "Use your physical card at participating lounges. Some cards require app check-in or Priority Pass membership. Check your card benefits for details." 
    },
  ];
};

// Generate rules based on benefits
const generateRules = (bankName: string): string[] => {
  return [
    "Points are credited within 2-3 business days of transaction",
    "Fuel transactions typically excluded from reward points",
    "EMI conversions may not earn reward points",
    "Wallet loads and rent payments may be excluded",
    `Check ${bankName} terms for complete exclusion list`,
    "Bonus points credited after milestone completion",
  ];
};

export function BenefitTabs({ cardName, bankName, selectedCardId }: BenefitTabsProps) {
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [rates, setRates] = useState<BenefitRate[]>([]);
  const [bestRedemption, setBestRedemption] = useState<string>("");

  useEffect(() => {
    fetchBenefits();
  }, [cardName, bankName]);

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const sb = getSupabaseClient();
      if (!sb) {
        setDefaultData();
        return;
      }

      // Normalize card name for search (remove "Credit Card" suffix, etc.)
      const normalizedCardName = cardName
        .replace(/credit\s*card(s)?/gi, "")
        .replace(/icici\s*bank/gi, "")
        .replace(/hdfc\s*bank/gi, "")
        .trim();

      // Search for matching benefits
      const { data, error } = await sb
        .from("card_benefits")
        .select("*")
        .eq("is_active", true)
        .or(`card_name.ilike.%${normalizedCardName}%,bank_name.ilike.%${bankName}%`)
        .order("value_estimate", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Filter to best matches
        const exactCardMatches = data.filter(b => 
          b.card_name.toLowerCase().includes(normalizedCardName.toLowerCase()) ||
          normalizedCardName.toLowerCase().includes(b.card_name.toLowerCase())
        );
        
        const benefitsToUse = exactCardMatches.length > 0 ? exactCardMatches : data.slice(0, 10);

        // Group by category for rates
        const rateCategories: BenefitRate[] = [];
        const benefitItems: BenefitItem[] = [];
        let topRedemption = "Redeem points for gift vouchers or statement credit";

        benefitsToUse.forEach(b => {
          const category = b.benefit_category;
          
          // Add to rates if it's a rewards/points category
          if (category.toLowerCase().includes("reward") || 
              category.toLowerCase().includes("point") ||
              b.benefit_title.toLowerCase().includes("x ") ||
              b.benefit_title.toLowerCase().includes("x point")) {
            
            // Extract multiplier from title
            const multiplierMatch = b.benefit_title.match(/(\d+)x/i);
            const multiplier = multiplierMatch ? `${multiplierMatch[1]}x` : "1x";
            
            if (!rateCategories.find(r => r.category === category)) {
              rateCategories.push({
                category: b.benefit_title,
                multiplier,
                icon: getCategoryRateIcon(category),
              });
            }
          }

          // Add to benefits list
          benefitItems.push({
            title: b.benefit_title,
            description: b.benefit_description,
            icon: categoryToIcon(category),
          });

          // Check for best redemption
          if (category.toLowerCase().includes("transfer") || 
              b.benefit_title.toLowerCase().includes("transfer")) {
            topRedemption = b.benefit_description;
          }
        });

        // If no rate-specific benefits found, create from benefit items
        if (rateCategories.length === 0) {
          const categoryGroups = [...new Set(benefitsToUse.map(b => b.benefit_category))];
          categoryGroups.slice(0, 4).forEach(cat => {
            rateCategories.push({
              category: cat,
              multiplier: "1x+",
              icon: getCategoryRateIcon(cat),
            });
          });
        }

        setRates(rateCategories.slice(0, 5));
        setBenefits(benefitItems.slice(0, 6));
        setBestRedemption(topRedemption);
      } else {
        setDefaultData();
      }
    } catch (error) {
      console.error("Error fetching benefits:", error);
      setDefaultData();
    } finally {
      setLoading(false);
    }
  };

  const setDefaultData = () => {
    setRates([
      { category: "All Purchases", multiplier: "1x", icon: <ShoppingBag className="w-4 h-4 text-primary" /> },
    ]);
    setBenefits([
      { title: "Standard Rewards", description: "Earn points on all purchases", icon: "milestone" },
    ]);
    setBestRedemption("Redeem points for gift vouchers or statement credit");
  };

  const displayRules = generateRules(bankName);
  const displayQA = generateQA(cardName, bankName);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">{cardName} Benefits</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
            {benefits.map((benefit, index) => (
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
          <div className="space-y-3">
            {displayRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <span className="text-primary font-bold text-sm">•</span>
                <p className="text-sm text-muted-foreground">{rule}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="qa" className="mt-4">
          <div className="space-y-3">
            {displayQA.map((item, index) => (
              <div 
                key={index} 
                className="bg-muted/30 rounded-lg overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedQA(expandedQA === index ? null : index)}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-info flex-shrink-0" />
                    <p className="text-sm font-medium">{item.question}</p>
                  </div>
                  {expandedQA === index ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                {expandedQA === index && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-muted-foreground pl-7">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
