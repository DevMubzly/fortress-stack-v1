import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast"; // If you use a toast system

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onApiKeyClick: () => void;
  hasApiKey: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, onApiKeyClick, hasApiKey, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!hasApiKey) {
      toast && toast({
        title: "API Key Missing",
        description: "Please set your API key to enable messaging.",
        variant: "destructive"
      });
      onApiKeyClick();
      return;
    }
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Align input and send button on the same line */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative flex items-center">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? "Type your message..." : "Set your API key to start chatting"}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 min-h-[52px] max-h-32"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent'
            }}
          />
          {/* API Key Button */}
          <Button
            onClick={onApiKeyClick}
            variant="ghost"
            size="sm"
            className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-xs transition-all duration-200 ${
              hasApiKey 
                ? 'text-success hover:text-success/80' 
                : 'text-warning hover:text-warning/80 animate-pulse'
            }`}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"
              />
            </svg>
            API
          </Button>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="h-[52px] px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-2 transition-all duration-200 hover:shadow-md flex-shrink-0"
        >
          <span className="font-medium">Send</span>
        </Button>
      </div>
      {!hasApiKey && (
        <p className="text-xs text-warning flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Please set your API key to enable messaging
        </p>
      )}
    </div>
  );
};