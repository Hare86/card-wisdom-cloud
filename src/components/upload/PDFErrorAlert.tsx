import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  FileWarning, 
  Lock, 
  Clock, 
  FileX, 
  RefreshCw,
  ExternalLink,
  X
} from "lucide-react";
import type { PDFParseErrorCode, PDFValidationErrorCode } from "@/lib/pdf-validation";

interface PDFErrorAlertProps {
  errorCode: PDFParseErrorCode | PDFValidationErrorCode;
  errorMessage: string;
  suggestedAction: string;
  fileName?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const ERROR_ICONS: Record<string, typeof AlertCircle> = {
  CORRUPTED_FILE: FileX,
  INVALID_STRUCTURE: FileWarning,
  ENCRYPTED_UNSUPPORTED: Lock,
  FILE_TOO_LARGE: FileWarning,
  PARSE_TIMEOUT: Clock,
  PASSWORD_REQUIRED: Lock,
  INVALID_PASSWORD: Lock,
  UNSUPPORTED_PDF_CONTENT: FileWarning,
  INVALID_FILE_TYPE: FileX,
  FILE_TOO_SMALL: FileX,
  INVALID_PDF_HEADER: FileX,
  EMPTY_FILE: FileX,
  POTENTIALLY_CORRUPTED: FileWarning,
  UNKNOWN_ERROR: AlertCircle,
};

const ERROR_TITLES: Record<string, string> = {
  CORRUPTED_FILE: 'Corrupted PDF',
  INVALID_STRUCTURE: 'Invalid PDF Structure',
  ENCRYPTED_UNSUPPORTED: 'Unsupported Encryption',
  FILE_TOO_LARGE: 'File Too Large',
  PARSE_TIMEOUT: 'Processing Timeout',
  PASSWORD_REQUIRED: 'Password Required',
  INVALID_PASSWORD: 'Incorrect Password',
  UNSUPPORTED_PDF_CONTENT: 'Scanned PDF Not Supported',
  INVALID_FILE_TYPE: 'Invalid File Type',
  FILE_TOO_SMALL: 'Invalid File',
  INVALID_PDF_HEADER: 'Invalid PDF',
  EMPTY_FILE: 'Empty File',
  POTENTIALLY_CORRUPTED: 'Potentially Corrupted',
  UNKNOWN_ERROR: 'Processing Error',
};

export function PDFErrorAlert({
  errorCode,
  errorMessage,
  suggestedAction,
  fileName,
  onDismiss,
  onRetry,
}: PDFErrorAlertProps) {
  const Icon = ERROR_ICONS[errorCode] || AlertCircle;
  const title = ERROR_TITLES[errorCode] || 'Error';

  const isRetryable = [
    'PARSE_TIMEOUT',
    'UNKNOWN_ERROR',
    'POTENTIALLY_CORRUPTED',
  ].includes(errorCode);

  return (
    <Alert variant="destructive" className="relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 text-destructive-foreground/70 hover:text-destructive-foreground hover:bg-destructive-foreground/10"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <Icon className="h-4 w-4" />
      
      <AlertTitle className="pr-8">
        {title}
        {fileName && (
          <span className="font-normal text-destructive-foreground/80">
            {' '}— {fileName}
          </span>
        )}
      </AlertTitle>
      
      <AlertDescription className="mt-2 space-y-3">
        <p>{errorMessage}</p>
        
        <div className="flex items-start gap-2 p-2 bg-destructive-foreground/10 rounded-md">
          <span className="text-xs font-medium shrink-0">💡 Suggested:</span>
          <span className="text-xs">{suggestedAction}</span>
        </div>

        {(isRetryable || errorCode === 'ENCRYPTED_UNSUPPORTED') && (
          <div className="flex gap-2 pt-1">
            {isRetryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 text-xs border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
            )}
            
            {errorCode === 'ENCRYPTED_UNSUPPORTED' && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 text-xs border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
              >
                <a
                  href="https://www.ilovepdf.com/unlock_pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Online PDF Unlocker
                </a>
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
