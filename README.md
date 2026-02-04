# Credit Card Reward Intelligence Dashboard

**Version:** 1.1  
**Last Updated:** February 4, 2026  
**Status:** Demo Ready ✅

## 🎯 Project Overview

An AI-powered credit card rewards optimization dashboard that helps users maximize their credit card benefits through intelligent spending analysis, automated document parsing, and AI-driven redemption recommendations.

### Key Features

- **📊 Multi-Card Dashboard**: View all your credit cards, points balances, and estimated values in one place
- **📤 AI-Powered PDF Parsing**: Upload credit card statements for automatic transaction extraction with PII masking
- **🤖 RAG Chat Interface**: Ask questions about your rewards in natural language
- **🔔 Smart Alerts**: Get notified about expiring points, milestones, and opportunities
- **📈 Analytics**: Track spending patterns, points earned, and optimization opportunities
- **🎯 Card-Specific Filtering**: All dashboard sections update based on selected card

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI Framework |
| Build Tool | Vite | Fast development & bundling |
| Styling | Tailwind CSS + shadcn/ui | Component library |
| State | TanStack Query | Server state management |
| Routing | React Router 6 | Client-side routing |
| Backend | Deno Edge Functions | Serverless functions |
| Database | PostgreSQL + pgvector | Data storage & vector search |
| Auth | Lovable Cloud Auth | Authentication |
| AI Gateway | Lovable AI | Multi-model LLM access |

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── chat/           # RAG chat interface
│   │   ├── dashboard/      # Dashboard components
│   │   │   ├── AlertsPanel.tsx      # Card-filtered alerts
│   │   │   ├── BenefitTabs.tsx      # DB-driven benefits display
│   │   │   ├── CategoryBreakdown.tsx # Spending categories
│   │   │   └── ...
│   │   └── ui/             # shadcn/ui components
│   ├── pages/
│   │   ├── Index.tsx       # Main dashboard
│   │   ├── Upload.tsx      # PDF upload & parsing
│   │   ├── Transactions.tsx # Transaction history with card filter
│   │   └── Analytics.tsx   # Token usage & metrics
│   └── integrations/
│       └── supabase/       # Backend client & types
├── supabase/
│   └── functions/
│       ├── rag-chat/       # Semantic search + streaming AI
│       ├── parse-pdf/      # PDF extraction with PII masking
│       └── analytics/      # Usage analytics
├── docs/
│   ├── 01-TECHNICAL-DESIGN-DOCUMENT.md
│   ├── 02-USER-STORIES.md
│   ├── 03-TEST-CASES.md
│   └── 04-SOP.md
└── public/
    └── test-data/          # Sample PDFs for testing
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: use nvm)
- npm or bun

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Test Data

Sample PDF statements are available in `public/test-data/`:
- `Amex_Final.pdf` - American Express statement
- `HDFC_2.pdf` - HDFC Bank statement

## 📊 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `credit_cards` | User's credit cards with points balances |
| `transactions` | Parsed transactions from statements |
| `card_benefits` | Card benefits knowledge base |
| `user_alerts` | Card-specific alerts and notifications |
| `pdf_documents` | Uploaded document metadata |
| `document_chunks` | RAG document chunks with embeddings |

### AI/Analytics Tables

| Table | Purpose |
|-------|---------|
| `query_cache` | Semantic cache for AI responses |
| `ai_evaluations` | Response quality metrics |
| `token_usage` | Token consumption tracking |

## 🔐 Security Features

- **Row Level Security (RLS)**: All user data is scoped to authenticated users
- **PII Masking**: Credit card numbers, PAN, Aadhaar automatically masked
- **Secure Storage**: Encrypted file storage with access policies

## 🧪 Testing

```sh
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage
```

## 📱 Supported Cards

- HDFC Bank (Infinia, Diners Club, MoneyBack, Regalia)
- ICICI Bank (Coral, Emeralde, Sapphiro, Amazon Pay)
- American Express (Platinum, Gold)
- Axis Bank (Atlas, Magnus, Flipkart)
- SBI Card (Elite, Prime)

## 📖 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **Technical Design Document**: Architecture, APIs, database design
- **User Stories**: Product requirements and acceptance criteria
- **Test Cases**: Functional, integration, and security tests
- **SOP**: Standard operating procedures

## 🔄 Recent Updates (February 4, 2026)

### Data Population
- Added ICICI Coral card benefits (12 benefits)
- Added American Express Platinum card benefits (10 benefits)
- Added sample user alerts (card-specific and general)
- Added sample transactions across all cards

### Card-Based Filtering
- **BenefitTabs**: Now fetches benefits from `card_benefits` database
- **AlertsPanel**: Filters alerts by selected card
- **Transactions Page**: Quick card selector pills for filtering
- All dashboard sections sync with card selection

### Testing
- Browser automation testing completed
- All card selection flows verified
- Charts and stats update correctly

## 📞 Support

For issues or questions, please check the documentation or open an issue in the repository.

---

**Built with ❤️ using Lovable**
