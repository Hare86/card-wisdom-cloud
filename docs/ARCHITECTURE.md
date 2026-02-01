# Credit Card Reward Intelligence Dashboard - Architecture

## System Overview

This document describes the architecture of the Credit Card Reward Intelligence Dashboard, a full-stack AI-powered application for managing and optimizing credit card rewards.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vite)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Dashboard   │  │   Upload     │  │  Analytics   │  │     Auth     │   │
│  │   Page       │  │   Page       │  │    Page      │  │    Pages     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     RAG-Powered Chat Interface                       │   │
│  │  • Streaming responses • Semantic caching • User feedback           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE FUNCTIONS (Deno/Supabase)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   rag-chat   │  │  parse-pdf   │  │   scrape-    │  │  analytics   │   │
│  │              │  │              │  │   benefits   │  │              │   │
│  │ • RAG        │  │ • PII Mask   │  │              │  │ • Token      │   │
│  │ • Cache      │  │ • Extract    │  │ • Bank Data  │  │   Usage      │   │
│  │ • Eval       │  │ • Chunk      │  │ • Anti-bot   │  │ • ROI        │   │
│  │ • Multi-LLM  │  │ • Categorize │  │ • Schedule   │  │ • Compliance │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   LOVABLE AI GATEWAY │  │  SUPABASE/CLOUD  │  │     STORAGE          │
├──────────────────────┤  ├──────────────────┤  ├──────────────────────┤
│ • Gemini 3 Flash     │  │                  │  │                      │
│ • Gemini 2.5 Pro     │  │  PostgreSQL DB   │  │  PDF Documents       │
│ • GPT-5              │  │  with pgvector   │  │  Bucket              │
│ • GPT-5 Mini         │  │                  │  │                      │
│                      │  │  • Profiles      │  │                      │
│ Model Selection:     │  │  • Cards         │  │                      │
│ • chat → flash       │  │  • Transactions  │  │                      │
│ • analysis → pro     │  │  • Chunks        │  │                      │
│ • parsing → flash    │  │  • Cache         │  │                      │
└──────────────────────┘  │  • Evaluations   │  └──────────────────────┘
                          │  • Alerts        │
                          │  • Benefits KB   │
                          └──────────────────┘
```

## Component Details

### 1. Frontend Layer (React/Vite/Tailwind)
- **Dashboard**: Card overview, stats, recommendations
- **Upload**: PDF upload with drag-drop, card selection
- **Analytics**: Token usage, RAGAS metrics, compliance reports
- **Chat**: RAG-powered streaming chat with feedback

### 2. Edge Functions (Backend)

#### `rag-chat` - Main AI Pipeline
- Semantic cache lookup (92% similarity threshold)
- RAG context retrieval from user documents + benefits KB
- Multi-model routing based on task complexity
- RAGAS-style evaluation (faithfulness, relevance)
- Token usage logging for ROI analysis

#### `parse-pdf` - Document Processing (Two-Layer PII Protection)
- **Layer 1**: OCR extraction with in-prompt PII filtering (gemini-2.5-flash-lite)
- **Layer 2**: Local regex-based comprehensive masking (no API calls)
- **Layer 3**: Post-LLM verification pass for AI-generated content
- Transaction extraction with categorization
- Points calculation based on card reward rates
- Document chunking for RAG indexing
- Full audit trail logging (PIIAuditEntry per stage)
- Compliance logging

#### `scrape-benefits` - Knowledge Base Updates
- Bank portal scraping simulation
- Weekly update frequency
- Anti-bot handling (proxies, delays)
- Benefits data normalization

#### `analytics` - Monitoring & Compliance
- Token usage aggregation
- Cost analysis by model/query type
- Cache hit rate tracking
- GDPR/PCI-DSS compliance reports
- ROI calculations

### 3. Database Schema (PostgreSQL + pgvector)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with metadata |
| `credit_cards` | User's card information |
| `pdf_documents` | Uploaded statement metadata |
| `document_chunks` | Chunked text with embeddings |
| `transactions` | Parsed transactions |
| `query_cache` | Semantic cache with embeddings |
| `token_usage` | Usage logs for ROI |
| `ai_evaluations` | Response quality metrics |
| `user_alerts` | Expiring points, milestones |
| `card_benefits` | Knowledge base of card features |
| `compliance_logs` | Audit trail |
| `pii_masking_log` | PII handling records |

### 4. Security & Compliance

#### PII Protection Pipeline (Three-Layer Defense)
1. **OCR Inline Filtering**: LLM instructed to mask PII during text extraction
2. **Local Regex Masking**: Comprehensive pattern matching (credit cards, PAN, Aadhaar, email, phone, addresses)
3. **Post-LLM Verification**: Final pass on AI-generated content

#### Masked PII Types
- Credit card numbers → `XXXX-XXXX-XXXX-[last4]`
- PAN → `XXXXX****X`
- Aadhaar → `XXXX-XXXX-****`
- Email → `xx***@domain.com`
- Phone → `XXXXXX[last4]`
- Addresses → `[ADDRESS_MASKED]`
- Account numbers → `[ACCOUNT_MASKED]`

#### Audit Trail
- `PIIAuditEntry` records per masking stage (ocr_inline, pre_llm_local, post_llm)
- `pii_masking_log` table: PII types found, fields masked per document
- `extraction_audit_log` table: Full processing metadata including tokens used
- `compliance_logs` table: Resource access and masking flags

- **Encryption**: At-rest and in-transit
- **RLS Policies**: Row-level security on all user tables
- **GDPR Alignment**: Data minimization, purpose limitation
- **PCI-DSS Alignment**: Card data masking, access controls

### 5. RAG Pipeline

```
User Query
    │
    ▼
┌─────────────────┐
│ Cache Lookup    │ ──(hit)──→ Return Cached Response
│ (92% similarity)│
└────────┬────────┘
         │ (miss)
         ▼
┌─────────────────┐
│ Context         │
│ Retrieval       │
│ • User docs     │
│ • Benefits KB   │
│ • Transactions  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Model Selection │
│ • chat → flash  │
│ • analysis → pro│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM Generation  │
│ (streaming)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-process    │
│ • Cache store   │
│ • Log tokens    │
│ • Evaluate      │
└─────────────────┘
```

### 6. Evaluation Metrics (RAGAS-style)

- **Faithfulness**: How grounded is the response in context
- **Relevance**: How well does it address the query
- **Latency**: Response time tracking
- **User Feedback**: Thumbs up/down collection

### 7. Cost Optimization

- **Semantic Cache**: 7-day TTL, 92% similarity threshold
- **Model Routing**: Use cheaper models for simple queries
- **Token Tracking**: Per-query cost logging
- **ROI Analysis**: User value vs AI cost ratio

## Roadmap

1. **Phase 2**: Real PDF parsing with Unstructured.io
2. **Phase 3**: Pinecone vector DB for scale
3. **Phase 4**: Mobile app (React Native)
4. **Phase 5**: Partner marketplace
5. **Phase 6**: Push notifications for alerts
