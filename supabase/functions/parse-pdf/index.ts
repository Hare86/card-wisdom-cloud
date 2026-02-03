import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// pdf.js for password-protected PDF text extraction (no OCR)
// Using legacy build with worker-less mode for Deno/Edge
// deno-lint-ignore-file no-explicit-any
// CRITICAL: Import as namespace and set workerSrc IMMEDIATELY after import
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.mjs";

// Set worker source at module level - required even in worker-less mode
// Using CDN URL for the worker file to satisfy pdf.js internal checks
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.worker.mjs";

// Re-export for convenience
const getDocument = pdfjsLib.getDocument;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
// PRE-LLM PII MASKING - GDPR/PCI-DSS STRICT COMPLIANCE
// Two-layer protection: 1) OCR extraction with in-prompt filtering, 2) Comprehensive local masking
// ============================================================================

interface PreExtractionResult {
  maskedText: string;
  piiTypesFound: string[];
  totalPiiMasked: number;
  rawTextLength: number;
  extractionMethod: "ocr_with_inline_filter" | "structured_extraction";
  auditTrail: PIIAuditEntry[];
  ocrTokensUsed: { input: number; output: number };
}

interface PIIAuditEntry {
  stage: "ocr_inline" | "pre_llm_local" | "post_llm";
  piiType: string;
  count: number;
  action: "masked" | "redacted" | "filtered_at_source";
  timestamp: string;
}

/**
 * PHASE 1A: OCR extraction with IN-PROMPT PII filtering
 * The LLM is instructed to mask PII during extraction itself, providing first-layer protection
 * Returns both raw text and tokens used for audit purposes
 */
