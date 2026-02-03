/**
 * Client-side PDF validation utilities
 * Catches issues early before upload to provide better UX
 */

export interface PDFValidationResult {
  isValid: boolean;
  errorCode?: PDFValidationErrorCode;
  errorMessage?: string;
  suggestedAction?: string;
}

export type PDFValidationErrorCode = 
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_TOO_SMALL'
  | 'INVALID_PDF_HEADER'
  | 'EMPTY_FILE'
  | 'POTENTIALLY_CORRUPTED';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MIN_FILE_SIZE = 100; // 100 bytes minimum for a valid PDF
const PDF_HEADER_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF

export const PDF_ERROR_MESSAGES: Record<PDFValidationErrorCode, { message: string; action: string }> = {
  INVALID_FILE_TYPE: {
    message: 'This file is not a PDF document.',
    action: 'Please select a PDF file (.pdf extension).',
  },
  FILE_TOO_LARGE: {
    message: 'This file exceeds the 20MB size limit.',
    action: 'Try compressing the PDF or splitting it into smaller files.',
  },
  FILE_TOO_SMALL: {
    message: 'This file is too small to be a valid PDF.',
    action: 'The file may be empty or corrupted. Try downloading it again.',
  },
  INVALID_PDF_HEADER: {
    message: 'This file does not have a valid PDF structure.',
    action: 'The file may be corrupted or not a real PDF. Try re-exporting it from the source.',
  },
  EMPTY_FILE: {
    message: 'This file appears to be empty.',
    action: 'Please select a valid PDF file with content.',
  },
  POTENTIALLY_CORRUPTED: {
    message: 'This PDF may be corrupted or incomplete.',
    action: 'Try downloading the file again or re-exporting from your bank portal.',
  },
};

/**
 * Validates a PDF file before upload
 * Performs client-side checks to catch common issues early
 */
export async function validatePDFFile(file: File): Promise<PDFValidationResult> {
  // Check file type
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      errorCode: 'INVALID_FILE_TYPE',
      ...PDF_ERROR_MESSAGES.INVALID_FILE_TYPE,
    };
  }

  // Check file size - too large
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      errorCode: 'FILE_TOO_LARGE',
      errorMessage: `File size is ${formatFileSize(file.size)}, which exceeds the 20MB limit.`,
      suggestedAction: PDF_ERROR_MESSAGES.FILE_TOO_LARGE.action,
    };
  }

  // Check file size - empty
  if (file.size === 0) {
    return {
      isValid: false,
      errorCode: 'EMPTY_FILE',
      ...PDF_ERROR_MESSAGES.EMPTY_FILE,
    };
  }

  // Check file size - too small
  if (file.size < MIN_FILE_SIZE) {
    return {
      isValid: false,
      errorCode: 'FILE_TOO_SMALL',
      ...PDF_ERROR_MESSAGES.FILE_TOO_SMALL,
    };
  }

  // Read file header to verify PDF signature
  try {
    const headerBytes = await readFileHeader(file, 8);
    
    // Check for %PDF- signature
    const hasPDFSignature = PDF_HEADER_SIGNATURE.every(
      (byte, index) => headerBytes[index] === byte
    );

    if (!hasPDFSignature) {
      return {
        isValid: false,
        errorCode: 'INVALID_PDF_HEADER',
        ...PDF_ERROR_MESSAGES.INVALID_PDF_HEADER,
      };
    }

    // Check for PDF version (should be like %PDF-1.x or %PDF-2.x)
    const headerString = new TextDecoder().decode(headerBytes);
    const versionMatch = headerString.match(/%PDF-(\d+\.\d+)/);
    
    if (!versionMatch) {
      return {
        isValid: false,
        errorCode: 'POTENTIALLY_CORRUPTED',
        errorMessage: 'PDF version header is malformed.',
        suggestedAction: PDF_ERROR_MESSAGES.POTENTIALLY_CORRUPTED.action,
      };
    }

    // All checks passed
    return { isValid: true };
  } catch (error) {
    console.error('PDF validation error:', error);
    return {
      isValid: false,
      errorCode: 'POTENTIALLY_CORRUPTED',
      errorMessage: 'Could not read file contents.',
      suggestedAction: PDF_ERROR_MESSAGES.POTENTIALLY_CORRUPTED.action,
    };
  }
}

/**
 * Reads the first N bytes of a file
 */
async function readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Server-side error codes returned by parse-pdf edge function
 */
