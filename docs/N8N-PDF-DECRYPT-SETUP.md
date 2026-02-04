# n8n PDF Decrypt Workflow - Setup Guide

## Overview

This workflow receives password-protected PDFs from Lovable Edge Functions, decrypts them using `pdf-lib`, and returns the unlocked PDF for parsing.

## Architecture

```
User Upload → Lovable Edge Function → n8n Webhook → Decrypt → Return Unlocked PDF → Parse Pipeline
```

## Step 1: Import the Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Add Workflow** → **Import from File**
3. Select `docs/n8n-pdf-decrypt-workflow.json`
4. Click **Import**

## Step 2: Install pdf-lib in n8n

The Code node uses `pdf-lib`. If you're using n8n Cloud, this is already available.

For self-hosted n8n, add to your `package.json`:
```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1"
  }
}
```

## Step 3: Configure & Activate

1. Open the imported workflow
2. Click on the **Webhook** node
3. Copy the **Production URL** (e.g., `https://your-n8n.com/webhook/decrypt-pdf`)
4. **Activate** the workflow (toggle in top-right)

## Step 4: Add Webhook URL to Lovable Secrets

1. In Lovable, go to **Settings** → **Secrets**
2. Add a new secret:
   - Name: `N8N_DECRYPT_WEBHOOK_URL`
   - Value: Your webhook URL from Step 3

## Step 5: Test the Workflow

Test endpoint using curl:
```bash
curl -X POST "https://your-n8n.com/webhook/decrypt-pdf" \
  -H "Content-Type: application/json" \
  -d '{
    "pdfBase64": "<base64-encoded-pdf>",
    "password": "your-pdf-password"
  }'
```

Expected response:
```json
{
  "success": true,
  "unlockedPdfBase64": "<base64-encoded-unlocked-pdf>",
  "pageCount": 5,
  "message": "PDF decrypted successfully"
}
```

## Error Responses

| Error | Meaning |
|-------|---------|
| `WRONG_PASSWORD` | Password is incorrect |
| `NOT_ENCRYPTED` | PDF isn't password-protected |
| `DECRYPT_FAILED` | General decryption failure |

## Security Considerations

1. **Use HTTPS** - Always use HTTPS for the webhook URL
2. **Add Authentication** (Optional) - Add Basic Auth or API key validation:
   - In n8n: Webhook node → Settings → Authentication
   - Pass auth headers from Lovable Edge Function

3. **Limit Access** - Consider IP whitelisting if your n8n supports it

## Workflow Nodes Explained

### 1. Webhook (Trigger)
- Receives POST requests with `{ pdfBase64, password }`
- Path: `/decrypt-pdf`

### 2. Decrypt PDF (Code Node)
```javascript
// Uses pdf-lib to:
// 1. Load encrypted PDF with password
// 2. Save without encryption
// 3. Return as base64
```

### 3. Respond to Webhook
- Returns JSON response with unlocked PDF or error

## Troubleshooting

### "pdf-lib not found"
- Self-hosted: Install pdf-lib in n8n's node_modules
- Cloud: Should work automatically

### "Invalid PDF"
- Ensure you're sending valid base64-encoded PDF
- Check that the PDF isn't corrupted

### "Wrong password"
- Verify the password is correct
- Some PDFs use owner passwords (print restrictions) vs user passwords (open restrictions)

## Alternative: Add Retry Logic

For production, consider adding error handling:

```javascript
// In the Code node, add retry for transient failures
const MAX_RETRIES = 3;
let attempt = 0;

while (attempt < MAX_RETRIES) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { password });
    // ... success logic
    break;
  } catch (error) {
    if (error.message.includes('password')) throw error; // Don't retry auth errors
    attempt++;
    if (attempt >= MAX_RETRIES) throw error;
    await new Promise(r => setTimeout(r, 1000 * attempt));
  }
}
```
