import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PII Patterns for masking
const PII_PATTERNS = {
  // Credit card numbers (various formats)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // Indian PAN number
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  // Aadhaar number
  aadhaar: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (Indian format)
  phone: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
  // Account numbers (8-18 digits)
  accountNumber: /\b\d{8,18}\b/g,
  // Names (capitalized words that might be names - simplified)
  possibleName: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g,
  // CVV
  cvv: /\bCVV[:\s]*\d{3,4}\b/gi,
  // Dates of birth patterns
  dob: /\b(?:DOB|Date of Birth|Born)[:\s]*\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi,
};

// Mask sensitive data
function maskPII(text: string): { maskedText: string; piiTypesFound: string[]; fieldsMasked: number } {
  let maskedText = text;
  const piiTypesFound: string[] = [];
  let fieldsMasked = 0;

  // Mask credit card numbers
  const creditCardMatches = maskedText.match(PII_PATTERNS.creditCard);
  if (creditCardMatches) {
    piiTypesFound.push("credit_card");
    fieldsMasked += creditCardMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.creditCard, (match) => {
      return "XXXX-XXXX-XXXX-" + match.slice(-4).replace(/[-\s]/g, "");
    });
  }

  // Mask PAN
  const panMatches = maskedText.match(PII_PATTERNS.pan);
  if (panMatches) {
    piiTypesFound.push("pan");
    fieldsMasked += panMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.pan, "XXXXX****X");
  }

  // Mask Aadhaar
  const aadhaarMatches = maskedText.match(PII_PATTERNS.aadhaar);
  if (aadhaarMatches) {
    piiTypesFound.push("aadhaar");
    fieldsMasked += aadhaarMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.aadhaar, "XXXX-XXXX-****");
  }

  // Mask email
  const emailMatches = maskedText.match(PII_PATTERNS.email);
  if (emailMatches) {
    piiTypesFound.push("email");
    fieldsMasked += emailMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.email, (match) => {
      const [local, domain] = match.split("@");
      return local.substring(0, 2) + "***@" + domain;
    });
  }

  // Mask phone
  const phoneMatches = maskedText.match(PII_PATTERNS.phone);
  if (phoneMatches) {
    piiTypesFound.push("phone");
    fieldsMasked += phoneMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.phone, (match) => {
      return match.slice(0, -4).replace(/\d/g, "X") + match.slice(-4);
    });
  }

  // Mask CVV
  const cvvMatches = maskedText.match(PII_PATTERNS.cvv);
  if (cvvMatches) {
    piiTypesFound.push("cvv");
    fieldsMasked += cvvMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.cvv, "CVV: XXX");
  }

  return { maskedText, piiTypesFound, fieldsMasked };
}

