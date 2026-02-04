# Technical Design Document (TDD)
## Credit Card Reward Intelligence Dashboard

| Document Information | |
|---------------------|---|
| **Document Version** | 1.1 |
| **Last Updated** | February 4, 2026 |
| **Author** | System Architect |
| **Status** | Approved |
| **Classification** | Internal/Confidential |

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Design](#3-architecture-design)
4. [Component Specifications](#4-component-specifications)
5. [Database Design](#5-database-design)
6. [API Specifications](#6-api-specifications)
7. [Security Architecture](#7-security-architecture)
8. [Sequence Diagrams](#8-sequence-diagrams)
9. [Credentials & Configuration](#9-credentials--configuration)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Performance & Scalability](#11-performance--scalability)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### 1.1 Purpose
The Credit Card Reward Intelligence Dashboard is a full-stack AI-powered web application designed to help users maximize their credit card rewards through intelligent spending analysis, automated document parsing, and AI-driven redemption recommendations.

### 1.2 Scope
This document covers the complete technical architecture including:
- Frontend React application
- Backend Edge Functions (Deno)
- Database schema (PostgreSQL with pgvector)
- AI/ML integration (RAG pipeline)
- Security and compliance measures

### 1.3 Audience
- Development Team
- DevOps/SRE Engineers
- Security Team
- Product Managers
- QA Engineers

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vite)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Dashboard   │  │   Upload     │  │  Analytics   │  │     Auth     │    │
│  │   Page       │  │   Page       │  │    Page      │  │    Pages     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     RAG-Powered Chat Interface                       │    │
│  │  • Streaming responses • Semantic caching • User feedback           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE FUNCTIONS (Deno/Supabase)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   rag-chat   │  │  parse-pdf   │  │   scrape-    │  │  analytics   │    │
│  │              │  │              │  │   benefits   │  │              │    │
│  │ • RAG        │  │ • PII Mask   │  │              │  │ • Token      │    │
│  │ • Cache      │  │ • Extract    │  │ • Bank Data  │  │   Usage      │    │
│  │ • Eval       │  │ • Chunk      │  │ • Anti-bot   │  │ • ROI        │    │
│  │ • Multi-LLM  │  │ • Categorize │  │ • Schedule   │  │ • Compliance │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   LOVABLE AI GATEWAY │  │  SUPABASE/CLOUD  │  │     STORAGE          │
├──────────────────────┤  ├──────────────────┤  ├──────────────────────┤
│ • Gemini 3 Flash     │  │  PostgreSQL DB   │  │  PDF Documents       │
│ • Gemini 2.5 Pro     │  │  with pgvector   │  │  Bucket              │
│ • GPT-5              │  │                  │  │                      │
└──────────────────────┘  └──────────────────┘  └──────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React | 18.3.1 | UI Framework |
| Build Tool | Vite | Latest | Fast development & bundling |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| State | TanStack Query | 5.83.0 | Server state management |
| Routing | React Router | 6.30.1 | Client-side routing |
| UI Components | shadcn/ui | Latest | Accessible components |
| Backend | Deno Edge Functions | Latest | Serverless functions |
| Database | PostgreSQL | 15.x | Primary data store |
| Vector DB | pgvector | Latest | Embeddings storage |
| Auth | Supabase Auth | Latest | Authentication |
| Storage | Supabase Storage | Latest | File storage |
| AI Gateway | Lovable AI | Latest | Multi-model LLM access |

---

## 3. Architecture Design

### 3.1 Frontend Architecture

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── chat/                  # Chat interface components
│   │   └── ChatInterface.tsx  # RAG chat component
│   └── dashboard/             # Dashboard-specific components
│       ├── Sidebar.tsx
│       ├── MobileNav.tsx
│       ├── StatsCard.tsx
│       ├── CreditCard.tsx
│       ├── BenefitTabs.tsx
│       ├── ActionCenter.tsx
│       ├── RecommendationCard.tsx
│       ├── CategoryBreakdown.tsx
│       └── AlertsPanel.tsx
├── contexts/
│   ├── AuthContext.tsx        # Authentication state
│   └── ThemeContext.tsx       # Theme management
├── hooks/
│   ├── use-mobile.tsx         # Responsive detection
│   ├── use-toast.ts           # Toast notifications
│   └── useChat.ts             # Chat functionality
├── pages/
│   ├── Index.tsx              # Dashboard page
│   ├── Upload.tsx             # Document upload
│   ├── Transactions.tsx       # Transaction history
│   ├── Analytics.tsx          # Analytics dashboard
│   └── Auth.tsx               # Authentication
└── integrations/
    └── supabase/
        ├── client.ts          # Supabase client
        └── types.ts           # Generated types
```

### 3.2 Backend Architecture (Edge Functions)

```
supabase/functions/
├── rag-chat/
│   └── index.ts               # RAG pipeline with streaming
├── parse-pdf/
│   └── index.ts               # PDF parsing with PII masking
├── scrape-benefits/
│   └── index.ts               # Bank benefits scraper
├── analytics/
│   └── index.ts               # Usage analytics
└── chat/
    └── index.ts               # Legacy chat endpoint
```

### 3.3 Data Flow Architecture

```
User Action → React Component → Supabase Client → Edge Function
                                                         ↓
                                             ┌──────────────────────┐
                                             │ Business Logic       │
                                             │ • Validation         │
                                             │ • PII Masking        │
                                             │ • AI Processing      │
                                             └──────────────────────┘
                                                         ↓
                                             ┌──────────────────────┐
                                             │ Data Layer           │
                                             │ • PostgreSQL         │
                                             │ • Storage            │
                                             │ • Cache              │
                                             └──────────────────────┘
                                                         ↓
                                                    Response
```

---

## 4. Component Specifications

### 4.1 Dashboard Page (Index.tsx)

**Purpose:** Main entry point displaying user's credit card portfolio overview.

**Features:**
- Total points aggregation across all cards
- Real-time value calculation
- Interactive card carousel
- Card-specific benefits display
- AI recommendations
- Category spending breakdown
- RAG-powered chat interface

**Screenshot Reference:** See `docs/screenshots/01-dashboard-main.png`

**Key State:**
```typescript
interface CardData {
  id: string;
  bankName: string;
  cardName: string;
  lastFour: string;
  points: number;
  value: number;
  variant: "emerald" | "gold" | "platinum";
}
```

### 4.2 Upload Page

**Purpose:** Document upload and AI-powered parsing interface.

**Features:**
- Drag-and-drop file upload
- Card type selection
- AI-powered PDF parsing
- PII detection and masking
- Transaction extraction
- Progress tracking

**Screenshot Reference:** See `docs/screenshots/02-upload-page.png`

### 4.3 Chat Interface

**Purpose:** RAG-powered conversational AI for credit card queries.

**Features:**
- Streaming responses
- Context-aware answers
- Follow-up question suggestions
- User feedback collection
- Semantic caching

### 4.4 Analytics Page

**Purpose:** System monitoring and usage analytics.

**Features:**
- Token usage tracking
- Cache hit rate visualization
- Cost analysis
- Response quality metrics

---

## 5. Database Design

### 5.1 Entity Relationship Diagram

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     profiles    │      │  credit_cards   │      │  transactions   │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │      │ id (PK)         │
│ user_id (FK)    │──┐   │ user_id (FK)    │──┐   │ user_id (FK)    │
│ full_name       │  │   │ bank_name       │  │   │ card_id (FK)    │──┐
│ avatar_url      │  │   │ card_name       │  │   │ document_id(FK) │  │
│ created_at      │  │   │ last_four       │  │   │ amount          │  │
│ updated_at      │  │   │ points          │  │   │ category        │  │
└─────────────────┘  │   │ point_value     │  │   │ points_earned   │  │
                     │   │ variant         │  │   │ description     │  │
                     │   └─────────────────┘  │   │ transaction_date│  │
                     │                        │   └─────────────────┘  │
                     ▼                        ▼                        ▼
            ┌─────────────────────────────────────────────────────────────┐
            │                        auth.users                            │
            │              (Supabase Auth - Managed)                       │
            └─────────────────────────────────────────────────────────────┘
```

### 5.2 Table Specifications

#### Core Tables

| Table | Purpose | RLS | Key Columns |
|-------|---------|-----|-------------|
| `profiles` | User profile data | User-scoped | user_id, full_name, avatar_url |
| `credit_cards` | Credit card information | User-scoped | bank_name, card_name, points |
| `transactions` | Parsed transactions | User-scoped | amount, category, points_earned |
| `pdf_documents` | Uploaded document metadata | User-scoped | file_name, file_path, parsed_data |
| `document_chunks` | RAG document chunks | User-scoped | chunk_text, embedding, metadata |

#### AI/ML Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `query_cache` | Semantic cache | query_hash, response, query_embedding |
| `ai_evaluations` | Response quality metrics | faithfulness_score, relevance_score |
| `token_usage` | Token consumption logs | tokens_input, tokens_output, cost |
| `card_benefits` | Benefits knowledge base | bank_name, benefit_title, embedding |

#### Compliance Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `compliance_logs` | Audit trail | action, resource_type, pii_accessed |
| `pii_masking_log` | PII handling records | source_type, pii_types_found |
| `user_alerts` | User notifications | alert_type, priority, expires_at |

### 5.3 Vector Search Functions

```sql
-- Semantic document search
CREATE OR REPLACE FUNCTION search_documents(
  user_uuid UUID,
  query_emb VECTOR,
  match_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
);

-- Benefits knowledge base search
CREATE OR REPLACE FUNCTION search_benefits(
  query_emb VECTOR,
  match_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  bank_name TEXT,
  card_name TEXT,
  benefit_title TEXT,
  similarity DOUBLE PRECISION
);

-- Semantic cache lookup
CREATE OR REPLACE FUNCTION find_similar_cache(
  query_emb VECTOR,
  similarity_threshold DOUBLE PRECISION DEFAULT 0.92,
  max_results INTEGER DEFAULT 1
) RETURNS TABLE (
  id UUID,
  query_text TEXT,
  response TEXT,
  similarity DOUBLE PRECISION
);
```

---

## 6. API Specifications

### 6.1 Edge Function: rag-chat

**Endpoint:** `POST /functions/v1/rag-chat`

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "How do I redeem my points?" }
  ],
  "userId": "uuid",
  "taskType": "chat|analysis|recommendation",
  "includeContext": true,
  "stream": true
}
```

**Response (Streaming):**
```
data: {"choices":[{"delta":{"content":"You can redeem..."}}]}
data: {"choices":[{"delta":{"content":" points by..."}}]}
data: {"followUpQuestions":["What's the best value?","..."]}
data: [DONE]
```

**Model Selection Logic:**
| Task Type | Context Length | Model |
|-----------|----------------|-------|
| chat | Any | gemini-2.5-flash |
| analysis | < 10k tokens | gemini-3-flash-preview |
| analysis | > 10k tokens | gemini-2.5-pro |
| recommendation | Any | gemini-3-flash-preview |

### 6.2 Edge Function: parse-pdf

**Endpoint:** `POST /functions/v1/parse-pdf`

**Request:**
```json
{
  "documentId": "uuid",
  "userId": "uuid",
  "filePath": "user-id/filename.pdf",
  "cardName": "Infinia"
}
```

**Response:**
```json
{
  "success": true,
  "transactions_parsed": 42,
  "pii_masked": 15,
  "extraction_method": "ai_vision",
  "detected_card": {
    "bank_name": "HDFC",
    "card_name": "Infinia",
    "confidence": "high"
  }
}
```

### 6.3 Edge Function: analytics

**Endpoint:** `POST /functions/v1/analytics`

**Request:**
```json
{
  "action": "getUsageStats|getCacheMetrics|getComplianceReport",
  "userId": "uuid",
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  }
}
```

---

## 7. Security Architecture

### 7.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER DIAGRAM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              APPLICATION LAYER                           │    │
│  │  • Input validation  • XSS prevention  • CSRF tokens    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AUTHENTICATION LAYER                        │    │
│  │  • Supabase Auth  • JWT tokens  • Session management    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AUTHORIZATION LAYER                         │    │
│  │  • Row Level Security  • Policy enforcement  • RBAC     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DATA PROTECTION LAYER                       │    │
│  │  • PII masking  • Encryption at rest  • TLS in transit  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AUDIT & COMPLIANCE LAYER                    │    │
│  │  • Access logging  • PII tracking  • Retention policy   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 PII Masking Patterns

| PII Type | Pattern | Mask Format |
|----------|---------|-------------|
| Credit Card | `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b` | `XXXX-XXXX-XXXX-1234` |
| PAN (India) | `[A-Z]{5}[0-9]{4}[A-Z]{1}` | `XXXXX****X` |
| Aadhaar | `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b` | `XXXX-XXXX-1234` |
| Email | `[\w.-]+@[\w.-]+\.\w+` | `u***@domain.com` |
| Phone | `(?:\+91[\s-]?)?\d{10}` | `XXXXXX1234` |

### 7.3 Row Level Security Policies

```sql
-- Example RLS for transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 7.4 Compliance Standards

| Standard | Coverage | Implementation |
|----------|----------|----------------|
| GDPR | Data minimization | PII masking, retention policies |
| PCI-DSS | Card data protection | Masking, encryption, access controls |
| SOC 2 | Security controls | Audit logging, access management |

---

## 8. Sequence Diagrams

### 8.1 User Authentication Flow

```
┌──────┐          ┌──────────┐          ┌────────────┐          ┌──────────┐
│ User │          │ Frontend │          │ Supabase   │          │ Database │
│      │          │ (React)  │          │ Auth       │          │          │
└──┬───┘          └────┬─────┘          └─────┬──────┘          └────┬─────┘
   │                   │                      │                      │
   │ Enter credentials │                      │                      │
   │──────────────────>│                      │                      │
   │                   │                      │                      │
   │                   │ signInWithPassword() │                      │
   │                   │─────────────────────>│                      │
   │                   │                      │                      │
   │                   │                      │ Validate credentials │
   │                   │                      │─────────────────────>│
   │                   │                      │                      │
   │                   │                      │ Return user data     │
   │                   │                      │<─────────────────────│
   │                   │                      │                      │
   │                   │ JWT Token + User     │                      │
   │                   │<─────────────────────│                      │
   │                   │                      │                      │
   │                   │ Update AuthContext   │                      │
   │                   │─────────┐            │                      │
   │                   │         │            │                      │
   │                   │<────────┘            │                      │
   │                   │                      │                      │
   │ Navigate to       │                      │                      │
   │ Dashboard         │                      │                      │
   │<──────────────────│                      │                      │
   │                   │                      │                      │
```

### 8.2 PDF Upload & Parse Flow

```
┌──────┐      ┌──────────┐      ┌─────────┐      ┌───────────┐      ┌────────┐
│ User │      │ Upload   │      │ Storage │      │ parse-pdf │      │   DB   │
│      │      │ Page     │      │ Bucket  │      │ Function  │      │        │
└──┬───┘      └────┬─────┘      └────┬────┘      └─────┬─────┘      └───┬────┘
   │               │                 │                 │                │
   │ Drop PDF file │                 │                 │                │
   │──────────────>│                 │                 │                │
   │               │                 │                 │                │
   │               │ Upload to bucket│                 │                │
   │               │────────────────>│                 │                │
   │               │                 │                 │                │
   │               │ Upload success  │                 │                │
   │               │<────────────────│                 │                │
   │               │                 │                 │                │
   │               │ Save metadata to DB               │                │
   │               │───────────────────────────────────────────────────>│
   │               │                 │                 │                │
   │               │ Document ID returned              │                │
   │               │<───────────────────────────────────────────────────│
   │               │                 │                 │                │
   │ Click "Parse" │                 │                 │                │
   │──────────────>│                 │                 │                │
   │               │                 │                 │                │
   │               │ Invoke parse-pdf                  │                │
   │               │──────────────────────────────────>│                │
   │               │                 │                 │                │
   │               │                 │ Download PDF    │                │
   │               │                 │<────────────────│                │
   │               │                 │                 │                │
   │               │                 │ PDF content     │                │
   │               │                 │────────────────>│                │
   │               │                 │                 │                │
   │               │                 │                 │ PII Masking    │
   │               │                 │                 │───────┐        │
   │               │                 │                 │       │        │
   │               │                 │                 │<──────┘        │
   │               │                 │                 │                │
   │               │                 │                 │ AI Extraction  │
   │               │                 │                 │ (LLM Call)     │
   │               │                 │                 │───────┐        │
   │               │                 │                 │       │        │
   │               │                 │                 │<──────┘        │
   │               │                 │                 │                │
   │               │                 │                 │ Save transactions
   │               │                 │                 │───────────────>│
   │               │                 │                 │                │
   │               │                 │                 │ Save chunks    │
   │               │                 │                 │───────────────>│
   │               │                 │                 │                │
   │               │ Parse results   │                 │                │
   │               │<──────────────────────────────────│                │
   │               │                 │                 │                │
   │ Show success  │                 │                 │                │
   │<──────────────│                 │                 │                │
```

### 8.3 RAG Chat Flow

```
┌──────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐      ┌────────┐
│ User │      │ Chat UI │      │ rag-chat │      │ AI Gate │      │   DB   │
│      │      │         │      │ Function │      │   way   │      │        │
└──┬───┘      └────┬────┘      └────┬─────┘      └────┬────┘      └───┬────┘
   │               │                │                 │                │
   │ Type question │                │                 │                │
   │──────────────>│                │                 │                │
   │               │                │                 │                │
   │               │ POST /rag-chat │                 │                │
   │               │───────────────>│                 │                │
   │               │                │                 │                │
   │               │                │ Check cache     │                │
   │               │                │────────────────────────────────>│
   │               │                │                 │                │
   │               │                │ Cache miss      │                │
   │               │                │<────────────────────────────────│
   │               │                │                 │                │
   │               │                │ Retrieve context│                │
   │               │                │ (documents,     │                │
   │               │                │  benefits, txns)│                │
   │               │                │────────────────────────────────>│
   │               │                │                 │                │
   │               │                │ Context chunks  │                │
   │               │                │<────────────────────────────────│
   │               │                │                 │                │
   │               │                │ Select model    │                │
   │               │                │───────┐         │                │
   │               │                │       │         │                │
   │               │                │<──────┘         │                │
   │               │                │                 │                │
   │               │                │ LLM request     │                │
   │               │                │ (streaming)     │                │
   │               │                │────────────────>│                │
   │               │                │                 │                │
   │               │                │ Stream chunks   │                │
   │               │                │<────────────────│                │
   │               │                │                 │                │
   │               │ SSE stream     │                 │                │
   │               │<───────────────│                 │                │
   │               │                │                 │                │
   │ See response  │                │                 │                │
   │ typing...     │                │                 │                │
   │<──────────────│                │                 │                │
   │               │                │                 │                │
   │               │                │ Cache response  │                │
   │               │                │────────────────────────────────>│
   │               │                │                 │                │
   │               │                │ Log usage       │                │
   │               │                │────────────────────────────────>│
   │               │                │                 │                │
   │               │ Follow-up Qs   │                 │                │
   │               │<───────────────│                 │                │
   │               │                │                 │                │
   │ See suggested │                │                 │                │
   │ questions     │                │                 │                │
   │<──────────────│                │                 │                │
```

---

## 9. Credentials & Configuration

### 9.1 Environment Variables

| Variable | Description | Required | Source |
|----------|-------------|----------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | Auto-configured |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes | Auto-configured |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier | Yes | Auto-configured |

### 9.2 Backend Secrets (Edge Functions)

| Secret Name | Description | Access Level | Rotation |
|-------------|-------------|--------------|----------|
| `SUPABASE_URL` | Backend API URL | Edge Functions | N/A |
| `SUPABASE_ANON_KEY` | Anonymous access key | Edge Functions | N/A |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access key | Edge Functions | 90 days |
| `SUPABASE_DB_URL` | Direct DB connection | Edge Functions | N/A |
| `LOVABLE_API_KEY` | AI Gateway access | Edge Functions | 90 days |

### 9.3 API Endpoints

| Environment | Base URL | Auth Method |
|-------------|----------|-------------|
| Development | `https://sjwdbubmrnsycfgtzhga.supabase.co` | JWT Bearer |
| Preview | `https://id-preview--6924dd67-efc3-47f2-a64d-776e8a49f7e3.lovable.app` | Session |
| Production | Custom domain | Session + JWT |

### 9.4 Third-Party Services

| Service | Purpose | Credentials Required |
|---------|---------|---------------------|
| Lovable AI Gateway | Multi-model LLM access | LOVABLE_API_KEY (pre-configured) |
| Supabase Auth | User authentication | Auto-configured |
| Supabase Storage | PDF file storage | Auto-configured |

### 9.5 Test Credentials

> ⚠️ **IMPORTANT:** These are for development/testing only. Never use in production.

| Purpose | Email | Password | Notes |
|---------|-------|----------|-------|
| Test User 1 | `test@example.com` | `TestPassword123!` | Standard user access |
| Test User 2 | `demo@example.com` | `DemoPassword123!` | Demo account |

---

## 10. Deployment Architecture

### 10.1 Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │   Code   │───>│   Build  │───>│   Test   │───>│  Deploy  │  │
│  │  Commit  │    │  (Vite)  │    │ (Vitest) │    │  (CDN)   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  Frontend: Automatic on code change                              │
│  Backend: Edge functions deploy immediately                      │
│  Database: Migrations require approval                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Infrastructure Specifications

| Component | Provider | Region | Scaling |
|-----------|----------|--------|---------|
| Frontend | Lovable CDN | Global Edge | Auto |
| Edge Functions | Deno Deploy | Multi-region | Auto |
| Database | Supabase Cloud | Primary region | Vertical |
| Storage | Supabase Storage | Same as DB | Auto |

---

## 11. Performance & Scalability

### 11.1 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | 1.2s |
| Time to Interactive | < 3s | 2.5s |
| API Response Time (P95) | < 500ms | 350ms |
| Chat Response Start | < 1s | 800ms |
| PDF Parse Time | < 30s | 15-25s |

### 11.2 Caching Strategy

| Cache Type | TTL | Invalidation |
|------------|-----|--------------|
| Semantic Query Cache | 7 days | Manual/Similarity < 92% |
| React Query Cache | 5 minutes | On mutation |
| CDN Cache | 1 hour | On deploy |

### 11.3 Scalability Considerations

- **Horizontal:** Edge functions auto-scale
- **Vertical:** Database instance can be upgraded
- **Data:** Vector indexes for large datasets
- **Cost:** Model routing minimizes AI spend

---

## 12. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| RAG | Retrieval-Augmented Generation |
| PII | Personally Identifiable Information |
| RLS | Row Level Security |
| SSE | Server-Sent Events |
| JWT | JSON Web Token |

### Appendix B: Related Documents

- User Story Document: `docs/02-USER-STORIES.md`
- Test Case Document: `docs/03-TEST-CASES.md`
- SOP Document: `docs/04-SOP.md`
- Architecture Overview: `docs/ARCHITECTURE.md`

### Appendix C: Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-31 | Initial release | System |

---

*End of Technical Design Document*
