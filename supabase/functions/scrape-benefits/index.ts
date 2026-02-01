import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bank configurations
const BANK_CONFIGS: Record<string, { name: string; updateFrequency: string }> = {
  hdfc: { name: "HDFC Bank", updateFrequency: "weekly" },
  axis: { name: "Axis Bank", updateFrequency: "weekly" },
  icici: { name: "ICICI Bank", updateFrequency: "weekly" },
  sbi: { name: "SBI Card", updateFrequency: "weekly" },
};

// Curated card benefits data (comprehensive knowledge base)
const CARD_BENEFITS_DATA: Record<string, any[]> = {
  "HDFC Bank": [
    {
      card_name: "Infinia",
      source_url: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card",
      benefits: [
        { category: "Travel", title: "5X Reward Points on Travel", description: "Earn 5 reward points per ₹150 spent on travel bookings via SmartBuy portal", conditions: "Maximum 25,000 points per calendar month", value_estimate: 5000 },
        { category: "Lounge", title: "Unlimited Lounge Access", description: "Complimentary access to 1000+ airport lounges worldwide via Priority Pass", conditions: "Primary and add-on card holders eligible", value_estimate: 20000 },
        { category: "Transfer", title: "KrisFlyer Transfer", description: "Transfer points to Singapore Airlines KrisFlyer at 1:1 ratio", conditions: "Minimum 2,500 points per transfer", value_estimate: 0 },
        { category: "Concierge", title: "24/7 Concierge", description: "Personal concierge service for travel, dining, and lifestyle requests", conditions: "Available globally", value_estimate: 5000 },
        { category: "Golf", title: "Complimentary Golf", description: "2 complimentary golf games per quarter at select courses", conditions: "Booking required 48 hours in advance", value_estimate: 8000 },
        { category: "Insurance", title: "Air Accident Cover", description: "₹3 Crore air accident insurance coverage", conditions: "When ticket purchased with card", value_estimate: 3000 },
        { category: "Shopping", title: "10X on SmartBuy", description: "Earn 10X reward points on SmartBuy purchases", conditions: "Excludes wallet and gift card purchases", value_estimate: 8000 },
      ],
    },
    {
      card_name: "Diners Club Black",
      source_url: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/diners-club-black-credit-card",
      benefits: [
        { category: "Dining", title: "10X on Dining", description: "Earn 10 reward points per ₹150 on dining transactions", conditions: "At select partner restaurants", value_estimate: 3000 },
        { category: "Lounge", title: "Airport Lounge Access", description: "Unlimited domestic and international lounge access", conditions: "Via Diners Club lounges", value_estimate: 15000 },
        { category: "Insurance", title: "Travel Insurance", description: "Complimentary travel insurance up to ₹1 Crore", conditions: "When ticket booked with card", value_estimate: 5000 },
        { category: "Milestone", title: "Annual Milestone Bonus", description: "10,000 bonus points on spending ₹8 Lakhs annually", conditions: "Calculated on card anniversary", value_estimate: 4000 },
        { category: "Golf", title: "Golf Program", description: "Complimentary golf games at premium courses", conditions: "2 games per quarter", value_estimate: 6000 },
      ],
    },
    {
      card_name: "Regalia",
      source_url: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-credit-card",
      benefits: [
        { category: "Travel", title: "4X on Travel", description: "4 reward points per ₹150 on travel spends", conditions: "Via SmartBuy portal only", value_estimate: 3000 },
        { category: "Lounge", title: "12 Lounge Visits/Year", description: "Complimentary domestic airport lounge access", conditions: "6 visits per half year", value_estimate: 6000 },
        { category: "Entertainment", title: "Buy 1 Get 1 Movies", description: "BOGO on movie tickets at partner multiplexes", conditions: "Maximum 2 per month", value_estimate: 2400 },
        { category: "Fuel", title: "1% Fuel Surcharge Waiver", description: "Save on fuel surcharge at all petrol pumps", conditions: "Min ₹400, Max ₹4000 per transaction", value_estimate: 1200 },
      ],
    },
  ],
  "Axis Bank": [
    {
      card_name: "Atlas",
      source_url: "https://www.axisbank.com/retail/cards/credit-card/atlas-credit-card",
      benefits: [
        { category: "Travel", title: "5X Edge Miles on Travel", description: "Earn 5 Edge Miles per ₹100 on travel spends", conditions: "International and domestic travel eligible", value_estimate: 4000 },
        { category: "Transfer", title: "12 Airline Partners", description: "Transfer Edge Miles to 12+ airline frequent flyer programs", conditions: "Minimum 5,000 miles per transfer", value_estimate: 0 },
        { category: "Lounge", title: "8 Lounge Visits/Quarter", description: "Complimentary airport lounge access via Priority Pass", conditions: "Per quarter limit applies", value_estimate: 8000 },
        { category: "Milestone", title: "Annual Milestone Bonus", description: "Earn bonus 25,000 Edge Miles on spending ₹7.5L annually", conditions: "Calculated on card anniversary", value_estimate: 10000 },
        { category: "Insurance", title: "Travel Insurance", description: "Comprehensive travel insurance up to ₹50 Lakhs", conditions: "Automatic when ticket booked", value_estimate: 2500 },
      ],
    },
    {
      card_name: "Reserve",
      source_url: "https://www.axisbank.com/retail/cards/credit-card/reserve-credit-card",
      benefits: [
        { category: "Dining", title: "Fine Dining Program", description: "Up to 25% off at 500+ premium restaurants", conditions: "Booking via Axis dining portal", value_estimate: 5000 },
        { category: "Lifestyle", title: "Lifestyle Benefits", description: "Complimentary memberships to gym, spa, and wellness centers", conditions: "Select partners only", value_estimate: 10000 },
        { category: "Concierge", title: "24/7 Concierge", description: "Dedicated lifestyle management services", conditions: "Unlimited requests", value_estimate: 5000 },
        { category: "Golf", title: "Unlimited Golf", description: "Unlimited complimentary golf rounds globally", conditions: "At 200+ courses worldwide", value_estimate: 15000 },
      ],
    },
    {
      card_name: "Magnus",
      source_url: "https://www.axisbank.com/retail/cards/credit-card/magnus-credit-card",
      benefits: [
        { category: "Travel", title: "3X on Travel", description: "Triple Edge Miles on all travel bookings", conditions: "No cap on earning", value_estimate: 3000 },
        { category: "Lounge", title: "Unlimited Lounge", description: "Unlimited domestic and international lounge access", conditions: "Via Priority Pass", value_estimate: 12000 },
        { category: "Entertainment", title: "Premium Streaming", description: "Complimentary OTT subscriptions worth ₹10,000", conditions: "Select platforms", value_estimate: 10000 },
      ],
    },
  ],
  "ICICI Bank": [
    {
      card_name: "Emeralde",
      source_url: "https://www.icicibank.com/credit-card/emeralde-credit-card",
      benefits: [
        { category: "Dining", title: "3X on Dining", description: "Triple reward points on all dining spends", conditions: "Includes food delivery apps", value_estimate: 2500 },
        { category: "Entertainment", title: "3X on Entertainment", description: "Triple points on movies, OTT subscriptions, and events", conditions: "Select merchants", value_estimate: 2000 },
        { category: "Lounge", title: "4 Lounge Visits/Quarter", description: "Domestic airport lounge access", conditions: "Via Mastercard lounges", value_estimate: 4000 },
        { category: "Shopping", title: "Buy 1 Get 1 Movies", description: "BOGO on movie tickets at select multiplexes", conditions: "Maximum 2 per month", value_estimate: 2400 },
        { category: "Insurance", title: "Travel Insurance", description: "International travel insurance up to ₹25 Lakhs", conditions: "When ticket booked with card", value_estimate: 1500 },
      ],
    },
    {
      card_name: "Sapphiro",
      source_url: "https://www.icicibank.com/credit-card/sapphiro-credit-card",
      benefits: [
        { category: "Golf", title: "Golf Privileges", description: "Complimentary golf rounds at partner courses", conditions: "2 rounds per month", value_estimate: 6000 },
        { category: "Concierge", title: "Concierge Services", description: "24/7 personal assistance for travel and lifestyle", conditions: "India and select international", value_estimate: 3000 },
        { category: "Lounge", title: "Lounge Access", description: "Domestic and international lounge access", conditions: "8 visits per quarter", value_estimate: 8000 },
        { category: "Dining", title: "Culinary Treats", description: "Up to 20% off at 1500+ restaurants", conditions: "Via ICICI Culinary Treats program", value_estimate: 4000 },
      ],
    },
    {
      card_name: "Amazon Pay",
      source_url: "https://www.icicibank.com/credit-card/amazon-pay-credit-card",
      benefits: [
        { category: "Cashback", title: "5% Amazon Cashback", description: "5% back on Amazon purchases for Prime members", conditions: "2% for non-Prime", value_estimate: 6000 },
        { category: "Cashback", title: "2% Partner Cashback", description: "2% back on paying bills and partner merchants", conditions: "Swiggy, BookMyShow, etc.", value_estimate: 3000 },
        { category: "Cashback", title: "1% All Spends", description: "1% cashback on all other purchases", conditions: "No cap on cashback", value_estimate: 2000 },
        { category: "Shopping", title: "No-Cost EMI", description: "No-cost EMI on Amazon purchases", conditions: "On select products", value_estimate: 1500 },
      ],
    },
  ],
  "SBI Card": [
    {
      card_name: "Elite",
      source_url: "https://www.sbicard.com/en/personal/credit-cards/travel-fuel/sbi-card-elite.page",
      benefits: [
        { category: "Lounge", title: "Lounge Access", description: "Complimentary domestic lounge visits", conditions: "2 per quarter via Priority Pass", value_estimate: 2000 },
        { category: "Entertainment", title: "Movie Perks", description: "Buy 1 Get 1 on movie tickets", conditions: "Up to 2 per month at select cinemas", value_estimate: 2400 },
        { category: "Milestone", title: "Milestone Benefits", description: "E-vouchers worth ₹5,000 on spending ₹3L", conditions: "Annual spending milestone", value_estimate: 5000 },
        { category: "Dining", title: "Dining Privileges", description: "Up to 20% off at partner restaurants", conditions: "Via SBI Card dining program", value_estimate: 3000 },
        { category: "Fuel", title: "Fuel Surcharge Waiver", description: "1% fuel surcharge waiver", conditions: "Min ₹500, Max ₹3000", value_estimate: 1000 },
      ],
    },
    {
      card_name: "Prime",
      source_url: "https://www.sbicard.com/en/personal/credit-cards/travel-fuel/sbi-card-prime.page",
      benefits: [
        { category: "Lounge", title: "Lounge Access", description: "4 domestic lounge visits per year", conditions: "Via Mastercard lounges", value_estimate: 4000 },
        { category: "Milestone", title: "Renewal Bonus", description: "2,500 bonus points on renewal", conditions: "On spending ₹3L in year", value_estimate: 625 },
        { category: "Shopping", title: "Trident Hotels Discount", description: "Up to 25% off at Trident Hotels", conditions: "On room tariff", value_estimate: 5000 },
        { category: "Insurance", title: "Air Accident Cover", description: "₹1 Crore air accident insurance", conditions: "When ticket booked with card", value_estimate: 1500 },
      ],
    },
  ],
};

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return null;
    }

    const response = await fetch("https://api.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Embedding API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, bank } = await req.json();

    if (action === "scrape-bank") {
      const bankConfig = BANK_CONFIGS[bank];
      if (!bankConfig) {
        return new Response(JSON.stringify({ error: "Unknown bank" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Processing ${bankConfig.name} benefits...`);

      const bankData = CARD_BENEFITS_DATA[bankConfig.name];
      if (!bankData) {
        return new Response(JSON.stringify({ error: "No data for bank" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let benefitsStored = 0;
      const errors: string[] = [];

      for (const card of bankData) {
        console.log(`Processing card: ${card.card_name}`);
        
        for (const benefit of card.benefits) {
          try {
            const benefitText = `${bankConfig.name} ${card.card_name}: ${benefit.title} - ${benefit.description}. ${benefit.conditions || ""}`;
            console.log(`Generating embedding for: ${benefit.title}`);
            
            const embedding = await generateEmbedding(benefitText);
            
            const { error } = await supabase.from("card_benefits").upsert(
              {
                bank_name: bankConfig.name,
                card_name: card.card_name,
                benefit_category: benefit.category,
                benefit_title: benefit.title,
                benefit_description: benefit.description,
                conditions: benefit.conditions,
                value_estimate: benefit.value_estimate,
                is_active: true,
                source_url: card.source_url,
                last_updated: new Date().toISOString(),
                embedding: embedding ? `[${embedding.join(",")}]` : null,
              },
              { onConflict: "bank_name,card_name,benefit_title" }
            );

            if (error) {
              console.error("Error storing benefit:", error);
              errors.push(`Failed to store: ${benefit.title} - ${error.message}`);
            } else {
              benefitsStored++;
              console.log(`Stored benefit: ${benefit.title}`);
            }
          } catch (err) {
            console.error(`Error processing benefit ${benefit.title}:`, err);
            errors.push(`Error: ${benefit.title}`);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          bank: bankConfig.name,
          benefits_stored: benefitsStored,
          errors: errors.length > 0 ? errors : undefined,
          scraped_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "scrape-all") {
      console.log("Starting full population of all bank benefits...");

      const allResults: { bank: string; benefits: number; errors?: string[] }[] = [];

      for (const bankId of Object.keys(BANK_CONFIGS)) {
        const bankConfig = BANK_CONFIGS[bankId];
        console.log(`\n=== Processing ${bankConfig.name} ===`);

        const bankData = CARD_BENEFITS_DATA[bankConfig.name];
        if (!bankData) {
          allResults.push({ bank: bankConfig.name, benefits: 0, errors: ["No data"] });
          continue;
        }

        let bankBenefits = 0;
        const bankErrors: string[] = [];

        for (const card of bankData) {
          console.log(`Processing card: ${card.card_name}`);
          
          for (const benefit of card.benefits) {
            try {
              const benefitText = `${bankConfig.name} ${card.card_name}: ${benefit.title} - ${benefit.description}. ${benefit.conditions || ""}`;
              const embedding = await generateEmbedding(benefitText);

              const { error } = await supabase.from("card_benefits").upsert(
                {
                  bank_name: bankConfig.name,
                  card_name: card.card_name,
                  benefit_category: benefit.category,
                  benefit_title: benefit.title,
                  benefit_description: benefit.description,
                  conditions: benefit.conditions,
                  value_estimate: benefit.value_estimate,
                  is_active: true,
                  source_url: card.source_url,
                  last_updated: new Date().toISOString(),
                  embedding: embedding ? `[${embedding.join(",")}]` : null,
                },
                { onConflict: "bank_name,card_name,benefit_title" }
              );

              if (!error) {
                bankBenefits++;
                console.log(`Stored: ${card.card_name} - ${benefit.title}`);
              } else {
                bankErrors.push(`${benefit.title}: ${error.message}`);
              }
            } catch (err) {
              bankErrors.push(`Error: ${benefit.title}`);
            }
          }
        }

        allResults.push({
          bank: bankConfig.name,
          benefits: bankBenefits,
          errors: bankErrors.length > 0 ? bankErrors : undefined,
        });
      }

      const totalBenefits = allResults.reduce((sum, r) => sum + r.benefits, 0);

      return new Response(
        JSON.stringify({
          success: true,
          results: allResults,
          total_benefits: totalBenefits,
          scraped_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get-schedule") {
      return new Response(
        JSON.stringify({
          banks: Object.entries(BANK_CONFIGS).map(([id, config]) => ({
            id,
            name: config.name,
            frequency: config.updateFrequency,
          })),
          total_cards: Object.values(CARD_BENEFITS_DATA).reduce((sum, cards) => sum + cards.length, 0),
          total_benefits: Object.values(CARD_BENEFITS_DATA).reduce(
            (sum, cards) => sum + cards.reduce((s, c) => s + c.benefits.length, 0), 0
          ),
          next_full_scrape: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
