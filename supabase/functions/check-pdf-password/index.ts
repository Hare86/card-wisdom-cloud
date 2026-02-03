import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Lightweight PDF password detection
 * Uses a minimal AI call to quickly check if PDF is password-protected
 * Returns within 2-5 seconds to avoid blocking upload flow
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { filePath, documentId } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "No file path provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CHECK-PASSWORD] Checking PDF: ${filePath}`);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdf-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download document");
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const pdfBase64 = btoa(binary);

    // Check PDF binary for encryption markers FIRST
    const pdfString = new TextDecoder().decode(uint8Array);
    const isEncrypted = pdfString.includes("/Encrypt") ||
                       pdfString.includes("/Filter/Standard") ||
                       pdfString.includes("/Filter/Crypt");

    if (isEncrypted) {
      console.log("[CHECK-PASSWORD] PDF contains encryption markers in binary");
      return new Response(
        JSON.stringify({
          isPasswordProtected: true,
          documentId,
          detected: "binary_markers",
          note: "PDF contains encryption dictionary"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Quick AI check - minimal prompt for fast response
    const checkPrompt = `Analyze this PDF document. Your ONLY task is to determine if it's password-protected.

RESPOND WITH EXACTLY ONE OF:
- "PROTECTED" if the PDF requires a password to open or read
- "ACCESSIBLE" if you can read the content without a password

No other output. Just the single word.`;

    console.log("[CHECK-PASSWORD] Sending quick AI check...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fastest model for quick check
        messages: [
          { 
            role: "user", 
            content: [
              { type: "text", text: checkPrompt },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
            ]
          }
        ],
        max_tokens: 20, // Minimal tokens needed
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CHECK-PASSWORD] AI check failed:", response.status, errorText);

      // Detect password-protected PDF: AI Gateway returns specific errors when PDF is encrypted
      // Check for ANY indication of password protection or encryption
      const passwordIndicators = [
        "no pages",
        "document has no pages",
        "empty document",
        "cannot be opened",
        "encrypted",
        "password",
        "protected",
        "authentication",
        "decrypt",
        "cipher",
        "not readable",
        "access denied"
      ];

      const textLower = errorText.toLowerCase();
      const hasPasswordIndicator = passwordIndicators.some(indicator => textLower.includes(indicator));

      if (hasPasswordIndicator) {
        console.log("[CHECK-PASSWORD] Detected password-protected PDF via error pattern");
        return new Response(
          JSON.stringify({
            isPasswordProtected: true,
            documentId,
            detected: "error_pattern",
            errorHint: errorText.substring(0, 100)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For 400 errors without clear indicators, likely password-protected
      // Bank statements are typically encrypted
      if (response.status === 400) {
        console.log("[CHECK-PASSWORD] 400 error, likely password-protected");
        return new Response(
          JSON.stringify({
            isPasswordProtected: true,
            documentId,
            detected: "error_status",
            note: "AI model rejected PDF, likely encrypted"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If we can't determine, assume not protected to allow parsing attempt
      console.log("[CHECK-PASSWORD] Unable to determine, assuming accessible");
      return new Response(
        JSON.stringify({
          isPasswordProtected: false,
          documentId,
          checked: false,
          note: "Unable to check, will detect during parsing"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
    
    console.log(`[CHECK-PASSWORD] AI response: "${content}"`);

    const isProtected = content.includes("PROTECTED") && !content.includes("ACCESSIBLE");

    console.log(`[CHECK-PASSWORD] Result: ${isProtected ? "Password required" : "Accessible"}`);

    return new Response(
      JSON.stringify({
        isPasswordProtected: isProtected,
        documentId,
        checked: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[CHECK-PASSWORD] Error:", error);
    
    // On error, return false to not block the flow
    // The parse-pdf function will catch password issues later
    return new Response(
      JSON.stringify({ 
        isPasswordProtected: false, 
        error: error instanceof Error ? error.message : "Check failed",
        checked: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
