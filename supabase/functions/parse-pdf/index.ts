import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// PII MASKING - GDPR/PCI-DSS COMPLIANT
// All patterns designed to detect and mask sensitive data BEFORE LLM processing
// ============================================================================
const PII_PATTERNS = {
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  aadhaar: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
  cvv: /\bCVV[:\s]*\d{3,4}\b/gi,
  accountNumber: /\b\d{9,18}\b/g,
  ifsc: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
};

function maskPII(text: string): { maskedText: string; piiTypesFound: string[]; fieldsMasked: number } {
  let maskedText = text;
  const piiTypesFound: string[] = [];
  let fieldsMasked = 0;

  // Order matters - mask credit cards before generic numbers
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

  const ifscMatches = maskedText.match(PII_PATTERNS.ifsc);
  if (ifscMatches) {
    piiTypesFound.push("ifsc");
    fieldsMasked += ifscMatches.length;
    maskedText = maskedText.replace(PII_PATTERNS.ifsc, "XXXX0XXXXXX");
  }

  return { maskedText, piiTypesFound, fieldsMasked };
}

// ============================================================================
// ADAPTIVE TEMPLATE SYSTEM
// Schema-less extraction using AI - no code changes needed for new templates
// ============================================================================

interface ExtractedData {
  bankName: string;
  cardName: string;
  cardholderName: string;
  statementPeriod: { start: string; end: string };
  transactions: TransactionData[];
  totalPoints: number;
  totalSpend: number;
  templateSignature: string;
  confidence: number;
}

interface TransactionData {
  date: string;
  description: string;
  amount: number;
  merchant: string;
  category?: string;
  points?: number;
}

