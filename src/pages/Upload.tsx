import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload as UploadIcon, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Lock
} from "lucide-react";
import { validatePDFFile, mapServerError, type PDFParseError } from "@/lib/pdf-validation";
import { PDFErrorAlert } from "@/components/upload/PDFErrorAlert";

interface ParsedData {
  transaction_count?: number;
  transactions_parsed?: number;
  total_points_earned?: number;
  detected_card?: {
    bank_name?: string;
    card_name?: string;
    confidence?: number;
  } | null;
  bank_name?: string;
  card_name?: string;
  pii_masked?: number;
  confidence?: number;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  created_at: string;
  document_type: string;
  parsed_data: unknown;
}

const CARD_OPTIONS = [
  { value: "default", label: "Auto-detect (Recommended)" },
  { value: "Infinia", label: "HDFC Infinia" },
  { value: "Regalia", label: "HDFC Regalia" },
  { value: "Diners Club Black", label: "HDFC Diners Club Black" },
  { value: "MoneyBack", label: "HDFC MoneyBack" },
  { value: "Millennia", label: "HDFC Millennia" },
  { value: "Atlas", label: "Axis Atlas" },
  { value: "Reserve", label: "Axis Reserve" },
  { value: "Magnus", label: "Axis Magnus" },
  { value: "Flipkart", label: "Axis Flipkart" },
  { value: "Emeralde", label: "ICICI Emeralde" },
  { value: "Sapphiro", label: "ICICI Sapphiro" },
  { value: "Amazon Pay", label: "ICICI Amazon Pay" },
  { value: "Elite", label: "SBI Elite" },
  { value: "Prime", label: "SBI Prime" },
];

