import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ApiKeyModal } from "./ApiKeyModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isThinking?: boolean;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiModal, setShowApiModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please set your API key before sending messages.",
        variant: "destructive"
      });
      setShowApiModal(true);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: content.trim(),
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Show thinking message
    const thinkingId = `thinking-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: thinkingId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isThinking: true
    }]);
    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey, // or "Authorization": `Bearer ${apiKey}` if your backend expects that
        },
        body: JSON.stringify({
          prompt: [content],
          max_new_tokens: 500,
          temperature: 0.8,
          top_p: 0.95
        })
      });

      // --- Apply your logic here ---
      if (response.status === 401 || response.status === 403) {
        toast({
          title: "API Key Revoked",
          description: "Your API key is invalid or revoked.",
          variant: "destructive"
        });
        setShowApiModal(true);
        return;
      }
      // --- End logic ---

      const data = await response.json();
      setMessages(prev => prev.filter(msg => msg.id !== thinkingId));

      const reply = (data.generated_text && data.generated_text.trim()) || "No response from the server.";
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: reply,
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to get response from the server.",
        variant: "destructive"
      });
    }
    setIsTyping(false);
  };

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setShowApiModal(false);
    toast({
      title: "API Key Set",
      description: "You can now start chatting with the AI.",
    });
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">AI Chat Interface</h1>
              <p className="text-sm text-muted-foreground">
                {apiKey ? "Ready to chat" : "Set your API key to get started"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-success' : 'bg-warning'} animate-pulse`} />
                <span className="text-xs text-muted-foreground">
                  {apiKey ? "Connected" : "No API Key"}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex justify-center p-4 min-h-0">
        <div className="w-full max-w-3xl bg-card rounded-2xl shadow-lg border border-border flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-8">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Welcome to AI Chat
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Start a conversation by typing your message below. 
                    {!apiKey && " Don't forget to set your API key first!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border bg-background p-6">
            <ChatInput
              onSendMessage={handleSendMessage}
              onApiKeyClick={() => setShowApiModal(true)}
              hasApiKey={!!apiKey}
              disabled={isTyping}
            />
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
        onApiKeySet={handleApiKeySet}
        currentApiKey={apiKey}
      />
    </div>
  );
};