export type PDFParseErrorCode =
  | 'CORRUPTED_FILE'
  | 'INVALID_STRUCTURE'
  | 'ENCRYPTED_UNSUPPORTED'
  | 'FILE_TOO_LARGE'
  | 'PARSE_TIMEOUT'
  | 'PASSWORD_REQUIRED'
  | 'INVALID_PASSWORD'
  | 'UNSUPPORTED_PDF_CONTENT'
  | 'AI_RATE_LIMIT'
  | 'AI_CREDITS_EXHAUSTED'
  | 'AI_EXTRACTION_FAILED'
  | 'AI_TIMEOUT'
  | 'AI_EXTRACTION_ERROR'
  | 'UNKNOWN_ERROR';

export interface PDFParseError {
  code: PDFParseErrorCode;
  message: string;
  userMessage: string;
  suggestedAction: string;
}

export const PARSE_ERROR_DETAILS: Record<PDFParseErrorCode, { userMessage: string; suggestedAction: string }> = {
  CORRUPTED_FILE: {
    userMessage: 'This PDF file appears to be corrupted or damaged.',
    suggestedAction: 'Try downloading the statement again from your bank portal, or contact your bank for a new copy.',
  },
  INVALID_STRUCTURE: {
    userMessage: 'This PDF has an unsupported or malformed structure.',
    suggestedAction: 'Try opening the PDF in Adobe Reader and re-saving it, or export a new copy from your bank.',
  },
  ENCRYPTED_UNSUPPORTED: {
    userMessage: 'This PDF uses an encryption method we cannot process.',
    suggestedAction: 'Try printing the PDF to a new PDF file without encryption, or contact your bank for an unencrypted version.',
  },
  FILE_TOO_LARGE: {
    userMessage: 'This PDF is too large to process.',
    suggestedAction: 'Try splitting the PDF into smaller files (e.g., by month) and upload them separately.',
  },
  PARSE_TIMEOUT: {
    userMessage: 'Processing took too long and was stopped.',
    suggestedAction: 'Try uploading a smaller file or wait a few minutes and try again.',
  },
  PASSWORD_REQUIRED: {
    userMessage: 'This PDF is password protected.',
    suggestedAction: 'Enter the password to unlock the document.',
  },
  INVALID_PASSWORD: {
    userMessage: 'The password you entered is incorrect.',
    suggestedAction: 'Please check the password and try again. Common passwords include your date of birth or registered mobile number.',
  },
  UNSUPPORTED_PDF_CONTENT: {
    userMessage: 'This PDF contains only scanned images without extractable text.',
    suggestedAction: 'Try requesting a digital statement from your bank instead of a scanned copy.',
  },
  AI_RATE_LIMIT: {
    userMessage: 'AI processing rate limit reached.',
    suggestedAction: 'Please wait a few minutes and try again.',
  },
  AI_CREDITS_EXHAUSTED: {
    userMessage: 'AI processing credits have been exhausted.',
    suggestedAction: 'Please contact support to continue processing documents.',
  },
  AI_EXTRACTION_FAILED: {
    userMessage: 'AI could not extract data from this statement format.',
    suggestedAction: 'This statement format may not be supported. Try a different month or contact support.',
  },
  AI_TIMEOUT: {
    userMessage: 'AI processing timed out.',
    suggestedAction: 'Try uploading a smaller file or wait a few minutes and try again.',
  },
  AI_EXTRACTION_ERROR: {
    userMessage: 'An error occurred during AI data extraction.',
    suggestedAction: 'Please try again. If the problem persists, try a different statement file.',
  },
  UNKNOWN_ERROR: {
    userMessage: 'An unexpected error occurred while processing this PDF.',
    suggestedAction: 'Please try again. If the problem persists, try a different statement file.',
  },
};

/**
 * Maps server error responses to user-friendly error details
 */
export function mapServerError(error: string | { error?: string; code?: string; message?: string }): PDFParseError {
  let errorCode: PDFParseErrorCode = 'UNKNOWN_ERROR';
  let rawMessage = '';

  if (typeof error === 'string') {
    rawMessage = error;
  } else {
    rawMessage = error.error || error.message || '';
    if (error.code) {
      errorCode = error.code as PDFParseErrorCode;
    }
  }

  // Try to match error code from message
  const errorCodeMatch = Object.keys(PARSE_ERROR_DETAILS).find(
    (code) => rawMessage.toUpperCase().includes(code)
  );

  if (errorCodeMatch) {
    errorCode = errorCodeMatch as PDFParseErrorCode;
  }

  const details = PARSE_ERROR_DETAILS[errorCode] || PARSE_ERROR_DETAILS.UNKNOWN_ERROR;

  return {
    code: errorCode,
    message: rawMessage,
    userMessage: details.userMessage,
    suggestedAction: details.suggestedAction,
  };
}