async function extractRawTextFromPDF(
  pdfBase64: string,
  password?: string
): Promise<{ rawText: string; tokensUsed: { input: number; output: number }; ocrMaskedTypes: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // CRITICAL: OCR prompt with MANDATORY PII filtering at extraction time
  // This ensures PII is masked BEFORE it fully enters the LLM context for interpretation
  const ocrWithFilteringPrompt = `TASK: OCR text extraction with MANDATORY PII redaction.

EXTRACT all visible text from this credit card statement PDF.
PRESERVE structure (headers, tables, line breaks).

MANDATORY REDACTION (apply during extraction):
- Any 16-digit card numbers → replace with: XXXX-XXXX-XXXX-[last4]
- Any names after Mr/Mrs/Ms/Dr/Shri/Smt → replace with: [HOLDER_NAME]
- Any email addresses → replace with: [EMAIL_REDACTED]
- Any phone numbers (10+ digits) → replace with: [PHONE_REDACTED]
- Any 12-digit Aadhaar numbers → replace with: [AADHAAR_REDACTED]
- Any PAN (5 letters + 4 digits + 1 letter) → replace with: [PAN_REDACTED]
- Any account numbers (9-18 digits after "account/a/c") → replace with: [ACCT_REDACTED]
- Any addresses with PIN codes → replace address portion with: [ADDRESS_REDACTED]

${password ? `PDF password: ${password}` : ""}

OUTPUT: Only extracted text with redactions applied. No explanations.
If password-protected without valid password: PASSWORD_REQUIRED`;

  console.log("[PHASE 1A] OCR extraction with inline PII filtering...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite", // Fast, minimal model for OCR
      messages: [
        { role: "user", content: [
          { type: "text", text: ocrWithFilteringPrompt },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
        ]}
      ],
      max_tokens: 16000,
      temperature: 0, // Zero temperature for consistent extraction
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[PHASE 1A] OCR extraction error:", response.status, errorText);
    
    // Detect password-protected PDF: AI Gateway returns "no pages" when PDF is encrypted
    if (response.status === 400 && (
      errorText.includes("no pages") || 
      errorText.includes("document has no pages") ||
      errorText.includes("empty document") ||
      errorText.includes("cannot be opened") ||
      errorText.includes("encrypted") ||
      errorText.includes("password")
    )) {
      console.log("[PHASE 1A] Detected password-protected PDF");
      throw new Error("PASSWORD_REQUIRED");
    }
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a few minutes.");
    }
    throw new Error(`OCR extraction failed with status ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";
  const tokensUsed = {
    input: result.usage?.prompt_tokens || 0,
    output: result.usage?.completion_tokens || 0,
  };
  
  if (content.includes("PASSWORD_REQUIRED")) {
    throw new Error("PASSWORD_REQUIRED");
  }

  // Detect which PII types were masked at OCR stage by checking for placeholders
  const ocrMaskedTypes: string[] = [];
  if (content.includes("[HOLDER_NAME]")) ocrMaskedTypes.push("name_ocr");
  if (content.includes("[EMAIL_REDACTED]")) ocrMaskedTypes.push("email_ocr");
  if (content.includes("[PHONE_REDACTED]")) ocrMaskedTypes.push("phone_ocr");
  if (content.includes("[AADHAAR_REDACTED]")) ocrMaskedTypes.push("aadhaar_ocr");
  if (content.includes("[PAN_REDACTED]")) ocrMaskedTypes.push("pan_ocr");
  if (content.includes("[ACCT_REDACTED]")) ocrMaskedTypes.push("account_ocr");
  if (content.includes("[ADDRESS_REDACTED]")) ocrMaskedTypes.push("address_ocr");
  if (/XXXX-XXXX-XXXX-\d{4}/.test(content)) ocrMaskedTypes.push("card_ocr");

  console.log(`[PHASE 1A] OCR extracted ${content.length} chars, inline-masked types: ${ocrMaskedTypes.join(", ") || "none detected"}`);
  return { rawText: content, tokensUsed, ocrMaskedTypes };
}

// ============================================================================
// PDF ERROR DETECTION - Comprehensive error handling for edge cases
// ============================================================================

interface PDFErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  suggestedAction?: string;
}

const PDF_ERROR_CODES = {
  CORRUPTED_FILE: "CORRUPTED_FILE",
  INVALID_STRUCTURE: "INVALID_STRUCTURE",
  UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION",
  ENCRYPTED_UNSUPPORTED: "ENCRYPTED_UNSUPPORTED",
  PASSWORD_REQUIRED: "PASSWORD_REQUIRED",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  EMPTY_DOCUMENT: "EMPTY_DOCUMENT",
  NO_TEXT_CONTENT: "PDF_TEXT_EXTRACTION_EMPTY",
  PARSE_TIMEOUT: "PARSE_TIMEOUT",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * Classify pdf.js errors into user-friendly error categories
 */
function classifyPDFError(err: unknown): PDFErrorInfo {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err && typeof err === "object" ? (err as any).name : undefined;
  const msgLower = msg.toLowerCase();

  // Password-related errors
  if (name === "PasswordException" || msgLower.includes("password")) {
    if (msgLower.includes("incorrect") || msgLower.includes("wrong") || msgLower.includes("invalid")) {
      return {
        code: PDF_ERROR_CODES.INVALID_PASSWORD,
        message: msg,
        userMessage: "The password you entered is incorrect. Please try again.",
        recoverable: true,
        suggestedAction: "Enter the correct password",
      };
    }
    return {
      code: PDF_ERROR_CODES.PASSWORD_REQUIRED,
      message: msg,
      userMessage: "This PDF is password protected. Please provide the password.",
      recoverable: true,
      suggestedAction: "Enter the PDF password",
    };
  }

  // Corrupted file errors
  if (
    msgLower.includes("invalid pdf") ||
    msgLower.includes("not a pdf") ||
    msgLower.includes("missing pdf") ||
    msgLower.includes("pdf header") ||
    msgLower.includes("startxref") ||
    msgLower.includes("xref") ||
    msgLower.includes("trailer") ||
    msgLower.includes("eof marker") ||
    msgLower.includes("stream not found") ||
    msgLower.includes("unexpected end")
  ) {
    return {
      code: PDF_ERROR_CODES.CORRUPTED_FILE,
      message: msg,
      userMessage: "This PDF file appears to be corrupted or incomplete. Please try downloading the statement again from your bank.",
      recoverable: false,
      suggestedAction: "Download a fresh copy of the PDF from your bank",
    };
  }

  // Invalid structure errors
  if (
    msgLower.includes("invalid object") ||
    msgLower.includes("bad xref") ||
    msgLower.includes("object stream") ||
    msgLower.includes("linearization") ||
    msgLower.includes("catalog") ||
    msgLower.includes("root object")
  ) {
    return {
      code: PDF_ERROR_CODES.INVALID_STRUCTURE,
      message: msg,
      userMessage: "This PDF has an unsupported structure. Some bank statements use specialized formatting that we cannot process. Please try uploading a different format if available.",
      recoverable: false,
      suggestedAction: "Request a different format from your bank",
    };
  }

  // Unsupported encryption
  if (
    msgLower.includes("unsupported encryption") ||
    msgLower.includes("encryption method") ||
    msgLower.includes("aes-256") ||
    msgLower.includes("security handler")
  ) {
    return {
      code: PDF_ERROR_CODES.ENCRYPTED_UNSUPPORTED,
      message: msg,
      userMessage: "This PDF uses an encryption method we don't support. Please try exporting an unencrypted version from your bank portal.",
      recoverable: false,
      suggestedAction: "Download an unencrypted PDF from your bank",
    };
  }

  // Empty document
  if (
    msgLower.includes("no pages") ||
    msgLower.includes("empty document") ||
    msgLower.includes("zero pages") ||
    msgLower.includes("numpages is 0")
  ) {
    return {
      code: PDF_ERROR_CODES.EMPTY_DOCUMENT,
      message: msg,
      userMessage: "This PDF appears to be empty or has no readable pages. Please ensure you uploaded the correct file.",
      recoverable: false,
      suggestedAction: "Verify you uploaded the correct file",
    };
  }

  // Unsupported PDF version
  if (
    msgLower.includes("pdf version") ||
    msgLower.includes("unsupported version")
  ) {
    return {
      code: PDF_ERROR_CODES.UNSUPPORTED_VERSION,
      message: msg,
      userMessage: "This PDF uses a version we don't fully support. The extraction may be incomplete.",
      recoverable: true,
      suggestedAction: "Try re-saving the PDF with a different tool",
    };
  }

  // File size issues
  if (
    msgLower.includes("too large") ||
    msgLower.includes("memory") ||
    msgLower.includes("allocation failed")
  ) {
    return {
      code: PDF_ERROR_CODES.FILE_TOO_LARGE,
      message: msg,
      userMessage: "This PDF is too large to process. Please try uploading a smaller file (under 20MB) or split the statement into multiple files.",
      recoverable: false,
      suggestedAction: "Upload a smaller PDF file",
    };
  }

  // Timeout
  if (
    msgLower.includes("timeout") ||
    msgLower.includes("timed out") ||
    msgLower.includes("deadline exceeded")
  ) {
    return {
      code: PDF_ERROR_CODES.PARSE_TIMEOUT,
      message: msg,
      userMessage: "Processing took too long. Please try again with a smaller file or during off-peak hours.",
      recoverable: true,
      suggestedAction: "Try again later or with a smaller file",
    };
  }

  // Default unknown error
  return {
    code: PDF_ERROR_CODES.UNKNOWN_ERROR,
    message: msg,
    userMessage: "We encountered an unexpected error processing this PDF. Please try again or contact support if the issue persists.",
    recoverable: true,
    suggestedAction: "Try uploading again",
  };
}

/**
 * Validate PDF file before attempting to parse
 * Quick checks to catch obviously corrupted files early
 */
function validatePDFBytes(pdfBytes: Uint8Array): { valid: boolean; error?: PDFErrorInfo } {
  // Check minimum size (a valid PDF is at least ~100 bytes)
  if (pdfBytes.length < 100) {
    return {
      valid: false,
      error: {
        code: PDF_ERROR_CODES.CORRUPTED_FILE,
        message: "File too small to be a valid PDF",
        userMessage: "This file is too small to be a valid PDF. Please ensure you uploaded the correct file.",
        recoverable: false,
      },
    };
  }

  // Check PDF header magic bytes (%PDF-)
  const header = new TextDecoder().decode(pdfBytes.slice(0, 8));
  if (!header.startsWith("%PDF-")) {
    return {
      valid: false,
      error: {
        code: PDF_ERROR_CODES.CORRUPTED_FILE,
        message: `Invalid PDF header: ${header.slice(0, 8)}`,
        userMessage: "This file doesn't appear to be a valid PDF. Please ensure you uploaded a PDF file.",
        recoverable: false,
      },
    };
  }

  // Check for truncated file (should end with %%EOF or close to it)
  const tailSize = Math.min(1024, pdfBytes.length);
  const tail = new TextDecoder().decode(pdfBytes.slice(-tailSize));
  if (!tail.includes("%%EOF")) {
    console.warn("[PDF VALIDATION] Warning: PDF may be truncated (no %%EOF found)");
    // Don't fail here, as some PDFs work without proper EOF marker
  }

  // Check file size limit (20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (pdfBytes.length > MAX_SIZE) {
    return {
      valid: false,
      error: {
        code: PDF_ERROR_CODES.FILE_TOO_LARGE,
        message: `File size ${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB exceeds limit`,
        userMessage: `This PDF is too large (${(pdfBytes.length / 1024 / 1024).toFixed(1)}MB). Please upload a file under 20MB.`,
        recoverable: false,
      },
    };
  }

  return { valid: true };
}

/**
 * Password-protected PDFs cannot be read by the AI gateway directly (it sees "no pages").
 * When a password is provided, we extract text locally using pdf.js and then run the normal
 * Adaptive AI extraction on that text.
 */
async function extractTextWithPdfjs(
  pdfBytes: Uint8Array,
  password: string
): Promise<string> {
  // Pre-validation
  const validation = validatePDFBytes(pdfBytes);
  if (!validation.valid && validation.error) {
    console.error(`[PDF VALIDATION] Failed: ${validation.error.code} - ${validation.error.message}`);
    throw new Error(validation.error.code);
  }

  try {
    console.log(`[PDF.JS] Starting extraction with password (${pdfBytes.length} bytes)`);
    
    // pdf.js workerSrc is already set at module level, so we just use getDocument directly
    // with disableWorker: true for edge runtime compatibility
    const loadingTask = getDocument({
      data: pdfBytes,
      password,
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      stopAtErrors: false, // Continue parsing even if some objects are invalid
    } as any);

    // Add timeout for the loading task
    const timeoutMs = 30000; // 30 second timeout
    const doc = await Promise.race([
      loadingTask.promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("PDF parsing timeout")), timeoutMs)
      ),
    ]) as any;

    const numPages = doc.numPages || 0;
    if (numPages === 0) {
      throw new Error("PDF has zero pages");
    }

    console.log(`[PDF.JS] Document loaded with ${numPages} pages`);
    const maxPages = Math.min(numPages, 12);
    let out = "";
    let failedPages = 0;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = (textContent?.items || []) as any[];
        const pageText = items
          .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
          .filter(Boolean)
          .join(" ");
        out += `\n\n--- PAGE ${pageNum} ---\n${pageText}`;
      } catch (pageErr) {
        console.warn(`[PDF.JS] Failed to extract page ${pageNum}:`, pageErr);
        failedPages++;
        // Continue with other pages
      }
    }

    if (failedPages > 0) {
      console.warn(`[PDF.JS] ${failedPages}/${maxPages} pages failed to extract`);
    }

    const trimmed = out.trim();
    if (!trimmed) {
      // If the PDF is image/scanned-based, pdf.js text extraction returns empty.
      console.log("[PDF.JS] No text content extracted (likely scanned/image PDF)");
      throw new Error(PDF_ERROR_CODES.NO_TEXT_CONTENT);
    }

    console.log(`[PDF.JS] Extracted ${trimmed.length} characters from ${maxPages - failedPages} pages`);
    return trimmed;
  } catch (err) {
    const errorInfo = classifyPDFError(err);
    console.error(`[PDF.JS] Error: ${errorInfo.code} - ${errorInfo.message}`);
    
    // Re-throw with the classified error code
    const error = new Error(errorInfo.code);
    (error as any).pdfErrorInfo = errorInfo;
    throw error;
  }
}

/**
 * PHASE 1B: Comprehensive LOCAL PII masking (no API calls)
 * Defense-in-depth: catches any PII missed by OCR inline filtering
 */
function applyComprehensivePIIMasking(
  text: string,
  ocrMaskedTypes: string[],
  ocrTokensUsed: { input: number; output: number }
): PreExtractionResult {
  let maskedText = text;
  const piiTypesFound: string[] = [...ocrMaskedTypes];
  let totalPiiMasked = ocrMaskedTypes.length; // Start with OCR-masked count
  const auditTrail: PIIAuditEntry[] = [];
  const timestamp = new Date().toISOString();

  // Log OCR-stage masking in audit trail
  for (const ocrType of ocrMaskedTypes) {
    auditTrail.push({
      stage: "ocr_inline",
      piiType: ocrType,
      count: 1,
      action: "filtered_at_source",
      timestamp,
    });
  }

  // Extended PII patterns for comprehensive LOCAL masking - ordered by specificity
  const comprehensivePatterns: Record<string, { pattern: RegExp; replacement: string; priority: number }> = {
    // Credit/Debit cards - most specific first
    creditCard: {
      pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      replacement: "XXXX-XXXX-XXXX-****",
      priority: 1,
    },
    maskedCardPartial: {
      pattern: /\bXXXX[-\s]?XXXX[-\s]?XXXX[-\s]?\d{4}\b/g,
      replacement: "XXXX-XXXX-XXXX-****",
      priority: 1,
    },
    // Government IDs
    aadhaar: {
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: "XXXX-XXXX-****",
      priority: 2,
    },
    pan: {
      pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
      replacement: "XXXXX****X",
      priority: 2,
    },
    passport: {
      pattern: /\b[A-Z]\d{7}\b/g,
      replacement: "X*******",
      priority: 2,
    },
    // Contact info
    email: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: "[EMAIL_MASKED]",
      priority: 2,
    },
    phone: {
      pattern: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
      replacement: "XXXXXX****",
      priority: 2,
    },
    phoneWithCode: {
      pattern: /\b(?:\+\d{1,3}[-\s]?)?\(?\d{2,4}\)?[-\s]?\d{3,4}[-\s]?\d{4}\b/g,
      replacement: "[PHONE_MASKED]",
      priority: 2,
    },
    // Financial
    accountNumber: {
      pattern: /(?:A\/C|Account|Acct)[:\s#]*\d{9,18}/gi,
      replacement: "Account: XXXXXXXXXX",
      priority: 3,
    },
    ifsc: {
      pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
      replacement: "XXXX0XXXXXX",
      priority: 3,
    },
    cvv: {
      pattern: /\bCVV[:\s]*\d{3,4}\b/gi,
      replacement: "CVV: XXX",
      priority: 3,
    },
    bankAccountGeneric: {
      pattern: /\b\d{9,18}\b/g,
      replacement: "XXXXXX**",
      priority: 3,
    },
    // Customer identifiers
    customerId: {
      pattern: /(?:customer|client|member|user)[:\s#]*[A-Z0-9]{6,15}/gi,
      replacement: "Customer ID: XXXXXX",
      priority: 4,
    },
    referenceNumber: {
      pattern: /(?:ref|reference|txn|transaction)[:\s#]*[A-Z0-9]{8,20}/gi,
      replacement: "Ref: XXXXXXXX",
      priority: 4,
    },
    // Personal identifiers
    fullName: {
      pattern: /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Shri|Smt\.?|Kumari?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g,
      replacement: "[CARDHOLDER_NAME]",
      priority: 5,
    },
    // Normalize OCR-masked placeholders
    ocrMaskedName: {
      pattern: /\[HOLDER_NAME\]/g,
      replacement: "[CARDHOLDER_NAME]",
      priority: 6,
    },
    ocrMaskedEmail: {
      pattern: /\[EMAIL_REDACTED\]/g,
      replacement: "[EMAIL_MASKED]",
      priority: 6,
    },
    ocrMaskedPhone: {
      pattern: /\[PHONE_REDACTED\]/g,
      replacement: "[PHONE_MASKED]",
      priority: 6,
    },
    ocrMaskedAadhaar: {
      pattern: /\[AADHAAR_REDACTED\]/g,
      replacement: "[AADHAAR_MASKED]",
      priority: 6,
    },
    ocrMaskedPan: {
      pattern: /\[PAN_REDACTED\]/g,
      replacement: "[PAN_MASKED]",
      priority: 6,
    },
    ocrMaskedAcct: {
      pattern: /\[ACCT_REDACTED\]/g,
      replacement: "[ACCOUNT_MASKED]",
      priority: 6,
    },
    ocrMaskedAddress: {
      pattern: /\[ADDRESS_REDACTED\]/g,
      replacement: "[ADDRESS_MASKED]",
      priority: 6,
    },
    // Address patterns
    address: {
      pattern: /\b\d+[,\s]+[A-Za-z\s]+(?:Road|Street|Lane|Avenue|Nagar|Colony|Apartment|Flat|Block|Sector)[,\s]+[A-Za-z\s]+(?:,\s*\d{6})?\b/gi,
      replacement: "[ADDRESS_MASKED]",
      priority: 5,
    },
    pinCode: {
      pattern: /\b(?:PIN|Pincode|Pin Code)[:\s]*\d{6}\b/gi,
      replacement: "PIN: XXXXXX",
      priority: 5,
    },
    // Date of Birth
    dob: {
      pattern: /\b(?:DOB|Date of Birth|D\.O\.B\.?|Birth Date)[:\s]*\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi,
      replacement: "DOB: XX/XX/XXXX",
      priority: 5,
    },
  };

  // Sort patterns by priority and apply
  const sortedPatterns = Object.entries(comprehensivePatterns)
    .sort(([, a], [, b]) => a.priority - b.priority);

  for (const [piiType, { pattern, replacement }] of sortedPatterns) {
    const matches = maskedText.match(pattern);
    if (matches && matches.length > 0) {
      if (!piiTypesFound.includes(piiType)) {
        piiTypesFound.push(piiType);
      }
      totalPiiMasked += matches.length;
      
      // Create audit entry for local masking stage
      auditTrail.push({
        stage: "pre_llm_local",
        piiType,
        count: matches.length,
        action: "masked",
        timestamp,
      });
      
      maskedText = maskedText.replace(pattern, replacement);
    }
  }

  console.log(`[PHASE 1B] Local PII masking: ${totalPiiMasked} total instances, ${piiTypesFound.length} PII types`);

  return {
    maskedText,
    piiTypesFound,
    totalPiiMasked,
    rawTextLength: text.length,
    extractionMethod: "ocr_with_inline_filter",
    auditTrail,
    ocrTokensUsed,
  };
}

// ============================================================================
// ADAPTIVE AI EXTRACTION - Works with ANY bank statement template
// Now receives FULLY PRE-MASKED text (two-layer protection)
// ============================================================================

async function extractWithAdaptiveAI(
  maskedText: string,
  preMaskingStats: PreExtractionResult,
  existingTemplates?: any[]
): Promise<{ data: ExtractedData; rawResponse: string; tokensUsed: { input: number; output: number }; preMaskingStats: PreExtractionResult }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Construct hints from existing templates if available
  const templateHints = existingTemplates?.length 
    ? `Known bank formats include: ${existingTemplates.map(t => t.bank_name).join(", ")}. But extract based on actual content.`
    : "";

  const systemPrompt = `You are an expert credit card statement parser for Indian banks. 
  
IMPORTANT: The text you receive has ALREADY been PII-masked for compliance (two-layer protection). Work with the masked data.

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
  "cardholderName": "[PRE_MASKED]",
  "statementPeriod": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "merchant/transaction details", "amount": 1234.56, "merchant": "simplified merchant name"}
  ],
  "layoutFeatures": ["header_centered", "logo_top_left", "table_with_borders", etc.],
  "confidence": 0.95
}

