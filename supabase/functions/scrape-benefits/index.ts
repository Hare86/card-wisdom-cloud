import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bank scraping configurations (simulated - in production would use real endpoints)
const BANK_CONFIGS: Record<string, { name: string; updateFrequency: string; endpoints: string[] }> = {
  hdfc: {
    name: "HDFC Bank",
    updateFrequency: "weekly",
    endpoints: ["benefits", "offers", "partners"],
  },
  axis: {
    name: "Axis Bank",
    updateFrequency: "weekly",
    endpoints: ["benefits", "offers", "partners"],
  },
  icici: {
    name: "ICICI Bank",
    updateFrequency: "weekly",
    endpoints: ["benefits", "offers", "partners"],
  },
  sbi: {
    name: "SBI Card",
    updateFrequency: "weekly",
    endpoints: ["benefits", "offers", "partners"],
  },
};

// Simulated card benefits data (in production, would scrape from bank portals)
const CARD_BENEFITS_DATA: Record<string, any[]> = {
  "HDFC Bank": [
    {
      card_name: "Infinia",
      benefits: [
        { category: "Travel", title: "5X Reward Points on Travel", description: "Earn 5 reward points per ₹150 spent on travel bookings via SmartBuy portal", conditions: "Maximum 25,000 points per calendar month", value_estimate: 5000 },
        { category: "Lounge", title: "Unlimited Lounge Access", description: "Complimentary access to 1000+ airport lounges worldwide via Priority Pass", conditions: "Primary and add-on card holders eligible", value_estimate: 20000 },
        { category: "Transfer", title: "KrisFlyer Transfer", description: "Transfer points to Singapore Airlines KrisFlyer at 1:1 ratio", conditions: "Minimum 2,500 points per transfer", value_estimate: 0 },
        { category: "Concierge", title: "24/7 Concierge", description: "Personal concierge service for travel, dining, and lifestyle requests", conditions: "Available globally", value_estimate: 5000 },
        { category: "Golf", title: "Complimentary Golf", description: "2 complimentary golf games per quarter at select courses", conditions: "Booking required 48 hours in advance", value_estimate: 8000 },
      ],
    },
    {
      card_name: "Diners Club Black",
      benefits: [
        { category: "Dining", title: "10X on Dining", description: "Earn 10 reward points per ₹150 on dining transactions", conditions: "At select partner restaurants", value_estimate: 3000 },
        { category: "Lounge", title: "Airport Lounge Access", description: "Unlimited domestic and international lounge access", conditions: "Via Diners Club lounges", value_estimate: 15000 },
        { category: "Insurance", title: "Travel Insurance", description: "Complimentary travel insurance up to ₹1 Crore", conditions: "When ticket booked with card", value_estimate: 5000 },
      ],
    },
  ],
  "Axis Bank": [
    {
      card_name: "Atlas",
      benefits: [
        { category: "Travel", title: "5X Edge Miles on Travel", description: "Earn 5 Edge Miles per ₹100 on travel spends", conditions: "International and domestic travel eligible", value_estimate: 4000 },
        { category: "Transfer", title: "12 Airline Partners", description: "Transfer Edge Miles to 12+ airline frequent flyer programs", conditions: "Minimum 5,000 miles per transfer", value_estimate: 0 },
        { category: "Lounge", title: "8 Lounge Visits/Quarter", description: "Complimentary airport lounge access via Priority Pass", conditions: "Per quarter limit applies", value_estimate: 8000 },
        { category: "Milestone", title: "Annual Milestone Bonus", description: "Earn bonus 25,000 Edge Miles on spending ₹7.5L annually", conditions: "Calculated on card anniversary", value_estimate: 10000 },
      ],
    },
    {
      card_name: "Reserve",
      benefits: [
        { category: "Dining", title: "Fine Dining Program", description: "Up to 25% off at 500+ premium restaurants", conditions: "Booking via Axis dining portal", value_estimate: 5000 },
        { category: "Lifestyle", title: "Lifestyle Benefits", description: "Complimentary memberships to gym, spa, and wellness centers", conditions: "Select partners only", value_estimate: 10000 },
      ],
    },
  ],
  "ICICI Bank": [
    {
      card_name: "Emeralde",
      benefits: [
        { category: "Dining", title: "3X on Dining", description: "Triple reward points on all dining spends", conditions: "Includes food delivery apps", value_estimate: 2500 },
        { category: "Entertainment", title: "3X on Entertainment", description: "Triple points on movies, OTT subscriptions, and events", conditions: "Select merchants", value_estimate: 2000 },
        { category: "Lounge", title: "4 Lounge Visits/Quarter", description: "Domestic airport lounge access", conditions: "Via Mastercard lounges", value_estimate: 4000 },
        { category: "Shopping", title: "Buy 1 Get 1 Movies", description: "BOGO on movie tickets at select multiplexes", conditions: "Maximum 2 per month", value_estimate: 2400 },
      ],
    },
    {
      card_name: "Sapphiro",
      benefits: [
        { category: "Golf", title: "Golf Privileges", description: "Complimentary golf rounds at partner courses", conditions: "2 rounds per month", value_estimate: 6000 },
        { category: "Concierge", title: "Concierge Services", description: "24/7 personal assistance for travel and lifestyle", conditions: "India and select international", value_estimate: 3000 },
      ],
    },
  ],
};

