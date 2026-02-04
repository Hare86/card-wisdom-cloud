import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ============================================================================
// PII MASKING - GDPR/PCI-DSS COMPLIANT
// All patterns designed to detect and mask sensitive data
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

function generateTemplateHash(structuralFeatures: string[]): string {
  const sorted = structuralFeatures.sort().join("|");
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

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

const NAME_VALIDATION = {
  minLength: 2,
  maxLength: 100,
  validPattern: /^[a-zA-Z0-9\s\-.&'()]+$/,
  invalidNames: ["unknown", "null", "undefined", "none", "n/a", "test", "default", "card", "bank"],
};

function sanitizeName(name: string): string {
  if (!name) return "";
  let sanitized = name.trim().replace(/\s+/g, " ");
  sanitized = sanitized.replace(/[<>"'`;\\]/g, "");
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
    return { isValid: false, error: `${type} name contains invalid characters`, sanitized: sanitized.replace(/[^a-zA-Z0-9\s\-.&'()]/g, "") };
  }
  
  if (NAME_VALIDATION.invalidNames.includes(sanitized.toLowerCase())) {
    return { isValid: false, error: `${type} name is reserved`, sanitized };
  }
  
  return { isValid: true, sanitized };
}

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

interface PIIAuditEntry {
  stage: "ocr_inline" | "pre_llm_local" | "post_llm";
  piiType: string;
  count: number;
  action: "masked" | "redacted" | "filtered_at_source";
  timestamp: string;
}

interface ParsedResponse {
  layoutFeatures?: string[];
  bankName?: string;
  cardName?: string;
  statementPeriod?: { start?: string; end?: string };
  transactions?: Array<{ date?: string; description?: string; amount?: number | string; merchant?: string }>;
  confidence?: number;
}

/**
 * Check if PDF is password-protected by examining binary markers
 */
function isPdfPasswordProtected(pdfData: Uint8Array): boolean {
  const checkLength = Math.min(pdfData.length, 50000);
  const text = new TextDecoder("latin1").decode(pdfData.slice(0, checkLength));
  
  const isEncrypted = text.includes("/Encrypt") || 
                      text.includes("/Filter/Standard") ||
                      text.includes("/Filter /Standard") ||
                      (text.includes("/U ") && text.includes("/O ")) ||
                      text.includes("/Crypt");
  
  if (isEncrypted) {
    console.log("[PDF-CHECK] Detected encryption markers in PDF binary");
  }
  
  return isEncrypted;
}

/**
 * Extract text from PDF using AI OCR
 */
/**
 * Single-pass PDF extraction: OCR + structured data in one AI call
 * Uses faster model for improved performance
 */
async function extractPDFDataSinglePass(
  pdfBase64: string,
  pdfBytes: Uint8Array
): Promise<{
  rawText: string;
  structuredData: ParsedResponse;
  tokensUsed: { input: number; output: number };
  ocrMaskedTypes: string[];
  extractionMethod: string;
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Check if PDF is password-protected
  if (isPdfPasswordProtected(pdfBytes)) {
    console.log("[EXTRACT] PDF is password-protected - rejecting");
    const err = new Error("PASSWORD_REQUIRED");
    (err as unknown as Record<string, unknown>).pdfErrorInfo = {
      code: "PASSWORD_REQUIRED",
      userMessage: "This PDF is password-protected. Please unlock it before uploading.",
      suggestedAction: "Use iLovePDF or Adobe Acrobat to unlock the PDF first",
      recoverable: false,
    };
    throw err;
  }

  // Combined prompt: OCR with PII masking + structured extraction in single pass
  const combinedPrompt = `TASK: Extract and analyze this credit card statement in a SINGLE pass.

STEP 1 - TEXT EXTRACTION WITH PII REDACTION:
Extract all visible text while applying these redactions:
- 16-digit card numbers → XXXX-XXXX-XXXX-[last4]
- Names after Mr/Mrs/Ms/Dr/Shri/Smt → [HOLDER_NAME]
- Email addresses → [EMAIL_REDACTED]
- 10-digit phone numbers → XXXXXX[last4]
- PAN numbers (ABCDE1234F) → XXXXX****X

STEP 2 - STRUCTURED EXTRACTION:
From the extracted text, identify and structure:

Return JSON in this EXACT format:
{
  "rawText": "The full extracted text with PII redacted (first 500 chars for reference)",
  "layoutFeatures": ["header_format", "table_columns", "date_format_used"],
  "bankName": "Bank name (HDFC, ICICI, Axis, SBI, etc.)",
  "cardName": "Card product name (Infinia, Regalia, Coral, etc.)",
  "statementPeriod": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction description",
      "amount": -1234.56,
      "merchant": "Merchant name"
    }
  ],
  "confidence": 0.85
}

RULES:
- Negative amounts for debits/purchases, positive for credits/refunds
- Parse all date formats to YYYY-MM-DD
- Extract ALL transactions visible in the statement
- Confidence: 0.9+ for clear format, 0.7-0.9 standard, <0.7 unclear
- Return ONLY valid JSON, no markdown`;

  console.log("[EXTRACT] Single-pass extraction starting...");
  const extractStart = Date.now();

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: combinedPrompt },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
          ]
        }
      ],
      max_tokens: 16000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[EXTRACT] AI error:", response.status, errorText);

    // Check for password-protected indicators
    const passwordIndicators = ["no pages", "empty document", "encrypted", "password", "protected"];
    const textLower = errorText.toLowerCase();

    if (passwordIndicators.some(indicator => textLower.includes(indicator))) {
      const err = new Error("PASSWORD_REQUIRED");
      (err as unknown as Record<string, unknown>).pdfErrorInfo = {
        code: "PASSWORD_REQUIRED",
        userMessage: "This PDF is password-protected. Please unlock it before uploading.",
        suggestedAction: "Use iLovePDF or Adobe Acrobat to unlock the PDF first",
        recoverable: false,
      };
      throw err;
    }

    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "{}";
  const tokensUsed = {
    input: result.usage?.prompt_tokens || 0,
    output: result.usage?.completion_tokens || 0,
  };

  const extractTime = Date.now() - extractStart;
  console.log(`[EXTRACT] Single-pass complete in ${extractTime}ms, tokens: ${tokensUsed.input}/${tokensUsed.output}`);

  // Parse JSON response
  let structuredData: ParsedResponse;
  let rawText = "";
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    rawText = parsed.rawText || content.substring(0, 2000);
    structuredData = {
      layoutFeatures: parsed.layoutFeatures || [],
      bankName: parsed.bankName,
      cardName: parsed.cardName,
      statementPeriod: parsed.statementPeriod,
      transactions: parsed.transactions || [],
      confidence: parsed.confidence,
    };
  } catch (e) {
    console.error("[EXTRACT] JSON parse error:", e);
    rawText = content.substring(0, 2000);
    structuredData = {};
  }

  // Track PII types masked
  const ocrMaskedTypes: string[] = [];
  if (content.includes("XXXX-XXXX-XXXX-")) ocrMaskedTypes.push("credit_card");
  if (content.includes("[HOLDER_NAME]")) ocrMaskedTypes.push("cardholder_name");
  if (content.includes("[EMAIL_REDACTED]")) ocrMaskedTypes.push("email");

  return {
    rawText,
    structuredData,
    tokensUsed,
    ocrMaskedTypes,
    extractionMethod: "ai_single_pass",
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase: SupabaseClient | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, userId, filePath, cardName } = await req.json();

    if (!filePath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PARSE] Starting parse for document: ${documentId}`);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdf-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("[PARSE] Download error:", downloadError);
      throw new Error("Failed to download document");
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < pdfBytes.length; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    const pdfBase64 = btoa(binary);

    console.log(`[PARSE] PDF size: ${pdfBytes.length} bytes`);

    // Single-pass extraction (OCR + structured data)
    let extractionResult;
    try {
      extractionResult = await extractPDFDataSinglePass(pdfBase64, pdfBytes);
    } catch (error) {
      // Handle password-protected PDF error
      if (error instanceof Error && error.message === "PASSWORD_REQUIRED") {
        console.log("[PARSE] Password-protected PDF detected - returning error");
        return new Response(
          JSON.stringify({
            error: "PASSWORD_REQUIRED",
            requiresPassword: true,
            userMessage: "This PDF is password-protected. Please unlock it using iLovePDF or request an unencrypted statement from your bank.",
            suggestedAction: "Unlock the PDF before uploading",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { rawText, structuredData: extractedData, tokensUsed, ocrMaskedTypes } = extractionResult;

    if (!rawText || rawText.length < 50) {
      console.error("[PARSE] Insufficient text extracted");
      return new Response(
        JSON.stringify({
          error: "UNSUPPORTED_PDF_CONTENT",
          userMessage: "Could not extract text from this PDF. It may be scanned or image-based.",
          suggestedAction: "Request a digital statement from your bank instead of a scanned copy.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply local PII masking as additional layer
    const { piiTypesFound, fieldsMasked } = maskPII(rawText);
    const allPiiTypes = [...new Set([...ocrMaskedTypes, ...piiTypesFound])];

    console.log(`[PARSE] PII masked: ${fieldsMasked} fields, types: ${allPiiTypes.join(", ")}`);

    // Process transactions
    interface RawTransaction {
      date?: string;
      description?: string;
      amount?: number | string;
      merchant?: string;
    }
    const transactions: TransactionData[] = ((extractedData.transactions || []) as RawTransaction[]).map((tx) => {
      const amount = typeof tx.amount === "string" ? parseFloat(tx.amount.replace(/[^0-9.-]/g, "")) : (tx.amount || 0);
      const category = categorizeTransaction(tx.description || tx.merchant || "");
      const detectedCardName = cardName !== "default" ? cardName : (extractedData.cardName || "default");
      const points = calculatePoints(Math.abs(amount), category, detectedCardName);

      return {
        date: tx.date || "",
        description: tx.description || "",
        amount,
        merchant: tx.merchant || tx.description || "",
        category,
        points,
      };
    });

    // Calculate totals
    const totalSpend = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalPoints = transactions.reduce((sum, tx) => sum + (tx.points || 0), 0);

    // Generate template hash
    const templateHash = generateTemplateHash(extractedData.layoutFeatures || []);

    // Validate and sanitize names
    const bankValidation = validateName(extractedData.bankName || "", "bank");
    const cardValidation = validateName(extractedData.cardName || "", "card");

    const finalBankName = bankValidation.isValid ? bankValidation.sanitized : "Unknown Bank";
    const finalCardName = cardValidation.isValid ? cardValidation.sanitized : (cardName !== "default" ? cardName : "Credit Card");

    // Prepare parsed data
    const parsedData = {
      bank_name: finalBankName,
      card_name: finalCardName,
      statement_period: extractedData.statementPeriod || { start: "", end: "" },
      transaction_count: transactions.length,
      transactions_parsed: transactions.length,
      total_spend: totalSpend,
      total_points_earned: totalPoints,
      pii_masked: fieldsMasked,
      confidence: extractedData.confidence || 0.8,
      template_hash: templateHash,
      detected_card: {
        bank_name: finalBankName,
        card_name: finalCardName,
        confidence: extractedData.confidence || 0.8,
      },
    };

    // Update document with parsed data
    const { error: updateError } = await supabase
      .from("pdf_documents")
      .update({ parsed_data: parsedData })
      .eq("id", documentId);

    if (updateError) {
      console.error("[PARSE] Update error:", updateError);
    }

    // Insert transactions
    if (transactions.length > 0) {
      const transactionInserts = transactions.map((tx) => ({
        user_id: userId,
        document_id: documentId,
        transaction_date: tx.date || new Date().toISOString().split("T")[0],
        description: tx.description,
        amount: tx.amount,
        merchant_name: tx.merchant,
        category: tx.category,
        points_earned: tx.points,
        is_masked: true,
      }));

      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactionInserts);

      if (insertError) {
        console.error("[PARSE] Transaction insert error:", insertError);
      }
    }

    // Log extraction audit
    const processingTime = Date.now() - startTime;
    await supabase.from("extraction_audit_log").insert({
      user_id: userId,
      document_id: documentId,
      extraction_method: "ai_single_pass",
      extraction_status: "success",
      fields_extracted: transactions.length,
      pii_fields_masked: fieldsMasked,
      confidence_score: extractedData.confidence || 0.8,
      processing_time_ms: processingTime,
      llm_model_used: "gemini-2.5-flash-lite",
      llm_tokens_input: tokensUsed.input,
      llm_tokens_output: tokensUsed.output,
      password_protected: false,
    });

    console.log(`[PARSE] Complete in ${processingTime}ms - ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsedData,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[PARSE] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for specific error types
    if (errorMessage.includes("PASSWORD_REQUIRED")) {
      return new Response(
        JSON.stringify({
          error: "PASSWORD_REQUIRED",
          requiresPassword: true,
          userMessage: "This PDF is password-protected. Please unlock it before uploading.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "PARSE_ERROR",
        message: errorMessage,
        userMessage: "Failed to parse the PDF. Please try again or use a different file.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
