import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isThinking?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

const ThinkingIndicator = () => (
  <div className="chat-thinking">
    <span className="text-sm">Thinking</span>
    <div className="thinking-dots">
      <div className="thinking-dot" style={{ "--delay": "0ms" } as any} />
      <div className="thinking-dot" style={{ "--delay": "200ms" } as any} />
      <div className="thinking-dot" style={{ "--delay": "400ms" } as any} />
    </div>
  </div>
);

export const ChatMessage = ({ message }: ChatMessageProps) => {
  if (message.isThinking) {
    return (
      <div className="flex items-start space-x-3 fade-in">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
        </div>
        <div className="chat-bubble chat-bubble-assistant">
          <ThinkingIndicator />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 fade-in ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className="flex-shrink-0">
        {message.role === 'assistant' ? (
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}
      </div>
      
      <div className="flex flex-col space-y-1 max-w-[85%]">
        <div className={`chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
          {message.content && (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
        
        <div className={`text-xs text-muted-foreground px-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
};