/**
 * Follow-up question generation
 */

/**
 * Generate contextual follow-up questions based on the conversation
 */
export async function generateFollowUpQuestions(
  query: string,
  response: string,
  context: string[],
  apiKey: string
): Promise<string[]> {
  try {
    const prompt = `Based on this conversation about credit card rewards, generate 4-6 relevant follow-up questions the user might want to ask next.

User asked: "${query}"

Assistant responded: "${response.substring(0, 500)}..."

Context topics: ${context.slice(0, 3).join(", ")}

Generate short, actionable questions (max 8 words each). Return ONLY a JSON array of strings, nothing else.
Example: ["How do I redeem for flights?", "What's my best card for dining?"]`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      return questions.slice(0, 6);
    }
    return [];
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    return [];
  }
}
