import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Unlock, CheckCircle2, ArrowRight, ShieldAlert, AlertTriangle } from "lucide-react";

interface PDFUnlockGuideProps {
  fileName?: string;
  onDismiss?: () => void;
}

export function PDFUnlockGuide({ fileName, onDismiss }: PDFUnlockGuideProps) {
  const steps = [
    {
      number: 1,
      title: "Open iLovePDF Unlock Tool",
      description: "Click the button below to open the free online PDF unlocker",
      action: (
        <Button
          variant="default"
          size="sm"
          className="mt-2"
          asChild
        >
          <a
            href="https://www.ilovepdf.com/unlock_pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open iLovePDF
          </a>
        </Button>
      ),
    },
    {
      number: 2,
      title: "Upload & Unlock",
      description: "Upload your password-protected PDF and enter the password to unlock it",
    },
    {
      number: 3,
      title: "Download Unlocked PDF",
      description: "Download the unlocked version of your PDF",
    },
    {
      number: 4,
      title: "Upload Here",
      description: "Come back and upload the unlocked PDF file",
    },
  ];

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Unlock Your PDF</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
        <CardDescription>
          {fileName ? (
            <>
              <span className="font-medium text-foreground">{fileName}</span> uses encryption that cannot be processed directly.
            </>
          ) : (
            "This PDF uses encryption that cannot be processed directly."
          )}
          {" "}Follow these steps to unlock it:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Warning */}
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Security Notice</AlertTitle>
          <AlertDescription className="text-xs mt-1 space-y-2">
            <p>
              <strong>Be aware:</strong> Using external PDF tools means uploading your bank statement 
              (containing personal & financial data) to third-party servers outside our control.
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Your statement may contain PII (name, address, account numbers)</li>
              <li>Third-party services may log or temporarily store uploaded files</li>
              <li>Your PDF password may be processed on external servers</li>
            </ul>
            <p className="pt-1">
              <strong>Alternatives:</strong> Request an unencrypted e-statement directly from your bank, 
              or use offline tools like Adobe Acrobat (desktop version) for maximum privacy.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground hidden sm:block" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
                {step.action}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Why is this needed?</p>
              <p className="text-muted-foreground mt-1">
                Bank statements often use encryption for security. While we support password-protected PDFs, 
                some encryption methods require unlocking first. The services below are widely used, 
                but please consider the security implications above.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://www.adobe.com/acrobat/online/unlock-pdf.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Adobe Acrobat Online
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://smallpdf.com/unlock-pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              SmallPDF
            </a>
          </Button>
        </div>

        {/* Safer alternative callout */}
        <div className="p-3 border border-border rounded-lg bg-background">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Safer Alternative</p>
              <p className="mt-1">
                Contact your bank to request an <strong>unencrypted digital statement</strong> or 
                use the <strong>desktop version of Adobe Acrobat</strong> to unlock PDFs locally 
                without uploading to any server.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