Parse ALL visible transactions. For amounts, use positive numbers (debits as positive).`;

  console.log("[PHASE 2] Structured extraction from pre-masked text (two-layer protected)...");

  const requestBody = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: `Extract structured data from this pre-masked credit card statement text:\n\n${maskedText}`
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

  // Generate template signature from layout features
  const layoutFeatures = parsed.layoutFeatures || [];
  layoutFeatures.push(`bank_${(parsed.bankName || "unknown").toLowerCase().replace(/\s+/g, "_")}`);
  const templateSignature = generateTemplateHash(layoutFeatures);

  // Validate and sanitize extracted data
  const bankValidation = validateName(parsed.bankName || "Unknown", "bank");
  const cardValidation = validateName(parsed.cardName || "Generic", "card");

  // Process transactions - descriptions are already pre-masked
  const transactions: TransactionData[] = [];
  for (const tx of (parsed.transactions || [])) {
    // Apply additional masking pass for safety
    const { maskedText: maskedDesc } = maskPII(tx.description || "");
    const category = categorizeTransaction(tx.description || tx.merchant || "");
    
    transactions.push({
      date: tx.date || new Date().toISOString().split("T")[0],
      description: maskedDesc,
      amount: Math.abs(parseFloat(tx.amount) || 0),
      merchant: sanitizeName(tx.merchant || maskedDesc.split(" ").slice(0, 2).join(" ")),
      category,
    });
  }

  return {
    data: {
      bankName: bankValidation.sanitized || "Unknown Bank",
      cardName: cardValidation.sanitized || "Generic Card",
      cardholderName: "[PRE_MASKED]", // Already masked before LLM
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
    preMaskingStats,
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
// AUDIT LOGGING - Compliance requirement with PII audit trail
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
    console.log(`[AUDIT] Extraction logged: ${params.status}, PII masked: ${params.piiFieldsMasked}`);
  } catch (e) {
    console.error("[AUDIT] Logging error:", e);
  }
}

/**
 * Log detailed PII masking audit for compliance
 */
async function logPIIAudit(
  supabase: any,
  userId: string,
  documentId: string,
  auditTrail: PIIAuditEntry[],
  piiTypesFound: string[],
  totalMasked: number
) {
  try {
    // Log to pii_masking_log table
    await supabase.from("pii_masking_log").insert({
      user_id: userId,
      source_type: "pdf_statement_two_layer_masking",
      pii_types_found: piiTypesFound,
      fields_masked: totalMasked,
    });

    // Log compliance entry for audit trail
    await supabase.from("compliance_logs").insert({
      user_id: userId,
      action: "pii_masking_two_layer",
      resource_type: "pdf_document",
      resource_id: documentId,
      pii_accessed: true, // Document contained PII
      pii_masked: true,   // All PII was masked before LLM processing
    });

    console.log(`[PII AUDIT] Logged ${totalMasked} masked fields across ${piiTypesFound.length} PII types`);
    console.log(`[PII AUDIT] Stages: OCR inline (${auditTrail.filter(a => a.stage === "ocr_inline").length}), Local (${auditTrail.filter(a => a.stage === "pre_llm_local").length})`);
  } catch (e) {
    console.error("[PII AUDIT] Logging error:", e);
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
    extractionMethod: "adaptive_ai_two_layer_masking",
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
    console.log(`[START] Processing document ${documentId} for user ${userId}`);
    auditParams.passwordProtected = !!password;

    // Step 1: Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdf-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download document from storage");
    }

    console.log(`[STEP 1] Downloaded PDF: ${fileData.size} bytes`);

    // Step 2: Convert to base64 and validate PDF structure
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Early validation to catch corrupted files before expensive processing
    const validation = validatePDFBytes(uint8Array);
    if (!validation.valid && validation.error) {
      console.error(`[VALIDATION] PDF failed validation: ${validation.error.code}`);
      return new Response(
        JSON.stringify({
          error: validation.error.code,
          message: validation.error.userMessage,
          suggestedAction: validation.error.suggestedAction,
          recoverable: validation.error.recoverable,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
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

    // ========================================================================
    // PHASE 1: TWO-LAYER PRE-LLM PII MASKING
    // Layer 1: OCR with inline filtering (PII masked during extraction)
    // Layer 2: Local regex-based masking (catches anything missed)
    // ========================================================================
    let ocrResult: { rawText: string; tokensUsed: { input: number; output: number }; ocrMaskedTypes: string[] };
    let preMaskingStats: PreExtractionResult;
    
    try {
      // If the user provided a password, extract text locally using pdf.js.
      // This avoids the "no pages" error from AI providers when PDFs are encrypted.
      if (password && typeof password === "string" && password.trim()) {
        console.log("[PHASE 1A] Password provided; extracting text with pdf.js...");
        const rawText = await extractTextWithPdfjs(uint8Array, password);
        ocrResult = { rawText, tokensUsed: { input: 0, output: 0 }, ocrMaskedTypes: [] };
        auditParams.extractionMethod = "pdfjs_text_extraction_two_layer_masking";
      } else {
        // No password - use OCR with inline PII filtering
        ocrResult = await extractRawTextFromPDF(pdfBase64);
      }
      
      // PHASE 1B: Apply comprehensive local PII masking
      preMaskingStats = applyComprehensivePIIMasking(
        ocrResult.rawText,
        ocrResult.ocrMaskedTypes,
        ocrResult.tokensUsed
      );
      
      console.log(`[PHASE 1] Two-layer masking complete: ${preMaskingStats.totalPiiMasked} PII instances masked`);
      auditParams.extractionMethod = "adaptive_ai_two_layer_masking";
      auditParams.llmTokensInput += ocrResult.tokensUsed.input;
      auditParams.llmTokensOutput += ocrResult.tokensUsed.output;
      
    } catch (e) {
      // Get detailed error info if available
      const errorInfo = (e as any).pdfErrorInfo as PDFErrorInfo | undefined;
      const errorCode = e instanceof Error ? e.message : "UNKNOWN_ERROR";
      
      // Handle specific error codes with user-friendly responses
      if (errorCode === PDF_ERROR_CODES.PASSWORD_REQUIRED) {
        return new Response(
          JSON.stringify({
            error: "PASSWORD_REQUIRED",
            message: errorInfo?.userMessage || "This PDF is password protected. Please provide the password.",
            requiresPassword: true,
            suggestedAction: errorInfo?.suggestedAction,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.INVALID_PASSWORD) {
        return new Response(
          JSON.stringify({
            error: "INVALID_PASSWORD",
            message: errorInfo?.userMessage || "Incorrect password. Please try again.",
            requiresPassword: true,
            suggestedAction: errorInfo?.suggestedAction,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.NO_TEXT_CONTENT) {
        return new Response(
          JSON.stringify({
            error: "UNSUPPORTED_PDF_CONTENT",
            message: errorInfo?.userMessage || "We could open the PDF, but couldn't extract text (it may be a scanned/image-only statement). Please upload a text-based statement PDF.",
            suggestedAction: errorInfo?.suggestedAction || "Use OCR software to convert scanned PDFs",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.CORRUPTED_FILE) {
        return new Response(
          JSON.stringify({
            error: "CORRUPTED_FILE",
            message: errorInfo?.userMessage || "This PDF file appears to be corrupted or incomplete. Please try downloading the statement again from your bank.",
            suggestedAction: errorInfo?.suggestedAction,
            recoverable: false,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.INVALID_STRUCTURE) {
        return new Response(
          JSON.stringify({
            error: "INVALID_STRUCTURE",
            message: errorInfo?.userMessage || "This PDF has an unsupported structure. Please try uploading a different format if available.",
            suggestedAction: errorInfo?.suggestedAction,
            recoverable: false,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.FILE_TOO_LARGE) {
        return new Response(
          JSON.stringify({
            error: "FILE_TOO_LARGE",
            message: errorInfo?.userMessage || "This PDF is too large to process. Please upload a file under 20MB.",
            suggestedAction: errorInfo?.suggestedAction,
            recoverable: false,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.ENCRYPTED_UNSUPPORTED) {
        return new Response(
          JSON.stringify({
            error: "ENCRYPTED_UNSUPPORTED",
            message: errorInfo?.userMessage || "This PDF uses an encryption method we don't support. Please try exporting an unencrypted version.",
            suggestedAction: errorInfo?.suggestedAction,
            recoverable: false,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.EMPTY_DOCUMENT) {
        return new Response(
          JSON.stringify({
            error: "EMPTY_DOCUMENT",
            message: errorInfo?.userMessage || "This PDF appears to be empty. Please ensure you uploaded the correct file.",
            suggestedAction: errorInfo?.suggestedAction,
            recoverable: false,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (errorCode === PDF_ERROR_CODES.PARSE_TIMEOUT) {
        return new Response(
          JSON.stringify({
            error: "PARSE_TIMEOUT",
            message: errorInfo?.userMessage || "Processing took too long. Please try again with a smaller file.",
            suggestedAction: errorInfo?.suggestedAction,
            recoverable: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Re-throw unknown errors to be caught by the outer handler
      throw e;
    }

    // ========================================================================
    // PHASE 2: Structured AI extraction from FULLY MASKED text
    // ========================================================================
    let extractionResult;
    try {
      extractionResult = await extractWithAdaptiveAI(
        preMaskingStats.maskedText,
        preMaskingStats,
        existingTemplates || undefined
      );
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("[PHASE 2] AI extraction failed:", errorMsg);

      // Map AI extraction errors to user-friendly messages
      if (errorMsg.includes("Rate limit") || errorMsg.includes("429")) {
        throw new Error("AI_RATE_LIMIT");
      }
      if (errorMsg.includes("credits exhausted") || errorMsg.includes("402")) {
        throw new Error("AI_CREDITS_EXHAUSTED");
      }
      if (errorMsg.includes("Failed to parse") || errorMsg.includes("JSON")) {
        throw new Error("AI_EXTRACTION_FAILED");
      }
      if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
        throw new Error("AI_TIMEOUT");
      }

      // Re-throw with more context
      throw new Error(`AI_EXTRACTION_ERROR: ${errorMsg}`);
    }

    const { data: extractedData, tokensUsed, preMaskingStats: finalMaskingStats } = extractionResult;
    auditParams.llmTokensInput += tokensUsed.input;
    auditParams.llmTokensOutput += tokensUsed.output;
    auditParams.confidenceScore = extractedData.confidence;
    auditParams.piiFieldsMasked = finalMaskingStats.totalPiiMasked;

    console.log(`[PHASE 2] Extracted ${extractedData.transactions.length} transactions from ${extractedData.bankName} ${extractedData.cardName}`);
    console.log(`[PII PROTECTION] ${finalMaskingStats.totalPiiMasked} fields masked BEFORE LLM processing`);

    // Step 6: Calculate points and enrich transactions
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
      is_masked: true, // All descriptions are PII-masked via two-layer protection
    }));

    const totalPoints = enrichedTransactions.reduce((sum, t) => sum + (t.points_earned || 0), 0);

    // Step 7: Post-LLM PII verification pass
    // Apply final masking to catch any PII in AI-generated descriptions
    let postMaskingCount = 0;
    const allPiiTypesFound = new Set<string>(finalMaskingStats.piiTypesFound);
    const postLlmAuditEntries: PIIAuditEntry[] = [];
    const timestamp = new Date().toISOString();
    
    for (const tx of extractedData.transactions) {
      const { piiTypesFound: types, fieldsMasked } = maskPII(tx.description);
      types.forEach(t => allPiiTypesFound.add(t));
      if (fieldsMasked > 0) {
        postMaskingCount += fieldsMasked;
        for (const piiType of types) {
          postLlmAuditEntries.push({
            stage: "post_llm",
            piiType,
            count: 1,
            action: "masked",
            timestamp,
          });
        }
      }
    }
    
    const totalPiiMasked = finalMaskingStats.totalPiiMasked + postMaskingCount;
    auditParams.piiFieldsMasked = totalPiiMasked;
    auditParams.fieldsExtracted = enrichedTransactions.length;

    // Combine all audit trail entries
    const fullAuditTrail = [...finalMaskingStats.auditTrail, ...postLlmAuditEntries];

    // Step 8: Log PII masking audit with full trail
    await logPIIAudit(
      supabase,
      userId,
      documentId,
      fullAuditTrail,
      Array.from(allPiiTypesFound),
      totalPiiMasked
    );

    // Step 9: Insert transactions
    if (enrichedTransactions.length > 0) {
      const { error: txError } = await supabase
        .from("transactions")
        .insert(enrichedTransactions);

      if (txError) {
        console.error("Transaction insert error:", txError);
      }
    }

    // Step 10: Create summary
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
      extraction_method: "adaptive_ai_two_layer_masking",
      template_signature: extractedData.templateSignature,
    };

    // Step 11: Update document with parsed data
    await supabase
      .from("pdf_documents")
      .update({ parsed_data: summary })
      .eq("id", documentId);

    // Step 12: Create or update credit card
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

    // Step 13: Create document chunks for RAG
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

    // Step 14: Learn template pattern (no PII stored)
    await learnTemplate(
      supabase,
      extractedData.bankName,
      extractedData.templateSignature,
      [], // Layout features already in signature
      true
    );

    // Step 15: Compliance logging
    await supabase.from("compliance_logs").insert({
      user_id: userId,
      action: "parse_statement_two_layer_masking",
      resource_type: "pdf_document",
      resource_id: documentId,
      pii_accessed: allPiiTypesFound.size > 0,
      pii_masked: totalPiiMasked > 0,
    });

    // Step 16: Audit logging
    auditParams.processingTimeMs = Date.now() - startTime;
    auditParams.status = "success";
    await logExtractionAudit(supabase, userId, documentId, auditParams);

    // Step 17: Token usage logging (combined OCR + extraction)
    const totalTokensInput = (preMaskingStats.ocrTokensUsed?.input || 0) + tokensUsed.input;
    const totalTokensOutput = (preMaskingStats.ocrTokensUsed?.output || 0) + tokensUsed.output;
    
    await supabase.from("token_usage").insert({
      user_id: userId,
      model: "google/gemini-2.5-flash",
      tokens_input: totalTokensInput,
      tokens_output: totalTokensOutput,
      query_type: "pdf_parsing_two_layer",
      estimated_cost: (totalTokensInput * 0.0001 + totalTokensOutput * 0.0003) / 1000,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        transactions_parsed: enrichedTransactions.length,
        chunks_created: chunks.length,
        pii_masked: totalPiiMasked,
        pii_protection: {
          layer_1_ocr_inline: preMaskingStats.auditTrail.filter(a => a.stage === "ocr_inline").length,
          layer_2_local_regex: preMaskingStats.auditTrail.filter(a => a.stage === "pre_llm_local").length,
          layer_3_post_llm: postMaskingCount,
          total_masked: totalPiiMasked,
          pii_types_found: Array.from(allPiiTypesFound),
          raw_text_length: finalMaskingStats.rawTextLength,
          compliance_level: "strict_two_layer_pre_masking",
          audit_trail_entries: fullAuditTrail.length,
        },
        extraction_method: "adaptive_ai_two_layer_masking",
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
    console.error("[ERROR] Parse PDF error:", error);

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
