import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  cached?: boolean;
  model?: string;
}

const suggestedQuestions = [
  "How many points did I earn last month?",
  "Best redemption for my Infinia points?",
  "Which card for travel bookings?",
  "When do my points expire?",
];

const RAG_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-chat`;

export function ChatInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your **AI-powered Reward Intelligence Assistant**. I have access to your uploaded statements, card benefits database, and real-time optimization strategies. How can I help you maximize your rewards today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string, cached?: boolean, model?: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id.startsWith("stream-")) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent, cached, model } : m
          );
        }
        return [
          ...prev,
          {
            id: `stream-${Date.now()}`,
            role: "assistant" as const,
            content: assistantContent,
            timestamp: new Date(),
            cached,
            model,
          },
        ];
      });
    };

    try {
      const response = await fetch(RAG_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.id !== "1")
            .concat(userMessage)
            .map((m) => ({ role: m.role, content: m.content })),
          userId: user?.id,
          taskType: "chat",
          includeContext: true,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          toast({ variant: "destructive", title: "Rate limit exceeded" });
        } else if (response.status === 402) {
          toast({ variant: "destructive", title: "AI credits exhausted" });
        }
        throw new Error(errorData.error || "Failed");
      }

      // Check if cached response (non-streaming)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        updateAssistant(data.content, data.cached, data.model);
        if (data.cached) {
          toast({ title: "⚡ Response from cache", description: "Faster and cheaper!" });
        }
      } else {
        // Streaming response
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) updateAssistant(content);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      if (!assistantContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const provideFeedback = async (messageId: string, rating: number) => {
    try {
      // Find the message and its query
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex <= 0) return;
      
      const query = messages[msgIndex - 1]?.content;
      const response = messages[msgIndex]?.content;

      await supabase.from("ai_evaluations").insert({
        user_id: user?.id,
        query,
        response,
        user_feedback: rating,
      });

      toast({ title: rating >= 4 ? "Thanks for the feedback! 👍" : "We'll work to improve! 🔧" });
    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hello! I'm your **AI-powered Reward Intelligence Assistant**. I have access to your uploaded statements, card benefits database, and real-time optimization strategies. How can I help you maximize your rewards today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="glass-card rounded-xl flex flex-col h-[500px] lg:h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">RAG-Powered Assistant</h3>
            <p className="text-xs text-muted-foreground">
              Context-aware • Cached • Evaluated
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={clearMessages}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="max-w-[85%]">
              <div
                className={cn(
                  "rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/50 rounded-bl-md"
                )}
              >
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs opacity-50">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {message.cached && (
                    <span className="text-xs px-1.5 py-0.5 bg-primary/20 rounded text-primary">⚡ cached</span>
                  )}
                  {message.model && (
                    <span className="text-xs opacity-50">{message.model.split("/")[1]}</span>
                  )}
                </div>
              </div>
              {message.role === "assistant" && message.id !== "1" && !message.id.startsWith("error") && (
                <div className="flex gap-1 mt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => provideFeedback(message.id, 5)}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => provideFeedback(message.id, 2)}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            {message.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Suggested:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your rewards..."
            className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