export default function Upload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedCard, setSelectedCard] = useState("default");
  
  // PDF parsing error state for displaying actionable errors
  const [parseError, setParseError] = useState<(PDFParseError & { fileName?: string }) | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchUploadedFiles = useCallback(async () => {
    try {
      const sb = getSupabaseClient();
      if (!sb) return;
      const { data, error } = await sb
        .from("pdf_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const validateFilesBeforeUpload = useCallback(async (files: File[]): Promise<File[]> => {
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = await validatePDFFile(file);

      if (!validation.isValid) {
        setParseError({
          code:
            (validation.errorCode as unknown as import("@/lib/pdf-validation").PDFParseError["code"]) ||
            "UNKNOWN_ERROR",
          message: validation.errorMessage || "",
          userMessage: validation.errorMessage || "File validation failed",
          suggestedAction: validation.suggestedAction || "Please try a different file.",
          fileName: file.name,
        });

        toast({
          variant: "destructive",
          title: "Invalid PDF file",
          description: `${file.name}: ${validation.errorMessage}`,
        });
      } else {
        validFiles.push(file);
      }
    }

    return validFiles;
  }, [toast]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user) return;

    const sb = getSupabaseClient();
    if (!sb) {
      toast({
        variant: "destructive",
        title: "Backend not configured",
        description: "Cannot upload files in this environment.",
      });
      return;
    }

    setIsUploading(true);

    for (const file of files) {
      try {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;

        // Upload to storage
        const { error: uploadError } = await sb.storage
          .from("pdf-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await sb
          .from("pdf_documents")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            document_type: "statement",
          })
          .select()
          .single();

        if (dbError) throw dbError;

        toast({
          title: "File uploaded",
          description: `${file.name} ready. Click "Parse" to extract data.`,
        });

        await fetchUploadedFiles();
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
        });
      }
    }

    setIsUploading(false);
  }, [user, toast, fetchUploadedFiles]);

  useEffect(() => {
    if (user) {
      fetchUploadedFiles();
    }
  }, [user, fetchUploadedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setParseError(null);
    
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload PDF files only.",
      });
      return;
    }
    
    const validatedFiles = await validateFilesBeforeUpload(files);
    if (validatedFiles.length > 0) {
      uploadFiles(validatedFiles);
    }
  }, [toast, uploadFiles, validateFilesBeforeUpload]);
  

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const files = e.target.files ? Array.from(e.target.files) : [];
    
    if (files.length > 0) {
      const validatedFiles = await validateFilesBeforeUpload(files);
      if (validatedFiles.length > 0) {
        uploadFiles(validatedFiles);
      }
    }
  };

  const parseDocument = async (file: UploadedFile): Promise<{ success: boolean; errorCode?: string }> => {
    if (!user) return { success: false, errorCode: "NO_USER" };

    setIsParsing(file.id);
    setParseError(null);

    try {
      toast({
        title: "Parsing document...",
        description: "AI is analyzing your credit card statement. This may take 10-30 seconds.",
      });

      const sb = getSupabaseClient();
      if (!sb) throw new Error("Backend not configured");
      
      const response = await sb.functions.invoke("parse-pdf", {
        body: {
          documentId: file.id,
          userId: user.id,
          filePath: file.file_path,
          cardName: selectedCard,
        },
      });

      // Handle password-protected PDF error
      if (response.data?.error === "PASSWORD_REQUIRED" || response.data?.requiresPassword) {
        setParseError({
          code: "PASSWORD_REQUIRED",
          message: "This PDF is password protected.",
          userMessage: "This PDF is password protected.",
          suggestedAction: "Please unlock the PDF using an external tool (like iLovePDF or Adobe Acrobat) before uploading, or request an unencrypted statement from your bank.",
          fileName: file.file_name,
        });
        
        toast({
          variant: "destructive",
          title: "Password-protected PDF",
          description: "Please upload an unlocked/passwordless PDF file.",
        });
        
        setIsParsing(null);
        return { success: false, errorCode: "PASSWORD_REQUIRED" };
      }

      // Check for structured error responses from the edge function
      if (response.data?.error) {
        const parsedError = mapServerError(response.data);
        setParseError({
          ...parsedError,
          fileName: file.file_name,
        });

        toast({
          variant: "destructive",
          title: "Parsing failed",
          description: parsedError.userMessage,
        });
        setIsParsing(null);
        return { success: false, errorCode: response.data.error };
      }

      if (response.error) {
        throw response.error;
      }
      
      const data = response.data;

      setParseError(null);

      const detectedInfo = data.detected_card 
        ? `Detected: ${data.detected_card.bank_name} ${data.detected_card.card_name} (${Math.round(data.confidence * 100)}% confidence)`
        : "";
      
      toast({
        title: "Document parsed successfully",
        description: `Extracted ${data.transactions_parsed} transactions using Adaptive AI. ${data.pii_masked} PII fields masked. ${detectedInfo}`,
      });

      fetchUploadedFiles();
      setIsParsing(null);
      return { success: true };
    } catch (error) {
      console.error("Parse error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to parse document. Please try again.";

      // Check for password requirement in error
      if (errorMessage.includes("PASSWORD_REQUIRED") || errorMessage.includes("password")) {
        setParseError({
          code: "PASSWORD_REQUIRED",
          message: "This PDF is password protected.",
          userMessage: "This PDF is password protected.",
          suggestedAction: "Please unlock the PDF using an external tool (like iLovePDF or Adobe Acrobat) before uploading, or request an unencrypted statement from your bank.",
          fileName: file.file_name,
        });
        
        setIsParsing(null);
        return { success: false, errorCode: "PASSWORD_REQUIRED" };
      }

      const parsedError = mapServerError(errorMessage);
      setParseError({
        ...parsedError,
        fileName: file.file_name,
      });

      toast({
        variant: "destructive",
        title: "Parsing failed",
        description: parsedError.userMessage,
      });
      setIsParsing(null);
      return { success: false, errorCode: parsedError.code };
    }
  };

  const deleteFile = async (file: UploadedFile) => {
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error("Backend not configured");
      
      // Delete from storage
      await sb.storage
        .from("pdf-documents")
        .remove([file.file_path]);

      // Delete from database
      const { error: dbError } = await sb
        .from("pdf_documents")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: `${file.file_name} has been removed.`,
      });
      
      fetchUploadedFiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete file. Please try again.",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            Upload <span className="gradient-text">Documents</span>
          </h1>
          <p className="text-muted-foreground">
            Upload any bank's credit card statement - AI adapts to all formats automatically
          </p>
        </div>

        {/* Error Alert */}
        {parseError && (
          <div className="mb-6">
            <PDFErrorAlert
              errorCode={parseError.code}
              errorMessage={parseError.userMessage}
              suggestedAction={parseError.suggestedAction}
              fileName={parseError.fileName}
              onDismiss={() => setParseError(null)}
              onRetry={parseError.code !== "PASSWORD_REQUIRED" && parseError.fileName ? () => {
                const file = uploadedFiles.find(f => f.file_name === parseError.fileName);
                if (file) {
                  setParseError(null);
                  parseDocument(file);
                }
              } : undefined}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Upload PDF Statement</CardTitle>
              <CardDescription>
                Supports all Indian bank formats • Auto-detection • PII masking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Card Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Card Type (Optional)</label>
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-detect card type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_OPTIONS.map((card) => (
                      <SelectItem key={card.value} value={card.value}>
                        {card.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave as "Auto-detect" for AI-powered card recognition
                </p>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                  ${isDragging 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }
                `}
              >
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-primary/20 rounded-full">
                        <UploadIcon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          PDF files only (max 20MB) • Passwordless PDFs only
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {/* Password Notice */}
              <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <Lock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-3">
                  <p className="font-medium text-warning">Password-Protected PDFs</p>
                  <p className="text-muted-foreground">
                    If your bank statement is password-protected, you can unlock it using one of these methods:
                  </p>
                  
                  {/* Method 1: Browser Print */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Option 1: Unlock via Browser (Recommended)</p>
                    <ol className="list-decimal list-inside text-muted-foreground space-y-1 pl-1">
                      <li>Open the PDF file in your browser (Chrome, Edge, or Safari)</li>
                      <li>Enter the password when prompted to view the document</li>
                      <li>Once the PDF opens, press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+P</kbd> (Windows) or <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Cmd+P</kbd> (Mac) to open print</li>
                      <li>Select "Save as PDF" or "Microsoft Print to PDF" as the printer</li>
                      <li>Save the file — this new PDF will be unlocked and ready to upload</li>
                    </ol>
                  </div>

                  {/* Method 2: Online Tool */}
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Option 2: Use an Online Tool</p>
                    <p className="text-muted-foreground">
                      Visit{" "}
                      <a 
                        href="https://www.ilovepdf.com/unlock_pdf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline text-primary hover:text-primary/80"
                      >
                        iLovePDF Unlock
                      </a>{" "}
                      to remove the password online, then download the unlocked file.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Security & Privacy</p>
                  <p className="text-muted-foreground">
                    • All PII (names, card numbers, emails) automatically masked before AI processing<br/>
                    • Data encrypted and GDPR/PCI-DSS compliant
                  </p>
                </div>
              </div>

              {/* Adaptive System Notice */}
              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Adaptive AI Extraction</p>
                  <p className="text-muted-foreground">
                    Works with any bank statement format. AI learns from each document to improve accuracy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Parse documents to extract transactions and enable RAG
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size || 0)} • {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFile(file)}
                          className="text-destructive hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Parsed Status */}
                      {(() => {
                        const parsed =
                          file.parsed_data && typeof file.parsed_data === "object"
                            ? (file.parsed_data as ParsedData)
                            : null;

                        return parsed ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {parsed.transaction_count ?? parsed.transactions_parsed ?? 0} transactions •{" "}
                              {parsed.total_points_earned ?? 0} points
                            </span>
                          </div>
                          {parsed.detected_card && (
                            <p className="text-xs text-muted-foreground">
                              {parsed.bank_name} {parsed.card_name}
                              {parsed.detected_card.confidence &&
                                ` (${Math.round(parsed.detected_card.confidence * 100)}% confidence)`}
                            </p>
                          )}
                        </div>
                        ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => parseDocument(file)}
                          disabled={isParsing === file.id}
                          className="w-full mt-2"
                        >
                          {isParsing === file.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Parsing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Parse with Adaptive AI
                            </>
                          )}
                        </Button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