// Parse transaction from text line
function parseTransaction(line: string, cardName: string): any | null {
  // Common transaction patterns
  const patterns = [
    // Date Amount Description pattern
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(?:INR\s*)?([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(.+)/i,
    // Description Amount Date pattern
    /(.+?)\s+(?:INR\s*)?([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      let date, amount, description;
      
      // Determine which pattern matched
      if (/^\d/.test(match[1])) {
        [, date, amount, description] = match;
      } else {
        [, description, amount, date] = match;
      }

      // Parse amount
      const parsedAmount = parseFloat(amount.replace(/,/g, ""));
      
      // Categorize transaction
      const category = categorizeTransaction(description);
      
      // Calculate points (simplified - would use card-specific rules)
      const pointsEarned = calculatePoints(parsedAmount, category, cardName);

      return {
        transaction_date: parseDate(date),
        description: description.trim(),
        amount: parsedAmount,
        category,
        points_earned: pointsEarned,
        merchant_name: extractMerchant(description),
      };
    }
  }
  return null;
}

function parseDate(dateStr: string): string {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    let [day, month, year] = parts;
    if (year.length === 2) year = "20" + year;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  const categories: Record<string, string[]> = {
    "Travel": ["airline", "air india", "indigo", "spicejet", "makemytrip", "goibibo", "irctc", "uber", "ola", "rapido", "flight", "hotel", "booking"],
    "Dining": ["swiggy", "zomato", "restaurant", "cafe", "food", "dominos", "pizza", "mcdonalds", "kfc", "starbucks", "dunkin"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "nykaa", "bigbasket", "grofers", "blinkit", "mall", "store", "shop"],
    "Fuel": ["petrol", "diesel", "hp", "iocl", "bpcl", "fuel", "gas station", "shell"],
    "Entertainment": ["netflix", "prime video", "hotstar", "spotify", "bookmyshow", "pvr", "inox", "cinema"],
    "Utilities": ["electricity", "water", "gas", "broadband", "jio", "airtel", "vodafone", "postpaid"],
    "Insurance": ["insurance", "lic", "hdfc life", "icici prudential", "sbi life", "policy"],
    "Healthcare": ["pharmacy", "hospital", "doctor", "clinic", "apollo", "medplus", "1mg", "practo"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => desc.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

function calculatePoints(amount: number, category: string, cardName: string): number {
  // Card-specific reward rates (simplified)
  const rewardRates: Record<string, Record<string, number>> = {
    "Infinia": { "Travel": 5, "Dining": 3, "Shopping": 2, "Other": 1 },
    "Atlas": { "Travel": 5, "Dining": 2, "Shopping": 2, "Other": 1 },
    "Emeralde": { "Dining": 3, "Entertainment": 3, "Shopping": 2, "Other": 1 },
    "default": { "Travel": 2, "Dining": 2, "Shopping": 1, "Other": 1 },
  };

  const rates = rewardRates[cardName] || rewardRates["default"];
  const rate = rates[category] || rates["Other"];
  
  // Points per ₹100 spent
  return Math.floor((amount / 100) * rate);
}

function extractMerchant(description: string): string {
  // Extract first few words as merchant name
  const words = description.split(/\s+/).slice(0, 3);
  return words.join(" ").replace(/[^a-zA-Z0-9\s]/g, "").trim();
}

// Generate summary from parsed data
function generateSummary(transactions: any[], cardName: string): any {
  const totalSpend = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalPoints = transactions.reduce((sum, t) => sum + t.points_earned, 0);
  
  const byCategory = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const topMerchants = Object.entries(
    transactions.reduce((acc, t) => {
      acc[t.merchant_name] = (acc[t.merchant_name] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>)
  )
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  return {
    card_name: cardName,
    total_spend: totalSpend,
    total_points_earned: totalPoints,
    transaction_count: transactions.length,
    spending_by_category: byCategory,
    top_merchants: topMerchants,
    statement_period: {
      start: transactions[transactions.length - 1]?.transaction_date,
      end: transactions[0]?.transaction_date,
    },
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

    const { documentId, userId, rawText, cardName = "default" } = await req.json();

    if (!rawText) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsing document ${documentId} for user ${userId}`);

    // Step 1: Mask PII
    const { maskedText, piiTypesFound, fieldsMasked } = maskPII(rawText);
    console.log(`Masked ${fieldsMasked} PII fields: ${piiTypesFound.join(", ")}`);

    // Log PII masking
    if (fieldsMasked > 0) {
      await supabase.from("pii_masking_log").insert({
        user_id: userId,
        source_type: "pdf_statement",
        pii_types_found: piiTypesFound,
        fields_masked: fieldsMasked,
      });
    }

    // Step 2: Parse transactions
    const lines = maskedText.split("\n").filter((line) => line.trim());
    const transactions: any[] = [];

    for (const line of lines) {
      const transaction = parseTransaction(line, cardName);
      if (transaction) {
        transactions.push({
          ...transaction,
          user_id: userId,
          document_id: documentId,
          is_masked: fieldsMasked > 0,
        });
      }
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Step 3: Insert transactions
    if (transactions.length > 0) {
      const { error: txError } = await supabase
        .from("transactions")
        .insert(transactions);

      if (txError) {
        console.error("Error inserting transactions:", txError);
      }
    }

    // Step 4: Generate summary
    const summary = generateSummary(transactions, cardName);

    // Step 5: Update document with parsed data
    await supabase
      .from("pdf_documents")
      .update({ parsed_data: summary })
      .eq("id", documentId);

    // Step 6: Create document chunks for RAG
    const chunks = [];
    const chunkSize = 500;
    for (let i = 0; i < maskedText.length; i += chunkSize) {
      chunks.push({
        user_id: userId,
        document_id: documentId,
        chunk_text: maskedText.slice(i, i + chunkSize),
        chunk_index: Math.floor(i / chunkSize),
        metadata: {
          card_name: cardName,
          document_type: "statement",
          has_pii_masked: fieldsMasked > 0,
        },
      });
    }

    if (chunks.length > 0) {
      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert(chunks);

      if (chunkError) {
        console.error("Error inserting chunks:", chunkError);
      }
    }

    // Step 7: Log compliance
    await supabase.from("compliance_logs").insert({
      user_id: userId,
      action: "parse_statement",
      resource_type: "pdf_document",
      resource_id: documentId,
      pii_accessed: piiTypesFound.length > 0,
      pii_masked: fieldsMasked > 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        transactions_parsed: transactions.length,
        chunks_created: chunks.length,
        pii_masked: fieldsMasked,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Parse PDF error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