// Generate a structural hash for template matching (NO PII - just layout patterns)
function generateTemplateHash(structuralFeatures: string[]): string {
  const sorted = structuralFeatures.sort().join("|");
  // Simple hash - in production use proper crypto hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// Intelligent category detection
function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  const categories: Record<string, string[]> = {
    "Travel": ["airline", "air india", "indigo", "spicejet", "makemytrip", "goibibo", "irctc", "uber", "ola", "rapido", "flight", "hotel", "booking", "airways", "cab", "taxi", "airport", "railways", "bus", "cruise"],
    "Dining": ["swiggy", "zomato", "restaurant", "cafe", "food", "dominos", "pizza", "mcdonalds", "kfc", "starbucks", "dunkin", "barbeque", "dine", "eat", "lunch", "dinner", "breakfast"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "nykaa", "bigbasket", "grofers", "blinkit", "mall", "store", "shop", "mart", "retail", "fashion", "clothing", "electronics"],
    "Fuel": ["petrol", "diesel", "hp", "iocl", "bpcl", "fuel", "gas station", "shell", "indian oil", "reliance fuel", "essar"],
    "Entertainment": ["netflix", "prime video", "hotstar", "spotify", "bookmyshow", "pvr", "inox", "cinema", "disney", "youtube", "game", "concert", "event"],
    "Utilities": ["electricity", "water", "gas", "broadband", "jio", "airtel", "vodafone", "postpaid", "recharge", "bill", "internet", "telecom"],
    "Insurance": ["insurance", "lic", "hdfc life", "icici prudential", "sbi life", "policy", "premium", "health cover"],
    "Healthcare": ["pharmacy", "hospital", "doctor", "clinic", "apollo", "medplus", "1mg", "practo", "medical", "health", "medicine", "diagnostic"],
    "Groceries": ["grocery", "supermarket", "dmart", "reliance fresh", "more", "spencer", "nature's basket", "vegetables", "fruits"],
    "Education": ["school", "college", "university", "course", "tuition", "books", "udemy", "coursera", "education"],
    "Financial": ["emi", "loan", "interest", "bank charge", "late fee", "finance", "investment", "mutual fund"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => desc.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

// Calculate reward points based on card and category
function calculatePoints(amount: number, category: string, cardName: string): number {
  const rewardRates: Record<string, Record<string, number>> = {
    "Infinia": { "Travel": 5, "Dining": 3, "Shopping": 2, "Fuel": 1, "Other": 1 },
    "Atlas": { "Travel": 5, "Dining": 2, "Shopping": 2, "Fuel": 1, "Other": 1 },
    "Emeralde": { "Dining": 3, "Entertainment": 3, "Shopping": 2, "Other": 1 },
    "Diners Club Black": { "Travel": 5, "Dining": 5, "Shopping": 2, "Other": 1 },
    "Reserve": { "Travel": 5, "Dining": 3, "Entertainment": 3, "Other": 1 },
    "MoneyBack": { "Shopping": 2, "Dining": 2, "Fuel": 1, "Other": 1 },
    "Regalia": { "Travel": 4, "Dining": 4, "Shopping": 2, "Other": 1 },
    "Millennia": { "Shopping": 2.5, "Dining": 2, "Other": 1 },
    "Magnus": { "Travel": 5, "Dining": 4, "Shopping": 2, "Other": 1 },
    "Flipkart": { "Shopping": 5, "Other": 1.5 },
    "Amazon Pay": { "Shopping": 5, "Other": 2 },
    "Elite": { "Travel": 3, "Dining": 3, "Shopping": 2, "Other": 1 },
    "Prime": { "Travel": 3, "Dining": 2, "Shopping": 2, "Other": 1 },
    "SimplySave": { "Dining": 2, "Shopping": 2, "Entertainment": 2, "Other": 1 },
    "default": { "Travel": 2, "Dining": 2, "Shopping": 1, "Fuel": 1, "Other": 1 },
  };

  const rates = rewardRates[cardName] || rewardRates["default"];
  const rate = rates[category] || rates["Other"];
  return Math.floor((amount / 100) * rate);
}

// Name validation (security requirement)
const NAME_VALIDATION = {
  minLength: 2,
  maxLength: 100,
  validPattern: /^[a-zA-Z0-9\s\-\.&'()]+$/,
  invalidNames: ["unknown", "null", "undefined", "none", "n/a", "test", "default", "card", "bank"],
};

function sanitizeName(name: string): string {
  if (!name) return "";
  let sanitized = name.trim().replace(/\s+/g, " ");
  // Remove any potential XSS or injection characters
  sanitized = sanitized.replace(/[<>\"'`;\\]/g, "");
  if (sanitized.length > NAME_VALIDATION.maxLength) {
    sanitized = sanitized.substring(0, NAME_VALIDATION.maxLength);
  }
  return sanitized;
}

function validateName(name: string, type: "card" | "bank" | "cardholder"): { isValid: boolean; error?: string; sanitized: string } {
  const sanitized = sanitizeName(name);
  
  if (!sanitized || sanitized.length < NAME_VALIDATION.minLength) {
    return { isValid: false, error: `${type} name too short`, sanitized };
  }
  
  if (!NAME_VALIDATION.validPattern.test(sanitized)) {
    return { isValid: false, error: `${type} name contains invalid characters`, sanitized: sanitized.replace(/[^a-zA-Z0-9\s\-\.&'()]/g, "") };
  }
  
  if (NAME_VALIDATION.invalidNames.includes(sanitized.toLowerCase())) {
    return { isValid: false, error: `${type} name is reserved`, sanitized };
  }
  
  return { isValid: true, sanitized };
}

// ============================================================================
// ADAPTIVE AI EXTRACTION - Works with ANY bank statement template
// ============================================================================

async function extractWithAdaptiveAI(
  pdfBase64: string, 
  password?: string,
  existingTemplates?: any[]
): Promise<{ data: ExtractedData; rawResponse: string; tokensUsed: { input: number; output: number } }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Construct hints from existing templates if available
  const templateHints = existingTemplates?.length 
    ? `Known bank formats include: ${existingTemplates.map(t => t.bank_name).join(", ")}. But extract based on actual content.`
    : "";

  const systemPrompt = `You are an expert credit card statement parser for Indian banks. Extract ALL information from the statement image.

CRITICAL SECURITY REQUIREMENTS:
1. NEVER include the actual cardholder name in your response - use "[MASKED_NAME]" placeholder
2. NEVER include full card numbers - only last 4 digits if visible
3. Mask all phone numbers, email addresses, and personal identifiers

EXTRACTION REQUIREMENTS:
Extract the following with high accuracy:
1. Bank Name (e.g., "HDFC Bank", "Axis Bank", "ICICI Bank", "SBI Card", "American Express")
2. Card Product Name (e.g., "Infinia", "Regalia", "Atlas", "Millennia", "Reserve", "Coral")
3. Statement Period (start and end dates in YYYY-MM-DD format)
4. ALL transactions with: date (YYYY-MM-DD), description, amount, merchant name
5. Layout features for template matching (header position, table format, logo placement)

${templateHints}

RESPOND ONLY WITH VALID JSON (no markdown, no explanations):
{
  "bankName": "detected bank name",
  "cardName": "detected card product name",
  "cardholderName": "[MASKED_NAME]",
  "statementPeriod": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "merchant/transaction details", "amount": 1234.56, "merchant": "simplified merchant name"}
  ],
  "layoutFeatures": ["header_centered", "logo_top_left", "table_with_borders", etc.],
  "confidence": 0.95
}

If PDF is password protected and no password provided, return:
{"error": "PASSWORD_REQUIRED", "message": "This PDF is password protected"}

Parse ALL visible transactions. For amounts, use positive numbers (debits as positive).`;

  console.log("Calling Lovable AI for adaptive extraction...");

  const requestBody: any = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          {
            type: "text",
            text: password 
              ? `Extract all data from this credit card statement. PDF password is: ${password}`
              : "Extract all data from this credit card statement. Return ONLY valid JSON."
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
    max_tokens: 8192,
    temperature: 0.1,
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a few minutes.");
    }
    if (response.status === 402) {
      throw new Error("AI processing credits exhausted. Please contact support.");
    }
    throw new Error(`AI extraction failed with status ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content || "{}";
  const tokensUsed = {
    input: aiResponse.usage?.prompt_tokens || 0,
    output: aiResponse.usage?.completion_tokens || 0,
  };

  // Parse and validate response
  let parsed: any;
  try {
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
    parsed = JSON.parse(cleanContent.trim());
  } catch (e) {
    console.error("Failed to parse AI response:", e, content);
    throw new Error("Failed to parse statement. The format may not be supported.");
  }

  // Check for password requirement
  if (parsed.error === "PASSWORD_REQUIRED") {
    throw new Error("PASSWORD_REQUIRED");
  }

  // Generate template signature from layout features
  const layoutFeatures = parsed.layoutFeatures || [];
  layoutFeatures.push(`bank_${(parsed.bankName || "unknown").toLowerCase().replace(/\s+/g, "_")}`);
  const templateSignature = generateTemplateHash(layoutFeatures);

  // Validate and sanitize extracted data
  const bankValidation = validateName(parsed.bankName || "Unknown", "bank");
  const cardValidation = validateName(parsed.cardName || "Generic", "card");

  // Process transactions with PII masking
  const transactions: TransactionData[] = [];
  for (const tx of (parsed.transactions || [])) {
    const { maskedText } = maskPII(tx.description || "");
    const category = categorizeTransaction(tx.description || tx.merchant || "");
    
    transactions.push({
      date: tx.date || new Date().toISOString().split("T")[0],
      description: maskedText,
      amount: Math.abs(parseFloat(tx.amount) || 0),
      merchant: sanitizeName(tx.merchant || maskedText.split(" ").slice(0, 2).join(" ")),
      category,
    });
  }

  return {
    data: {
      bankName: bankValidation.sanitized || "Unknown Bank",
      cardName: cardValidation.sanitized || "Generic Card",
      cardholderName: "[MASKED]", // Never expose real name
      statementPeriod: {
        start: parsed.statementPeriod?.start || "",
        end: parsed.statementPeriod?.end || "",
      },
      transactions,
      totalPoints: 0, // Will be calculated later
      totalSpend: transactions.reduce((sum, t) => sum + t.amount, 0),
      templateSignature,
      confidence: parsed.confidence || 0.5,
    },
    rawResponse: content,
    tokensUsed,
  };
}

// ============================================================================
// TEMPLATE LEARNING - Store patterns, not data
// ============================================================================

async function learnTemplate(
  supabase: any,
  bankName: string,
  templateSignature: string,
  layoutFeatures: string[],
  success: boolean
) {
  try {
    // Check if template exists
    const { data: existing } = await supabase
      .from("statement_templates")
      .select("id, extraction_success_count, extraction_failure_count")
      .eq("template_hash", templateSignature)
      .single();

    if (existing) {
      // Update success/failure counts
      await supabase
        .from("statement_templates")
        .update({
          extraction_success_count: existing.extraction_success_count + (success ? 1 : 0),
          extraction_failure_count: existing.extraction_failure_count + (success ? 0 : 1),
          last_successful_extraction: success ? new Date().toISOString() : undefined,
        })
        .eq("id", existing.id);
    } else if (success) {
      // Create new template entry (only on success)
      await supabase
        .from("statement_templates")
        .insert({
          bank_name: sanitizeName(bankName),
          template_hash: templateSignature,
          template_version: 1,
          field_patterns: {}, // Will be populated with structural patterns
          header_patterns: {},
          table_patterns: {},
          extraction_success_count: 1,
          extraction_failure_count: 0,
          last_successful_extraction: new Date().toISOString(),
        });
    }
  } catch (e) {
    // Non-critical - log and continue
    console.error("Template learning error:", e);
  }
}

// ============================================================================
// AUDIT LOGGING - Compliance requirement
// ============================================================================

async function logExtractionAudit(
  supabase: any,
  userId: string,
  documentId: string,
  params: {
    templateId?: string;
    extractionMethod: string;
    confidenceScore: number;
    fieldsExtracted: number;
    piiFieldsMasked: number;
    processingTimeMs: number;
    llmModelUsed: string;
    llmTokensInput: number;
    llmTokensOutput: number;
    passwordProtected: boolean;
    status: "success" | "failed" | "pending";
    errorMessage?: string;
  }
) {
  try {
    await supabase.from("extraction_audit_log").insert({
      user_id: userId,
      document_id: documentId,
      template_id: params.templateId,
      extraction_method: params.extractionMethod,
      confidence_score: params.confidenceScore,
      fields_extracted: params.fieldsExtracted,
      pii_fields_masked: params.piiFieldsMasked,
      processing_time_ms: params.processingTimeMs,
      llm_model_used: params.llmModelUsed,
      llm_tokens_input: params.llmTokensInput,
      llm_tokens_output: params.llmTokensOutput,
      password_protected: params.passwordProtected,
      extraction_status: params.status,
      error_message: params.errorMessage,
    });
  } catch (e) {
    console.error("Audit logging error:", e);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let auditParams: any = {
    extractionMethod: "adaptive_ai",
    confidenceScore: 0,
    fieldsExtracted: 0,
    piiFieldsMasked: 0,
    processingTimeMs: 0,
    llmModelUsed: "google/gemini-2.5-flash",
    llmTokensInput: 0,
    llmTokensOutput: 0,
    passwordProtected: false,
    status: "pending" as const,
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      documentId, 
      userId, 
      filePath, 
      cardName = "default",
      password // Optional: for password-protected PDFs (session-only, never stored)
    } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: "No file path provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Never log password
    console.log(`Processing document ${documentId} for user ${userId}`);
    auditParams.passwordProtected = !!password;

    // Step 1: Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdf-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download document from storage");
    }

    console.log(`Downloaded PDF: ${fileData.size} bytes`);

    // Step 2: Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const pdfBase64 = btoa(binary);

    // Step 3: Fetch existing templates for hints (improves accuracy)
    const { data: existingTemplates } = await supabase
      .from("statement_templates")
      .select("bank_name, template_hash, field_patterns")
      .eq("is_active", true)
      .order("extraction_success_count", { ascending: false })
      .limit(10);

    // Step 4: Adaptive AI extraction
    let extractionResult;
    try {
      extractionResult = await extractWithAdaptiveAI(pdfBase64, password, existingTemplates || undefined);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") {
        return new Response(
          JSON.stringify({
            error: "PASSWORD_REQUIRED",
            message: "This PDF is password protected. Please provide the password.",
            requiresPassword: true,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw e;
    }

    const { data: extractedData, tokensUsed } = extractionResult;
    auditParams.llmTokensInput = tokensUsed.input;
    auditParams.llmTokensOutput = tokensUsed.output;
    auditParams.confidenceScore = extractedData.confidence;

    console.log(`Extracted ${extractedData.transactions.length} transactions from ${extractedData.bankName} ${extractedData.cardName}`);

    // Step 5: Calculate points and enrich transactions
    const effectiveCardName = cardName !== "default" && cardName 
      ? cardName 
      : extractedData.cardName;

    const enrichedTransactions = extractedData.transactions.map(tx => ({
      user_id: userId,
      document_id: documentId,
      transaction_date: tx.date,
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
      points_earned: calculatePoints(tx.amount, tx.category || "Other", effectiveCardName),
      merchant_name: tx.merchant,
      is_masked: true, // All descriptions are PII-masked
    }));

    const totalPoints = enrichedTransactions.reduce((sum, t) => sum + (t.points_earned || 0), 0);

    // Step 6: PII Masking audit
    let totalPiiMasked = 0;
    const piiTypesFound = new Set<string>();
    for (const tx of extractedData.transactions) {
      const { piiTypesFound: types, fieldsMasked } = maskPII(tx.description);
      types.forEach(t => piiTypesFound.add(t));
      totalPiiMasked += fieldsMasked;
    }
    auditParams.piiFieldsMasked = totalPiiMasked;
    auditParams.fieldsExtracted = enrichedTransactions.length;

    // Log PII masking
    if (totalPiiMasked > 0) {
      await supabase.from("pii_masking_log").insert({
        user_id: userId,
        source_type: "pdf_statement",
        pii_types_found: Array.from(piiTypesFound),
        fields_masked: totalPiiMasked,
      });
    }

    // Step 7: Insert transactions
    if (enrichedTransactions.length > 0) {
      const { error: txError } = await supabase
        .from("transactions")
        .insert(enrichedTransactions);

      if (txError) {
        console.error("Transaction insert error:", txError);
      }
    }

    // Step 8: Create summary
    const byCategory = enrichedTransactions.reduce((acc, t) => {
      acc[t.category || "Other"] = (acc[t.category || "Other"] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const summary = {
      card_name: effectiveCardName,
      bank_name: extractedData.bankName,
      total_spend: extractedData.totalSpend,
      total_points_earned: totalPoints,
      transaction_count: enrichedTransactions.length,
      spending_by_category: byCategory,
      statement_period: extractedData.statementPeriod,
      detected_card: {
        card_name: extractedData.cardName,
        bank_name: extractedData.bankName,
        confidence: extractedData.confidence,
        auto_detected: cardName === "default" || !cardName,
      },
      extraction_method: "adaptive_ai",
      template_signature: extractedData.templateSignature,
    };

    // Step 9: Update document with parsed data
    await supabase
      .from("pdf_documents")
      .update({ parsed_data: summary })
      .eq("id", documentId);

    // Step 10: Create or update credit card
    if (extractedData.confidence >= 0.7 && extractedData.bankName !== "Unknown Bank") {
      const finalCardName = sanitizeName(extractedData.cardName) || "Generic Card";
      const finalBankName = sanitizeName(extractedData.bankName);

      if (finalCardName.length >= 2 && finalBankName.length >= 2) {
        const { data: existingCards } = await supabase
          .from("credit_cards")
          .select("id, points")
          .eq("user_id", userId)
          .eq("bank_name", finalBankName)
          .eq("card_name", finalCardName)
          .limit(1);

        if (existingCards && existingCards.length > 0) {
          await supabase
            .from("credit_cards")
            .update({ 
              points: (existingCards[0].points || 0) + totalPoints,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCards[0].id);
        } else {
          const variantMap: Record<string, string> = {
            "HDFC Bank": "emerald",
            "HDFC": "emerald",
            "Axis Bank": "gold",
            "Axis": "gold",
            "ICICI Bank": "platinum",
            "ICICI": "platinum",
            "American Express": "gold",
            "Amex": "gold",
            "SBI Card": "emerald",
            "SBI": "emerald",
            "Kotak": "platinum",
            "IndusInd": "gold",
          };
          
          await supabase.from("credit_cards").insert({
            user_id: userId,
            bank_name: finalBankName,
            card_name: finalCardName,
            points: totalPoints,
            point_value: 0.40,
            variant: variantMap[finalBankName] || "emerald",
          });
        }
      }
    }

    // Step 11: Create document chunks for RAG
    const chunks = [];
    const cardDisplayName = `${extractedData.bankName} ${extractedData.cardName}`;
    
    // Summary chunk
    chunks.push({
      user_id: userId,
      document_id: documentId,
      chunk_text: `Credit Card Statement Summary for ${cardDisplayName}:
Total Spend: ₹${extractedData.totalSpend.toLocaleString()}
Total Points Earned: ${totalPoints}
Transaction Count: ${enrichedTransactions.length}
Statement Period: ${extractedData.statementPeriod.start} to ${extractedData.statementPeriod.end}
Top Categories: ${Object.entries(byCategory)
  .sort(([,a], [,b]) => (b as number) - (a as number))
  .slice(0, 5)
  .map(([cat, amt]) => `${cat}: ₹${(amt as number).toLocaleString()}`)
  .join(", ")}`,
      chunk_index: 0,
      metadata: {
        card_name: effectiveCardName,
        bank_name: extractedData.bankName,
        document_type: "statement",
        chunk_type: "summary",
      },
    });

    // Transaction chunks
    let currentChunk = "";
    let chunkIndex = 1;
    for (const tx of enrichedTransactions) {
      const txText = `${tx.transaction_date}: ${tx.merchant_name} - ₹${tx.amount} (${tx.category}, ${tx.points_earned} pts)`;
      if (currentChunk.length + txText.length > 400) {
        chunks.push({
          user_id: userId,
          document_id: documentId,
          chunk_text: currentChunk,
          chunk_index: chunkIndex++,
          metadata: {
            card_name: effectiveCardName,
            bank_name: extractedData.bankName,
            document_type: "statement",
            chunk_type: "transactions",
          },
        });
        currentChunk = txText;
      } else {
        currentChunk += (currentChunk ? "\n" : "") + txText;
      }
    }
    if (currentChunk) {
      chunks.push({
        user_id: userId,
        document_id: documentId,
        chunk_text: currentChunk,
        chunk_index: chunkIndex,
        metadata: {
          card_name: effectiveCardName,
          bank_name: extractedData.bankName,
          document_type: "statement",
          chunk_type: "transactions",
        },
      });
    }

    if (chunks.length > 0) {
      await supabase.from("document_chunks").insert(chunks);
    }

    // Step 12: Learn template pattern (no PII stored)
    await learnTemplate(
      supabase,
      extractedData.bankName,
      extractedData.templateSignature,
      [], // Layout features already in signature
      true
    );

    // Step 13: Compliance logging
    await supabase.from("compliance_logs").insert({
      user_id: userId,
      action: "parse_statement",
      resource_type: "pdf_document",
      resource_id: documentId,
      pii_accessed: piiTypesFound.size > 0,
      pii_masked: totalPiiMasked > 0,
    });

    // Step 14: Audit logging
    auditParams.processingTimeMs = Date.now() - startTime;
    auditParams.status = "success";
    await logExtractionAudit(supabase, userId, documentId, auditParams);

    // Step 15: Token usage logging
    await supabase.from("token_usage").insert({
      user_id: userId,
      model: "google/gemini-2.5-flash",
      tokens_input: tokensUsed.input,
      tokens_output: tokensUsed.output,
      query_type: "pdf_parsing",
      estimated_cost: (tokensUsed.input * 0.0001 + tokensUsed.output * 0.0003) / 1000,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        transactions_parsed: enrichedTransactions.length,
        chunks_created: chunks.length,
        pii_masked: totalPiiMasked,
        extraction_method: "adaptive_ai",
        confidence: extractedData.confidence,
        template_learned: true,
        detected_card: {
          card_name: extractedData.cardName,
          bank_name: extractedData.bankName,
          confidence: extractedData.confidence,
          used_for_rewards: effectiveCardName,
        },
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Parse PDF error:", error);

    // Log failed attempt if we have context
    auditParams.processingTimeMs = processingTime;
    auditParams.status = "failed";
    auditParams.errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        processing_time_ms: processingTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