// Simulate scraping with anti-detection measures
async function simulateScrape(bank: string, endpoint: string): Promise<any> {
  // In production, this would:
  // 1. Use rotating proxies
  // 2. Implement random delays
  // 3. Handle CAPTCHAs
  // 4. Use browser automation (Puppeteer/Playwright)
  // 5. Respect robots.txt and rate limits

  // Add random delay to simulate real scraping
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));

  const bankData = CARD_BENEFITS_DATA[BANK_CONFIGS[bank]?.name];
  if (!bankData) return null;

  return {
    bank: BANK_CONFIGS[bank].name,
    endpoint,
    data: bankData,
    scraped_at: new Date().toISOString(),
  };
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
      // Scrape specific bank
      const bankConfig = BANK_CONFIGS[bank];
      if (!bankConfig) {
        return new Response(JSON.stringify({ error: "Unknown bank" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Scraping ${bankConfig.name}...`);

      const results = [];
      for (const endpoint of bankConfig.endpoints) {
        const data = await simulateScrape(bank, endpoint);
        if (data) results.push(data);
      }

      // Process and store benefits
      let benefitsStored = 0;
      for (const result of results) {
        for (const card of result.data) {
          for (const benefit of card.benefits) {
            const { error } = await supabase.from("card_benefits").upsert(
              {
                bank_name: result.bank,
                card_name: card.card_name,
                benefit_category: benefit.category,
                benefit_title: benefit.title,
                benefit_description: benefit.description,
                conditions: benefit.conditions,
                value_estimate: benefit.value_estimate,
                is_active: true,
                source_url: `https://${bank}.com/cards/${card.card_name.toLowerCase()}`,
                last_updated: new Date().toISOString(),
              },
              { onConflict: "bank_name,card_name,benefit_title" }
            );

            if (!error) benefitsStored++;
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          bank: bankConfig.name,
          benefits_stored: benefitsStored,
          scraped_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "scrape-all") {
      // Scrape all banks
      console.log("Starting full scrape of all banks...");

      const allResults = [];
      for (const bankId of Object.keys(BANK_CONFIGS)) {
        const bankConfig = BANK_CONFIGS[bankId];
        console.log(`Scraping ${bankConfig.name}...`);

        for (const endpoint of bankConfig.endpoints) {
          const data = await simulateScrape(bankId, endpoint);
          if (data) {
            for (const card of data.data) {
              for (const benefit of card.benefits) {
                await supabase.from("card_benefits").upsert(
                  {
                    bank_name: data.bank,
                    card_name: card.card_name,
                    benefit_category: benefit.category,
                    benefit_title: benefit.title,
                    benefit_description: benefit.description,
                    conditions: benefit.conditions,
                    value_estimate: benefit.value_estimate,
                    is_active: true,
                    last_updated: new Date().toISOString(),
                  },
                  { onConflict: "bank_name,card_name,benefit_title" }
                );
              }
            }
            allResults.push({ bank: data.bank, cards: data.data.length });
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          results: allResults,
          scraped_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get-schedule") {
      // Return scraping schedule
      return new Response(
        JSON.stringify({
          banks: Object.entries(BANK_CONFIGS).map(([id, config]) => ({
            id,
            name: config.name,
            frequency: config.updateFrequency,
            endpoints: config.endpoints,
          })),
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
