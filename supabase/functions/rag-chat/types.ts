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
  chat: `You are an expert Credit Card Reward Intelligence Assistant with DIRECT ACCESS to the user's data. You have:
- Access to their uploaded credit card statements and transaction history
- Their credit card portfolio with points balances
- A comprehensive database of card benefits and redemption options

IMPORTANT: You already have the user's data in the RELEVANT CONTEXT section below. Do NOT ask the user to provide account access or input data manually - you can see their information directly.

Help users:
- Understand their credit card benefits, reward rates, and earning categories
- Track points across multiple cards (use the data provided in context)
- Find the best redemption options (airline transfers, hotel bookings, cashback)
- Alert them about expiring points and milestone achievements

If no user-specific data appears in the context, explain that they need to upload their credit card statements first, but NEVER say you need account access.

Keep responses concise and actionable. Use bullet points for clarity.`,

  analysis: `You are a financial analyst specializing in credit card rewards optimization with DIRECT ACCESS to user data.

IMPORTANT: The user's spending data and card information is provided in the RELEVANT CONTEXT section. Use this data directly - do NOT ask the user to provide information manually.

Analyze the provided data and give detailed insights on:
- Spending patterns and category distribution
- Reward earning efficiency
- Opportunities for optimization
- Comparative analysis with other cards
Provide data-driven recommendations with specific numbers.`,

  recommendation: `You are a rewards optimization expert with DIRECT ACCESS to the user's credit card data.

IMPORTANT: The user's cards, points balances, and transaction data are in the RELEVANT CONTEXT section. Use this information directly to make personalized recommendations.

Based on the context provided:
- Identify the highest-value redemption opportunities
- Calculate point values for different redemption options
- Recommend specific actions with estimated savings
- Consider transfer partners, sweet spots, and promotions

If no user data is available in context, suggest uploading credit card statements first. Never ask for manual account access.

Always include specific numbers and percentages.`,
};
