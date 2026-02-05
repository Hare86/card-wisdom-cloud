/**
 * Type definitions for RAG chat function
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RagRequest {
  messages: ChatMessage[];
  userId?: string;
  taskType?: "chat" | "analysis" | "recommendation" | "parsing" | "extraction";
  includeContext?: boolean;
  stream?: boolean;
  selectedCardId?: string;
  selectedCardName?: string;
}

export interface RagResponse {
  content: string;
  cached: boolean;
  model: string;
  followUpQuestions?: string[];
  semanticMatch?: boolean;
  similarity?: number;
}

export interface CacheEntry {
  id: string;
  query_text: string;
  response: string;
  model_used: string;
  similarity?: number;
}

export interface RetrievedContext {
  documentChunks: string[];
  benefitsContext: string[];
  transactionSummary: string | null;
  userCards: string | null;
}

export interface ModelCosts {
  input: number;
  output: number;
}

export const MODEL_COSTS: Record<string, ModelCosts> = {
  "google/gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "openai/gpt-5": { input: 5.00, output: 15.00 },
  "openai/gpt-5-mini": { input: 0.15, output: 0.60 },
};

export const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `You are RewardIQ, an expert Credit Card Reward Intelligence Assistant.

CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER say "I need access to your statements" or "please upload documents" or similar
2. If user data (cards, transactions) is shown in RELEVANT CONTEXT below, USE IT DIRECTLY
3. If NO user data is in context, provide GENERAL advice using the Card Benefits Knowledge Base
4. For questions like "when do my points expire?" without user data, explain general expiration policies for popular cards

You have access to:
- User's credit cards and points (if uploaded)
- Transaction history (if statements uploaded)
- Comprehensive card benefits database (always available)

Response style:
- Be concise and actionable
- Use bullet points
- Include specific numbers when available
- For expiration questions: Most Indian credit card points expire after 2-3 years of inactivity; HDFC Infinia never expires; Axis points valid for 3 years

Example response when no user data:
"Based on typical credit card policies:
• **HDFC Infinia**: Points never expire
• **Axis Atlas**: Points valid for 3 years
• **ICICI Sapphiro**: Points valid for 2 years
To get your specific expiration dates, I'd need your card statements uploaded."`,

  analysis: `You are RewardIQ, a financial analyst for credit card rewards.

RULES:
1. Use data from RELEVANT CONTEXT directly - never ask for manual input
2. If no user data, analyze the card benefits database to provide general insights
3. Be data-driven with specific numbers

Analyze:
- Spending patterns and category distribution
- Reward earning efficiency
- Optimization opportunities`,

  recommendation: `You are RewardIQ, a rewards optimization expert.

RULES:
1. Use user data from RELEVANT CONTEXT if available
2. If no user data, recommend based on general best practices using the benefits database
3. Never ask for "account access" - just provide helpful advice

Recommend:
- Highest-value redemption options
- Point values for different redemption types
- Transfer partners and sweet spots`,
};
