import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PII Patterns for masking
const PII_PATTERNS = {
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  aadhaar: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
  cvv: /\bCVV[:\s]*\d{3,4}\b/gi,
};

function maskPII(text: string): { maskedText: string; piiTypesFound: string[]; fieldsMasked: number } {
  let maskedText = text;
  const piiTypesFound: string[] = [];
  let fieldsMasked = 0;

  const creditCardMatches = maskedText.match(PII_PATTERNS.creditCard);
  if (creditCardMatches) {
    piiTypesFound.push("credit_card");
    fieldsMasked += creditCardMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.creditCard, (match) => {
      return "XXXX-XXXX-XXXX-" + match.slice(-4).replace(/[-\s]/g, "");
    });
  }

  const panMatches = maskedText.match(PII_PATTERNS.pan);
  if (panMatches) {
    piiTypesFound.push("pan");
    fieldsMasked += panMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.pan, "XXXXX****X");
  }

  const aadhaarMatches = maskedText.match(PII_PATTERNS.aadhaar);
  if (aadhaarMatches) {
    piiTypesFound.push("aadhaar");
    fieldsMasked += aadhaarMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.aadhaar, "XXXX-XXXX-****");
  }

  const emailMatches = maskedText.match(PII_PATTERNS.email);
  if (emailMatches) {
    piiTypesFound.push("email");
    fieldsMasked += emailMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.email, (match) => {
      const [local, domain] = match.split("@");
      return local.substring(0, 2) + "***@" + domain;
    });
  }

  const phoneMatches = maskedText.match(PII_PATTERNS.phone);
  if (phoneMatches) {
    piiTypesFound.push("phone");
    fieldsMasked += phoneMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.phone, (match) => {
      return match.slice(0, -4).replace(/\d/g, "X") + match.slice(-4);
    });
  }

  const cvvMatches = maskedText.match(PII_PATTERNS.cvv);
  if (cvvMatches) {
    piiTypesFound.push("cvv");
    fieldsMasked += cvvMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.cvv, "CVV: XXX");
  }

  return { maskedText, piiTypesFound, fieldsMasked };
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  const categories: Record<string, string[]> = {
    "Travel": ["airline", "air india", "indigo", "spicejet", "makemytrip", "goibibo", "irctc", "uber", "ola", "rapido", "flight", "hotel", "booking", "airways", "cab", "taxi"],
    "Dining": ["swiggy", "zomato", "restaurant", "cafe", "food", "dominos", "pizza", "mcdonalds", "kfc", "starbucks", "dunkin", "barbeque", "dine"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "nykaa", "bigbasket", "grofers", "blinkit", "mall", "store", "shop", "mart", "retail"],
    "Fuel": ["petrol", "diesel", "hp", "iocl", "bpcl", "fuel", "gas station", "shell", "indian oil"],
    "Entertainment": ["netflix", "prime video", "hotstar", "spotify", "bookmyshow", "pvr", "inox", "cinema", "disney", "youtube"],
    "Utilities": ["electricity", "water", "gas", "broadband", "jio", "airtel", "vodafone", "postpaid", "recharge", "bill"],
    "Insurance": ["insurance", "lic", "hdfc life", "icici prudential", "sbi life", "policy", "premium"],
    "Healthcare": ["pharmacy", "hospital", "doctor", "clinic", "apollo", "medplus", "1mg", "practo", "medical", "health"],
    "Groceries": ["grocery", "supermarket", "dmart", "reliance fresh", "more", "spencer", "nature's basket"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => desc.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

function calculatePoints(amount: number, category: string, cardName: string): number {
  const rewardRates: Record<string, Record<string, number>> = {
    "Infinia": { "Travel": 5, "Dining": 3, "Shopping": 2, "Other": 1 },
    "Atlas": { "Travel": 5, "Dining": 2, "Shopping": 2, "Other": 1 },
    "Emeralde": { "Dining": 3, "Entertainment": 3, "Shopping": 2, "Other": 1 },
    "Diners Club Black": { "Travel": 5, "Dining": 5, "Shopping": 2, "Other": 1 },
    "Reserve": { "Travel": 5, "Dining": 3, "Entertainment": 3, "Other": 1 },
    "default": { "Travel": 2, "Dining": 2, "Shopping": 1, "Other": 1 },
  };

  const rates = rewardRates[cardName] || rewardRates["default"];
  const rate = rates[category] || rates["Other"];
  return Math.floor((amount / 100) * rate);
}

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

// Extract transactions from PDF using Lovable AI vision model
async function extractTransactionsWithAI(pdfBase64: string, cardName: string): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = `You are a credit card statement parser. Extract ALL transactions from this credit card statement image/PDF.

For each transaction, extract:
- date: The transaction date in YYYY-MM-DD format
- description: The merchant name or transaction description  
- amount: The transaction amount as a positive number (without currency symbols)
- merchant: The simplified merchant name (e.g., "Amazon", "Swiggy", "MakeMyTrip")

Return ONLY valid JSON array with no markdown or explanations. Example format:
[
  {"date": "2024-01-15", "description": "AMAZON IN MUMBAI", "amount": 2500.00, "merchant": "Amazon"},
  {"date": "2024-01-14", "description": "SWIGGY ORDER", "amount": 450.50, "merchant": "Swiggy"}
]

If you cannot extract transactions, return an empty array: []
Parse ALL visible transactions. Include both credits and debits.`;

  console.log("Calling Lovable AI to extract transactions from PDF...");

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            {
              type: "text",
              text: `Extract all transactions from this ${cardName} credit card statement. Return ONLY a JSON array.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "[]";
  
  console.log("AI response received, parsing transactions...");
  
  // Parse the JSON response
  try {
    // Clean up response - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();
    
    const transactions = JSON.parse(cleanContent);
    if (!Array.isArray(transactions)) {
      console.warn("AI did not return an array, returning empty");
      return [];
    }
    return transactions;
  } catch (e) {
    console.error("Failed to parse AI response:", e, content);
    return [];
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

    const { documentId, userId, filePath, cardName = "default" } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: "No file path provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsing document ${documentId} for user ${userId}, file: ${filePath}`);

    // Step 1: Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdf-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download PDF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Downloaded PDF, size: ${fileData.size} bytes`);

    // Step 2: Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const pdfBase64 = btoa(binary);

    // Step 3: Extract transactions using Lovable AI vision
    const rawTransactions = await extractTransactionsWithAI(pdfBase64, cardName);
    console.log(`AI extracted ${rawTransactions.length} raw transactions`);

    // Step 4: Process and enrich transactions
    const transactions: any[] = [];
    for (const tx of rawTransactions) {
      // Mask PII in description
      const { maskedText, piiTypesFound, fieldsMasked } = maskPII(tx.description || "");
      
      const category = categorizeTransaction(tx.description || tx.merchant || "");
      const amount = Math.abs(parseFloat(tx.amount) || 0);
      const pointsEarned = calculatePoints(amount, category, cardName);

      transactions.push({
        user_id: userId,
        document_id: documentId,
        transaction_date: tx.date || new Date().toISOString().split("T")[0],
        description: maskedText,
        amount: amount,
        category: category,
        points_earned: pointsEarned,
        merchant_name: tx.merchant || maskedText.split(" ").slice(0, 2).join(" "),
        is_masked: fieldsMasked > 0,
      });
    }

    console.log(`Processed ${transactions.length} transactions`);

    // Step 5: Log PII masking
    const allPiiTypes = new Set<string>();
    let totalFieldsMasked = 0;
    for (const tx of rawTransactions) {
      const { piiTypesFound, fieldsMasked } = maskPII(tx.description || "");
      piiTypesFound.forEach(t => allPiiTypes.add(t));
      totalFieldsMasked += fieldsMasked;
    }

    if (totalFieldsMasked > 0) {
      await supabase.from("pii_masking_log").insert({
        user_id: userId,
        source_type: "pdf_statement",
        pii_types_found: Array.from(allPiiTypes),
        fields_masked: totalFieldsMasked,
      });
    }

    // Step 6: Insert transactions
    if (transactions.length > 0) {
      const { error: txError } = await supabase
        .from("transactions")
        .insert(transactions);

      if (txError) {
        console.error("Error inserting transactions:", txError);
      }
    }

    // Step 7: Generate summary
    const summary = generateSummary(transactions, cardName);

    // Step 8: Update document with parsed data
    await supabase
      .from("pdf_documents")
      .update({ parsed_data: summary })
      .eq("id", documentId);

    // Step 9: Create document chunks for RAG
    const chunkTexts: string[] = [];
    
    // Create summary chunk
    chunkTexts.push(`Credit Card Statement Summary for ${cardName}:
Total Spend: ₹${summary.total_spend.toLocaleString()}
Total Points Earned: ${summary.total_points_earned}
Transaction Count: ${summary.transaction_count}
Statement Period: ${summary.statement_period.start} to ${summary.statement_period.end}
Top Categories: ${Object.entries(summary.spending_by_category)
  .sort(([,a], [,b]) => (b as number) - (a as number))
  .slice(0, 5)
  .map(([cat, amt]) => `${cat}: ₹${(amt as number).toLocaleString()}`)
  .join(", ")}`);

    // Create transaction chunks (grouped)
    const txChunks: string[] = [];
    let currentChunk = "";
    for (const tx of transactions) {
      const txText = `${tx.transaction_date}: ${tx.merchant_name} - ₹${tx.amount} (${tx.category}, ${tx.points_earned} pts)`;
      if (currentChunk.length + txText.length > 400) {
        txChunks.push(currentChunk);
        currentChunk = txText;
      } else {
        currentChunk += (currentChunk ? "\n" : "") + txText;
      }
    }
    if (currentChunk) txChunks.push(currentChunk);
    chunkTexts.push(...txChunks);

    const chunks = chunkTexts.map((text, idx) => ({
      user_id: userId,
      document_id: documentId,
      chunk_text: text,
      chunk_index: idx,
      metadata: {
        card_name: cardName,
        document_type: "statement",
        chunk_type: idx === 0 ? "summary" : "transactions",
      },
    }));

    if (chunks.length > 0) {
      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert(chunks);

      if (chunkError) {
        console.error("Error inserting chunks:", chunkError);
      }
    }

    // Step 10: Log compliance
    await supabase.from("compliance_logs").insert({
      user_id: userId,
      action: "parse_statement",
      resource_type: "pdf_document",
      resource_id: documentId,
      pii_accessed: allPiiTypes.size > 0,
      pii_masked: totalFieldsMasked > 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        transactions_parsed: transactions.length,
        chunks_created: chunks.length,
        pii_masked: totalFieldsMasked,
        extraction_method: "ai_vision",
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
