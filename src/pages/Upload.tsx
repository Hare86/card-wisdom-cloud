import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload as UploadIcon, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  ArrowLeft 
} from "lucide-react";
import { useEffect } from "react";

interface UploadedFile {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  document_type: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUploadedFiles();
    }
  }, [user]);

  const fetchUploadedFiles = async () => {
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
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );
    if (files.length > 0) {
      uploadFiles(files);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload PDF files only.",
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
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
        const { error: dbError } = await supabase
          .from("pdf_documents")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            document_type: "statement",
          });

        if (dbError) throw dbError;

        toast({
          title: "File uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
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
    fetchUploadedFiles();
  };

  const deleteFile = async (file: UploadedFile) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("pdf-documents")
        .remove([file.file_name]);

      if (storageError) console.warn("Storage delete error:", storageError);

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

      <main className="lg:ml-64 p-4 lg:p-8">
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
            Upload your credit card statements and benefit documents for analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Drag and drop or click to upload credit card statements
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                          PDF files only (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Your uploaded statements and documents
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
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFile(file)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
