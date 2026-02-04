import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/safeClient";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload as UploadIcon, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck
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
  // Stored as JSON in the backend; can be any JSON type.
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

// Session-only password cache (cleared on page refresh - security requirement)
// This is stored in React state, NOT localStorage or sessionStorage
interface SessionPasswordCache {
  [documentId: string]: {
    password: string;
    timestamp: number;
  };
}

const PASSWORD_CACHE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

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
  
  // Password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingPasswordFile, setPendingPasswordFile] = useState<UploadedFile | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  // Session-only password cache (memory only - cleared on page refresh)
  const sessionPasswordCacheRef = useRef<SessionPasswordCache>({});
  
  // PDF parsing error state for displaying actionable errors
  const [parseError, setParseError] = useState<(PDFParseError & { fileName?: string }) | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchUploadedFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
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

  // Check if uploaded PDF is password-protected
  const checkPasswordProtection = useCallback(async (file: UploadedFile) => {
    try {
      console.log("[DEBUG] checkPasswordProtection START for file:", file.file_name, "ID:", file.id);

      toast({
        title: "Checking document...",
        description: "Detecting if password is required...",
      });

      const { data, error } = await supabase.functions.invoke("check-pdf-password", {
        body: {
          filePath: file.file_path,
          documentId: file.id,
        },
      });

      console.log("[DEBUG] check-pdf-password response:", { data, error });

      if (error) {
        console.error("[DEBUG] Password check error:", error);
        toast({
          title: "File uploaded",
          description: `${file.file_name} ready. Click "Parse" to extract data.`,
        });
        return;
      }

      console.log("[DEBUG] isPasswordProtected value:", data?.isPasswordProtected);

      if (data?.isPasswordProtected === true) {
        console.log("[DEBUG] PDF IS PASSWORD PROTECTED - Opening dialog");
        setPendingPasswordFile(file);
        setPasswordDialogOpen(true);
        toast({
          title: "Password Required",
          description: "This PDF is password protected. Please enter the password to continue.",
        });
      } else {
        toast({
          title: "File uploaded",
          description: `${file.file_name} ready. Click "Parse" to extract data.`,
        });
      }
    } catch (error) {
      console.error("[DEBUG] Password check exception:", error);
      toast({
        title: "File uploaded",
        description: `${file.file_name} ready. Click "Parse" to extract data.`,
      });
    }
  }, [toast]);

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

    setIsUploading(true);

    for (const file of files) {
      try {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("pdf-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { data: docData, error: dbError } = await supabase
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
          description: `${file.name} uploaded. Checking document...`,
        });

        // Immediately check if PDF is password-protected
        await checkPasswordProtection(docData as unknown as UploadedFile);

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
  }, [user, toast, fetchUploadedFiles, checkPasswordProtection]);

  useEffect(() => {
    if (user) {
      fetchUploadedFiles();
    }
  }, [user, fetchUploadedFiles]);

  // Cleanup expired passwords from cache
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const cache = sessionPasswordCacheRef.current;
      for (const docId in cache) {
        if (now - cache[docId].timestamp > PASSWORD_CACHE_TIMEOUT_MS) {
          delete cache[docId];
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

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
    setParseError(null); // Clear previous errors
    
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
    
    // Validate files before upload
    const validatedFiles = await validateFilesBeforeUpload(files);
    if (validatedFiles.length > 0) {
      uploadFiles(validatedFiles);
    }
  }, [toast, uploadFiles, validateFilesBeforeUpload]);
  

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null); // Clear previous errors
    const files = e.target.files ? Array.from(e.target.files) : [];
    
    if (files.length > 0) {
      const validatedFiles = await validateFilesBeforeUpload(files);
      if (validatedFiles.length > 0) {
        uploadFiles(validatedFiles);
      }
    }
  };

  // (callbacks reordered above to avoid TDZ / "used before declaration" errors)

  const parseDocument = async (file: UploadedFile, providedPassword?: string) => {
    if (!user) return;

    console.log("[DEBUG] parseDocument START for file:", file.file_name, "providedPassword:", !!providedPassword);

    setIsParsing(file.id);
    setParseError(null);

    try {
      toast({
        title: "Parsing document...",
        description: "AI is analyzing your credit card statement. This may take 10-30 seconds.",
      });

      // Check session cache for password (session-only, not persisted)
      const cachedEntry = sessionPasswordCacheRef.current[file.id];
      const usePassword = providedPassword ||
        (cachedEntry && Date.now() - cachedEntry.timestamp < PASSWORD_CACHE_TIMEOUT_MS
          ? cachedEntry.password
          : undefined);

      console.log("[DEBUG] Using password from:", providedPassword ? "providedPassword" : cachedEntry ? "cache" : "none");

      // Call parse-pdf with adaptive AI extraction
      const response = await supabase.functions.invoke("parse-pdf", {
        body: {
          documentId: file.id,
          userId: user.id,
          filePath: file.file_path,
          cardName: selectedCard,
          password: usePassword,
        },
      });

      console.log("[DEBUG] parse-pdf response:", {
        hasData: !!response.data,
        hasError: !!response.error,
        dataError: response.data?.error,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      // Incorrect password: keep dialog open and show a clear message
      if (response.data?.error === "INVALID_PASSWORD") {
        console.log("[DEBUG] INVALID_PASSWORD detected - throwing error to keep dialog open");
        setIsParsing(null);
        throw new Error("INVALID_PASSWORD");
      }

      // Check for password requirement - now returned as 200 with error field
      const isPasswordRequired = response.data?.error === "PASSWORD_REQUIRED" || response.data?.requiresPassword;

      console.log("[DEBUG] Password required check:", {
        isPasswordRequired,
        errorField: response.data?.error,
        requiresPasswordField: response.data?.requiresPassword
      });

      if (isPasswordRequired) {
        console.log("[DEBUG] PASSWORD REQUIRED - Opening password dialog");
        setIsParsing(null);
        setPendingPasswordFile(file);
        setPasswordDialogOpen(true);
        toast({
          title: "Password Required",
          description: "This PDF is password protected. Please enter the password.",
        });
        return;
      }

      // Check for structured error responses from the edge function
      if (response.data?.error) {
        console.log("[DEBUG] Error in response.data:", response.data.error);
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
        return;
      }

      // Throw if there's an actual error
      if (response.error) {
        console.log("[DEBUG] Throwing response.error:", response.error);
        throw response.error;
      }
      
      const data = response.data;

      // Success - cache password for session if used
      if (providedPassword) {
        sessionPasswordCacheRef.current[file.id] = {
          password: providedPassword,
          timestamp: Date.now(),
        };
      }

      // Clear any previous errors on success
      setParseError(null);

      const detectedInfo = data.detected_card 
        ? `Detected: ${data.detected_card.bank_name} ${data.detected_card.card_name} (${Math.round(data.confidence * 100)}% confidence)`
        : "";
      
      toast({
        title: "Document parsed successfully",
        description: `Extracted ${data.transactions_parsed} transactions using Adaptive AI. ${data.pii_masked} PII fields masked. ${detectedInfo}`,
      });

      fetchUploadedFiles();
    } catch (error) {
      console.error("[DEBUG] Parse error caught:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to parse document. Please try again.";
      console.log("[DEBUG] Error message:", errorMessage);

      if (errorMessage.includes("INVALID_PASSWORD")) {
        console.log("[DEBUG] INVALID_PASSWORD in catch - rethrowing");
        setIsParsing(null);
        throw error;
      }

      // Check for password requirement in error
      if (errorMessage.includes("PASSWORD_REQUIRED")) {
        console.log("[DEBUG] PASSWORD_REQUIRED in catch - opening dialog");
        setIsParsing(null);
        setPendingPasswordFile(file);
        setPasswordDialogOpen(true);
        toast({
          title: "Password Required",
          description: "This PDF is password protected. Please enter the password.",
        });
        return;
      }

      // Map the error to user-friendly format
      console.log("[DEBUG] Mapping error to user-friendly format");
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
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pendingPasswordFile || !password.trim()) {
      console.log("[DEBUG] handlePasswordSubmit - missing file or password");
      return;
    }

    console.log("[DEBUG] handlePasswordSubmit START for file:", pendingPasswordFile.file_name);
    setIsSubmittingPassword(true);

    try {
      // Parse with provided password
      await parseDocument(pendingPasswordFile, password);

      console.log("[DEBUG] Password submit SUCCESS - closing dialog");
      // Clear dialog state
      setPasswordDialogOpen(false);
      setPassword("");
      setPendingPasswordFile(null);
    } catch (error) {
      console.log("[DEBUG] Password submit FAILED - keeping dialog open");
      toast({
        variant: "destructive",
        title: "Invalid password",
        description: "The password you entered is incorrect. Please try again.",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordDialogOpen(false);
    setPassword("");
    setPendingPasswordFile(null);
    setShowPassword(false);
  };

  const deleteFile = async (file: UploadedFile) => {
    try {
      // Clear any cached password for this file
      delete sessionPasswordCacheRef.current[file.id];
      
      // Delete from storage
      await supabase.storage
        .from("pdf-documents")
        .remove([file.file_path]);

      // Delete from database
      const { error: dbError } = await supabase
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
              onRetry={parseError.fileName ? () => {
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
                          PDF files only (max 10MB) • Password-protected PDFs supported
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Security & Privacy</p>
                  <p className="text-muted-foreground">
                    • All PII (names, card numbers, emails) automatically masked before AI processing<br/>
                    • Password-protected PDFs supported (password never stored)<br/>
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

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Password Protected PDF
            </DialogTitle>
            <DialogDescription>
              This statement is password protected. Enter the password to proceed.
              {pendingPasswordFile && (
                <span className="block mt-1 font-medium text-foreground">
                  {pendingPasswordFile.file_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-password">PDF Password</Label>
              <div className="relative">
                <Input
                  id="pdf-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter PDF password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password.trim()) {
                      handlePasswordSubmit();
                    }
                  }}
                  className="pr-10"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your password is used only to decrypt the PDF and is never stored. 
                It may be cached in memory for this session (15 min timeout) for convenience.
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handlePasswordCancel}
              disabled={isSubmittingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={!password.trim() || isSubmittingPassword}
            >
              {isSubmittingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Unlock & Parse"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
